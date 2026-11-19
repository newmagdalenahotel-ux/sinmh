import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
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

const ayudas: Record<string, string[]> = {
  '/dashboard': [
    'Revisa ocupación, ingresos, caja y ventas del día.',
    'Las alertas te llevan a la pantalla que requiere atención.',
  ],
  '/reservas': [
    'Crea una reserva individual o una reserva grupal con un solo pagador.',
    'El anticipo puede ser efectivo, tarjeta o transferencia.',
    'Desde la reserva puedes editar, generar contrato o hacer check-in.',
  ],
  '/checkin': [
    'Busca disponibilidad por fechas y personas.',
    'El check-in crea el folio y permite cobrar el saldo o dejarlo a crédito.',
    'Si cobras en efectivo, abre la caja de recepción primero.',
  ],
  '/folios': [
    'Aquí viven los huéspedes en casa y sus consumos.',
    'Agrega cargos, registra pagos y haz el check-out.',
    'Al cerrar el folio se libera la habitación.',
  ],
  '/clientes': [
    'Las empresas y empleados pueden tener tarifa y cupo de crédito.',
    'La tarifa negociada se aplica automáticamente en sus reservas.',
  ],
  '/habitaciones': [
    'Este tablero muestra el estado operativo de las 31 habitaciones.',
    'Puedes marcar limpieza, mantenimiento o consultar la reserva activa.',
  ],
  '/bar': [
    'Vende productos con cobro directo o cargo a la habitación.',
    'El stock baja automáticamente con cada venta.',
  ],
  '/caja': [
    'Abre el turno antes de recibir efectivo.',
    'Registra gastos, retiros, aportes y traslados entre cajas.',
    'Al cerrar, declara el efectivo y descarga el cuadre en PDF.',
  ],
  '/cartera': [
    'Aquí están las cuentas por cobrar de empresas y empleados.',
    'Registra abonos en efectivo, tarjeta o transferencia.',
  ],
  '/cuenta-socio': [
    'Registra aportes y retiros del dueño.',
    'El saldo positivo significa dinero del socio en el hotel.',
  ],
  '/reportes': [
    'Consulta ingresos, ocupación, libro contable y desayunos.',
    'Cambia la fecha para revisar otro día.',
  ],
  '/configuracion': [
    'Crea usuarios de recepción, caja y gerencia.',
    'Cambia el rol o desactiva un usuario sin borrar su historial.',
  ],
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

const breadcrumbs: Array<{
  prefijo: string;
  modulo: string;
  pantalla: string;
  descripcion: string;
}> = [
  {
    prefijo: '/dashboard',
    modulo: 'Principal',
    pantalla: 'Dashboard',
    descripcion: 'Resumen de la operación de hoy.',
  },
  {
    prefijo: '/reservas',
    modulo: 'Alojamiento',
    pantalla: 'Reservas',
    descripcion: 'Crea la reserva, confirma la habitación y conviértela en check-in.',
  },
  {
    prefijo: '/checkin',
    modulo: 'Alojamiento',
    pantalla: 'Check-in',
    descripcion: 'Busca disponibilidad, cotiza y registra al huésped en una sola pantalla.',
  },
  {
    prefijo: '/folios',
    modulo: 'Alojamiento',
    pantalla: 'Huéspedes y folios',
    descripcion: 'Folios abiertos, cargos pendientes y check-out.',
  },
  {
    prefijo: '/clientes',
    modulo: 'Alojamiento',
    pantalla: 'Clientes',
    descripcion: 'Empresas, empleados y grupos con cupo y plazo de crédito.',
  },
  {
    prefijo: '/habitaciones',
    modulo: 'Alojamiento',
    pantalla: 'Habitaciones',
    descripcion: 'Estado de las 31 habitaciones rentables.',
  },
  {
    prefijo: '/bar',
    modulo: 'Bar y servicios',
    pantalla: 'Bar recepción',
    descripcion: 'Venta de productos, cobro directo o cargo a la habitación.',
  },
  {
    prefijo: '/caja',
    modulo: 'Caja',
    pantalla: 'Caja y turnos',
    descripcion: 'Apertura, movimientos y cierre del turno de recepción.',
  },
  {
    prefijo: '/cartera',
    modulo: 'Caja',
    pantalla: 'Cartera',
    descripcion: 'Empresas y empleados con saldo pendiente y abonos.',
  },
  {
    prefijo: '/cuenta-socio',
    modulo: 'Caja',
    pantalla: 'Cuenta socio',
    descripcion: 'Aportes y retiros del dueño.',
  },
  {
    prefijo: '/reportes',
    modulo: 'Análisis',
    pantalla: 'Reportes',
    descripcion: 'Ingresos del día, ocupación y movimientos contables.',
  },
  {
    prefijo: '/configuracion',
    modulo: 'Análisis',
    pantalla: 'Usuarios y roles',
    descripcion: 'Crea las cuentas de recepción, caja y gerencia.',
  },
];

function obtenerBreadcrumb(pathname: string) {
  const encontrado = breadcrumbs.find(
    (item) => pathname === item.prefijo || pathname.startsWith(`${item.prefijo}/`)
  );

  return (
    encontrado ?? {
      prefijo: '',
      modulo: 'Sistema de Información',
      pantalla: 'Recepción',
      descripcion: 'Sistema de Información New Magdalena Hotel.',
    }
  );
}

export function AppLayout() {
  const { usuario, cerrarSesion } = useAuth();
  const location = useLocation();
  const breadcrumb = obtenerBreadcrumb(location.pathname);
  const ayuda = ayudas[breadcrumb.prefijo] ?? [];
  const [menuMovil, setMenuMovil] = useState(false);
  const [seccionAbierta, setSeccionAbierta] = useState<string | null>(null);

  useEffect(() => {
    const seccionActual = navegacion.find((seccion) =>
      seccion.items.some(
        (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
      )
    );

    if (seccionActual && seccionActual.items.length > 1) {
      setSeccionAbierta(seccionActual.titulo);
    } else {
      setSeccionAbierta(null);
    }
    setMenuMovil(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuMovil) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuMovil(false);
    };
    window.addEventListener('keydown', cerrarConEscape);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', cerrarConEscape);
    };
  }, [menuMovil]);

  function alternarSeccion(titulo: string) {
    setSeccionAbierta((actual) => (actual === titulo ? null : titulo));
  }

  function renderNavegacion() {
    return (
      <nav className="flex-1 space-y-2 overflow-y-auto p-3" aria-label="Menú principal">
        {navegacion.map((seccion, indice) => {
          const tieneActiva = seccion.items.some(
            (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
          );

          if (seccion.items.length === 1) {
            const item = seccion.items[0];
            const enlace = item.activo ? (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                onClick={() => setMenuMovil(false)}
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
            );

            if (indice === 0) return enlace;

            return (
              <div key={seccion.titulo} className="mt-3 border-t border-white/10 pt-3">
                {enlace}
              </div>
            );
          }

          const abierta = seccionAbierta === seccion.titulo;

          return (
            <div key={seccion.titulo}>
              <button
                type="button"
                onClick={() => alternarSeccion(seccion.titulo)}
                aria-expanded={abierta}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider transition ${
                  tieneActiva
                    ? 'text-gold hover:bg-white/5'
                    : 'text-cream/45 hover:bg-white/5 hover:text-cream/70'
                }`}
              >
                <span>{seccion.titulo}</span>
                <span className="text-sm" aria-hidden="true">
                  {abierta ? '▾' : '▸'}
                </span>
              </button>

              {abierta && (
                <div className="mt-1 space-y-1">
                  {seccion.items.map((item) =>
                    item.activo ? (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuMovil(false)}
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
              )}
            </div>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="hidden w-60 shrink-0 flex-col bg-navy-dark text-cream lg:flex">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="font-display text-sm font-semibold leading-snug text-gold">
            Sistema de Información
            <br />
            New Magdalena Hotel
          </p>
        </div>

        {renderNavegacion()}

        <div className="border-t border-white/10 p-4 text-xs text-cream/50">v0.1 · Fase 1A</div>
      </aside>

      {menuMovil && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-navy-dark/70"
            onClick={() => setMenuMovil(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-navy-dark text-cream shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="font-display text-sm font-semibold leading-snug text-gold">
                  Sistema de Información
                  <br />
                  New Magdalena Hotel
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMenuMovil(false)}
                aria-label="Cerrar menú"
                className="rounded-lg border border-white/15 px-3 py-1 text-lg text-cream/80"
              >
                ×
              </button>
            </div>

            {renderNavegacion()}

            <div className="border-t border-white/10 p-4 text-xs text-cream/50">v0.1 · Fase 1A</div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center justify-between border-b border-cream-dark bg-navy px-4 py-2 text-cream lg:px-6">
          <h1 className="sr-only">{breadcrumb.pantalla}</h1>
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuMovil(true)}
              aria-label="Abrir menú"
              aria-expanded={menuMovil}
              className="rounded-lg border border-gold/40 px-3 py-1.5 text-lg leading-none text-gold lg:hidden"
            >
              ☰
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                <span className="hidden text-cream/50 sm:inline">{breadcrumb.modulo} / </span>
                <span className="text-gold">{breadcrumb.pantalla}</span>
              </p>
              <p className="hidden max-w-2xl truncate text-[11px] text-cream/55 sm:block">
                {breadcrumb.descripcion}
              </p>
            </div>
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

        <main className="flex-1 p-4 lg:p-8">
          {ayuda.length > 0 && (
            <details className="mb-4 rounded-xl border border-gold/20 bg-white/60 px-4 py-3 text-sm">
              <summary className="cursor-pointer font-medium text-stone">
                ¿Cómo funciona {breadcrumb.pantalla}?
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-stone-light">
                {ayuda.map((linea) => (
                  <li key={linea}>{linea}</li>
                ))}
              </ul>
            </details>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
