import { Check, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import type { ReportPeriod, SlaReport, StandardMetrics, Subscription } from '../types';
import { formatShortDate } from '../utils/format';
import { SlaReportStatusPill } from './SlaReportStatusPill';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

const PERIODS: ReportPeriod[] = ['Weekly', 'Monthly', 'Custom'];

// The 6 standard metrics — single source of truth for the edit grid, the preview
// block, and the Copy-as-HTML export. `unit` is appended to displayed values.
const STANDARD_FIELDS: { key: keyof StandardMetrics; label: string; unit?: string }[] = [
  { key: 'firstResponseTimeAvgMinutes', label: 'First Response Time', unit: ' min' },
  { key: 'ticketsHandled', label: 'Tickets Handled' },
  { key: 'resolutionRatePercent', label: 'Resolution Rate', unit: '%' },
  { key: 'csatScorePercent', label: 'CSAT Score', unit: '%' },
  { key: 'escalationCount', label: 'Escalation Count' },
  { key: 'slaBreachCount', label: 'SLA Breach Count' },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

const formatMetricValue = (value: number | undefined, unit?: string) =>
  value === undefined || value === null ? '—' : `${value.toLocaleString()}${unit ?? ''}`;

// Build a self-contained, inline-styled HTML snippet (email-ready, no external CSS).
const buildReportHtml = (
  report: SlaReport,
  subscription: Subscription,
  clientName: string,
): string => {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const planLabel = subscription.planNameSnapshot ?? (subscription.planId ? '—' : 'Custom');
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#666">${esc(label)}</td><td style="padding:6px 0;text-align:right;font-weight:600">${esc(
      value,
    )}</td></tr>`;

  const standardRows = STANDARD_FIELDS.map((field) =>
    row(field.label, formatMetricValue(report.standardMetrics?.[field.key], field.unit)),
  ).join('');

  const metrics = (subscription.customMetrics ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const customRows = metrics
    .map((metric) => {
      const value = report.customMetricValues?.[metric.id];
      return row(
        metric.unit ? `${metric.label} (${metric.unit})` : metric.label,
        value === undefined ? '—' : value.toLocaleString(),
      );
    })
    .join('');

  const customBlock = metrics.length
    ? `<h3 style="border-bottom:1px solid #eee;padding-bottom:6px;margin:24px 0 8px;font-size:15px">Custom KPIs</h3>
       <table style="width:100%;border-collapse:collapse;font-size:14px">${customRows}</table>`
    : '';

  const narrativeBlock = report.narrative
    ? `<h3 style="border-bottom:1px solid #eee;padding-bottom:6px;margin:24px 0 8px;font-size:15px">Narrative</h3>
       <p style="white-space:pre-wrap;font-size:14px;line-height:1.5;margin:0">${esc(report.narrative)}</p>`
    : '';

  const sentFooter =
    report.status === 'Sent' && report.sentAt
      ? `<p style="color:#999;font-size:12px;margin-top:24px">Sent on ${formatShortDate(report.sentAt)}${
          report.sentByNameSnapshot ? ` by ${esc(report.sentByNameSnapshot)}` : ''
        }</p>`
      : '';

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;color:#1a1a1a">
  <h2 style="margin:0 0 4px;font-size:20px">SLA Report — ${esc(report.period)} ending ${esc(
    formatShortDate(report.periodEnd),
  )}</h2>
  <p style="color:#666;margin:0 0 16px;font-size:14px">${esc(clientName)} · ${esc(
    subscription.teamLabel,
  )} · ${esc(planLabel)}</p>
  <p style="color:#666;margin:0 0 16px;font-size:13px">Period: ${esc(
    formatShortDate(report.periodStart),
  )} – ${esc(formatShortDate(report.periodEnd))}</p>
  <h3 style="border-bottom:1px solid #eee;padding-bottom:6px;margin:24px 0 8px;font-size:15px">Standard Metrics</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px">${standardRows}</table>
  ${customBlock}
  ${narrativeBlock}
  ${sentFooter}
</div>`;
};

