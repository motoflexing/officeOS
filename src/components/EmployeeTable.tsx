import type { Employee } from '../types';
import { StatusBadge } from './StatusBadge';

export const EmployeeTable = ({
  employees,
  onEdit,
  onDelete,
}: {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}) => (
  <div className="surface overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead className="border-b border-[color:var(--color-border-weak)] bg-[var(--color-fill-035)]">
          <tr className="text-xs uppercase tracking-[0.14em] text-[color:var(--color-text-muted)]">
            <th className="px-5 py-4 font-semibold">Name</th>
            <th className="px-5 py-4 font-semibold">Email</th>
            <th className="px-5 py-4 font-semibold">Role</th>
            <th className="px-5 py-4 font-semibold">Department</th>
            <th className="px-5 py-4 font-semibold">Designation</th>
            <th className="px-5 py-4 font-semibold">Status</th>
            <th className="px-5 py-4 font-semibold">Joining Date</th>
            <th className="px-5 py-4 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--color-divide)]">
          {employees.map((employee) => (
            <tr key={employee.id} className="transition hover:bg-[var(--color-fill-035)]">
              <td className="px-5 py-4">
                <p className="font-semibold text-[color:var(--color-text-primary)]">{employee.name}</p>
                <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{employee.location || 'Location not set'}</p>
              </td>
              <td className="px-5 py-4 text-sm text-[color:var(--color-text-secondary)]">{employee.email}</td>
              <td className="px-5 py-4 text-sm text-[color:var(--color-text-secondary)]">{employee.role}</td>
              <td className="px-5 py-4 text-sm text-[color:var(--color-text-secondary)]">{employee.department}</td>
              <td className="px-5 py-4 text-sm text-[color:var(--color-text-secondary)]">{employee.designation}</td>
              <td className="px-5 py-4">
                <StatusBadge status={employee.status} />
              </td>
              <td className="px-5 py-4 text-sm text-[color:var(--color-text-secondary)]">{employee.joiningDate}</td>
              <td className="px-5 py-4">
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary py-2" onClick={() => onEdit(employee)}>
                    Edit
                  </button>
                  <button type="button" className="btn-secondary py-2" onClick={() => onDelete(employee)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
