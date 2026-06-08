import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db, companyId, isFirebaseConfigured } from './firebase';
import type {
  Announcement,
  AttendanceIndexRecord,
  Candidate,
  CompanySettings,
  DailyReport,
  DeveloperProfile,
  Employee,
  FeedbackInput,
  FeedbackItem,
  FeedbackStatus,
  Interview,
  JobOpening,
  LeaveRequest,
  LeaveStatus,
  Role,
  UserProfile,
} from '../types';
import { normalizeLeaveRequest } from '../utils/leaveWorkflow';

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