export const ReportDetailModal = ({
  report,
  subscription,
  clientName,
  currentUser,
  canEdit,
  onClose,
  onToast,
  onGoToEngagement,
}: {
  // null report = creating a new draft. Otherwise editing/previewing an existing one.
  report: SlaReport | null;
  subscription: Subscription;
  clientName: string;
  currentUser: { id: string; name: string };
  canEdit: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
  // Jump to the Engagement tab (used by the "no custom KPIs" hint link).
  onGoToEngagement: () => void;
}) => {
  // Preview when the report is Sent OR the viewer is read-only (HR). Otherwise Edit.
  const isSent = report?.status === 'Sent';
  const [preview, setPreview] = useState(isSent || !canEdit);

  // Edit-mode local drafts.
  const [period, setPeriod] = useState<ReportPeriod>(report?.period ?? 'Monthly');
  const [periodStart, setPeriodStart] = useState(report?.periodStart ?? todayIso());
  const [periodEnd, setPeriodEnd] = useState(report?.periodEnd ?? todayIso());
  const [standard, setStandard] = useState<StandardMetrics>(report?.standardMetrics ?? {});
  const [customValues, setCustomValues] = useState<{ [id: string]: number }>(
    report?.customMetricValues ?? {},
  );
  const [narrative, setNarrative] = useState(report?.narrative ?? '');
  // The live report id — set after the first Save so subsequent saves update it.
  const [reportId, setReportId] = useState<string | null>(report?.id ?? null);
  // Hold a local copy of the report for preview rendering (so Mark-as-Sent can flip
  // the modal into preview without a parent round-trip).
  const [savedReport, setSavedReport] = useState<SlaReport | null>(report);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const metrics = useMemo(
    () => (subscription.customMetrics ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [subscription.customMetrics],
  );

  const setStandardField = (key: keyof StandardMetrics, raw: string) =>
    setStandard((prev) => ({ ...prev, [key]: raw === '' ? undefined : Number(raw) }));

  const setCustomField = (id: string, raw: string) =>
    setCustomValues((prev) => {
      const next = { ...prev };
      if (raw === '') delete next[id];
      else next[id] = Number(raw);
      return next;
    });

  // Strip undefined standard fields so we never persist empties.
  const cleanStandard = (): StandardMetrics =>
    Object.fromEntries(
      Object.entries(standard).filter(([, value]) => value !== undefined && !Number.isNaN(value as number)),
    ) as StandardMetrics;

  // Persist the current draft, creating on first save and updating thereafter.
  // Returns the up-to-date report so callers (Mark-as-Sent) can chain.
  const persist = async (): Promise<SlaReport | null> => {
    const payload = {
      period,
      periodStart,
      periodEnd,
      standardMetrics: cleanStandard(),
      customMetricValues: customValues,
      narrative: narrative.trim() || undefined,
    };
    if (reportId) {
      await crm.updateSlaReport(companyId, subscription.clientId, subscription.id, reportId, payload);
      const updated: SlaReport = { ...(savedReport as SlaReport), ...payload, id: reportId };
      setSavedReport(updated);
      return updated;
    }
    const created = await crm.createReport(companyId, subscription.clientId, subscription.id, {
      ...payload,
      status: 'Draft',
      createdBy: currentUser.id,
    });
    setReportId(created.id);
    setSavedReport(created);
    return created;
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await persist();
      onToast('Draft saved');
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Unable to save report.');
    } finally {
      setSaving(false);
    }
  };

  const markSent = async () => {
    setSaving(true);
    try {
      const saved = await persist();
      if (!saved) return;
      await crm.markReportSent(companyId, subscription.clientId, subscription.id, saved.id, currentUser.id);
      const now = new Date().toISOString();
      setSavedReport({
        ...saved,
        status: 'Sent',
        sentAt: now,
        sentBy: currentUser.id,
        sentByNameSnapshot: currentUser.name,
      });
      setPreview(true);
      onToast('Report marked as sent');
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Unable to mark report as sent.');
    } finally {
      setSaving(false);
    }
  };

  const copyAsHtml = async () => {
    if (!savedReport) return;
    try {
      await navigator.clipboard.writeText(buildReportHtml(savedReport, subscription, clientName));
      onToast('Report HTML copied to clipboard');
    } catch {
      onToast('Unable to copy to clipboard.');
    }
  };

  const planLabel = subscription.planNameSnapshot ?? (subscription.planId ? '—' : 'Custom');

  const header = preview
    ? savedReport
      ? `Report — ${savedReport.period} ending ${formatShortDate(savedReport.periodEnd)}`
      : 'Report'
    : report
      ? `Edit Report — ${period} ${formatShortDate(periodEnd)}`
      : 'New Report';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[var(--color-overlay-65)] px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="SLA report detail"
      onClick={onClose}
    >
      <div
        className="surface w-full max-w-2xl border-[color:var(--color-accent-30)] p-6 shadow-[var(--shadow-glow-44-18)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-[color:var(--color-text-primary)]">{header}</h2>
            {preview && savedReport ? (
              <div className="mt-2">
                <SlaReportStatusPill status={savedReport.status} />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5">
          {preview && savedReport ? (
            <PreviewBody report={savedReport} subscription={subscription} clientName={clientName} planLabel={planLabel} metrics={metrics} />
          ) : (
            <div className="space-y-6">
              {/* Period */}
              <section>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-accent)]">Period</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Period</span>
                    <select
                      className="field"
                      value={period}
                      onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
                    >
                      {PERIODS.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Period Start</span>
                    <input
                      className="field"
                      type="date"
                      value={periodStart}
                      onChange={(event) => setPeriodStart(event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Period End</span>
                    <input
                      className="field"
                      type="date"
                      value={periodEnd}
                      onChange={(event) => setPeriodEnd(event.target.value)}
                    />
                  </label>
                </div>
              </section>

              {/* Standard Metrics */}
              <section>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-accent)]">Standard Metrics</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {STANDARD_FIELDS.map((field) => (
                    <label key={field.key} className="block">
                      <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">{field.label}</span>
                      <input
                        className="field"
                        type="number"
                        value={standard[field.key] ?? ''}
                        onChange={(event) => setStandardField(field.key, event.target.value)}
                        placeholder="—"
                      />
                    </label>
                  ))}
                </div>
              </section>

              {/* Custom KPIs */}
              <section>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-accent)]">Custom KPIs</h4>
                {metrics.length === 0 ? (
                  <p className="text-sm text-[color:var(--color-text-muted)]">
                    No custom KPIs defined. Add some in the{' '}
                    <button
                      type="button"
                      onClick={onGoToEngagement}
                      className="font-medium text-[color:var(--color-accent)] underline-offset-2 hover:underline"
                    >
                      Engagement tab
                    </button>{' '}
                    to track them here.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {metrics.map((metric) => (
                      <label key={metric.id} className="block">
                        <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">
                          {metric.label}
                          {metric.unit ? <span className="text-[color:var(--color-text-muted)]"> ({metric.unit})</span> : null}
                        </span>
                        <input
                          className="field"
                          type="number"
                          value={customValues[metric.id] ?? ''}
                          onChange={(event) => setCustomField(metric.id, event.target.value)}
                          placeholder="—"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </section>

              {/* Narrative */}
              <section>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-accent)]">Narrative</h4>
                <textarea
                  className="field min-h-[220px]"
                  value={narrative}
                  onChange={(event) => setNarrative(event.target.value)}
                  placeholder="Summary of the period — wins, issues, recommendations..."
                />
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--color-border-weak)] pt-4">
          {preview ? (
            <>
              <button type="button" className="btn-secondary" onClick={copyAsHtml}>
                Copy as HTML
              </button>
              <button type="button" className="btn-primary" onClick={onClose}>
                Close
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn-secondary" onClick={() => void saveDraft()} disabled={saving}>
                Save Draft
              </button>
              <button type="button" className="btn-primary" onClick={() => void markSent()} disabled={saving}>
                <Check size={16} />
                Mark as Sent
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const PreviewBody = ({
  report,
  subscription,
  clientName,
  planLabel,
  metrics,
}: {
  report: SlaReport;
  subscription: Subscription;
  clientName: string;
  planLabel: string;
  metrics: { id: string; label: string; unit?: string; sortOrder: number }[];
}) => (
  <div className="space-y-6">
    <div>
      <p className="text-sm font-medium text-[color:var(--color-text-soft)]">{clientName}</p>
      <p className="text-sm text-[color:var(--color-text-muted)]">
        {subscription.teamLabel} · {planLabel}
      </p>
    </div>

    <PreviewGroup title="Period">
      <PreviewRow label="Range" value={`${formatShortDate(report.periodStart)} – ${formatShortDate(report.periodEnd)}`} />
      <PreviewRow label="Type" value={report.period} />
    </PreviewGroup>

    <PreviewGroup title="Standard Metrics">
      {STANDARD_FIELDS.map((field) => (
        <PreviewRow
          key={field.key}
          label={field.label}
          value={formatMetricValue(report.standardMetrics?.[field.key], field.unit)}
        />
      ))}
    </PreviewGroup>

    {metrics.length ? (
      <PreviewGroup title="Custom KPIs">
        {metrics.map((metric) => (
          <PreviewRow
            key={metric.id}
            label={metric.unit ? `${metric.label} (${metric.unit})` : metric.label}
            value={
              report.customMetricValues?.[metric.id] === undefined
                ? '—'
                : report.customMetricValues[metric.id].toLocaleString()
            }
          />
        ))}
      </PreviewGroup>
    ) : null}

    {report.narrative ? (
      <section>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-accent)]">Narrative</h4>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--color-text-secondary)]">
          {report.narrative}
        </p>
      </section>
    ) : null}

    {report.status === 'Sent' && report.sentAt ? (
      <p className="text-xs text-[color:var(--color-text-muted)]">
        Sent on {formatShortDate(report.sentAt)}
        {report.sentByNameSnapshot ? ` by ${report.sentByNameSnapshot}` : ''}
      </p>
    ) : null}
  </div>
);

const PreviewGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-accent)]">{title}</h4>
    <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">{children}</dl>
  </section>
);

const PreviewRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-2">
    <dt className="text-[color:var(--color-text-muted)]">{label}</dt>
    <dd className="font-medium text-[color:var(--color-text-secondary)]">{value}</dd>
  </div>
);
