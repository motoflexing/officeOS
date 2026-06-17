import { ChevronLeft, Hash, MessageCircle, Plus, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NewChatModal } from '../components/NewChatModal';
import { PageHeader } from '../components/PageHeader';
import { auth, companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type { Conversation, Employee, Message } from '../types';

// One indirection so every call site is identical in Firebase and localStorage modes.
const chat = isFirebaseConfigured ? firestoreService : storage;

const GROUP_WINDOW_MS = 5 * 60 * 1000;

export const WorkspacePage = () => {
  const { profile } = useAuth();
  // Strict identity: chat keys on the real Firebase Auth UID ONLY. No email fallback — that
  // mismatch caused two parties to write to different DM docs. If there's no signed-in Firebase
  // user (e.g. localStorage/demo mode), chat is unavailable and we show a "Sign in required" state.
  const currentUid = auth?.currentUser?.uid ?? null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesError, setEmployeesError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Subscribe to this company's conversations for the current user. One logical subscription
  // (two onSnapshot listeners merged inside the service) torn down on unmount/identity change.
  useEffect(() => {
    if (!currentUid) return;
    const unsubscribe = chat.subscribeToConversations(companyId, currentUid, setConversations);
    return unsubscribe;
  }, [currentUid]);

  // Flag orphaned/legacy DM docs (cruft from the pre-fix dual-identity bug): any DM whose
  // participants reference a UID that isn't a known employee authUid. Diagnostic only — no cleanup.
  useEffect(() => {
    if (employees.length === 0) return;
    const knownUids = new Set(employees.map((employee) => employee.authUid).filter(Boolean));
    knownUids.add(currentUid ?? '');
    conversations
      .filter((conversation) => conversation.type === 'dm')
      .forEach((conversation) => {
        const unknown = (conversation.participants ?? []).filter((uid) => !knownUids.has(uid));
        if (unknown.length > 0) {
          console.warn(
            `[Workspace] DM ${conversation.id} references unknown participant UID(s): ${unknown.join(', ')}. ` +
              'Likely legacy cruft from before the identity fix; not auto-cleaned.',
          );
        }
      });
  }, [conversations, employees, currentUid]);

  // Subscribe to messages for the selected conversation only. Cleanup runs when the selection
  // changes or the component unmounts, so exactly one messages listener is ever active.
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    const unsubscribe = chat.subscribeToMessages(companyId, selectedId, setMessages);
    return unsubscribe;
  }, [selectedId]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const channels = useMemo(() => conversations.filter((c) => c.type === 'channel'), [conversations]);
  const directMessages = useMemo(() => conversations.filter((c) => c.type === 'dm'), [conversations]);

  const selectConversation = (id: string) => {
    setSelectedId(id);
    setMobileView('chat');
  };

  const openNewChat = async () => {
    setModalOpen(true);
    setEmployeesError('');
    try {
      const list = isFirebaseConfigured ? await firestoreService.getEmployees() : storage.getEmployees();
      // Only DM-able employees: must have an authUid (otherwise they can't be keyed in chat) and
      // must not be the current user. Both checks use the canonical authUid identity — no email.
      setEmployees(list.filter((employee) => employee.authUid && employee.authUid !== currentUid));
    } catch {
      setEmployees([]);
      setEmployeesError('Unable to load people. You may not have access to the employee directory.');
    }
  };

  const startDM = async (employee: Employee) => {
    // Guaranteed by the picker filter + the sign-in gate, but guard defensively: both parties
    // must resolve to a real authUid or we'd recreate the dual-identity bug.
    if (!profile || !currentUid || !employee.authUid) return;
    const conversation = await chat.getOrCreateDM(
      companyId,
      currentUid,
      employee.authUid,
      profile.name,
      profile.email,
      employee.name,
      employee.email,
    );
    setModalOpen(false);
    selectConversation(conversation.id);
  };

  const createChannel = async (name: string, description: string) => {
    if (!currentUid) return;
    const conversation = await chat.createChannel(companyId, name, description, currentUid);
    setModalOpen(false);
    selectConversation(conversation.id);
  };

  const sendMessage = async (text: string) => {
    if (!selectedId || !profile || !currentUid || !text.trim()) return;
    await chat.sendMessage(companyId, selectedId, {
      conversationId: selectedId,
      senderUid: currentUid,
      senderName: profile.name,
      senderEmail: profile.email,
      text: text.trim(),
    });
  };

  if (!profile) return null;

  // Chat requires a real Firebase Auth session (strict UID identity). No signed-in user → no chat.
  if (!currentUid) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Workspace" title="Workspace" subtitle="Internal chat and collaboration." />
        <div className="surface flex min-h-[20rem] items-center justify-center p-6 text-center">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-accent-10)] text-[color:var(--color-accent)]">
              <MessageCircle size={24} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-[color:var(--color-text-primary)]">Sign in required</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[color:var(--color-text-secondary)]">
              Workspace chat needs a signed-in account. Please sign in with your OfficeOS credentials to start
              messaging.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspace" title="Workspace" subtitle="Internal chat and collaboration." />

      <div className="surface flex h-[calc(100vh-16rem)] min-h-[28rem] overflow-hidden p-0">
        {/* Left pane — conversation list */}
        <aside
          className={`w-full flex-col border-r border-[color:var(--color-border-weak)] md:flex md:w-80 ${
            mobileView === 'list' ? 'flex' : 'hidden'
          }`}
        >
          <div className="border-b border-[color:var(--color-border-weak)] p-4">
            <button type="button" className="btn-primary w-full" onClick={openNewChat}>
              <Plus size={18} />
              New Chat
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            <ConversationSection
              title="Channels"
              emptyLabel="No channels yet"
              conversations={channels}
              selectedId={selectedId}
              onSelect={selectConversation}
              currentUid={currentUid}
            />
            <ConversationSection
              title="Direct Messages"
              emptyLabel="No direct messages yet"
              conversations={directMessages}
              selectedId={selectedId}
              onSelect={selectConversation}
              currentUid={currentUid}
            />
          </div>
        </aside>

        {/* Right pane — message view */}
        <section
          className={`w-full flex-col md:flex md:flex-1 ${mobileView === 'chat' ? 'flex' : 'hidden'}`}
        >
          {selectedConversation ? (
            <ChatPane
              conversation={selectedConversation}
              messages={messages}
              currentUid={currentUid}
              onBack={() => setMobileView('list')}
              onSend={sendMessage}
            />
          ) : (
            <EmptyChat />
          )}
        </section>
      </div>

      {modalOpen ? (
        <NewChatModal
          employees={employees}
          employeesError={employeesError}
          onClose={() => setModalOpen(false)}
          onCreateChannel={createChannel}
          onStartDM={startDM}
        />
      ) : null}
    </div>
  );
};

