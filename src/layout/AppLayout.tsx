import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';
import { BRANDING } from '../config/branding';
import { useAuth } from '../state/AuthContext';

export const AppLayout = () => {
  const { role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 flex-1">
        <Topbar onMenu={() => setSidebarOpen(true)} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
          <div className="mb-6 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-400">
            You are viewing the {BRANDING.workspaceName} workspace powered by {BRANDING.productName}.
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
