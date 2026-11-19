import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { CheckinPage } from './pages/CheckinPage';
import { CajaPage } from './pages/CajaPage';
import { FoliosPage } from './pages/FoliosPage';
import { ReportesPage } from './pages/ReportesPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';
import { BarPage } from './pages/BarPage';
import { ReservasPage } from './pages/ReservasPage';
import { ReservaDetallePage } from './pages/ReservaDetallePage';
import { ClientesPage } from './pages/ClientesPage';
import { CarteraPage } from './pages/CarteraPage';
import { CuentaSocioPage } from './pages/CuentaSocioPage';
import { HabitacionesPage } from './pages/HabitacionesPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/checkin" element={<CheckinPage />} />
          <Route path="/reservas" element={<ReservasPage />} />
          <Route path="/reservas/:id" element={<ReservaDetallePage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/cartera" element={<CarteraPage />} />
          <Route path="/cuenta-socio" element={<CuentaSocioPage />} />
          <Route path="/habitaciones" element={<HabitacionesPage />} />
          <Route path="/caja" element={<CajaPage />} />
          <Route path="/folios" element={<FoliosPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
          <Route path="/bar" element={<BarPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
