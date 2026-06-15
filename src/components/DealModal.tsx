import { X } from 'lucide-react';
import { FormEvent, useMemo, useState, useEffect } from 'react';
import { DEAL_STAGES } from '../config/crmOptions';
import type { Deal, DealStage, Employee, PricingPlan } from '../types';

export type DealInput = Omit<Deal, 'id' | 'clientId' | 'companyId' | 'createdAt' | 'updatedAt'>;

// "Custom" is always offered as a planInterest fallback alongside configured plans.
const CUSTOM_PLAN = 'Custom';

// Add/edit modal for a deal (spec C.2). planInterest reads live from pricing plans.
export const DealModal = ({
  deal,
  plans,
  employees,
  onClose,
  onSave,
}: {
  deal: Deal | null;
  plans: PricingPlan[];
  employees: Employee[];
  onClose: () => void;
  onSave: (input: DealInput) => Promise<void>;
}) => {
  const [title, setTitle] = useState(deal?.title ?? '');
  const [stage, setStage] = useState<DealStage>(deal?.stage ?? 'Lead');
  const [planInterest, setPlanInterest] = useState(deal?.planInterest ?? '');
  const [expectedMRR, setExpectedMRR] = useState(deal?.expectedMRR === undefined ? '' : String(deal.expectedMRR));
  const [expectedSetupFee, setExpectedSetupFee] = useState(
    deal?.expectedSetupFee === undefined ? '' : String(deal.expectedSetupFee),
  );
  const [expectedCloseDate, setExpectedCloseDate] = useState(deal?.expectedCloseDate ?? '');
  const [source, setSource] = useState(deal?.source ?? '');
  const [lostReason, setLostReason] = useState(deal?.lostReason ?? '');
  const [ownerEmployeeId, setOwnerEmployeeId] = useState(deal?.ownerEmployeeId ?? '');
  const [notes, setNotes] = useState(deal?.notes ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Active plan names + "Custom" fallback; include the deal's current value if it's a
  // free-form/legacy entry no longer in the plan list, so editing never silently drops it.
  const planOptions = useMemo(() => {
    const names = plans.filter((plan) => plan.isActive).map((plan) => plan.name);
    const withCustom = [...names, CUSTOM_PLAN];
    if (deal?.planInterest && !withCustom.includes(deal.planInterest)) {
      return [deal.planInterest, ...withCustom];
    }
    return withCustom;
  }, [plans, deal?.planInterest]);

  const hasNoPlans = plans.length === 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }
    const mrr = expectedMRR.trim() === '' ? undefined : Number(expectedMRR);
    const setupFee = expectedSetupFee.trim() === '' ? undefined : Number(expectedSetupFee);
    if ((mrr !== undefined && Number.isNaN(mrr)) || (setupFee !== undefined && Number.isNaN(setupFee))) {
      setError('MRR and setup fee must be numbers.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: trimmedTitle,
        stage,
        planInterest: planInterest || undefined,
        expectedMRR: mrr,
        expectedSetupFee: setupFee,
        expectedCloseDate: expectedCloseDate || undefined,
        source: source.trim() || undefined,
        lostReason: stage === 'Lost' ? lostReason.trim() || undefined : undefined,
        ownerEmployeeId: ownerEmployeeId || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save deal.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Deal"
      onClick={onClose}
    >
      <form
        className="surface flex max-h-full w-full max-w-2xl flex-col border-accent-500/30 p-6 shadow-[0_0_44px_rgba(239,35,43,0.18)]"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">
            {deal ? 'Edit Deal' : 'Add Deal'}
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

        <div className="mt-5 grid gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-300">Title</span>
            <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} required autoFocus />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Stage</span>
            <select className="field" value={stage} onChange={(event) => setStage(event.target.value as DealStage)}>
              {DEAL_STAGES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Plan Interest</span>
            <select className="field" value={planInterest} onChange={(event) => setPlanInterest(event.target.value)}>
              <option value="">—</option>
              {planOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            {hasNoPlans ? <span className="mt-2 block text-xs text-slate-500">Add plans in Settings</span> : null}
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Expected MRR</span>
            <input
              className="field"
              type="number"
              value={expectedMRR}
              onChange={(event) => setExpectedMRR(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Expected Setup Fee</span>
            <input
              className="field"
              type="number"
              value={expectedSetupFee}
              onChange={(event) => setExpectedSetupFee(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Expected Close Date</span>
            <input
              className="field"
              type="date"
              value={expectedCloseDate}
              onChange={(event) => setExpectedCloseDate(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Source</span>
            <input className="field" value={source} onChange={(event) => setSource(event.target.value)} placeholder="e.g. Referral" />
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
          {stage === 'Lost' ? (
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-300">Lost Reason</span>
              <input className="field" value={lostReason} onChange={(event) => setLostReason(event.target.value)} />
            </label>
          ) : null}
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-300">Notes</span>
            <textarea className="field min-h-[90px]" value={notes} onChange={(event) => setNotes(event.target.value)} />
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
            {saving ? 'Saving…' : deal ? 'Save Deal' : 'Add Deal'}
          </button>
        </div>
      </form>
    </div>
  );
};
