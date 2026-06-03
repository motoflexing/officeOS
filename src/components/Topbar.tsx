import { LogOut, Menu, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { StatusBadge } from './StatusBadge';

export const Topbar = ({ onMenu }: { onMenu: () => void }) => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!profile) return null;

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/55 px-4 py-3 backdrop-blur lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          className="btn-secondary px-3 lg:hidden"
          onClick={onMenu}
          title="Open navigation"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0">
          <p className="truncate text-sm text-slate-500">Welcome back</p>
          <h1 className="truncate text-lg font-semibold text-white">{profile.name}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 md:flex">
            <UserCircle className="text-accent-500" size={22} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{profile.role}</p>
              <p className="truncate text-xs text-slate-500">{profile.email}</p>
            </div>
            <StatusBadge status={profile.status} />
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-accent-500/55 bg-black/30 px-3 py-2.5 text-sm font-semibold text-accent-200 transition hover:bg-accent-500/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent-500/35"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
