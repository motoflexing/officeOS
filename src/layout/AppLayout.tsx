import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';
import { BRANDING } from '../config/branding';
import { useAuth } from '../state/AuthContext';

export const AppLayout = () => {
  const { loading, role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return <div className="min-h-screen p-6 text-sm text-[color:var(--color-text-secondary)]">Loading OfficeOS...</div>;
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 flex-1">
        <Topbar onMenu={() => setSidebarOpen(true)} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
          <div className="mb-6 rounded-lg border border-[color:var(--color-border-weak)] bg-[var(--color-overlay-25)] px-4 py-3 text-sm text-[color:var(--color-text-secondary)]">
            You are viewing the {BRANDING.workspaceName} workspace.
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
