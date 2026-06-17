import { FormEvent, useState } from 'react';
import type { DailyReport } from '../types';

export type ReportDraft = Pick<DailyReport, 'tasksCompleted' | 'tasksInProgress' | 'blockers' | 'nextPlan'>;

const emptyDraft: ReportDraft = {
  tasksCompleted: '',
  tasksInProgress: '',
  blockers: '',
  nextPlan: '',
};

const fields: Array<{ key: keyof ReportDraft; label: string }> = [
  { key: 'tasksCompleted', label: 'Tasks Completed' },
  { key: 'tasksInProgress', label: 'Tasks In Progress' },
  { key: 'blockers', label: 'Blockers' },
  { key: 'nextPlan', label: 'Plan for Tomorrow' },
];

export const ReportForm = ({ onSubmit }: { onSubmit: (draft: ReportDraft) => void }) => {
  const [draft, setDraft] = useState<ReportDraft>(emptyDraft);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(draft);
    setDraft(emptyDraft);
  };

  return (
    <form onSubmit={submit} className="surface p-5">
      <div className="grid gap-4 lg:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className={field.key === 'nextPlan' ? 'lg:col-span-2' : ''}>
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">{field.label}</span>
            <textarea
              className="field min-h-28 resize-y"
              value={draft[field.key]}
              onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
              required={field.key !== 'blockers'}
            />
          </label>
        ))}
      </div>
      <button type="submit" className="btn-primary mt-5">
        Submit Daily Report
      </button>
    </form>
  );
};
