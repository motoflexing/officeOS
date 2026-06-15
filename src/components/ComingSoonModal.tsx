import { useEffect } from 'react';

export type ComingSoonAction = 'post-job' | 'add-candidate' | 'schedule-interview';

const actionPhrase: Record<ComingSoonAction, string> = {
  'post-job': 'post a job',
  'add-candidate': 'add a candidate',
  'schedule-interview': 'schedule an interview',
};

export const ComingSoonModal = ({ action, onClose }: { action: ComingSoonAction; onClose: () => void }) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Coming soon"
      onClick={onClose}
    >
      <div
        className="surface w-full max-w-md border-accent-500/30 p-6 shadow-[0_0_44px_rgba(239,35,43,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">Coming soon</p>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Coming soon — this will let you {actionPhrase[action]} in the next release.
        </p>
        <div className="mt-6 flex justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
