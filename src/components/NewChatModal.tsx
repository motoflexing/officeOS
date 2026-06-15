import { Hash, Search, User, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Employee } from '../types';

type NewChatTab = 'dm' | 'channel';

export const NewChatModal = ({
  employees,
  employeesError,
  onClose,
  onCreateChannel,
  onStartDM,
}: {
  employees: Employee[];
  employeesError: string;
  onClose: () => void;
  onCreateChannel: (name: string, description: string) => void;
  onStartDM: (employee: Employee) => void;
}) => {
  const [tab, setTab] = useState<NewChatTab>('dm');
  const [search, setSearch] = useState('');
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((employee) =>
      `${employee.name} ${employee.email}`.toLowerCase().includes(term),
    );
  }, [employees, search]);

  // Channel names: lowercase, hyphens allowed, no spaces. Validate inline.
  const normalizedChannelName = channelName.trim();
  const channelNameValid = /^[a-z0-9-]+$/.test(normalizedChannelName);
  const showChannelError = normalizedChannelName.length > 0 && !channelNameValid;

  const submitChannel = () => {
    if (!channelNameValid) return;
    onCreateChannel(normalizedChannelName, channelDescription.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="New chat"
      onClick={onClose}
    >
      <div
        className="surface flex max-h-[80vh] w-full max-w-lg flex-col border-accent-500/30 p-6 shadow-[0_0_44px_rgba(239,35,43,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">New Chat</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/[0.055] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <TabButton active={tab === 'dm'} icon={User} label="New Direct Message" onClick={() => setTab('dm')} />
          <TabButton active={tab === 'channel'} icon={Hash} label="New Channel" onClick={() => setTab('channel')} />
        </div>

        {tab === 'dm' ? (
          <div className="mt-5 flex min-h-0 flex-1 flex-col">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="field pl-9"
                placeholder="Search employees by name or email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto">
              {employeesError ? (
                <p className="px-1 py-6 text-center text-sm text-slate-500">{employeesError}</p>
              ) : filteredEmployees.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-slate-500">No employees found.</p>
              ) : (
                filteredEmployees.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => onStartDM(employee)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[0.055]"
                  >
                    <Avatar name={employee.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-100">{employee.name}</span>
                      <span className="block truncate text-xs text-slate-500">{employee.email}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Channel name</span>
              <input
                className="field"
                placeholder="e.g. design-team"
                value={channelName}
                onChange={(event) => setChannelName(event.target.value)}
              />
              {showChannelError ? (
                <span className="mt-2 block text-xs text-accent-300">
                  Use lowercase letters, numbers, and hyphens only — no spaces.
                </span>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Description (optional)</span>
              <input
                className="field"
                placeholder="What is this channel about?"
                value={channelDescription}
                onChange={(event) => setChannelDescription(event.target.value)}
              />
            </label>
            <button type="button" className="btn-primary" disabled={!channelNameValid} onClick={submitChannel}>
              <Hash size={18} />
              Create Channel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof User;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
      active
        ? 'bg-accent-500 text-white shadow-[0_0_24px_rgba(239,35,43,0.22)]'
        : 'text-slate-400 hover:bg-white/[0.055] hover:text-white'
    }`}
  >
    <Icon size={16} />
    {label}
  </button>
);

const Avatar = ({ name }: { name: string }) => (
  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-600 text-sm font-bold text-white">
    {name.trim().charAt(0).toUpperCase() || '?'}
  </span>
);
