import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db, companyId, isFirebaseConfigured } from './firebase';
import type {
  Activity,
  Announcement,
  AttendanceIndexRecord,
  Candidate,
  ChecklistItem,
  Client,
  CompanySettings,
  Contact,
  Conversation,
  DailyReport,
  Deal,
  DeveloperProfile,
  Employee,
  Engagement,
  FeedbackInput,
  FeedbackItem,
  FeedbackStatus,
  Interview,
  JobOpening,
  LeaveRequest,
  LeaveStatus,
  Message,
  OnboardingChecklist,
  PricingPlan,
  Role,
  Subscription,
  UserProfile,
} from '../types';
import { DEFAULT_CHECKLIST_ITEMS, DEFAULT_ONBOARDING_TEMPLATE_VERSION } from '../config/onboardingTemplate';
import { normalizeLeaveRequest } from '../utils/leaveWorkflow';

export interface DashboardPendingActions {
  pendingLeave: number;
  unreviewedReports: number;
  interviewsToday: number;
}

const requireDb = () => {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured.');
  }

  return db;
};

const clean = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;

const companyDoc = () => doc(requireDb(), 'companies', companyId);
const companyCollection = (name: string) => collection(companyDoc(), name);
const companyDocument = (name: string, id: string) => doc(companyCollection(name), id);
const developerDocument = (uid: string) => doc(requireDb(), 'developers', uid);

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

// Chat path helpers — take an explicit companyId so conversations stay tenant-scoped.
const conversationsCollection = (targetCompanyId: string) =>
  collection(doc(requireDb(), 'companies', targetCompanyId), 'conversations');
const conversationDocument = (targetCompanyId: string, conversationId: string) =>
  doc(conversationsCollection(targetCompanyId), conversationId);
const messagesCollection = (targetCompanyId: string, conversationId: string) =>
  collection(conversationDocument(targetCompanyId, conversationId), 'messages');

// Deterministic DM id: dm_{uidA}_{uidB} with uidA < uidB, so one doc exists per user pair.
const dmConversationId = (uidA: string, uidB: string) => {
  const [first, second] = [uidA, uidB].sort();
  return `dm_${first}_${second}`;
};

const messagePreview = (text: string) => text.slice(0, 80);

// ── CRM path helpers ──────────────────────────────────────────────────
const clientsCollection = () => companyCollection('clients');
const clientDocument = (clientId: string) => companyDocument('clients', clientId);
const contactsCollection = (clientId: string) => collection(clientDocument(clientId), 'contacts');
const contactDocument = (clientId: string, contactId: string) => doc(contactsCollection(clientId), contactId);
const dealsCollection = (clientId: string) => collection(clientDocument(clientId), 'deals');
const dealDocument = (clientId: string, dealId: string) => doc(dealsCollection(clientId), dealId);
const activitiesCollection = (clientId: string) => collection(clientDocument(clientId), 'activities');
const activityDocument = (clientId: string, activityId: string) => doc(activitiesCollection(clientId), activityId);
const pricingPlansCollection = () => companyCollection('pricingPlans');
const pricingPlanDocument = (planId: string) => companyDocument('pricingPlans', planId);
const subscriptionsCollection = (clientId: string) => collection(clientDocument(clientId), 'subscriptions');
const subscriptionDocument = (clientId: string, subId: string) => doc(subscriptionsCollection(clientId), subId);
const engagementsCollection = (clientId: string) => collection(clientDocument(clientId), 'engagements');
const engagementDocument = (clientId: string, engId: string) => doc(engagementsCollection(clientId), engId);
// One checklist per subscription, fixed doc id 'main'.
const checklistDocument = (clientId: string, subId: string) =>
  doc(collection(subscriptionDocument(clientId, subId), 'checklist'), 'main');

// Build the seeded checklist items from the default template.
const buildDefaultChecklistItems = (): ChecklistItem[] =>
  DEFAULT_CHECKLIST_ITEMS.map((item) => ({
    id: createId('checklistitem'),
    label: item.label,
    status: 'Pending' as const,
    sortOrder: item.sortOrder,
  }));

const docToEntity = <T extends { id: string }>(snapshot: QueryDocumentSnapshot<DocumentData>): T =>
  ({ id: snapshot.id, ...snapshot.data() }) as T;

// Denormalization resolvers: read a single doc to snapshot a display name at write time.
const resolvePlanName = async (planId?: string): Promise<string | undefined> => {
  if (!planId) return undefined;
  const snapshot = await getDoc(pricingPlanDocument(planId));
  return snapshot.exists() ? (snapshot.data().name as string) : undefined;
};
const resolveEmployeeName = async (employeeId?: string): Promise<string | undefined> => {
  if (!employeeId) return undefined;
  const snapshot = await getDoc(companyDocument('employees', employeeId));
  return snapshot.exists() ? (snapshot.data().name as string) : undefined;
};
// Snapshot an array of employee display names (for engagement agent arrays).
const resolveEmployeeNames = async (employeeIds: string[]): Promise<string[]> =>
  (await Promise.all(employeeIds.map((id) => resolveEmployeeName(id)))).filter((name): name is string => Boolean(name));
