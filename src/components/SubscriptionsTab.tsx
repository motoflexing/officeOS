import { CreditCard, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { SUBSCRIPTION_STATUSES } from '../config/crmOptions';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import type { Contact, Employee, PricingPlan, Subscription, SubscriptionStatus } from '../types';
import { formatShortDate } from '../utils/format';
import { ConfirmModal } from './ConfirmModal';
import { EmptyState } from './EmptyState';
import { SubscriptionDetailModal } from './SubscriptionDetailModal';
import { SubscriptionQuickAddModal, type SubscriptionCreateInput } from './SubscriptionQuickAddModal';
import { SubscriptionStatusPill } from './SubscriptionStatusPill';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

const formatMRR = (value: number, currency: string) =>
  `${currency === 'USD' ? '$' : `${currency} `}${value.toLocaleString()}`;

const planLabel = (sub: Subscription) => sub.planNameSnapshot ?? (sub.planId ? '—' : 'Custom');

export const SubscriptionsTab = ({
  clientId,
  subscriptions,
  plans,
  employees,
  contacts,
  currentUser,
  autoOpenSubId,
  canEdit,
  onToast,
}: {
  clientId: string;
  subscriptions: Subscription[];
  plans: PricingPlan[];
  employees: Employee[];
  contacts: Contact[];
  currentUser: { id: string; name: string };
  // When set (e.g. arriving from a Won→Subscription conversion), auto-open this sub.
  autoOpenSubId?: string | null;
  canEdit: boolean;
  onToast: (message: string) => void;
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | SubscriptionStatus>('All');
  const [addOpen, setAddOpen] = useState(false);
  const [deletingSub, setDeletingSub] = useState<Subscription | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Track the open subscription by id and derive it from the live list so edits reflect.
  const [detailSubId, setDetailSubId] = useState<string | null>(null);

  const filtered = useMemo(
    () => subscriptions.filter((sub) => statusFilter === 'All' || sub.status === statusFilter),
    [subscriptions, statusFilter],
  );

  const detailSub = useMemo(
    () => subscriptions.find((sub) => sub.id === detailSubId) ?? null,
    [subscriptions, detailSubId],
  );

  const openDetail = (sub: Subscription) => {
    setSelectedId(sub.id);
    setDetailSubId(sub.id);
  };

  // Auto-open a subscription when arriving from the Won→conversion flow, once it
  // appears in the live list.
  useEffect(() => {
    if (autoOpenSubId && subscriptions.some((sub) => sub.id === autoOpenSubId)) {
      setSelectedId(autoOpenSubId);
      setDetailSubId(autoOpenSubId);
    }
  }, [autoOpenSubId, subscriptions]);

  const handleSave = async (input: SubscriptionCreateInput) => {
    const created = await crm.createSubscription(companyId, clientId, input);
    setAddOpen(false);
    setSelectedId(created.id);
    onToast('Subscription created');
  };

  const confirmDelete = async () => {
    if (!deletingSub) return;
    try {
      await crm.deleteSubscription(companyId, clientId, deletingSub.id);
      onToast('Subscription removed');
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Unable to delete subscription.');
    } finally {
      setDeletingSub(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="block w-full sm:max-w-[200px]">
          <select
            className="field"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'All' | SubscriptionStatus)}
          >
            <option value="All">All Statuses</option>
            {SUBSCRIPTION_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        {canEdit ? (
          <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={18} />
            Add Subscription
          </button>
        ) : null}
      </div>

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No subscriptions yet"
          description="No subscriptions yet. Convert a Won deal or add one manually."
          action={
            canEdit ? (
              <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
                <Plus size={18} />
                Add Subscription
              </button>
            ) : null
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No subscriptions match the filter" description="Try a different status." />
      ) : (
        <section className="surface overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-medium">Team Label</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">MRR</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Start Date</th>
                <th className="px-4 py-3 font-medium">Renewal Date</th>
                {canEdit ? <th className="px-4 py-3 text-right font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr
                  key={sub.id}
                  onClick={() => openDetail(sub)}
                  className={`cursor-pointer border-b border-white/5 transition last:border-0 hover:bg-white/[0.04] ${
                    sub.id === selectedId ? 'bg-accent-500/[0.06]' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-slate-100">{sub.teamLabel}</td>
                  <td className="px-4 py-3 text-slate-400">{planLabel(sub)}</td>
                  <td className="px-4 py-3 text-slate-300">{formatMRR(sub.mrr, sub.currency)}</td>
                  <td className="px-4 py-3">
                    <SubscriptionStatusPill status={sub.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-400">{sub.startDate ? formatShortDate(sub.startDate) : '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{sub.renewalDate ? formatShortDate(sub.renewalDate) : '—'}</td>
                  {canEdit ? (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDetail(sub);
                          }}
                          aria-label="Open subscription"
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.055] hover:text-white"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeletingSub(sub);
                          }}
                          aria-label="Delete subscription"
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {addOpen ? (
        <SubscriptionQuickAddModal
          plans={plans}
          employees={employees}
          onClose={() => setAddOpen(false)}
          onSave={handleSave}
        />
      ) : null}

      {detailSub ? (
        <SubscriptionDetailModal
          subscription={detailSub}
          clientId={clientId}
          plans={plans}
          employees={employees}
          contacts={contacts}
          currentUser={currentUser}
          canEdit={canEdit}
          onClose={() => setDetailSubId(null)}
          onToast={onToast}
        />
      ) : null}

      {deletingSub ? (
        <ConfirmModal
          title="Delete subscription?"
          message={`Remove "${deletingSub.teamLabel}" from this client? This will also remove its engagement and onboarding checklist.`}
          confirmLabel="Delete Subscription"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setDeletingSub(null)}
        />
      ) : null}
    </div>
  );
};
