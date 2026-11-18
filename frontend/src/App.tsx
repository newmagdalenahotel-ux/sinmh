import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { CheckinPage } from './pages/CheckinPage';
import { CajaPage } from './pages/CajaPage';
import { FoliosPage } from './pages/FoliosPage';
import { ReportesPage } from './pages/ReportesPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/checkin" element={<CheckinPage />} />
          <Route path="/caja" element={<CajaPage />} />
          <Route path="/folios" element={<FoliosPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
