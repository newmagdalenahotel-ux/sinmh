import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type EstadoApi = 'cargando' | 'ok' | 'error';

export function DashboardPage() {
  const { usuario } = useAuth();
  const [estadoApi, setEstadoApi] = useState<EstadoApi>('cargando');

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((respuesta) => setEstadoApi(respuesta.ok ? 'ok' : 'error'))
      .catch(() => setEstadoApi('error'));
  }, []);

  const tarjetas = [
    { titulo: 'Ocupación', valor: '—', detalle: 'Se activa con check-in' },
    { titulo: 'Ingresos de hoy', valor: '—', detalle: 'Se activa con caja' },
    { titulo: 'Llegadas hoy', valor: '—', detalle: 'Se activa con reservas' },
    { titulo: 'Caja', valor: '—', detalle: 'Se activa con apertura' },
  ];

  const estadoClase =
    estadoApi === 'ok'
      ? 'bg-success/10 text-success'
      : estadoApi === 'error'
        ? 'bg-error/10 text-error'
        : 'bg-cream-dark text-stone-light';

  const estadoTexto =
    estadoApi === 'ok' ? 'API: conectada' : estadoApi === 'error' ? 'API: sin conexión' : 'API: verificando…';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gold-dark">Recepción</p>
          <h1 className="font-display text-3xl text-stone">
            Buen día, {usuario?.nombre?.split(' ')[0] ?? 'equipo'}
          </h1>
          <p className="mt-1 text-sm text-stone-light">
            Franja 0: base y acceso funcionando. El check-in entra en la siguiente franja.
          </p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-medium ${estadoClase}`}>{estadoTexto}</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map((tarjeta) => (
          <div key={tarjeta.titulo} className="card">
            <p className="text-sm text-stone-light">{tarjeta.titulo}</p>
            <p className="mt-2 font-display text-4xl text-navy">{tarjeta.valor}</p>
            <p className="mt-2 text-xs text-stone-light">{tarjeta.detalle}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="font-display text-xl text-stone">Siguiente paso</h2>
          <p className="mt-2 text-sm text-stone-light">
            Check-in walk-in: tarifa por pax, descuento, datos del huésped, habitación, cobro y folio.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-gold/10 px-3 py-1 text-gold-dark">Tarifa por pax</span>
            <span className="rounded-full bg-gold/10 px-3 py-1 text-gold-dark">Suite 105</span>
            <span className="rounded-full bg-gold/10 px-3 py-1 text-gold-dark">Desayuno 15.000</span>
          </div>
        </div>

        <div className="card">
          <h2 className="font-display text-xl text-stone">Sesión</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-stone-light">Usuario</dt>
              <dd className="font-medium">{usuario?.username}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-light">Rol</dt>
              <dd className="font-medium text-gold-dark">{usuario?.rol}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-light">Base</dt>
              <dd className="font-medium">PGlite local</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
