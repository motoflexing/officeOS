import type { ChecklistItemStatus } from '../types';

// Pill colors per spec 2C.6: Pending=gray, In Progress=yellow, Done=green, Skipped=muted.
const statusClass: Record<ChecklistItemStatus, string> = {
  Pending: 'bg-[var(--color-neutral-fill-16)] text-[color:var(--color-text-secondary)] ring-[color:var(--color-neutral-ring-20)]',
  'In Progress': 'bg-[var(--color-warning-fill-12)] text-[color:var(--color-warning-text-300)] ring-[color:var(--color-warning-ring-25)]',
  Done: 'bg-[var(--color-success-fill-12)] text-[color:var(--color-success-text-300)] ring-[color:var(--color-success-ring-25)]',
  Skipped: 'bg-[var(--color-neutral-fill-10)] text-[color:var(--color-text-muted)] ring-[color:var(--color-neutral-ring-15)]',
};

export const ChecklistItemStatusPill = ({ status }: { status: ChecklistItemStatus }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClass[status]}`}>
    {status}
  </span>
);
