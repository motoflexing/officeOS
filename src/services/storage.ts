import {
  defaultAnnouncements,
  defaultCandidates,
  defaultInterviews,
  defaultJobOpenings,
  defaultLeaveRequests,
  defaultProfiles,
  defaultSettings,
  employees,
} from '../data/mockData';
import type {
  Activity,
  Announcement,
  AttendanceIndexRecord,
  AttendanceRecord,
  Candidate,
  Client,
  CompanySettings,
  Contact,
  ChecklistItem,
  Conversation,
  DailyReport,
  Deal,
  Employee,
  Engagement,
  Interview,
  JobOpening,
  LeaveRequest,
  Message,
  OnboardingChecklist,
  PricingPlan,
  Role,
  Subscription,
  UserProfile,
} from '../types';
import { DEFAULT_CHECKLIST_ITEMS, DEFAULT_ONBOARDING_TEMPLATE_VERSION } from '../config/onboardingTemplate';
import type { DashboardPendingActions } from './firestoreService';

const read = <T>(key: string, fallback: T): T => {
  const item = localStorage.getItem(key);
  if (!item) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    return JSON.parse(item) as T;
  } catch {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
};

const write = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
  return value;
};

const toWorkModePolicy = (mode: CompanySettings['defaultWorkMode']): CompanySettings['workModePolicy'] | undefined => {
  if (mode === 'Office') return 'Office Only';
  if (mode === 'Remote') return 'Remote Friendly';
  if (mode === 'Hybrid') return 'Hybrid';
  return undefined;
};

const toTimeInputValue = (time: string | undefined) => {
  if (!time) return undefined;
  if (/^\d{2}:\d{2}$/.test(time)) return time;

  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return undefined;

  const [, hourValue, minuteValue, periodValue] = match;
  const period = periodValue.toUpperCase();
  let hour = Number(hourValue);

  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  return `${hour.toString().padStart(2, '0')}:${minuteValue}`;
};

const normalizeSettings = (settings: Partial<CompanySettings>): CompanySettings => {
  const [legacyStartTime, legacyEndTime] = settings.workingHours?.split(' - ') ?? [];

  return {
    ...defaultSettings,
    ...settings,
    workspaceName: settings.workspaceName || settings.companyName || defaultSettings.workspaceName,
    productName: settings.productName || defaultSettings.productName,
    websiteUrl: settings.websiteUrl || defaultSettings.websiteUrl,
    websiteLabel: settings.websiteLabel || defaultSettings.websiteLabel,
    officeStartTime:
      toTimeInputValue(settings.officeStartTime) ||
      toTimeInputValue(legacyStartTime) ||
      defaultSettings.officeStartTime,
    officeEndTime:
      toTimeInputValue(settings.officeEndTime) ||
      toTimeInputValue(legacyEndTime) ||
      defaultSettings.officeEndTime,
    workModePolicy: settings.workModePolicy || toWorkModePolicy(settings.defaultWorkMode) || defaultSettings.workModePolicy,
    allowHrAnnouncements: settings.allowHrAnnouncements ?? true,
    requireDailyReports: settings.requireDailyReports ?? settings.dailyReportReminders ?? true,
    timezone: settings.timezone || defaultSettings.timezone,
  };
};

// ── Chat: localStorage keys + helpers ──────────────────────────────────
const conversationsKey = (companyId: string) => `geekynd:conversations:${companyId}`;
const messagesKey = (companyId: string, conversationId: string) =>
  `geekynd:messages:${companyId}:${conversationId}`;

// ── CRM: localStorage keys ──────────────────────────────────────────────
const clientsKey = (companyId: string) => `geekynd:clients:${companyId}`;
const contactsKey = (companyId: string, clientId: string) => `geekynd:contacts:${companyId}:${clientId}`;
const dealsKey = (companyId: string, clientId: string) => `geekynd:deals:${companyId}:${clientId}`;
// Denormalized cache of every deal across all clients, kept in sync on every
// deal write so the pipeline view's subscription mirrors the Firestore CG query.
const dealsAllKey = (companyId: string) => `geekynd:deals-all:${companyId}`;
const activitiesKey = (companyId: string, clientId: string) => `geekynd:activities:${companyId}:${clientId}`;
const pricingPlansKey = (companyId: string) => `geekynd:pricingPlans:${companyId}`;
const subscriptionsKey = (companyId: string, clientId: string) => `geekynd:subscriptions:${companyId}:${clientId}`;
// Denormalized cross-client cache, mirroring the Firestore subscriptions CG query.
const subscriptionsAllKey = (companyId: string) => `geekynd:subscriptions-all:${companyId}`;
// Engagements per client (looked up by subscriptionId, 1:1 with a subscription).
const engagementsKey = (companyId: string, clientId: string) => `geekynd:engagements:${companyId}:${clientId}`;
// One onboarding checklist per subscription.
const checklistKey = (companyId: string, clientId: string, subId: string) =>
  `geekynd:checklist:${companyId}:${clientId}:${subId}`;

