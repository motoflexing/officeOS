import { Navigate, Route, Routes } from 'react-router-dom';
import { DeveloperGuard } from './components/DeveloperGuard';
import { AppLayout } from './layout/AppLayout';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { AttendancePage } from './pages/AttendancePage';
import { DashboardPage } from './pages/DashboardPage';
import { DeveloperLoginPage } from './pages/DeveloperLoginPage';
import { DeveloperPanelPage } from './pages/DeveloperPanelPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { HRPanelPage } from './pages/HRPanelPage';
import { LeavePage } from './pages/LeavePage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { useAuth } from './state/AuthContext';

const RoleRoute = ({ allow, children }: { allow: string[]; children: React.ReactNode }) => {
  const { loading, role } = useAuth();
  if (loading) return <div className="p-6 text-sm text-slate-400">Loading workspace...</div>;
  if (!role) return <Navigate to="/login" replace />;
  if (!allow.includes(role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default function App() {
  const { loading, role } = useAuth();

  if (loading) {
    return <div className="min-h-screen p-6 text-sm text-slate-400">Loading workspace...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={role ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/developer-login" element={<DeveloperLoginPage />} />
      <Route
        path="/developer"
        element={
          <DeveloperGuard>
            <DeveloperPanelPage />
          </DeveloperGuard>
        }
      />
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/employees" element={<RoleRoute allow={['Admin', 'HR']}><EmployeesPage /></RoleRoute>} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/leave" element={<LeavePage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/hr" element={<RoleRoute allow={['HR']}><HRPanelPage /></RoleRoute>} />
        <Route path="/settings" element={<RoleRoute allow={['Admin']}><SettingsPage /></RoleRoute>} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to={role ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
