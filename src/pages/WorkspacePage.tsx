import { Building2, Mail, MessageSquare, Radio, UsersRound } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Toast';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type { PresenceStatus, UserProfile, WorkspaceUser } from '../types';

const presenceStatuses: PresenceStatus[] = ['Online', 'Away', 'On Break', 'In Meeting', 'Offline'];

export const WorkspacePage = () => {
  const { profile } = useAuth();
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>(() => storage.getWorkspaceUsers());
  const [selectedStatus, setSelectedStatus] = useState<PresenceStatus>('Online');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(isFirebaseConfigured);

  const currentUser = useMemo(
    () => workspaceUsers.find((user) => user.email === profile?.email),
    [profile?.email, workspaceUsers],
  );
  const currentStatus = currentUser?.presenceStatus || selectedStatus;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  };

  useEffect(() => {
    if (currentUser?.presenceStatus) {
      setSelectedStatus(currentUser.presenceStatus);
    }
  }, [currentUser?.presenceStatus]);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      if (profile) {
        setWorkspaceUsers((users) => ensureCurrentUser(users, profile, selectedStatus));
      }
      return;
    }

    firestoreService
      .getWorkspaceUsers()
      .then((users) => {
        setWorkspaceUsers(profile ? ensureCurrentUser(users, profile, selectedStatus) : users);
      })
      .catch((error) => {
        notify(error instanceof Error ? error.message : 'Unable to load workspace users.');
      })
      .finally(() => setLoading(false));
  }, [profile]);

  const updateStatus = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;

    try {
      if (isFirebaseConfigured) {
        const uid = auth?.currentUser?.uid;
        if (!uid) throw new Error('Unable to identify the current workspace user.');
        await firestoreService.updateMyPresenceStatus(uid, selectedStatus);
        setWorkspaceUsers((users) => upsertPresence(users, profile, selectedStatus));
      } else {
        const nextUsers = storage.updateMyPresenceStatus(profile, selectedStatus);
        setWorkspaceUsers(nextUsers);
      }
      notify(`Status updated to ${selectedStatus}.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to update status.');
    }
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}
      {loading ? <p className="text-sm text-slate-400">Loading workspace...</p> : null}

      <PageHeader
        eyebrow="OfficeOS Workspace"
        title="Workspace"
        subtitle="See your team availability and internal communication hub."
      />

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={updateStatus} className="surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-accent-500/25 bg-accent-500/10 text-accent-100">
              <Radio size={22} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent-500">My Status</p>
              <h3 className="mt-1 text-xl font-semibold text-white">{currentStatus}</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Status</span>
              <select
                className="field"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value as PresenceStatus)}
              >
                {presenceStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-primary">
              Update status
            </button>
          </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <p className="text-sm font-semibold text-white">{profile?.name || 'Workspace User'}</p>
            <p className="mt-1 text-xs text-slate-500">{profile?.email || 'Signed in user'}</p>
            <div className="mt-3">
              <PresenceBadge status={currentStatus} />
            </div>
          </div>
        </form>

        <section className="grid gap-4 md:grid-cols-3">
          <ComingSoonCard icon={MessageSquare} title="Direct messages" />
          <ComingSoonCard icon={UsersRound} title="Groups" />
          <ComingSoonCard icon={Mail} title="Internal mail" />
        </section>
      </section>

      <section className="surface overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Team Availability</h3>
              <p className="mt-1 text-sm text-slate-500">Live presence foundation for the internal workspace.</p>
            </div>
            <span className="rounded-lg border border-accent-500/20 bg-accent-500/10 px-3 py-2 text-sm font-semibold text-accent-100">
              {workspaceUsers.length} people
            </span>
          </div>
        </div>

        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
          {workspaceUsers.map((user) => (
            <article
              key={`${user.id}-${user.email}`}
              className="rounded-lg border border-white/10 bg-white/[0.035] p-4 transition hover:border-accent-500/30 hover:bg-white/[0.055]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{user.name}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
                </div>
                <PresenceBadge status={user.presenceStatus} />
              </div>

              <div className="mt-4 grid gap-3 text-sm">
                <WorkspaceUserMeta icon={Building2} label={user.department} />
                <WorkspaceUserMeta icon={UsersRound} label={user.role} />
              </div>

              <div className="mt-4 border-t border-white/10 pt-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Last active</p>
                <p className="mt-1 text-sm text-slate-300">{formatLastActive(user.lastActiveAt)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

const ComingSoonCard = ({ icon: Icon, title }: { icon: typeof MessageSquare; title: string }) => (
  <article className="surface p-5">
    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] text-slate-300">
      <Icon size={20} />
    </div>
    <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
    <p className="mt-2 text-sm text-slate-500">Coming soon</p>
  </article>
);

const WorkspaceUserMeta = ({ icon: Icon, label }: { icon: typeof Building2; label: string }) => (
  <div className="flex min-w-0 items-center gap-2 text-slate-400">
    <Icon className="shrink-0 text-slate-500" size={16} />
    <span className="truncate">{label}</span>
  </div>
);

const PresenceBadge = ({ status }: { status: PresenceStatus }) => (
  <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${presenceClass(status)}`}>
    {status}
  </span>
);

const presenceClass = (status: PresenceStatus) => {
  if (status === 'Online') return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200';
  if (status === 'Away') return 'border-yellow-400/25 bg-yellow-500/10 text-yellow-200';
  if (status === 'On Break') return 'border-orange-400/25 bg-orange-500/10 text-orange-200';
  if (status === 'In Meeting') return 'border-indigo-400/25 bg-indigo-500/10 text-indigo-200';
  return 'border-slate-400/25 bg-slate-500/10 text-slate-300';
};

const ensureCurrentUser = (users: WorkspaceUser[], profile: UserProfile, fallbackStatus: PresenceStatus) => {
  if (users.some((user) => user.email === profile.email)) return users;
  return [
    {
      id: `workspace-${profile.email}`,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      department: profile.department,
      presenceStatus: fallbackStatus,
      lastActiveAt: new Date().toISOString(),
    },
    ...users,
  ];
};

const upsertPresence = (users: WorkspaceUser[], profile: UserProfile, presenceStatus: PresenceStatus) => {
  const lastActiveAt = new Date().toISOString();
  const nextUser: WorkspaceUser = {
    id: `workspace-${profile.email}`,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    department: profile.department,
    presenceStatus,
    lastActiveAt,
  };
  return users.some((user) => user.email === profile.email)
    ? users.map((user) => (user.email === profile.email ? { ...user, ...nextUser } : user))
    : [nextUser, ...users];
};

const formatLastActive = (value: string | undefined) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};
