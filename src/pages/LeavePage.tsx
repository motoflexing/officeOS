import { CalendarDays } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Toast } from '../components/Toast';
import { companyId, auth, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type { LeaveRequest, LeaveStatus, UserProfile } from '../types';
import { canReviewLeaveRequest, getLeaveReviewTitle, getOwnLeaveRequests, getReviewLeaveRequests } from '../utils/leaveWorkflow';
import { formatShortDate } from '../utils/format';

const leaveTypes = ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Work From Home', 'Emergency Leave'];

const emptyForm = {
  leaveType: '',
  startDate: '',
  endDate: '',
  reason: '',
};

export const LeavePage = () => {
  const { profile, role } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [ownRequests, setOwnRequests] = useState<LeaveRequest[]>([]);
  const [reviewRequests, setReviewRequests] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(isFirebaseConfigured);

  const currentRole = role ?? profile?.role;
  const canSubmitLeave = currentRole === 'HR' || currentRole === 'Employee';
  const canReviewLeave = currentRole === 'Admin' || currentRole === 'HR';

  useEffect(() => {
    if (!profile || !currentRole) return;

    const loadLeaveRequests = async () => {
      setLoading(true);
      setError('');

      try {
        if (isFirebaseConfigured) {
          const [own, review] = await Promise.all([
            canSubmitLeave ? firestoreService.getOwnLeaveRequests(profile) : Promise.resolve([]),
            canReviewLeave ? firestoreService.getReviewLeaveRequests(currentRole) : Promise.resolve([]),
          ]);
          setOwnRequests(getOwnLeaveRequests(own, profile));
          setReviewRequests(getReviewLeaveRequests(review, currentRole));
          return;
        }

        const storedRequests = storage.getLeaveRequests();
        setOwnRequests(canSubmitLeave ? getOwnLeaveRequests(storedRequests, profile) : []);
        setReviewRequests(canReviewLeave ? getReviewLeaveRequests(storedRequests, currentRole) : []);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unable to load leave requests.');
      } finally {
        setLoading(false);
      }
    };

    void loadLeaveRequests();
  }, [canReviewLeave, canSubmitLeave, currentRole, profile]);

  const pageCopy = useMemo(() => {
    if (currentRole === 'Admin') {
      return {
        title: 'HR Leave Requests',
        subtitle: 'Review leave requests submitted by HR users. Admin leave requests are not submitted from OfficeOS.',
      };
    }
    if (currentRole === 'HR') {
      return {
        title: 'Leave Requests',
        subtitle: 'Submit your own leave request for Admin review and manage Employee leave requests.',
      };
    }
    return {
      title: 'Apply for Leave',
      subtitle: 'Submit a leave request and track review status from the HR team.',
    };
  }, [currentRole]);

  if (!profile || !currentRole) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!canSubmitLeave) return;

    if (!form.leaveType || !form.startDate || !form.endDate || !form.reason.trim()) {
      setError('All fields are required.');
      return;
    }

    if (form.endDate < form.startDate) {
      setError('End date cannot be before start date.');
      return;
    }

    const now = new Date().toISOString();
    const request: LeaveRequest = {
      id: crypto.randomUUID(),
      employeeName: profile.name,
      employeeEmail: profile.email,
      requesterId: auth?.currentUser?.uid || profile.email,
      requesterName: profile.name,
      requesterEmail: profile.email,
      requesterRole: profile.role,
      companyId,
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason.trim(),
      status: 'Pending',
      submittedAt: now,
      createdAt: now,
    };

    try {
      if (isFirebaseConfigured) {
        await firestoreService.addLeaveRequest(request);
      } else {
        storage.setLeaveRequests([request, ...storage.getLeaveRequests()]);
      }
      setOwnRequests((requests) => getOwnLeaveRequests([request, ...requests], profile));
      setForm(emptyForm);
      setToast('Leave request submitted');
      window.setTimeout(() => setToast(''), 2200);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to submit leave request.');
    }
  };

  const updateLeave = async (request: LeaveRequest, status: LeaveStatus) => {
    if (!canReviewLeaveRequest(request, profile)) return;

    const reviewedAt = new Date().toISOString();
    try {
      if (isFirebaseConfigured) {
        await firestoreService.updateLeaveRequestStatus(request.id, status, profile.name);
      }

      const updateRequest = (item: LeaveRequest) =>
        item.id === request.id ? { ...item, status, reviewedBy: profile.name, reviewedAt } : item;
      setReviewRequests((requests) => requests.map(updateRequest));

      if (!isFirebaseConfigured) {
        storage.setLeaveRequests(storage.getLeaveRequests().map(updateRequest));
      }

      setToast(`Leave request ${status.toLowerCase()}`);
      window.setTimeout(() => setToast(''), 2200);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to update leave request.');
      window.setTimeout(() => setToast(''), 2200);
    }
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}
      <PageHeader eyebrow="Leave Requests" title={pageCopy.title} subtitle={pageCopy.subtitle} />

      {canSubmitLeave ? (
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
      ) : error ? (
        <p className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {canSubmitLeave ? (
        <LeaveRequestSection
          emptyDescription="Your submitted leave applications and review statuses will appear here."
          emptyTitle="No leave requests submitted yet"
          loading={loading}
          requests={ownRequests}
          title="My Leave Requests"
        />
      ) : null}

      {canReviewLeave ? (
        <LeaveRequestSection
          emptyDescription={
            currentRole === 'Admin'
              ? 'HR leave applications will appear here for Admin review.'
              : 'Employee leave applications will appear here for HR review.'
          }
          emptyTitle={currentRole === 'Admin' ? 'No HR leave requests yet' : 'No employee leave requests yet'}
          loading={loading}
          onUpdate={updateLeave}
          requests={reviewRequests}
          reviewer={profile}
          title={getLeaveReviewTitle(currentRole)}
        />
      ) : null}
    </div>
  );
};

