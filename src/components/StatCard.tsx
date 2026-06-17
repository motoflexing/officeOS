import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  caption?: string;
}

export const StatCard = ({ title, value, icon: Icon, caption }: StatCardProps) => (
  <article className="surface p-5 transition hover:-translate-y-0.5 hover:border-[color:var(--color-accent-30)] hover:shadow-[var(--shadow-glow-34-12)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[color:var(--color-text-secondary)]">{title}</p>
        <p className="mt-3 text-2xl font-semibold tracking-normal text-[color:var(--color-text-primary)]">{value}</p>
      </div>
      <div className="rounded-lg border border-[color:var(--color-accent-25)] bg-[var(--color-accent-12)] p-2.5 text-accent-400 shadow-[var(--shadow-glow-24-20)]">
        <Icon size={20} />
      </div>
    </div>
    {caption ? <p className="mt-4 text-xs text-[color:var(--color-text-muted)]">{caption}</p> : null}
  </article>
);
