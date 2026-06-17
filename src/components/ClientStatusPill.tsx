import type { ClientStatus } from '../types';

// Pill colors per the CRM spec, reusing the ring style from StatusBadge:
// Prospect=gray, Onboarding=yellow, Active=green, Paused=orange, Churned=red.
const statusClass: Record<ClientStatus, string> = {
  Prospect: 'bg-[var(--color-neutral-fill-16)] text-[color:var(--color-text-secondary)] ring-[color:var(--color-neutral-ring-20)]',
  Onboarding: 'bg-[var(--color-warning-fill-12)] text-[color:var(--color-warning-text-300)] ring-[color:var(--color-warning-ring-25)]',
  Active: 'bg-[var(--color-success-fill-12)] text-[color:var(--color-success-text-300)] ring-[color:var(--color-success-ring-25)]',
  Paused: 'bg-orange-500/14 text-orange-300 ring-orange-400/25',
  Churned: 'bg-[var(--color-error-fill-12)] text-[color:var(--color-error-text-300)] ring-[color:var(--color-error-ring-25)]',
};

export const ClientStatusPill = ({ status }: { status: ClientStatus }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClass[status]}`}>
    {status}
  </span>
);
