import { ArrowLeft, BriefcaseBusiness, Layers3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';

export const WorkspacePage = () => (
  <div className="space-y-6">
    <PageHeader
      eyebrow="OfficeOS Workspace"
      title="Workspace is under development"
      subtitle="OfficeOS Workspace is being developed as a separate collaboration module. It will include team presence, internal communication, groups, and company workspace tools."
    />

    <section className="surface overflow-hidden">
      <div className="relative p-6 md:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-500/70 to-transparent" />
        <div className="grid gap-8 lg:grid-cols-[1fr_280px] lg:items-center">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-accent-500/30 bg-accent-500/10 text-accent-100 shadow-[0_0_28px_rgba(239,35,43,0.18)]">
              <Layers3 size={24} />
            </div>

            <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300">
              For this demo, core HR operations are fully available through Attendance, Leave, Reports,
              Announcements, and Employees.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/dashboard" className="btn-primary">
                <ArrowLeft size={18} />
                Back to Dashboard
              </Link>
            </div>
          </div>

          <aside className="rounded-lg border border-white/10 bg-black/35 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] text-accent-100">
                <BriefcaseBusiness size={20} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent-500">Demo Ready</p>
                <p className="mt-1 text-sm font-semibold text-white">HR operations</p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 text-sm text-slate-400">
              <span>Attendance</span>
              <span>Leave</span>
              <span>Reports</span>
              <span>Announcements</span>
              <span>Employees</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  </div>
);
