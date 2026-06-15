import { X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { BILLING_CYCLES, COVERAGE_HOURS, SUBSCRIPTION_STATUSES, renewalDateFor } from '../config/crmOptions';
import type {
  BillingCycle,
  CoverageHours,
  Employee,
  PricingPlan,
  Subscription,
  SubscriptionStatus,
} from '../types';

// The payload shape consumed by crm.createSubscription (service fills id/companyId/
// clientId/snapshots/timestamps). Shared by quick-add, the full edit modal (2B), and
// the Won→Subscription conversion (2C).
export type SubscriptionCreateInput = Omit<
  Subscription,
  'id' | 'companyId' | 'clientId' | 'planNameSnapshot' | 'accountManagerNameSnapshot' | 'createdAt' | 'updatedAt'
>;

const CUSTOM_PLAN_VALUE = '__custom__';
const todayISODate = () => new Date().toISOString().slice(0, 10);

// Optional prefill for the conversion flow (2C); all fields optional.
export type SubscriptionPrefill = Partial<
  Pick<SubscriptionCreateInput, 'teamLabel' | 'planId' | 'mrr' | 'setupFee' | 'accountManagerId' | 'dealId'>
>;

export const SubscriptionQuickAddModal = ({
  plans,
  employees,
  prefill,
  title = 'Add Subscription',
  onClose,
  onSave,
}: {
  plans: PricingPlan[];
  employees: Employee[];
  prefill?: SubscriptionPrefill;
  title?: string;
  onClose: () => void;
  onSave: (input: SubscriptionCreateInput) => Promise<void>;
}) => {
  const [teamLabel, setTeamLabel] = useState(prefill?.teamLabel ?? '');
  const [planValue, setPlanValue] = useState(prefill?.planId ?? '');
  const [mrr, setMrr] = useState(prefill?.mrr === undefined ? '' : String(prefill.mrr));
  const [setupFee, setSetupFee] = useState(prefill?.setupFee === undefined ? '' : String(prefill.setupFee));
  const [coverageHours, setCoverageHours] = useState<CoverageHours>(24);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('Monthly');
  const [startDate, setStartDate] = useState(todayISODate());
  const [accountManagerId, setAccountManagerId] = useState(prefill?.accountManagerId ?? '');
  const [status, setStatus] = useState<SubscriptionStatus>('Onboarding');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const activePlans = plans.filter((plan) => plan.isActive);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedLabel = teamLabel.trim();
    if (!trimmedLabel) {
      setError('Team label is required.');
      return;
    }
    const mrrValue = Number(mrr);
    if (mrr.trim() === '' || Number.isNaN(mrrValue)) {
      setError('MRR is required and must be a number.');
      return;
    }
    const setupFeeValue = setupFee.trim() === '' ? undefined : Number(setupFee);
    if (setupFeeValue !== undefined && Number.isNaN(setupFeeValue)) {
      setError('Setup fee must be a number.');
      return;
    }

    // "Custom" → no planId (display falls back to "Custom"); otherwise a real plan id.
    const planId = planValue && planValue !== CUSTOM_PLAN_VALUE ? planValue : undefined;

    setSaving(true);
    try {
      await onSave({
        teamLabel: trimmedLabel,
        planId,
        mrr: mrrValue,
        setupFee: setupFeeValue,
        currency: 'USD',
        coverageHours,
        channelsCovered: ['Email'],
        billingCycle,
        startDate,
        renewalDate: renewalDateFor(startDate, billingCycle),
        status,
        accountManagerId: accountManagerId || undefined,
        dealId: prefill?.dealId,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create subscription.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <form
        className="surface flex max-h-full w-full max-w-xl flex-col border-accent-500/30 p-6 shadow-[0_0_44px_rgba(239,35,43,0.18)]"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/[0.055] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-300">Team Label</span>
            <input
              className="field"
              value={teamLabel}
              onChange={(event) => setTeamLabel(event.target.value)}
              placeholder="e.g. US eCom Support"
              required
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Plan</span>
            <select className="field" value={planValue} onChange={(event) => setPlanValue(event.target.value)}>
              <option value="">—</option>
              {activePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
              <option value={CUSTOM_PLAN_VALUE}>Custom</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">MRR</span>
            <input className="field" type="number" value={mrr} onChange={(event) => setMrr(event.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Setup Fee</span>
            <input className="field" type="number" value={setupFee} onChange={(event) => setSetupFee(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Coverage Hours</span>
            <select
              className="field"
              value={coverageHours}
              onChange={(event) => setCoverageHours(Number(event.target.value) as CoverageHours)}
            >
              {COVERAGE_HOURS.map((hours) => (
                <option key={hours} value={hours}>
                  {hours}h
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Billing Cycle</span>
            <select
              className="field"
              value={billingCycle}
              onChange={(event) => setBillingCycle(event.target.value as BillingCycle)}
            >
              {BILLING_CYCLES.map((cycle) => (
                <option key={cycle}>{cycle}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Start Date</span>
            <input className="field" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Account Manager</span>
            <select
              className="field"
              value={accountManagerId}
              onChange={(event) => setAccountManagerId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Status</span>
            <select
              className="field"
              value={status}
              onChange={(event) => setStatus(event.target.value as SubscriptionStatus)}
            >
              {SUBSCRIPTION_STATUSES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
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
            {saving ? 'Saving…' : 'Create Subscription'}
          </button>
        </div>
      </form>
    </div>
  );
};
