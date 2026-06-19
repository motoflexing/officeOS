import type { SlaReportStatus } from '../types';

// Pill colors per spec 4.6: Draft=yellow, Sent=green. Reuses the ring style from
// the other CRM pills (SubscriptionStatusPill, ChecklistItemStatusPill).
const statusClass: Record<SlaReportStatus, string> = {
  Draft: 'bg-[var(--color-warning-fill-12)] text-[color:var(--color-warning-text-300)] ring-[color:var(--color-warning-ring-25)]',
  Sent: 'bg-[var(--color-success-fill-12)] text-[color:var(--color-success-text-300)] ring-[color:var(--color-success-ring-25)]',
};

export const SlaReportStatusPill = ({ status }: { status: SlaReportStatus }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClass[status]}`}>
    {status}
  </span>
);
