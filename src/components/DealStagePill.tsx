import type { DealStage } from '../types';

// Stage pill colors per spec C.2: Lead=gray, Consultation Booked=blue,
// Proposal Sent=yellow, Negotiation=orange, Won=green, Lost=red.
const stageClass: Record<DealStage, string> = {
  Lead: 'bg-slate-500/16 text-slate-300 ring-slate-400/20',
  'Consultation Booked': 'bg-sky-500/12 text-sky-300 ring-sky-400/25',
  'Proposal Sent': 'bg-amber-500/12 text-amber-300 ring-amber-400/25',
  Negotiation: 'bg-orange-500/14 text-orange-300 ring-orange-400/25',
  Won: 'bg-emerald-500/12 text-emerald-300 ring-emerald-400/25',
  Lost: 'bg-rose-500/12 text-rose-300 ring-rose-400/25',
};

export const DealStagePill = ({ stage }: { stage: DealStage }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${stageClass[stage]}`}>
    {stage}
  </span>
);
