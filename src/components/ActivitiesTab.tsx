import { Link2, MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import type { Activity, ActivityType, Contact, Deal, Employee } from '../types';
import { formatRelativeTime } from '../utils/format';
import { ActivityModal, type ActivityInput } from './ActivityModal';
import { ActivityTypeIcon } from './ActivityTypeIcon';
import { ConfirmModal } from './ConfirmModal';
import { EmptyState } from './EmptyState';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

const TYPE_FILTERS: Array<'All' | ActivityType> = ['All', 'Call', 'Email', 'Meeting', 'Note'];

export const ActivitiesTab = ({
  clientId,
  activities,
  deals,
  contacts,
  employees,
  currentEmployeeId,
  canEdit,
  onToast,
}: {
  clientId: string;
  activities: Activity[];
  deals: Deal[];
  contacts: Contact[];
  employees: Employee[];
  // The logged activity is attributed to this employee id (current user).
  currentEmployeeId: string;
  canEdit: boolean;
  onToast: (message: string) => void;
}) => {
  const [typeFilter, setTypeFilter] = useState<'All' | ActivityType>('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((employee) => map.set(employee.id, employee.name));
    return map;
  }, [employees]);

  const dealTitleById = useMemo(() => {
    const map = new Map<string, string>();
    deals.forEach((deal) => map.set(deal.id, deal.title));
    return map;
  }, [deals]);

  const contactNameById = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((contact) => map.set(contact.id, `${contact.firstName} ${contact.lastName}`));
    return map;
  }, [contacts]);

  // Client-side filters (type + date range on createdAt) applied as an intersection,
  // then sorted newest-first.
  const filtered = useMemo(() => {
    const fromMs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toMs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
    return activities
      .filter((activity) => {
        if (typeFilter !== 'All' && activity.type !== typeFilter) return false;
        const createdMs = new Date(activity.createdAt).getTime();
        if (fromMs !== null && createdMs < fromMs) return false;
        if (toMs !== null && createdMs > toMs) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [activities, typeFilter, fromDate, toDate]);

  const openAdd = () => {
    setEditingActivity(null);
    setModalOpen(true);
  };

  const openEdit = (activity: Activity) => {
    if (!canEdit) return;
    setEditingActivity(activity);
    setModalOpen(true);
  };

  const handleSave = async (input: ActivityInput) => {
    if (editingActivity) {
      // Edits never re-stamp the linked contact (spec: batch on create only).
      await crm.updateActivity(companyId, clientId, editingActivity.id, input);
      onToast('Activity updated');
    } else {
      // Attribute the new activity to the current user.
      const payload = { ...input, employeeId: currentEmployeeId };
      if (payload.relatedTo === 'contact' && payload.relatedId && payload.completedAt) {
        // Atomic create + contact lastContactedAt update.
        await crm.createActivityWithContactUpdate(companyId, clientId, payload, payload.relatedId);
      } else {
        await crm.createActivity(companyId, clientId, payload);
      }
      onToast('Activity logged');
    }
    setModalOpen(false);
    setEditingActivity(null);
  };

  const confirmDelete = async () => {
    if (!deletingActivity) return;
    try {
      await crm.deleteActivity(companyId, clientId, deletingActivity.id);
      onToast('Activity removed');
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Unable to delete activity.');
    } finally {
      setDeletingActivity(null);
    }
  };

  const linkedLabel = (activity: Activity): string | null => {
    if (activity.relatedTo === 'deal' && activity.relatedId)
      return `Deal: ${dealTitleById.get(activity.relatedId) ?? '—'}`;
    if (activity.relatedTo === 'contact' && activity.relatedId)
      return `Contact: ${contactNameById.get(activity.relatedId) ?? '—'}`;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid w-full gap-3 sm:grid-cols-[160px_1fr_1fr] lg:max-w-2xl">
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[color:var(--color-text-muted)]">Type</span>
            <select
              className="field"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as 'All' | ActivityType)}
            >
              {TYPE_FILTERS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[color:var(--color-text-muted)]">From</span>
            <input className="field" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[color:var(--color-text-muted)]">To</span>
            <input className="field" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
        </div>
        {canEdit ? (
          <button type="button" className="btn-primary" onClick={openAdd}>
            <Plus size={18} />
            Log Activity
          </button>
        ) : null}
      </div>

      {activities.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No activities logged yet"
          description="No activities logged yet. Track your calls, emails, and meetings to build relationship history."
          action={
            canEdit ? (
              <button type="button" className="btn-primary" onClick={openAdd}>
                <Plus size={18} />
                Log Activity
              </button>
            ) : null
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No activities match the filters" description="Try a different type or date range." />
      ) : (
        <ol className="space-y-3">
          {filtered.map((activity) => (
            <ActivityTimelineItem
              key={activity.id}
              activity={activity}
              employeeName={employeeNameById.get(activity.employeeId) ?? '—'}
              linkedLabel={linkedLabel(activity)}
              canEdit={canEdit}
              onEdit={() => openEdit(activity)}
              onDelete={() => setDeletingActivity(activity)}
            />
          ))}
        </ol>
      )}

      {modalOpen ? (
        <ActivityModal
          activity={editingActivity}
          deals={deals}
          contacts={contacts}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      ) : null}

      {deletingActivity ? (
        <ConfirmModal
          title="Delete activity?"
          message={`Remove "${deletingActivity.subject}" from this client's history?`}
          confirmLabel="Delete Activity"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setDeletingActivity(null)}
        />
      ) : null}
    </div>
  );
};

const ActivityTimelineItem = ({
  activity,
  employeeName,
  linkedLabel,
  canEdit,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  employeeName: string;
  linkedLabel: string | null;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  // Treat long bodies (multi-line or >180 chars) as collapsible to "max 3 lines".
  const isLong = Boolean(activity.body && (activity.body.length > 180 || activity.body.split('\n').length > 3));

  return (
    <li
      onClick={canEdit ? onEdit : undefined}
      className={`surface flex gap-3 p-4 ${canEdit ? 'cursor-pointer transition hover:border-[color:var(--color-accent-30)]' : ''}`}
    >
      <ActivityTypeIcon type={activity.type} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-semibold text-[color:var(--color-text-bright)]">{activity.subject}</p>
          <span className="text-xs text-[color:var(--color-text-muted)]">· {employeeName}</span>
          <span className="text-xs text-[color:var(--color-text-muted)]">· {formatRelativeTime(activity.createdAt)}</span>
        </div>

        {activity.body ? (
          <>
            <p className={`mt-1 whitespace-pre-line text-sm text-[color:var(--color-text-secondary)] ${isLong && !expanded ? 'line-clamp-3' : ''}`}>
              {activity.body}
            </p>
            {isLong ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setExpanded((value) => !value);
                }}
                className="mt-1 text-xs font-medium text-accent-400 transition hover:text-accent-300"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            ) : null}
          </>
        ) : null}

        {activity.outcome ? <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">Outcome: {activity.outcome}</p> : null}

        {linkedLabel ? (
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-fill-06)] px-2.5 py-1 text-xs font-medium text-[color:var(--color-text-secondary)] ring-1 ring-white/10">
            <Link2 size={12} className="text-[color:var(--color-text-muted)]" />
            Linked to: {linkedLabel}
          </span>
        ) : null}
      </div>

      {canEdit ? (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            aria-label="Edit activity"
            className="h-fit rounded-lg p-1.5 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)]"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            aria-label="Delete activity"
            className="h-fit rounded-lg p-1.5 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-error-fill-15)] hover:text-[color:var(--color-error-text-300)]"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : null}
    </li>
  );
};
