import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { RecordLayout } from '../components/RecordLayout';
import { useToast } from '../components/Toast';
import {
  cancelarReservaMaestraApi,
  reservaMaestraDetalleApi,
  type ReservaMaestraDetalle,
} from '../lib/api';

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatoFecha(valor: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(`${valor.slice(0, 10)}T12:00:00`))
    .replace(/ de /g, ' ');
}

function etiquetaEstado(estado: string) {
  const etiquetas: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    CONFIRMADA: 'Confirmada',
    CHECKIN: 'Check-in activo',
    CHECKOUT: 'Check-out',
    CANCELADA: 'Cancelada',
  };
  return etiquetas[estado] ?? estado;
}

function claseEstado(estado: string) {
  const clases: Record<string, string> = {
    CONFIRMADA: 'bg-success/10 text-success',
    CHECKIN: 'bg-info/10 text-info',
    PENDIENTE: 'bg-warning/10 text-warning',
    CANCELADA: 'bg-error/10 text-error',
    CHECKOUT: 'bg-cream-dark text-stone-light',
  };
  return clases[estado] ?? 'bg-cream-dark text-stone-light';
}

export function GrupoDetallePage() {
  const { token } = useAuth();
  const toast = useToast();
  const { id } = useParams();
  const [detalle, setDetalle] = useState<ReservaMaestraDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    async function cargar() {
      if (!token || !id) return;
      setCargando(true);
      setError('');
      try {
        setDetalle(await reservaMaestraDetalleApi(token, Number(id)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el grupo');
      } finally {
        setCargando(false);
      }
    }
    void cargar();
  }, [token, id]);

  async function cancelar() {
    if (!token || !detalle) return;
    if (!window.confirm(`¿Cancelar el grupo ${detalle.maestra.codigo}?`)) return;
    setCancelando(true);
    setError('');
    try {
      await cancelarReservaMaestraApi(token, detalle.maestra.id);
      toast.success(`Grupo ${detalle.maestra.codigo} cancelado`);
      setDetalle(await reservaMaestraDetalleApi(token, detalle.maestra.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar el grupo');
    } finally {
      setCancelando(false);
    }
  }

  if (cargando) return <p className="text-sm text-stone-light">Cargando grupo…</p>;

  if (error || !detalle) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
          {error || 'Grupo no encontrado'}
        </div>
        <Link to="/reservas" className="btn-secondary">Volver a reservas</Link>
      </div>
    );
  }

  const { maestra, reservas } = detalle;
  const total = reservas.reduce((suma, reserva) => suma + Number(reserva.total), 0);
  const saldo = reservas.reduce((suma, reserva) => suma + Number(reserva.saldo), 0);
  const noches = Math.max(
    1,
    Math.round(
      (Date.parse(`${maestra.fecha_salida.slice(0, 10)}T12:00:00`) -
        Date.parse(`${maestra.fecha_entrada.slice(0, 10)}T12:00:00`)) /
        86_400_000
    )
  );
  const puedeCancelar = ['PENDIENTE', 'CONFIRMADA'].includes(maestra.estado);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl text-stone">{maestra.codigo}</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${claseEstado(maestra.estado)}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {etiquetaEstado(maestra.estado)}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-light">
            {reservas.length} habitaciones · pagador {maestra.pagador}
          </p>
        </div>
        <Link to="/reservas" className="btn-secondary">Volver</Link>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <RecordLayout
        sidebar={
          <>
            <section className="card">
              <h2 className="font-display text-xl text-stone">Resumen</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-light">Habitaciones</dt>
                  <dd>{reservas.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-light">Noches</dt>
                  <dd>{noches}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-light">Total</dt>
                  <dd className="font-medium">{formatoMoneda(total)}</dd>
                </div>
                <div className="flex justify-between border-t border-cream-dark pt-2 font-semibold">
                  <dt>Saldo</dt>
                  <dd>{formatoMoneda(saldo)}</dd>
                </div>
              </dl>
                {puedeCancelar && (
                  <button
                    className="btn-secondary mt-4 w-full border-error/40 text-error"
                    onClick={() => void cancelar()}
                    disabled={cancelando}
                  >
                    {cancelando ? 'Cancelando…' : 'Cancelar grupo'}
                  </button>
                )}
            </section>

            <section className="card">
              <h2 className="font-display text-xl text-stone">Pagador</h2>
              <p className="mt-3 font-medium text-stone">{maestra.pagador}</p>
              <p className="text-xs text-stone-light">
                {maestra.tipo_documento ?? ''} {maestra.numero_documento ?? ''}
              </p>
              <p className="mt-2 text-sm text-stone-light">{maestra.telefono ?? 'Sin teléfono'}</p>
              <p className="text-sm text-stone-light">{maestra.email ?? 'Sin email'}</p>
              <p className="mt-2 text-xs text-stone-light">Tarifa {maestra.tarifa_plan}</p>
            </section>
          </>
        }
      >
        <section className="card">
          <h2 className="font-display text-xl text-stone">Habitaciones del grupo</h2>
          <p className="mt-1 text-sm text-stone-light">
            {formatoFecha(maestra.fecha_entrada)} — {formatoFecha(maestra.fecha_salida)}
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-cream-dark text-xs uppercase tracking-wide text-stone-light">
                  <th className="py-2 pr-3">Reserva</th>
                  <th className="py-2 pr-3">Habitación</th>
                  <th className="py-2 pr-3">Pax</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 text-right">Total</th>
                  <th className="py-2 text-right">Saldo</th>
                  <th className="py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((reserva) => (
                  <tr key={reserva.id} className="border-b border-cream-dark/60">
                    <td className="py-3 pr-3 font-medium">{reserva.codigo}</td>
                    <td className="py-3 pr-3">Hab. {reserva.habitacion}</td>
                    <td className="py-3 pr-3">{reserva.pax} pax</td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${claseEstado(reserva.estado)}`}>
                        {etiquetaEstado(reserva.estado)}
                      </span>
                    </td>
                    <td className="py-3 text-right">{formatoMoneda(Number(reserva.total))}</td>
                    <td className="py-3 text-right">{formatoMoneda(Number(reserva.saldo))}</td>
                    <td className="py-3 text-right">
                      <Link to={`/reservas/${reserva.id}`} className="text-xs text-gold-dark underline">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {maestra.notas && (
          <section className="card">
            <h2 className="font-display text-xl text-stone">Notas</h2>
            <p className="mt-2 text-sm text-stone-light">{maestra.notas}</p>
          </section>
        )}
      </RecordLayout>
    </div>
  );
}
