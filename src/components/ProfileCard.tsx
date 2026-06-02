import { FormEvent, useState } from 'react';
import type { UserProfile, WorkMode } from '../types';

export const ProfileCard = ({
  profile,
  onSave,
}: {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
}) => {
  const [draft, setDraft] = useState(profile);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(draft);
  };

  return (
    <form onSubmit={submit} className="surface max-w-3xl p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-accent-600 text-2xl font-bold text-white">
          {draft.name
            .split(' ')
            .map((part) => part[0])
            .slice(0, 2)
            .join('')}
        </div>
        <div>
          <h3 className="text-2xl font-semibold text-white">{draft.name}</h3>
          <p className="mt-1 text-sm text-slate-400">{draft.department} - {draft.role}</p>
        </div>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Name</span>
          <input className="field" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
          <input className="field" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Role</span>
          <input className="field" value={draft.role} disabled />
        </label>
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Department</span>
          <input
            className="field"
            value={draft.department}
            onChange={(event) => setDraft({ ...draft, department: event.target.value })}
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Work Mode</span>
          <select
            className="field"
            value={draft.workMode}
            onChange={(event) => setDraft({ ...draft, workMode: event.target.value as WorkMode })}
          >
            <option>Office</option>
            <option>Remote</option>
            <option>Hybrid</option>
          </select>
        </label>
      </div>

      <button type="submit" className="btn-primary mt-6">
        Save Profile
      </button>
    </form>
  );
};
