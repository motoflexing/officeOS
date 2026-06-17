import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { ReportForm, type ReportDraft } from '../components/ReportForm';
import { StatusBadge } from '../components/StatusBadge';
import { Toast } from '../components/Toast';
import { firestoreService } from '../services/firestoreService';
import { isFirebaseConfigured } from '../services/firebase';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type { DailyReport, ReportStatus } from '../types';
import { formatShortDate } from '../utils/format';

const reportStatuses: Array<ReportStatus | 'All'> = ['All', 'Submitted', 'Reviewed'];

export const ReportsPage = () => {
  const { profile, role } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>(() => sortReports(storage.getReports().map(normalizeReport)));
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'All'>('All');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    firestoreService
      .getReports()
      .then((reports) => setReports(sortReports(reports.map(normalizeReport))))
      .catch((error) => setToast(error instanceof Error ? error.message : 'Unable to load reports.'))
      .finally(() => setLoading(false));
  }, []);

  if (!profile) return null;

  const currentRole = role ?? profile.role;
  const canSubmit = currentRole === 'Employee';
  const canReview = currentRole === 'Admin' || currentRole === 'HR';

  const addReport = async (draft: ReportDraft) => {
    const now = new Date().toISOString();
    const nextReport: DailyReport = {
      id: crypto.randomUUID(),
      employeeName: profile.name,
      employeeEmail: profile.email,
      date: now.slice(0, 10),
      status: 'Submitted',
      createdAt: now,
      ...draft,
    };
    try {
      if (isFirebaseConfigured) {
        await firestoreService.addReport(nextReport);
      }
      const nextReports = sortReports([nextReport, ...reports]);
      setReports(nextReports);
      if (!isFirebaseConfigured) {
        storage.setReports(nextReports);
      }
      setToast('Daily report submitted');
      window.setTimeout(() => setToast(''), 2400);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to submit report.');
      window.setTimeout(() => setToast(''), 2400);
    }
  };

  const markReviewed = async (reportId: string) => {
    const now = new Date().toISOString();
    const reviewedReport = reports.find((report) => report.id === reportId);
    if (!reviewedReport) return;

    const nextReport = {
      ...normalizeReport(reviewedReport),
      status: 'Reviewed' as const,
      reviewedBy: profile.name,
      reviewedAt: now,
    };
    const nextReports = reports.map((report) =>
      report.id === reportId ? nextReport : normalizeReport(report),
    );
    try {
      if (isFirebaseConfigured) {
        await firestoreService.updateReport(nextReport);
      }
      setReports(nextReports);
      if (!isFirebaseConfigured) {
        storage.setReports(nextReports);
      }
      setToast('Report marked as reviewed');
      window.setTimeout(() => setToast(''), 2400);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to review report.');
      window.setTimeout(() => setToast(''), 2400);
    }
  };

  const scopedReports =
    currentRole === 'Employee'
      ? reports.filter((report) => {
          const normalized = normalizeReport(report);
          return normalized.employeeEmail
            ? normalized.employeeEmail === profile.email
            : normalized.author === profile.name;
        })
      : reports;

  const visibleReports = scopedReports.filter((report) => {
    const normalized = normalizeReport(report);
    const searchText = `${normalized.employeeName} ${normalized.employeeEmail}`.toLowerCase();
    const matchesSearch = !query.trim() || searchText.includes(query.trim().toLowerCase());
    const matchesDate = !dateFilter || toDateKey(normalized.date) === dateFilter;
    const matchesStatus = statusFilter === 'All' || normalized.status === statusFilter;
    return matchesSearch && matchesDate && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}
      <PageHeader
        eyebrow="Daily reporting"
        title="Daily Report"
        subtitle={
          canReview
            ? 'Review submitted employee reports and track follow-up status.'
            : 'Submit your daily work summary and keep your team aligned.'
        }
      />

      {canSubmit ? <ReportForm onSubmit={addReport} /> : null}

      {canReview ? (
        <section className="surface p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Search Employee</span>
              <input
                className="field"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name or email"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Date</span>
              <input
                className="field"
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Status</span>
              <select
                className="field"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ReportStatus | 'All')}
              >
                {reportStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="text-xl font-semibold text-[color:var(--color-text-primary)]">Recent Reports</h3>
        <div className="mt-4 grid gap-4">
          {loading ? (
            <EmptyState icon={FileText} title="Loading reports" description="Fetching daily reports." />
          ) : visibleReports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={reports.length === 0 ? 'No reports yet' : 'No reports match the filters'}
              description={
                reports.length === 0
                  ? canSubmit
                    ? 'Submit your first daily report to start building report history.'
                    : 'Employee reports will appear here once submitted.'
                  : 'Try adjusting the employee, date, or status filters.'
              }
            />
          ) : (
            visibleReports.map((rawReport) => {
              const report = normalizeReport(rawReport);
              return (
              <article key={report.id} className="surface p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-[var(--color-accent-10)] p-2.5 text-[color:var(--color-accent)]">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[color:var(--color-text-primary)]">{report.employeeName}</h4>
                      <p className="text-xs text-[color:var(--color-text-muted)]">
                        {report.employeeEmail ? `${report.employeeEmail} | ` : ''}
                        {formatReportDate(report.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={report.status} />
                    {canReview && report.status === 'Submitted' ? (
                      <button type="button" className="btn-secondary py-2" onClick={() => markReviewed(report.id)}>
                        Mark Reviewed
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <ReportBlock title="Tasks Completed" value={report.tasksCompleted} />
                  <ReportBlock title="Work In Progress" value={report.tasksInProgress} />
                  <ReportBlock title="Blockers" value={report.blockers || 'None'} />
                  <ReportBlock title="Plan for Tomorrow" value={report.nextPlan} />
                </div>
                {report.status === 'Reviewed' ? (
                  <p className="mt-5 text-xs text-[color:var(--color-text-muted)]">
                    Reviewed by {report.reviewedBy || 'HR/Admin'}
                    {report.reviewedAt ? ` on ${formatDateTime(report.reviewedAt)}` : ''}
                  </p>
                ) : null}
              </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

const ReportBlock = ({ title, value, wide }: { title: string; value: string; wide?: boolean }) => (
  <div className={wide ? 'md:col-span-2' : ''}>
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-text-muted)]">{title}</p>
    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--color-text-secondary)]">{value || '-'}</p>
  </div>
);

const normalizeReport = (report: DailyReport): DailyReport => {
  const createdAt = report.createdAt || report.date || new Date().toISOString();

  return {
    id: report.id,
    employeeName: report.employeeName || report.author || 'Unknown Employee',
    employeeEmail: report.employeeEmail || '',
    date: report.date || createdAt.slice(0, 10),
    tasksCompleted: report.tasksCompleted ?? report.completedTasks ?? '',
    tasksInProgress: report.tasksInProgress ?? report.workInProgress ?? '',
    blockers: report.blockers ?? '',
    nextPlan: report.nextPlan ?? report.plannedTasks ?? report.learnings ?? '',
    status: report.status || 'Submitted',
    reviewedBy: report.reviewedBy,
    reviewedAt: report.reviewedAt,
    createdAt,
    plannedTasks: report.plannedTasks,
    completedTasks: report.completedTasks,
    workInProgress: report.workInProgress,
    learnings: report.learnings,
    author: report.author,
  };
};

const sortReports = (reports: DailyReport[]) =>
  reports
    .map(normalizeReport)
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());

const toDateKey = (date: string) => date.slice(0, 10);

const formatReportDate = (date: string) => {
  if (!date) return 'Date not available';
  return formatShortDate(date);
};

const formatDateTime = (dateTime: string) => {
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return dateTime;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};
