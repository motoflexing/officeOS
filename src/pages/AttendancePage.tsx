import { CalendarCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type { AttendanceIndexRecord, AttendanceRecord, UserProfile, WorkMode } from '../types';
import { formatShortDate } from '../utils/format';

interface AttendanceRow {
  employeeName: string;
  employeeEmail: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  workMode: WorkMode;
  status: 'Present' | 'Active' | 'Absent';
}

export const AttendancePage = () => {
  const { profile, role } = useAuth();
  const [attendanceIndex, setAttendanceIndex] = useState<AttendanceIndexRecord[]>(() =>
    storage.getAttendanceIndex(),
  );

  useEffect(() => {
    if (!profile) return;

    const index = storage.getAttendanceIndex();
    if ((role === 'Admin' || role === 'HR') && index.length === 0) {
      const legacyRecords = storage
        .getAttendance(profile.email)
        .map((record) => toAttendanceIndexRecord(profile, record));

      if (legacyRecords.length > 0) {
        storage.setAttendanceIndex(legacyRecords);
        setAttendanceIndex(legacyRecords);
        return;
      }
    }

    setAttendanceIndex(index);
  }, [profile, role]);

  const rows = useMemo(() => {
    if (!profile) return [];

    if (role === 'Admin' || role === 'HR') {
      return attendanceIndex
        .map(buildAttendanceRowFromIndex)
        .sort((a, b) => b.date.localeCompare(a.date));
    }

    return storage
      .getAttendance(profile.email)
      .map((record) => buildAttendanceRow(profile, record))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceIndex, profile, role]);

  if (!profile) return null;

  const showEmployeeColumn = role === 'Admin' || role === 'HR';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">Attendance</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Attendance History</h2>
      </div>

      {rows.length === 0 ? (
        <div className="surface p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500">
            <CalendarCheck size={22} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">No attendance records yet</h3>
          <p className="mt-2 text-sm text-slate-400">
            Attendance history will appear here after check-in, check-out, or remote work updates are saved.
          </p>
        </div>
      ) : (
        <section className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  {showEmployeeColumn ? <th className="px-5 py-4">Employee</th> : null}
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Check In</th>
                  <th className="px-5 py-4">Check Out</th>
                  <th className="px-5 py-4">Work Mode</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rows.map((row) => (
                  <tr key={`${row.employeeEmail}-${row.date}`} className="transition hover:bg-white/[0.035]">
                    {showEmployeeColumn ? (
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">{row.employeeName}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.employeeEmail}</p>
                      </td>
                    ) : null}
                    <td className="px-5 py-4 text-sm text-slate-300">{formatShortDate(row.date)}</td>
                    <td className="px-5 py-4 text-sm text-slate-300">{row.checkIn ?? '--'}</td>
                    <td className="px-5 py-4 text-sm text-slate-300">{row.checkOut ?? '--'}</td>
                    <td className="px-5 py-4 text-sm text-slate-300">{row.workMode}</td>
                    <td className="px-5 py-4">
                      <AttendanceStatus status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

const buildAttendanceRow = (person: UserProfile, record: AttendanceRecord): AttendanceRow => ({
  employeeName: person.name,
  employeeEmail: person.email,
  date: record.date,
  checkIn: record.checkIn,
  checkOut: record.checkOut,
  workMode: record.remote ? 'Remote' : person.workMode,
  status: getAttendanceStatus(record),
});

const buildAttendanceRowFromIndex = (record: AttendanceIndexRecord): AttendanceRow => ({
  employeeName: record.employeeName,
  employeeEmail: record.employeeEmail,
  date: record.date,
  checkIn: record.checkIn,
  checkOut: record.checkOut,
  workMode: record.workMode,
  status: getAttendanceStatus(record),
});

const toAttendanceIndexRecord = (profile: UserProfile, record: AttendanceRecord): AttendanceIndexRecord => ({
  id: `${profile.email}-${record.date}`,
  employeeName: profile.name,
  employeeEmail: profile.email,
  date: record.date,
  checkIn: record.checkIn,
  checkOut: record.checkOut,
  workMode: record.remote ? 'Remote' : profile.workMode,
  status: record.status,
});

const getAttendanceStatus = (record: Pick<AttendanceRecord, 'checkIn' | 'checkOut'>): AttendanceRow['status'] => {
  if (record.checkIn && record.checkOut) return 'Present';
  if (record.checkIn) return 'Active';
  return 'Absent';
};

const statusClass: Record<AttendanceRow['status'], string> = {
  Present: 'bg-emerald-500/12 text-emerald-300 ring-emerald-400/25',
  Active: 'bg-accent-500/12 text-accent-300 ring-accent-400/25',
  Absent: 'bg-slate-500/16 text-slate-300 ring-slate-400/20',
};

const AttendanceStatus = ({ status }: { status: AttendanceRow['status'] }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClass[status]}`}>
    {status}
  </span>
);
