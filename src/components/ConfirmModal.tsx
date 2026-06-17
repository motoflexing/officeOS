import { AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';

// Styled confirm dialog used across CRM in place of window.confirm, matching the
// overlay/modal aesthetic of NewChatModal. `destructive` tints the confirm button red.
export const ConfirmModal = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay-65)] px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div
        className="surface w-full max-w-md border-[color:var(--color-accent-30)] p-6 shadow-[var(--shadow-glow-44-18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {destructive ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-error-fill-15)] text-[color:var(--color-error-text-300)]">
                <AlertTriangle size={18} />
              </span>
            ) : null}
            <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded-lg p-1 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-[color:var(--color-text-secondary)]">{message}</p>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              destructive
                ? 'inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-error-solid)] px-4 py-2.5 text-sm font-semibold text-[color:var(--color-text-primary)] transition hover:bg-[var(--color-error-solid-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-error-ring-40)]'
                : 'btn-primary'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
