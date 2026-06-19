import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import type { SlaReport, Subscription } from '../types';
import { formatShortDate } from '../utils/format';
import { ReportDetailModal } from './ReportDetailModal';
import { SlaReportStatusPill } from './SlaReportStatusPill';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

export const ReportsTab = ({
  subscription,
  clientName,
  currentUser,
  canEdit,
  onToast,
  onGoToEngagement,
}: {
  subscription: Subscription;
  clientName: string;
  currentUser: { id: string; name: string };
  canEdit: boolean;
  onToast: (message: string) => void;
  onGoToEngagement: () => void;
}) => {
  const [reports, setReports] = useState<SlaReport[] | null>(null);
  // 'new' opens a blank draft; a SlaReport opens that existing report.
  const [open, setOpen] = useState<'new' | SlaReport | null>(null);

  useEffect(() => {
    const unsubscribe = crm.subscribeToReportsForSubscription(
      companyId,
      subscription.clientId,
      subscription.id,
      setReports,
    );
    return unsubscribe;
  }, [subscription.clientId, subscription.id]);

  if (!reports) {
    return <p className="py-8 text-center text-sm text-[color:var(--color-text-muted)]">Loading reports…</p>;
  }

  return (
    <div className="space-y-4">
      {canEdit ? (
        <div className="flex justify-end">
          <button type="button" className="btn-primary" onClick={() => setOpen('new')}>
            <Plus size={16} />
            New Report
          </button>
        </div>
      ) : null}

      {reports.length === 0 ? (
        <p className="py-8 text-center text-sm text-[color:var(--color-text-muted)]">
          No reports yet. Create the first SLA report for this subscription.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[color:var(--color-border-weak)] text-xs uppercase tracking-[0.12em] text-[color:var(--color-text-muted)]">
                <th className="py-2 pr-4 font-semibold">Period</th>
                <th className="py-2 pr-4 font-semibold">Date Range</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 pr-4 font-semibold">Sent At</th>
                <th className="py-2 pr-4 font-semibold">Sent By</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr
                  key={report.id}
                  onClick={() => setOpen(report)}
                  className="cursor-pointer border-b border-[color:var(--color-border-weak)] transition hover:bg-[var(--color-fill-055)]"
                >
                  <td className="py-3 pr-4 font-medium text-[color:var(--color-text-secondary)]">{report.period}</td>
                  <td className="py-3 pr-4 text-[color:var(--color-text-secondary)]">
                    {formatShortDate(report.periodStart)} – {formatShortDate(report.periodEnd)}
                  </td>
                  <td className="py-3 pr-4">
                    <SlaReportStatusPill status={report.status} />
                  </td>
                  <td className="py-3 pr-4 text-[color:var(--color-text-muted)]">
                    {report.sentAt ? formatShortDate(report.sentAt) : '—'}
                  </td>
                  <td className="py-3 pr-4 text-[color:var(--color-text-muted)]">{report.sentByNameSnapshot ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open ? (
        <ReportDetailModal
          report={open === 'new' ? null : open}
          subscription={subscription}
          clientName={clientName}
          currentUser={currentUser}
          canEdit={canEdit}
          onClose={() => setOpen(null)}
          onToast={onToast}
          onGoToEngagement={() => {
            setOpen(null);
            onGoToEngagement();
          }}
        />
      ) : null}
    </div>
  );
};
