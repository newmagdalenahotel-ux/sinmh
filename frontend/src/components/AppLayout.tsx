import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type ItemNavegacion = {
  to: string;
  label: string;
  activo: boolean;
};

type SeccionNavegacion = {
  titulo: string;
  items: ItemNavegacion[];
};

const navegacion: SeccionNavegacion[] = [
  {
    titulo: 'Principal',
    items: [{ to: '/dashboard', label: 'Dashboard', activo: true }],
  },
  {
    titulo: 'Alojamiento',
    items: [
      { to: '/reservas', label: 'Reservas', activo: true },
      { to: '/checkin', label: 'Check-in', activo: true },
      { to: '/folios', label: 'Huéspedes y folios', activo: true },
      { to: '/clientes', label: 'Clientes', activo: true },
      { to: '/habitaciones', label: 'Habitaciones', activo: true },
    ],
  },
  {
    titulo: 'Bar y servicios',
    items: [{ to: '/bar', label: 'Bar recepción', activo: true }],
  },
  {
    titulo: 'Caja',
    items: [
      { to: '/caja', label: 'Caja y turnos', activo: true },
      { to: '/cartera', label: 'Cartera', activo: true },
      { to: '/cuenta-socio', label: 'Cuenta socio', activo: true },
    ],
  },
  {
    titulo: 'Análisis',
    items: [
      { to: '/reportes', label: 'Reportes', activo: true },
      { to: '/configuracion', label: 'Configuración', activo: true },
    ],
  },
];

export function AppLayout() {
  const { usuario, cerrarSesion } = useAuth();

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="flex w-60 shrink-0 flex-col bg-navy-dark text-cream">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="font-display text-lg text-gold">New Magdalena</p>
          <p className="mt-0.5 text-xs text-cream/60">SINMH · Recepción</p>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {navegacion.map((seccion) => (
            <div key={seccion.titulo}>
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-cream/40">
                {seccion.titulo}
              </p>
              <div className="space-y-1">
                {seccion.items.map((item) =>
                  item.activo ? (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `block rounded-lg px-3 py-2 text-sm transition ${
                          isActive
                            ? 'bg-gold font-semibold text-navy-dark'
                            : 'text-cream/80 hover:bg-white/10'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ) : (
                    <span
                      key={item.to}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-cream/40"
                    >
                      {item.label}
                      <span className="text-[10px] uppercase tracking-wide">pronto</span>
                    </span>
                  )
                )}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4 text-xs text-cream/50">v0.1 · Fase 1A</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-cream-dark bg-navy px-6 text-cream">
          <div>
            <p className="text-sm font-medium">Recepción</p>
            <p className="text-xs text-cream/60">Hotel New Magdalena</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{usuario?.nombre ?? '—'}</p>
              <p className="text-xs text-gold">{usuario?.rol ?? ''}</p>
            </div>
            <button
              onClick={cerrarSesion}
              className="rounded-lg border border-gold/40 px-3 py-1.5 text-xs text-gold transition hover:bg-gold hover:text-navy-dark"
            >
              Salir
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
