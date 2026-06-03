import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { AttendancePage } from './pages/AttendancePage';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { HRPanelPage } from './pages/HRPanelPage';
import { LeavePage } from './pages/LeavePage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuth } from './state/AuthContext';

const RoleRoute = ({ allow, children }: { allow: string[]; children: React.ReactNode }) => {
  const { role } = useAuth();
  if (!role) return <Navigate to="/login" replace />;
  if (!allow.includes(role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default function App() {
  const { role } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={role ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/employees" element={<RoleRoute allow={['Admin', 'HR']}><EmployeesPage /></RoleRoute>} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/leave" element={<LeavePage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/hr" element={<RoleRoute allow={['Admin', 'HR']}><HRPanelPage /></RoleRoute>} />
        <Route path="/settings" element={<RoleRoute allow={['Admin']}><SettingsPage /></RoleRoute>} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to={role ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
