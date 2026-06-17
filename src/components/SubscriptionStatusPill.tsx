import type { SubscriptionStatus } from '../types';

// Pill colors per spec 2A.7: Onboarding=yellow, Active=green, Paused=orange,
// Cancelled=red, Renewed=blue. Reuses the ring style from the other CRM pills.
const statusClass: Record<SubscriptionStatus, string> = {
  Onboarding: 'bg-[var(--color-warning-fill-12)] text-[color:var(--color-warning-text-300)] ring-[color:var(--color-warning-ring-25)]',
  Active: 'bg-[var(--color-success-fill-12)] text-[color:var(--color-success-text-300)] ring-[color:var(--color-success-ring-25)]',
  Paused: 'bg-orange-500/14 text-orange-300 ring-orange-400/25',
  Cancelled: 'bg-[var(--color-error-fill-12)] text-[color:var(--color-error-text-300)] ring-[color:var(--color-error-ring-25)]',
  Renewed: 'bg-sky-500/12 text-sky-300 ring-sky-400/25',
};

export const SubscriptionStatusPill = ({ status }: { status: SubscriptionStatus }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClass[status]}`}>
    {status}
  </span>
);
