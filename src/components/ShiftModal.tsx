import { X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import type { Shift, ShiftRole, ShiftStatus } from '../types';

const SHIFT_ROLES: ShiftRole[] = ['Primary', 'Backup'];
const SHIFT_STATUSES: ShiftStatus[] = ['Scheduled', 'Completed', 'Missed', 'Swapped'];

// The payload the parent persists. Omits the fields firestoreService/storage stamp
// (id, companyId, clientId, agentNameSnapshot, createdAt, updatedAt) and engagementId
// (the calendar already knows which engagement it's working in).
export type ShiftFormValue = {
  agentId: string;
  date: string;
  startTime: string;
  endTime: string;
  role: ShiftRole;
  status: ShiftStatus;
  notes?: string;
};

// Add/edit a shift. `agents` is already scoped to this engagement's assigned agents
// (primary ∪ backup) — the dropdown never shows other employees.
export const ShiftModal = ({
  shift,
  agents,
  defaultDate,
  onClose,
  onSave,
}: {
  shift?: Shift | null;
  agents: { id: string; name: string }[];
  defaultDate?: string;
  onClose: () => void;
  onSave: (value: ShiftFormValue) => Promise<void>;
}) => {
  const [agentId, setAgentId] = useState(shift?.agentId ?? agents[0]?.id ?? '');
  const [date, setDate] = useState(shift?.date ?? defaultDate ?? '');
  const [startTime, setStartTime] = useState(shift?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(shift?.endTime ?? '17:00');
  const [role, setRole] = useState<ShiftRole>(shift?.role ?? 'Primary');
  const [status, setStatus] = useState<ShiftStatus>(shift?.status ?? 'Scheduled');
  const [notes, setNotes] = useState(shift?.notes ?? '');
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
    if (!agentId) {
      setError('Select an agent.');
      return;
    }
    if (!date) {
      setError('Date is required.');
      return;
    }
    if (!startTime || !endTime) {
      setError('Start and end time are required.');
      return;
    }
    if (endTime <= startTime) {
      setError('End time must be after start time.');
      return;
    }

    setSaving(true);
    try {
      await onSave({ agentId, date, startTime, endTime, role, status, notes: notes.trim() || undefined });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save shift.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--color-overlay-65)] px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={shift ? 'Edit shift' : 'Add shift'}
      onClick={onClose}
    >
      <form
        className="surface flex max-h-full w-full max-w-lg flex-col border-[color:var(--color-accent-30)] p-6 shadow-[var(--shadow-glow-44-18)]"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-[color:var(--color-accent)]">
            {shift ? 'Edit Shift' : 'Add Shift'}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Agent</span>
            {agents.length === 0 ? (
              <p className="rounded-lg border border-[color:var(--color-border-weak)] bg-[var(--color-fill-035)] px-3 py-2 text-sm text-[color:var(--color-text-muted)]">
                No agents assigned to this engagement yet. Add primary or backup agents first.
              </p>
            ) : (
              <select className="field" value={agentId} onChange={(event) => setAgentId(event.target.value)}>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Date</span>
            <input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Role</span>
            <select className="field" value={role} onChange={(event) => setRole(event.target.value as ShiftRole)}>
              {SHIFT_ROLES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Start Time</span>
            <input className="field" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">End Time</span>
            <input className="field" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Status</span>
            <select className="field" value={status} onChange={(event) => setStatus(event.target.value as ShiftStatus)}>
              {SHIFT_STATUSES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Notes</span>
            <textarea className="field min-h-[80px]" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-[color:var(--color-error-line-25)] bg-[var(--color-error-fill-10)] px-4 py-3 text-sm text-[color:var(--color-error-text-200)]">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving || agents.length === 0}>
            {saving ? 'Saving…' : shift ? 'Save Shift' : 'Add Shift'}
          </button>
        </div>
      </form>
    </div>
  );
};
