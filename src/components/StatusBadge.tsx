import type { EmployeeStatus, EmploymentStatus, LeaveStatus, ReportStatus } from '../types';

const statusClass: Record<string, string> = {
  'At Work': 'bg-[var(--color-success-fill-12)] text-[color:var(--color-success-text-300)] ring-[color:var(--color-success-ring-25)]',
  Away: 'bg-[var(--color-warning-fill-12)] text-[color:var(--color-warning-text-300)] ring-[color:var(--color-warning-ring-25)]',
  'Checked Out': 'bg-[var(--color-neutral-fill-16)] text-[color:var(--color-text-secondary)] ring-[color:var(--color-neutral-ring-20)]',
  Pending: 'bg-[var(--color-warning-fill-12)] text-[color:var(--color-warning-text-300)] ring-[color:var(--color-warning-ring-25)]',
  Approved: 'bg-[var(--color-success-fill-12)] text-[color:var(--color-success-text-300)] ring-[color:var(--color-success-ring-25)]',
  Rejected: 'bg-[var(--color-error-fill-12)] text-[color:var(--color-error-text-300)] ring-[color:var(--color-error-ring-25)]',
  Active: 'bg-[var(--color-success-fill-12)] text-[color:var(--color-success-text-300)] ring-[color:var(--color-success-ring-25)]',
  Inactive: 'bg-[var(--color-neutral-fill-16)] text-[color:var(--color-text-secondary)] ring-[color:var(--color-neutral-ring-20)]',
  'On Leave': 'bg-[var(--color-accent-12)] text-accent-300 ring-accent-400/25',
  Submitted: 'bg-[var(--color-warning-fill-12)] text-[color:var(--color-warning-text-300)] ring-[color:var(--color-warning-ring-25)]',
  Reviewed: 'bg-[var(--color-success-fill-12)] text-[color:var(--color-success-text-300)] ring-[color:var(--color-success-ring-25)]',
};

export const StatusBadge = ({ status }: { status: EmployeeStatus | EmploymentStatus | LeaveStatus | ReportStatus }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClass[status]}`}>
    {status}
  </span>
);