const LeaveRequestSection = ({
  emptyDescription,
  emptyTitle,
  loading,
  onUpdate,
  requests,
  reviewer,
  title,
}: {
  emptyDescription: string;
  emptyTitle: string;
  loading: boolean;
  onUpdate?: (request: LeaveRequest, status: LeaveStatus) => void | Promise<void>;
  requests: LeaveRequest[];
  reviewer?: UserProfile;
  title: string;
}) => (
  <section>
    <h3 className="text-xl font-semibold text-white">{title}</h3>
    <div className="mt-4 grid gap-4">
      {loading ? (
        <EmptyState icon={CalendarDays} title="Loading leave requests" description="Fetching leave request records." />
      ) : requests.length === 0 ? (
        <EmptyState icon={CalendarDays} title={emptyTitle} description={emptyDescription} />
      ) : (
        requests.map((request) => {
          const showActions = Boolean(onUpdate && reviewer && request.status === 'Pending' && canReviewLeaveRequest(request, reviewer));

          return (
            <article key={request.id} className="surface p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h4 className="font-semibold text-white">{request.leaveType}</h4>
                  <p className="mt-1 text-sm text-slate-400">{formatLeaveRange(request)}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {request.requesterName || request.employeeName}
                    {request.requesterRole ? ` | ${request.requesterRole}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={request.status} />
                  {showActions ? (
                    <>
                      <button type="button" className="btn-secondary py-2" onClick={() => onUpdate?.(request, 'Approved')}>
                        Approve
                      </button>
                      <button type="button" className="btn-secondary py-2" onClick={() => onUpdate?.(request, 'Rejected')}>
                        Reject
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                {request.reason || 'No reason provided.'}
              </p>
            </article>
          );
        })
      )}
    </div>
  </section>
);

const formatLeaveRange = (request: LeaveRequest) => {
  const startDate = request.startDate || request.date;
  const endDate = request.endDate || request.date;

  if (!startDate) return 'Date not available';
  if (!endDate || startDate === endDate) return formatShortDate(startDate);
  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
};
