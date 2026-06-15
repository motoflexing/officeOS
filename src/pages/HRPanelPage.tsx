import {
  BriefcaseBusiness,
  CalendarClock,
  ClipboardCheck,
  Hourglass,
  Plus,
  UserCheck,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ComingSoonModal, type ComingSoonAction } from '../components/ComingSoonModal';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { Toast } from '../components/Toast';
import { firestoreService } from '../services/firestoreService';
import { isFirebaseConfigured } from '../services/firebase';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type {
  Candidate,
  DailyReport,
  Employee,
  Interview,
  JobOpening,
  LeaveRequest,
  LeaveStatus,
} from '../types';
import { formatShortDate } from '../utils/format';
import { canReviewLeaveRequest, getReviewLeaveRequests } from '../utils/leaveWorkflow';

type HrTab = 'Overview' | 'Job Openings' | 'Candidates' | 'Interviews';

const tabs: HrTab[] = ['Overview', 'Job Openings', 'Candidates', 'Interviews'];

export const HRPanelPage = () => {
  const { profile } = useAuth();
  const canManageAts = profile?.role === 'Admin' || profile?.role === 'HR';
  const [activeTab, setActiveTab] = useState<HrTab>('Overview');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() =>
    getReviewLeaveRequests(storage.getLeaveRequests(), 'HR'),
  );
  const [employees, setEmployees] = useState<Employee[]>(() => storage.getEmployees());
  const [reports, setReports] = useState<DailyReport[]>(() => storage.getReports());
  // ATS data is intentionally not loaded here yet — the Job Openings, Candidates, and
  // Interviews tabs are UI-only scaffolds. Demo data is read from localStorage only so the
  // Hiring Pipeline KPI cards stay populated without triggering Firestore reads on those tabs.
  const [jobOpenings] = useState<JobOpening[]>(() => storage.getJobOpenings());
  const [candidates] = useState<Candidate[]>(() => storage.getCandidates());
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [activeModal, setActiveModal] = useState<ComingSoonAction | null>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  };

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    Promise.all([
      firestoreService.getReviewLeaveRequests('HR'),
      firestoreService.getEmployees(),
      firestoreService.getReports(),
    ])
      .then(([leaveRequests, employees, reports]) => {
        setLeaveRequests(getReviewLeaveRequests(leaveRequests, 'HR'));
        setEmployees(employees);
        setReports(reports);
      })
      .catch((error) => {
        notify(error instanceof Error ? error.message : 'Unable to load HR data.');
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(
    () => ({
      total: employees.length,
      active: employees.filter((employee) => employee.status === 'Active').length,
      onLeave: employees.filter((employee) => employee.status === 'On Leave').length,
      inactive: employees.filter((employee) => employee.status === 'Inactive').length,
      pendingReports: reports.filter((report) => report.status !== 'Reviewed').length,
    }),
    [employees, reports],
  );

  const atsStats = useMemo(
    () => ({
      openJobs: jobOpenings.filter((job) => job.status === 'Open').length,
      totalCandidates: candidates.length,
      candidatesInInterview: candidates.filter((candidate) => candidate.status === 'Interview').length,
      selectedCandidates: candidates.filter((candidate) => candidate.status === 'Selected').length,
    }),
    [candidates, jobOpenings],
  );

  const visibleTabs = canManageAts ? tabs : tabs.filter((tab) => tab === 'Overview');

  const updateLeave = async (id: string, status: LeaveStatus) => {
    const request = leaveRequests.find((item) => item.id === id);
    if (!profile || !request || !canReviewLeaveRequest(request, profile)) return;

    const reviewedBy = profile?.name || 'HR/Admin';
    const reviewedAt = new Date().toISOString();
    try {
      if (isFirebaseConfigured) {
        await firestoreService.updateLeaveRequestStatus(id, status, reviewedBy);
      }
      const nextRequests = leaveRequests.map((request) =>
        request.id === id ? { ...request, status, reviewedBy, reviewedAt } : request,
      );
      setLeaveRequests(nextRequests);
      if (!isFirebaseConfigured) {
        storage.setLeaveRequests(nextRequests);
      }
      notify(`Leave request ${status.toLowerCase()}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to update leave request.');
    }
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}
      {loading ? <p className="text-sm text-slate-400">Loading HR data...</p> : null}
      <PageHeader
        eyebrow="HR Panel"
        title="People Operations Dashboard"
        subtitle="Monitor employee status, leave requests, reporting follow-up, and hiring activity from one OfficeOS view."
      />

      <div className="surface p-2">
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? 'bg-accent-500 text-white shadow-[0_0_24px_rgba(239,35,43,0.22)]'
                  : 'text-slate-400 hover:bg-white/[0.055] hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Overview' ? (
        <OverviewSection
          atsStats={atsStats}
          employees={employees}
          leaveRequests={leaveRequests}
          reports={reports}
          showAts={canManageAts}
          stats={stats}
          updateLeave={updateLeave}
        />
      ) : null}

      {activeTab === 'Job Openings' && canManageAts ? (
        <JobOpeningsSection onPostJob={() => setActiveModal('post-job')} />
      ) : null}

      {activeTab === 'Candidates' && canManageAts ? (
        <CandidatesSection onAddCandidate={() => setActiveModal('add-candidate')} />
      ) : null}

      {activeTab === 'Interviews' && canManageAts ? (
        <InterviewsSection onScheduleInterview={() => setActiveModal('schedule-interview')} />
      ) : null}

      {activeModal ? <ComingSoonModal action={activeModal} onClose={() => setActiveModal(null)} /> : null}
    </div>
  );
};

const OverviewSection = ({
  atsStats,
  employees,
  leaveRequests,
  reports,
  showAts,
  stats,
  updateLeave,
}: {
  atsStats: { openJobs: number; totalCandidates: number; candidatesInInterview: number; selectedCandidates: number };
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  reports: DailyReport[];
  showAts: boolean;
  stats: { total: number; active: number; onLeave: number; inactive: number; pendingReports: number };
  updateLeave: (id: string, status: LeaveStatus) => void;
}) => (
  <>
    <section className="space-y-4">
      <SectionEyebrow title="People Pulse" subtitle="Headcount, attendance, and reporting status at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total Employees" value={stats.total} icon={Users} />
        <StatCard title="Active Employees" value={stats.active} icon={UserCheck} />
        <StatCard title="On Leave Today" value={stats.onLeave} icon={Hourglass} />
        <StatCard
          title="Pending Leave Requests"
          value={leaveRequests.filter((request) => request.status === 'Pending').length}
          icon={CalendarClock}
        />
        <StatCard
          title="Reports Submitted Today"
          value={`${reportsSubmittedToday(reports, employees)} / ${employeeRoleCount(employees)}`}
          icon={ClipboardCheck}
          caption="Submitted today / total expected"
        />
      </div>
    </section>

    {showAts ? (
      <section className="space-y-4">
        <SectionEyebrow title="Hiring Pipeline" subtitle="Open roles and candidate movement across stages." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Open Jobs" value={atsStats.openJobs} icon={BriefcaseBusiness} />
          <StatCard title="Total Candidates" value={atsStats.totalCandidates} icon={Users} />
          <StatCard title="In Interview" value={atsStats.candidatesInInterview} icon={CalendarClock} />
          <StatCard title="Selected Candidates" value={atsStats.selectedCandidates} icon={UserCheck} />
        </div>
      </section>
    ) : null}

    <div className="grid gap-4 lg:grid-cols-3">
      <section className="surface p-5">
        <h3 className="text-lg font-semibold text-white">Attendance Overview</h3>
        <div className="mt-5 space-y-4">
          {[
            ['Active', stats.active, 'bg-emerald-400'],
            ['On Leave', stats.onLeave, 'bg-accent-400'],
            ['Inactive', stats.inactive, 'bg-slate-400'],
          ].map(([label, value, color]) => (
            <div key={label as string}>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-slate-400">{label}</span>
                <span className="font-medium text-white">{value as number}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div
                  className={`h-2 rounded-full ${color}`}
                  style={{ width: `${employees.length ? ((value as number) / employees.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface p-5">
        <h3 className="text-lg font-semibold text-white">Employee Onboarding</h3>
        <div className="mt-5 space-y-4">
          <OnboardingItem title="Offer accepted" value="4 candidates" />
          <OnboardingItem title="Documents pending" value="2 candidates" />
          <OnboardingItem title="First-week setup" value="3 employees" />
        </div>
      </section>

      <section className="surface p-5">
        <h3 className="text-lg font-semibold text-white">Employee Leave Requests</h3>
        <p className="mt-2 text-sm text-slate-500">Review pending requests and update status.</p>
        <div className="mt-5 flex gap-3">
          <span className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {leaveRequests.filter((request) => request.status === 'Pending').length} pending
          </span>
          <span className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {leaveRequests.filter((request) => request.status === 'Approved').length} approved
          </span>
        </div>
      </section>
    </div>

    <section className="surface overflow-hidden">
      <div className="border-b border-white/10 p-5">
        <h3 className="text-lg font-semibold text-white">Employee Leave Requests Table</h3>
      </div>
      <div className="overflow-x-auto">
        {leaveRequests.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={ClipboardCheck}
              title="No leave requests yet"
              description="Employee leave applications will appear here for HR review."
            />
          </div>
        ) : (
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-5 py-4">Employee Name</th>
                <th className="px-5 py-4">Leave Type</th>
                <th className="px-5 py-4">Dates</th>
                <th className="px-5 py-4">Reason</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {leaveRequests.map((request) => (
                <tr key={request.id} className="transition hover:bg-white/[0.035]">
                  <td className="px-5 py-4 font-semibold text-white">{request.employeeName}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{request.leaveType}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{formatLeaveRange(request)}</td>
                  <td className="max-w-xs px-5 py-4 text-sm text-slate-300">
                    <p className="line-clamp-2">{request.reason || 'No reason provided.'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={request.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button type="button" className="btn-secondary py-2" onClick={() => updateLeave(request.id, 'Approved')}>
                        Approve
                      </button>
                      <button type="button" className="btn-secondary py-2" onClick={() => updateLeave(request.id, 'Rejected')}>
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  </>
);

const JobOpeningsSection = ({ onPostJob }: { onPostJob: () => void }) => (
  <div className="space-y-4">
    <AtsTabHeader title="Job Openings" buttonLabel="Post New Job" onAction={onPostJob} />
    <AtsFilterRow>
      <FilterInput label="Search" placeholder="Search by role title or department" />
      <FilterSelect label="Role" options={['All Roles']} />
      <FilterSelect label="Status" options={['All Statuses']} />
    </AtsFilterRow>
    <AtsEmptyState
      icon={BriefcaseBusiness}
      title="No active job openings"
      description="Post your first role to start tracking candidates and interviews."
    />
  </div>
);

const CandidatesSection = ({ onAddCandidate }: { onAddCandidate: () => void }) => (
  <div className="space-y-4">
    <AtsTabHeader title="Candidates" buttonLabel="Add Candidate" onAction={onAddCandidate} />
    <AtsFilterRow>
      <FilterInput label="Search" placeholder="Search by name or email" />
      <FilterSelect
        label="Stage"
        options={['All Stages', 'Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']}
      />
      <FilterSelect label="Job" options={['All Jobs']} />
    </AtsFilterRow>
    <AtsEmptyState
      icon={Users}
      title="No candidates yet"
      description="Candidates added against job openings will appear here."
    />
  </div>
);

const InterviewsSection = ({ onScheduleInterview }: { onScheduleInterview: () => void }) => (
  <div className="space-y-4">
    <AtsTabHeader title="Interviews" buttonLabel="Schedule Interview" onAction={onScheduleInterview} />
    <AtsFilterRow>
      <FilterInput label="Date" type="date" />
      <FilterSelect label="Interviewer" options={['All Interviewers']} />
      <FilterSelect label="Status" options={['All Statuses', 'Scheduled', 'Completed', 'Cancelled', 'No Show']} />
    </AtsFilterRow>
    <AtsEmptyState
      icon={CalendarClock}
      title="No interviews scheduled"
      description="Schedule interviews from a candidate's profile."
    />
  </div>
);

const AtsTabHeader = ({
  buttonLabel,
  onAction,
  title,
}: {
  buttonLabel: string;
  onAction: () => void;
  title: string;
}) => (
  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
    <h3 className="text-xl font-semibold text-white">{title}</h3>
    <button type="button" className="btn-primary" onClick={onAction}>
      <Plus size={18} />
      {buttonLabel}
    </button>
  </div>
);

const AtsFilterRow = ({ children }: { children: React.ReactNode }) => (
  <section className="surface p-5">
    <div className="grid gap-4 md:grid-cols-3">{children}</div>
  </section>
);

const FilterInput = ({
  label,
  placeholder,
  type = 'text',
}: {
  label: string;
  placeholder?: string;
  type?: string;
}) => (
  <label>
    <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
    <input className="field" type={type} placeholder={placeholder} />
  </label>
);

const FilterSelect = ({ label, options }: { label: string; options: string[] }) => (
  <label>
    <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
    <select className="field" defaultValue={options[0]}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

const AtsEmptyState = ({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: typeof BriefcaseBusiness;
  title: string;
}) => (
  <div className="mx-auto w-full max-w-xl">
    <div className="surface px-6 py-14 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
        <Icon size={40} />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p>
    </div>
  </div>
);

const SectionEyebrow = ({ subtitle, title }: { subtitle: string; title: string }) => (
  <div>
    <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">{title}</p>
    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
  </div>
);

const OnboardingItem = ({ title, value }: { title: string; value: string }) => (
  <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
    <p className="font-medium text-white">{title}</p>
    <p className="mt-1 text-sm text-slate-500">{value}</p>
  </div>
);

const formatLeaveRange = (request: LeaveRequest) => {
  const startDate = request.startDate || request.date;
  const endDate = request.endDate || request.date;

  if (!startDate) return 'Date not available';
  if (!endDate || startDate === endDate) return formatShortDate(startDate);
  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
};

const today = () => new Date().toISOString().slice(0, 10);

const employeeRoleCount = (employees: Employee[]) =>
  employees.filter((employee) => employee.role === 'Employee').length;

const reportsSubmittedToday = (reports: DailyReport[], employees: Employee[]) => {
  const employeeEmails = new Set(
    employees.filter((employee) => employee.role === 'Employee').map((employee) => employee.email.toLowerCase()),
  );
  return reports.filter(
    (report) => report.date === today() && employeeEmails.has((report.employeeEmail || '').toLowerCase()),
  ).length;
};
