import { X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Activity, ActivityType, Contact, Deal, RelatedEntity } from '../types';
import { activityIcon } from './ActivityTypeIcon';

// employeeId is injected by the tab from the current user, not entered in the modal.
export type ActivityInput = Omit<Activity, 'id' | 'clientId' | 'createdAt' | 'employeeId'>;

const ACTIVITY_TYPES: ActivityType[] = ['Call', 'Email', 'Meeting', 'Note'];
// Types that auto-default completedAt to "now" on add, and that surface an outcome field.
const COMPLETABLE_TYPES: ActivityType[] = ['Call', 'Email', 'Meeting'];
const OUTCOME_TYPES: ActivityType[] = ['Call', 'Meeting'];

// datetime-local <-> ISO conversion. The input wants "YYYY-MM-DDTHH:mm" in local time;
// we store ISO. Guard against invalid values so a bad string never crashes the form.
const isoToLocalInput = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};
const localInputToIso = (value: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export const ActivityModal = ({
  activity,
  deals,
  contacts,
  onClose,
  onSave,
}: {
  activity: Activity | null;
  deals: Deal[];
  contacts: Contact[];
  onClose: () => void;
  onSave: (input: ActivityInput) => Promise<void>;
}) => {
  const isEdit = Boolean(activity);
  const [type, setType] = useState<ActivityType>(activity?.type ?? 'Call');
  const [subject, setSubject] = useState(activity?.subject ?? '');
  const [body, setBody] = useState(activity?.body ?? '');
  const [relatedTo, setRelatedTo] = useState<RelatedEntity | 'none'>(activity?.relatedTo ?? 'none');
  const [relatedId, setRelatedId] = useState(activity?.relatedId ?? '');
  const [scheduledAt, setScheduledAt] = useState(isoToLocalInput(activity?.scheduledAt));
  // On add, default completedAt to now for Call/Email/Meeting; Notes start blank.
  const [completedAt, setCompletedAt] = useState(
    isEdit
      ? isoToLocalInput(activity?.completedAt)
      : COMPLETABLE_TYPES.includes(activity?.type ?? 'Call')
        ? isoToLocalInput(new Date().toISOString())
        : '',
  );
  const [outcome, setOutcome] = useState(activity?.outcome ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Auto-grow the body textarea to its content.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [body]);

  // Changing type to a completable one (on add) seeds completedAt = now if still empty.
  const onTypeChange = (next: ActivityType) => {
    setType(next);
    if (!isEdit && COMPLETABLE_TYPES.includes(next) && !completedAt) {
      setCompletedAt(isoToLocalInput(new Date().toISOString()));
    }
  };

  // Reset the related-entity id whenever the relation kind changes.
  const onRelatedToChange = (next: RelatedEntity | 'none') => {
    setRelatedTo(next);
    setRelatedId('');
  };

  const relatedOptions = useMemo(() => {
    if (relatedTo === 'deal') return deals.map((deal) => ({ id: deal.id, label: deal.title }));
    if (relatedTo === 'contact')
      return contacts.map((contact) => ({ id: contact.id, label: `${contact.firstName} ${contact.lastName}` }));
    return [];
  }, [relatedTo, deals, contacts]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      setError('Subject is required.');
      return;
    }
    const linkSet = relatedTo !== 'none';
    if (linkSet && !relatedId) {
      setError(`Select a ${relatedTo} to link, or choose None.`);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        type,
        subject: trimmedSubject,
        body: body.trim() || undefined,
        relatedTo: linkSet ? relatedTo : undefined,
        relatedId: linkSet ? relatedId : undefined,
        scheduledAt: localInputToIso(scheduledAt),
        completedAt: localInputToIso(completedAt),
        outcome: OUTCOME_TYPES.includes(type) ? outcome.trim() || undefined : undefined,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save activity.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Activity"
      onClick={onClose}
    >
      <form
        className="surface flex max-h-full w-full max-w-xl flex-col border-accent-500/30 p-6 shadow-[0_0_44px_rgba(239,35,43,0.18)]"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">
            {isEdit ? 'Edit Activity' : 'Log Activity'}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/[0.055] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-4 overflow-y-auto pr-1">
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-300">Type</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ACTIVITY_TYPES.map((option) => {
                const Icon = activityIcon(option);
                const active = type === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onTypeChange(option)}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? 'bg-accent-500 text-white shadow-[0_0_24px_rgba(239,35,43,0.22)]'
                        : 'border border-white/10 bg-white/[0.035] text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon size={16} />
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Subject</span>
            <input className="field" value={subject} onChange={(event) => setSubject(event.target.value)} required autoFocus />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Body</span>
            <textarea
              ref={bodyRef}
              className="field min-h-[72px] resize-none"
              rows={3}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Details…"
            />
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium text-slate-300">Linked to</span>
            <div className="flex flex-wrap gap-2">
              {(['none', 'deal', 'contact'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onRelatedToChange(option)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition ${
                    relatedTo === option
                      ? 'bg-accent-500 text-white shadow-[0_0_24px_rgba(239,35,43,0.22)]'
                      : 'border border-white/10 bg-white/[0.035] text-slate-400 hover:text-white'
                  }`}
                >
                  {option === 'none' ? 'None' : option}
                </button>
              ))}
            </div>
            {relatedTo !== 'none' ? (
              <select className="field mt-3" value={relatedId} onChange={(event) => setRelatedId(event.target.value)}>
                <option value="">Select a {relatedTo}…</option>
                {relatedOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Scheduled At</span>
              <input
                className="field"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Completed At</span>
              <input
                className="field"
                type="datetime-local"
                value={completedAt}
                onChange={(event) => setCompletedAt(event.target.value)}
              />
            </label>
          </div>

          {OUTCOME_TYPES.includes(type) ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Outcome</span>
              <input className="field" value={outcome} onChange={(event) => setOutcome(event.target.value)} />
            </label>
          ) : null}
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
          <button type="submit" className="btn-primary" disabled={saving || !subject.trim()}>
            {saving ? 'Saving…' : isEdit ? 'Save Activity' : 'Log Activity'}
          </button>
        </div>
      </form>
    </div>
  );
};
