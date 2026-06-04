import {
  BriefcaseBusiness,
  CalendarClock,
  ClipboardCheck,
  Eye,
  Hourglass,
  Pencil,
  Plus,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
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
  CandidateStatus,
  DailyReport,
  Employee,
  Interview,
  InterviewStatus,
  JobOpening,
  JobOpeningStatus,
  LeaveRequest,
  LeaveStatus,
} from '../types';
import { formatShortDate } from '../utils/format';
import { canReviewLeaveRequest, getReviewLeaveRequests } from '../utils/leaveWorkflow';

type HrTab = 'Overview' | 'Job Openings' | 'Candidates' | 'Interviews';

const tabs: HrTab[] = ['Overview', 'Job Openings', 'Candidates', 'Interviews'];
const jobStatuses: JobOpeningStatus[] = ['Open', 'Paused', 'Closed'];
const candidateStatuses: CandidateStatus[] = ['Applied', 'Screening', 'Interview', 'Selected', 'Rejected'];
const interviewStatuses: InterviewStatus[] = ['Scheduled', 'Completed', 'Cancelled'];

const emptyJobForm = {
  title: '',
  department: '',
  location: '',
  experience: '',
  salaryRange: '',
  status: 'Open' as JobOpeningStatus,
};

const emptyCandidateForm = {
  name: '',
  email: '',
  phone: '',
  appliedRole: '',
  experience: '',
  skills: '',
  resumeLink: '',
  status: 'Applied' as CandidateStatus,
};

const emptyInterviewForm = {
  candidateName: '',
  role: '',
  interviewDate: '',
  interviewTime: '',
  interviewer: '',
  status: 'Scheduled' as InterviewStatus,
  notes: '',
};

