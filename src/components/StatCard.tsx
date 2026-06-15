import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  caption?: string;
}

export const StatCard = ({ title, value, icon: Icon, caption }: StatCardProps) => (
  <article className="surface p-5 transition hover:-translate-y-0.5 hover:border-accent-500/30 hover:shadow-[0_0_34px_rgba(239,35,43,0.12)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <p className="mt-3 text-2xl font-semibold tracking-normal text-white">{value}</p>
      </div>
      <div className="rounded-lg border border-accent-500/25 bg-accent-500/12 p-2.5 text-accent-400 shadow-[0_0_24px_rgba(239,35,43,0.2)]">
        <Icon size={20} />
      </div>
    </div>
    {caption ? <p className="mt-4 text-xs text-slate-500">{caption}</p> : null}
  </article>
);
