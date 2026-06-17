import { Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientQuickAddModal, type QuickAddClient } from '../components/ClientQuickAddModal';
import { ClientStatusPill } from '../components/ClientStatusPill';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Toast';
import { CLIENT_STATUSES, isOpenDeal } from '../config/crmOptions';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type { Client, ClientStatus, Deal, Employee } from '../types';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

const PAGE_SIZE = 50;

export const ClientsListPage = () => {
  const navigate = useNavigate();
  const { role, profile } = useAuth();
  const canEdit = role === 'Admin';

  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ClientStatus>('All');
  const [ownerFilter, setOwnerFilter] = useState<'All' | string>('All');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  };

  // Live clients + all deals (deals power the per-client Open Deals count).
  useEffect(() => {
    const unsubscribeClients = crm.subscribeToClients(companyId, (next) => {
      setClients(next);
      setLoading(false);
    });
    const unsubscribeDeals = crm.subscribeToAllDeals(companyId, setDeals);
    return () => {
      unsubscribeClients();
      unsubscribeDeals();
    };
  }, []);

  // Employees for the owner filter + quick-add owner picker (one-shot read).
  useEffect(() => {
    (isFirebaseConfigured ? firestoreService.getEmployees() : Promise.resolve(storage.getEmployees()))
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, []);

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((employee) => map.set(employee.id, employee.name));
    return map;
  }, [employees]);

  // Open-deal counts grouped by client from the all-deals set (single source, no N+1).
  const openDealsByClient = useMemo(() => {
    const counts = new Map<string, number>();
    deals.forEach((deal) => {
      if (isOpenDeal(deal.stage)) counts.set(deal.clientId, (counts.get(deal.clientId) ?? 0) + 1);
    });
    return counts;
  }, [deals]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesSearch =
        !term ||
        [client.companyName, client.industry, client.country].filter(Boolean).join(' ').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'All' || client.status === statusFilter;
      const matchesOwner = ownerFilter === 'All' || client.ownerEmployeeId === ownerFilter;
      return matchesSearch && matchesStatus && matchesOwner;
    });
  }, [clients, search, statusFilter, ownerFilter]);

  const visibleClients = filteredClients.slice(0, visibleCount);

  const currentUserEmployeeId = useMemo(() => {
    if (!profile?.email) return undefined;
    return employees.find((employee) => employee.email.toLowerCase() === profile.email.toLowerCase())?.id;
  }, [employees, profile?.email]);

  const handleSave = async (input: QuickAddClient, addAnother: boolean) => {
    const created = await crm.createClient(companyId, input);
    if (addAnother) {
      showToast('Client added');
    } else {
      setAddOpen(false);
      navigate(`/clients/${created.id}`);
    }
  };

  const noFilters = !search && statusFilter === 'All' && ownerFilter === 'All';

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}
      <PageHeader
        eyebrow="CRM"
        title="Clients"
        subtitle="Manage your client relationships and pipeline."
        action={
          canEdit ? (
            <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
              <Plus size={18} />
              Add Client
            </button>
          ) : null
        }
      />

      <section className="surface p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_180px_200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)]" size={18} />
            <input
              className="field pl-10"
              placeholder="Search by company, industry, or country"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="field"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'All' | ClientStatus)}
          >
            <option value="All">All Statuses</option>
            {CLIENT_STATUSES.map((status) => (
              <option key={status}>{status}</option>
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
        <EmptyState title="Loading clients" description="Fetching client records." />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No clients yet"
          description="No clients yet. Add your first client to start tracking deals."
          action={
            canEdit ? (
              <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
                <Plus size={18} />
                Add Client
              </button>
            ) : null
          }
        />
      ) : filteredClients.length === 0 ? (
        <EmptyState
          title={noFilters ? 'No clients yet' : 'No clients match the filters'}
          description={noFilters ? 'Add a client to get started.' : 'Try adjusting the search, status, or owner filters.'}
        />
      ) : (
        <section className="surface overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[color:var(--color-border-weak)] text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
                <th className="px-4 py-3 font-medium">Company Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Industry</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Open Deals</th>
                <th className="px-4 py-3 font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {visibleClients.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="cursor-pointer border-b border-[color:var(--color-line-05)] transition last:border-0 hover:bg-[var(--color-fill-04)]"
                >
                  <td className="px-4 py-3 font-medium text-[color:var(--color-text-bright)]">{client.companyName}</td>
                  <td className="px-4 py-3">
                    <ClientStatusPill status={client.status} />
                  </td>
                  <td className="px-4 py-3 text-[color:var(--color-text-secondary)]">{client.industry ?? '—'}</td>
                  <td className="px-4 py-3 text-[color:var(--color-text-secondary)]">
                    {client.ownerEmployeeId ? employeeNameById.get(client.ownerEmployeeId) ?? '—' : '—'}
                  </td>
                  <td className="px-4 py-3 text-[color:var(--color-text-secondary)]">{openDealsByClient.get(client.id) ?? 0}</td>
                  <td className="px-4 py-3 text-[color:var(--color-text-secondary)]">—</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredClients.length > visibleCount ? (
            <div className="flex justify-center border-t border-[color:var(--color-border-weak)] p-4">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                Load More
              </button>
            </div>
          ) : null}
        </section>
      )}

      {addOpen ? (
        <ClientQuickAddModal
          employees={employees}
          defaultOwnerEmployeeId={currentUserEmployeeId}
          onClose={() => setAddOpen(false)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
};
