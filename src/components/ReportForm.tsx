import { FormEvent, useState } from 'react';
import type { DailyReport } from '../types';

type ReportDraft = Omit<DailyReport, 'id' | 'date' | 'author'>;

const emptyDraft: ReportDraft = {
  plannedTasks: '',
  completedTasks: '',
  workInProgress: '',
  blockers: '',
  learnings: '',
};

const fields: Array<{ key: keyof ReportDraft; label: string }> = [
  { key: 'plannedTasks', label: 'Planned Tasks' },
  { key: 'completedTasks', label: 'Completed Tasks' },
  { key: 'workInProgress', label: 'Work In Progress' },
  { key: 'blockers', label: 'Blockers' },
  { key: 'learnings', label: 'Learnings' },
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
          <label key={field.key} className={field.key === 'learnings' ? 'lg:col-span-2' : ''}>
            <span className="mb-2 block text-sm font-medium text-slate-300">{field.label}</span>
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
