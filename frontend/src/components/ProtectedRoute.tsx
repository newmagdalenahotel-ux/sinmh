import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function ProtectedRoute() {
  const { token, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-sm text-stone-light">
        Cargando…
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;

  return <Outlet />;
}
