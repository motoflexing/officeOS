import { BRANDING } from '../config/branding';

interface PoweredByProps {
  variant?: 'footer' | 'badge';
}

export const PoweredBy = ({ variant = 'footer' }: PoweredByProps) => {
  if (variant === 'badge') {
    return (
      <div className="mt-4 inline-flex flex-col gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-400">
        <span>Powered by {BRANDING.poweredBy}</span>
        <a
          href={BRANDING.websiteUrl}
          target="_blank"
          rel="noreferrer"
          className="text-accent-500 transition hover:text-accent-400"
        >
          Know more about us at {BRANDING.websiteLabel}
        </a>
      </div>
    );
  }

  return (
    <div className="px-2 text-xs font-medium text-slate-600">
      <p>Powered by {BRANDING.poweredBy}</p>
      <a
        href={BRANDING.websiteUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-block text-slate-500 transition hover:text-accent-500"
      >
        Know more about us at {BRANDING.websiteLabel}
      </a>
    </div>
  );
};
