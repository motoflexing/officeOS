import type { ClientStatus } from '../types';

// Pill colors per the CRM spec, reusing the ring style from StatusBadge:
// Prospect=gray, Onboarding=yellow, Active=green, Paused=orange, Churned=red.
const statusClass: Record<ClientStatus, string> = {
  Prospect: 'bg-slate-500/16 text-slate-300 ring-slate-400/20',
  Onboarding: 'bg-amber-500/12 text-amber-300 ring-amber-400/25',
  Active: 'bg-emerald-500/12 text-emerald-300 ring-emerald-400/25',
  Paused: 'bg-orange-500/14 text-orange-300 ring-orange-400/25',
  Churned: 'bg-rose-500/12 text-rose-300 ring-rose-400/25',
};

export const ClientStatusPill = ({ status }: { status: ClientStatus }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClass[status]}`}>
    {status}
  </span>
);
