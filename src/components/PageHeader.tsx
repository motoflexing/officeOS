export const PageHeader = ({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
    <div>
      {eyebrow ? (
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-[color:var(--color-accent)]">{eyebrow}</p>
      ) : null}
      <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[color:var(--color-text-primary)]">{title}</h2>
      {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--color-text-secondary)]">{subtitle}</p> : null}
    </div>
    {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
  </div>
);
