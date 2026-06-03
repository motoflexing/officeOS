import { AlertTriangle, CalendarDays, CheckCircle2, Clock, ListChecks, MonitorSmartphone, Timer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { BRANDING } from '../config/branding';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type { AttendanceIndexRecord, AttendanceRecord } from '../types';
import { formatDate, formatTime } from '../utils/format';

const todayKey = () => new Date().toISOString().slice(0, 10);

export const DashboardPage = () => {
  const { profile, role, updateProfile } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>(() =>
    profile ? storage.getAttendance(profile.email) : [],
  );

  const today = useMemo(
    () => records.find((record) => record.date === todayKey()) ?? {
      date: todayKey(),
      status: profile?.status ?? 'Away',
      remote: profile?.workMode === 'Remote',
    },
    [records, profile],
  );

  if (!profile) return null;

  const saveToday = (record: AttendanceRecord) => {
    const nextRecords = records.some((item) => item.date === record.date)
      ? records.map((item) => (item.date === record.date ? record : item))
      : [record, ...records];
    setRecords(nextRecords);
    storage.setAttendance(profile.email, nextRecords);
    storage.upsertAttendanceIndex(toAttendanceIndexRecord(profile.name, profile.email, profile.workMode, record));
    updateProfile({ ...profile, status: record.status, workMode: record.remote ? 'Remote' : profile.workMode });
  };

  const checkIn = () => saveToday({ ...today, checkIn: today.checkIn ?? formatTime(), status: 'At Work' });
  const checkOut = () => saveToday({ ...today, checkOut: formatTime(), status: 'Checked Out' });
  const toggleRemote = () => saveToday({ ...today, remote: !today.remote });
  const pendingLeaveRequests = storage
    .getLeaveRequests()
    .filter((request) => {
      if (request.status !== 'Pending') return false;
      if (role === 'Admin' || role === 'HR') return true;
      return request.employeeEmail ? request.employeeEmail === profile.email : request.employeeName === profile.name;
    }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">Dashboard</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-white">Today at {BRANDING.workspaceName}</h2>
        </div>
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
      </div>

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