export const HRPanelPage = () => {
  const { profile } = useAuth();
  const canManageAts = profile?.role === 'HR';
  const [activeTab, setActiveTab] = useState<HrTab>('Overview');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() =>
    getReviewLeaveRequests(storage.getLeaveRequests(), 'HR'),
  );
  const [employees, setEmployees] = useState<Employee[]>(() => storage.getEmployees());
  const [reports, setReports] = useState<DailyReport[]>(() => storage.getReports());
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>(() => storage.getJobOpenings());
  const [candidates, setCandidates] = useState<Candidate[]>(() => storage.getCandidates());
  const [interviews, setInterviews] = useState<Interview[]>(() => storage.getInterviews());
  const [jobForm, setJobForm] = useState(emptyJobForm);
  const [candidateForm, setCandidateForm] = useState(emptyCandidateForm);
  const [interviewForm, setInterviewForm] = useState(emptyInterviewForm);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(isFirebaseConfigured);

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
      firestoreService.getJobOpenings(),
      firestoreService.getCandidates(),
      firestoreService.getInterviews(),
    ])
      .then(([leaveRequests, employees, reports, jobOpenings, candidates, interviews]) => {
        setLeaveRequests(getReviewLeaveRequests(leaveRequests, 'HR'));
        setEmployees(employees);
        setReports(reports);
        setJobOpenings(jobOpenings);
        setCandidates(candidates);
        setInterviews(interviews);
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

  const saveJobOpening = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManageAts) return;

    const jobOpening: JobOpening = {
      id: editingJobId || createId('job'),
      ...jobForm,
      createdAt: editingJobId
        ? jobOpenings.find((job) => job.id === editingJobId)?.createdAt || today()
        : today(),
    };

    try {
      if (isFirebaseConfigured) {
        if (editingJobId) {
          await firestoreService.updateJobOpening(jobOpening);
        } else {
          await firestoreService.addJobOpening(jobOpening);
        }
      }
      const nextJobs = editingJobId
        ? jobOpenings.map((job) => (job.id === editingJobId ? jobOpening : job))
        : [jobOpening, ...jobOpenings];
      setJobOpenings(nextJobs);
      if (!isFirebaseConfigured) storage.setJobOpenings(nextJobs);
      setJobForm(emptyJobForm);
      setEditingJobId(null);
      notify(editingJobId ? 'Job opening updated.' : 'Job opening added.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to save job opening.');
    }
  };

  const editJobOpening = (job: JobOpening) => {
    setEditingJobId(job.id);
    setJobForm({
      title: job.title,
      department: job.department,
      location: job.location,
      experience: job.experience,
      salaryRange: job.salaryRange,
      status: job.status,
    });
  };

  const closeJobOpening = async (job: JobOpening) => {
    await updateJobOpening({ ...job, status: 'Closed' }, 'Job opening closed.');
  };

  const updateJobOpening = async (jobOpening: JobOpening, message: string) => {
    try {
      if (isFirebaseConfigured) await firestoreService.updateJobOpening(jobOpening);
      const nextJobs = jobOpenings.map((job) => (job.id === jobOpening.id ? jobOpening : job));
      setJobOpenings(nextJobs);
      if (!isFirebaseConfigured) storage.setJobOpenings(nextJobs);
      notify(message);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to update job opening.');
    }
  };

  const saveCandidate = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManageAts) return;

    const candidate: Candidate = {
      id: createId('candidate'),
      name: candidateForm.name,
      email: candidateForm.email,
      phone: candidateForm.phone,
      appliedRole: candidateForm.appliedRole,
      experience: candidateForm.experience,
      skills: splitSkills(candidateForm.skills),
      resumeLink: candidateForm.resumeLink || '#',
      status: candidateForm.status,
      appliedAt: today(),
    };

    try {
      if (isFirebaseConfigured) await firestoreService.addCandidate(candidate);
      const nextCandidates = [candidate, ...candidates];
      setCandidates(nextCandidates);
      if (!isFirebaseConfigured) storage.setCandidates(nextCandidates);
      setCandidateForm(emptyCandidateForm);
      notify('Candidate added.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to add candidate.');
    }
  };

  const updateCandidateStatus = async (candidate: Candidate, status: CandidateStatus) => {
    const nextCandidate = { ...candidate, status };
    try {
      if (isFirebaseConfigured) await firestoreService.updateCandidate(nextCandidate);
      const nextCandidates = candidates.map((item) => (item.id === candidate.id ? nextCandidate : item));
      setCandidates(nextCandidates);
      if (!isFirebaseConfigured) storage.setCandidates(nextCandidates);
      if (selectedCandidate?.id === candidate.id) setSelectedCandidate(nextCandidate);
      notify(`Candidate moved to ${status}.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to update candidate.');
    }
  };

  const saveInterview = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManageAts) return;

    const interview: Interview = {
      id: editingInterviewId || createId('interview'),
      ...interviewForm,
    };

    try {
      if (isFirebaseConfigured) {
        if (editingInterviewId) {
          await firestoreService.updateInterview(interview);
        } else {
          await firestoreService.addInterview(interview);
        }
      }
      const nextInterviews = editingInterviewId
        ? interviews.map((item) => (item.id === editingInterviewId ? interview : item))
        : [interview, ...interviews];
      setInterviews(nextInterviews);
      if (!isFirebaseConfigured) storage.setInterviews(nextInterviews);
      setInterviewForm(emptyInterviewForm);
      setEditingInterviewId(null);
      notify(editingInterviewId ? 'Interview updated.' : 'Interview scheduled.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to save interview.');
    }
  };

  const editInterview = (interview: Interview) => {
    setEditingInterviewId(interview.id);
    setInterviewForm({
      candidateName: interview.candidateName,
      role: interview.role,
      interviewDate: interview.interviewDate,
      interviewTime: interview.interviewTime,
      interviewer: interview.interviewer,
      status: interview.status,
      notes: interview.notes,
    });
  };

  const updateInterview = async (interview: Interview, status: InterviewStatus) => {
    const nextInterview = { ...interview, status };
    try {
      if (isFirebaseConfigured) await firestoreService.updateInterview(nextInterview);
      const nextInterviews = interviews.map((item) => (item.id === interview.id ? nextInterview : item));
      setInterviews(nextInterviews);
      if (!isFirebaseConfigured) storage.setInterviews(nextInterviews);
      notify(`Interview marked ${status.toLowerCase()}.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to update interview.');
    }
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}
      {loading ? <p className="text-sm text-slate-400">Loading HR data...</p> : null}
      <PageHeader
        eyebrow="HR Panel"
        title="People Operations Dashboard"
        subtitle="Monitor employee status, leave requests, reporting follow-up, and hiring activity from one workspace view."
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
        <JobOpeningsSection
          canManageAts={canManageAts}
          editingJobId={editingJobId}
          jobForm={jobForm}
          jobOpenings={jobOpenings}
          onCancelEdit={() => {
            setEditingJobId(null);
            setJobForm(emptyJobForm);
          }}
          onCloseJob={closeJobOpening}
          onEditJob={editJobOpening}
          onJobFormChange={setJobForm}
          onSaveJob={saveJobOpening}
        />
      ) : null}

      {activeTab === 'Candidates' && canManageAts ? (
        <CandidatesSection
          canManageAts={canManageAts}
          candidateForm={candidateForm}
          candidates={candidates}
          onCandidateFormChange={setCandidateForm}
          onSaveCandidate={saveCandidate}
          onSelectCandidate={setSelectedCandidate}
          onStatusChange={updateCandidateStatus}
          selectedCandidate={selectedCandidate}
        />
      ) : null}

      {activeTab === 'Interviews' && canManageAts ? (
        <InterviewsSection
          canManageAts={canManageAts}
          editingInterviewId={editingInterviewId}
          interviewForm={interviewForm}
          interviews={interviews}
          onCancelEdit={() => {
            setEditingInterviewId(null);
            setInterviewForm(emptyInterviewForm);
          }}
          onEditInterview={editInterview}
          onInterviewFormChange={setInterviewForm}
          onSaveInterview={saveInterview}
          onUpdateInterview={updateInterview}
        />
      ) : null}
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
    {showAts ? (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Open Jobs" value={atsStats.openJobs} icon={BriefcaseBusiness} />
        <StatCard title="Total Candidates" value={atsStats.totalCandidates} icon={Users} />
        <StatCard title="In Interview" value={atsStats.candidatesInInterview} icon={CalendarClock} />
        <StatCard title="Selected Candidates" value={atsStats.selectedCandidates} icon={UserCheck} />
      </div>
    ) : null}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Total Employees" value={stats.total} icon={Users} />
      <StatCard title="Active Employees" value={stats.active} icon={UserCheck} />
      <StatCard title="On Leave" value={stats.onLeave} icon={Hourglass} />
      <StatCard title="Pending Reports" value={stats.pendingReports} icon={ClipboardCheck} />
    </div>

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

