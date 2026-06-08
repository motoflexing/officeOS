import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Circle,
  Gauge,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  Search,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  UserRound,
  Wrench,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import type { FeedbackItem, FeedbackModule, FeedbackPriority, FeedbackStatus, FeedbackType } from '../types';

const statusOptions: Array<'All Status' | FeedbackStatus> = [
  'All Status',
  'New',
  'Reviewed',
  'Planned',
  'In Progress',
  'Fixed',
  'Rejected',
];
const priorityOptions: Array<'All Priority' | FeedbackPriority> = ['All Priority', 'Low', 'Medium', 'High', 'Critical'];
const typeOptions: Array<'All Type' | FeedbackType> = [
  'All Type',
  'Bug',
  'Feature Request',
  'UI/UX Improvement',
  'Workflow Issue',
  'Other',
];
const moduleOptions: Array<'All Modules' | FeedbackModule> = [
  'All Modules',
  'Dashboard',
  'Employees',
  'Attendance',
  'Leave',
  'Reports',
  'Announcements',
  'Settings',
  'HR/ATS',
  'Auth',
  'Login/Auth',
  'Profile',
  'Developer Panel',
  'Other',
];

const sidebarItems = [
  { label: 'Dashboard', icon: LayoutDashboard, enabled: true },
  { label: 'Feedbacks', icon: MessageSquare, enabled: true },
  { label: 'Analytics', icon: BarChart3, enabled: false },
  { label: 'Modules', icon: Package, enabled: false },
  { label: 'Settings', icon: Settings, enabled: false },
  { label: 'Account', icon: UserRound, enabled: false },
];

