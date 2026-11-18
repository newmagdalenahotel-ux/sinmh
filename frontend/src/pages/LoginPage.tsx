import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { token, iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  if (token) return <Navigate to="/dashboard" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setCargando(true);

    try {
      await iniciarSesion(username, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-dark p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl font-semibold text-cream/70">
            Sistema de Información
          </p>
          <p className="font-display text-3xl font-semibold text-gold">New Magdalena Hotel</p>
          <p className="mt-2 text-sm text-cream/60">Recepción 24 horas</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-gold/20 bg-cream p-8 shadow-2xl">
          <h1 className="font-display text-2xl text-stone">Entrar</h1>
          <p className="mt-1 text-sm text-stone-light">Usa tu usuario y contraseña.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="username">
                Usuario
              </label>
              <input
                id="username"
                className="input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                autoFocus
              />
            </div>

            {error && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}

            <button className="btn-primary w-full" type="submit" disabled={cargando}>
              {cargando ? 'Entrando…' : 'Entrar'}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-stone-light">Demo: admin / admin123</p>
        </form>
      </div>
    </div>
  );
}
