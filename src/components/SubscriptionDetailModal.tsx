import { Check, Pencil, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { SUBSCRIPTION_STATUSES } from '../config/crmOptions';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import type { Contact, Employee, Engagement, PricingPlan, Subscription, SubscriptionStatus } from '../types';
import { formatShortDate } from '../utils/format';
import { EngagementTab } from './EngagementTab';
import { OnboardingChecklistTab } from './OnboardingChecklistTab';
import { SubscriptionEditModal } from './SubscriptionEditModal';
import { SubscriptionStatusPill } from './SubscriptionStatusPill';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

type SubTab = 'overview' | 'engagement' | 'checklist';

const formatMoney = (value: number | undefined, currency: string) =>
  value === undefined ? '—' : `${currency === 'USD' ? '$' : `${currency} `}${value.toLocaleString()}`;

export const SubscriptionDetailModal = ({
  subscription,
  clientId,
  plans,
  employees,
  contacts,
  currentUser,
  canEdit,
  onClose,
  onToast,
}: {
  subscription: Subscription;
  clientId: string;
  plans: PricingPlan[];
  employees: Employee[];
  contacts: Contact[];
  currentUser: { id: string; name: string };
  canEdit: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
}) => {
  const [tab, setTab] = useState<SubTab>('overview');
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(subscription.notes ?? '');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => setNotesDraft(subscription.notes ?? ''), [subscription.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve the paired engagement, then subscribe to it live. Self-heal: if a legacy
  // subscription (created before the engagement batch) has none, create one now.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      let existing = await crm.getEngagementForSubscription(companyId, clientId, subscription.id);
      if (!existing && canEdit) {
        existing = await crm.createEngagement(companyId, clientId, {
          subscriptionId: subscription.id,
          primaryAgentIds: [],
          backupAgentIds: [],
          shiftPattern: '24x7',
          helpdeskAccountAccess: [],
          status: 'Onboarding',
        });
      }
      if (cancelled) return;
      if (existing) {
        unsubscribe = crm.subscribeToEngagement(companyId, clientId, existing.id, setEngagement);
      } else {
        setEngagement(existing);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [subscription.id, clientId, canEdit]);

  const planLabel = useMemo(
    () => subscription.planNameSnapshot ?? (subscription.planId ? '—' : 'Custom'),
    [subscription.planNameSnapshot, subscription.planId],
  );

  const changeStatus = async (status: SubscriptionStatus) => {
    setStatusMenuOpen(false);
    if (status === subscription.status) return;
    const patch: Partial<Subscription> = { status };
    if (status === 'Cancelled') {
      const reason = window.prompt('Cancellation reason?') ?? undefined;
      patch.cancellationReason = reason || undefined;
      patch.cancelledAt = new Date().toISOString();
    }
    await crm.updateSubscription(companyId, clientId, subscription.id, patch);
    onToast(`Status set to ${status}`);
  };

  const saveNotes = async () => {
    if ((subscription.notes ?? '') === notesDraft.trim()) return;
    await crm.updateSubscription(companyId, clientId, subscription.id, { notes: notesDraft.trim() || undefined });
    onToast('Notes saved');
  };

  const handleEditSave = async (patch: Partial<Subscription>) => {
    await crm.updateSubscription(companyId, clientId, subscription.id, patch);
    setEditOpen(false);
    onToast('Subscription updated');
  };

  const activateSubscription = async () => {
    await crm.updateSubscription(companyId, clientId, subscription.id, { status: 'Active' });
    onToast('Subscription activated');
  };

  const SUB_TABS: { id: SubTab; label: string; hidden?: boolean }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'engagement', label: 'Engagement' },
    // HR does not see the checklist (per the role matrix). Hidden for non-Admins.
    { id: 'checklist', label: 'Onboarding Checklist', hidden: !canEdit },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/65 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Subscription detail"
      onClick={onClose}
    >
      <div
        className="surface w-full max-w-3xl border-accent-500/30 p-6 shadow-[0_0_44px_rgba(239,35,43,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-white">{subscription.teamLabel}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-400">{planLabel}</span>
              <div className="relative">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => canEdit && setStatusMenuOpen((open) => !open)}
                  className={canEdit ? 'cursor-pointer' : 'cursor-default'}
                >
                  <SubscriptionStatusPill status={subscription.status} />
                </button>
                {statusMenuOpen ? (
                  <div className="absolute left-0 z-20 mt-2 w-44 rounded-lg border border-white/10 bg-black/90 p-1 shadow-glow backdrop-blur">
                    {SUBSCRIPTION_STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void changeStatus(status)}
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/[0.055] hover:text-white"
                      >
                        {status}
                        {status === subscription.status ? <Check size={14} className="text-accent-400" /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/[0.055] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="mt-5 flex flex-wrap gap-2 border-b border-white/10 pb-3">
          {SUB_TABS.filter((item) => !item.hidden).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                tab === item.id
                  ? 'bg-accent-500 text-white shadow-[0_0_24px_rgba(239,35,43,0.22)]'
                  : 'text-slate-400 hover:bg-white/[0.055] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === 'overview' ? (
            <div className="space-y-6">
              {canEdit ? (
                <div className="flex justify-end">
                  <button type="button" className="btn-secondary" onClick={() => setEditOpen(true)}>
                    <Pencil size={16} />
                    Edit
                  </button>
                </div>
              ) : null}

              <Group title="Plan & Pricing">
                <Row label="Plan" value={planLabel} />
                <Row label="MRR" value={formatMoney(subscription.mrr, subscription.currency)} />
                <Row label="Setup Fee" value={formatMoney(subscription.setupFee, subscription.currency)} />
                <Row label="Currency" value={subscription.currency} />
                <Row label="Billing Cycle" value={subscription.billingCycle} />
              </Group>

              <Group title="Coverage">
                <Row label="Coverage Hours" value={`${subscription.coverageHours}h`} />
                <Row
                  label="Ticket Cap / Month"
                  value={subscription.ticketCapPerMonth === undefined ? '—' : String(subscription.ticketCapPerMonth)}
                />
                <div className="sm:col-span-2">
                  <span className="text-slate-500">Channels Covered</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {subscription.channelsCovered.length === 0 ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      subscription.channelsCovered.map((channel) => (
                        <span
                          key={channel}
                          className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/10"
                        >
                          {channel}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </Group>

              <Group title="Dates">
                <Row label="Start Date" value={subscription.startDate ? formatShortDate(subscription.startDate) : '—'} />
                <Row label="Renewal Date" value={subscription.renewalDate ? formatShortDate(subscription.renewalDate) : '—'} />
                {subscription.cancelledAt ? (
                  <Row label="Cancelled At" value={formatShortDate(subscription.cancelledAt)} />
                ) : null}
              </Group>

              <Group title="Compliance">
                <Row label="NDA Signed" value={subscription.ndaSignedDate ? formatShortDate(subscription.ndaSignedDate) : 'Not yet'} />
                <Row label="DPA Signed" value={subscription.dpaSignedDate ? formatShortDate(subscription.dpaSignedDate) : 'Not yet'} />
              </Group>

              <Group title="Ownership">
                <div className="sm:col-span-2 flex items-center gap-2">
                  <span className="text-slate-500">Account Manager</span>
                  {subscription.accountManagerNameSnapshot ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-600 text-[10px] font-bold text-white">
                        {subscription.accountManagerNameSnapshot.trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium text-slate-300">{subscription.accountManagerNameSnapshot}</span>
                    </span>
                  ) : (
                    <span className="font-medium text-slate-300">Unassigned</span>
                  )}
                </div>
              </Group>

              <section>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-accent-500">Notes</h4>
                <textarea
                  className="field min-h-[90px]"
                  disabled={!canEdit}
                  value={notesDraft}
                  onChange={(event) => setNotesDraft(event.target.value)}
                  onBlur={() => void saveNotes()}
                  placeholder={canEdit ? 'Add notes about this subscription…' : 'No notes.'}
                />
              </section>
            </div>
          ) : tab === 'engagement' ? (
            engagement ? (
              <EngagementTab
                clientId={clientId}
                engagement={engagement}
                employees={employees}
                contacts={contacts}
                canEdit={canEdit}
                onToast={onToast}
              />
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">Loading engagement…</p>
            )
          ) : (
            <OnboardingChecklistTab
              clientId={clientId}
              subId={subscription.id}
              subscriptionStatus={subscription.status}
              canEdit={canEdit}
              currentUser={currentUser}
              onToast={onToast}
              onActivate={() => void activateSubscription()}
            />
          )}
        </div>
      </div>

      {editOpen ? (
        <SubscriptionEditModal
          subscription={subscription}
          plans={plans}
          employees={employees}
          onClose={() => setEditOpen(false)}
          onSave={handleEditSave}
        />
      ) : null}
    </div>
  );
};

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-accent-500">{title}</h4>
    <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">{children}</dl>
  </section>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex gap-2">
    <dt className="text-slate-500">{label}</dt>
    <dd className="font-medium text-slate-300">{value}</dd>
  </div>
);
