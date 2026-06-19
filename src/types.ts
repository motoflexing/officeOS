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
  createdAt?: string;
  createdBy?: string;
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

export type ConversationType = 'dm' | 'channel';

export interface Conversation {
  id: string;
  type: ConversationType;
  // For DMs: array of 2 user UIDs (sorted lexicographically for deterministic IDs).
  // For channels: omitted.
  participants?: string[];
  // For channels only.
  name?: string;
  description?: string;
  createdBy: string; // user UID
  createdAt: string; // ISO
  lastMessageAt?: string; // ISO, for sorting the conversation list
  lastMessagePreview?: string; // first 80 chars of the last message
}

export interface Message {
  id: string;
  conversationId: string;
  senderUid: string;
  senderName: string; // denormalized for display
  senderEmail: string; // denormalized
  text: string;
  createdAt: string; // ISO
  editedAt?: string;
}

// ── CRM (Phase 1) ────────────────────────────────────────────────────────
export type ClientStatus = 'Prospect' | 'Onboarding' | 'Active' | 'Paused' | 'Churned';
export type Industry = 'eCommerce' | 'SaaS' | 'D2C' | 'Marketplace' | 'Services' | 'Other';
export type HelpdeskTool = 'Zendesk' | 'Gorgias' | 'Intercom' | 'Freshdesk' | 'HubSpot' | 'Other' | 'None';
export type DealStage = 'Lead' | 'Consultation Booked' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost';
export type ActivityType = 'Call' | 'Email' | 'Meeting' | 'Note';
export type RelatedEntity = 'client' | 'contact' | 'deal';

export interface Client {
  id: string;
  companyName: string;
  industry?: Industry;
  website?: string;
  country?: string;
  timezone?: string;
  employeeCount?: number;
  helpdeskTool?: HelpdeskTool;
  status: ClientStatus;
  foundingClient?: boolean;
  ownerEmployeeId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  role?: string;
  email: string;
  phone?: string;
  isPrimary?: boolean;
  linkedinUrl?: string;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  clientId: string;
  // Denormalized tenant id, written on every create so the pipeline's
  // collectionGroup('deals') query can filter by company (CG queries don't
  // auto-scope by parent path). See firestoreService.subscribeToAllDeals.
  companyId: string;
  title: string;
  stage: DealStage;
  planInterest?: string; // references a plan id from settings; free-form fallback ok
  expectedMRR?: number;
  expectedSetupFee?: number;
  expectedCloseDate?: string;
  source?: string;
  lostReason?: string;
  ownerEmployeeId?: string;
  notes?: string;
  // Set when a Won deal has been converted to a subscription (Phase 2C); prevents
  // re-prompting the conversion and surfaces an "Already converted" badge.
  subscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  clientId: string;
  type: ActivityType;
  subject: string;
  body?: string;
  relatedTo?: RelatedEntity;
  relatedId?: string;
  employeeId: string;
  scheduledAt?: string;
  completedAt?: string;
  outcome?: string;
  createdAt: string;
}

