import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  contratoReservaPdfApi,
  reservaDetalleApi,
  type ReservaDetalleCompleto,
} from '../lib/api';

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatoFechaHora(valor: string | null | undefined) {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(valor));
}

function formatoFecha(valor: string | null | undefined) {
  if (!valor) return '—';
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
    NO_SHOW: 'No show',
  };
  return etiquetas[estado] ?? estado;
}

function claseEstado(estado: string) {
  const clases: Record<string, string> = {
    CONFIRMADA: 'bg-success/10 text-success',
    CHECKIN: 'bg-info/10 text-info',
    PENDIENTE: 'bg-warning/10 text-warning',
    CANCELADA: 'bg-error/10 text-error',
    NO_SHOW: 'bg-error/10 text-error',
    CHECKOUT: 'bg-cream-dark text-stone-light',
  };
  return clases[estado] ?? 'bg-cream-dark text-stone-light';
}

export function ReservaDetalleContenido({
  reservaId,
  onClose,
}: {
  reservaId: number;
  onClose?: () => void;
}) {
  const { token } = useAuth();
  const [detalle, setDetalle] = useState<ReservaDetalleCompleto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargar() {
      if (!token || !reservaId) return;
      setCargando(true);
      setError('');

      try {
        setDetalle(await reservaDetalleApi(token, reservaId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la reserva');
      } finally {
        setCargando(false);
      }
    }

    void cargar();
  }, [token, reservaId]);

  async function abrirContrato() {
    if (!token || !detalle) return;
    try {
      const blob = await contratoReservaPdfApi(token, detalle.reserva.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el contrato');
    }
  }

  if (cargando) {
    return <p className="text-sm text-stone-light">Cargando reserva…</p>;
  }

  if (error || !detalle) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
          {error || 'Reserva no encontrada'}
        </div>
        {onClose ? (
          <button type="button" className="btn-secondary" onClick={onClose}>
            Volver a reservas
          </button>
        ) : (
          <Link to="/reservas" className="btn-secondary">Volver a reservas</Link>
        )}      </div>
    );
  }

  const { reserva, huesped, cargos, pagos, cuentas_cobrar: cuentas, historial } = detalle;
  const totalCargos = cargos.reduce((suma, cargo) => suma + Number(cargo.monto), 0);
  const totalPagos = pagos.reduce((suma, pago) => suma + Number(pago.monto), 0);
  const noches = Math.max(
    0,
    Math.round(
      (Date.parse(`${reserva.fecha_salida.slice(0, 10)}T12:00:00`) -
        Date.parse(`${reserva.fecha_entrada.slice(0, 10)}T12:00:00`)) /
        86_400_000
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl text-stone">{reserva.codigo}</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${claseEstado(reserva.estado)}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {etiquetaEstado(reserva.estado)}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-light">
            Creada el {formatoFechaHora(reserva.created_at)}
            {reserva.maestra_codigo ? ` · Grupo ${reserva.maestra_codigo}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {onClose ? (
            <button type="button" className="btn-secondary" onClick={onClose}>
              Volver
            </button>
          ) : (
            <Link to="/reservas" className="btn-secondary">Volver</Link>
          )}
          <button className="btn-secondary" onClick={() => void abrirContrato()}>
            Contrato
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <section className="card">
            <h2 className="font-display text-xl text-stone">Estadía</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-light">Habitación</p>
                <p className="mt-1 font-medium text-stone">
                  Hab. {reserva.habitacion} · {reserva.es_suite ? 'Suite' : `${reserva.capacidad_max} pax`}
                </p>
                <p className="text-xs text-stone-light">{reserva.clima === 'AC' ? 'A/C' : 'Ventilador'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-light">Ocupantes</p>
                <p className="mt-1 font-medium text-stone">{reserva.pax} pax</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-light">Entrada</p>
                <p className="mt-1 font-medium text-stone">{formatoFecha(reserva.fecha_entrada)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-light">Salida</p>
                <p className="mt-1 font-medium text-stone">{formatoFecha(reserva.fecha_salida)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-light">Noches</p>
                <p className="mt-1 font-medium text-stone">{noches}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-light">Desayuno</p>
                <p className="mt-1 font-medium text-stone">{reserva.desayuno_modo}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-light">Check-in</p>
                <p className="mt-1 font-medium text-stone">{formatoFechaHora(huesped?.checkin_ts)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-light">Check-out</p>
                <p className="mt-1 font-medium text-stone">{formatoFechaHora(huesped?.checkout_ts)}</p>
              </div>
            </div>
            {reserva.notas && (
              <p className="mt-4 rounded-lg bg-cream px-3 py-2 text-sm text-stone-light">
                {reserva.notas}
              </p>
            )}
          </section>

          <section className="card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl text-stone">Consumos</h2>
              <span className="text-sm text-stone-light">{formatoMoneda(totalCargos)}</span>
            </div>
            {cargos.length === 0 ? (
              <p className="mt-4 text-sm text-stone-light">Sin consumos registrados.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-cream-dark text-xs uppercase tracking-wide text-stone-light">
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3">Concepto</th>
                      <th className="py-2 pr-3">Centro</th>
                      <th className="py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargos.map((cargo) => (
                      <tr key={cargo.id} className="border-b border-cream-dark/60">
                        <td className="py-2 pr-3 text-xs text-stone-light">
                          {formatoFechaHora(cargo.fecha)}
                        </td>
                        <td className="py-2 pr-3">
                          {cargo.concepto}
                          {cargo.es_cortesia && (
                            <span className="ml-2 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] text-gold-dark">
                              Cortesía
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-xs text-stone-light">{cargo.centro ?? '—'}</td>
                        <td className="py-2 text-right font-medium">{formatoMoneda(Number(cargo.monto))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl text-stone">Pagos y abonos</h2>
              <span className="text-sm text-stone-light">{formatoMoneda(totalPagos)}</span>
            </div>
            {pagos.length === 0 ? (
              <p className="mt-4 text-sm text-stone-light">Sin pagos registrados.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-cream-dark text-xs uppercase tracking-wide text-stone-light">
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3">Método</th>
                      <th className="py-2 pr-3">Tipo</th>
                      <th className="py-2 pr-3">Usuario</th>
                      <th className="py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map((pago) => (
                      <tr key={pago.id} className="border-b border-cream-dark/60">
                        <td className="py-2 pr-3 text-xs text-stone-light">{formatoFechaHora(pago.fecha)}</td>
                        <td className="py-2 pr-3">{pago.metodo_pago}</td>
                        <td className="py-2 pr-3 text-xs text-stone-light">
                          {pago.es_anticipo ? 'Anticipo' : 'Abono'}
                        </td>
                        <td className="py-2 pr-3 text-xs text-stone-light">{pago.usuario ?? '—'}</td>
                        <td className="py-2 text-right font-medium">{formatoMoneda(Number(pago.monto))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="font-display text-xl text-stone">Historial</h2>
            {historial.length === 0 ? (
              <p className="mt-4 text-sm text-stone-light">Sin movimientos registrados.</p>
            ) : (
              <ol className="mt-4 space-y-4">
                {historial.map((evento, indice) => (
                  <li key={`${evento.fecha}-${indice}`} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                    <div>
                      <p className="text-sm font-medium text-stone">{evento.titulo}</p>
                      <p className="text-xs text-stone-light">{formatoFechaHora(evento.fecha)}</p>
                      {evento.detalle && (
                        <p className="text-xs text-stone-light">{evento.detalle}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-6 self-start xl:sticky xl:top-6">
          <section className="card">
            <h2 className="font-display text-xl text-stone">Resumen financiero</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-light">Valor</dt>
                <dd className="font-medium">{formatoMoneda(Number(reserva.total))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-light">Anticipo</dt>
                <dd>{formatoMoneda(Number(reserva.anticipo))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-light">Pagos</dt>
                <dd>{formatoMoneda(totalPagos)}</dd>
              </div>
              <div className="flex justify-between border-t border-cream-dark pt-2 font-semibold">
                <dt>Saldo</dt>
                <dd>{formatoMoneda(Number(reserva.saldo))}</dd>
              </div>
            </dl>
            {cuentas.length > 0 && (
              <div className="mt-4 rounded-lg bg-warning/10 p-3 text-xs text-warning">
                <p className="font-medium">Cuenta por cobrar</p>
                {cuentas.map((cuenta) => (
                  <p key={cuenta.id}>
                    Saldo {formatoMoneda(Number(cuenta.saldo))} · {cuenta.estado}
                  </p>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="font-display text-xl text-stone">Huésped y pagador</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-light">Titular / pagador</p>
                <p className="font-medium text-stone">{reserva.cliente ?? '—'}</p>
                <p className="text-xs text-stone-light">
                  {reserva.cliente_tipo ?? ''} · {reserva.tipo_documento ?? ''}{' '}
                  {reserva.numero_documento ?? ''}
                </p>
              </div>
              {huesped && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-stone-light">Huésped</p>
                  <p className="font-medium text-stone">{huesped.nombre_completo}</p>
                  <p className="text-xs text-stone-light">
                    {huesped.tipo_documento ?? ''} {huesped.numero_documento ?? ''}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-light">Contacto</p>
                <p>{reserva.telefono ?? '—'}</p>
                <p className="text-xs text-stone-light">{reserva.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-light">Dirección</p>
                <p>{reserva.direccion ?? '—'}</p>
                <p className="text-xs text-stone-light">{reserva.ciudad ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-light">Visita</p>
                <p>{reserva.motivo_visita ?? '—'}</p>
                <p className="text-xs text-stone-light">
                  {reserva.como_llego ?? 'Sin datos de llegada'}
                  {reserva.placa_vehiculo ? ` · ${reserva.placa_vehiculo}` : ''}
                </p>
                {reserva.origen_reserva && (
                  <p className="text-xs text-stone-light">Origen: {reserva.origen_reserva}</p>
                )}
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="font-display text-xl text-stone">Tarifa</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-light">Plan</span>
                <span className="font-medium">{reserva.tarifa_plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-light">Precio/noche</span>
                <span>{formatoMoneda(Number(reserva.precio_noche))}</span>
              </div>
              {reserva.tarifa_negociada && (
                <div className="flex justify-between">
                  <span className="text-stone-light">Negociada</span>
                  <span>{formatoMoneda(Number(reserva.tarifa_negociada))}</span>
                </div>
              )}
              {reserva.tarifa_motivo && (
                <p className="text-xs text-stone-light">{reserva.tarifa_motivo}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function ReservaDetallePage() {
  const { id } = useParams();
  if (!id) return null;

  return (
    <div className="space-y-6">
      <ReservaDetalleContenido reservaId={Number(id)} />
    </div>
  );
}
