import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, companyId, isFirebaseConfigured } from './firebase';
import type {
  Announcement,
  AttendanceIndexRecord,
  Candidate,
  CompanySettings,
  DailyReport,
  Employee,
  Interview,
  JobOpening,
  LeaveRequest,
  LeaveStatus,
  PresenceStatus,
  UserProfile,
  WorkspaceUser,
} from '../types';

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

const readCollection = async <T extends { id: string }>(name: string): Promise<T[]> => {
  const snapshot = await getDocs(companyCollection(name));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
};

export const firestoreService = {
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

  getWorkspaceUsers: async (): Promise<WorkspaceUser[]> => {
    const snapshot = await getDocs(companyCollection('users'));
    return snapshot.docs.map((item) => {
      const data = item.data() as Record<string, unknown>;
      const role = data.role === 'Admin' || data.role === 'HR' || data.role === 'Employee' ? data.role : 'Employee';
      const presenceStatus =
        data.presenceStatus === 'Online' ||
        data.presenceStatus === 'Away' ||
        data.presenceStatus === 'On Break' ||
        data.presenceStatus === 'In Meeting' ||
        data.presenceStatus === 'Offline'
          ? data.presenceStatus
          : 'Offline';

      return {
        id: item.id,
        name: typeof data.name === 'string' ? data.name : 'OfficeOS User',
        email: typeof data.email === 'string' ? data.email : '',
        role,
        department: typeof data.department === 'string' ? data.department : 'General',
        presenceStatus,
        lastActiveAt: typeof data.lastActiveAt === 'string' ? data.lastActiveAt : undefined,
      };
    });
  },
  updateMyPresenceStatus: async (uid: string, presenceStatus: PresenceStatus) => {
    const lastActiveAt = new Date().toISOString();
    await setDoc(companyDocument('users', uid), { presenceStatus, lastActiveAt }, { merge: true });
    return { uid, presenceStatus, lastActiveAt };
  },

  getEmployees: () => readCollection<Employee>('employees'),
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
  addLeaveRequest: async (request: LeaveRequest) => {
    await setDoc(companyDocument('leaveRequests', request.id), clean({ ...request }));
    return request;
  },
  updateLeaveRequestStatus: async (id: string, status: LeaveStatus, reviewedBy: string) => {
    const reviewedAt = new Date().toISOString();
    await updateDoc(companyDocument('leaveRequests', id), { status, reviewedBy, reviewedAt });
    return { id, status, reviewedBy, reviewedAt };
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