const ConversationSection = ({
  conversations,
  currentUid,
  emptyLabel,
  onSelect,
  selectedId,
  title,
}: {
  conversations: Conversation[];
  currentUid: string;
  emptyLabel: string;
  onSelect: (id: string) => void;
  selectedId: string | null;
  title: string;
}) => (
  <div>
    <p className="px-1 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-accent)]">{title}</p>
    <div className="mt-2 space-y-1">
      {conversations.length === 0 ? (
        <p className="px-1 py-1 text-sm text-[color:var(--color-text-faint)]">{emptyLabel}</p>
      ) : (
        conversations.map((conversation) => {
          const active = conversation.id === selectedId;
          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                active
                  ? 'bg-gradient-to-r from-red-950 via-red-900/75 to-[color:var(--color-accent-hover-35)] text-[color:var(--color-text-primary)] shadow-[var(--shadow-glow-inset)]'
                  : 'text-[color:var(--color-text-secondary)] hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-bright)]'
              }`}
            >
              {conversation.type === 'channel' ? (
                <Hash size={16} className="shrink-0 text-[color:var(--color-text-muted)]" />
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent-hover)] text-xs font-bold text-[color:var(--color-on-accent)]">
                  {conversationDisplayName(conversation, currentUid).charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{conversationDisplayName(conversation, currentUid)}</span>
            </button>
          );
        })
      )}
    </div>
  </div>
);

const ChatPane = ({
  conversation,
  currentUid,
  messages,
  onBack,
  onSend,
}: {
  conversation: Conversation;
  currentUid: string;
  messages: Message[];
  onBack: () => void;
  onSend: (text: string) => void;
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const previousConversationId = useRef<string | null>(null);

  // Auto-scroll: instant jump when switching conversations, smooth on new messages.
  useEffect(() => {
    const switched = previousConversationId.current !== conversation.id;
    previousConversationId.current = conversation.id;
    bottomRef.current?.scrollIntoView({ behavior: switched ? 'auto' : 'smooth', block: 'end' });
  }, [messages.length, conversation.id]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[color:var(--color-border-weak)] p-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="rounded-lg p-1 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)] md:hidden"
        >
          <ChevronLeft size={20} />
        </button>
        {conversation.type === 'channel' ? <Hash size={18} className="text-[color:var(--color-text-muted)]" /> : null}
        <div className="min-w-0">
          <p className="truncate font-semibold text-[color:var(--color-text-primary)]">
            {conversation.type === 'channel'
              ? `#${conversation.name ?? 'channel'}`
              : conversationDisplayName(conversation, currentUid)}
          </p>
          {conversation.type === 'channel' && conversation.description ? (
            <p className="truncate text-xs text-[color:var(--color-text-muted)]">{conversation.description}</p>
          ) : conversation.type === 'dm' ? (
            <p className="truncate text-xs text-[color:var(--color-text-muted)]">{conversationDisplayEmail(conversation, currentUid)}</p>
          ) : null}
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[color:var(--color-text-muted)]">No messages yet. Say hi.</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const previous = messages[index - 1];
            const grouped =
              !!previous &&
              previous.senderUid === message.senderUid &&
              new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < GROUP_WINDOW_MS;
            return <MessageRow key={message.id} message={message} grouped={grouped} />;
          })
        )}
        <div ref={bottomRef} />
      </div>

      <MessageComposer onSend={onSend} />
    </div>
  );
};

