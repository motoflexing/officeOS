import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, MoreVertical, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import type { ChecklistItem, ChecklistItemStatus, OnboardingChecklist } from '../types';
import { formatRelativeTime } from '../utils/format';
import { ChecklistItemStatusPill } from './ChecklistItemStatusPill';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

export const OnboardingChecklistTab = ({
  clientId,
  subId,
  subscriptionStatus,
  canEdit,
  currentUser,
  onToast,
  onActivate,
}: {
  clientId: string;
  subId: string;
  subscriptionStatus: string;
  canEdit: boolean;
  currentUser: { id: string; name: string };
  onToast: (message: string) => void;
  // Flip the subscription Onboarding → Active (offered when all items resolve).
  onActivate: () => void;
}) => {
  const [checklist, setChecklist] = useState<OnboardingChecklist | null>(null);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [showActivatePrompt, setShowActivatePrompt] = useState(false);
  // Tracks whether the checklist was incomplete, so we only prompt on the transition
  // into "all resolved" (not on every render of an already-complete list).
  const wasIncomplete = useRef(false);

  useEffect(() => {
    const unsubscribe = crm.subscribeToChecklist(companyId, clientId, subId, setChecklist);
    return unsubscribe;
  }, [clientId, subId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const items = useMemo(
    () => (checklist ? [...checklist.items].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [checklist],
  );

  const doneCount = items.filter((item) => item.status === 'Done').length;
  const total = items.length;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  // "Required" = all non-skipped items; when every such item is Done and the sub is
  // still Onboarding, offer activation — but only on the transition into that state.
  useEffect(() => {
    if (total === 0) return;
    const required = items.filter((item) => item.status !== 'Skipped');
    const allResolved = required.length > 0 && required.every((item) => item.status === 'Done');
    if (!allResolved) {
      wasIncomplete.current = true;
      setShowActivatePrompt(false);
      return;
    }
    if (allResolved && wasIncomplete.current && subscriptionStatus === 'Onboarding') {
      setShowActivatePrompt(true);
      onToast('All onboarding items complete. Activate this subscription?');
      wasIncomplete.current = false;
    }
  }, [items, total, subscriptionStatus, onToast]);

  const toggleDone = (item: ChecklistItem) => {
    const nextStatus: ChecklistItemStatus = item.status === 'Done' ? 'Pending' : 'Done';
    void crm.updateChecklistItem(companyId, clientId, subId, item.id, { status: nextStatus }, currentUser);
  };

  const setStatus = (item: ChecklistItem, status: ChecklistItemStatus) => {
    void crm.updateChecklistItem(companyId, clientId, subId, item.id, { status }, currentUser);
  };

  const setLabel = (item: ChecklistItem, label: string) => {
    if (label.trim() && label.trim() !== item.label) {
      void crm.updateChecklistItem(companyId, clientId, subId, item.id, { label: label.trim() }, currentUser);
    }
  };

  const setDueDate = (item: ChecklistItem, dueDate: string) => {
    void crm.updateChecklistItem(companyId, clientId, subId, item.id, { dueDate: dueDate || undefined }, currentUser);
  };

  const setNotes = (item: ChecklistItem, notes: string) => {
    void crm.updateChecklistItem(companyId, clientId, subId, item.id, { notes: notes.trim() || undefined }, currentUser);
  };

  const remove = (item: ChecklistItem) => {
    void crm.removeChecklistItem(companyId, clientId, subId, item.id);
  };

  const addItem = () => {
    const label = newLabel.trim();
    if (!label) return;
    void crm.addChecklistItem(companyId, clientId, subId, label);
    setNewLabel('');
    setAdding(false);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    void crm.reorderChecklistItems(companyId, clientId, subId, reordered.map((item) => item.id));
  };

  if (!checklist) {
    return <p className="py-8 text-center text-sm text-slate-500">Loading checklist…</p>;
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-200">
            {doneCount} of {total} complete
          </span>
          <span className="text-slate-500">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-600 to-accent-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {showActivatePrompt && canEdit ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm text-emerald-100">All onboarding items complete. Activate this subscription?</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onActivate();
              setShowActivatePrompt(false);
            }}
          >
            Activate
          </button>
        </div>
      ) : null}

      {/* Items */}
      <DndContext sensors={canEdit ? sensors : undefined} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                canEdit={canEdit}
                onToggleDone={() => toggleDone(item)}
                onSetStatus={(status) => setStatus(item, status)}
                onSetLabel={(label) => setLabel(item, label)}
                onSetDueDate={(date) => setDueDate(item, date)}
                onSetNotes={(notes) => setNotes(item, notes)}
                onRemove={() => remove(item)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {canEdit ? (
        adding ? (
          <div className="flex items-center gap-2">
            <input
              className="field"
              autoFocus
              value={newLabel}
              placeholder="Custom item label"
              onChange={(event) => setNewLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addItem();
                if (event.key === 'Escape') {
                  setAdding(false);
                  setNewLabel('');
                }
              }}
            />
            <button type="button" className="btn-primary" onClick={addItem}>
              Add
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setAdding(false);
                setNewLabel('');
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="btn-secondary" onClick={() => setAdding(true)}>
            <Plus size={16} />
            Add Custom Item
          </button>
        )
      ) : null}
    </div>
  );
};

