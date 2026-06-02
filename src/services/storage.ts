import {
  defaultAnnouncements,
  defaultLeaveRequests,
  defaultProfiles,
  defaultSettings,
} from '../data/mockData';
import type {
  Announcement,
  AttendanceRecord,
  CompanySettings,
  DailyReport,
  LeaveRequest,
  Role,
  UserProfile,
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

  getReports: () => read<DailyReport[]>('geekynd:reports', []),
  setReports: (reports: DailyReport[]) => write('geekynd:reports', reports),

  getAnnouncements: () => read<Announcement[]>('geekynd:announcements', defaultAnnouncements),
  setAnnouncements: (announcements: Announcement[]) =>
    write('geekynd:announcements', announcements),

  getLeaveRequests: () => read<LeaveRequest[]>('geekynd:leaveRequests', defaultLeaveRequests),
  setLeaveRequests: (requests: LeaveRequest[]) => write('geekynd:leaveRequests', requests),

  getSettings: () => read<CompanySettings>('geekynd:settings', defaultSettings),
  setSettings: (settings: CompanySettings) => write('geekynd:settings', settings),
};