export interface PricingPlan {
  id: string;
  name: string; // e.g. "Starter", "Growth", "Scale", "Custom"
  monthlyPrice?: number;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

// ── CRM (Phase 2): Subscriptions ─────────────────────────────────────────
export type SubscriptionStatus = 'Onboarding' | 'Active' | 'Paused' | 'Cancelled' | 'Renewed';
export type CoverageHours = 8 | 12 | 16 | 24;
export type BillingCycle = 'Monthly' | 'Quarterly' | 'Annual';
export type SupportChannel = 'Email' | 'Chat' | 'Phone' | 'Social';

export interface Subscription {
  id: string;
  companyId: string; // denormalized for collection-group queries
  clientId: string;
  dealId?: string; // optional, links back to the converted deal
  teamLabel: string; // e.g. "US eCom Support" — disambiguates multiple subs per client
  planId?: string; // FK to pricingPlans
  planNameSnapshot?: string; // denormalized at creation
  mrr: number;
  setupFee?: number;
  currency: string; // default 'USD'
  coverageHours: CoverageHours;
  ticketCapPerMonth?: number;
  channelsCovered: SupportChannel[];
  billingCycle: BillingCycle;
  startDate: string; // ISO date
  renewalDate?: string; // ISO date
  status: SubscriptionStatus;
  cancellationReason?: string;
  cancelledAt?: string;
  ndaSignedDate?: string;
  dpaSignedDate?: string;
  accountManagerId?: string;
  accountManagerNameSnapshot?: string;
  notes?: string;
  // Client-specific KPI definitions tracked in SLA reports (Phase 4). Lives on the
  // subscription doc; report values are keyed by these metric ids.
  customMetrics?: CustomMetricDefinition[];
  createdAt: string;
  updatedAt: string;
}

// ── CRM (Phase 2): Engagements ───────────────────────────────────────────
export type ShiftPattern = 'US Morning' | 'US Afternoon' | 'US Evening' | '24x7' | 'Custom';
export type EngagementStatus = 'Onboarding' | 'Active' | 'Paused';
export type HelpdeskAccessStatus = 'Pending' | 'Granted' | 'Revoked';

export interface HelpdeskAccess {
  tool: HelpdeskTool; // existing type from Phase 1
  username?: string;
  status: HelpdeskAccessStatus;
}

export interface Engagement {
  id: string;
  companyId: string;
  clientId: string;
  subscriptionId: string; // 1:1 with subscription
  primaryAgentIds: string[];
  primaryAgentNamesSnapshot?: string[]; // denormalized for display
  backupAgentIds: string[];
  backupAgentNamesSnapshot?: string[];
  shiftPattern: ShiftPattern;
  customShiftDescription?: string;
  sopDocUrl?: string;
  brandVoiceGuideUrl?: string;
  escalationContactId?: string;
  escalationContactNameSnapshot?: string;
  helpdeskAccountAccess: HelpdeskAccess[];
  goLiveDate?: string;
  status: EngagementStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── CRM (Phase 2): Onboarding Checklist ──────────────────────────────────
export type ChecklistItemStatus = 'Pending' | 'In Progress' | 'Done' | 'Skipped';

export interface ChecklistItem {
  id: string;
  label: string;
  status: ChecklistItemStatus;
  dueDate?: string;
  completedAt?: string;
  completedBy?: string;
  completedByNameSnapshot?: string;
  notes?: string;
  sortOrder: number;
}

export interface OnboardingChecklist {
  id: string; // always 'main' for the single per-subscription doc
  companyId: string;
  clientId: string;
  subscriptionId: string;
  items: ChecklistItem[];
  templateVersion: number;
  createdAt: string;
  updatedAt: string;
}

// ── CRM (Phase 3): Shifts & Coverage ─────────────────────────────────────
export type ShiftRole = 'Primary' | 'Backup';
export type ShiftStatus = 'Scheduled' | 'Completed' | 'Missed' | 'Swapped';

export interface Shift {
  id: string;
  companyId: string;
  clientId: string;
  engagementId: string;
  agentId: string;
  agentNameSnapshot?: string;
  date: string;           // ISO date, e.g. "2026-06-22"
  startTime: string;       // "09:00"
  endTime: string;         // "17:00"
  role: ShiftRole;
  status: ShiftStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── CRM (Phase 4): SLA Reporting ─────────────────────────────────────────
export type ReportPeriod = 'Weekly' | 'Monthly' | 'Custom';
// NOTE: the bare name `ReportStatus` is already taken by the Daily Reports module
// ('Submitted' | 'Reviewed'). The SLA report status is named SlaReportStatus to
// avoid colliding with — and breaking — that existing module.
export type SlaReportStatus = 'Draft' | 'Sent';

export interface CustomMetricDefinition {
  id: string;
  label: string;
  unit?: string;
  description?: string;
  sortOrder: number;
}

export interface StandardMetrics {
  firstResponseTimeAvgMinutes?: number;
  ticketsHandled?: number;
  resolutionRatePercent?: number;
  csatScorePercent?: number;
  escalationCount?: number;
  slaBreachCount?: number;
}

export interface SlaReport {
  id: string;
  companyId: string;
  clientId: string;
  subscriptionId: string;
  period: ReportPeriod;
  periodStart: string;          // ISO date
  periodEnd: string;            // ISO date
  status: SlaReportStatus;
  sentAt?: string;
  sentBy?: string;
  sentByNameSnapshot?: string;
  standardMetrics: StandardMetrics;
  customMetricValues: { [metricId: string]: number };
  narrative?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ── CRM (Phase 5): Invoicing & Finance ───────────────────────────────────
export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Void';
// Note: 'Overdue' is computed client-side, not stored. See getEffectiveStatus.

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;           // = quantity * unitPrice, computed on save
}

export interface Invoice {
  id: string;
  companyId: string;
  clientId: string;
  subscriptionId: string;
  invoiceNumber: string;            // INV-YYYY-NNNN
  periodStart: string;              // ISO date
  periodEnd: string;                // ISO date
  issueDate: string;                // ISO date
  dueDate: string;                  // ISO date
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate?: number;                 // percent, 0-100
  taxAmount?: number;
  total: number;
  currency: string;                 // 'USD' for V1
  status: InvoiceStatus;
  sentAt?: string;
  sentBy?: string;
  sentByNameSnapshot?: string;
  paidAt?: string;
  paidBy?: string;
  paidByNameSnapshot?: string;
  paymentMethod?: string;
  paymentReference?: string;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  notes?: string;                   // internal
  clientFacingNotes?: string;       // appears on the invoice
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface InvoiceCounter {
  year: number;
  nextNumber: number;
}

export interface CompanySettings {
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