const ChecklistRow = ({
  item,
  canEdit,
  onToggleDone,
  onSetStatus,
  onSetLabel,
  onSetDueDate,
  onSetNotes,
  onRemove,
}: {
  item: ChecklistItem;
  canEdit: boolean;
  onToggleDone: () => void;
  onSetStatus: (status: ChecklistItemStatus) => void;
  onSetLabel: (label: string) => void;
  onSetDueDate: (date: string) => void;
  onSetNotes: (notes: string) => void;
  onRemove: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !canEdit,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(item.label);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(item.notes ?? '');

  useEffect(() => setLabelDraft(item.label), [item.label]);
  useEffect(() => setNotesDraft(item.notes ?? ''), [item.notes]);

  const done = item.status === 'Done';

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`surface flex flex-col gap-2 p-3 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3">
        {canEdit ? (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Reorder"
            className="cursor-grab touch-none text-slate-500 transition hover:text-slate-300"
          >
            <GripVertical size={16} />
          </button>
        ) : null}

        <button
          type="button"
          disabled={!canEdit}
          onClick={onToggleDone}
          aria-label={done ? 'Mark not done' : 'Mark done'}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
            done ? 'border-emerald-400 bg-emerald-500/80 text-white' : 'border-white/25 hover:border-accent-500'
          }`}
        >
          {done ? <Check size={13} /> : null}
        </button>

        {editingLabel && canEdit ? (
          <input
            className="field flex-1"
            autoFocus
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.target.value)}
            onBlur={() => {
              setEditingLabel(false);
              onSetLabel(labelDraft);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setEditingLabel(false);
                onSetLabel(labelDraft);
              }
              if (event.key === 'Escape') {
                setEditingLabel(false);
                setLabelDraft(item.label);
              }
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => canEdit && setEditingLabel(true)}
            className={`min-w-0 flex-1 truncate text-left text-sm ${done ? 'text-slate-500 line-through' : 'text-slate-100'} ${canEdit ? 'hover:text-white' : ''}`}
          >
            {item.label}
          </button>
        )}

        <ChecklistItemStatusPill status={item.status} />

        <input
          className="field max-w-[150px] py-1.5 text-xs"
          type="date"
          disabled={!canEdit}
          value={item.dueDate ?? ''}
          onChange={(event) => onSetDueDate(event.target.value)}
        />

        {canEdit ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Item actions"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.055] hover:text-white"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-white/10 bg-black/90 p-1 shadow-glow backdrop-blur">
                <MenuButton label="Mark In Progress" onClick={() => { setMenuOpen(false); onSetStatus('In Progress'); }} />
                <MenuButton label="Mark Skipped" onClick={() => { setMenuOpen(false); onSetStatus('Skipped'); }} />
                <MenuButton
                  label="Add Notes"
                  onClick={() => {
                    setMenuOpen(false);
                    setNotesOpen((open) => !open);
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onRemove();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-rose-500/15"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {done && item.completedByNameSnapshot ? (
        <p className="pl-8 text-xs text-slate-500">
          Completed by {item.completedByNameSnapshot}
          {item.completedAt ? ` · ${formatRelativeTime(item.completedAt)}` : ''}
        </p>
      ) : null}

      {(notesOpen || item.notes) && canEdit ? (
        <div className="flex items-start gap-2 pl-8">
          <textarea
            className="field min-h-[44px] flex-1 text-sm"
            value={notesDraft}
            placeholder="Notes…"
            onChange={(event) => setNotesDraft(event.target.value)}
            onBlur={() => onSetNotes(notesDraft)}
          />
          {notesOpen ? (
            <button
              type="button"
              onClick={() => setNotesOpen(false)}
              aria-label="Hide notes"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.055] hover:text-white"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      ) : item.notes && !canEdit ? (
        <p className="pl-8 text-xs text-slate-500">{item.notes}</p>
      ) : null}
    </li>
  );
};

const MenuButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/[0.055] hover:text-white"
  >
    {label}
  </button>
);