const buildDefaultChecklistItemsLocal = (): ChecklistItem[] =>
  DEFAULT_CHECKLIST_ITEMS.map((item) => ({
    id: createId('checklistitem'),
    label: item.label,
    status: 'Pending' as const,
    sortOrder: item.sortOrder,
  }));

// Keep the deals-all denormalized cache consistent with a single client's deals
// after any create/update/delete, then emit both keys so subscribers refresh.
const syncDealsAll = (companyId: string, clientId: string, clientDeals: Deal[]) => {
  const allKey = dealsAllKey(companyId);
  const others = read<Deal[]>(allKey, []).filter((deal) => deal.clientId !== clientId);
  write(allKey, [...others, ...clientDeals]);
};

// Same denormalized-cache sync for subscriptions.
const syncSubscriptionsAll = (companyId: string, clientId: string, clientSubs: Subscription[]) => {
  const allKey = subscriptionsAllKey(companyId);
  const others = read<Subscription[]>(allKey, []).filter((sub) => sub.clientId !== clientId);
  write(allKey, [...others, ...clientSubs]);
};

// Resolve display-name snapshots from the localStorage mirrors, matching the
// firestoreService denormalization behavior.
const resolvePlanNameLocal = (companyId: string, planId?: string): string | undefined => {
  if (!planId) return undefined;
  return read<PricingPlan[]>(pricingPlansKey(companyId), []).find((plan) => plan.id === planId)?.name;
};
const resolveEmployeeNameLocal = (employeeId?: string): string | undefined => {
  if (!employeeId) return undefined;
  return read<Employee[]>('geekynd:employees', employees).find((employee) => employee.id === employeeId)?.name;
};
const resolveEmployeeNamesLocal = (employeeIds: string[]): string[] => {
  const all = read<Employee[]>('geekynd:employees', employees);
  return employeeIds
    .map((id) => all.find((employee) => employee.id === id)?.name)
    .filter((name): name is string => Boolean(name));
};
const resolveContactNameLocal = (companyId: string, clientId: string, contactId?: string): string | undefined => {
  if (!contactId) return undefined;
  const contact = read<Contact[]>(contactsKey(companyId, clientId), []).find((item) => item.id === contactId);
  return contact ? `${contact.firstName} ${contact.lastName}`.trim() || undefined : undefined;
};

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
const dmConversationId = (uidA: string, uidB: string) => {
  const [first, second] = [uidA, uidB].sort();
  return `dm_${first}_${second}`;
};
const messagePreview = (text: string) => text.slice(0, 80);
const sortConversations = (conversations: Conversation[]) =>
  [...conversations].sort(
    (first, second) =>
      new Date(second.lastMessageAt || second.createdAt).getTime() -
      new Date(first.lastMessageAt || first.createdAt).getTime(),
  );

// In-memory event emitter that simulates onSnapshot for localStorage mode. Writes call
// emit(key); subscribers registered under that key are re-invoked with a fresh read. Each
// callback runs inside try/catch so a stale/dead callback (e.g. after a missed unsubscribe)
// can never throw and break emit() for the remaining subscribers.
const chatListeners = new Map<string, Set<() => void>>();

const subscribeKey = (key: string, run: () => void): (() => void) => {
  const listeners = chatListeners.get(key) ?? new Set<() => void>();
  listeners.add(run);
  chatListeners.set(key, listeners);
  return () => {
    listeners.delete(run);
    if (listeners.size === 0) chatListeners.delete(key);
  };
};

const emit = (key: string) => {
  const listeners = chatListeners.get(key);
  if (!listeners) return;
  listeners.forEach((run) => {
    try {
      run();
    } catch {
      // Swallow errors from dead/stale callbacks so one bad subscriber can't break the rest.
    }
  });
};

