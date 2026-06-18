import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import type { Employee, Engagement, Shift } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { ShiftModal, type ShiftFormValue } from './ShiftModal';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

type CalendarView = 'week' | 'month';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Local date helpers (no date library in the repo; plain Date, local time) ──
// Shifts store an ISO calendar date "YYYY-MM-DD". We build keys the same way so
// comparisons stay string-based and timezone-stable.
const toISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const todayISO = () => toISODate(new Date());
// Parse "YYYY-MM-DD" into a local-midnight Date (avoids the UTC shift `new Date(str)` causes).
const fromISODate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};
const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
// Sunday that starts the week containing `date`.
const startOfWeek = (date: Date): Date => addDays(date, -date.getDay());
const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, months: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

const formatTimeRange = (start: string, end: string) => `${start}–${end}`;
const monthLabel = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);

export const CoverageCalendar = ({
  clientId,
  engagement,
  employees,
  canEdit,
  onToast,
}: {
  clientId: string;
  engagement: Engagement;
  employees: Employee[];
  canEdit: boolean;
  onToast: (message: string) => void;
}) => {
  const [view, setView] = useState<CalendarView>('week');
  // Shared date context across both views so toggling Week/Month never resets to today.
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [modalDate, setModalDate] = useState<string | undefined>(undefined);
  const [deletingShift, setDeletingShift] = useState<Shift | null>(null);
  // Month-view: the day whose shift list is shown in the side panel.
  const [panelDate, setPanelDate] = useState<string | null>(null);

  // The agents this engagement covers (primary ∪ backup), in a stable order with
  // display names. Used for the calendar rows AND the modal's agent dropdown.
  const agents = useMemo(() => {
    const ids = [...engagement.primaryAgentIds, ...engagement.backupAgentIds.filter((id) => !engagement.primaryAgentIds.includes(id))];
    const nameById = new Map(employees.map((employee) => [employee.id, employee.name]));
    return ids.map((id) => ({ id, name: nameById.get(id) ?? 'Unknown agent' }));
  }, [engagement.primaryAgentIds, engagement.backupAgentIds, employees]);

  const agentNameById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent.name])), [agents]);

  // The visible date window — drives the live subscription's [startDate, endDate].
  const range = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(anchor);
      return { start, end: addDays(start, 6) };
    }
    // Month grid: pad to whole weeks (Sun start) so the query covers every visible cell.
    const monthStart = startOfMonth(anchor);
    const gridStart = startOfWeek(monthStart);
    return { start: gridStart, end: addDays(gridStart, 41) }; // 6 weeks × 7 days
  }, [view, anchor]);

  const startISO = toISODate(range.start);
  const endISO = toISODate(range.end);

  // Live shifts for the visible window. Re-subscribe whenever the window moves.
  useEffect(() => {
    const unsubscribe = crm.subscribeToShiftsForEngagement(
      companyId,
      clientId,
      engagement.id,
      startISO,
      endISO,
      setShifts,
    );
    return unsubscribe;
  }, [clientId, engagement.id, startISO, endISO]);

  // Index shifts by calendar date for O(1) cell lookups.
  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    shifts.forEach((shift) => {
      const list = map.get(shift.date) ?? [];
      list.push(shift);
      map.set(shift.date, list);
    });
    return map;
  }, [shifts]);

  // A coverage gap = a date with zero Primary-role shifts across all agents.
  const hasCoverageGap = (dateISO: string) => {
    const list = shiftsByDate.get(dateISO) ?? [];
    return !list.some((shift) => shift.role === 'Primary');
  };

  const openAdd = (dateISO?: string) => {
    setEditingShift(null);
    setModalDate(dateISO);
    setModalOpen(true);
  };
  const openEdit = (shift: Shift) => {
    if (!canEdit) return;
    setEditingShift(shift);
    setModalDate(undefined);
    setModalOpen(true);
  };

  const handleSave = async (value: ShiftFormValue) => {
    if (editingShift) {
      await crm.updateShift(companyId, clientId, editingShift.id, value);
      onToast('Shift updated');
    } else {
      await crm.createShift(companyId, clientId, { ...value, engagementId: engagement.id });
      onToast('Shift added');
    }
    setModalOpen(false);
    setEditingShift(null);
  };

  const confirmDelete = async () => {
    if (!deletingShift) return;
    try {
      await crm.deleteShift(companyId, clientId, deletingShift.id);
      onToast('Shift removed');
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Unable to delete shift.');
    } finally {
      setDeletingShift(null);
    }
  };

  // Navigation: prev/next step by view unit; Today re-anchors to now.
  const stepBack = () => setAnchor((current) => (view === 'week' ? addDays(current, -7) : addMonths(current, -1)));
  const stepForward = () => setAnchor((current) => (view === 'week' ? addDays(current, 7) : addMonths(current, 1)));
  const goToday = () => setAnchor(new Date());

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [anchor]);

  const monthDays = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(anchor));
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [anchor]);

  const navLabel = view === 'week'
    ? `${monthLabel(weekDays[0])}`
    : monthLabel(anchor);

  return (
    <div className="space-y-4">
      {/* Toolbar: view toggle + date navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <ViewToggle active={view === 'week'} icon={CalendarRange} label="Week" onClick={() => setView('week')} />
          <ViewToggle active={view === 'month'} icon={CalendarDays} label="Month" onClick={() => setView('month')} />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary !px-2.5" aria-label="Previous" onClick={stepBack}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="btn-secondary" onClick={goToday}>
            Today
          </button>
          <button type="button" className="btn-secondary !px-2.5" aria-label="Next" onClick={stepForward}>
            <ChevronRight size={16} />
          </button>
          <span className="ml-1 min-w-[140px] text-sm font-semibold text-[color:var(--color-text-bright)]">{navLabel}</span>
        </div>
      </div>

      {agents.length === 0 ? (
        <p className="rounded-lg border border-[color:var(--color-border-weak)] bg-[var(--color-fill-035)] px-4 py-6 text-center text-sm text-[color:var(--color-text-muted)]">
          No agents assigned to this engagement yet. Add primary or backup agents (Team section above) to schedule shifts.
        </p>
      ) : view === 'week' ? (
        <WeekView
          weekDays={weekDays}
          agents={agents}
          shiftsByDate={shiftsByDate}
          hasCoverageGap={hasCoverageGap}
          canEdit={canEdit}
          onAdd={openAdd}
          onEdit={openEdit}
        />
      ) : (
        <MonthView
          monthDays={monthDays}
          anchorMonth={anchor.getMonth()}
          shiftsByDate={shiftsByDate}
          hasCoverageGap={hasCoverageGap}
          onOpenDay={setPanelDate}
        />
      )}

      {/* Month-view day side panel */}
      {panelDate ? (
        <DayPanel
          dateISO={panelDate}
          shifts={shiftsByDate.get(panelDate) ?? []}
          agentNameById={agentNameById}
          canEdit={canEdit}
          onClose={() => setPanelDate(null)}
          onAdd={() => openAdd(panelDate)}
          onEdit={openEdit}
          onDelete={setDeletingShift}
        />
      ) : null}

      {modalOpen ? (
        <ShiftModal
          shift={editingShift}
          agents={agents}
          defaultDate={modalDate}
          onClose={() => {
            setModalOpen(false);
            setEditingShift(null);
          }}
          onSave={handleSave}
        />
      ) : null}

      {deletingShift ? (
        <ConfirmModal
          title="Delete shift?"
          message={`Remove the ${deletingShift.role} shift on ${deletingShift.date} (${formatTimeRange(
            deletingShift.startTime,
            deletingShift.endTime,
          )})?`}
          confirmLabel="Delete Shift"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setDeletingShift(null)}
        />
      ) : null}
    </div>
  );
};

