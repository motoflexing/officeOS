import { X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { BILLING_CYCLES, COVERAGE_HOURS, SUBSCRIPTION_STATUSES, SUPPORT_CHANNELS } from '../config/crmOptions';
import type {
  BillingCycle,
  CoverageHours,
  Employee,
  PricingPlan,
  Subscription,
  SubscriptionStatus,
  SupportChannel,
} from '../types';

const CUSTOM_PLAN_VALUE = '__custom__';

// Full edit modal exposing every editable subscription field. Emits a Partial<Subscription>
// patch; the parent calls crm.updateSubscription (which re-resolves snapshots on FK change).
export const SubscriptionEditModal = ({
  subscription,
  plans,
  employees,
  onClose,
  onSave,
}: {
  subscription: Subscription;
  plans: PricingPlan[];
  employees: Employee[];
  onClose: () => void;
  onSave: (patch: Partial<Subscription>) => Promise<void>;
}) => {
  const [teamLabel, setTeamLabel] = useState(subscription.teamLabel);
  const [planValue, setPlanValue] = useState(subscription.planId ?? (subscription.planNameSnapshot ? CUSTOM_PLAN_VALUE : ''));
  const [mrr, setMrr] = useState(String(subscription.mrr));
  const [setupFee, setSetupFee] = useState(subscription.setupFee === undefined ? '' : String(subscription.setupFee));
  const [currency, setCurrency] = useState(subscription.currency);
  const [coverageHours, setCoverageHours] = useState<CoverageHours>(subscription.coverageHours);
  const [ticketCap, setTicketCap] = useState(
    subscription.ticketCapPerMonth === undefined ? '' : String(subscription.ticketCapPerMonth),
  );
  const [channels, setChannels] = useState<SupportChannel[]>(subscription.channelsCovered);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(subscription.billingCycle);
  const [startDate, setStartDate] = useState(subscription.startDate);
  const [renewalDate, setRenewalDate] = useState(subscription.renewalDate ?? '');
  const [status, setStatus] = useState<SubscriptionStatus>(subscription.status);
  const [ndaSignedDate, setNdaSignedDate] = useState(subscription.ndaSignedDate ?? '');
  const [dpaSignedDate, setDpaSignedDate] = useState(subscription.dpaSignedDate ?? '');
  const [accountManagerId, setAccountManagerId] = useState(subscription.accountManagerId ?? '');
  const [notes, setNotes] = useState(subscription.notes ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const activePlans = plans.filter((plan) => plan.isActive || plan.id === subscription.planId);

  const toggleChannel = (channel: SupportChannel) =>
    setChannels((current) =>
      current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel],
    );

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
    const ticketCapValue = ticketCap.trim() === '' ? undefined : Number(ticketCap);
    if (
      (setupFeeValue !== undefined && Number.isNaN(setupFeeValue)) ||
      (ticketCapValue !== undefined && Number.isNaN(ticketCapValue))
    ) {
      setError('Setup fee and ticket cap must be numbers.');
      return;
    }

    const planId = planValue && planValue !== CUSTOM_PLAN_VALUE ? planValue : undefined;

    setSaving(true);
    try {
      await onSave({
        teamLabel: trimmedLabel,
        planId,
        mrr: mrrValue,
        setupFee: setupFeeValue,
        currency: currency.trim() || 'USD',
        coverageHours,
        ticketCapPerMonth: ticketCapValue,
        channelsCovered: channels,
        billingCycle,
        startDate,
        renewalDate: renewalDate || undefined,
        status,
        ndaSignedDate: ndaSignedDate || undefined,
        dpaSignedDate: dpaSignedDate || undefined,
        accountManagerId: accountManagerId || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save subscription.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--color-overlay-65)] px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Edit subscription"
      onClick={onClose}
    >
      <form
        className="surface flex max-h-full w-full max-w-2xl flex-col border-[color:var(--color-accent-30)] p-6 shadow-[var(--shadow-glow-44-18)]"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-[color:var(--color-accent)]">Edit Subscription</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Team Label</span>
            <input className="field" value={teamLabel} onChange={(event) => setTeamLabel(event.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Plan</span>
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
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Status</span>
            <select className="field" value={status} onChange={(event) => setStatus(event.target.value as SubscriptionStatus)}>
              {SUBSCRIPTION_STATUSES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">MRR</span>
            <input className="field" type="number" value={mrr} onChange={(event) => setMrr(event.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Setup Fee</span>
            <input className="field" type="number" value={setupFee} onChange={(event) => setSetupFee(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Currency</span>
            <input className="field" value={currency} onChange={(event) => setCurrency(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Coverage Hours</span>
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
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Ticket Cap / Month</span>
            <input className="field" type="number" value={ticketCap} onChange={(event) => setTicketCap(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Billing Cycle</span>
            <select className="field" value={billingCycle} onChange={(event) => setBillingCycle(event.target.value as BillingCycle)}>
              {BILLING_CYCLES.map((cycle) => (
                <option key={cycle}>{cycle}</option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Channels Covered</span>
            <div className="flex flex-wrap gap-2">
              {SUPPORT_CHANNELS.map((channel) => {
                const active = channels.includes(channel);
                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? 'bg-[var(--color-accent)] text-[color:var(--color-on-accent)] shadow-[var(--shadow-glow-24-22)]'
                        : 'border border-[color:var(--color-border-weak)] bg-[var(--color-fill-035)] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]'
                    }`}
                  >
                    {channel}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Start Date</span>
            <input className="field" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Renewal Date</span>
            <input className="field" type="date" value={renewalDate} onChange={(event) => setRenewalDate(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">NDA Signed Date</span>
            <input className="field" type="date" value={ndaSignedDate} onChange={(event) => setNdaSignedDate(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">DPA Signed Date</span>
            <input className="field" type="date" value={dpaSignedDate} onChange={(event) => setDpaSignedDate(event.target.value)} />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Account Manager</span>
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
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Notes</span>
            <textarea className="field min-h-[90px]" value={notes} onChange={(event) => setNotes(event.target.value)} />
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
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Subscription'}
          </button>
        </div>
      </form>
    </div>
  );
};
