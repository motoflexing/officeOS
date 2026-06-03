import { ClipboardCheck, Hourglass, UserCheck, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { employees } from '../data/mockData';
import { storage } from '../services/storage';
import type { LeaveRequest, LeaveStatus } from '../types';
import { formatShortDate } from '../utils/format';

export const HRPanelPage = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => storage.getLeaveRequests());
  const reports = storage.getReports();

  const stats = useMemo(
    () => ({
      total: employees.length,
      present: employees.filter((employee) => employee.status === 'At Work').length,
      away: employees.filter((employee) => employee.status === 'Away').length,
      pendingReports: Math.max(employees.length - reports.length, 0),
    }),
    [reports.length],
  );

  const updateLeave = (id: string, status: LeaveStatus) => {
    const nextRequests = leaveRequests.map((request) =>
      request.id === id ? { ...request, status } : request,
    );
    setLeaveRequests(nextRequests);
    storage.setLeaveRequests(nextRequests);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">HR Panel</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">People Operations Dashboard</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Employees" value={stats.total} icon={Users} />
        <StatCard title="Present Today" value={stats.present} icon={UserCheck} />
        <StatCard title="Away" value={stats.away} icon={Hourglass} />
        <StatCard title="Pending Reports" value={stats.pendingReports} icon={ClipboardCheck} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="surface p-5">
          <h3 className="text-lg font-semibold text-white">Attendance Overview</h3>
          <div className="mt-5 space-y-4">
            {[
              ['At Work', stats.present, 'bg-emerald-400'],
              ['Away', stats.away, 'bg-amber-400'],
              ['Checked Out', employees.filter((employee) => employee.status === 'Checked Out').length, 'bg-slate-400'],
            ].map(([label, value, color]) => (
              <div key={label as string}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-medium text-white">{value as number}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className={`h-2 rounded-full ${color}`}
                    style={{ width: `${((value as number) / employees.length) * 100}%` }}
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
          <h3 className="text-lg font-semibold text-white">Leave Requests</h3>
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
          <h3 className="text-lg font-semibold text-white">Leave Requests Table</h3>
        </div>
        <div className="overflow-x-auto">
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
        </div>
      </section>
    </div>
  );
};

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
