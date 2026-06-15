import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { DEFAULT_PLAN_SUGGESTIONS } from '../config/crmOptions';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import type { PricingPlan } from '../types';
import { ConfirmModal } from './ConfirmModal';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

type PlanForm = {
  name: string;
  monthlyPrice: string; // kept as string for the input; parsed on save
  description: string;
  isActive: boolean;
  sortOrder: string;
};

const emptyForm: PlanForm = { name: '', monthlyPrice: '', description: '', isActive: true, sortOrder: '0' };

const formatPrice = (value?: number) =>
  value === undefined ? '—' : `$${value.toLocaleString()}`;

export const PricingPlansSection = ({ onToast }: { onToast: (message: string) => void }) => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [error, setError] = useState('');
  const [deletingPlan, setDeletingPlan] = useState<PricingPlan | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const unsubscribe = crm.subscribeToPricingPlans(companyId, setPlans);
    return unsubscribe;
  }, []);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [plans],
  );

  const openAdd = () => {
    setEditingPlan(null);
    // Default the next sort order to one past the current max for convenience.
    const nextSort = plans.reduce((max, plan) => Math.max(max, plan.sortOrder), 0) + 1;
    setForm({ ...emptyForm, sortOrder: String(nextSort) });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (plan: PricingPlan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      monthlyPrice: plan.monthlyPrice === undefined ? '' : String(plan.monthlyPrice),
      description: plan.description ?? '',
      isActive: plan.isActive,
      sortOrder: String(plan.sortOrder),
    });
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingPlan(null);
    setForm(emptyForm);
    setError('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError('Plan name is required.');
      return;
    }

    const monthlyPrice = form.monthlyPrice.trim() === '' ? undefined : Number(form.monthlyPrice);
    if (monthlyPrice !== undefined && Number.isNaN(monthlyPrice)) {
      setError('Monthly price must be a number.');
      return;
    }
    const sortOrder = form.sortOrder.trim() === '' ? 0 : Number(form.sortOrder);
    if (Number.isNaN(sortOrder)) {
      setError('Sort order must be a number.');
      return;
    }

    const payload = {
      name,
      monthlyPrice,
      description: form.description.trim() || undefined,
      isActive: form.isActive,
      sortOrder,
    };

    try {
      if (editingPlan) {
        await crm.updatePricingPlan(companyId, editingPlan.id, payload);
        onToast('Plan updated');
      } else {
        await crm.createPricingPlan(companyId, payload);
        onToast('Plan created');
      }
      closeModal();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save plan.');
    }
  };

  const confirmDelete = async () => {
    if (!deletingPlan) return;
    try {
      await crm.deletePricingPlan(companyId, deletingPlan.id);
      onToast('Plan deleted');
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Unable to delete plan.');
    } finally {
      setDeletingPlan(null);
    }
  };

  const createDefaultPlans = async () => {
    setSeeding(true);
    try {
      for (const suggestion of DEFAULT_PLAN_SUGGESTIONS) {
        await crm.createPricingPlan(companyId, { ...suggestion, isActive: true });
      }
      onToast('Default plans created');
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Unable to create default plans.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <section className="surface p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-white">Pricing Plans</h3>
          <p className="mt-1 text-sm text-slate-500">Plans referenced by CRM clients and deals.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openAdd}>
          <Plus size={18} />
          Add Plan
        </button>
      </div>

      {sortedPlans.length === 0 ? (
        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-6 text-center">
          <p className="text-sm font-medium text-slate-200">No pricing plans yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Get started quickly with suggested plans: {DEFAULT_PLAN_SUGGESTIONS.map((plan) => plan.name).join(' / ')}.
          </p>
          <button type="button" className="btn-secondary mt-4" onClick={createDefaultPlans} disabled={seeding}>
            {seeding ? 'Creating…' : 'Create Default Plans'}
          </button>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2 font-medium">Sort</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Monthly Price</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Active</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlans.map((plan) => (
                <tr key={plan.id} className="border-b border-white/5 last:border-0">
                  <td className="px-3 py-3 text-slate-400">{plan.sortOrder}</td>
                  <td className="px-3 py-3 font-medium text-slate-100">{plan.name}</td>
                  <td className="px-3 py-3 text-slate-300">{formatPrice(plan.monthlyPrice)}</td>
                  <td className="px-3 py-3 text-slate-400">{plan.description || '—'}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                        plan.isActive
                          ? 'bg-emerald-500/12 text-emerald-300 ring-emerald-400/25'
                          : 'bg-slate-500/16 text-slate-300 ring-slate-400/20'
                      }`}
                    >
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(plan)}
                        aria-label={`Edit ${plan.name}`}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.055] hover:text-white"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingPlan(plan)}
                        aria-label={`Delete ${plan.name}`}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={editingPlan ? 'Edit plan' : 'Add plan'}
          onClick={closeModal}
        >
          <form
            className="surface w-full max-w-lg border-accent-500/30 p-6 shadow-[0_0_44px_rgba(239,35,43,0.18)]"
            onClick={(event) => event.stopPropagation()}
            onSubmit={save}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">
                {editingPlan ? 'Edit Plan' : 'Add Plan'}
              </p>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="rounded-lg p-1 text-slate-400 transition hover:bg-white/[0.055] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Name</span>
                <input
                  className="field"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="e.g. Growth"
                  required
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Monthly Price (optional)</span>
                  <input
                    className="field"
                    type="number"
                    value={form.monthlyPrice}
                    onChange={(event) => setForm({ ...form, monthlyPrice: event.target.value })}
                    placeholder="999"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Sort Order</span>
                  <input
                    className="field"
                    type="number"
                    value={form.sortOrder}
                    onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Description (optional)</span>
                <textarea
                  className="field min-h-[80px]"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="What this plan includes"
                />
              </label>
              <button
                type="button"
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 text-left transition hover:border-accent-500/40"
              >
                <span className="font-medium text-slate-200">Active</span>
                <span
                  className={`relative h-6 w-11 rounded-full transition ${form.isActive ? 'bg-accent-600' : 'bg-slate-700'}`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${form.isActive ? 'left-6' : 'left-1'}`}
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
              <button type="button" className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingPlan ? 'Save Plan' : 'Create Plan'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deletingPlan ? (
        <ConfirmModal
          title="Delete plan?"
          message={`Delete "${deletingPlan.name}"? Deals referencing it by name will keep their stored value.`}
          confirmLabel="Delete Plan"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setDeletingPlan(null)}
        />
      ) : null}
    </section>
  );
};
