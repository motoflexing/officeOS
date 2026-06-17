import type { DealStage } from '../types';

// Stage pill colors per spec C.2: Lead=gray, Consultation Booked=blue,
// Proposal Sent=yellow, Negotiation=orange, Won=green, Lost=red.
const stageClass: Record<DealStage, string> = {
  Lead: 'bg-[var(--color-neutral-fill-16)] text-[color:var(--color-text-secondary)] ring-[color:var(--color-neutral-ring-20)]',
  'Consultation Booked': 'bg-sky-500/12 text-sky-300 ring-sky-400/25',
  'Proposal Sent': 'bg-[var(--color-warning-fill-12)] text-[color:var(--color-warning-text-300)] ring-[color:var(--color-warning-ring-25)]',
  Negotiation: 'bg-orange-500/14 text-orange-300 ring-orange-400/25',
  Won: 'bg-[var(--color-success-fill-12)] text-[color:var(--color-success-text-300)] ring-[color:var(--color-success-ring-25)]',
  Lost: 'bg-[var(--color-error-fill-12)] text-[color:var(--color-error-text-300)] ring-[color:var(--color-error-ring-25)]',
};

export const DealStagePill = ({ stage }: { stage: DealStage }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${stageClass[stage]}`}>
    {stage}
  </span>
);
