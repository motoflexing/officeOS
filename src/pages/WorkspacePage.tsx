import { Building2, Mail, MessageSquare, Radio, Send, UsersRound } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Toast';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type { DirectConversation, DirectMessage, PresenceStatus, UserProfile, WorkspaceUser } from '../types';

const presenceStatuses: PresenceStatus[] = ['Online', 'Away', 'On Break', 'In Meeting', 'Offline'];

export const WorkspacePage = () => {
  const { profile } = useAuth();
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>(() => storage.getWorkspaceUsers());
  const [directConversations, setDirectConversations] = useState<DirectConversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<WorkspaceUser | null>(null);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PresenceStatus>('Online');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const currentUser = useMemo(
    () => workspaceUsers.find((user) => user.email === profile?.email),
    [profile?.email, workspaceUsers],
  );
  const currentStatus = currentUser?.presenceStatus || selectedStatus;
  const directMessageUsers = useMemo(
    () => workspaceUsers.filter((user) => user.email !== profile?.email),
    [profile?.email, workspaceUsers],
  );

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
        setDirectConversations(storage.getDirectConversationsForUser(profile.email));
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

  useEffect(() => {
    if (!profile) return;

    if (!isFirebaseConfigured) {
      setDirectConversations(storage.getDirectConversationsForUser(profile.email));
      return;
    }

    firestoreService
      .getDirectConversationsForUser(profile.email)
      .then(setDirectConversations)
      .catch((error) => notify(error instanceof Error ? error.message : 'Unable to load direct messages.'));
  }, [profile?.email]);

  useEffect(() => {
    if (!profile || !selectedUser) {
      setDirectMessages([]);
      return;
    }

    const conversationId = createDirectConversationId([profile.email, selectedUser.email]);
    setMessagesLoading(true);

    if (!isFirebaseConfigured) {
      setDirectMessages(storage.getDirectMessages(conversationId));
      setMessagesLoading(false);
      return;
    }

    firestoreService
      .getDirectMessages(conversationId)
      .then(setDirectMessages)
      .catch((error) => notify(error instanceof Error ? error.message : 'Unable to load messages.'))
      .finally(() => setMessagesLoading(false));
  }, [profile, selectedUser]);

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

  const sendDirectMessage = async (event: FormEvent) => {
    event.preventDefault();
    const text = messageText.trim();
    if (!profile || !selectedUser || !text) return;

    try {
      if (isFirebaseConfigured) {
        await firestoreService.sendDirectMessage(profile, selectedUser, text);
        const conversationId = createDirectConversationId([profile.email, selectedUser.email]);
        const [messages, conversations] = await Promise.all([
          firestoreService.getDirectMessages(conversationId),
          firestoreService.getDirectConversationsForUser(profile.email),
        ]);
        setDirectMessages(messages);
        setDirectConversations(conversations);
      } else {
        const result = storage.sendDirectMessage(profile, selectedUser, text);
        setDirectMessages(result.messages);
        setDirectConversations(storage.getDirectConversationsForUser(profile.email));
      }
      setMessageText('');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to send message.');
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

        <section className="grid gap-4 md:grid-cols-2">
          <ComingSoonCard icon={UsersRound} title="Groups" />
          <ComingSoonCard icon={Mail} title="Internal mail" />
        </section>
      </section>

      <section className="surface overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent-500/25 bg-accent-500/10 text-accent-100">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Direct Messages</h3>
              <p className="mt-1 text-sm text-slate-500">Start a one-to-one conversation with a teammate.</p>
            </div>
          </div>
        </div>

        <div className="grid min-h-[560px] lg:grid-cols-[360px_1fr]">
          <aside className="border-b border-white/10 lg:border-b-0 lg:border-r">
            <div className="border-b border-white/10 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Teammates</p>
              <p className="mt-1 text-sm text-slate-300">{directMessageUsers.length} available contacts</p>
            </div>
            <div className="max-h-[500px] overflow-y-auto p-3">
              {directMessageUsers.map((user) => {
                const conversation = directConversations.find((item) => item.participantEmails.includes(user.email));
                const isSelected = selectedUser?.email === user.email;

                return (
                  <button
                    key={`${user.id}-${user.email}`}
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className={`mb-2 w-full rounded-lg border p-3 text-left transition ${
                      isSelected
                        ? 'border-accent-500/45 bg-accent-500/10 shadow-[0_0_24px_rgba(239,35,43,0.14)]'
                        : 'border-white/10 bg-white/[0.035] hover:border-accent-500/25 hover:bg-white/[0.055]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
                      </div>
                      <PresenceBadge status={user.presenceStatus} />
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-slate-400">
                      <span className="truncate">{user.role} · {user.department}</span>
                      <span>Last active: {formatLastActive(user.lastActiveAt)}</span>
                      {conversation?.lastMessage ? (
                        <span className="truncate text-slate-500">Last: {conversation.lastMessage}</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex min-h-[560px] flex-col">
            {selectedUser ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedUser.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedUser.role} · {selectedUser.department}
                    </p>
                  </div>
                  <PresenceBadge status={selectedUser.presenceStatus} />
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                  {messagesLoading ? <p className="text-sm text-slate-500">Loading messages...</p> : null}
                  {!messagesLoading && directMessages.length === 0 ? (
                    <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.025] p-6 text-center">
                      <p className="text-sm text-slate-500">No messages yet. Send the first message.</p>
                    </div>
                  ) : null}
                  {directMessages.map((message) => {
                    const isMine = message.senderEmail === profile?.email;

                    return (
                      <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[78%] rounded-lg border px-4 py-3 ${
                            isMine
                              ? 'border-accent-500/30 bg-accent-500/15 text-white'
                              : 'border-white/10 bg-white/[0.045] text-slate-200'
                          }`}
                        >
                          <p className="text-sm leading-6">{message.text}</p>
                          <p className="mt-2 text-[11px] text-slate-500">{formatLastActive(message.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={sendDirectMessage} className="border-t border-white/10 p-4">
                  <div className="flex gap-3">
                    <input
                      className="field"
                      placeholder={`Message ${selectedUser.name}`}
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                    />
                    <button type="submit" className="btn-primary shrink-0" disabled={!messageText.trim()}>
                      <Send size={18} />
                      Send
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6">
                <div className="max-w-sm rounded-lg border border-dashed border-white/10 bg-white/[0.025] p-6 text-center">
                  <MessageSquare className="mx-auto text-accent-500" size={30} />
                  <p className="mt-4 text-sm font-semibold text-white">Select a teammate to start a conversation.</p>
                  <p className="mt-2 text-sm text-slate-500">Direct messages are private one-to-one workspace conversations.</p>
                </div>
              </div>
            )}
          </div>
        </div>
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

const createDirectConversationId = (emails: string[]) =>
  [...emails]
    .sort((a, b) => a.localeCompare(b))
    .map((email) => email.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''))
    .join('__');

const formatLastActive = (value: string | undefined) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};
