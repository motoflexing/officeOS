import type { Announcement, CompanySettings, Employee, LeaveRequest, UserProfile } from '../types';

export const demoCredentials = {
  Admin: { email: 'admin@geekynd.com', password: '123456' },
  HR: { email: 'hr@geekynd.com', password: '123456' },
  Employee: { email: 'employee@geekynd.com', password: '123456' },
} as const;

export const defaultProfiles: Record<string, UserProfile> = {
  Admin: {
    name: 'Geekynd Admin',
    email: demoCredentials.Admin.email,
    role: 'Admin',
    department: 'Leadership',
    workMode: 'Hybrid',
    status: 'At Work',
  },
  HR: {
    name: 'Geekynd HR Team',
    email: demoCredentials.HR.email,
    role: 'HR',
    department: 'People Operations',
    workMode: 'Office',
    status: 'At Work',
  },
  Employee: {
    name: 'Ankit Kumar',
    email: demoCredentials.Employee.email,
    role: 'Employee',
    department: 'Engineering',
    workMode: 'Remote',
    status: 'Away',
  },
};

export const employees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Abhishek Bhattacharjee',
    email: 'abhishek@geekynd.com',
    department: 'Engineering',
    role: 'Employee',
    position: 'Developer',
    workMode: 'Hybrid',
    status: 'At Work',
  },
  {
    id: 'emp-2',
    name: 'Adit Saha',
    email: 'adit@geekynd.com',
    department: 'Design',
    role: 'Employee',
    position: 'Designer',
    workMode: 'Office',
    status: 'Away',
  },
  {
    id: 'emp-3',
    name: 'Ankit Kumar',
    email: 'ankit@geekynd.com',
    department: 'Engineering',
    role: 'Employee',
    position: 'Intern Developer',
    workMode: 'Remote',
    status: 'At Work',
  },
  {
    id: 'emp-4',
    name: 'Syeda Simirani Ahmed',
    email: 'syeda@geekynd.com',
    department: 'Sales',
    role: 'Employee',
    position: 'Sales Executive',
    workMode: 'Office',
    status: 'Checked Out',
  },
  {
    id: 'emp-5',
    name: 'Rohan Marak',
    email: 'rohan@geekynd.com',
    department: 'Operations',
    role: 'Employee',
    position: 'Operations',
    workMode: 'Hybrid',
    status: 'Away',
  },
  {
    id: 'emp-6',
    name: 'Geekynd HR Team',
    email: 'hr@geekynd.com',
    department: 'People Operations',
    role: 'HR',
    position: 'HR',
    workMode: 'Office',
    status: 'At Work',
  },
];

export const defaultAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Daily Report Reminder',
    message: 'Please submit your EOD report before leaving.',
    date: new Date().toISOString(),
    author: 'Geekynd HR Team',
  },
  {
    id: 'ann-2',
    title: 'Project Review Meeting',
    message: 'Project review scheduled tomorrow at 11 AM.',
    date: new Date().toISOString(),
    author: 'Geekynd Admin',
  },
];

export const defaultLeaveRequests: LeaveRequest[] = [
  {
    id: 'leave-1',
    employeeName: 'Adit Saha',
    leaveType: 'Casual Leave',
    date: '2026-06-05',
    status: 'Pending',
  },
  {
    id: 'leave-2',
    employeeName: 'Rohan Marak',
    leaveType: 'Sick Leave',
    date: '2026-06-04',
    status: 'Approved',
  },
  {
    id: 'leave-3',
    employeeName: 'Syeda Simirani Ahmed',
    leaveType: 'Personal Leave',
    date: '2026-06-07',
    status: 'Rejected',
  },
];

export const defaultSettings: CompanySettings = {
  companyName: 'Geekynd Hub',
  workingHours: '10:00 AM - 7:00 PM',
  defaultWorkMode: 'Hybrid',
  emailNotifications: true,
  dailyReportReminders: true,
};
