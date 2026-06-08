import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  ListChecks,
  MonitorSmartphone,
  Plus,
  Settings as SettingsIcon,
  Timer,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { BRANDING } from '../config/branding';
import { firestoreService } from '../services/firestoreService';
import { isFirebaseConfigured } from '../services/firebase';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type { AttendanceIndexRecord, AttendanceRecord, LeaveRequest } from '../types';
import { formatDate, formatTime } from '../utils/format';
import { getOwnLeaveRequests, getReviewLeaveRequests } from '../utils/leaveWorkflow';

const todayKey = () => new Date().toISOString().slice(0, 10);

const quickActions = {
  Admin: [
    { label: 'Add Employee', to: '/employees', icon: Plus },
    { label: 'Review Leave', to: '/leave', icon: CalendarDays },
    { label: 'Review Reports', to: '/reports', icon: FileText },
    { label: 'Settings', to: '/settings', icon: SettingsIcon },
  ],
  HR: [
    { label: 'Add Employee', to: '/employees', icon: Plus },
    { label: 'Review Leave', to: '/leave', icon: CalendarDays },
    { label: 'Review Reports', to: '/reports', icon: FileText },
    { label: 'Announcements', to: '/announcements', icon: Bell },
  ],
  Employee: [
    { label: 'Apply Leave', to: '/leave', icon: CalendarDays },
    { label: 'Submit Report', to: '/reports', icon: FileText },
    { label: 'View Attendance', to: '/attendance', icon: CalendarCheck },
    { label: 'View Announcements', to: '/announcements', icon: Bell },
  ],
};

export const DashboardPage = () => {
  const { profile, role, updateProfile } = useAuth();
  const currentRole = role ?? profile?.role;
  const [records, setRecords] = useState<AttendanceRecord[]>(() =>
    profile ? storage.getAttendance(profile.email) : [],
  );
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => storage.getLeaveRequests());
  const [attendanceError, setAttendanceError] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured || !profile) return;

    firestoreService
      .getUserAttendance(profile.email)
      .then((items) =>
        setRecords(
          items.map((item) => ({
            date: item.date,
            checkIn: item.checkIn,
            checkOut: item.checkOut,
            status: item.status,
            remote: item.workMode === 'Remote',
          })),
        ),
      )
      .catch((error) => setAttendanceError(error instanceof Error ? error.message : 'Unable to load attendance.'));
  }, [profile]);

  useEffect(() => {
    if (!profile || !currentRole) return;

    if (!isFirebaseConfigured) {
      const requests = storage.getLeaveRequests();
      setLeaveRequests(
        currentRole === 'Admin' || currentRole === 'HR'
          ? getReviewLeaveRequests(requests, currentRole)
          : getOwnLeaveRequests(requests, profile),
      );
      return;
    }

    const request =
      currentRole === 'Admin' || currentRole === 'HR'
        ? firestoreService.getReviewLeaveRequests(currentRole)
        : firestoreService.getOwnLeaveRequests(profile);

    request
      .then((requests) =>
        setLeaveRequests(
          currentRole === 'Admin' || currentRole === 'HR'
            ? getReviewLeaveRequests(requests, currentRole)
            : getOwnLeaveRequests(requests, profile),
        ),
      )
      .catch((error) => setAttendanceError(error instanceof Error ? error.message : 'Unable to load dashboard data.'));
  }, [currentRole, profile]);

  const today = useMemo(
    () => records.find((record) => record.date === todayKey()) ?? {
      date: todayKey(),
      status: profile?.status ?? 'Away',
      remote: profile?.workMode === 'Remote',
    },
    [records, profile],
  );

  if (!profile) return null;

  const saveToday = async (record: AttendanceRecord) => {
    const nextRecords = records.some((item) => item.date === record.date)
      ? records.map((item) => (item.date === record.date ? record : item))
      : [record, ...records];
    setRecords(nextRecords);
    const indexRecord = toAttendanceIndexRecord(profile.name, profile.email, profile.workMode, record);
    try {
      if (isFirebaseConfigured) {
        await firestoreService.upsertAttendance(indexRecord);
      } else {
        storage.setAttendance(profile.email, nextRecords);
        storage.upsertAttendanceIndex(indexRecord);
      }
      setAttendanceError('');
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : 'Unable to save attendance.');
    }
    updateProfile({ ...profile, status: record.status, workMode: record.remote ? 'Remote' : profile.workMode });
  };

  const checkIn = () => saveToday({ ...today, checkIn: today.checkIn ?? formatTime(), status: 'At Work' });
  const checkOut = () => saveToday({ ...today, checkOut: formatTime(), status: 'Checked Out' });
  const toggleRemote = () => saveToday({ ...today, remote: !today.remote });
  const pendingLeaveRequests = leaveRequests.filter((request) => request.status === 'Pending').length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title={`Today at ${BRANDING.workspaceName}`}
        subtitle={`${BRANDING.productName} keeps attendance, reports, leave, and announcements ready for the team.`}
        action={
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
            <MonitorSmartphone size={18} className="text-accent-500" />
            <span className="text-sm font-medium text-slate-300">Remote Work</span>
            <button
              type="button"
              onClick={toggleRemote}
              className={`relative h-6 w-11 rounded-full transition ${today.remote ? 'bg-accent-600' : 'bg-slate-700'}`}
              aria-label="Toggle remote work"
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                  today.remote ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        }
      />

      <section className="surface p-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
            <p className="mt-1 text-sm text-slate-500">Jump into the most common workflows for your role.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions[role ?? profile.role].map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-accent-500/35 hover:bg-accent-500/10"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500 transition group-hover:bg-accent-500/15">
                <action.icon size={18} />
              </span>
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today's Date" value={formatDate()} icon={CalendarDays} caption="Current local workday" />
        <StatCard title="Check-In Time" value={today.checkIn ?? '--'} icon={Clock} caption="Saved in localStorage" />
        <StatCard title="Check-Out Time" value={today.checkOut ?? '--'} icon={Timer} caption="Visible after checkout" />
        <article className="surface p-5">
          <p className="text-sm font-medium text-slate-400">Current Status</p>
          <div className="mt-4">
            <StatusBadge status={today.status} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={checkIn}>
              Check In
            </button>
            <button type="button" className="btn-secondary" onClick={checkOut}>
              Check Out
            </button>
            <Link to="/attendance" className="btn-secondary">
              View Attendance History
            </Link>
          </div>
        </article>
      </div>
      {attendanceError ? (
        <p className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {attendanceError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Planned Tasks" value="8" icon={ListChecks} caption="Sprint and async tasks" />
        <StatCard title="Completed Tasks" value="5" icon={CheckCircle2} caption="Marked done today" />
        <StatCard title="Work In Progress" value="3" icon={Clock} caption="Active deliverables" />
        <StatCard title="Blockers" value="1" icon={AlertTriangle} caption="Needs team attention" />
        <StatCard title="Pending Leave Requests" value={pendingLeaveRequests} icon={CalendarDays} caption="Awaiting HR review" />
      </div>
    </div>
  );
};

const toAttendanceIndexRecord = (
  employeeName: string,
  employeeEmail: string,
  workMode: AttendanceIndexRecord['workMode'],
  record: AttendanceRecord,
): AttendanceIndexRecord => ({
  id: `${employeeEmail}-${record.date}`,
  employeeName,
  employeeEmail,
  date: record.date,
  checkIn: record.checkIn,
  checkOut: record.checkOut,
  workMode: record.remote ? 'Remote' : workMode,
  status: record.status,
});
