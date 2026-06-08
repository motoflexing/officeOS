import {
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  MessageCircle,
  MessagesSquare,
  Settings,
  User,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { BRANDING } from '../config/branding';
import { useAuth } from '../state/AuthContext';
import type { Role } from '../types';
import { PoweredBy } from './PoweredBy';

const WORKSPACE_URL = 'https://workspace.motoflexing.com';
const workspaceItem = { label: 'Workspace', description: 'Open Workspace', href: WORKSPACE_URL, icon: MessagesSquare };

const roleItems = {
  Admin: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    workspaceItem,
    { label: 'Attendance', to: '/attendance', icon: CalendarCheck },
    { label: 'Employees', to: '/employees', icon: Users },
    { label: 'Daily Reports', to: '/reports', icon: ClipboardList },
    { label: 'Leave Requests', to: '/leave', icon: CalendarDays },
    { label: 'Announcements', to: '/announcements', icon: Bell },
    { label: 'Feedback', to: '/feedback', icon: MessageCircle },
    { label: 'Settings', to: '/settings', icon: Settings },
    { label: 'Profile', to: '/profile', icon: User },
  ],
  HR: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    workspaceItem,
    { label: 'Attendance', to: '/attendance', icon: CalendarCheck },
    { label: 'Employees', to: '/employees', icon: Users },
    { label: 'Daily Reports', to: '/reports', icon: ClipboardList },
    { label: 'Leave Requests', to: '/leave', icon: CalendarDays },
    { label: 'Announcements', to: '/announcements', icon: Bell },
    { label: 'HR Panel', to: '/hr', icon: BarChart3 },
    { label: 'Feedback', to: '/feedback', icon: MessageCircle },
    { label: 'Profile', to: '/profile', icon: User },
  ],
  Employee: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    workspaceItem,
    { label: 'Attendance', to: '/attendance', icon: CalendarCheck },
    { label: 'Daily Report', to: '/reports', icon: ClipboardList },
    { label: 'Leave Requests', to: '/leave', icon: CalendarDays },
    { label: 'Announcements', to: '/announcements', icon: Bell },
    { label: 'Feedback', to: '/feedback', icon: MessageCircle },
    { label: 'Profile', to: '/profile', icon: User },
  ],
} satisfies Record<
  Role,
  Array<
    | { label: string; to: string; icon: typeof LayoutDashboard }
    | { label: string; description: string; href: string; icon: typeof LayoutDashboard }
  >
>;

export const Sidebar = ({ role, open, onClose }: { role: Role; open: boolean; onClose: () => void }) => {
  const { role: authenticatedRole } = useAuth();
  const sidebarRole = authenticatedRole || role;

  return (
    <>
    <div
      className={`fixed inset-0 z-30 bg-black/50 transition lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      onClick={onClose}
    />
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-black/90 px-4 py-5 shadow-glow backdrop-blur transition lg:static lg:z-auto lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-red-950 text-sm font-bold text-white shadow-[0_0_24px_rgba(239,35,43,0.26)]">
          GH
        </div>
        <div>
          <p className="text-base font-semibold text-white">{BRANDING.workspaceName}</p>
          <p className="text-xs text-slate-500">{BRANDING.productName}</p>
        </div>
      </div>

      <nav className="mt-8 space-y-1">
        {roleItems[sidebarRole].map((item) =>
          'href' in item ? (
            <button
              key={item.href}
              type="button"
              onClick={() => {
                window.open(item.href, '_blank');
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-400 transition hover:bg-white/[0.055] hover:text-slate-100"
              title={item.description}
            >
              <item.icon size={18} />
              <span className="min-w-0 flex-1">
                <span className="block leading-5">{item.label}</span>
                <span className="block truncate text-xs font-normal text-slate-500">{item.description}</span>
              </span>
              <ExternalLink size={14} className="shrink-0 text-slate-500" />
            </button>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-r from-red-950 via-red-900/75 to-accent-600/35 text-white shadow-[inset_0_0_0_1px_rgba(239,35,43,0.25)]'
                    : 'text-slate-400 hover:bg-white/[0.055] hover:text-slate-100'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ),
        )}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Company</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">{BRANDING.workspaceName}</p>
          <p className="mt-1 text-xs text-slate-500">{BRANDING.tagline}</p>
        </div>
        {authenticatedRole === 'Admin' ? <PoweredBy /> : null}
      </div>
    </aside>
    </>
  );
};
