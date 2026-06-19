import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  MessageCircle,
  MessagesSquare,
  Settings,
  TrendingUp,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BRANDING } from '../config/branding';
import { useAuth } from '../state/AuthContext';
import type { Role } from '../types';
import { PoweredBy } from './PoweredBy';

type NavLinkItem = { label: string; to: string; icon: typeof LayoutDashboard };
type GroupItem = {
  label: string;
  group: true;
  icon: typeof LayoutDashboard;
  children: NavLinkItem[];
  // localStorage key persisting this accordion's open/closed state independently.
  storageKey: string;
  // Unique DOM id for the expandable region (aria-controls target).
  groupId: string;
};
type NavItem = NavLinkItem | GroupItem;

const workspaceItem: NavLinkItem = { label: 'Workspace', to: '/workspace', icon: MessagesSquare };

// The three previously top-level items (Employees, Attendance, Leave Requests) are
// grouped here under one non-navigating "Employees" accordion. The child `to` paths
// are unchanged, so routing and role visibility are identical to before.
const directoryChild: NavLinkItem = { label: 'Directory', to: '/employees', icon: Users };
const attendanceChild: NavLinkItem = { label: 'Attendance', to: '/attendance', icon: CalendarCheck };
const leaveChild: NavLinkItem = { label: 'Leave', to: '/leave', icon: CalendarDays };

// Admin/HR can see the employee directory (/employees is Admin/HR-only); Employee cannot.
const employeesGroupFull: GroupItem = {
  label: 'Employees',
  group: true,
  icon: Users,
  children: [directoryChild, attendanceChild, leaveChild],
  storageKey: 'sidebar:employees:open',
  groupId: 'sidebar-employees-group',
};
const employeesGroupEmployee: GroupItem = {
  label: 'Employees',
  group: true,
  icon: Users,
  children: [attendanceChild, leaveChild],
  storageKey: 'sidebar:employees:open',
  groupId: 'sidebar-employees-group',
};

// CRM "Clients" accordion — Admin/HR only (Employee has no CRM access at all).
const allClientsChild: NavLinkItem = { label: 'All Clients', to: '/clients', icon: Building2 };
const pipelineChild: NavLinkItem = { label: 'Pipeline', to: '/clients/pipeline', icon: TrendingUp };
const renewalsChild: NavLinkItem = { label: 'Renewals', to: '/clients/renewals', icon: CalendarClock };
const financeChild: NavLinkItem = { label: 'Finance', to: '/clients/finance', icon: Wallet };
const clientsGroup: GroupItem = {
  label: 'Clients',
  group: true,
  icon: Briefcase,
  children: [allClientsChild, pipelineChild, renewalsChild, financeChild],
  storageKey: 'sidebar:clients:open',
  groupId: 'sidebar-clients-group',
};

const roleItems = {
  Admin: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    workspaceItem,
    clientsGroup,
    employeesGroupFull,
    { label: 'Daily Reports', to: '/reports', icon: ClipboardList },
    { label: 'Announcements', to: '/announcements', icon: Bell },
    { label: 'Feedback', to: '/feedback', icon: MessageCircle },
    { label: 'Settings', to: '/settings', icon: Settings },
    { label: 'Profile', to: '/profile', icon: User },
  ],
  HR: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    workspaceItem,
    clientsGroup,
    employeesGroupFull,
    { label: 'Daily Reports', to: '/reports', icon: ClipboardList },
    { label: 'Announcements', to: '/announcements', icon: Bell },
    { label: 'HR Panel', to: '/hr', icon: BarChart3 },
    { label: 'Feedback', to: '/feedback', icon: MessageCircle },
    { label: 'Profile', to: '/profile', icon: User },
  ],
  Employee: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    workspaceItem,
    employeesGroupEmployee,
    { label: 'Daily Report', to: '/reports', icon: ClipboardList },
    { label: 'Announcements', to: '/announcements', icon: Bell },
    { label: 'Feedback', to: '/feedback', icon: MessageCircle },
    { label: 'Profile', to: '/profile', icon: User },
  ],
} satisfies Record<Role, NavItem[]>;

const navLinkClass = (isActive: boolean) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? 'bg-gradient-to-r from-red-950 via-red-900/75 to-[color:var(--color-accent-hover-35)] text-[color:var(--color-text-primary)] shadow-[var(--shadow-glow-inset)]'
      : 'text-[color:var(--color-text-secondary)] hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-bright)]'
  }`;

const NavAccordion = ({ item, onNavigate }: { item: GroupItem; onNavigate: () => void }) => {
  const location = useLocation();
  const childPaths = useMemo(() => item.children.map((child) => child.to), [item.children]);
  const hasActiveChild = childPaths.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
  );

  const [open, setOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem(item.storageKey);
    if (stored !== null) return stored === 'true';
    return hasActiveChild;
  });

  // Expand automatically when navigating onto one of the child routes.
  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  const toggle = () => {
    setOpen((previous) => {
      const next = !previous;
      localStorage.setItem(item.storageKey, String(next));
      return next;
    });
  };

  const groupId = item.groupId;

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={groupId}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
          hasActiveChild
            ? 'bg-gradient-to-r from-red-950 via-red-900/75 to-[color:var(--color-accent-hover-35)] text-[color:var(--color-text-primary)] shadow-[var(--shadow-glow-inset)]'
            : 'text-[color:var(--color-text-secondary)] hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-bright)]'
        }`}
      >
        <item.icon size={18} />
        <span className="min-w-0 flex-1">{item.label}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform duration-200 ease-out ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        id={groupId}
        role="group"
        aria-label={item.label}
        className={`overflow-hidden transition-all duration-200 ease-out ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="mt-1 space-y-1">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              onClick={onNavigate}
              tabIndex={open ? undefined : -1}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg py-2.5 pl-10 pr-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-r from-red-950 via-red-900/75 to-[color:var(--color-accent-hover-35)] text-[color:var(--color-text-primary)] shadow-[var(--shadow-glow-inset)]'
                    : 'text-[color:var(--color-text-secondary)] hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-bright)]'
                }`
              }
            >
              <child.icon size={18} />
              {child.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
};

export const Sidebar = ({ role, open, onClose }: { role: Role; open: boolean; onClose: () => void }) => {
  const { role: authenticatedRole } = useAuth();
  const sidebarRole = authenticatedRole || role;

  return (
    <>
    <div
      className={`fixed inset-0 z-30 bg-[var(--color-overlay-50)] transition lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      onClick={onClose}
    />
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[color:var(--color-border-weak)] bg-[var(--color-overlay-90)] px-4 py-5 shadow-glow backdrop-blur transition lg:static lg:z-auto lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-red-950 text-sm font-bold text-[color:var(--color-text-primary)] shadow-[var(--shadow-glow-24-26)]">
          GH
        </div>
        <div>
          <p className="text-base font-semibold text-[color:var(--color-text-primary)]">{BRANDING.workspaceName}</p>
          <p className="text-xs text-[color:var(--color-text-muted)]">{BRANDING.productName}</p>
        </div>
      </div>

      <nav className="mt-8 space-y-1">
        {roleItems[sidebarRole].map((item) =>
          'group' in item ? (
            <NavAccordion key={item.label} item={item} onNavigate={onClose} />
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ),
        )}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-xl border border-[color:var(--color-border-weak)] bg-[var(--color-fill-04)] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-text-muted)]">Company</p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--color-text-bright)]">{BRANDING.workspaceName}</p>
          <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{BRANDING.tagline}</p>
        </div>
        {authenticatedRole === 'Admin' ? <PoweredBy /> : null}
      </div>
    </aside>
    </>
  );
};
