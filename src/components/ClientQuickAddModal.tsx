import { Plus, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { CLIENT_STATUSES, INDUSTRIES } from '../config/crmOptions';
import type { ClientStatus, Employee, Industry } from '../types';

export type QuickAddClient = {
  companyName: string;
  status: ClientStatus;
  industry?: Industry;
  ownerEmployeeId?: string;
};

// Quick-add modal per spec B.3: just the essentials. The parent persists the client
// and either navigates to its detail page (Save) or resets for another (Save & Add Another).
export const ClientQuickAddModal = ({
  employees,
  defaultOwnerEmployeeId,
  onClose,
  onSave,
}: {
  employees: Employee[];
  defaultOwnerEmployeeId?: string;
  onClose: () => void;
  onSave: (client: QuickAddClient, addAnother: boolean) => Promise<void>;
}) => {
  const [companyName, setCompanyName] = useState('');
  const [status, setStatus] = useState<ClientStatus>('Prospect');
  const [industry, setIndustry] = useState<Industry | ''>('');
  const [ownerEmployeeId, setOwnerEmployeeId] = useState(defaultOwnerEmployeeId ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const reset = () => {
    setCompanyName('');
    setStatus('Prospect');
    setIndustry('');
    setOwnerEmployeeId(defaultOwnerEmployeeId ?? '');
    setError('');
  };

  const submit = async (addAnother: boolean) => {
    const trimmed = companyName.trim();
    if (!trimmed) {
      setError('Company name is required.');
      return;
    }
    setSaving(true);
    try {
      await onSave(
        {
          companyName: trimmed,
          status,
          industry: industry || undefined,
          ownerEmployeeId: ownerEmployeeId || undefined,
        },
        addAnother,
      );
      if (addAnother) reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save client.');
    } finally {
      setSaving(false);
    }
  };

  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Add client"
      onClick={onClose}
    >
      <form
        className="surface w-full max-w-lg border-accent-500/30 p-6 shadow-[0_0_44px_rgba(239,35,43,0.18)]"
        onClick={(event) => event.stopPropagation()}
        onSubmit={onFormSubmit}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">Add Client</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/[0.055] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Company Name</span>
            <input
              className="field"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Acme Inc."
              required
              autoFocus
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Status</span>
              <select className="field" value={status} onChange={(event) => setStatus(event.target.value as ClientStatus)}>
                {CLIENT_STATUSES.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Industry (optional)</span>
              <select
                className="field"
                value={industry}
                onChange={(event) => setIndustry(event.target.value as Industry | '')}
              >
                <option value="">—</option>
                {INDUSTRIES.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Owner (optional)</span>
            <select
              className="field"
              value={ownerEmployeeId}
              onChange={(event) => setOwnerEmployeeId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => void submit(true)} disabled={saving}>
            <Plus size={18} />
            Save &amp; Add Another
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};
