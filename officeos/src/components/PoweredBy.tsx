import { BRANDING } from '../config/branding';

interface PoweredByProps {
  variant?: 'footer' | 'badge';
}

export const PoweredBy = ({ variant = 'footer' }: PoweredByProps) => {
  if (variant === 'badge') {
    return (
      <div className="mt-4 inline-flex flex-col gap-1 rounded-lg border border-accent-500/20 bg-black/40 px-3 py-2 text-xs font-medium text-slate-400">
        <span>Powered by</span>
        <span className="font-semibold text-accent-400">{BRANDING.poweredBy}</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-accent-500/25 bg-gradient-to-br from-accent-500/12 via-black/35 to-black/70 px-4 py-3 shadow-[0_0_30px_rgba(239,35,43,0.12)]">
      <p className="text-xs font-medium text-slate-500">Powered by</p>
      <p className="mt-1 text-base font-bold text-white">{BRANDING.poweredBy}</p>
      <a
        href="https://motoflexing.com"
        target="_blank"
        rel="noopener noreferrer"
        className="group mt-2 inline-flex w-fit cursor-pointer items-center gap-1 text-sm font-semibold text-accent-400 transition hover:text-accent-300 focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-accent-500/70"
      >
        <span className="underline-offset-4 group-hover:underline">Know more about us</span>
        <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
          -&gt;
        </span>
      </a>
    </div>
  );
};