export const storage = {
  getRole: () => localStorage.getItem('geekynd:selectedRole') as Role | null,
  setRole: (role: Role) => localStorage.setItem('geekynd:selectedRole', role),
  clearSession: () => localStorage.removeItem('geekynd:selectedRole'),

  getProfile: (role: Role) => read<UserProfile>(`geekynd:profile:${role}`, defaultProfiles[role]),
  setProfile: (profile: UserProfile) => write(`geekynd:profile:${profile.role}`, profile),

  getAttendance: (email: string) =>
    read<AttendanceRecord[]>(`geekynd:attendance:${email}`, []),
  setAttendance: (email: string, records: AttendanceRecord[]) =>
    write(`geekynd:attendance:${email}`, records),
  getAttendanceIndex: () => read<AttendanceIndexRecord[]>('geekynd:attendance:index', []),
  setAttendanceIndex: (records: AttendanceIndexRecord[]) =>
    write('geekynd:attendance:index', records),
  upsertAttendanceIndex: (record: AttendanceIndexRecord) => {
    const records = storage.getAttendanceIndex();
    const nextRecords = records.some((item) => item.id === record.id)
      ? records.map((item) => (item.id === record.id ? record : item))
      : [record, ...records];
    return storage.setAttendanceIndex(nextRecords);
  },

  getReports: () => read<DailyReport[]>('geekynd:reports', []),
  setReports: (reports: DailyReport[]) => write('geekynd:reports', reports),

  getEmployees: () => read<Employee[]>('geekynd:employees', employees),
  setEmployees: (employeeRecords: Employee[]) => write('geekynd:employees', employeeRecords),
  upsertEmployee: (employee: Employee) => {
    const employeeRecords = storage.getEmployees();
    const nextEmployees = employeeRecords.some((item) => item.id === employee.id)
      ? employeeRecords.map((item) => (item.id === employee.id ? employee : item))
      : [employee, ...employeeRecords];
    return storage.setEmployees(nextEmployees);
  },
  deleteEmployee: (employeeId: string) => {
    const employeeRecords = storage.getEmployees();
    return storage.setEmployees(employeeRecords.filter((employee) => employee.id !== employeeId));
  },

  getAnnouncements: () => read<Announcement[]>('geekynd:announcements', defaultAnnouncements),
  setAnnouncements: (announcements: Announcement[]) =>
    write('geekynd:announcements', announcements),

  getLeaveRequests: () => read<LeaveRequest[]>('geekynd:leaveRequests', defaultLeaveRequests),
  setLeaveRequests: (requests: LeaveRequest[]) => write('geekynd:leaveRequests', requests),

  getJobOpenings: () => read<JobOpening[]>('geekynd:jobOpenings', defaultJobOpenings),
  setJobOpenings: (jobOpenings: JobOpening[]) => write('geekynd:jobOpenings', jobOpenings),

  getCandidates: () => read<Candidate[]>('geekynd:candidates', defaultCandidates),
  setCandidates: (candidates: Candidate[]) => write('geekynd:candidates', candidates),

  getInterviews: () => read<Interview[]>('geekynd:interviews', defaultInterviews),
  setInterviews: (interviews: Interview[]) => write('geekynd:interviews', interviews),

  getDashboardPendingActions: (): DashboardPendingActions => {
    const today = new Date().toISOString().slice(0, 10);
    const leaveRequests = storage.getLeaveRequests();
    const reports = storage.getReports();
    const interviews = storage.getInterviews();

    return {
      pendingLeave: leaveRequests.filter((request) => request.status === 'Pending').length,
      unreviewedReports: reports.filter((report) => report.status === 'Submitted' && report.date === today).length,
      interviewsToday: interviews.filter((interview) => interview.interviewDate === today).length,
    };
  },

  getSettings: () => normalizeSettings(read<Partial<CompanySettings>>('geekynd:settings', defaultSettings)),
  setSettings: (settings: CompanySettings) => write('geekynd:settings', normalizeSettings(settings)),

  // ── Chat: conversations ──────────────────────────────────────────────
  listConversations: async (targetCompanyId: string, currentUserUid: string): Promise<Conversation[]> => {
    const all = read<Conversation[]>(conversationsKey(targetCompanyId), []);
    return sortConversations(
      all.filter(
        (conversation) =>
          conversation.type === 'channel' || (conversation.participants?.includes(currentUserUid) ?? false),
      ),
    );
  },

  subscribeToConversations: (
    targetCompanyId: string,
    currentUserUid: string,
    callback: (conversations: Conversation[]) => void,
  ): (() => void) => {
    const key = conversationsKey(targetCompanyId);
    const run = () => {
      const all = read<Conversation[]>(key, []);
      callback(
        sortConversations(
          all.filter(
            (conversation) =>
              conversation.type === 'channel' || (conversation.participants?.includes(currentUserUid) ?? false),
          ),
        ),
      );
    };
    run(); // push the current snapshot immediately, mirroring onSnapshot.
    return subscribeKey(key, run);
  },

  getOrCreateDM: async (
    targetCompanyId: string,
    currentUserUid: string,
    otherUserUid: string,
    currentUserName: string,
    currentUserEmail: string,
    otherUserName: string,
    otherUserEmail: string,
  ): Promise<Conversation> => {
    const key = conversationsKey(targetCompanyId);
    const all = read<Conversation[]>(key, []);
    const id = dmConversationId(currentUserUid, otherUserUid);
    const existing = all.find((conversation) => conversation.id === id);
    if (existing) return existing;

    const conversation: Conversation = {
      id,
      type: 'dm',
      participants: [currentUserUid, otherUserUid].sort(),
      createdBy: currentUserUid,
      createdAt: new Date().toISOString(),
    };
    // Denormalized participant identities, matching the Firestore mirror's doc shape exactly.
    const storedConversation = {
      ...conversation,
      participantNames: { [currentUserUid]: currentUserName, [otherUserUid]: otherUserName },
      participantEmails: { [currentUserUid]: currentUserEmail, [otherUserUid]: otherUserEmail },
    };
    write(key, [storedConversation, ...all]);
    emit(key);
    return conversation;
  },

  createChannel: async (
    targetCompanyId: string,
    name: string,
    description: string,
    createdBy: string,
  ): Promise<Conversation> => {
    const key = conversationsKey(targetCompanyId);
    const all = read<Conversation[]>(key, []);
    const conversation: Conversation = {
      id: createId('channel'),
      type: 'channel',
      name,
      description,
      createdBy,
      createdAt: new Date().toISOString(),
    };
    write(key, [conversation, ...all]);
    emit(key);
    return conversation;
  },

  // ── Chat: messages ───────────────────────────────────────────────────
  subscribeToMessages: (
    targetCompanyId: string,
    conversationId: string,
    callback: (messages: Message[]) => void,
  ): (() => void) => {
    const key = messagesKey(targetCompanyId, conversationId);
    const run = () => {
      const all = read<Message[]>(key, []);
      callback(
        [...all].sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()),
      );
    };
    run();
    return subscribeKey(key, run);
  },

  sendMessage: async (
    targetCompanyId: string,
    conversationId: string,
    message: Omit<Message, 'id' | 'createdAt'>,
  ): Promise<void> => {
    const createdAt = new Date().toISOString();
    const fullMessage: Message = { ...message, id: createId('msg'), conversationId, createdAt };

    const msgKey = messagesKey(targetCompanyId, conversationId);
    write(msgKey, [...read<Message[]>(msgKey, []), fullMessage]);

    const convKey = conversationsKey(targetCompanyId);
    const conversations = read<Conversation[]>(convKey, []).map((conversation) =>
      conversation.id === conversationId
        ? { ...conversation, lastMessageAt: createdAt, lastMessagePreview: messagePreview(message.text) }
        : conversation,
    );
    write(convKey, conversations);

    emit(msgKey);
    emit(convKey);
  },

  // ── CRM: clients ─────────────────────────────────────────────────────
  listClients: async (targetCompanyId: string): Promise<Client[]> =>
    read<Client[]>(clientsKey(targetCompanyId), []),
  subscribeToClients: (targetCompanyId: string, callback: (clients: Client[]) => void): (() => void) => {
    const key = clientsKey(targetCompanyId);
    const run = () => callback(read<Client[]>(key, []));
    run();
    return subscribeKey(key, run);
  },
  getClient: async (targetCompanyId: string, clientId: string): Promise<Client | null> => {
    const all = read<Client[]>(clientsKey(targetCompanyId), []);
    return all.find((client) => client.id === clientId) ?? null;
  },
  createClient: async (
    targetCompanyId: string,
    data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Client> => {
    const now = new Date().toISOString();
    const client: Client = { ...data, id: createId('client'), createdAt: now, updatedAt: now };
    const key = clientsKey(targetCompanyId);
    write(key, [client, ...read<Client[]>(key, [])]);
    emit(key);
    return client;
  },
  updateClient: async (targetCompanyId: string, clientId: string, patch: Partial<Client>): Promise<void> => {
    const key = clientsKey(targetCompanyId);
    const updatedAt = new Date().toISOString();
    write(
      key,
      read<Client[]>(key, []).map((client) => (client.id === clientId ? { ...client, ...patch, updatedAt } : client)),
    );
    emit(key);
  },
  deleteClient: async (targetCompanyId: string, clientId: string): Promise<void> => {
    const key = clientsKey(targetCompanyId);
    write(key, read<Client[]>(key, []).filter((client) => client.id !== clientId));
    // Cascade: drop the client's subcollection caches.
    localStorage.removeItem(contactsKey(targetCompanyId, clientId));
    localStorage.removeItem(dealsKey(targetCompanyId, clientId));
    localStorage.removeItem(activitiesKey(targetCompanyId, clientId));
    const allKey = dealsAllKey(targetCompanyId);
    write(allKey, read<Deal[]>(allKey, []).filter((deal) => deal.clientId !== clientId));
    emit(key);
    emit(contactsKey(targetCompanyId, clientId));
    emit(dealsKey(targetCompanyId, clientId));
    emit(activitiesKey(targetCompanyId, clientId));
    emit(allKey);
  },

  // ── CRM: contacts ────────────────────────────────────────────────────
  listContactsForClient: async (targetCompanyId: string, clientId: string): Promise<Contact[]> =>
    read<Contact[]>(contactsKey(targetCompanyId, clientId), []),
  subscribeToContactsForClient: (
    targetCompanyId: string,
    clientId: string,
    callback: (contacts: Contact[]) => void,
  ): (() => void) => {
    const key = contactsKey(targetCompanyId, clientId);
    const run = () => callback(read<Contact[]>(key, []));
    run();
    return subscribeKey(key, run);
  },
  createContact: async (
    targetCompanyId: string,
    clientId: string,
    data: Omit<Contact, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Contact> => {
    const now = new Date().toISOString();
    const contact: Contact = { ...data, id: createId('contact'), clientId, createdAt: now, updatedAt: now };
    const key = contactsKey(targetCompanyId, clientId);
    write(key, [contact, ...read<Contact[]>(key, [])]);
    emit(key);
    return contact;
  },
  updateContact: async (
    targetCompanyId: string,
    clientId: string,
    contactId: string,
    patch: Partial<Contact>,
  ): Promise<void> => {
    const key = contactsKey(targetCompanyId, clientId);
    const updatedAt = new Date().toISOString();
    write(
      key,
      read<Contact[]>(key, []).map((contact) =>
        contact.id === contactId ? { ...contact, ...patch, updatedAt } : contact,
      ),
    );
    emit(key);
  },
  deleteContact: async (targetCompanyId: string, clientId: string, contactId: string): Promise<void> => {
    const key = contactsKey(targetCompanyId, clientId);
    write(key, read<Contact[]>(key, []).filter((contact) => contact.id !== contactId));
    emit(key);
  },
  // Mirror of the Firestore batch: exactly one primary contact per client.
  setPrimaryContact: async (targetCompanyId: string, clientId: string, contactId: string): Promise<void> => {
    const key = contactsKey(targetCompanyId, clientId);
    const now = new Date().toISOString();
    write(
      key,
      read<Contact[]>(key, []).map((contact) => {
        const shouldBePrimary = contact.id === contactId;
        return Boolean(contact.isPrimary) === shouldBePrimary
          ? contact
          : { ...contact, isPrimary: shouldBePrimary, updatedAt: now };
      }),
    );
    emit(key);
  },

  // ── CRM: deals ───────────────────────────────────────────────────────
  listDealsForClient: async (targetCompanyId: string, clientId: string): Promise<Deal[]> =>
    read<Deal[]>(dealsKey(targetCompanyId, clientId), []),
  listAllDeals: async (targetCompanyId: string): Promise<Deal[]> => read<Deal[]>(dealsAllKey(targetCompanyId), []),
  subscribeToAllDeals: (targetCompanyId: string, callback: (deals: Deal[]) => void): (() => void) => {
    const key = dealsAllKey(targetCompanyId);
    const run = () => callback(read<Deal[]>(key, []));
    run();
    return subscribeKey(key, run);
  },
  createDeal: async (
    targetCompanyId: string,
    clientId: string,
    data: Omit<Deal, 'id' | 'clientId' | 'companyId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Deal> => {
    const now = new Date().toISOString();
    const deal: Deal = {
      ...data,
      id: createId('deal'),
      clientId,
      companyId: targetCompanyId,
      createdAt: now,
      updatedAt: now,
    };
    const key = dealsKey(targetCompanyId, clientId);
    const clientDeals = [deal, ...read<Deal[]>(key, [])];
    write(key, clientDeals);
    syncDealsAll(targetCompanyId, clientId, clientDeals);
    emit(key);
    emit(dealsAllKey(targetCompanyId));
    return deal;
  },
  updateDeal: async (
    targetCompanyId: string,
    clientId: string,
    dealId: string,
    patch: Partial<Deal>,
  ): Promise<void> => {
    const key = dealsKey(targetCompanyId, clientId);
    const updatedAt = new Date().toISOString();
    const clientDeals = read<Deal[]>(key, []).map((deal) =>
      deal.id === dealId ? { ...deal, ...patch, updatedAt } : deal,
    );
    write(key, clientDeals);
    syncDealsAll(targetCompanyId, clientId, clientDeals);
    emit(key);
    emit(dealsAllKey(targetCompanyId));
  },
  deleteDeal: async (targetCompanyId: string, clientId: string, dealId: string): Promise<void> => {
    const key = dealsKey(targetCompanyId, clientId);
    const clientDeals = read<Deal[]>(key, []).filter((deal) => deal.id !== dealId);
    write(key, clientDeals);
    syncDealsAll(targetCompanyId, clientId, clientDeals);
    emit(key);
    emit(dealsAllKey(targetCompanyId));
  },

  // ── CRM: activities ──────────────────────────────────────────────────
  listActivitiesForClient: async (targetCompanyId: string, clientId: string): Promise<Activity[]> =>
    read<Activity[]>(activitiesKey(targetCompanyId, clientId), []),
  subscribeToActivitiesForClient: (
    targetCompanyId: string,
    clientId: string,
    callback: (activities: Activity[]) => void,
  ): (() => void) => {
    const key = activitiesKey(targetCompanyId, clientId);
    const run = () => callback(read<Activity[]>(key, []));
    run();
    return subscribeKey(key, run);
  },
  // Plain create for activities with no contact link (Phase D revised: the contact
  // lastContactedAt update lives in createActivityWithContactUpdate instead).
  createActivity: async (
    targetCompanyId: string,
    clientId: string,
    data: Omit<Activity, 'id' | 'clientId' | 'createdAt'>,
  ): Promise<Activity> => {
    const now = new Date().toISOString();
    const activity: Activity = { ...data, id: createId('activity'), clientId, createdAt: now };
    const key = activitiesKey(targetCompanyId, clientId);
    write(key, [activity, ...read<Activity[]>(key, [])]);
    emit(key);
    return activity;
  },
  // Mirror of the Firestore batch. Storage has no real atomicity, but its single-tab
  // nature makes two sequential writes safe; lastContactedAt = completedAt (or createdAt).
  createActivityWithContactUpdate: async (
    targetCompanyId: string,
    clientId: string,
    data: Omit<Activity, 'id' | 'clientId' | 'createdAt'>,
    contactIdToUpdate: string,
  ): Promise<Activity> => {
    const now = new Date().toISOString();
    const activity: Activity = { ...data, id: createId('activity'), clientId, createdAt: now };
    const key = activitiesKey(targetCompanyId, clientId);
    write(key, [activity, ...read<Activity[]>(key, [])]);

    const contactsK = contactsKey(targetCompanyId, clientId);
    const stampedAt = activity.completedAt ?? now;
    write(
      contactsK,
      read<Contact[]>(contactsK, []).map((contact) =>
        contact.id === contactIdToUpdate ? { ...contact, lastContactedAt: stampedAt, updatedAt: now } : contact,
      ),
    );

    emit(key);
    emit(contactsK);
    return activity;
  },
  updateActivity: async (
    targetCompanyId: string,
    clientId: string,
    activityId: string,
    patch: Partial<Activity>,
  ): Promise<void> => {
    const key = activitiesKey(targetCompanyId, clientId);
    write(
      key,
      read<Activity[]>(key, []).map((activity) =>
        activity.id === activityId ? { ...activity, ...patch } : activity,
      ),
    );
    emit(key);
  },
  deleteActivity: async (targetCompanyId: string, clientId: string, activityId: string): Promise<void> => {
    const key = activitiesKey(targetCompanyId, clientId);
    write(key, read<Activity[]>(key, []).filter((activity) => activity.id !== activityId));
    emit(key);
  },

  // ── CRM: pricing plans ───────────────────────────────────────────────
  listPricingPlans: async (targetCompanyId: string): Promise<PricingPlan[]> =>
    read<PricingPlan[]>(pricingPlansKey(targetCompanyId), []),
  subscribeToPricingPlans: (targetCompanyId: string, callback: (plans: PricingPlan[]) => void): (() => void) => {
    const key = pricingPlansKey(targetCompanyId);
    const run = () => callback(read<PricingPlan[]>(key, []));
    run();
    return subscribeKey(key, run);
  },
  createPricingPlan: async (targetCompanyId: string, data: Omit<PricingPlan, 'id'>): Promise<PricingPlan> => {
    const plan: PricingPlan = { ...data, id: createId('plan') };
    const key = pricingPlansKey(targetCompanyId);
    write(key, [...read<PricingPlan[]>(key, []), plan]);
    emit(key);
    return plan;
  },
  updatePricingPlan: async (targetCompanyId: string, planId: string, patch: Partial<PricingPlan>): Promise<void> => {
    const key = pricingPlansKey(targetCompanyId);
    write(
      key,
      read<PricingPlan[]>(key, []).map((plan) => (plan.id === planId ? { ...plan, ...patch } : plan)),
    );
    emit(key);
  },
  deletePricingPlan: async (targetCompanyId: string, planId: string): Promise<void> => {
    const key = pricingPlansKey(targetCompanyId);
    write(key, read<PricingPlan[]>(key, []).filter((plan) => plan.id !== planId));
    emit(key);
  },

  // ── CRM: subscriptions ───────────────────────────────────────────────
  listSubscriptionsForClient: async (targetCompanyId: string, clientId: string): Promise<Subscription[]> =>
    read<Subscription[]>(subscriptionsKey(targetCompanyId, clientId), []),
  subscribeToSubscriptionsForClient: (
    targetCompanyId: string,
    clientId: string,
    callback: (subscriptions: Subscription[]) => void,
  ): (() => void) => {
    const key = subscriptionsKey(targetCompanyId, clientId);
    const run = () => callback(read<Subscription[]>(key, []));
    run();
    return subscribeKey(key, run);
  },
  listAllSubscriptions: async (targetCompanyId: string): Promise<Subscription[]> =>
    read<Subscription[]>(subscriptionsAllKey(targetCompanyId), []),
  subscribeToAllSubscriptions: (
    targetCompanyId: string,
    callback: (subscriptions: Subscription[]) => void,
  ): (() => void) => {
    const key = subscriptionsAllKey(targetCompanyId);
    const run = () => callback(read<Subscription[]>(key, []));
    run();
    return subscribeKey(key, run);
  },
  getSubscription: async (
    targetCompanyId: string,
    clientId: string,
    subId: string,
  ): Promise<Subscription | null> => {
    const all = read<Subscription[]>(subscriptionsKey(targetCompanyId, clientId), []);
    return all.find((sub) => sub.id === subId) ?? null;
  },
  // Public create — delegates to the engagement-paired batch so every subscription
  // gets an engagement (matches firestoreService).
  createSubscription: async (
    targetCompanyId: string,
    clientId: string,
    data: Omit<
      Subscription,
      'id' | 'companyId' | 'clientId' | 'planNameSnapshot' | 'accountManagerNameSnapshot' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<Subscription> => storage.createSubscriptionWithEngagement(targetCompanyId, clientId, data),
  // Storage has no real batching, so we write the subscription, then the engagement
  // and checklist sequentially, ROLLING BACK the subscription if a later write throws.
  createSubscriptionWithEngagement: async (
    targetCompanyId: string,
    clientId: string,
    data: Omit<
      Subscription,
      'id' | 'companyId' | 'clientId' | 'planNameSnapshot' | 'accountManagerNameSnapshot' | 'createdAt' | 'updatedAt'
    >,
    engagementDefaults?: Partial<Engagement>,
  ): Promise<Subscription> => {
    const now = new Date().toISOString();
    const subscription: Subscription = {
      ...data,
      id: createId('sub'),
      companyId: targetCompanyId,
      clientId,
      planNameSnapshot: resolvePlanNameLocal(targetCompanyId, data.planId),
      accountManagerNameSnapshot: resolveEmployeeNameLocal(data.accountManagerId),
      createdAt: now,
      updatedAt: now,
    };
    const subKey = subscriptionsKey(targetCompanyId, clientId);
    const previousSubs = read<Subscription[]>(subKey, []);
    const clientSubs = [subscription, ...previousSubs];
    write(subKey, clientSubs);

    try {
      const engagement: Engagement = {
        id: createId('eng'),
        companyId: targetCompanyId,
        clientId,
        subscriptionId: subscription.id,
        primaryAgentIds: [],
        backupAgentIds: [],
        shiftPattern: '24x7',
        helpdeskAccountAccess: [],
        status: 'Onboarding',
        createdAt: now,
        updatedAt: now,
        ...engagementDefaults,
      };
      const engKey = engagementsKey(targetCompanyId, clientId);
      write(engKey, [engagement, ...read<Engagement[]>(engKey, [])]);

      const checklist: OnboardingChecklist = {
        id: 'main',
        companyId: targetCompanyId,
        clientId,
        subscriptionId: subscription.id,
        items: buildDefaultChecklistItemsLocal(),
        templateVersion: DEFAULT_ONBOARDING_TEMPLATE_VERSION,
        createdAt: now,
        updatedAt: now,
      };
      const clKey = checklistKey(targetCompanyId, clientId, subscription.id);
      write(clKey, checklist);

      emit(engKey);
      emit(clKey);
    } catch (caught) {
      // Roll back the subscription so we never leave a sub without its paired docs.
      write(subKey, previousSubs);
      throw caught;
    }

    syncSubscriptionsAll(targetCompanyId, clientId, clientSubs);
    emit(subKey);
    emit(subscriptionsAllKey(targetCompanyId));
    return subscription;
  },
  updateSubscription: async (
    targetCompanyId: string,
    clientId: string,
    subId: string,
    patch: Partial<Subscription>,
  ): Promise<void> => {
    const key = subscriptionsKey(targetCompanyId, clientId);
    const updatedAt = new Date().toISOString();
    const next: Partial<Subscription> = { ...patch, updatedAt };
    if ('planId' in patch) next.planNameSnapshot = resolvePlanNameLocal(targetCompanyId, patch.planId);
    if ('accountManagerId' in patch) next.accountManagerNameSnapshot = resolveEmployeeNameLocal(patch.accountManagerId);
    const clientSubs = read<Subscription[]>(key, []).map((sub) => (sub.id === subId ? { ...sub, ...next } : sub));
    write(key, clientSubs);
    syncSubscriptionsAll(targetCompanyId, clientId, clientSubs);
    emit(key);
    emit(subscriptionsAllKey(targetCompanyId));
  },
  // Cascade-delete the subscription, its paired engagement(s), and its checklist.
  deleteSubscription: async (targetCompanyId: string, clientId: string, subId: string): Promise<void> => {
    const key = subscriptionsKey(targetCompanyId, clientId);
    const clientSubs = read<Subscription[]>(key, []).filter((sub) => sub.id !== subId);
    write(key, clientSubs);
    syncSubscriptionsAll(targetCompanyId, clientId, clientSubs);

    const engKey = engagementsKey(targetCompanyId, clientId);
    write(engKey, read<Engagement[]>(engKey, []).filter((eng) => eng.subscriptionId !== subId));

    const clKey = checklistKey(targetCompanyId, clientId, subId);
    localStorage.removeItem(clKey);

    emit(key);
    emit(subscriptionsAllKey(targetCompanyId));
    emit(engKey);
    emit(clKey);
  },

  // ── CRM: engagements ─────────────────────────────────────────────────
  getEngagementForSubscription: async (
    targetCompanyId: string,
    clientId: string,
    subId: string,
  ): Promise<Engagement | null> => {
    const all = read<Engagement[]>(engagementsKey(targetCompanyId, clientId), []);
    return all.find((eng) => eng.subscriptionId === subId) ?? null;
  },
  subscribeToEngagement: (
    targetCompanyId: string,
    clientId: string,
    engId: string,
    callback: (engagement: Engagement | null) => void,
  ): (() => void) => {
    const key = engagementsKey(targetCompanyId, clientId);
    const run = () => callback(read<Engagement[]>(key, []).find((eng) => eng.id === engId) ?? null);
    run();
    return subscribeKey(key, run);
  },
  createEngagement: async (
    targetCompanyId: string,
    clientId: string,
    data: Omit<Engagement, 'id' | 'companyId' | 'clientId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Engagement> => {
    const now = new Date().toISOString();
    const engagement: Engagement = {
      ...data,
      id: createId('eng'),
      companyId: targetCompanyId,
      clientId,
      createdAt: now,
      updatedAt: now,
    };
    const key = engagementsKey(targetCompanyId, clientId);
    write(key, [engagement, ...read<Engagement[]>(key, [])]);
    emit(key);
    return engagement;
  },
  updateEngagement: async (
    targetCompanyId: string,
    clientId: string,
    engId: string,
    patch: Partial<Engagement>,
  ): Promise<void> => {
    const key = engagementsKey(targetCompanyId, clientId);
    const next: Partial<Engagement> = { ...patch, updatedAt: new Date().toISOString() };
    if (patch.primaryAgentIds) next.primaryAgentNamesSnapshot = resolveEmployeeNamesLocal(patch.primaryAgentIds);
    if (patch.backupAgentIds) next.backupAgentNamesSnapshot = resolveEmployeeNamesLocal(patch.backupAgentIds);
    if ('escalationContactId' in patch)
      next.escalationContactNameSnapshot = resolveContactNameLocal(targetCompanyId, clientId, patch.escalationContactId);
    write(
      key,
      read<Engagement[]>(key, []).map((eng) => (eng.id === engId ? { ...eng, ...next } : eng)),
    );
    emit(key);
  },
  deleteEngagement: async (targetCompanyId: string, clientId: string, engId: string): Promise<void> => {
    const key = engagementsKey(targetCompanyId, clientId);
    write(key, read<Engagement[]>(key, []).filter((eng) => eng.id !== engId));
    emit(key);
  },

  // ── CRM: onboarding checklist ────────────────────────────────────────
  getChecklist: async (
    targetCompanyId: string,
    clientId: string,
    subId: string,
  ): Promise<OnboardingChecklist | null> => {
    const item = localStorage.getItem(checklistKey(targetCompanyId, clientId, subId));
    return item ? (JSON.parse(item) as OnboardingChecklist) : null;
  },
  subscribeToChecklist: (
    targetCompanyId: string,
    clientId: string,
    subId: string,
    callback: (checklist: OnboardingChecklist | null) => void,
  ): (() => void) => {
    const key = checklistKey(targetCompanyId, clientId, subId);
    const run = () => {
      const item = localStorage.getItem(key);
      callback(item ? (JSON.parse(item) as OnboardingChecklist) : null);
    };
    run();
    return subscribeKey(key, run);
  },
  updateChecklistItem: async (
    targetCompanyId: string,
    clientId: string,
    subId: string,
    itemId: string,
    patch: Partial<ChecklistItem>,
    actor?: { id: string; name: string },
  ): Promise<void> => {
    const key = checklistKey(targetCompanyId, clientId, subId);
    const item = localStorage.getItem(key);
    if (!item) return;
    const checklist = JSON.parse(item) as OnboardingChecklist;
    const now = new Date().toISOString();
    const items = checklist.items.map((entry) => {
      if (entry.id !== itemId) return entry;
      const next: ChecklistItem = { ...entry, ...patch };
      if (patch.status === 'Done' && entry.status !== 'Done') {
        next.completedAt = now;
        next.completedBy = actor?.id;
        next.completedByNameSnapshot = actor?.name;
      } else if ('status' in patch && patch.status !== 'Done') {
        next.completedAt = undefined;
        next.completedBy = undefined;
        next.completedByNameSnapshot = undefined;
      }
      return next;
    });
    write(key, { ...checklist, items, updatedAt: now });
    emit(key);
  },
  addChecklistItem: async (
    targetCompanyId: string,
    clientId: string,
    subId: string,
    label: string,
  ): Promise<void> => {
    const key = checklistKey(targetCompanyId, clientId, subId);
    const item = localStorage.getItem(key);
    if (!item) return;
    const checklist = JSON.parse(item) as OnboardingChecklist;
    const nextSort = checklist.items.reduce((max, entry) => Math.max(max, entry.sortOrder), 0) + 1;
    const newItem: ChecklistItem = { id: createId('checklistitem'), label, status: 'Pending', sortOrder: nextSort };
    write(key, { ...checklist, items: [...checklist.items, newItem], updatedAt: new Date().toISOString() });
    emit(key);
  },
  removeChecklistItem: async (
    targetCompanyId: string,
    clientId: string,
    subId: string,
    itemId: string,
  ): Promise<void> => {
    const key = checklistKey(targetCompanyId, clientId, subId);
    const item = localStorage.getItem(key);
    if (!item) return;
    const checklist = JSON.parse(item) as OnboardingChecklist;
    write(key, {
      ...checklist,
      items: checklist.items.filter((entry) => entry.id !== itemId),
      updatedAt: new Date().toISOString(),
    });
    emit(key);
  },
  reorderChecklistItems: async (
    targetCompanyId: string,
    clientId: string,
    subId: string,
    orderedItemIds: string[],
  ): Promise<void> => {
    const key = checklistKey(targetCompanyId, clientId, subId);
    const item = localStorage.getItem(key);
    if (!item) return;
    const checklist = JSON.parse(item) as OnboardingChecklist;
    const orderIndex = new Map(orderedItemIds.map((id, index) => [id, index + 1]));
    const items = checklist.items.map((entry) => ({ ...entry, sortOrder: orderIndex.get(entry.id) ?? entry.sortOrder }));
    write(key, { ...checklist, items, updatedAt: new Date().toISOString() });
    emit(key);
  },
};
