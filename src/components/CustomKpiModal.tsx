import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CustomMetricDefinition } from '../types';

// Add/Edit modal for a custom KPI definition. `metric` null = adding a new one.
export const CustomKpiModal = ({
  metric,
  onClose,
  onSave,
}: {
  metric: CustomMetricDefinition | null;
  onClose: () => void;
  onSave: (values: { label: string; unit?: string; description?: string }) => void;
}) => {
  const [label, setLabel] = useState(metric?.label ?? '');
  const [unit, setUnit] = useState(metric?.unit ?? '');
  const [description, setDescription] = useState(metric?.description ?? '');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submit = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onSave({
      label: trimmed,
      unit: unit.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[var(--color-overlay-65)] px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Custom KPI"
      onClick={onClose}
    >
      <div
        className="surface w-full max-w-md border-[color:var(--color-accent-30)] p-6 shadow-[var(--shadow-glow-44-18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-[color:var(--color-text-primary)]">
            {metric ? 'Edit KPI' : 'Add KPI'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">
              Label <span className="text-[color:var(--color-error-text-300)]">*</span>
            </span>
            <input
              className="field"
              autoFocus
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
              placeholder="e.g. Backlog Tickets"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Unit</span>
            <input
              className="field"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              placeholder="e.g. tickets, %, hrs"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Description</span>
            <textarea
              className="field min-h-[72px]"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional context for this metric…"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={!label.trim()}>
            {metric ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};
