import { X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { CLIENT_STATUSES, HELPDESK_TOOLS, INDUSTRIES } from '../config/crmOptions';
import type { Client, ClientStatus, Employee, HelpdeskTool, Industry } from '../types';

// The subset of Client a user can edit (id/timestamps are managed by the service).
export type ClientEditPatch = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>;

// Full edit modal exposing every client field (spec B.4 "Edit button → full edit modal").
export const ClientEditModal = ({
  client,
  employees,
  onClose,
  onSave,
}: {
  client: Client;
  employees: Employee[];
  onClose: () => void;
  onSave: (patch: ClientEditPatch) => Promise<void>;
}) => {
  const [companyName, setCompanyName] = useState(client.companyName);
  const [status, setStatus] = useState<ClientStatus>(client.status);
  const [industry, setIndustry] = useState<Industry | ''>(client.industry ?? '');
  const [website, setWebsite] = useState(client.website ?? '');
  const [country, setCountry] = useState(client.country ?? '');
  const [timezone, setTimezone] = useState(client.timezone ?? '');
  const [employeeCount, setEmployeeCount] = useState(
    client.employeeCount === undefined ? '' : String(client.employeeCount),
  );
  const [helpdeskTool, setHelpdeskTool] = useState<HelpdeskTool | ''>(client.helpdeskTool ?? '');
  const [foundingClient, setFoundingClient] = useState(Boolean(client.foundingClient));
  const [ownerEmployeeId, setOwnerEmployeeId] = useState(client.ownerEmployeeId ?? '');
  const [notes, setNotes] = useState(client.notes ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = companyName.trim();
    if (!trimmedName) {
      setError('Company name is required.');
      return;
    }
    const count = employeeCount.trim() === '' ? undefined : Number(employeeCount);
    if (count !== undefined && Number.isNaN(count)) {
      setError('Employee count must be a number.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        companyName: trimmedName,
        status,
        industry: industry || undefined,
        website: website.trim() || undefined,
        country: country.trim() || undefined,
        timezone: timezone.trim() || undefined,
        employeeCount: count,
        helpdeskTool: helpdeskTool || undefined,
        foundingClient,
        ownerEmployeeId: ownerEmployeeId || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save client.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Edit client"
      onClick={onClose}
    >
      <form
        className="surface flex max-h-full w-full max-w-2xl flex-col border-accent-500/30 p-6 shadow-[0_0_44px_rgba(239,35,43,0.18)]"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">Edit Client</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/[0.055] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-300">Company Name</span>
            <input className="field" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Status</span>
            <select className="field" value={status} onChange={(event) => setStatus(event.target.value as ClientStatus)}>
              {CLIENT_STATUSES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Industry</span>
            <select className="field" value={industry} onChange={(event) => setIndustry(event.target.value as Industry | '')}>
              <option value="">—</option>
              {INDUSTRIES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Website</span>
            <input
              className="field"
              type="url"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="https://example.com"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Country</span>
            <input className="field" value={country} onChange={(event) => setCountry(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Timezone</span>
            <input
              className="field"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="Asia/Kolkata"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Employee Count</span>
            <input
              className="field"
              type="number"
              value={employeeCount}
              onChange={(event) => setEmployeeCount(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Helpdesk Tool</span>
            <select
              className="field"
              value={helpdeskTool}
              onChange={(event) => setHelpdeskTool(event.target.value as HelpdeskTool | '')}
            >
              <option value="">—</option>
              {HELPDESK_TOOLS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Owner</span>
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
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-300">Notes</span>
            <textarea
              className="field min-h-[90px]"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => setFoundingClient((value) => !value)}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 text-left transition hover:border-accent-500/40 md:col-span-2"
          >
            <span className="font-medium text-slate-200">Founding client</span>
            <span
              className={`relative h-6 w-11 rounded-full transition ${foundingClient ? 'bg-accent-600' : 'bg-slate-700'}`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${foundingClient ? 'left-6' : 'left-1'}`}
              />
            </span>
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Client'}
          </button>
        </div>
      </form>
    </div>
  );
};
