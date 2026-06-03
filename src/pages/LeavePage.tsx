import { CalendarDays } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Toast } from '../components/Toast';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type { LeaveRequest } from '../types';
import { formatShortDate } from '../utils/format';

const leaveTypes = ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Work From Home', 'Emergency Leave'];

const emptyForm = {
  leaveType: '',
  startDate: '',
  endDate: '',
  reason: '',
};

export const LeavePage = () => {
  const { profile } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [requests, setRequests] = useState<LeaveRequest[]>(() => storage.getLeaveRequests());
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const myRequests = useMemo(
    () =>
      profile
        ? requests.filter((request) =>
            request.employeeEmail ? request.employeeEmail === profile.email : request.employeeName === profile.name,
          )
        : [],
    [profile, requests],
  );

  if (!profile) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!form.leaveType || !form.startDate || !form.endDate || !form.reason.trim()) {
      setError('All fields are required.');
      return;
    }

    if (form.endDate < form.startDate) {
      setError('End date cannot be before start date.');
      return;
    }

    const request: LeaveRequest = {
      id: crypto.randomUUID(),
      employeeName: profile.name,
      employeeEmail: profile.email,
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason.trim(),
      status: 'Pending',
      submittedAt: new Date().toISOString(),
    };

    const nextRequests = [request, ...requests];
    setRequests(nextRequests);
    storage.setLeaveRequests(nextRequests);
    setForm(emptyForm);
    setToast('Leave request submitted');
    window.setTimeout(() => setToast(''), 2200);
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}
      <PageHeader
        eyebrow="Leave Requests"
        title="Apply for Leave"
        subtitle="Submit a leave request and track review status from the HR team."
      />

      <form onSubmit={submit} className="surface max-w-4xl p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Leave Type</span>
            <select
              className="field"
              value={form.leaveType}
              onChange={(event) => setForm({ ...form, leaveType: event.target.value })}
              required
            >
              <option value="">Select leave type</option>
              {leaveTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Start Date</span>
            <input
              className="field"
              type="date"
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              required
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">End Date</span>
            <input
              className="field"
              type="date"
              min={form.startDate || undefined}
              value={form.endDate}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              required
            />
          </label>
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-300">Reason</span>
            <textarea
              className="field min-h-32 resize-y"
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
              required
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn-primary mt-6">
          <CalendarDays size={18} />
          Submit Leave Request
        </button>
      </form>

      <section>
        <h3 className="text-xl font-semibold text-white">My Leave Requests</h3>
        <div className="mt-4 grid gap-4">
          {myRequests.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No leave requests submitted yet"
              description="Your submitted leave applications and review statuses will appear here."
            />
          ) : (
            myRequests.map((request) => (
              <article key={request.id} className="surface p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h4 className="font-semibold text-white">{request.leaveType}</h4>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatLeaveRange(request)}
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-400">{request.reason || 'No reason provided.'}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

const formatLeaveRange = (request: LeaveRequest) => {
  const startDate = request.startDate || request.date;
  const endDate = request.endDate || request.date;

  if (!startDate) return 'Date not available';
  if (!endDate || startDate === endDate) return formatShortDate(startDate);
  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
};
