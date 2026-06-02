import {
  BarChart3,
  Bell,
  ClipboardList,
  LayoutDashboard,
  Settings,
  User,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { Role } from '../types';
import { PoweredBy } from './PoweredBy';

const roleItems = {
  Admin: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Employees', to: '/employees', icon: Users },
    { label: 'Daily Reports', to: '/reports', icon: ClipboardList },
    { label: 'Announcements', to: '/announcements', icon: Bell },
    { label: 'HR Panel', to: '/hr', icon: BarChart3 },
    { label: 'Settings', to: '/settings', icon: Settings },
    { label: 'Profile', to: '/profile', icon: User },
  ],
  HR: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Employees', to: '/employees', icon: Users },
    { label: 'Daily Reports', to: '/reports', icon: ClipboardList },
    { label: 'Announcements', to: '/announcements', icon: Bell },
    { label: 'HR Panel', to: '/hr', icon: BarChart3 },
    { label: 'Profile', to: '/profile', icon: User },
  ],
  Employee: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Daily Report', to: '/reports', icon: ClipboardList },
    { label: 'Announcements', to: '/announcements', icon: Bell },
    { label: 'Profile', to: '/profile', icon: User },
  ],
} satisfies Record<Role, Array<{ label: string; to: string; icon: typeof LayoutDashboard }>>;

export const Sidebar = ({ role, open, onClose }: { role: Role; open: boolean; onClose: () => void }) => (
  <>
    <div
      className={`fixed inset-0 z-30 bg-black/50 transition lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      onClick={onClose}
    />
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-ink-950/95 px-4 py-5 shadow-glow backdrop-blur transition lg:static lg:z-auto lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-600 text-sm font-bold text-white">
          GH
        </div>
        <div>
          <p className="text-base font-semibold text-white">Geekynd Hub</p>
          <p className="text-xs text-slate-500">Internal operations</p>
        </div>
      </div>

      <nav className="mt-8 space-y-1">
        {roleItems[role].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-accent-500/15 text-white ring-1 ring-accent-500/25'
                  : 'text-slate-400 hover:bg-white/[0.055] hover:text-slate-100'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Workspace</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">Geekynd Digital</p>
          <p className="mt-1 text-xs text-slate-500">Prototype data saved locally</p>
        </div>
        <PoweredBy />
      </div>
    </aside>
  </>
);
