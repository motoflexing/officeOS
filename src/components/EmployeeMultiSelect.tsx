import { Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Employee } from '../types';

// Chip multi-select for employee-id arrays (engagement primary/backup agents).
// Selected ids render as removable avatar chips; an add-dropdown lists the rest.
// Fully disabled in read-only (HR) mode.
export const EmployeeMultiSelect = ({
  employees,
  selectedIds,
  disabled = false,
  emptyLabel = 'None assigned',
  onChange,
}: {
  employees: Employee[];
  selectedIds: string[];
  disabled?: boolean;
  emptyLabel?: string;
  onChange: (ids: string[]) => void;
}) => {
  const [adding, setAdding] = useState(false);

  const byId = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((employee) => map.set(employee.id, employee));
    return map;
  }, [employees]);

  const available = useMemo(
    () => employees.filter((employee) => !selectedIds.includes(employee.id)),
    [employees, selectedIds],
  );

  const add = (id: string) => {
    setAdding(false);
    if (id && !selectedIds.includes(id)) onChange([...selectedIds, id]);
  };
  const remove = (id: string) => onChange(selectedIds.filter((item) => item !== id));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selectedIds.length === 0 && !adding ? <span className="text-sm text-[color:var(--color-text-muted)]">{emptyLabel}</span> : null}

      {selectedIds.map((id) => {
        const employee = byId.get(id);
        const name = employee?.name ?? id;
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-fill-06)] py-1 pl-1 pr-2 text-xs font-medium text-[color:var(--color-text-soft)] ring-1 ring-white/10"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent-hover)] text-[10px] font-bold text-[color:var(--color-on-accent)]">
              {name.trim().charAt(0).toUpperCase() || '?'}
            </span>
            {name}
            {!disabled ? (
              <button
                type="button"
                onClick={() => remove(id)}
                aria-label={`Remove ${name}`}
                className="rounded-full p-0.5 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-fill-10)] hover:text-[color:var(--color-text-primary)]"
              >
                <X size={12} />
              </button>
            ) : null}
          </span>
        );
      })}

      {!disabled ? (
        adding ? (
          <select
            className="field max-w-[200px] py-1.5 text-xs"
            autoFocus
            defaultValue=""
            onChange={(event) => add(event.target.value)}
            onBlur={() => setAdding(false)}
          >
            <option value="" disabled>
              Select…
            </option>
            {available.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        ) : available.length > 0 ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-[color:var(--color-border-strong)] px-2.5 py-1 text-xs font-medium text-[color:var(--color-text-secondary)] transition hover:border-[color:var(--color-accent-50)] hover:text-[color:var(--color-text-primary)]"
          >
            <Plus size={12} />
            Add
          </button>
        ) : null
      ) : null}
    </div>
  );
};
