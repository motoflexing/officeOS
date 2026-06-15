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
      {selectedIds.length === 0 && !adding ? <span className="text-sm text-slate-500">{emptyLabel}</span> : null}

      {selectedIds.map((id) => {
        const employee = byId.get(id);
        const name = employee?.name ?? id;
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-2 text-xs font-medium text-slate-200 ring-1 ring-white/10"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-600 text-[10px] font-bold text-white">
              {name.trim().charAt(0).toUpperCase() || '?'}
            </span>
            {name}
            {!disabled ? (
              <button
                type="button"
                onClick={() => remove(id)}
                aria-label={`Remove ${name}`}
                className="rounded-full p-0.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
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
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/20 px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:border-accent-500/50 hover:text-white"
          >
            <Plus size={12} />
            Add
          </button>
        ) : null
      ) : null}
    </div>
  );
};