const MessageRow = ({ grouped, message }: { grouped: boolean; message: Message }) => {
  if (grouped) {
    return (
      <div className="flex gap-3 pl-12">
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[color:var(--color-text-secondary)]">{message.text}</p>
      </div>
    );
  }
  return (
    <div className="flex gap-3 pt-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-hover)] text-sm font-bold text-[color:var(--color-on-accent)]">
        {message.senderName.trim().charAt(0).toUpperCase() || '?'}
      </span>
      <div className="min-w-0">
        <p className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-[color:var(--color-text-primary)]">{message.senderName}</span>
          <span className="text-xs text-[color:var(--color-text-muted)]">{relativeTime(message.createdAt)}</span>
        </p>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-6 text-[color:var(--color-text-secondary)]">{message.text}</p>
      </div>
    </div>
  );
};

const MessageComposer = ({ onSend }: { onSend: (text: string) => void }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow up to ~5 lines, then scroll.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const submit = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-[color:var(--color-border-weak)] p-4">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          className="field max-h-32 min-h-[2.75rem] flex-1 resize-none"
          rows={1}
          placeholder="Write a message..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="btn-primary h-[2.75rem] px-4"
          disabled={!text.trim()}
          onClick={submit}
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

const EmptyChat = () => (
  <div className="flex h-full items-center justify-center p-6 text-center">
    <div>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-accent-10)] text-[color:var(--color-accent)]">
        <MessageCircle size={24} />
      </div>
      <p className="mt-4 text-sm text-[color:var(--color-text-secondary)]">Select a conversation or start a new one</p>
    </div>
  </div>
);

// ── Display helpers ────────────────────────────────────────────────────
type ConversationWithMaps = Conversation & {
  participantNames?: Record<string, string>;
  participantEmails?: Record<string, string>;
};

const otherParticipantUid = (conversation: Conversation, currentUid: string) =>
  conversation.participants?.find((uid) => uid !== currentUid) ?? '';

const conversationDisplayName = (conversation: Conversation, currentUid: string): string => {
  if (conversation.type === 'channel') return `#${conversation.name ?? 'channel'}`;
  const otherUid = otherParticipantUid(conversation, currentUid);
  const names = (conversation as ConversationWithMaps).participantNames;
  return names?.[otherUid] || otherUid || 'Direct message';
};

const conversationDisplayEmail = (conversation: Conversation, currentUid: string): string => {
  const otherUid = otherParticipantUid(conversation, currentUid);
  const emails = (conversation as ConversationWithMaps).participantEmails;
  return emails?.[otherUid] || '';
};

const relativeTime = (iso: string): string => {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const diffMs = Date.now() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  if (then >= startOfYesterday && then < startOfToday) return 'Yesterday';

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(then);
};
