interface PoweredByProps {
  variant?: 'footer' | 'badge';
}

export const PoweredBy = ({ variant = 'footer' }: PoweredByProps) => {
  if (variant === 'badge') {
    return (
      <span className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-400">
        Prototype &bull; Powered by CompanyOS
      </span>
    );
  }

  return <p className="px-2 text-xs font-medium text-slate-600">Powered by CompanyOS</p>;
};
