import { Plus, Search } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { EmployeeTable } from '../components/EmployeeTable';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Toast';
import { BRANDING } from '../config/branding';
import { accountService } from '../services/accountService';
import { companyId } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { isFirebaseConfigured } from '../services/firebase';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type { Employee, EmploymentStatus, Role, WorkMode } from '../types';

type EmployeeForm = Omit<Employee, 'id' | 'authUid' | 'createdAt' | 'createdBy'> & {
  temporaryPassword: string;
  confirmTemporaryPassword: string;
};

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
  workMode: 'Hybrid',
  phone: '',
  location: '',
  temporaryPassword: '',
  confirmTemporaryPassword: '',
};

export const EmployeesPage = () => {
  const { profile, role } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>(() => storage.getEmployees());
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | Role>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | EmploymentStatus>('All');
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    firestoreService
      .getEmployees()
      .then(setEmployees)
      .catch((error) => setError(error instanceof Error ? error.message : 'Unable to load employees.'))
      .finally(() => setLoading(false));
  }, []);

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
      workMode: employee.workMode ?? 'Hybrid',
      phone: employee.phone ?? '',
      location: employee.location ?? '',
      temporaryPassword: '',
      confirmTemporaryPassword: '',
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

  const saveEmployee = async (event: FormEvent) => {
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

    const allowedRoles = getAllowedCreateRoles(role ?? profile?.role ?? 'Employee');
    if (!editingEmployee && !allowedRoles.includes(form.role)) {
      setError('You do not have permission to create this role.');
      return;
    }

    if (!editingEmployee && isFirebaseConfigured) {
      if (form.temporaryPassword.length < 8) {
        setError('Temporary password must be at least 8 characters.');
        return;
      }

      if (form.temporaryPassword !== form.confirmTemporaryPassword) {
        setError('Confirm temporary password must match.');
        return;
      }
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
      workMode: form.workMode,
      phone: form.phone?.trim() || undefined,
      location: form.location?.trim() || undefined,
    };

    try {
      if (isFirebaseConfigured) {
        if (editingEmployee) {
          await firestoreService.updateEmployee(nextEmployee);
        } else {
          let createdUid = '';
          try {
            createdUid = await accountService.createAuthUser(normalizedEmail, form.temporaryPassword);
          } catch (error) {
            const message = getAccountCreationErrorMessage(error);
            setError(message);
            return;
          }

          const now = new Date().toISOString();
          const createdBy = profile?.email || 'OfficeOS';
          const employeeWithAccount: Employee = {
            ...nextEmployee,
            id: createdUid,
            authUid: createdUid,
            status: 'Active',
            createdAt: now,
            createdBy,
          };

          try {
            await firestoreService.createEmployeeAccountProfiles(
              createdUid,
              {
                name: employeeWithAccount.name,
                email: employeeWithAccount.email,
                role: employeeWithAccount.role,
                department: employeeWithAccount.department,
                designation: employeeWithAccount.designation,
                workMode: employeeWithAccount.workMode ?? 'Hybrid',
                status: 'Away',
                createdAt: now,
                createdBy,
              },
              employeeWithAccount,
            );
            nextEmployee.id = employeeWithAccount.id;
            nextEmployee.authUid = employeeWithAccount.authUid;
            nextEmployee.createdAt = employeeWithAccount.createdAt;
            nextEmployee.createdBy = employeeWithAccount.createdBy;
            nextEmployee.status = employeeWithAccount.status;
          } catch (error) {
            setError(
              error instanceof Error
                ? `Auth account was created, but Firestore profile setup failed: ${error.message}`
                : 'Auth account was created, but Firestore profile setup failed.',
            );
            return;
          }
        }
        setEmployees((current) =>
          current.some((employee) => employee.id === nextEmployee.id)
            ? current.map((employee) => (employee.id === nextEmployee.id ? nextEmployee : employee))
            : [nextEmployee, ...current],
        );
      } else {
        storage.upsertEmployee(nextEmployee);
        setEmployees(storage.getEmployees());
      }
      setToast(
        editingEmployee
          ? 'Employee details updated'
          : isFirebaseConfigured
            ? 'Employee account created successfully. Share the temporary password securely with the employee.'
            : 'Employee added to directory',
      );
      window.setTimeout(() => setToast(''), 2400);
      closeForm();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save employee.');
    }
  };

  const deleteEmployee = async (employee: Employee) => {
    const shouldDelete = window.confirm(`Delete ${employee.name} from the employee directory?`);
    if (!shouldDelete) return;
    try {
      if (isFirebaseConfigured) {
        await firestoreService.deleteEmployee(employee.id);
        setEmployees((current) => current.filter((item) => item.id !== employee.id));
      } else {
        storage.deleteEmployee(employee.id);
        setEmployees(storage.getEmployees());
      }
      setToast('Employee removed from directory');
      window.setTimeout(() => setToast(''), 2400);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to delete employee.');
    }
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)]" size={18} />
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
          allowedRoles={getAllowedCreateRoles(role ?? profile?.role ?? 'Employee')}
          requireAccountPassword={isFirebaseConfigured}
          onCancel={closeForm}
          onChange={setForm}
          onSubmit={saveEmployee}
        />
      ) : null}

      {loading ? (
        <EmptyState title="Loading employees" description="Fetching employee directory records." />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No employees found"
          description="Add your first employee to begin building the company directory."
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
  allowedRoles,
  form,
  editing,
  error,
  requireAccountPassword,
  onCancel,
  onChange,
  onSubmit,
}: {
  allowedRoles: Role[];
  form: EmployeeForm;
  editing: boolean;
  error: string;
  requireAccountPassword: boolean;
  onCancel: () => void;
  onChange: (form: EmployeeForm) => void;
  onSubmit: (event: FormEvent) => void | Promise<void>;
}) => {
  const roleOptions = editing && !allowedRoles.includes(form.role) ? [form.role, ...allowedRoles] : allowedRoles;

  return (
  <form onSubmit={onSubmit} className="surface p-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">{editing ? 'Edit Employee' : 'Add Employee'}</h3>
        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Keep employee directory details current.</p>
      </div>
      <button type="button" className="btn-secondary" onClick={onCancel}>
        Cancel
      </button>
    </div>

    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <EmployeeField label="Name" value={form.name} onChange={(value) => onChange({ ...form, name: value })} />
      <EmployeeField label="Email" value={form.email} onChange={(value) => onChange({ ...form, email: value })} type="email" />
      <label>
        <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Role</span>
        <select className="field" value={form.role} onChange={(event) => onChange({ ...form, role: event.target.value as Role })}>
          {roleOptions.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </select>
      </label>
      <EmployeeField label="Department" value={form.department} onChange={(value) => onChange({ ...form, department: value })} />
      <EmployeeField label="Designation" value={form.designation} onChange={(value) => onChange({ ...form, designation: value })} />
      <label>
        <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Work Mode</span>
        <select
          className="field"
          value={form.workMode}
          onChange={(event) => onChange({ ...form, workMode: event.target.value as WorkMode })}
        >
          <option>Office</option>
          <option>Remote</option>
          <option>Hybrid</option>
        </select>
      </label>
      <label>
        <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Status</span>
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
      {!editing ? (
        <>
          <EmployeeField
            label="Temporary Password"
            value={form.temporaryPassword}
            onChange={(value) => onChange({ ...form, temporaryPassword: value })}
            required={requireAccountPassword}
            type="password"
          />
          <EmployeeField
            label="Confirm Temporary Password"
            value={form.confirmTemporaryPassword}
            onChange={(value) => onChange({ ...form, confirmTemporaryPassword: value })}
            required={requireAccountPassword}
            type="password"
          />
        </>
      ) : null}
    </div>

    {error ? (
      <p className="mt-4 rounded-lg border border-[color:var(--color-error-line-25)] bg-[var(--color-error-fill-10)] px-4 py-3 text-sm text-[color:var(--color-error-text-200)]">
        {error}
      </p>
    ) : null}

    <button type="submit" className="btn-primary mt-5">
      {editing ? 'Save Employee' : requireAccountPassword ? 'Create Employee Account' : 'Add Employee'}
    </button>
  </form>
  );
};

const EmployeeField = ({
  label,
  value,
  onChange,
  required = true,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) => (
  <label>
    <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">{label}</span>
    <input className="field" required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
);

const getAllowedCreateRoles = (creatorRole: Role): Role[] => {
  if (creatorRole === 'Admin') return ['HR', 'Employee'];
  if (creatorRole === 'HR') return ['Employee'];
  return [];
};

const getAccountCreationErrorMessage = (error: unknown) => {
  if (
    typeof error === 'object' &&
    error &&
    'code' in error &&
    (error as { code?: string }).code === 'auth/email-already-in-use'
  ) {
    return 'An account with this email already exists.';
  }

  return error instanceof Error ? error.message : 'Unable to create employee account.';
};
