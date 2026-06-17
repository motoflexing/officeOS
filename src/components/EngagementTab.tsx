import { Check, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { HELPDESK_TOOLS } from '../config/crmOptions';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import type {
  Contact,
  Employee,
  Engagement,
  EngagementStatus,
  HelpdeskAccess,
  HelpdeskAccessStatus,
  HelpdeskTool,
  ShiftPattern,
} from '../types';
import { EmployeeMultiSelect } from './EmployeeMultiSelect';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

const SHIFT_PATTERNS: ShiftPattern[] = ['US Morning', 'US Afternoon', 'US Evening', '24x7', 'Custom'];
const ENGAGEMENT_STATUSES: EngagementStatus[] = ['Onboarding', 'Active', 'Paused'];
const HELPDESK_ACCESS_STATUSES: HelpdeskAccessStatus[] = ['Pending', 'Granted', 'Revoked'];

const engagementStatusClass: Record<EngagementStatus, string> = {
  Onboarding: 'bg-[var(--color-warning-fill-12)] text-[color:var(--color-warning-text-300)] ring-[color:var(--color-warning-ring-25)]',
  Active: 'bg-[var(--color-success-fill-12)] text-[color:var(--color-success-text-300)] ring-[color:var(--color-success-ring-25)]',
  Paused: 'bg-orange-500/14 text-orange-300 ring-orange-400/25',
};

const accessStatusClass: Record<HelpdeskAccessStatus, string> = {
  Pending: 'bg-[var(--color-warning-fill-12)] text-[color:var(--color-warning-text-300)] ring-[color:var(--color-warning-ring-25)]',
  Granted: 'bg-[var(--color-success-fill-12)] text-[color:var(--color-success-text-300)] ring-[color:var(--color-success-ring-25)]',
  Revoked: 'bg-[var(--color-neutral-fill-16)] text-[color:var(--color-text-secondary)] ring-[color:var(--color-neutral-ring-20)]',
};

export const EngagementTab = ({
  clientId,
  engagement,
  employees,
  contacts,
  canEdit,
  onToast,
}: {
  clientId: string;
  engagement: Engagement;
  employees: Employee[];
  contacts: Contact[];
  canEdit: boolean;
  onToast: (message: string) => void;
}) => {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  // Local drafts for text fields; saved on blur so live updates don't clobber typing.
  const [sopUrl, setSopUrl] = useState(engagement.sopDocUrl ?? '');
  const [brandUrl, setBrandUrl] = useState(engagement.brandVoiceGuideUrl ?? '');
  const [customShift, setCustomShift] = useState(engagement.customShiftDescription ?? '');
  const [notes, setNotes] = useState(engagement.notes ?? '');

  // Resync drafts when switching to a different engagement record.
  useEffect(() => {
    setSopUrl(engagement.sopDocUrl ?? '');
    setBrandUrl(engagement.brandVoiceGuideUrl ?? '');
    setCustomShift(engagement.customShiftDescription ?? '');
    setNotes(engagement.notes ?? '');
  }, [engagement.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (patch: Partial<Engagement>) => {
    try {
      await crm.updateEngagement(companyId, clientId, engagement.id, patch);
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Unable to update engagement.');
    }
  };

  const saveIfChanged = (key: keyof Engagement, value: string) => {
    const current = (engagement[key] as string | undefined) ?? '';
    if (current === value.trim()) return;
    void save({ [key]: value.trim() || undefined } as Partial<Engagement>);
  };

  const updateAccessEntry = (index: number, patch: Partial<HelpdeskAccess>) => {
    const next = engagement.helpdeskAccountAccess.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    void save({ helpdeskAccountAccess: next });
  };
  const addAccessEntry = () => {
    const next: HelpdeskAccess[] = [...engagement.helpdeskAccountAccess, { tool: 'Zendesk', status: 'Pending' }];
    void save({ helpdeskAccountAccess: next });
  };
  const removeAccessEntry = (index: number) => {
    void save({ helpdeskAccountAccess: engagement.helpdeskAccountAccess.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <Section title="Status">
        <div className="relative inline-block">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => canEdit && setStatusMenuOpen((open) => !open)}
            className={canEdit ? 'cursor-pointer' : 'cursor-default'}
          >
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${engagementStatusClass[engagement.status]}`}
            >
              {engagement.status}
            </span>
          </button>
          {statusMenuOpen ? (
            <div className="absolute left-0 z-20 mt-2 w-40 rounded-lg border border-[color:var(--color-border-weak)] bg-[var(--color-overlay-90)] p-1 shadow-glow backdrop-blur">
              {ENGAGEMENT_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setStatusMenuOpen(false);
                    if (status !== engagement.status) void save({ status });
                  }}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)]"
                >
                  {status}
                  {status === engagement.status ? <Check size={14} className="text-accent-400" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </Section>

      {/* Team */}
      <Section title="Team">
        <Field label="Primary Agents">
          <EmployeeMultiSelect
            employees={employees}
            selectedIds={engagement.primaryAgentIds}
            disabled={!canEdit}
            onChange={(ids) => save({ primaryAgentIds: ids })}
          />
        </Field>
        <Field label="Backup Agents">
          <EmployeeMultiSelect
            employees={employees}
            selectedIds={engagement.backupAgentIds}
            disabled={!canEdit}
            onChange={(ids) => save({ backupAgentIds: ids })}
          />
        </Field>
      </Section>

      {/* Coverage */}
      <Section title="Coverage">
        <Field label="Shift Pattern">
          <select
            className="field max-w-xs"
            disabled={!canEdit}
            value={engagement.shiftPattern}
            onChange={(event) => save({ shiftPattern: event.target.value as ShiftPattern })}
          >
            {SHIFT_PATTERNS.map((pattern) => (
              <option key={pattern}>{pattern}</option>
            ))}
          </select>
        </Field>
        {engagement.shiftPattern === 'Custom' ? (
          <Field label="Custom Shift Description">
            <textarea
              className="field min-h-[72px]"
              disabled={!canEdit}
              value={customShift}
              onChange={(event) => setCustomShift(event.target.value)}
              onBlur={() => saveIfChanged('customShiftDescription', customShift)}
            />
          </Field>
        ) : null}
      </Section>

      {/* Documents */}
      <Section title="Documents">
        <Field label="SOP Doc URL">
          <input
            className="field"
            type="url"
            disabled={!canEdit}
            value={sopUrl}
            onChange={(event) => setSopUrl(event.target.value)}
            onBlur={() => saveIfChanged('sopDocUrl', sopUrl)}
            placeholder="https://…"
          />
        </Field>
        <Field label="Brand Voice Guide URL">
          <input
            className="field"
            type="url"
            disabled={!canEdit}
            value={brandUrl}
            onChange={(event) => setBrandUrl(event.target.value)}
            onBlur={() => saveIfChanged('brandVoiceGuideUrl', brandUrl)}
            placeholder="https://…"
          />
        </Field>
      </Section>

      {/* Escalation */}
      <Section title="Escalation">
        <Field label="Escalation Contact">
          <select
            className="field max-w-xs"
            disabled={!canEdit}
            value={engagement.escalationContactId ?? ''}
            onChange={(event) => save({ escalationContactId: event.target.value || undefined })}
          >
            <option value="">None</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      {/* Helpdesk Access */}
      <Section title="Helpdesk Access">
        <div className="space-y-2">
          {engagement.helpdeskAccountAccess.length === 0 ? (
            <p className="text-sm text-[color:var(--color-text-muted)]">No access entries yet.</p>
          ) : (
            engagement.helpdeskAccountAccess.map((entry, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-lg border border-[color:var(--color-border-weak)] bg-[var(--color-fill-005)] p-3 sm:grid-cols-[160px_1fr_140px_auto] sm:items-center"
              >
                <select
                  className="field"
                  disabled={!canEdit}
                  value={entry.tool}
                  onChange={(event) => updateAccessEntry(index, { tool: event.target.value as HelpdeskTool })}
                >
                  {HELPDESK_TOOLS.map((tool) => (
                    <option key={tool}>{tool}</option>
                  ))}
                </select>
                <input
                  className="field"
                  disabled={!canEdit}
                  value={entry.username ?? ''}
                  placeholder="Username"
                  onChange={(event) => updateAccessEntry(index, { username: event.target.value || undefined })}
                />
                {canEdit ? (
                  <select
                    className="field"
                    value={entry.status}
                    onChange={(event) =>
                      updateAccessEntry(index, { status: event.target.value as HelpdeskAccessStatus })
                    }
                  >
                    {HELPDESK_ACCESS_STATUSES.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${accessStatusClass[entry.status]}`}
                  >
                    {entry.status}
                  </span>
                )}
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => removeAccessEntry(index)}
                    aria-label="Remove access entry"
                    className="justify-self-end rounded-lg p-1.5 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-error-fill-15)] hover:text-[color:var(--color-error-text-300)]"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
            ))
          )}
          {canEdit ? (
            <button type="button" className="btn-secondary" onClick={addAccessEntry}>
              <Plus size={16} />
              Add Access Entry
            </button>
          ) : null}
        </div>
      </Section>

      {/* Go-Live + Notes */}
      <Section title="Go-Live & Notes">
        <Field label="Go-Live Date">
          <input
            className="field max-w-xs"
            type="date"
            disabled={!canEdit}
            value={engagement.goLiveDate ?? ''}
            onChange={(event) => save({ goLiveDate: event.target.value || undefined })}
          />
        </Field>
        <Field label="Notes">
          <textarea
            className="field min-h-[90px]"
            disabled={!canEdit}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => saveIfChanged('notes', notes)}
          />
        </Field>
      </Section>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-accent)]">{title}</h4>
    <div className="space-y-3">{children}</div>
  </section>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">{label}</span>
    {children}
  </div>
);
