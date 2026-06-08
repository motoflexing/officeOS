import type { LucideIcon } from 'lucide-react';

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className="surface p-8 text-center">
    {Icon ? (
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500">
        <Icon size={22} />
      </div>
    ) : null}
    <h3 className={Icon ? 'mt-4 text-lg font-semibold text-white' : 'text-lg font-semibold text-white'}>{title}</h3>
    {description ? <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">{description}</p> : null}
    {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
  </div>
);
