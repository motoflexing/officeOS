import {
  defaultAnnouncements,
  defaultCandidates,
  defaultInterviews,
  defaultJobOpenings,
  defaultLeaveRequests,
  defaultProfiles,
  defaultSettings,
  defaultWorkspaceUsers,
  employees,
} from '../data/mockData';
import type {
  Announcement,
  AttendanceIndexRecord,
  AttendanceRecord,
  Candidate,
  CompanySettings,
  DailyReport,
  Employee,
  Interview,
  JobOpening,
  LeaveRequest,
  PresenceStatus,
  Role,
  UserProfile,
  WorkspaceUser,
} from '../types';

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

  getWorkspaceUsers: () => read<WorkspaceUser[]>('geekynd:workspaceUsers', defaultWorkspaceUsers),
  setWorkspaceUsers: (users: WorkspaceUser[]) => write('geekynd:workspaceUsers', users),
  updateMyPresenceStatus: (profile: UserProfile, presenceStatus: PresenceStatus) => {
    const users = storage.getWorkspaceUsers();
    const lastActiveAt = new Date().toISOString();
    const currentUser: WorkspaceUser = {
      id: `workspace-${profile.email}`,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      department: profile.department,
      presenceStatus,
      lastActiveAt,
    };
    const nextUsers = users.some((user) => user.email === profile.email)
      ? users.map((user) => (user.email === profile.email ? { ...user, ...currentUser } : user))
      : [currentUser, ...users];
    return storage.setWorkspaceUsers(nextUsers);
  },

  getSettings: () => normalizeSettings(read<Partial<CompanySettings>>('geekynd:settings', defaultSettings)),
  setSettings: (settings: CompanySettings) => write('geekynd:settings', normalizeSettings(settings)),
};