export const DeveloperPanelPage = () => {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState('Dashboard');
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>('All Status');
  const [priorityFilter, setPriorityFilter] = useState<(typeof priorityOptions)[number]>('All Priority');
  const [typeFilter, setTypeFilter] = useState<(typeof typeOptions)[number]>('All Type');
  const [moduleFilter, setModuleFilter] = useState<(typeof moduleOptions)[number]>('All Modules');
  const [query, setQuery] = useState('');

  useEffect(() => {
    firestoreService
      .getAllFeedbackForDeveloper()
      .then((items) => setFeedback(items.map(normalizeFeedbackItem)))
      .catch((error) => setError(getFeedbackLoadError(error)))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const normalized = feedback.map(normalizeFeedbackItem);
    return {
      total: normalized.length,
      newItems: normalized.filter((item) => item.status === 'New').length,
      highPriority: normalized.filter((item) => item.priority === 'High' || item.priority === 'Critical').length,
      resolved: normalized.filter((item) => item.status === 'Fixed').length,
      inProgress: normalized.filter((item) => item.status === 'In Progress').length,
    };
  }, [feedback]);

  const filteredFeedback = useMemo(
    () =>
      feedback
        .map(normalizeFeedbackItem)
        .filter((item) => {
          const searchText = `${item.title} ${item.description} ${item.submittedByName} ${item.submittedByEmail}`
            .toLowerCase()
            .trim();
          const matchesSearch = !query.trim() || searchText.includes(query.trim().toLowerCase());
          const matchesStatus = statusFilter === 'All Status' || item.status === statusFilter;
          const matchesPriority = priorityFilter === 'All Priority' || item.priority === priorityFilter;
          const matchesType = typeFilter === 'All Type' || item.type === typeFilter;
          const matchesModule = moduleFilter === 'All Modules' || item.relatedModule === moduleFilter;
          return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesModule;
        }),
    [feedback, moduleFilter, priorityFilter, query, statusFilter, typeFilter],
  );

  const logout = async () => {
    if (auth) await signOut(auth);
    navigate('/developer-login');
  };

  const updateStatus = async (item: FeedbackItem, status: FeedbackStatus) => {
    setUpdatingId(item.id);
    setError('');
    try {
      await firestoreService.updateFeedbackStatus(item.path || item.id, status);
      setFeedback((items) =>
        items.map((current) =>
          current.id === item.id ? normalizeFeedbackItem({ ...current, status, updatedAt: new Date().toISOString() }) : current,
        ),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update feedback status.');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <main className="min-h-screen max-w-full overflow-x-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed -left-32 -top-32 h-[30rem] w-[30rem] rounded-full bg-accent-500/14 blur-[140px]" />
      <div className="pointer-events-none fixed bottom-0 left-0 h-72 w-72 rounded-full bg-red-950/24 blur-[120px]" />
      <div className="grid min-h-screen max-w-full overflow-x-hidden lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)]">
        <aside className="relative flex min-w-0 flex-col border-b border-white/10 bg-black/45 px-3 py-4 backdrop-blur-xl lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 px-2 pb-5">
            <MFLogo />
            <div>
              <p className="text-sm font-semibold text-white">OfficeOS</p>
              <p className="text-xs text-slate-500">Developer Console</p>
            </div>
          </div>

          <nav className="space-y-1.5 border-t border-white/10 pt-4">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={!item.enabled}
                onClick={() => setActiveItem(item.label)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition ${
                  activeItem === item.label
                    ? 'border-white/10 bg-white/[0.10] text-white shadow-[0_0_30px_rgba(226,232,240,0.05)]'
                    : item.enabled
                      ? 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.045] hover:text-white'
                      : 'cursor-not-allowed border-transparent text-slate-600'
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {!item.enabled ? <span className="ml-auto text-[10px] uppercase tracking-[0.12em]">Soon</span> : null}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={logout}
            className="mt-6 flex w-full items-center gap-3 rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:border-accent-500/40 hover:bg-accent-500/10 hover:text-white lg:mt-auto"
          >
            <LogOut size={18} />
            Logout
          </button>
        </aside>

        <section className="relative min-w-0 overflow-x-hidden px-3 py-4 md:px-5">
          <header className="flex min-w-0 flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-white">Developer Panel</h1>
              <p className="mt-1 text-sm text-slate-500">Feedback & Improvement Center</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/30 py-1 pl-1 pr-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/35 text-xs font-semibold text-white">
                  MF
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">MF Developer</p>
                  <p className="text-xs text-slate-500">Administrator</p>
                </div>
                <ChevronDown size={15} className="text-slate-500" />
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-accent-500/40 hover:bg-accent-500/10 hover:text-white"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          </header>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            <DeveloperStat title="Total Feedback" value={stats.total} icon={MessageSquare} />
            <DeveloperStat title="New" value={stats.newItems} icon={Circle} />
            <DeveloperStat title="High Priority" value={stats.highPriority} icon={ShieldAlert} />
            <DeveloperStat title="Resolved" value={stats.resolved} icon={CheckCircle2} />
            <DeveloperStat title="In Progress" value={stats.inProgress} icon={Gauge} />
          </div>

          <section className="mt-5 max-w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 border-b border-white/10 p-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Recent Feedbacks</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {activeItem === 'Feedbacks' ? 'Filtered feedback queue' : 'Dashboard overview'}
                </p>
              </div>
              <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[120px_130px_150px_130px_minmax(170px,1fr)]">
                <DeveloperSelect value={statusFilter} options={statusOptions} onChange={(value) => setStatusFilter(value)} />
                <DeveloperSelect value={priorityFilter} options={priorityOptions} onChange={(value) => setPriorityFilter(value)} />
                <DeveloperSelect value={typeFilter} options={typeOptions} onChange={(value) => setTypeFilter(value)} />
                <DeveloperSelect value={moduleFilter} options={moduleOptions} onChange={(value) => setModuleFilter(value)} />
                <label className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-slate-300">
                  <Search size={15} className="shrink-0 text-slate-500" />
                  <input
                    className="min-w-0 w-full bg-transparent outline-none placeholder:text-slate-600"
                    placeholder="Search feedback"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
              </div>
            </div>

            {error ? (
              <div className="border-b border-rose-400/20 bg-rose-500/10 px-4 py-3">
                <p className="text-sm font-medium text-rose-100">{error}</p>
                <p className="mt-1 text-xs leading-5 text-rose-200/75">
                  Developer access is active, but feedback collection access may need rule/index verification.
                </p>
              </div>
            ) : null}

            {loading ? (
              <DeveloperEmpty title="Loading feedback" description="Fetching submitted OfficeOS feedback." />
            ) : filteredFeedback.length === 0 ? (
              <DeveloperEmpty
                title={feedback.length === 0 ? 'No feedback submitted yet' : 'No feedback matches these filters'}
                description={
                  feedback.length === 0
                    ? 'When company users submit feedback, it will appear here for MotoFlexing developer review.'
                    : 'Try changing the filters or search query.'
                }
              />
            ) : (
              <div className="max-w-full overflow-x-auto">
                <table className="w-full min-w-[920px] text-left">
                  <thead className="border-b border-white/10 bg-black/25 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-3 py-3 font-semibold">Title</th>
                      <th className="px-3 py-3 font-semibold">Type</th>
                      <th className="px-3 py-3 font-semibold">Module</th>
                      <th className="px-3 py-3 font-semibold">Priority</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-3 py-3 font-semibold">Submitted By</th>
                      <th className="px-3 py-3 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredFeedback.map((item) => (
                      <tr key={item.path || item.id} className="transition hover:bg-white/[0.035]">
                        <td className="max-w-[280px] px-3 py-3">
                          <p className="truncate font-medium text-white">{item.title}</p>
                          <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500">{item.description}</p>
                        </td>
                        <td className="px-3 py-3">
                          <TypeBadge type={item.type} />
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-300">{item.relatedModule}</td>
                        <td className="px-3 py-3">
                          <PriorityBadge priority={item.priority} />
                        </td>
                        <td className="px-3 py-3">
                          <select
                            className="rounded-lg border border-white/10 bg-black/45 px-2.5 py-1.5 text-xs font-medium text-slate-200 outline-none transition focus:border-accent-500/45"
                            value={item.status}
                            disabled={updatingId === item.id}
                            onChange={(event) => updateStatus(item, event.target.value as FeedbackStatus)}
                          >
                            {statusOptions.slice(1).map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="max-w-[150px] px-3 py-3 text-sm text-slate-300">
                          <p className="truncate">{item.submittedByName}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.submittedByRole}</p>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-400">{formatDateTime(item.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="py-5 text-center text-xs text-slate-600">OfficeOS Developer Panel by MotoFlexing</p>
        </section>
      </div>
    </main>
  );
};

const DeveloperStat = ({ icon: Icon, title, value }: { icon: typeof MessageSquare; title: string; value: number }) => (
  <article className="rounded-xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_18px_54px_rgba(0,0,0,0.32)] backdrop-blur">
    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] text-slate-200">
      <Icon size={16} />
    </div>
    <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
    <p className="mt-1 text-xs text-slate-400">{title}</p>
  </article>
);

const DeveloperSelect = <Value extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (value: Value) => void;
  options: Value[];
  value: Value;
}) => (
  <label className="relative">
    <select
      className="w-full appearance-none rounded-lg border border-white/10 bg-black/25 px-3 py-2 pr-8 text-xs font-medium text-slate-200 outline-none transition focus:border-accent-500/45"
      value={value}
      onChange={(event) => onChange(event.target.value as Value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
    <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
  </label>
);

const DeveloperEmpty = ({ description, title }: { description: string; title: string }) => (
  <div className="flex min-h-56 items-center justify-center p-6 text-center">
    <div className="max-w-md">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] text-accent-100">
        <Wrench size={19} />
      </div>
      <h3 className="mt-3 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  </div>
);

const TypeBadge = ({ type }: { type: FeedbackType }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${typeClass(type)}`}>{type}</span>
);

const PriorityBadge = ({ priority }: { priority: FeedbackPriority }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${priorityClass(priority)}`}>
    {priority}
  </span>
);

const typeClass = (type: FeedbackType) => {
  if (type === 'Bug') return 'border-red-400/25 bg-red-500/10 text-red-200';
  if (type === 'Feature Request') return 'border-sky-400/25 bg-sky-500/10 text-sky-200';
  if (type === 'UI/UX Improvement') return 'border-violet-400/25 bg-violet-500/10 text-violet-200';
  if (type === 'Workflow Issue') return 'border-amber-400/25 bg-amber-500/10 text-amber-200';
  return 'border-slate-400/25 bg-slate-500/10 text-slate-300';
};

const priorityClass = (priority: FeedbackPriority) => {
  if (priority === 'Critical') return 'border-red-400/30 bg-red-500/12 text-red-200';
  if (priority === 'High') return 'border-accent-400/30 bg-accent-500/12 text-accent-100';
  if (priority === 'Medium') return 'border-orange-400/25 bg-orange-500/10 text-orange-200';
  return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200';
};

const normalizeFeedbackItem = (item: FeedbackItem): FeedbackItem => ({
  ...item,
  type: normalizeType(item.type as string),
  status: normalizeStatus(item.status as string),
  priority: normalizePriority(item.priority as string),
  relatedModule: normalizeModule(item.relatedModule as string),
});

const normalizeStatus = (status: string): FeedbackStatus => {
  if (status === 'In Review') return 'Reviewed';
  if (status === 'Resolved') return 'Fixed';
  if (status === 'Closed') return 'Rejected';
  if (statusOptions.includes(status as FeedbackStatus)) return status as FeedbackStatus;
  return 'New';
};

const normalizeType = (type: string): FeedbackType => {
  if (type === 'Improvement') return 'UI/UX Improvement';
  if (type === 'Question') return 'Other';
  if (typeOptions.includes(type as FeedbackType)) return type as FeedbackType;
  return 'Other';
};

const normalizePriority = (priority: string): FeedbackPriority =>
  priorityOptions.includes(priority as FeedbackPriority) ? (priority as FeedbackPriority) : 'Medium';

const normalizeModule = (module: string): FeedbackModule =>
  moduleOptions.includes(module as FeedbackModule) ? (module as FeedbackModule) : 'Other';

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'Not available';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const getFeedbackLoadError = (error: unknown) => {
  const code =
    typeof error === 'object' && error && 'code' in error ? (error as { code?: string }).code : undefined;
  const message = error instanceof Error ? error.message : '';

  if (
    code === 'failed-precondition'
  ) {
    return 'Feedback requires a Firestore index before it can be loaded. Open the Firebase index link from the console error, create the index, and try again.';
  }

  if (code === 'permission-denied' || message.toLowerCase().includes('missing or insufficient permissions')) {
    return 'Feedback data could not be loaded. Please check developer permissions or Firestore rules.';
  }

  return message || 'Unable to load feedback.';
};

const MFLogo = () => (
  <div className="text-4xl font-black italic tracking-[-0.08em] drop-shadow-[0_0_22px_rgba(239,35,43,0.25)]">
    <span className="text-accent-500">M</span>
    <span className="bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">F</span>
  </div>
);
