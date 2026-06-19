import type { InvoiceStatus } from '../types';

// Pill colors per spec 5A.8: Draft=gray, Sent=blue, Paid=green, Overdue=red,
// Void=muted+strikethrough. Takes the *effective* status (Overdue is computed via
// getEffectiveStatus). Reuses the ring style from the other CRM pills.
const statusClass: Record<InvoiceStatus | 'Overdue', string> = {
  Draft: 'bg-[var(--color-neutral-fill-16)] text-[color:var(--color-text-secondary)] ring-[color:var(--color-neutral-ring-20)]',
  Sent: 'bg-sky-500/12 text-sky-300 ring-sky-400/25',
  Paid: 'bg-[var(--color-success-fill-12)] text-[color:var(--color-success-text-300)] ring-[color:var(--color-success-ring-25)]',
  Overdue: 'bg-[var(--color-error-fill-12)] text-[color:var(--color-error-text-300)] ring-[color:var(--color-error-ring-25)]',
  Void: 'bg-[var(--color-neutral-fill-10)] text-[color:var(--color-text-muted)] ring-[color:var(--color-neutral-ring-15)] line-through',
};

export const InvoiceStatusPill = ({ status }: { status: InvoiceStatus | 'Overdue' }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClass[status]}`}>
    {status}
  </span>
);