const JobOpeningsSection = ({
  canManageAts,
  editingJobId,
  jobForm,
  jobOpenings,
  onCancelEdit,
  onCloseJob,
  onEditJob,
  onJobFormChange,
  onSaveJob,
}: {
  canManageAts: boolean;
  editingJobId: string | null;
  jobForm: typeof emptyJobForm;
  jobOpenings: JobOpening[];
  onCancelEdit: () => void;
  onCloseJob: (job: JobOpening) => void;
  onEditJob: (job: JobOpening) => void;
  onJobFormChange: (form: typeof emptyJobForm) => void;
  onSaveJob: (event: FormEvent) => void;
}) => (
  <div className="space-y-4">
    {canManageAts ? (
      <section className="surface p-5">
        <div className="flex items-center gap-3">
          <BriefcaseBusiness className="text-accent-500" size={22} />
          <div>
            <h3 className="text-lg font-semibold text-white">{editingJobId ? 'Edit job opening' : 'Add job opening'}</h3>
            <p className="text-sm text-slate-500">Create hiring roles with clear ownership and status.</p>
          </div>
        </div>
        <form onSubmit={onSaveJob} className="mt-5 grid gap-4 lg:grid-cols-3">
          <Field label="Job title" value={jobForm.title} onChange={(value) => onJobFormChange({ ...jobForm, title: value })} />
          <Field label="Department" value={jobForm.department} onChange={(value) => onJobFormChange({ ...jobForm, department: value })} />
          <Field label="Location" value={jobForm.location} onChange={(value) => onJobFormChange({ ...jobForm, location: value })} />
          <Field label="Experience" value={jobForm.experience} onChange={(value) => onJobFormChange({ ...jobForm, experience: value })} />
          <Field
            label="Salary range"
            value={jobForm.salaryRange}
            onChange={(value) => onJobFormChange({ ...jobForm, salaryRange: value })}
          />
          <SelectField
            label="Status"
            value={jobForm.status}
            options={jobStatuses}
            onChange={(value) => onJobFormChange({ ...jobForm, status: value as JobOpeningStatus })}
          />
          <div className="flex items-end gap-2 lg:col-span-3">
            <button type="submit" className="btn-primary">
              <Plus size={18} />
              {editingJobId ? 'Update job' : 'Add job'}
            </button>
            {editingJobId ? (
              <button type="button" className="btn-secondary" onClick={onCancelEdit}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>
    ) : null}

    <section className="surface overflow-hidden">
      <SectionTitle title="Job Openings" subtitle="Track active roles, hiring priority, and closure status." />
      <div className="overflow-x-auto">
        {jobOpenings.length === 0 ? (
          <EmptyPanel icon={BriefcaseBusiness} title="No job openings yet" description="New roles will appear here." />
        ) : (
          <table className="w-full min-w-[900px] text-left">
            <TableHead columns={['Job title', 'Department', 'Location', 'Experience', 'Salary range', 'Status', 'Created', 'Actions']} />
            <tbody className="divide-y divide-white/10">
              {jobOpenings.map((job) => (
                <tr key={job.id} className="transition hover:bg-white/[0.035]">
                  <td className="px-5 py-4 font-semibold text-white">{job.title}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{job.department}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{job.location}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{job.experience}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{job.salaryRange}</td>
                  <td className="px-5 py-4">
                    <AtsStatusPill status={job.status} />
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-300">{formatShortDate(job.createdAt)}</td>
                  <td className="px-5 py-4">
                    {canManageAts ? (
                      <div className="flex gap-2">
                        <button type="button" className="btn-secondary py-2" onClick={() => onEditJob(job)}>
                          <Pencil size={16} />
                          Edit
                        </button>
                        <button type="button" className="btn-secondary py-2" onClick={() => onCloseJob(job)}>
                          <XCircle size={16} />
                          Close
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  </div>
);

const CandidatesSection = ({
  canManageAts,
  candidateForm,
  candidates,
  onCandidateFormChange,
  onSaveCandidate,
  onSelectCandidate,
  onStatusChange,
  selectedCandidate,
}: {
  canManageAts: boolean;
  candidateForm: typeof emptyCandidateForm;
  candidates: Candidate[];
  onCandidateFormChange: (form: typeof emptyCandidateForm) => void;
  onSaveCandidate: (event: FormEvent) => void;
  onSelectCandidate: (candidate: Candidate | null) => void;
  onStatusChange: (candidate: Candidate, status: CandidateStatus) => void;
  selectedCandidate: Candidate | null;
}) => (
  <div className="space-y-4">
    {canManageAts ? (
      <section className="surface p-5">
        <div className="flex items-center gap-3">
          <Users className="text-accent-500" size={22} />
          <div>
            <h3 className="text-lg font-semibold text-white">Add candidate</h3>
            <p className="text-sm text-slate-500">Capture applicant details and move candidates through hiring stages.</p>
          </div>
        </div>
        <form onSubmit={onSaveCandidate} className="mt-5 grid gap-4 lg:grid-cols-3">
          <Field label="Candidate name" value={candidateForm.name} onChange={(value) => onCandidateFormChange({ ...candidateForm, name: value })} />
          <Field label="Email" type="email" value={candidateForm.email} onChange={(value) => onCandidateFormChange({ ...candidateForm, email: value })} />
          <Field label="Phone" value={candidateForm.phone} onChange={(value) => onCandidateFormChange({ ...candidateForm, phone: value })} />
          <Field
            label="Applied role"
            value={candidateForm.appliedRole}
            onChange={(value) => onCandidateFormChange({ ...candidateForm, appliedRole: value })}
          />
          <Field label="Experience" value={candidateForm.experience} onChange={(value) => onCandidateFormChange({ ...candidateForm, experience: value })} />
          <Field label="Skills" value={candidateForm.skills} onChange={(value) => onCandidateFormChange({ ...candidateForm, skills: value })} />
          <Field
            label="Resume link"
            required={false}
            value={candidateForm.resumeLink}
            onChange={(value) => onCandidateFormChange({ ...candidateForm, resumeLink: value })}
          />
          <SelectField
            label="Status"
            value={candidateForm.status}
            options={candidateStatuses}
            onChange={(value) => onCandidateFormChange({ ...candidateForm, status: value as CandidateStatus })}
          />
          <div className="flex items-end lg:col-span-3">
            <button type="submit" className="btn-primary">
              <Plus size={18} />
              Add candidate
            </button>
          </div>
        </form>
      </section>
    ) : null}

    <section className="surface overflow-hidden">
      <SectionTitle title="Candidates" subtitle="Review applicant profiles, skills, status, and hiring progress." />
      <div className="overflow-x-auto">
        {candidates.length === 0 ? (
          <EmptyPanel icon={Users} title="No candidates yet" description="Applicant records will appear here." />
        ) : (
          <table className="w-full min-w-[980px] text-left">
            <TableHead columns={['Candidate', 'Contact', 'Applied role', 'Experience', 'Skills', 'Resume', 'Status', 'Applied', 'Actions']} />
            <tbody className="divide-y divide-white/10">
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="transition hover:bg-white/[0.035]">
                  <td className="px-5 py-4 font-semibold text-white">{candidate.name}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">
                    <p>{candidate.email}</p>
                    <p className="mt-1 text-slate-500">{candidate.phone}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-300">{candidate.appliedRole}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{candidate.experience}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{candidate.skills.join(', ')}</td>
                  <td className="px-5 py-4 text-sm text-accent-100">{candidate.resumeLink || 'Placeholder'}</td>
                  <td className="px-5 py-4">
                    {canManageAts ? (
                      <select
                        className="field min-w-36 py-2"
                        value={candidate.status}
                        onChange={(event) => onStatusChange(candidate, event.target.value as CandidateStatus)}
                      >
                        {candidateStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <AtsStatusPill status={candidate.status} />
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-300">{formatShortDate(candidate.appliedAt)}</td>
                  <td className="px-5 py-4">
                    <button type="button" className="btn-secondary py-2" onClick={() => onSelectCandidate(candidate)}>
                      <Eye size={16} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>

    {selectedCandidate ? (
      <section className="surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent-500">Candidate Details</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{selectedCandidate.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{selectedCandidate.appliedRole}</p>
          </div>
          <button type="button" className="btn-secondary py-2" onClick={() => onSelectCandidate(null)}>
            Close
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DetailItem label="Email" value={selectedCandidate.email} />
          <DetailItem label="Phone" value={selectedCandidate.phone} />
          <DetailItem label="Experience" value={selectedCandidate.experience} />
          <DetailItem label="Status" value={selectedCandidate.status} />
          <DetailItem label="Skills" value={selectedCandidate.skills.join(', ')} wide />
          <DetailItem label="Resume" value={selectedCandidate.resumeLink || 'Placeholder'} />
        </div>
      </section>
    ) : null}
  </div>
);

const InterviewsSection = ({
  canManageAts,
  editingInterviewId,
  interviewForm,
  interviews,
  onCancelEdit,
  onEditInterview,
  onInterviewFormChange,
  onSaveInterview,
  onUpdateInterview,
}: {
  canManageAts: boolean;
  editingInterviewId: string | null;
  interviewForm: typeof emptyInterviewForm;
  interviews: Interview[];
  onCancelEdit: () => void;
  onEditInterview: (interview: Interview) => void;
  onInterviewFormChange: (form: typeof emptyInterviewForm) => void;
  onSaveInterview: (event: FormEvent) => void;
  onUpdateInterview: (interview: Interview, status: InterviewStatus) => void;
}) => (
  <div className="space-y-4">
    {canManageAts ? (
      <section className="surface p-5">
        <div className="flex items-center gap-3">
          <CalendarClock className="text-accent-500" size={22} />
          <div>
            <h3 className="text-lg font-semibold text-white">
              {editingInterviewId ? 'Update interview notes' : 'Schedule interview'}
            </h3>
            <p className="text-sm text-slate-500">Coordinate interview timing, ownership, and notes.</p>
          </div>
        </div>
        <form onSubmit={onSaveInterview} className="mt-5 grid gap-4 lg:grid-cols-3">
          <Field
            label="Candidate name"
            value={interviewForm.candidateName}
            onChange={(value) => onInterviewFormChange({ ...interviewForm, candidateName: value })}
          />
          <Field label="Role" value={interviewForm.role} onChange={(value) => onInterviewFormChange({ ...interviewForm, role: value })} />
          <Field
            label="Interview date"
            type="date"
            value={interviewForm.interviewDate}
            onChange={(value) => onInterviewFormChange({ ...interviewForm, interviewDate: value })}
          />
          <Field
            label="Interview time"
            type="time"
            value={interviewForm.interviewTime}
            onChange={(value) => onInterviewFormChange({ ...interviewForm, interviewTime: value })}
          />
          <Field
            label="Interviewer"
            value={interviewForm.interviewer}
            onChange={(value) => onInterviewFormChange({ ...interviewForm, interviewer: value })}
          />
          <SelectField
            label="Status"
            value={interviewForm.status}
            options={interviewStatuses}
            onChange={(value) => onInterviewFormChange({ ...interviewForm, status: value as InterviewStatus })}
          />
          <label className="block lg:col-span-3">
            <span className="mb-2 block text-sm font-medium text-slate-300">Notes</span>
            <textarea
              className="field min-h-28"
              value={interviewForm.notes}
              onChange={(event) => onInterviewFormChange({ ...interviewForm, notes: event.target.value })}
              placeholder="Add interview notes, next steps, or feedback."
            />
          </label>
          <div className="flex items-end gap-2 lg:col-span-3">
            <button type="submit" className="btn-primary">
              <Plus size={18} />
              {editingInterviewId ? 'Update interview' : 'Schedule interview'}
            </button>
            {editingInterviewId ? (
              <button type="button" className="btn-secondary" onClick={onCancelEdit}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>
    ) : null}

    <section className="surface overflow-hidden">
      <SectionTitle title="Interviews" subtitle="Manage scheduled conversations and hiring feedback." />
      <div className="overflow-x-auto">
        {interviews.length === 0 ? (
          <EmptyPanel icon={CalendarClock} title="No interviews scheduled" description="Interview plans will appear here." />
        ) : (
          <table className="w-full min-w-[940px] text-left">
            <TableHead columns={['Candidate', 'Role', 'Date', 'Time', 'Interviewer', 'Status', 'Notes', 'Actions']} />
            <tbody className="divide-y divide-white/10">
              {interviews.map((interview) => (
                <tr key={interview.id} className="transition hover:bg-white/[0.035]">
                  <td className="px-5 py-4 font-semibold text-white">{interview.candidateName}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{interview.role}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{formatShortDate(interview.interviewDate)}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{interview.interviewTime}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{interview.interviewer}</td>
                  <td className="px-5 py-4">
                    <AtsStatusPill status={interview.status} />
                  </td>
                  <td className="max-w-xs px-5 py-4 text-sm text-slate-300">
                    <p className="line-clamp-2">{interview.notes || 'No notes added.'}</p>
                  </td>
                  <td className="px-5 py-4">
                    {canManageAts ? (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn-secondary py-2" onClick={() => onUpdateInterview(interview, 'Completed')}>
                          Mark completed
                        </button>
                        <button type="button" className="btn-secondary py-2" onClick={() => onEditInterview(interview)}>
                          <Pencil size={16} />
                          Add notes
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  </div>
);

const Field = ({
  label,
  onChange,
  required = true,
  type = 'text',
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
    <input className="field" required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
);

const SelectField = ({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
    <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

const SectionTitle = ({ subtitle, title }: { subtitle: string; title: string }) => (
  <div className="border-b border-white/10 p-5">
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
  </div>
);

const TableHead = ({ columns }: { columns: string[] }) => (
  <thead className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.14em] text-slate-500">
    <tr>
      {columns.map((column) => (
        <th key={column} className="px-5 py-4">
          {column}
        </th>
      ))}
    </tr>
  </thead>
);

const AtsStatusPill = ({ status }: { status: string }) => (
  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(status)}`}>{status}</span>
);

const statusClass = (status: string) => {
  if (['Open', 'Selected', 'Completed'].includes(status)) return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200';
  if (['Paused', 'Screening', 'Interview', 'Scheduled', 'Applied'].includes(status)) {
    return 'border-accent-400/25 bg-accent-500/10 text-accent-100';
  }
  return 'border-slate-400/25 bg-slate-500/10 text-slate-300';
};

const EmptyPanel = ({
  description,
  icon,
  title,
}: {
  description: string;
  icon: typeof BriefcaseBusiness;
  title: string;
}) => (
  <div className="p-5">
    <EmptyState icon={icon} title={title} description={description} />
  </div>
);

const DetailItem = ({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) => (
  <div className={`rounded-lg border border-white/10 bg-white/[0.035] p-4 ${wide ? 'xl:col-span-2' : ''}`}>
    <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
    <p className="mt-2 text-sm font-semibold text-slate-100">{value}</p>
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

const splitSkills = (value: string) =>
  value
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

const today = () => new Date().toISOString().slice(0, 10);
