import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmployeeTable } from '../components/EmployeeTable';
import { employees } from '../data/mockData';
import type { EmployeeStatus } from '../types';

const filters: Array<'All' | EmployeeStatus> = ['All', 'At Work', 'Away', 'Checked Out'];

export const EmployeesPage = () => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | EmployeeStatus>('All');

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const matchesQuery = [employee.name, employee.email, employee.department, employee.position]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesFilter = filter === 'All' || employee.status === filter;
        return matchesQuery && matchesFilter;
      }),
    [query, filter],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">Directory</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Employee Directory</h2>
        </div>
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            className="field pl-10"
            placeholder="Search employees"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={item === filter ? 'btn-primary' : 'btn-secondary'}
          >
            {item}
          </button>
        ))}
      </div>

      <EmployeeTable employees={filteredEmployees} />
    </div>
  );
};
