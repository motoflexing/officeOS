import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useMemo, useState } from 'react';
import { DEAL_STAGES } from '../config/crmOptions';
import type { Deal, DealStage } from '../types';
import { formatRelativeDeadline } from '../utils/format';

const formatMRR = (value?: number) => (value === undefined ? '—' : `$${value.toLocaleString()}`);

const initials = (name?: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
};

export const PipelineKanban = ({
  deals,
  clientNameById,
  employeeNameById,
  canEdit,
  onMoveDeal,
  onOpenDeal,
}: {
  deals: Deal[];
  clientNameById: Map<string, string>;
  employeeNameById: Map<string, string>;
  canEdit: boolean;
  onMoveDeal: (deal: Deal, newStage: DealStage) => void;
  onOpenDeal: (deal: Deal) => void;
}) => {
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  // PointerSensor with a small distance threshold lets a click navigate while a real
  // drag (>6px) initiates the move — so cards are both clickable and draggable.
  // KeyboardSensor adds accessible drag.
  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const noSensors = useSensors();
  // HR (canEdit=false) gets an EMPTY sensor set so nothing is draggable. Passing
  // `undefined` would NOT work — DndContext falls back to its built-in default sensors.
  const activeSensors = canEdit ? dragSensors : noSensors;

  const dealsByStage = useMemo(() => {
    const map = new Map<DealStage, Deal[]>();
    DEAL_STAGES.forEach((stage) => map.set(stage, []));
    deals.forEach((deal) => map.get(deal.stage)?.push(deal));
    return map;
  }, [deals]);

  const onDragStart = (event: DragStartEvent) => {
    setActiveDeal(deals.find((deal) => deal.id === event.active.id) ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;
    const deal = deals.find((item) => item.id === active.id);
    if (!deal) return;
    const newStage = over.id as DealStage;
    if (!DEAL_STAGES.includes(newStage) || newStage === deal.stage) return;
    onMoveDeal(deal, newStage);
  };

  return (
    <DndContext
      sensors={activeSensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-flow-col gap-3 overflow-x-auto pb-2 [grid-auto-columns:minmax(248px,1fr)]">
        {DEAL_STAGES.map((stage) => {
          const stageDeals = dealsByStage.get(stage) ?? [];
          const stageMRR = stageDeals.reduce((sum, deal) => sum + (deal.expectedMRR ?? 0), 0);
          return (
            <KanbanColumn key={stage} stage={stage} count={stageDeals.length} totalMRR={stageMRR}>
              {stageDeals.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-[color:var(--color-text-faint)]">—</p>
              ) : (
                stageDeals.map((deal) => (
                  <KanbanCard
                    key={deal.id}
                    deal={deal}
                    clientName={clientNameById.get(deal.clientId) ?? 'Unknown client'}
                    ownerName={deal.ownerEmployeeId ? employeeNameById.get(deal.ownerEmployeeId) : undefined}
                    draggable={canEdit}
                    onOpen={() => onOpenDeal(deal)}
                  />
                ))
              )}
            </KanbanColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeDeal ? (
          <CardBody
            deal={activeDeal}
            clientName={clientNameById.get(activeDeal.clientId) ?? 'Unknown client'}
            ownerName={activeDeal.ownerEmployeeId ? employeeNameById.get(activeDeal.ownerEmployeeId) : undefined}
            dragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

const KanbanColumn = ({
  stage,
  count,
  totalMRR,
  children,
}: {
  stage: DealStage;
  count: number;
  totalMRR: number;
  children: React.ReactNode;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[160px] flex-col rounded-xl border bg-[var(--color-fill-005)] p-3 transition ${
        isOver ? 'border-[color:var(--color-accent-60)] bg-[var(--color-accent)]/[0.06]' : 'border-[color:var(--color-border-weak)]'
      }`}
    >
      <div className="mb-3 flex items-baseline justify-between gap-2 px-1">
        <span className="text-sm font-semibold text-[color:var(--color-text-bright)]">{stage}</span>
        <span className="text-xs text-[color:var(--color-text-muted)]">
          {count} · {formatMRR(totalMRR)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
    </div>
  );
};

const KanbanCard = ({
  deal,
  clientName,
  ownerName,
  draggable,
  onOpen,
}: {
  deal: Deal;
  clientName: string;
  ownerName?: string;
  draggable: boolean;
  onOpen: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { stage: deal.stage },
    disabled: !draggable,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? listeners : {})}
      {...attributes}
      onClick={onOpen}
      className={`cursor-pointer ${isDragging ? 'opacity-50' : ''}`}
    >
      <CardBody deal={deal} clientName={clientName} ownerName={ownerName} />
    </div>
  );
};

// Shared card visual, used both in-column and inside the DragOverlay.
const CardBody = ({
  deal,
  clientName,
  ownerName,
  dragging = false,
}: {
  deal: Deal;
  clientName: string;
  ownerName?: string;
  dragging?: boolean;
}) => (
  <div
    className={`rounded-lg border border-[color:var(--color-border-weak)] bg-[var(--color-overlay-40)] p-3 shadow-sm ${
      dragging ? 'border-[color:var(--color-accent-50)] shadow-[var(--shadow-glow-24-22)]' : ''
    }`}
  >
    <p className="truncate text-sm font-semibold text-[color:var(--color-text-bright)]">{deal.title}</p>
    <p className="mt-0.5 truncate text-xs text-accent-400">{clientName}</p>
    <div className="mt-2 flex items-center justify-between gap-2">
      <span className="text-sm font-medium text-[color:var(--color-text-soft)]">{formatMRR(deal.expectedMRR)}</span>
      {deal.expectedCloseDate ? (
        <span className="text-xs text-[color:var(--color-text-muted)]">{formatRelativeDeadline(deal.expectedCloseDate)}</span>
      ) : null}
    </div>
    {ownerName ? (
      <div className="mt-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent-hover)] text-[10px] font-bold text-[color:var(--color-on-accent)]">
          {initials(ownerName)}
        </span>
        <span className="truncate text-xs text-[color:var(--color-text-secondary)]">{ownerName}</span>
      </div>
    ) : null}
  </div>
);
