import type { EmployeeStatus, EmploymentStatus, LeaveStatus, ReportStatus } from '../types';

const statusClass: Record<string, string> = {
  'At Work': 'bg-emerald-500/12 text-emerald-300 ring-emerald-400/25',
  Away: 'bg-amber-500/12 text-amber-300 ring-amber-400/25',
  'Checked Out': 'bg-slate-500/16 text-slate-300 ring-slate-400/20',
  Pending: 'bg-amber-500/12 text-amber-300 ring-amber-400/25',
  Approved: 'bg-emerald-500/12 text-emerald-300 ring-emerald-400/25',
  Rejected: 'bg-rose-500/12 text-rose-300 ring-rose-400/25',
  Active: 'bg-emerald-500/12 text-emerald-300 ring-emerald-400/25',
  Inactive: 'bg-slate-500/16 text-slate-300 ring-slate-400/20',
  'On Leave': 'bg-accent-500/12 text-accent-300 ring-accent-400/25',
  Submitted: 'bg-amber-500/12 text-amber-300 ring-amber-400/25',
  Reviewed: 'bg-emerald-500/12 text-emerald-300 ring-emerald-400/25',
};

export const StatusBadge = ({ status }: { status: EmployeeStatus | EmploymentStatus | LeaveStatus | ReportStatus }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClass[status]}`}>
    {status}
  </span>
);
