export type Role = 'Admin' | 'HR' | 'Employee';
export type EmployeeStatus = 'At Work' | 'Away' | 'Checked Out';
export type EmploymentStatus = 'Active' | 'Inactive' | 'On Leave';
export type WorkMode = 'Office' | 'Remote' | 'Hybrid';
export type WorkModePolicy = 'Office Only' | 'Hybrid' | 'Remote Friendly';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';
export type ReportStatus = 'Submitted' | 'Reviewed';
export type AnnouncementTargetRole = 'Everyone' | Role;
export type JobOpeningStatus = 'Open' | 'Paused' | 'Closed';
export type CandidateStatus = 'Applied' | 'Screening' | 'Interview' | 'Selected' | 'Rejected';
export type InterviewStatus = 'Scheduled' | 'Completed' | 'Cancelled';
export type PresenceStatus = 'Online' | 'Away' | 'On Break' | 'In Meeting' | 'Offline';
export type DeveloperRole = 'Developer';
export type DeveloperStatus = 'Active' | 'Inactive';
export type FeedbackType = 'Bug' | 'Feature Request' | 'UI/UX Improvement' | 'Workflow Issue' | 'Other';
export type FeedbackPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type FeedbackStatus = 'New' | 'Reviewed' | 'Planned' | 'In Progress' | 'Fixed' | 'Rejected';
export type FeedbackModule =
  | 'Dashboard'
  | 'Employees'
  | 'Attendance'
  | 'Leave'
  | 'Reports'
  | 'Announcements'
  | 'Settings'
  | 'HR/ATS'
  | 'Workspace'
  | 'Auth'
  | 'Login/Auth'
  | 'Profile'
  | 'Developer Panel'
  | 'Other';

export interface UserProfile {
  name: string;
  email: string;
  role: Role;
  department: string;
  designation?: string;
  employmentStatus?: EmploymentStatus;
  workMode: WorkMode;
  status: EmployeeStatus;
  presenceStatus?: PresenceStatus;
  createdAt?: string;
  createdBy?: string;
}

export interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  presenceStatus: PresenceStatus;
  lastActiveAt?: string;
}

export interface DirectConversation {
  id: string;
  participantEmails: string[];
  participantNames: string[];
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderEmail: string;
  senderName: string;
  receiverEmail: string;
  text: string;
  createdAt: string;
}

export interface DeveloperProfile {
  name: string;
  email: string;
  role: DeveloperRole;
  status: DeveloperStatus;
  createdAt: string;
  lastLoginAt?: string;
}

export interface FeedbackItem {
  id: string;
  path?: string;
  type: FeedbackType;
  title: string;
  description: string;
  priority: FeedbackPriority;
  relatedModule: FeedbackModule;
  status: FeedbackStatus;
  submittedByUid: string;
  submittedByName: string;
  submittedByEmail: string;
  submittedByRole: Role;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedByUid?: string;
  reviewedByName?: string;
  developerNotes?: string;
}

export type FeedbackInput = Pick<
  FeedbackItem,
  | 'type'
  | 'title'
  | 'description'
  | 'priority'
  | 'relatedModule'
  | 'submittedByUid'
  | 'submittedByName'
  | 'submittedByEmail'
  | 'submittedByRole'
>;

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  designation: string;
  status: EmploymentStatus;
  joiningDate: string;
  workMode?: WorkMode;
  authUid?: string;
  createdAt?: string;
  createdBy?: string;
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
  requesterId?: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterRole?: Role;
  companyId?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  submittedAt: string;
  createdAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  date?: string;
}

export interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  experience: string;
  salaryRange: string;
  status: JobOpeningStatus;
  createdAt: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  appliedRole: string;
  experience: string;
  skills: string[];
  resumeLink?: string;
  status: CandidateStatus;
  appliedAt: string;
}

export interface Interview {
  id: string;
  candidateName: string;
  role: string;
  interviewDate: string;
  interviewTime: string;
  interviewer: string;
  status: InterviewStatus;
  notes: string;
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
