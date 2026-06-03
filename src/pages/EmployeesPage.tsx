import { Plus, Search } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { EmployeeTable } from '../components/EmployeeTable';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Toast';
import { BRANDING } from '../config/branding';
import { storage } from '../services/storage';
import type { Employee, EmploymentStatus, Role } from '../types';

type EmployeeForm = Omit<Employee, 'id'>;

const roles: Array<'All' | Role> = ['All', 'Admin', 'HR', 'Employee'];
const statuses: Array<'All' | EmploymentStatus> = ['All', 'Active', 'Inactive', 'On Leave'];

const emptyForm: EmployeeForm = {
  name: '',
  email: '',
  role: 'Employee',
  department: '',
  designation: '',
  status: 'Active',
  joiningDate: '',
  phone: '',
  location: '',
};

export const EmployeesPage = () => {
  const [employees, setEmployees] = useState<Employee[]>(() => storage.getEmployees());
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | Role>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | EmploymentStatus>('All');
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const matchesQuery = [employee.name, employee.email, employee.department, employee.designation]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesRole = roleFilter === 'All' || employee.role === roleFilter;
        const matchesStatus = statusFilter === 'All' || employee.status === statusFilter;
        return matchesQuery && matchesRole && matchesStatus;
      }),
    [employees, query, roleFilter, statusFilter],
  );

  const openAddForm = () => {
    setEditingEmployee(null);
    setForm(emptyForm);
    setError('');
    setFormOpen(true);
  };

  const openEditForm = (employee: Employee) => {
    setEditingEmployee(employee);
    setForm({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      designation: employee.designation,
      status: employee.status,
      joiningDate: employee.joiningDate,
      phone: employee.phone ?? '',
      location: employee.location ?? '',
    });
    setError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingEmployee(null);
    setForm(emptyForm);
    setError('');
  };

  const saveEmployee = (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const requiredFields = [
      form.name,
      form.email,
      form.role,
      form.department,
      form.designation,
      form.status,
      form.joiningDate,
    ];
    if (requiredFields.some((value) => !value.trim())) {
      setError('Name, email, role, department, designation, status, and joining date are required.');
      return;
    }

    const normalizedEmail = form.email.trim().toLowerCase();
    const duplicateEmail = employees.some(
      (employee) => employee.email.toLowerCase() === normalizedEmail && employee.id !== editingEmployee?.id,
    );
    if (duplicateEmail) {
      setError('An employee with this email already exists.');
      return;
    }

    const nextEmployee: Employee = {
      id: editingEmployee?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      email: normalizedEmail,
      role: form.role,
      department: form.department.trim(),
      designation: form.designation.trim(),
      status: form.status,
      joiningDate: form.joiningDate,
      phone: form.phone?.trim() || undefined,
      location: form.location?.trim() || undefined,
    };

    storage.upsertEmployee(nextEmployee);
    setEmployees(storage.getEmployees());
    setToast(editingEmployee ? 'Employee details updated' : 'Employee added to directory');
    window.setTimeout(() => setToast(''), 2400);
    closeForm();
  };

  const deleteEmployee = (employee: Employee) => {
    const shouldDelete = window.confirm(`Delete ${employee.name} from the employee directory?`);
    if (!shouldDelete) return;
    storage.deleteEmployee(employee.id);
    setEmployees(storage.getEmployees());
    setToast('Employee removed from directory');
    window.setTimeout(() => setToast(''), 2400);
  };

  const noFilters = !query && roleFilter === 'All' && statusFilter === 'All';

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}
      <PageHeader
        eyebrow="Directory"
        title="Employee Directory"
        subtitle={`Manage ${BRANDING.workspaceName} team members, roles, departments, and status.`}
        action={
          <button type="button" className="btn-primary" onClick={openAddForm}>
            <Plus size={18} />
            Add Employee
          </button>
        }
      />

      <section className="surface p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              className="field pl-10"
              placeholder="Search by name, email, department, or designation"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select className="field" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as 'All' | Role)}>
            {roles.map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
          <select
            className="field"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'All' | EmploymentStatus)}
          >
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
      </section>

      {formOpen ? (
        <EmployeeFormPanel
          form={form}
          editing={Boolean(editingEmployee)}
          error={error}
          onCancel={closeForm}
          onChange={setForm}
          onSubmit={saveEmployee}
        />
      ) : null}

      {employees.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No employees found"
          description="Add your first employee to begin building the workspace directory."
          action={
            <button type="button" className="btn-primary" onClick={openAddForm}>
              <Plus size={18} />
              Add Employee
            </button>
          }
        />
      ) : filteredEmployees.length === 0 ? (
        <EmptyState
          title={noFilters ? 'No employees found' : 'No employees match the filters'}
          description={noFilters ? 'Add employees to populate the directory.' : 'Try adjusting the search, role, or status filters.'}
        />
      ) : (
        <EmployeeTable employees={filteredEmployees} onEdit={openEditForm} onDelete={deleteEmployee} />
      )}
    </div>
  );
};

const EmployeeFormPanel = ({
  form,
  editing,
  error,
  onCancel,
  onChange,
  onSubmit,
}: {
  form: EmployeeForm;
  editing: boolean;
  error: string;
  onCancel: () => void;
  onChange: (form: EmployeeForm) => void;
  onSubmit: (event: FormEvent) => void;
}) => (
  <form onSubmit={onSubmit} className="surface p-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h3 className="text-lg font-semibold text-white">{editing ? 'Edit Employee' : 'Add Employee'}</h3>
        <p className="mt-1 text-sm text-slate-500">Keep employee directory details current.</p>
      </div>
      <button type="button" className="btn-secondary" onClick={onCancel}>
        Cancel
      </button>
    </div>

    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <EmployeeField label="Name" value={form.name} onChange={(value) => onChange({ ...form, name: value })} />
      <EmployeeField label="Email" value={form.email} onChange={(value) => onChange({ ...form, email: value })} type="email" />
      <label>
        <span className="mb-2 block text-sm font-medium text-slate-300">Role</span>
        <select className="field" value={form.role} onChange={(event) => onChange({ ...form, role: event.target.value as Role })}>
          <option>Admin</option>
          <option>HR</option>
          <option>Employee</option>
        </select>
      </label>
      <EmployeeField label="Department" value={form.department} onChange={(value) => onChange({ ...form, department: value })} />
      <EmployeeField label="Designation" value={form.designation} onChange={(value) => onChange({ ...form, designation: value })} />
      <label>
        <span className="mb-2 block text-sm font-medium text-slate-300">Status</span>
        <select
          className="field"
          value={form.status}
          onChange={(event) => onChange({ ...form, status: event.target.value as EmploymentStatus })}
        >
          <option>Active</option>
          <option>Inactive</option>
          <option>On Leave</option>
        </select>
      </label>
      <EmployeeField
        label="Joining Date"
        value={form.joiningDate}
        onChange={(value) => onChange({ ...form, joiningDate: value })}
        type="date"
      />
      <EmployeeField label="Phone" value={form.phone ?? ''} onChange={(value) => onChange({ ...form, phone: value })} />
      <EmployeeField label="Location" value={form.location ?? ''} onChange={(value) => onChange({ ...form, location: value })} />
    </div>

    {error ? (
      <p className="mt-4 rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
        {error}
      </p>
    ) : null}

    <button type="submit" className="btn-primary mt-5">
      {editing ? 'Save Employee' : 'Add Employee'}
    </button>
  </form>
);

const EmployeeField = ({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) => (
  <label>
    <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
    <input className="field" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
);
