import { CheckCircle2, HandCoins, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEAL_STAGES } from '../config/crmOptions';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import type { Deal, DealStage, Employee, PricingPlan } from '../types';
import { formatShortDate } from '../utils/format';
import { ConfirmModal } from './ConfirmModal';
import { DealModal, type DealInput } from './DealModal';
import { DealStagePill } from './DealStagePill';
import { EmptyState } from './EmptyState';
import { SubscriptionQuickAddModal, type SubscriptionCreateInput, type SubscriptionPrefill } from './SubscriptionQuickAddModal';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

const formatMRR = (value?: number) => (value === undefined ? '—' : `$${value.toLocaleString()}`);

export const DealsTab = ({
  clientId,
  deals,
  plans,
  employees,
  canEdit,
  onToast,
  highlightDealId,
  onConverted,
}: {
  clientId: string;
  deals: Deal[];
  plans: PricingPlan[];
  employees: Employee[];
  canEdit: boolean;
  onToast: (message: string) => void;
  // When set (e.g. arriving from the pipeline), open that deal's editor on mount.
  highlightDealId?: string | null;
  // Fired after a Won deal is converted to a subscription (passes the new sub id).
  onConverted?: (subscriptionId: string) => void;
}) => {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'All' | DealStage>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deletingDeal, setDeletingDeal] = useState<Deal | null>(null);
  // The Won deal currently being converted (drives the prefilled conversion modal).
  const [convertingDeal, setConvertingDeal] = useState<Deal | null>(null);
  const handledHighlight = useRef(false);

  // Map a deal's planInterest (a plan NAME or "Custom") back to a plan id for prefill.
  const planIdByName = useMemo(() => {
    const map = new Map<string, string>();
    plans.forEach((plan) => map.set(plan.name, plan.id));
    return map;
  }, [plans]);

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((employee) => map.set(employee.id, employee.name));
    return map;
  }, [employees]);

  // When navigated here with a deal to highlight, open its editor once.
  useEffect(() => {
    if (!highlightDealId || handledHighlight.current) return;
    const target = deals.find((deal) => deal.id === highlightDealId);
    if (target) {
      setEditingDeal(target);
      setModalOpen(true);
      handledHighlight.current = true;
    }
  }, [highlightDealId, deals]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return deals.filter((deal) => {
      const matchesSearch = !term || deal.title.toLowerCase().includes(term);
      const matchesStage = stageFilter === 'All' || deal.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [deals, search, stageFilter]);

  const openAdd = () => {
    setEditingDeal(null);
    setModalOpen(true);
  };

  const openEdit = (deal: Deal) => {
    if (!canEdit) return;
    setEditingDeal(deal);
    setModalOpen(true);
  };

  const handleSave = async (input: DealInput) => {
    let saved: Deal;
    if (editingDeal) {
      // updateDeal stamps updatedAt, so a stage change is auto-stamped.
      await crm.updateDeal(companyId, clientId, editingDeal.id, input);
      saved = { ...editingDeal, ...input };
      onToast('Deal updated');
    } else {
      saved = await crm.createDeal(companyId, clientId, input);
      onToast('Deal added');
    }
    setModalOpen(false);
    setEditingDeal(null);

    // Automatic conversion prompt: a deal that is now Won and not yet converted.
    if (saved.stage === 'Won' && !saved.subscriptionId) {
      setConvertingDeal(saved);
    }
  };

  // Build the subscription prefill from a Won deal (spec 2C.7).
  const prefillFor = (deal: Deal): SubscriptionPrefill => ({
    planId: deal.planInterest ? planIdByName.get(deal.planInterest) : undefined,
    mrr: deal.expectedMRR,
    setupFee: deal.expectedSetupFee,
    accountManagerId: deal.ownerEmployeeId,
    dealId: deal.id,
  });

  const handleConvert = async (input: SubscriptionCreateInput) => {
    if (!convertingDeal) return;
    const created = await crm.createSubscription(companyId, clientId, input);
    // Link the deal back to its subscription so we never re-prompt.
    await crm.updateDeal(companyId, clientId, convertingDeal.id, { subscriptionId: created.id });
    setConvertingDeal(null);
    onToast('Subscription created from deal');
    onConverted?.(created.id);
  };

  const confirmDelete = async () => {
    if (!deletingDeal) return;
    try {
      await crm.deleteDeal(companyId, clientId, deletingDeal.id);
      onToast('Deal removed');
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Unable to delete deal.');
    } finally {
      setDeletingDeal(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid w-full gap-3 sm:grid-cols-[1fr_180px] lg:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)]" size={18} />
            <input
              className="field pl-10"
              placeholder="Search by title"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="field"
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value as 'All' | DealStage)}
          >
            <option value="All">All Stages</option>
            {DEAL_STAGES.map((stage) => (
              <option key={stage}>{stage}</option>
            ))}
          </select>
        </div>
        {canEdit ? (
          <button type="button" className="btn-primary" onClick={openAdd}>
            <Plus size={18} />
            Add Deal
          </button>
        ) : null}
      </div>

      {deals.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No deals yet"
          description="No deals yet. Track your first opportunity with this client."
          action={
            canEdit ? (
              <button type="button" className="btn-primary" onClick={openAdd}>
                <Plus size={18} />
                Add Deal
              </button>
            ) : null
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No deals match the filters" description="Try adjusting the search or stage filter." />
      ) : (
        <section className="surface overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-[color:var(--color-border-weak)] text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">MRR</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Expected Close</th>
                {canEdit ? <th className="px-4 py-3 text-right font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((deal) => (
                <tr
                  key={deal.id}
                  onClick={() => openEdit(deal)}
                  className={`border-b border-[color:var(--color-line-05)] transition last:border-0 ${
                    canEdit ? 'cursor-pointer hover:bg-[var(--color-fill-04)]' : ''
                  } ${deal.id === highlightDealId ? 'bg-[var(--color-accent)]/[0.06]' : ''}`}
                >
                  <td className="px-4 py-3 font-medium text-[color:var(--color-text-bright)]">
                    <span className="inline-flex items-center gap-2">
                      {deal.title}
                      {deal.subscriptionId ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/12 px-2 py-0.5 text-[10px] font-medium text-sky-300 ring-1 ring-sky-400/25">
                          <CheckCircle2 size={11} />
                          Converted
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <DealStagePill stage={deal.stage} />
                  </td>
                  <td className="px-4 py-3 text-[color:var(--color-text-secondary)]">{deal.planInterest || '—'}</td>
                  <td className="px-4 py-3 text-[color:var(--color-text-secondary)]">{formatMRR(deal.expectedMRR)}</td>
                  <td className="px-4 py-3 text-[color:var(--color-text-secondary)]">
                    {deal.ownerEmployeeId ? employeeNameById.get(deal.ownerEmployeeId) ?? '—' : '—'}
                  </td>
                  <td className="px-4 py-3 text-[color:var(--color-text-secondary)]">
                    {deal.expectedCloseDate ? formatShortDate(deal.expectedCloseDate) : '—'}
                  </td>
                  {canEdit ? (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {deal.stage === 'Won' && !deal.subscriptionId ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setConvertingDeal(deal);
                            }}
                            className="rounded-lg px-2 py-1 text-xs font-semibold text-accent-300 transition hover:bg-[var(--color-accent-15)]"
                          >
                            Convert to Subscription
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(deal);
                          }}
                          aria-label="Edit deal"
                          className="rounded-lg p-1.5 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)]"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeletingDeal(deal);
                          }}
                          aria-label="Delete deal"
                          className="rounded-lg p-1.5 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-error-fill-15)] hover:text-[color:var(--color-error-text-300)]"
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

      {modalOpen ? (
        <DealModal
          deal={editingDeal}
          plans={plans}
          employees={employees}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      ) : null}

      {deletingDeal ? (
        <ConfirmModal
          title="Delete deal?"
          message={`Remove "${deletingDeal.title}" from this client?`}
          confirmLabel="Delete Deal"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setDeletingDeal(null)}
        />
      ) : null}

      {/* Won→Subscription conversion: prefilled from the deal. Closing = "Skip for Now". */}
      {convertingDeal ? (
        <SubscriptionQuickAddModal
          plans={plans}
          employees={employees}
          prefill={prefillFor(convertingDeal)}
          title="Create Subscription from this Deal?"
          onClose={() => setConvertingDeal(null)}
          onSave={handleConvert}
        />
      ) : null}
    </div>
  );
};