const resolveContactName = async (clientId: string, contactId?: string): Promise<string | undefined> => {
  if (!contactId) return undefined;
  const snapshot = await getDoc(contactDocument(clientId, contactId));
  if (!snapshot.exists()) return undefined;
  const data = snapshot.data();
  return `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || undefined;
};

const sortConversations = (conversations: Conversation[]) =>
  [...conversations].sort(
    (first, second) =>
      new Date(second.lastMessageAt || second.createdAt).getTime() -
      new Date(first.lastMessageAt || first.createdAt).getTime(),
  );

const conversationFromDoc = (snapshot: QueryDocumentSnapshot<DocumentData>): Conversation =>
  ({ id: snapshot.id, ...(snapshot.data() as Omit<Conversation, 'id'>) });

const messageFromDoc = (snapshot: QueryDocumentSnapshot<DocumentData>): Message =>
  ({ id: snapshot.id, ...(snapshot.data() as Omit<Message, 'id'>) });

const readCollection = async <T extends { id: string }>(name: string): Promise<T[]> => {
  const snapshot = await getDocs(companyCollection(name));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
};

const uniqueLeaveRequests = (requests: LeaveRequest[]) =>
  Array.from(new Map(requests.map((request) => [request.id, request])).values());

const feedbackFromSnapshot = (snapshot: QueryDocumentSnapshot<DocumentData>): FeedbackItem => ({
  id: snapshot.id,
  path: snapshot.ref.path,
  ...(snapshot.data() as Omit<FeedbackItem, 'id' | 'path'>),
});

export const firestoreService = {
  getCurrentDeveloperProfile: async (uid: string): Promise<DeveloperProfile | null> => {
    const path = `developers/${uid}`;
    debugDeveloperAuth('Reading developer profile', { path, uid });

    let snapshot;
    try {
      snapshot = await getDoc(developerDocument(uid));
    } catch (error) {
      debugDeveloperAuth('Developer profile read failed', getFirebaseDebugError(error));
      throw error;
    }

    debugDeveloperAuth('Developer profile read result', { path, exists: snapshot.exists() });
    if (!snapshot.exists()) return null;

    const data = snapshot.data() as Record<string, unknown>;
    debugDeveloperAuth('Developer profile role check', {
      hasDeveloperRole: data.role === 'Developer',
      hasActiveStatus: data.status === 'Active',
    });
    if (data.role !== 'Developer' || data.status !== 'Active') return null;

    return {
      name: typeof data.name === 'string' ? data.name : 'MotoFlexing Developer',
      email: typeof data.email === 'string' ? data.email : '',
      role: 'Developer',
      status: 'Active',
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
      lastLoginAt: typeof data.lastLoginAt === 'string' ? data.lastLoginAt : undefined,
    };
  },
  updateDeveloperLastLogin: async (uid: string) => {
    const lastLoginAt = new Date().toISOString();
    await updateDoc(developerDocument(uid), { lastLoginAt });
    return lastLoginAt;
  },

  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    const snapshot = await getDoc(companyDocument('users', uid));
    if (!snapshot.exists()) return null;

    const data = snapshot.data() as Record<string, unknown>;
    const role = data.role === 'Admin' || data.role === 'HR' || data.role === 'Employee' ? data.role : 'Employee';
    const workMode =
      data.workMode === 'Office' || data.workMode === 'Remote' || data.workMode === 'Hybrid'
        ? data.workMode
        : 'Hybrid';
    const attendanceStatus =
      data.status === 'At Work' || data.status === 'Away' || data.status === 'Checked Out' ? data.status : 'Away';
    const employmentStatus =
      data.status === 'Active' || data.status === 'Inactive' || data.status === 'On Leave'
        ? data.status
        : data.employmentStatus === 'Active' ||
            data.employmentStatus === 'Inactive' ||
            data.employmentStatus === 'On Leave'
          ? data.employmentStatus
          : undefined;

    return {
      name: typeof data.name === 'string' ? data.name : 'OfficeOS User',
      email: typeof data.email === 'string' ? data.email : '',
      role,
      department: typeof data.department === 'string' ? data.department : 'General',
      designation: typeof data.designation === 'string' ? data.designation : undefined,
      employmentStatus,
      workMode,
      status: attendanceStatus,
    };
  },

  getEmployees: () => readCollection<Employee>('employees'),
  createEmployeeAccountProfiles: async (uid: string, userProfile: UserProfile, employee: Employee) => {
    await setDoc(companyDocument('users', uid), clean({ ...userProfile }));
    await setDoc(companyDocument('employees', uid), clean({ ...employee, id: uid }));
    return employee;
  },
  addEmployee: async (employee: Employee) => {
    await setDoc(companyDocument('employees', employee.id), clean({ ...employee }));
    return employee;
  },
  updateEmployee: async (employee: Employee) => {
    await setDoc(companyDocument('employees', employee.id), clean({ ...employee }), { merge: true });
    return employee;
  },
  deleteEmployee: (employeeId: string) => deleteDoc(companyDocument('employees', employeeId)),

  getAttendance: () => readCollection<AttendanceIndexRecord>('attendance'),
  getUserAttendance: async (email: string) => {
    const snapshot = await getDocs(query(companyCollection('attendance'), where('employeeEmail', '==', email)));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AttendanceIndexRecord);
  },
  upsertAttendance: async (record: AttendanceIndexRecord) => {
    await setDoc(companyDocument('attendance', record.id), clean({ ...record }), { merge: true });
    return record;
  },

  getLeaveRequests: () => readCollection<LeaveRequest>('leaveRequests'),
  getOwnLeaveRequests: async (profile: UserProfile) => {
    const byEmployeeEmail = await getDocs(
      query(companyCollection('leaveRequests'), where('employeeEmail', '==', profile.email)),
    );
    const emailMatchedRequests = byEmployeeEmail.docs.map((item) => ({ id: item.id, ...item.data() }) as LeaveRequest);

    if (profile.role === 'Employee') return uniqueLeaveRequests(emailMatchedRequests);

    const byRequesterEmail = await getDocs(
      query(companyCollection('leaveRequests'), where('requesterEmail', '==', profile.email)),
    );
    return uniqueLeaveRequests([
      ...emailMatchedRequests,
      ...byRequesterEmail.docs.map((item) => ({ id: item.id, ...item.data() }) as LeaveRequest),
    ]);
  },
  getReviewLeaveRequests: async (reviewerRole: Role) => {
    const requesterRole: Role | null =
      reviewerRole === 'Admin' ? 'HR' : reviewerRole === 'HR' ? 'Employee' : null;
    if (!requesterRole) return [];

    const byRequesterRole = await getDocs(
      query(companyCollection('leaveRequests'), where('requesterRole', '==', requesterRole)),
    );
    const modernRequests = byRequesterRole.docs.map((item) => ({ id: item.id, ...item.data() }) as LeaveRequest);

    const allRequests = await readCollection<LeaveRequest>('leaveRequests');
    const legacyRequests = allRequests.filter((request) => {
      if (request.requesterRole) return false;
      return normalizeLeaveRequest(request).requesterRole === requesterRole;
    });

    return uniqueLeaveRequests([...modernRequests, ...legacyRequests]);
  },
  addLeaveRequest: async (request: LeaveRequest) => {
    await setDoc(companyDocument('leaveRequests', request.id), clean({ ...request }));
    return request;
  },
  updateLeaveRequestStatus: async (id: string, status: LeaveStatus, reviewedBy: string) => {
    const reviewedAt = new Date().toISOString();
    await updateDoc(companyDocument('leaveRequests', id), { status, reviewedBy, reviewedAt });
    return { id, status, reviewedBy, reviewedAt };
  },

  submitFeedback: async (targetCompanyId: string, feedbackInput: FeedbackInput) => {
    const feedbackId = createId('feedback');
    const now = new Date().toISOString();
    const feedback: FeedbackItem = {
      id: feedbackId,
      ...feedbackInput,
      companyId: targetCompanyId,
      status: 'New',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(
      doc(collection(doc(requireDb(), 'companies', targetCompanyId), 'feedback'), feedbackId),
      clean({ ...feedback }),
    );
    return feedback;
  },
  getMyFeedback: async (targetCompanyId: string, uid: string) => {
    const snapshot = await getDocs(
      query(
        collection(doc(requireDb(), 'companies', targetCompanyId), 'feedback'),
        where('submittedByUid', '==', uid),
        orderBy('createdAt', 'desc'),
      ),
    );
    return snapshot.docs.map((item) => feedbackFromSnapshot(item));
  },
  getAllFeedbackForDeveloper: async () => {
    const snapshot = await getDocs(query(companyCollection('feedback'), orderBy('createdAt', 'desc')));
    return snapshot.docs.map((item) => feedbackFromSnapshot(item));
  },
  updateFeedbackStatus: async (feedbackPathOrId: string, status: FeedbackStatus) => {
    const updatedAt = new Date().toISOString();
    const feedbackRef = feedbackPathOrId.includes('/')
      ? doc(requireDb(), feedbackPathOrId)
      : companyDocument('feedback', feedbackPathOrId);
    await updateDoc(feedbackRef, { status, updatedAt });
    return { id: feedbackPathOrId, status, updatedAt };
  },

  getJobOpenings: () => readCollection<JobOpening>('jobOpenings'),
  addJobOpening: async (jobOpening: JobOpening) => {
    await setDoc(companyDocument('jobOpenings', jobOpening.id), clean({ ...jobOpening }));
    return jobOpening;
  },
  updateJobOpening: async (jobOpening: JobOpening) => {
    await setDoc(companyDocument('jobOpenings', jobOpening.id), clean({ ...jobOpening }), { merge: true });
    return jobOpening;
  },

  getCandidates: () => readCollection<Candidate>('candidates'),
  addCandidate: async (candidate: Candidate) => {
    await setDoc(companyDocument('candidates', candidate.id), clean({ ...candidate }));
    return candidate;
  },
  updateCandidate: async (candidate: Candidate) => {
    await setDoc(companyDocument('candidates', candidate.id), clean({ ...candidate }), { merge: true });
    return candidate;
  },

  getInterviews: () => readCollection<Interview>('interviews'),
  addInterview: async (interview: Interview) => {
    await setDoc(companyDocument('interviews', interview.id), clean({ ...interview }));
    return interview;
  },
  updateInterview: async (interview: Interview) => {
    await setDoc(companyDocument('interviews', interview.id), clean({ ...interview }), { merge: true });
    return interview;
  },

  getDashboardPendingActions: async (): Promise<DashboardPendingActions> => {
    const today = new Date().toISOString().slice(0, 10);
    const [leaveRequests, reports, interviews] = await Promise.all([
      readCollection<LeaveRequest>('leaveRequests'),
      readCollection<DailyReport>('reports'),
      readCollection<Interview>('interviews'),
    ]);

    return {
      pendingLeave: leaveRequests.filter((request) => request.status === 'Pending').length,
      unreviewedReports: reports.filter((report) => report.status === 'Submitted' && report.date === today).length,
      interviewsToday: interviews.filter((interview) => interview.interviewDate === today).length,
    };
  },

  // ── Chat: conversations ──────────────────────────────────────────────
  listConversations: async (targetCompanyId: string, currentUserUid: string): Promise<Conversation[]> => {
    const [channelsSnapshot, dmsSnapshot] = await Promise.all([
      getDocs(query(conversationsCollection(targetCompanyId), where('type', '==', 'channel'))),
      getDocs(query(conversationsCollection(targetCompanyId), where('participants', 'array-contains', currentUserUid))),
    ]);
    return sortConversations([
      ...channelsSnapshot.docs.map(conversationFromDoc),
      ...dmsSnapshot.docs.map(conversationFromDoc),
    ]);
  },

  subscribeToConversations: (
    targetCompanyId: string,
    currentUserUid: string,
    callback: (conversations: Conversation[]) => void,
  ): (() => void) => {
    // Firestore can't OR (channels) with (DMs containing me) in one query, so we run two
    // listeners and merge. Both halves start as [] so the merged callback never renders a
    // half-empty list when one listener fires before the other has data.
    let channels: Conversation[] = [];
    let dms: Conversation[] = [];

    const emit = () => callback(sortConversations([...channels, ...dms]));

    const unsubscribeChannels = onSnapshot(
      query(conversationsCollection(targetCompanyId), where('type', '==', 'channel')),
      (snapshot) => {
        channels = snapshot.docs.map(conversationFromDoc);
        emit();
      },
    );
    const unsubscribeDms = onSnapshot(
      query(conversationsCollection(targetCompanyId), where('participants', 'array-contains', currentUserUid)),
      (snapshot) => {
        dms = snapshot.docs.map(conversationFromDoc);
        emit();
      },
    );

    return () => {
      unsubscribeChannels();
      unsubscribeDms();
    };
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
    const id = dmConversationId(currentUserUid, otherUserUid);
    const ref = conversationDocument(targetCompanyId, id);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      return { id: existing.id, ...(existing.data() as Omit<Conversation, 'id'>) };
    }

    const conversation: Conversation = {
      id,
      type: 'dm',
      participants: [currentUserUid, otherUserUid].sort(),
      createdBy: currentUserUid,
      createdAt: new Date().toISOString(),
    };
    // Denormalized participant identities live on the doc for list display without extra reads.
    await setDoc(
      ref,
      clean({
        ...conversation,
        participantNames: { [currentUserUid]: currentUserName, [otherUserUid]: otherUserName },
        participantEmails: { [currentUserUid]: currentUserEmail, [otherUserUid]: otherUserEmail },
      }),
    );
    return conversation;
  },

  createChannel: async (
    targetCompanyId: string,
    name: string,
    description: string,
    createdBy: string,
  ): Promise<Conversation> => {
    const conversation: Conversation = {
      id: createId('channel'),
      type: 'channel',
      name,
      description,
      createdBy,
      createdAt: new Date().toISOString(),
    };
    await setDoc(conversationDocument(targetCompanyId, conversation.id), clean({ ...conversation }));
    return conversation;
  },

  // ── Chat: messages ───────────────────────────────────────────────────
  subscribeToMessages: (
    targetCompanyId: string,
    conversationId: string,
    callback: (messages: Message[]) => void,
  ): (() => void) =>
    onSnapshot(query(messagesCollection(targetCompanyId, conversationId), orderBy('createdAt', 'asc')), (snapshot) => {
      callback(snapshot.docs.map(messageFromDoc));
    }),

  sendMessage: async (
    targetCompanyId: string,
    conversationId: string,
    message: Omit<Message, 'id' | 'createdAt'>,
  ): Promise<void> => {
    const createdAt = new Date().toISOString();
    const id = createId('msg');
    const fullMessage: Message = { ...message, id, conversationId, createdAt };

    const batch = writeBatch(requireDb());
    batch.set(doc(messagesCollection(targetCompanyId, conversationId), id), clean({ ...fullMessage }));
    batch.set(
      conversationDocument(targetCompanyId, conversationId),
      { lastMessageAt: createdAt, lastMessagePreview: messagePreview(message.text) },
      { merge: true },
    );
    await batch.commit();
  },

  getReports: () => readCollection<DailyReport>('reports'),
  addReport: async (report: DailyReport) => {
    await setDoc(companyDocument('reports', report.id), clean({ ...report }));
    return report;
  },
  updateReport: async (report: DailyReport) => {
    await setDoc(companyDocument('reports', report.id), clean({ ...report }), { merge: true });
    return report;
  },

  getAnnouncements: () => readCollection<Announcement>('announcements'),
  addAnnouncement: async (announcement: Announcement) => {
    await setDoc(companyDocument('announcements', announcement.id), clean({ ...announcement }));
    return announcement;
  },

  getSettings: async (): Promise<CompanySettings | null> => {
    const snapshot = await getDoc(companyDocument('settings', 'main'));
    if (!snapshot.exists()) return null;
    return snapshot.data() as CompanySettings;
  },
  updateSettings: async (settings: CompanySettings) => {
    await setDoc(companyDocument('settings', 'main'), clean({ ...settings }), { merge: true });
    return settings;
  },

  // ── CRM: clients ─────────────────────────────────────────────────────
  listClients: async (_companyId: string): Promise<Client[]> => {
    const snapshot = await getDocs(clientsCollection());
    return snapshot.docs.map((item) => docToEntity<Client>(item));
  },
  subscribeToClients: (_companyId: string, callback: (clients: Client[]) => void): (() => void) =>
    onSnapshot(clientsCollection(), (snapshot) => {
      callback(snapshot.docs.map((item) => docToEntity<Client>(item)));
    }),
  getClient: async (_companyId: string, clientId: string): Promise<Client | null> => {
    const snapshot = await getDoc(clientDocument(clientId));
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...(snapshot.data() as Omit<Client, 'id'>) };
  },
  createClient: async (
    _companyId: string,
    data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Client> => {
    const now = new Date().toISOString();
    const client: Client = { ...data, id: createId('client'), createdAt: now, updatedAt: now };
    await setDoc(clientDocument(client.id), clean({ ...client }));
    return client;
  },
  updateClient: async (_companyId: string, clientId: string, patch: Partial<Client>): Promise<void> => {
    await updateDoc(clientDocument(clientId), clean({ ...patch, updatedAt: new Date().toISOString() }));
  },
  // Cascades: delete the client and all of its contacts, deals, and activities in one batch.
  deleteClient: async (_companyId: string, clientId: string): Promise<void> => {
    const [contacts, deals, activities] = await Promise.all([
      getDocs(contactsCollection(clientId)),
      getDocs(dealsCollection(clientId)),
      getDocs(activitiesCollection(clientId)),
    ]);
    const batch = writeBatch(requireDb());
    contacts.docs.forEach((item) => batch.delete(item.ref));
    deals.docs.forEach((item) => batch.delete(item.ref));
    activities.docs.forEach((item) => batch.delete(item.ref));
    batch.delete(clientDocument(clientId));
    await batch.commit();
  },

  // ── CRM: contacts ────────────────────────────────────────────────────
  listContactsForClient: async (_companyId: string, clientId: string): Promise<Contact[]> => {
    const snapshot = await getDocs(contactsCollection(clientId));
    return snapshot.docs.map((item) => docToEntity<Contact>(item));
  },
  subscribeToContactsForClient: (
    _companyId: string,
    clientId: string,
    callback: (contacts: Contact[]) => void,
  ): (() => void) =>
    onSnapshot(contactsCollection(clientId), (snapshot) => {
      callback(snapshot.docs.map((item) => docToEntity<Contact>(item)));
    }),
  createContact: async (
    _companyId: string,
    clientId: string,
    data: Omit<Contact, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Contact> => {
    const now = new Date().toISOString();
    const contact: Contact = { ...data, id: createId('contact'), clientId, createdAt: now, updatedAt: now };
    await setDoc(contactDocument(clientId, contact.id), clean({ ...contact }));
    return contact;
  },
  updateContact: async (
    _companyId: string,
    clientId: string,
    contactId: string,
    patch: Partial<Contact>,
  ): Promise<void> => {
    await updateDoc(contactDocument(clientId, contactId), clean({ ...patch, updatedAt: new Date().toISOString() }));
  },
  deleteContact: async (_companyId: string, clientId: string, contactId: string): Promise<void> => {
    await deleteDoc(contactDocument(clientId, contactId));
  },
  // Make exactly one contact primary: set the target to true and demote any other
  // currently-primary contact to false, atomically in a single batch (spec C.1).
  setPrimaryContact: async (_companyId: string, clientId: string, contactId: string): Promise<void> => {
    const snapshot = await getDocs(contactsCollection(clientId));
    const now = new Date().toISOString();
    const batch = writeBatch(requireDb());
    snapshot.docs.forEach((item) => {
      const shouldBePrimary = item.id === contactId;
      // Only write docs whose primary flag actually changes.
      if (Boolean(item.data().isPrimary) !== shouldBePrimary) {
        batch.update(item.ref, { isPrimary: shouldBePrimary, updatedAt: now });
      }
    });
    await batch.commit();
  },

  // ── CRM: deals ───────────────────────────────────────────────────────
  listDealsForClient: async (_companyId: string, clientId: string): Promise<Deal[]> => {
    const snapshot = await getDocs(dealsCollection(clientId));
    return snapshot.docs.map((item) => docToEntity<Deal>(item));
  },
  // Pipeline view: collectionGroup query scoped to this tenant by the denormalized
  // companyId field on each deal (CG queries don't auto-scope by parent path).
  listAllDeals: async (targetCompanyId: string): Promise<Deal[]> => {
    const snapshot = await getDocs(
      query(collectionGroup(requireDb(), 'deals'), where('companyId', '==', targetCompanyId)),
    );
    return snapshot.docs.map((item) => docToEntity<Deal>(item));
  },
  subscribeToAllDeals: (targetCompanyId: string, callback: (deals: Deal[]) => void): (() => void) =>
    onSnapshot(
      query(collectionGroup(requireDb(), 'deals'), where('companyId', '==', targetCompanyId)),
      (snapshot) => {
        callback(snapshot.docs.map((item) => docToEntity<Deal>(item)));
      },
    ),
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
    await setDoc(dealDocument(clientId, deal.id), clean({ ...deal }));
    return deal;
  },
  updateDeal: async (_companyId: string, clientId: string, dealId: string, patch: Partial<Deal>): Promise<void> => {
    await updateDoc(dealDocument(clientId, dealId), clean({ ...patch, updatedAt: new Date().toISOString() }));
  },
  deleteDeal: async (_companyId: string, clientId: string, dealId: string): Promise<void> => {
    await deleteDoc(dealDocument(clientId, dealId));
  },

  // ── CRM: activities ──────────────────────────────────────────────────
  listActivitiesForClient: async (_companyId: string, clientId: string): Promise<Activity[]> => {
    const snapshot = await getDocs(activitiesCollection(clientId));
    return snapshot.docs.map((item) => docToEntity<Activity>(item));
  },
  subscribeToActivitiesForClient: (
    _companyId: string,
    clientId: string,
    callback: (activities: Activity[]) => void,
  ): (() => void) =>
    onSnapshot(activitiesCollection(clientId), (snapshot) => {
      callback(snapshot.docs.map((item) => docToEntity<Activity>(item)));
    }),
  // Plain create for activities with no contact link (Phase D revised: the contact
  // lastContactedAt update lives in createActivityWithContactUpdate instead).
  createActivity: async (
    _companyId: string,
    clientId: string,
    data: Omit<Activity, 'id' | 'clientId' | 'createdAt'>,
  ): Promise<Activity> => {
    const now = new Date().toISOString();
    const activity: Activity = { ...data, id: createId('activity'), clientId, createdAt: now };
    await setDoc(activityDocument(clientId, activity.id), clean({ ...activity }));
    return activity;
  },
  // Atomic create + contact stamp: writes the activity and updates the linked contact's
  // lastContactedAt in a SINGLE writeBatch — both succeed together or neither does.
  // lastContactedAt is set to the activity's completedAt (falling back to createdAt).
  createActivityWithContactUpdate: async (
    _companyId: string,
    clientId: string,
    data: Omit<Activity, 'id' | 'clientId' | 'createdAt'>,
    contactIdToUpdate: string,
  ): Promise<Activity> => {
    const now = new Date().toISOString();
    const activity: Activity = { ...data, id: createId('activity'), clientId, createdAt: now };
    const batch = writeBatch(requireDb());
    batch.set(activityDocument(clientId, activity.id), clean({ ...activity }));
    batch.update(contactDocument(clientId, contactIdToUpdate), {
      lastContactedAt: activity.completedAt ?? now,
      updatedAt: now,
    });
    await batch.commit();
    return activity;
  },
  updateActivity: async (
    _companyId: string,
    clientId: string,
    activityId: string,
    patch: Partial<Activity>,
  ): Promise<void> => {
    await updateDoc(activityDocument(clientId, activityId), clean({ ...patch }));
  },
  deleteActivity: async (_companyId: string, clientId: string, activityId: string): Promise<void> => {
    await deleteDoc(activityDocument(clientId, activityId));
  },

  // ── CRM: pricing plans ───────────────────────────────────────────────
  listPricingPlans: async (_companyId: string): Promise<PricingPlan[]> => {
    const snapshot = await getDocs(pricingPlansCollection());
    return snapshot.docs.map((item) => docToEntity<PricingPlan>(item));
  },
  subscribeToPricingPlans: (_companyId: string, callback: (plans: PricingPlan[]) => void): (() => void) =>
    onSnapshot(pricingPlansCollection(), (snapshot) => {
      callback(snapshot.docs.map((item) => docToEntity<PricingPlan>(item)));
    }),
  createPricingPlan: async (_companyId: string, data: Omit<PricingPlan, 'id'>): Promise<PricingPlan> => {
    const plan: PricingPlan = { ...data, id: createId('plan') };
    await setDoc(pricingPlanDocument(plan.id), clean({ ...plan }));
    return plan;
  },
  updatePricingPlan: async (_companyId: string, planId: string, patch: Partial<PricingPlan>): Promise<void> => {
    await updateDoc(pricingPlanDocument(planId), clean({ ...patch }));
  },
  deletePricingPlan: async (_companyId: string, planId: string): Promise<void> => {
    await deleteDoc(pricingPlanDocument(planId));
  },

  // ── CRM: subscriptions ───────────────────────────────────────────────
  listSubscriptionsForClient: async (_companyId: string, clientId: string): Promise<Subscription[]> => {
    const snapshot = await getDocs(subscriptionsCollection(clientId));
    return snapshot.docs.map((item) => docToEntity<Subscription>(item));
  },
  subscribeToSubscriptionsForClient: (
    _companyId: string,
    clientId: string,
    callback: (subscriptions: Subscription[]) => void,
  ): (() => void) =>
    onSnapshot(subscriptionsCollection(clientId), (snapshot) => {
      callback(snapshot.docs.map((item) => docToEntity<Subscription>(item)));
    }),
  // Cross-client views: collectionGroup scoped to this tenant by the denormalized companyId.
  listAllSubscriptions: async (targetCompanyId: string): Promise<Subscription[]> => {
    const snapshot = await getDocs(
      query(collectionGroup(requireDb(), 'subscriptions'), where('companyId', '==', targetCompanyId)),
    );
    return snapshot.docs.map((item) => docToEntity<Subscription>(item));
  },
  subscribeToAllSubscriptions: (
    targetCompanyId: string,
    callback: (subscriptions: Subscription[]) => void,
  ): (() => void) =>
    onSnapshot(
      query(collectionGroup(requireDb(), 'subscriptions'), where('companyId', '==', targetCompanyId)),
      (snapshot) => {
        callback(snapshot.docs.map((item) => docToEntity<Subscription>(item)));
      },
    ),
  getSubscription: async (_companyId: string, clientId: string, subId: string): Promise<Subscription | null> => {
    const snapshot = await getDoc(subscriptionDocument(clientId, subId));
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...(snapshot.data() as Omit<Subscription, 'id'>) };
  },
  // Public create — delegates to the atomic subscription+engagement batch so every
  // subscription is guaranteed a paired engagement. Call sites stay unchanged.
  createSubscription: async (
    targetCompanyId: string,
    clientId: string,
    data: Omit<
      Subscription,
      'id' | 'companyId' | 'clientId' | 'planNameSnapshot' | 'accountManagerNameSnapshot' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<Subscription> => firestoreService.createSubscriptionWithEngagement(targetCompanyId, clientId, data),
  // Atomic: writes the subscription, its paired engagement, AND its onboarding
  // checklist in ONE writeBatch. If any set fails, none commit (Firestore semantics).
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
    const [planNameSnapshot, accountManagerNameSnapshot] = await Promise.all([
      resolvePlanName(data.planId),
      resolveEmployeeName(data.accountManagerId),
    ]);
    const subscription: Subscription = {
      ...data,
      id: createId('sub'),
      companyId: targetCompanyId,
      clientId,
      planNameSnapshot,
      accountManagerNameSnapshot,
      createdAt: now,
      updatedAt: now,
    };
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
    const checklist: OnboardingChecklist = {
      id: 'main',
      companyId: targetCompanyId,
      clientId,
      subscriptionId: subscription.id,
      items: buildDefaultChecklistItems(),
      templateVersion: DEFAULT_ONBOARDING_TEMPLATE_VERSION,
      createdAt: now,
      updatedAt: now,
    };

    const batch = writeBatch(requireDb());
    batch.set(subscriptionDocument(clientId, subscription.id), clean({ ...subscription }));
    batch.set(engagementDocument(clientId, engagement.id), clean({ ...engagement }));
    batch.set(checklistDocument(clientId, subscription.id), clean({ ...checklist }));
    await batch.commit();
    return subscription;
  },
  updateSubscription: async (
    _companyId: string,
    clientId: string,
    subId: string,
    patch: Partial<Subscription>,
  ): Promise<void> => {
    const next: Partial<Subscription> = { ...patch, updatedAt: new Date().toISOString() };
    // Re-resolve snapshots only when the underlying FK changed.
    if ('planId' in patch) next.planNameSnapshot = await resolvePlanName(patch.planId);
    if ('accountManagerId' in patch) next.accountManagerNameSnapshot = await resolveEmployeeName(patch.accountManagerId);
    await updateDoc(subscriptionDocument(clientId, subId), clean({ ...next }));
  },
  // Cascade-delete the subscription, its paired engagement(s), AND its checklist in one batch.
  deleteSubscription: async (_companyId: string, clientId: string, subId: string): Promise<void> => {
    const engagements = await getDocs(
      query(engagementsCollection(clientId), where('subscriptionId', '==', subId)),
    );
    const batch = writeBatch(requireDb());
    engagements.docs.forEach((item) => batch.delete(item.ref));
    batch.delete(checklistDocument(clientId, subId));
    batch.delete(subscriptionDocument(clientId, subId));
    await batch.commit();
  },

  // ── CRM: engagements ─────────────────────────────────────────────────
  getEngagementForSubscription: async (
    _companyId: string,
    clientId: string,
    subId: string,
  ): Promise<Engagement | null> => {
    const snapshot = await getDocs(query(engagementsCollection(clientId), where('subscriptionId', '==', subId)));
    const first = snapshot.docs[0];
    return first ? docToEntity<Engagement>(first) : null;
  },
  subscribeToEngagement: (
    _companyId: string,
    clientId: string,
    engId: string,
    callback: (engagement: Engagement | null) => void,
  ): (() => void) =>
    onSnapshot(engagementDocument(clientId, engId), (snapshot) => {
      callback(snapshot.exists() ? ({ id: snapshot.id, ...(snapshot.data() as Omit<Engagement, 'id'>) }) : null);
    }),
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
    await setDoc(engagementDocument(clientId, engagement.id), clean({ ...engagement }));
    return engagement;
  },
  updateEngagement: async (
    _companyId: string,
    clientId: string,
    engId: string,
    patch: Partial<Engagement>,
  ): Promise<void> => {
    const next: Partial<Engagement> = { ...patch, updatedAt: new Date().toISOString() };
    // Re-resolve name snapshots whenever the underlying ID arrays / FK change.
    if (patch.primaryAgentIds) next.primaryAgentNamesSnapshot = await resolveEmployeeNames(patch.primaryAgentIds);
    if (patch.backupAgentIds) next.backupAgentNamesSnapshot = await resolveEmployeeNames(patch.backupAgentIds);
    if ('escalationContactId' in patch)
      next.escalationContactNameSnapshot = await resolveContactName(clientId, patch.escalationContactId);
    await updateDoc(engagementDocument(clientId, engId), clean({ ...next }));
  },
  deleteEngagement: async (_companyId: string, clientId: string, engId: string): Promise<void> => {
    await deleteDoc(engagementDocument(clientId, engId));
  },

  // ── CRM: onboarding checklist ────────────────────────────────────────
  getChecklist: async (_companyId: string, clientId: string, subId: string): Promise<OnboardingChecklist | null> => {
    const snapshot = await getDoc(checklistDocument(clientId, subId));
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...(snapshot.data() as Omit<OnboardingChecklist, 'id'>) };
  },
  subscribeToChecklist: (
    _companyId: string,
    clientId: string,
    subId: string,
    callback: (checklist: OnboardingChecklist | null) => void,
  ): (() => void) =>
    onSnapshot(checklistDocument(clientId, subId), (snapshot) => {
      callback(snapshot.exists() ? ({ id: snapshot.id, ...(snapshot.data() as Omit<OnboardingChecklist, 'id'>) }) : null);
    }),
  // Patch one item within the checklist's items array. Marking Done auto-stamps
  // completedAt/completedBy; un-doing clears them. `actor` carries the current user.
  updateChecklistItem: async (
    _companyId: string,
    clientId: string,
    subId: string,
    itemId: string,
    patch: Partial<ChecklistItem>,
    actor?: { id: string; name: string },
  ): Promise<void> => {
    const ref = checklistDocument(clientId, subId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return;
    const checklist = snapshot.data() as OnboardingChecklist;
    const now = new Date().toISOString();
    const items = checklist.items.map((item) => {
      if (item.id !== itemId) return item;
      const next: ChecklistItem = { ...item, ...patch };
      if (patch.status === 'Done' && item.status !== 'Done') {
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
    await updateDoc(ref, { items: items.map((item) => clean({ ...item })), updatedAt: now });
  },
  addChecklistItem: async (_companyId: string, clientId: string, subId: string, label: string): Promise<void> => {
    const ref = checklistDocument(clientId, subId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return;
    const checklist = snapshot.data() as OnboardingChecklist;
    const nextSort = checklist.items.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
    const newItem: ChecklistItem = { id: createId('checklistitem'), label, status: 'Pending', sortOrder: nextSort };
    await updateDoc(ref, {
      items: [...checklist.items, clean({ ...newItem })],
      updatedAt: new Date().toISOString(),
    });
  },
  removeChecklistItem: async (_companyId: string, clientId: string, subId: string, itemId: string): Promise<void> => {
    const ref = checklistDocument(clientId, subId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return;
    const checklist = snapshot.data() as OnboardingChecklist;
    await updateDoc(ref, {
      items: checklist.items.filter((item) => item.id !== itemId).map((item) => clean({ ...item })),
      updatedAt: new Date().toISOString(),
    });
  },
  // Reorder by writing each item's sortOrder to its position in orderedItemIds.
  reorderChecklistItems: async (
    _companyId: string,
    clientId: string,
    subId: string,
    orderedItemIds: string[],
  ): Promise<void> => {
    const ref = checklistDocument(clientId, subId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return;
    const checklist = snapshot.data() as OnboardingChecklist;
    const orderIndex = new Map(orderedItemIds.map((id, index) => [id, index + 1]));
    const items = checklist.items
      .map((item) => ({ ...item, sortOrder: orderIndex.get(item.id) ?? item.sortOrder }))
      .map((item) => clean({ ...item }));
    await updateDoc(ref, { items, updatedAt: new Date().toISOString() });
  },
};

const debugDeveloperAuth = (message: string, data?: unknown) => {
  if (import.meta.env.DEV) {
    console.info(`[DeveloperAuth] ${message}`, data ?? '');
  }
};

const getFirebaseDebugError = (error: unknown) => {
  if (typeof error === 'object' && error) {
    return {
      code: 'code' in error ? (error as { code?: string }).code : undefined,
      message: 'message' in error ? (error as { message?: string }).message : undefined,
    };
  }

  return { message: String(error) };
};
