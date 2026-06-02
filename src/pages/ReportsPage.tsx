import { FileText } from 'lucide-react';
import { useState } from 'react';
import { ReportForm } from '../components/ReportForm';
import { Toast } from '../components/Toast';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type { DailyReport } from '../types';
import { formatShortDate } from '../utils/format';

export const ReportsPage = () => {
  const { profile } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>(() => storage.getReports());
  const [toast, setToast] = useState('');

  if (!profile) return null;

  const addReport = (draft: Omit<DailyReport, 'id' | 'date' | 'author'>) => {
    const nextReport: DailyReport = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      author: profile.name,
      ...draft,
    };
    const nextReports = [nextReport, ...reports];
    setReports(nextReports);
    storage.setReports(nextReports);
    setToast('Daily report submitted');
    window.setTimeout(() => setToast(''), 2400);
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">Daily reporting</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Daily Report</h2>
      </div>

      <ReportForm onSubmit={addReport} />

      <section>
        <h3 className="text-xl font-semibold text-white">Recent Reports</h3>
        <div className="mt-4 grid gap-4">
          {reports.length === 0 ? (
            <div className="surface p-6 text-sm text-slate-400">No reports yet. Submit your first EOD update above.</div>
          ) : (
            reports.map((report) => (
              <article key={report.id} className="surface p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-accent-500/10 p-2.5 text-accent-500">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{report.author}</h4>
                      <p className="text-xs text-slate-500">{formatShortDate(report.date)}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <ReportBlock title="Planned Tasks" value={report.plannedTasks} />
                  <ReportBlock title="Completed Tasks" value={report.completedTasks} />
                  <ReportBlock title="Work In Progress" value={report.workInProgress} />
                  <ReportBlock title="Blockers" value={report.blockers || 'None'} />
                  <ReportBlock title="Learnings" value={report.learnings} wide />
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

const ReportBlock = ({ title, value, wide }: { title: string; value: string; wide?: boolean }) => (
  <div className={wide ? 'md:col-span-2' : ''}>
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{value}</p>
  </div>
);
