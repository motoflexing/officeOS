export type Role = 'Admin' | 'HR' | 'Employee';
export type EmployeeStatus = 'At Work' | 'Away' | 'Checked Out';
export type EmploymentStatus = 'Active' | 'Inactive' | 'On Leave';
export type WorkMode = 'Office' | 'Remote' | 'Hybrid';
export type WorkModePolicy = 'Office Only' | 'Hybrid' | 'Remote Friendly';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';
export type ReportStatus = 'Submitted' | 'Reviewed';
export type AnnouncementTargetRole = 'Everyone' | Role;

export interface UserProfile {
  name: string;
  email: string;
  role: Role;
  department: string;
  designation?: string;
  employmentStatus?: EmploymentStatus;
  workMode: WorkMode;
  status: EmployeeStatus;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  designation: string;
  status: EmploymentStatus;
  joiningDate: string;
  phone?: string;
  location?: string;
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
  employeeName: string;
  employeeEmail: string;
  date: string;
  tasksCompleted: string;
  tasksInProgress: string;
  blockers: string;
  nextPlan: string;
  status: ReportStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  plannedTasks?: string;
  completedTasks?: string;
  workInProgress?: string;
  learnings?: string;
  author?: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  authorName: string;
  authorRole: Role;
  targetRole: AnnouncementTargetRole;
  createdAt: string;
  date?: string;
  author?: string;
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
  reviewedBy?: string;
  reviewedAt?: string;
  date?: string;
}

export interface WorkspaceSettings {
  workspaceName: string;
  productName: string;
  websiteUrl: string;
  websiteLabel: string;
  officeStartTime: string;
  officeEndTime: string;
  workModePolicy: WorkModePolicy;
  allowHrAnnouncements: boolean;
  requireDailyReports: boolean;
  timezone: string;
  companyName?: string;
  workingHours?: string;
  defaultWorkMode?: WorkMode;
  emailNotifications?: boolean;
  dailyReportReminders?: boolean;
}

export type CompanySettings = WorkspaceSettings;
