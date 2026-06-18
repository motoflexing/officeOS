import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  ExternalLink,
  HandCoins,
  MessageSquare,
  Pencil,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ActivitiesTab } from '../components/ActivitiesTab';
import { ClientEditModal, type ClientEditPatch } from '../components/ClientEditModal';
import { ClientStatusPill } from '../components/ClientStatusPill';
import { ConfirmModal } from '../components/ConfirmModal';
import { ContactsTab } from '../components/ContactsTab';
import { DealsTab } from '../components/DealsTab';
import { SubscriptionsTab } from '../components/SubscriptionsTab';
import { EmptyState } from '../components/EmptyState';
import { StatCard } from '../components/StatCard';
import { Toast } from '../components/Toast';
import { CLIENT_STATUSES, isOpenDeal } from '../config/crmOptions';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type { Activity, Client, ClientStatus, Contact, Deal, Employee, PricingPlan, Subscription } from '../types';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

type DetailTab = 'overview' | 'contacts' | 'deals' | 'subscriptions' | 'activities';
const TABS: { id: DetailTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'deals', label: 'Deals' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'activities', label: 'Activities' },
];

const formatMRR = (value: number) => `$${value.toLocaleString()}`;

export const ClientDetailPage = () => {
  const { clientId = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role, profile } = useAuth();
  const canEdit = role === 'Admin';

  // Arriving from the pipeline: ?dealsTab=open opens the Deals tab; highlightDealId
  // opens/tints that deal there (DealsTab handles the highlight prop). Arriving from the
  // Renewals dashboard: ?tab=subscriptions opens the Subscriptions tab.
  const highlightDealId = searchParams.get('highlightDealId');
  const initialTab: DetailTab =
    searchParams.get('tab') === 'subscriptions'
      ? 'subscriptions'
      : searchParams.get('dealsTab') === 'open' || highlightDealId
        ? 'deals'
        : 'overview';

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [tab, setTab] = useState<DetailTab>(initialTab);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [toast, setToast] = useState('');
  // After a Won→Subscription conversion, auto-open the new sub on the Subscriptions tab.
  const [autoOpenSubId, setAutoOpenSubId] = useState<string | null>(null);
  const notesInitialized = useRef(false);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  };

  // Find this client within the live clients subscription so name/status edits reflect instantly.
  useEffect(() => {
    const unsubscribe = crm.subscribeToClients(companyId, (clients) => {
      const found = clients.find((item) => item.id === clientId) ?? null;
      setClient(found);
      setLoading(false);
    });
    return unsubscribe;
  }, [clientId]);

  // Live contacts, deals (filtered to this client), subscriptions, and activities.
  useEffect(() => {
    const unsubscribeContacts = crm.subscribeToContactsForClient(companyId, clientId, setContacts);
    const unsubscribeDeals = crm.subscribeToAllDeals(companyId, (allDeals) =>
      setDeals(allDeals.filter((deal) => deal.clientId === clientId)),
    );
    const unsubscribeSubscriptions = crm.subscribeToSubscriptionsForClient(companyId, clientId, setSubscriptions);
    const unsubscribeActivities = crm.subscribeToActivitiesForClient(companyId, clientId, setActivities);
    return () => {
      unsubscribeContacts();
      unsubscribeDeals();
      unsubscribeSubscriptions();
      unsubscribeActivities();
    };
  }, [clientId]);

  useEffect(() => {
    (isFirebaseConfigured ? firestoreService.getEmployees() : Promise.resolve(storage.getEmployees()))
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, []);

  // Pricing plans power the Deal modal's planInterest dropdown (live).
  useEffect(() => {
    const unsubscribe = crm.subscribeToPricingPlans(companyId, setPlans);
    return unsubscribe;
  }, []);

  // Seed the notes textarea once from the loaded client; further keystrokes are local
  // until blur, so live updates from the subscription don't clobber in-progress typing.
  useEffect(() => {
    if (client && !notesInitialized.current) {
      setNotesDraft(client.notes ?? '');
      notesInitialized.current = true;
    }
  }, [client]);

  const ownerName = useMemo(() => {
    if (!client?.ownerEmployeeId) return null;
    return employees.find((employee) => employee.id === client.ownerEmployeeId)?.name ?? null;
  }, [client?.ownerEmployeeId, employees]);

  // Match the signed-in user to an employee record so logged activities are attributed
  // to them; fall back to their email if no employee record matches.
  const currentEmployeeId = useMemo(() => {
    if (!profile?.email) return '';
    const match = employees.find((employee) => employee.email.toLowerCase() === profile.email.toLowerCase());
    return match?.id ?? profile.email;
  }, [employees, profile?.email]);

  // Acting user for checklist completion stamps (id + display name).
  const currentUser = useMemo(
    () => ({ id: currentEmployeeId, name: profile?.name ?? profile?.email ?? 'User' }),
    [currentEmployeeId, profile?.name, profile?.email],
  );

  const openDeals = useMemo(() => deals.filter((deal) => isOpenDeal(deal.stage)), [deals]);
  const pipelineValue = useMemo(
    () => openDeals.reduce((sum, deal) => sum + (deal.expectedMRR ?? 0), 0),
    [openDeals],
  );
  const recentActivities = useMemo(
    () => [...activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [activities],
  );

  const updateClient = async (patch: Partial<Client>) => {
    await crm.updateClient(companyId, clientId, patch);
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    setEditingName(false);
    if (!trimmed || trimmed === client?.companyName) return;
    await updateClient({ companyName: trimmed });
    showToast('Client updated');
  };

  const changeStatus = async (status: ClientStatus) => {
    setStatusMenuOpen(false);
    if (status === client?.status) return;
    await updateClient({ status });
    showToast('Status updated');
  };

  const saveNotes = async () => {
    if ((client?.notes ?? '') === notesDraft.trim()) return;
    await updateClient({ notes: notesDraft.trim() || undefined });
    showToast('Notes saved');
  };

  const handleEditSave = async (patch: ClientEditPatch) => {
    await updateClient(patch);
    setEditOpen(false);
    showToast('Client updated');
  };

  const handleDelete = async () => {
    await crm.deleteClient(companyId, clientId);
    setDeleteOpen(false);
    navigate('/clients');
  };

  if (loading) {
    return <EmptyState title="Loading client" description="Fetching client record." />;
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate('/clients')}
          className="inline-flex items-center gap-2 text-sm text-[color:var(--color-text-secondary)] transition hover:text-[color:var(--color-text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Clients
        </button>
        <EmptyState icon={Building2} title="Client not found" description="This client may have been deleted." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}

      <button
        type="button"
        onClick={() => navigate('/clients')}
        className="inline-flex items-center gap-2 text-sm text-[color:var(--color-text-secondary)] transition hover:text-[color:var(--color-text-primary)]"
      >
        <ArrowLeft size={16} />
        Back to Clients
      </button>

      <section className="surface p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    className="field max-w-sm text-xl font-semibold"
                    value={nameDraft}
                    autoFocus
                    onChange={(event) => setNameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void saveName();
                      if (event.key === 'Escape') setEditingName(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void saveName()}
                    aria-label="Save name"
                    className="rounded-lg p-1.5 text-[color:var(--color-success-text-300)] transition hover:bg-[var(--color-success-fill-15)]"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    aria-label="Cancel"
                    className="rounded-lg p-1.5 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)]"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="truncate text-2xl font-semibold text-[color:var(--color-text-primary)]">{client.companyName}</h2>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => {
                        setNameDraft(client.companyName);
                        setEditingName(true);
                      }}
                      aria-label="Edit name"
                      className="rounded-lg p-1.5 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)]"
                    >
                      <Pencil size={16} />
                    </button>
                  ) : null}
                </>
              )}
            </div>

            <div className="relative mt-3 inline-block">
              <button
                type="button"
                onClick={() => canEdit && setStatusMenuOpen((open) => !open)}
                className={canEdit ? 'cursor-pointer' : 'cursor-default'}
                aria-label="Change status"
              >
                <ClientStatusPill status={client.status} />
              </button>
              {statusMenuOpen ? (
                <div className="absolute left-0 z-20 mt-2 w-44 rounded-lg border border-[color:var(--color-border-weak)] bg-[var(--color-overlay-90)] p-1 shadow-glow backdrop-blur">
                  {CLIENT_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => void changeStatus(status)}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)]"
                    >
                      {status}
                      {status === client.status ? <Check size={14} className="text-accent-400" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <MetaRow label="Industry" value={client.industry ?? '—'} />
              <MetaRow label="Country" value={client.country ?? '—'} />
              <MetaRow label="Helpdesk Tool" value={client.helpdeskTool ?? '—'} />
              <MetaRow label="Owner" value={ownerName ?? '—'} />
              <div className="flex gap-2">
                <dt className="text-[color:var(--color-text-muted)]">Website</dt>
                <dd>
                  {client.website ? (
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-accent-400 transition hover:text-accent-300"
                    >
                      Visit <ExternalLink size={13} />
                    </a>
                  ) : (
                    <span className="text-[color:var(--color-text-secondary)]">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {canEdit ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => setEditOpen(true)}>
                <Pencil size={16} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--color-error-line-30)] bg-[var(--color-error-fill-10)] px-4 py-2.5 text-sm font-semibold text-[color:var(--color-error-text-200)] transition hover:bg-[var(--color-error-fill-20)]"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === item.id
                ? 'bg-[var(--color-accent)] text-[color:var(--color-on-accent)] shadow-[var(--shadow-glow-24-22)]'
                : 'text-[color:var(--color-text-secondary)] hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Open Deals" value={openDeals.length} icon={Briefcase} />
            <StatCard title="Pipeline Value" value={formatMRR(pipelineValue)} icon={HandCoins} caption="Sum of MRR on open deals" />
            <StatCard title="Contacts" value={contacts.length} icon={Users} />
            <StatCard title="Activities" value={activities.length} icon={MessageSquare} />
          </div>

          <section className="surface p-6">
            <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">Recent Activities</h3>
            {recentActivities.length === 0 ? (
              <p className="mt-3 text-sm text-[color:var(--color-text-muted)]">No activities yet</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {recentActivities.map((activity) => (
                  <li key={activity.id} className="rounded-lg border border-[color:var(--color-border-weak)] bg-[var(--color-fill-035)] px-4 py-3">
                    <p className="text-sm font-medium text-[color:var(--color-text-soft)]">
                      <span className="text-accent-400">{activity.type}</span> · {activity.subject}
                    </p>
                    {activity.body ? <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{activity.body}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface p-6">
            <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">Notes</h3>
            <textarea
              className="field mt-4 min-h-[120px]"
              value={notesDraft}
              disabled={!canEdit}
              onChange={(event) => setNotesDraft(event.target.value)}
              onBlur={() => void saveNotes()}
              placeholder={canEdit ? 'Add notes about this client…' : 'No notes.'}
            />
          </section>
        </div>
      ) : tab === 'contacts' ? (
        <ContactsTab clientId={clientId} contacts={contacts} canEdit={canEdit} onToast={showToast} />
      ) : tab === 'deals' ? (
        <DealsTab
          clientId={clientId}
          deals={deals}
          plans={plans}
          employees={employees}
          canEdit={canEdit}
          onToast={showToast}
          highlightDealId={highlightDealId}
          onConverted={(subscriptionId) => {
            setAutoOpenSubId(subscriptionId);
            setTab('subscriptions');
          }}
        />
      ) : tab === 'subscriptions' ? (
        <SubscriptionsTab
          clientId={clientId}
          subscriptions={subscriptions}
          plans={plans}
          employees={employees}
          contacts={contacts}
          currentUser={currentUser}
          autoOpenSubId={autoOpenSubId}
          canEdit={canEdit}
          onToast={showToast}
        />
      ) : (
        <ActivitiesTab
          clientId={clientId}
          activities={activities}
          deals={deals}
          contacts={contacts}
          employees={employees}
          currentEmployeeId={currentEmployeeId}
          canEdit={canEdit}
          onToast={showToast}
        />
      )}

      {editOpen ? (
        <ClientEditModal client={client} employees={employees} onClose={() => setEditOpen(false)} onSave={handleEditSave} />
      ) : null}

      {deleteOpen ? (
        <ConfirmModal
          title="Delete client?"
          message="This will delete the client and all related contacts, deals, and activities. Continue?"
          confirmLabel="Delete Client"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setDeleteOpen(false)}
        />
      ) : null}
    </div>
  );
};

const MetaRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex gap-2">
    <dt className="text-[color:var(--color-text-muted)]">{label}</dt>
    <dd className="truncate font-medium text-[color:var(--color-text-secondary)]">{value}</dd>
  </div>
);
