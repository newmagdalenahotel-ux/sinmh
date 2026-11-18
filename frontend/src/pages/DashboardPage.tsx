import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  productosApi,
  reporteIngresosApi,
  reporteOcupacionApi,
  reservasApi,
  sesionActualApi,
  tableroHabitacionesApi,
  ventasBarApi,
  type Producto,
  type ReservaResumen,
  type SesionCaja,
  type VentaBar,
} from '../lib/api';

function fechaLocal() {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

export function DashboardPage() {
  const { token } = useAuth();
  const [ocupacion, setOcupacion] = useState({ ocupadas: 0, total: 0, porcentaje: 0 });
  const [ingresos, setIngresos] = useState(0);
  const [sesion, setSesion] = useState<SesionCaja | null>(null);
  const [ventas, setVentas] = useState<VentaBar[]>([]);
  const [reservas, setReservas] = useState<ReservaResumen[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucias, setSucias] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    let activo = true;
    setCargando(true);

    Promise.all([
      reporteOcupacionApi(token),
      reporteIngresosApi(token, fechaLocal()),
      sesionActualApi(token),
      ventasBarApi(token),
      reservasApi(token),
      productosApi(token),
      tableroHabitacionesApi(token),
    ])
      .then(([ocu, ing, caja, bar, res, pro, tablero]) => {
        if (!activo) return;
        setOcupacion(ocu);
        setIngresos(ing.total);
        setSesion(caja.sesion);
        setVentas(bar.ventas);
        setReservas(res.reservas);
        setProductos(pro.productos);
        setSucias(tablero.habitaciones.filter((h) => h.estado === 'SUCIA').length);
      })
      .catch((err) => {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [token]);

  if (!token) return null;

  const hoy = fechaLocal();
  const llegadas = reservas.filter(
    (reserva) =>
      reserva.fecha_entrada.slice(0, 10) === hoy &&
      ['PENDIENTE', 'CONFIRMADA'].includes(reserva.estado)
  );
  const salidas = reservas.filter(
    (reserva) => reserva.fecha_salida.slice(0, 10) === hoy && reserva.estado === 'CHECKIN'
  );
  const stockBajo = productos.filter(
    (producto) => Number(producto.stock) <= Number(producto.stock_minimo)
  );
  const totalVentasBar = ventas.reduce((suma, venta) => suma + Number(venta.total), 0);

  const tarjetas = [
    {
      titulo: 'Ocupación',
      valor: `${ocupacion.ocupadas} / ${ocupacion.total}`,
      detalle: `${ocupacion.porcentaje}% de habitaciones`,
      enlace: '/habitaciones',
    },
    {
      titulo: 'Ingresos de hoy',
      valor: formatoMoneda(ingresos),
      detalle: 'Alojamiento, bar y servicios',
      enlace: '/reportes',
    },
    {
      titulo: 'Caja',
      valor: sesion ? formatoMoneda(sesion.efectivo_esperado) : 'Cerrada',
      detalle: sesion ? `Turno #${sesion.id}` : 'Abre la caja para cobrar efectivo',
      enlace: '/caja',
    },
    {
      titulo: 'Ventas de bar',
      valor: formatoMoneda(totalVentasBar),
      detalle: `${ventas.length} venta(s) registradas`,
      enlace: '/bar',
    },
  ];

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map((tarjeta) => (
          <Link key={tarjeta.titulo} to={tarjeta.enlace} className="card transition hover:border-gold/50">
            <p className="text-sm text-stone-light">{tarjeta.titulo}</p>
            <p className="mt-2 font-display text-3xl text-navy">{tarjeta.valor}</p>
            <p className="mt-2 text-xs text-stone-light">{tarjeta.detalle}</p>
          </Link>
        ))}
      </div>

      {!cargando && (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="card">
            <h2 className="font-display text-xl text-stone">Llegadas de hoy</h2>
            {llegadas.length === 0 ? (
              <p className="mt-3 text-sm text-stone-light">No hay llegadas pendientes.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {llegadas.slice(0, 6).map((reserva) => (
                  <div key={reserva.id} className="flex justify-between gap-2 text-sm">
                    <span>
                      {reserva.cliente ?? 'Sin titular'}
                      <span className="block text-xs text-stone-light">Hab. {reserva.habitacion}</span>
                    </span>
                    <Link to="/reservas" className="text-xs text-gold-dark">Ver</Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="font-display text-xl text-stone">Salidas de hoy</h2>
            {salidas.length === 0 ? (
              <p className="mt-3 text-sm text-stone-light">No hay salidas pendientes.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {salidas.slice(0, 6).map((reserva) => (
                  <div key={reserva.id} className="flex justify-between gap-2 text-sm">
                    <span>
                      {reserva.cliente ?? 'Sin titular'}
                      <span className="block text-xs text-stone-light">Hab. {reserva.habitacion}</span>
                    </span>
                    <Link to="/folios" className="text-xs text-gold-dark">Folio</Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="font-display text-xl text-stone">Alertas</h2>
            <div className="mt-3 space-y-2 text-sm">
              {!sesion && (
                <Link to="/caja" className="block rounded-lg bg-warning/10 px-3 py-2 text-warning">
                  Caja cerrada. Abre el turno.
                </Link>
              )}
              {sucias > 0 && (
                <Link to="/habitaciones" className="block rounded-lg bg-warning/10 px-3 py-2 text-warning">
                  {sucias} habitación(es) sucia(s).
                </Link>
              )}
              {stockBajo.length > 0 && (
                <Link to="/bar" className="block rounded-lg bg-warning/10 px-3 py-2 text-warning">
                  {stockBajo.length} producto(s) bajo stock mínimo.
                </Link>
              )}
              {sesion && sucias === 0 && stockBajo.length === 0 && (
                <p className="text-stone-light">Sin alertas pendientes.</p>
              )}
            </div>
          </section>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to="/reservas" className="btn-primary">Nueva reserva</Link>
        <Link to="/checkin" className="btn-secondary">Check-in directo</Link>
        <Link to="/bar" className="btn-secondary">Vender en bar</Link>
      </div>
    </div>
  );
}
