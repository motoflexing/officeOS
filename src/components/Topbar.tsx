import { LogOut, Menu, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { StatusBadge } from './StatusBadge';
import { ThemeToggle } from './ThemeToggle';

export const Topbar = ({ onMenu }: { onMenu: () => void }) => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!profile) return null;

  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--color-border-weak)] bg-[var(--color-overlay-55)] px-4 py-3 backdrop-blur lg:px-8">
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
          <p className="truncate text-sm text-[color:var(--color-text-muted)]">Welcome back</p>
          <h1 className="truncate text-lg font-semibold text-[color:var(--color-text-primary)]">{profile.name}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 rounded-lg border border-[color:var(--color-border-weak)] bg-[var(--color-fill-04)] px-3 py-2 md:flex">
            <UserCircle className="text-[color:var(--color-accent)]" size={22} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[color:var(--color-text-primary)]">{profile.role}</p>
              <p className="truncate text-xs text-[color:var(--color-text-muted)]">{profile.email}</p>
            </div>
            <StatusBadge status={profile.status} />
          </div>
          <ThemeToggle variant="icon" />
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--color-accent-55)] bg-[var(--color-overlay-30)] px-3 py-2.5 text-sm font-semibold text-accent-200 transition hover:bg-[var(--color-accent-10)] hover:text-[color:var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-35)]"
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
