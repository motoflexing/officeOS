import type { ChecklistItemStatus } from '../types';

// Pill colors per spec 2C.6: Pending=gray, In Progress=yellow, Done=green, Skipped=muted.
const statusClass: Record<ChecklistItemStatus, string> = {
  Pending: 'bg-slate-500/16 text-slate-300 ring-slate-400/20',
  'In Progress': 'bg-amber-500/12 text-amber-300 ring-amber-400/25',
  Done: 'bg-emerald-500/12 text-emerald-300 ring-emerald-400/25',
  Skipped: 'bg-slate-500/10 text-slate-500 ring-slate-500/15',
};

export const ChecklistItemStatusPill = ({ status }: { status: ChecklistItemStatus }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClass[status]}`}>
    {status}
  </span>
);
