export type Role = 'Admin' | 'HR' | 'Employee';
export type EmployeeStatus = 'At Work' | 'Away' | 'Checked Out';
export type WorkMode = 'Office' | 'Remote' | 'Hybrid';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface UserProfile {
  name: string;
  email: string;
  role: Role;
  department: string;
  workMode: WorkMode;
  status: EmployeeStatus;
}

export interface Employee extends UserProfile {
  id: string;
  position: string;
}

export interface AttendanceRecord {
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: EmployeeStatus;
  remote: boolean;
}

export interface AttendanceIndexRecord {
  id: string;
  employeeName: string;
  employeeEmail: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  workMode: WorkMode;
  status: EmployeeStatus;
}

export interface DailyReport {
  id: string;
  date: string;
  plannedTasks: string;
  completedTasks: string;
  workInProgress: string;
  blockers: string;
  learnings: string;
  author: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  date: string;
  author: string;
}

export interface LeaveRequest {
  id: string;
  employeeName: string;
  employeeEmail: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  submittedAt: string;
  date?: string;
}

export interface CompanySettings {
  companyName: string;
  workingHours: string;
  defaultWorkMode: WorkMode;
  emailNotifications: boolean;
  dailyReportReminders: boolean;
}
