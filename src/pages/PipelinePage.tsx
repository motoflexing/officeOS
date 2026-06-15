import { ArrowDown, ArrowUp, ArrowUpDown, Briefcase, HandCoins, LayoutGrid, Percent, Search, Table2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DealStagePill } from '../components/DealStagePill';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { PipelineKanban } from '../components/PipelineKanban';
import { StatCard } from '../components/StatCard';
import { Toast } from '../components/Toast';
import { DEAL_STAGES, isOpenDeal } from '../config/crmOptions';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type { Client, Deal, DealStage, Employee } from '../types';
import { formatShortDate } from '../utils/format';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

type ViewMode = 'kanban' | 'table';
type SortKey = 'title' | 'client' | 'stage' | 'plan' | 'mrr' | 'owner' | 'close' | 'updated';
type SortDir = 'asc' | 'desc';

const formatMRR = (value?: number) => (value === undefined ? '—' : `$${value.toLocaleString()}`);

export const PipelinePage = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canEdit = role === 'Admin';

  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('kanban');
  const [stageFilter, setStageFilter] = useState<'All' | DealStage>('All');
  const [ownerFilter, setOwnerFilter] = useState<'All' | string>('All');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [toast, setToast] = useState('');

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  };

  // All deals across all clients (collectionGroup in Firebase, cache in storage).
  useEffect(() => {
    const unsubscribe = crm.subscribeToAllDeals(companyId, (next) => {
      setDeals(next);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribeClients = crm.subscribeToClients(companyId, setClients);
    return unsubscribeClients;
  }, []);

  useEffect(() => {
    (isFirebaseConfigured ? firestoreService.getEmployees() : Promise.resolve(storage.getEmployees()))
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, []);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((client) => map.set(client.id, client.companyName));
    return map;
  }, [clients]);

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((employee) => map.set(employee.id, employee.name));
    return map;
  }, [employees]);

  // Top-bar metrics over ALL deals (not the filtered set).
  const totalPipelineValue = useMemo(
    () => deals.filter((deal) => isOpenDeal(deal.stage)).reduce((sum, deal) => sum + (deal.expectedMRR ?? 0), 0),
    [deals],
  );
  const openDealsCount = useMemo(() => deals.filter((deal) => isOpenDeal(deal.stage)).length, [deals]);
  const winRate = useMemo(() => {
    const won = deals.filter((deal) => deal.stage === 'Won').length;
    const lost = deals.filter((deal) => deal.stage === 'Lost').length;
    if (won + lost === 0) return '—';
    return `${Math.round((won / (won + lost)) * 100)}%`;
  }, [deals]);

  // Filters apply to both views.
  const filteredDeals = useMemo(() => {
    const term = search.trim().toLowerCase();
    return deals.filter((deal) => {
      const matchesStage = stageFilter === 'All' || deal.stage === stageFilter;
      const matchesOwner = ownerFilter === 'All' || deal.ownerEmployeeId === ownerFilter;
      const matchesSearch =
        !term ||
        deal.title.toLowerCase().includes(term) ||
        (clientNameById.get(deal.clientId) ?? '').toLowerCase().includes(term);
      return matchesStage && matchesOwner && matchesSearch;
    });
  }, [deals, stageFilter, ownerFilter, search, clientNameById]);

  const sortedTableDeals = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const value = (deal: Deal): string | number => {
      switch (sortKey) {
        case 'title':
          return deal.title.toLowerCase();
        case 'client':
          return (clientNameById.get(deal.clientId) ?? '').toLowerCase();
        case 'stage':
          return DEAL_STAGES.indexOf(deal.stage);
        case 'plan':
          return (deal.planInterest ?? '').toLowerCase();
        case 'mrr':
          return deal.expectedMRR ?? -1;
        case 'owner':
          return (deal.ownerEmployeeId ? employeeNameById.get(deal.ownerEmployeeId) ?? '' : '').toLowerCase();
        case 'close':
          return deal.expectedCloseDate ?? '';
        case 'updated':
        default:
          return deal.updatedAt;
      }
    };
    return [...filteredDeals].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredDeals, sortKey, sortDir, clientNameById, employeeNameById]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const openDeal = (deal: Deal) => {
    navigate(`/clients/${deal.clientId}?dealsTab=open&highlightDealId=${deal.id}`);
  };

  const moveDeal = async (deal: Deal, newStage: DealStage) => {
    try {
      await crm.updateDeal(companyId, deal.clientId, deal.id, { stage: newStage });
      showToast(`Deal moved to ${newStage}`);
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Unable to move deal.');
    }
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}

      <PageHeader
        eyebrow="CRM"
        title="Pipeline"
        subtitle="Track deals across every client."
        action={
          <div className="flex gap-2">
            <ViewToggle active={view === 'kanban'} icon={LayoutGrid} label="Kanban" onClick={() => setView('kanban')} />
            <ViewToggle active={view === 'table'} icon={Table2} label="Table" onClick={() => setView('table')} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Pipeline Value" value={formatMRR(totalPipelineValue)} icon={HandCoins} caption="Open deals (excl. Won/Lost)" />
        <StatCard title="Open Deals" value={openDealsCount} icon={Briefcase} />
        <StatCard title="Win Rate" value={winRate} icon={Percent} caption="Won / (Won + Lost)" />
      </div>

      <section className="surface p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_180px_200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              className="field pl-10"
              placeholder="Search by deal title or client name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="field"
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value as 'All' | DealStage)}
          >
            <option value="All">All Stages</option>
            {DEAL_STAGES.map((stage) => (
              <option key={stage}>{stage}</option>
            ))}
          </select>
          <select className="field" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
            <option value="All">All Owners</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading ? (
        <EmptyState title="Loading pipeline" description="Fetching deals across all clients." />
      ) : deals.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No deals yet"
          description="Add deals on a client's Deals tab to populate the pipeline."
        />
      ) : view === 'kanban' ? (
        <PipelineKanban
          deals={filteredDeals}
          clientNameById={clientNameById}
          employeeNameById={employeeNameById}
          canEdit={canEdit}
          onMoveDeal={moveDeal}
          onOpenDeal={openDeal}
        />
      ) : (
        <section className="surface overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <SortHeader label="Title" sortKey="title" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Client" sortKey="client" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Stage" sortKey="stage" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Plan" sortKey="plan" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="MRR" sortKey="mrr" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Owner" sortKey="owner" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Expected Close" sortKey="close" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Updated" sortKey="updated" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {sortedTableDeals.map((deal) => (
                <tr
                  key={deal.id}
                  onClick={() => openDeal(deal)}
                  className="cursor-pointer border-b border-white/5 transition last:border-0 hover:bg-white/[0.04]"
                >
                  <td className="px-4 py-3 font-medium text-slate-100">{deal.title}</td>
                  <td className="px-4 py-3 text-accent-400">{clientNameById.get(deal.clientId) ?? '—'}</td>
                  <td className="px-4 py-3">
                    <DealStagePill stage={deal.stage} />
                  </td>
                  <td className="px-4 py-3 text-slate-400">{deal.planInterest || '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{formatMRR(deal.expectedMRR)}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {deal.ownerEmployeeId ? employeeNameById.get(deal.ownerEmployeeId) ?? '—' : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {deal.expectedCloseDate ? formatShortDate(deal.expectedCloseDate) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatShortDate(deal.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};

const ViewToggle = ({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof LayoutGrid;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
      active
        ? 'bg-accent-500 text-white shadow-[0_0_24px_rgba(239,35,43,0.22)]'
        : 'text-slate-400 hover:bg-white/[0.055] hover:text-white'
    }`}
  >
    <Icon size={16} />
    {label}
  </button>
);

const SortHeader = ({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) => {
  const active = activeKey === sortKey;
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className="px-4 py-3 font-medium">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition hover:text-slate-200 ${active ? 'text-slate-200' : ''}`}
      >
        {label}
        <Icon size={12} />
      </button>
    </th>
  );
};
