import { ArrowDown, ArrowUp, ArrowUpDown, CalendarClock, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { SubscriptionStatusPill } from '../components/SubscriptionStatusPill';
import { SUBSCRIPTION_STATUSES } from '../config/crmOptions';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import type { Client, Subscription, SubscriptionStatus } from '../types';
import { formatShortDate } from '../utils/format';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

type SortKey = 'client' | 'team' | 'plan' | 'mrr' | 'renewal' | 'status' | 'manager';
type SortDir = 'asc' | 'desc';

const formatMRR = (value: number, currency: string) =>
  `${currency === 'USD' ? '$' : `${currency} `}${value.toLocaleString()}`;

const planLabel = (sub: Subscription) => sub.planNameSnapshot ?? (sub.planId ? '—' : 'Custom');

export const RenewalsPage = () => {
  const navigate = useNavigate();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | SubscriptionStatus>('All');
  const [search, setSearch] = useState('');
  // Default sort: renewal date ascending (per spec). Sortable on click for any column.
  const [sortKey, setSortKey] = useState<SortKey>('renewal');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // All subscriptions across all clients, pre-sorted by renewal date (composes on the
  // existing Phase 2A collectionGroup query in Firebase / cross-client cache in storage).
  useEffect(() => {
    const unsubscribe = crm.subscribeToAllSubscriptionsSortedByRenewal(companyId, (next) => {
      setSubscriptions(next);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Client names power the Client column + the search filter.
  useEffect(() => {
    const unsubscribe = crm.subscribeToClients(companyId, setClients);
    return unsubscribe;
  }, []);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((client) => map.set(client.id, client.companyName));
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return subscriptions.filter((sub) => {
      const matchesStatus = statusFilter === 'All' || sub.status === statusFilter;
      const matchesSearch =
        !term ||
        (clientNameById.get(sub.clientId) ?? '').toLowerCase().includes(term) ||
        sub.teamLabel.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [subscriptions, statusFilter, search, clientNameById]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const value = (sub: Subscription): string | number => {
      switch (sortKey) {
        case 'client':
          return (clientNameById.get(sub.clientId) ?? '').toLowerCase();
        case 'team':
          return sub.teamLabel.toLowerCase();
        case 'plan':
          return planLabel(sub).toLowerCase();
        case 'mrr':
          return sub.mrr;
        case 'status':
          return SUBSCRIPTION_STATUSES.indexOf(sub.status);
        case 'manager':
          return (sub.accountManagerNameSnapshot ?? '').toLowerCase();
        case 'renewal':
        default:
          // Sort missing renewal dates last regardless of direction by mapping to a
          // sentinel that always orders after real ISO dates.
          return sub.renewalDate ?? '9999-12-31';
      }
    };
    return [...filtered].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sortKey, sortDir, clientNameById]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Open the client with the Subscriptions tab active (reuses the query-param tab
  // pattern the pipeline uses for deal→client navigation).
  const openClient = (sub: Subscription) => {
    navigate(`/clients/${sub.clientId}?tab=subscriptions`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM"
        title="Renewals"
        subtitle="Track upcoming subscription renewals across all clients."
      />

      <section className="surface p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)]" size={18} />
            <input
              className="field pl-10"
              placeholder="Search by client name or team label"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="field"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'All' | SubscriptionStatus)}
          >
            <option value="All">All Statuses</option>
            {SUBSCRIPTION_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
      </section>

      {loading ? (
        <EmptyState title="Loading renewals" description="Fetching subscriptions across all clients." />
      ) : subscriptions.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No subscriptions yet"
          description="No subscriptions yet. Convert a Won deal to see renewals here."
        />
      ) : sorted.length === 0 ? (
        <EmptyState title="No subscriptions match the filter" description="Try a different status or search term." />
      ) : (
        <section className="surface overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[color:var(--color-border-weak)] text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
                <SortHeader label="Client" sortKey="client" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Team Label" sortKey="team" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Plan" sortKey="plan" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="MRR" sortKey="mrr" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Renewal Date" sortKey="renewal" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Account Manager" sortKey="manager" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((sub) => (
                <tr
                  key={sub.id}
                  onClick={() => openClient(sub)}
                  className="cursor-pointer border-b border-[color:var(--color-line-05)] transition last:border-0 hover:bg-[var(--color-fill-04)]"
                >
                  <td className="px-4 py-3 text-accent-400">{clientNameById.get(sub.clientId) ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-[color:var(--color-text-bright)]">{sub.teamLabel}</td>
                  <td className="px-4 py-3 text-[color:var(--color-text-secondary)]">{planLabel(sub)}</td>
                  <td className="px-4 py-3 text-[color:var(--color-text-secondary)]">{formatMRR(sub.mrr, sub.currency)}</td>
                  <td className="px-4 py-3 text-[color:var(--color-text-secondary)]">
                    {sub.renewalDate ? formatShortDate(sub.renewalDate) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <SubscriptionStatusPill status={sub.status} />
                  </td>
                  <td className="px-4 py-3 text-[color:var(--color-text-secondary)]">
                    {sub.accountManagerNameSnapshot ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};

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
        className={`inline-flex items-center gap-1 transition hover:text-[color:var(--color-text-soft)] ${active ? 'text-[color:var(--color-text-soft)]' : ''}`}
      >
        {label}
        <Icon size={12} />
      </button>
    </th>
  );
};