// ── Week view ─────────────────────────────────────────────────────────────
const WeekView = ({
  weekDays,
  agents,
  shiftsByDate,
  hasCoverageGap,
  canEdit,
  onAdd,
  onEdit,
}: {
  weekDays: Date[];
  agents: { id: string; name: string }[];
  shiftsByDate: Map<string, Shift[]>;
  hasCoverageGap: (dateISO: string) => boolean;
  canEdit: boolean;
  onAdd: (dateISO: string) => void;
  onEdit: (shift: Shift) => void;
}) => {
  const today = todayISO();
  return (
    <section className="surface overflow-x-auto p-0">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[color:var(--color-border-weak)]">
            <th className="w-40 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[color:var(--color-text-muted)]">
              Agent
            </th>
            {weekDays.map((day) => {
              const dateISO = toISODate(day);
              const gap = hasCoverageGap(dateISO);
              return (
                <th
                  key={dateISO}
                  className={`px-2 py-3 text-center text-xs font-medium ${
                    gap
                      ? 'bg-[var(--color-error-fill-10)] text-[color:var(--color-error-text-300)]'
                      : 'text-[color:var(--color-text-muted)]'
                  }`}
                >
                  <div className="uppercase tracking-wider">{DAY_NAMES[day.getDay()]}</div>
                  <div className={`mt-0.5 text-sm font-semibold ${dateISO === today ? 'text-accent-400' : 'text-[color:var(--color-text-soft)]'}`}>
                    {day.getDate()}
                  </div>
                  {gap ? <div className="mt-0.5 text-[10px] font-normal">No primary</div> : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.id} className="border-b border-[color:var(--color-line-05)] last:border-0">
              <td className="px-4 py-3 align-top font-medium text-[color:var(--color-text-bright)]">{agent.name}</td>
              {weekDays.map((day) => {
                const dateISO = toISODate(day);
                const cellShifts = (shiftsByDate.get(dateISO) ?? []).filter((shift) => shift.agentId === agent.id);
                return (
                  <td key={dateISO} className="px-1.5 py-2 align-top">
                    {cellShifts.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {cellShifts.map((shift) => (
                          <ShiftChip key={shift.id} shift={shift} onClick={canEdit ? () => onEdit(shift) : undefined} />
                        ))}
                      </div>
                    ) : canEdit ? (
                      <button
                        type="button"
                        onClick={() => onAdd(dateISO)}
                        aria-label={`Add shift for ${agent.name} on ${dateISO}`}
                        className="flex h-8 w-full items-center justify-center rounded-md text-[color:var(--color-text-faint)] opacity-0 transition hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-secondary)] hover:opacity-100 focus:opacity-100"
                      >
                        <Plus size={14} />
                      </button>
                    ) : (
                      <span className="block h-8" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

// ── Month view ──────────────────────────────────────────────────────────────
const MonthView = ({
  monthDays,
  anchorMonth,
  shiftsByDate,
  hasCoverageGap,
  onOpenDay,
}: {
  monthDays: Date[];
  anchorMonth: number;
  shiftsByDate: Map<string, Shift[]>;
  hasCoverageGap: (dateISO: string) => boolean;
  onOpenDay: (dateISO: string) => void;
}) => {
  const today = todayISO();
  return (
    <section className="surface p-3">
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((name) => (
          <div key={name} className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-[color:var(--color-text-muted)]">
            {name}
          </div>
        ))}
        {monthDays.map((day) => {
          const dateISO = toISODate(day);
          const inMonth = day.getMonth() === anchorMonth;
          const dayShifts = shiftsByDate.get(dateISO) ?? [];
          const agentCount = new Set(dayShifts.map((shift) => shift.agentId)).size;
          // A gap = zero primary shifts (same definition as the week view). Only flag
          // in-month days; out-of-month padding belongs to the adjacent month.
          const gap = inMonth && hasCoverageGap(dateISO);
          return (
            <button
              key={dateISO}
              type="button"
              onClick={() => onOpenDay(dateISO)}
              className={`flex min-h-[76px] flex-col items-start gap-1 rounded-lg border p-2 text-left transition hover:bg-[var(--color-fill-04)] ${
                inMonth
                  ? 'border-[color:var(--color-border-weak)] bg-[var(--color-fill-005)]'
                  : 'border-transparent bg-transparent opacity-45'
              }`}
            >
              <span className={`text-xs font-semibold ${dateISO === today ? 'text-accent-400' : 'text-[color:var(--color-text-soft)]'}`}>
                {day.getDate()}
              </span>
              <div className="mt-auto flex items-center gap-1.5">
                {agentCount > 0 ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--color-fill-06)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--color-text-soft)] ring-1 ring-white/10">
                    {agentCount}
                  </span>
                ) : null}
                {gap ? <span className="h-2 w-2 rounded-full bg-[var(--color-error-text-300)]" title="Coverage gap (no primary shift)" /> : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

// ── Shared bits ──────────────────────────────────────────────────────────────
const ShiftChip = ({ shift, onClick }: { shift: Shift; onClick?: () => void }) => {
  const primary = shift.role === 'Primary';
  const body = (
    <>
      <span
        className={`inline-flex shrink-0 rounded px-1 text-[9px] font-bold uppercase tracking-wide ring-1 ${
          primary
            ? 'bg-[var(--color-success-fill-12)] text-[color:var(--color-success-text-300)] ring-[color:var(--color-success-ring-25)]'
            : 'bg-[var(--color-fill-06)] text-[color:var(--color-text-soft)] ring-white/10'
        }`}
      >
        {primary ? 'P' : 'B'}
      </span>
      <span className="truncate">{formatTimeRange(shift.startTime, shift.endTime)}</span>
    </>
  );
  const className =
    'flex w-full items-center gap-1 rounded-md border border-[color:var(--color-border-weak)] bg-[var(--color-overlay-40)] px-1.5 py-1 text-[11px] text-[color:var(--color-text-secondary)]';
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${className} text-left transition hover:border-[color:var(--color-accent-50)] hover:text-[color:var(--color-text-primary)]`}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
};

// Slide-in side panel listing a single day's shifts (month-view click target).
const DayPanel = ({
  dateISO,
  shifts,
  agentNameById,
  canEdit,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}: {
  dateISO: string;
  shifts: Shift[];
  agentNameById: Map<string, string>;
  canEdit: boolean;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
}) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const heading = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(fromISODate(dateISO));

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-[var(--color-overlay-65)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Shifts on ${heading}`}
      onClick={onClose}
    >
      <aside
        className="h-full w-full max-w-md overflow-y-auto border-l border-[color:var(--color-accent-30)] bg-[var(--color-overlay-90)] p-6 shadow-[var(--shadow-glow-44-18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">{heading}</h3>
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
          <DayShiftList shifts={shifts} agentNameById={agentNameById} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />
        </div>

        {canEdit ? (
          <button type="button" className="btn-secondary mt-5 w-full" onClick={onAdd}>
            <Plus size={16} />
            Add Shift
          </button>
        ) : null}
      </aside>
    </div>
  );
};

// Per-day shift list rendering, reused by the side panel.
const DayShiftList = ({
  shifts,
  agentNameById,
  canEdit,
  onEdit,
  onDelete,
}: {
  shifts: Shift[];
  agentNameById: Map<string, string>;
  canEdit: boolean;
  onEdit: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
}) => {
  if (shifts.length === 0) {
    return <p className="text-sm text-[color:var(--color-text-muted)]">No shifts scheduled this day.</p>;
  }
  const sorted = [...shifts].sort((a, b) => a.startTime.localeCompare(b.startTime));
  return (
    <ul className="space-y-2">
      {sorted.map((shift) => {
        const primary = shift.role === 'Primary';
        return (
          <li
            key={shift.id}
            className="rounded-lg border border-[color:var(--color-border-weak)] bg-[var(--color-fill-005)] p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[color:var(--color-text-bright)]">
                  {shift.agentNameSnapshot ?? agentNameById.get(shift.agentId) ?? 'Unknown agent'}
                </p>
                <p className="mt-0.5 text-xs text-[color:var(--color-text-secondary)]">
                  {formatTimeRange(shift.startTime, shift.endTime)} · {shift.status}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
                  primary
                    ? 'bg-[var(--color-success-fill-12)] text-[color:var(--color-success-text-300)] ring-[color:var(--color-success-ring-25)]'
                    : 'bg-[var(--color-fill-06)] text-[color:var(--color-text-soft)] ring-white/10'
                }`}
              >
                {shift.role}
              </span>
            </div>
            {shift.notes ? <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">{shift.notes}</p> : null}
            {canEdit ? (
              <div className="mt-2 flex justify-end gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(shift)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(shift)}
                  aria-label="Delete shift"
                  className="rounded-md p-1 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-error-fill-15)] hover:text-[color:var(--color-error-text-300)]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

const ViewToggle = ({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof CalendarDays;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
      active
        ? 'bg-[var(--color-accent)] text-[color:var(--color-on-accent)] shadow-[var(--shadow-glow-24-22)]'
        : 'text-[color:var(--color-text-secondary)] hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)]'
    }`}
  >
    <Icon size={16} />
    {label}
  </button>
);
