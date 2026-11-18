import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  reporteDesayunosApi,
  reporteIngresosApi,
  reporteLibroApi,
  reporteOcupacionApi,
  resultadoCentrosApi,
  type LibroMovimiento,
  type ReporteDesayunos,
  type ReporteIngresos,
  type ReporteOcupacion,
  type ResultadoCentro,
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

function formatoFechaHora(valor: string) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(valor)
  );
}

function formatoOrigen(valor: string) {
  return valor.replaceAll('_', ' ').toLowerCase();
}

export function ReportesPage() {
  const { token } = useAuth();
  const [fecha, setFecha] = useState(fechaLocal());
  const [ingresos, setIngresos] = useState<ReporteIngresos | null>(null);
  const [ocupacion, setOcupacion] = useState<ReporteOcupacion | null>(null);
  const [libro, setLibro] = useState<LibroMovimiento[]>([]);
  const [desayunos, setDesayunos] = useState<ReporteDesayunos | null>(null);
  const [mes, setMes] = useState(() => fechaLocal().slice(0, 7));
  const [resultado, setResultado] = useState<ResultadoCentro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    let activo = true;
    setCargando(true);
    setError('');

    Promise.all([
      reporteIngresosApi(token, fecha),
      reporteOcupacionApi(token),
      reporteLibroApi(token, fecha, fecha),
      reporteDesayunosApi(token, fecha),
    ])
      .then(([respuestaIngresos, respuestaOcupacion, respuestaLibro, respuestaDesayunos]) => {
        if (!activo) return;
        setIngresos(respuestaIngresos);
        setOcupacion(respuestaOcupacion);
        setLibro(respuestaLibro.movimientos);
        setDesayunos(respuestaDesayunos);
      })
      .catch((err) => {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudieron cargar los reportes');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [token, fecha]);

  useEffect(() => {
    if (!token) return;

    let activo = true;
    resultadoCentrosApi(token, mes)
      .then((respuesta) => {
        if (activo) setResultado(respuesta.centros);
      })
      .catch(() => {
        if (activo) setResultado([]);
      });

    return () => {
      activo = false;
    };
  }, [token, mes]);

  if (!token) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gold-dark">Análisis</p>
          <h1 className="font-display text-3xl text-stone">Reportes</h1>
          <p className="mt-1 text-sm text-stone-light">
            Ingresos del día, ocupación y movimientos contables.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label" htmlFor="fecha">Fecha</label>
            <input
              id="fecha"
              type="date"
              className="input"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
            />
          </div>
          <Link to="/caja" className="btn-primary">Ver caja</Link>
        </div>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <p className="text-sm text-stone-light">Ingresos del día</p>
          <p className="mt-2 font-display text-3xl text-navy">
            {formatoMoneda(ingresos?.total ?? 0)}
          </p>
          <p className="mt-2 text-xs text-stone-light">{fecha}</p>
        </div>
        <div className="card">
          <p className="text-sm text-stone-light">Habitaciones ocupadas</p>
          <p className="mt-2 font-display text-3xl text-navy">
            {ocupacion?.ocupadas ?? 0}
            <span className="text-base text-stone-light"> / {ocupacion?.total ?? 0}</span>
          </p>
          <p className="mt-2 text-xs text-stone-light">Ocupación actual</p>
        </div>
        <div className="card">
          <p className="text-sm text-stone-light">Ocupación</p>
          <p className="mt-2 font-display text-3xl text-navy">{ocupacion?.porcentaje ?? 0}%</p>
          <p className="mt-2 text-xs text-stone-light">Sobre habitaciones rentables</p>
        </div>
        <div className="card">
          <p className="text-sm text-stone-light">Movimientos contables</p>
          <p className="mt-2 font-display text-3xl text-navy">{libro.length}</p>
          <p className="mt-2 text-xs text-stone-light">Asientos del día</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card">
          <h2 className="font-display text-xl text-stone">Ingresos por centro</h2>

          {cargando ? (
            <p className="mt-4 text-sm text-stone-light">Cargando…</p>
          ) : !ingresos || ingresos.detalle.length === 0 ? (
            <p className="mt-4 text-sm text-stone-light">No hay ingresos registrados en la fecha.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cream-dark text-xs uppercase tracking-wide text-stone-light">
                    <th className="py-2 pr-3">Centro</th>
                    <th className="py-2 pr-3">Cuenta</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ingresos.detalle.map((fila) => (
                    <tr key={`${fila.centro_codigo}-${fila.cuenta_codigo}`} className="border-b border-cream-dark/60">
                      <td className="py-2 pr-3">
                        <p className="font-medium">{fila.centro}</p>
                        <p className="text-xs text-stone-light">{fila.centro_codigo}</p>
                      </td>
                      <td className="py-2 pr-3 text-stone-light">{fila.cuenta}</td>
                      <td className="py-2 text-right font-medium">
                        {formatoMoneda(Number(fila.total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="pt-3 text-sm font-semibold" colSpan={2}>Total</td>
                    <td className="pt-3 text-right text-sm font-semibold">
                      {formatoMoneda(ingresos.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="font-display text-xl text-stone">Libro del día</h2>

          {cargando ? (
            <p className="mt-4 text-sm text-stone-light">Cargando…</p>
          ) : libro.length === 0 ? (
            <p className="mt-4 text-sm text-stone-light">No hay movimientos contables en la fecha.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cream-dark text-xs uppercase tracking-wide text-stone-light">
                    <th className="py-2 pr-3">Cuenta</th>
                    <th className="py-2 pr-3">Centro</th>
                    <th className="py-2 pr-3 text-right">Debe</th>
                    <th className="py-2 text-right">Haber</th>
                  </tr>
                </thead>
                <tbody>
                  {libro.slice(0, 20).map((movimiento) => (
                    <tr key={movimiento.id} className="border-b border-cream-dark/60">
                      <td className="py-2 pr-3">
                        <p className="font-medium">{movimiento.cuenta}</p>
                        <p className="text-xs text-stone-light">
                          {movimiento.cuenta_codigo} · {formatoOrigen(movimiento.origen_tipo)}
                        </p>
                      </td>
                      <td className="py-2 pr-3 text-stone-light">{movimiento.centro}</td>
                      <td className="py-2 pr-3 text-right">
                        {Number(movimiento.debe) > 0 ? formatoMoneda(Number(movimiento.debe)) : '—'}
                      </td>
                      <td className="py-2 text-right">
                        {Number(movimiento.haber) > 0 ? formatoMoneda(Number(movimiento.haber)) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {libro.length > 20 && (
                <p className="mt-3 text-xs text-stone-light">
                  Mostrando 20 de {libro.length} movimientos.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl text-stone">Desayunos del día</h2>
          <span className="rounded-full bg-gold/10 px-3 py-1 text-xs font-medium text-gold-dark">
            {desayunos?.total ?? 0} desayunos
          </span>
        </div>

        {cargando ? (
          <p className="mt-4 text-sm text-stone-light">Cargando…</p>
        ) : !desayunos || desayunos.habitaciones.length === 0 ? (
          <p className="mt-4 text-sm text-stone-light">
            No hay desayunos incluidos o pagados para la fecha.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cream-dark text-xs uppercase tracking-wide text-stone-light">
                  <th className="py-2 pr-3">Habitación</th>
                  <th className="py-2 pr-3">Huésped</th>
                  <th className="py-2 pr-3">Modo</th>
                  <th className="py-2 text-right">Pax</th>
                </tr>
              </thead>
              <tbody>
                {desayunos.habitaciones.map((fila) => (
                  <tr key={`${fila.codigo}-${fila.habitacion}`} className="border-b border-cream-dark/60">
                    <td className="py-2 pr-3 font-medium">{fila.habitacion}</td>
                    <td className="py-2 pr-3 text-stone-light">{fila.huesped ?? 'Sin titular'}</td>
                    <td className="py-2 pr-3">{fila.modo}</td>
                    <td className="py-2 text-right">{Number(fila.pax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-stone">Resultado por centro</h2>
          <input
            type="month"
            className="input w-auto py-2 text-sm"
            value={mes}
            onChange={(event) => setMes(event.target.value)}
          />
        </div>

        {resultado.length === 0 ? (
          <p className="mt-4 text-sm text-stone-light">No hay movimientos en el mes.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cream-dark text-xs uppercase tracking-wide text-stone-light">
                  <th className="py-2 pr-3">Centro</th>
                  <th className="py-2 pr-3 text-right">Ingresos</th>
                  <th className="py-2 pr-3 text-right">Costos y gastos</th>
                  <th className="py-2 text-right">Margen</th>
                </tr>
              </thead>
              <tbody>
                {resultado.map((fila) => {
                  const ingresosCentro = Number(fila.ingresos);
                  const costosCentro = Number(fila.costos);
                  return (
                    <tr key={fila.centro_codigo} className="border-b border-cream-dark/60">
                      <td className="py-2 pr-3">
                        <p className="font-medium">{fila.centro}</p>
                        <p className="text-xs text-stone-light">{fila.centro_codigo}</p>
                      </td>
                      <td className="py-2 pr-3 text-right">{formatoMoneda(ingresosCentro)}</td>
                      <td className="py-2 pr-3 text-right">{formatoMoneda(costosCentro)}</td>
                      <td className="py-2 text-right font-medium">
                        {formatoMoneda(ingresosCentro - costosCentro)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-stone-light">
        Última actualización {ingresos ? formatoFechaHora(new Date().toISOString()) : '—'}.
      </p>
    </div>
  );
}
