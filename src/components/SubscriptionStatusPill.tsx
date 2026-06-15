import type { SubscriptionStatus } from '../types';

// Pill colors per spec 2A.7: Onboarding=yellow, Active=green, Paused=orange,
// Cancelled=red, Renewed=blue. Reuses the ring style from the other CRM pills.
const statusClass: Record<SubscriptionStatus, string> = {
  Onboarding: 'bg-amber-500/12 text-amber-300 ring-amber-400/25',
  Active: 'bg-emerald-500/12 text-emerald-300 ring-emerald-400/25',
  Paused: 'bg-orange-500/14 text-orange-300 ring-orange-400/25',
  Cancelled: 'bg-rose-500/12 text-rose-300 ring-rose-400/25',
  Renewed: 'bg-sky-500/12 text-sky-300 ring-sky-400/25',
};

export const SubscriptionStatusPill = ({ status }: { status: SubscriptionStatus }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClass[status]}`}>
    {status}
  </span>
);
