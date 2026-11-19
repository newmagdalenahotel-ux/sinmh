import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { MoneyInput } from '../components/MoneyInput';
import { useToast } from '../components/Toast';
import {
  abrirCajaApi,
  cajaCambioTurnoApi,
  cajaMovimientoApi,
  cajaPuntosVentaApi,
  cajaSesionesAbiertasApi,
  cajaTrasladoApi,
  cerrarCajaApi,
  cuadreCajaPdfApi,
  sesionActualApi,
  type PuntoVenta,
  type SesionAbierta,
  type SesionCaja,
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
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor));
}

function formatoTipo(valor: string) {
  return valor.replaceAll('_', ' ').toLowerCase();
}

export function CajaPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [sesion, setSesion] = useState<SesionCaja | null>(null);
  const [cierre, setCierre] = useState<SesionCaja | null>(null);
  const [sesionesAbiertas, setSesionesAbiertas] = useState<SesionAbierta[]>([]);
  const [puntosVenta, setPuntosVenta] = useState<PuntoVenta[]>([]);
  const [puntoVentaCodigo, setPuntoVentaCodigo] = useState('RECEPCION');
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [montoApertura, setMontoApertura] = useState<number | ''>('');
  const [montoDeclarado, setMontoDeclarado] = useState<number | ''>('');
  const [movTipo, setMovTipo] = useState<
    'GASTO_EFECTIVO' | 'RETIRO_DUENO' | 'APORTE' | 'AJUSTE_FALTANTE' | 'AJUSTE_SOBRANTE'
  >('GASTO_EFECTIVO');
  const [movMonto, setMovMonto] = useState<number | ''>('');
  const [movDescripcion, setMovDescripcion] = useState('');
  const [movCuenta, setMovCuenta] = useState('6105');
  const [movSoporte, setMovSoporte] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const [montoCambio, setMontoCambio] = useState<number | ''>('');
  const [trasladoOrigen, setTrasladoOrigen] = useState('');
  const [trasladoDestino, setTrasladoDestino] = useState('');
  const [trasladoMonto, setTrasladoMonto] = useState<number | ''>('');
  const [trasladoDescripcion, setTrasladoDescripcion] = useState('Traslado a caja central');
  const [trasladando, setTrasladando] = useState(false);

  useEffect(() => {
    if (token) void cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function cargarTodo() {
    if (!token) return;
    setCargando(true);
    setError('');

    try {
      const [actual, respuestaPuntos, respuestaAbiertas] = await Promise.all([
        sesionActualApi(token),
        cajaPuntosVentaApi(token),
        cajaSesionesAbiertasApi(token),
      ]);

      setSesion(actual.sesion);
      setPuntosVenta(respuestaPuntos.puntos_venta);
      setSesionesAbiertas(respuestaAbiertas.sesiones);
      if (actual.sesion) setMontoDeclarado(actual.sesion.efectivo_esperado);

      if (respuestaAbiertas.sesiones.length >= 2) {
        setTrasladoOrigen((actualOrigen) =>
          actualOrigen && respuestaAbiertas.sesiones.some((item) => String(item.id) === actualOrigen)
            ? actualOrigen
            : String(respuestaAbiertas.sesiones[0].id)
        );
        setTrasladoDestino((actualDestino) =>
          actualDestino && respuestaAbiertas.sesiones.some((item) => String(item.id) === actualDestino)
            ? actualDestino
            : String(respuestaAbiertas.sesiones[1].id)
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar la caja');
    } finally {
      setCargando(false);
    }
  }

  async function abrir() {
    if (!token) return;
    setProcesando(true);
    setError('');

    try {
      await abrirCajaApi(token, Number(montoApertura || 0), undefined, puntoVentaCodigo);
      setCierre(null);
      setMontoApertura('');
      toast.success(`Caja ${puntoVentaCodigo} abierta`);
      await cargarTodo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir la caja');
    } finally {
      setProcesando(false);
    }
  }

  async function cerrar() {
    if (!token || !sesion) return;
    setProcesando(true);
    setError('');

    try {
      const respuesta = await cerrarCajaApi(token, sesion.id, Number(montoDeclarado || 0));
      setCierre(respuesta.sesion);
      setSesion(null);
      setMontoDeclarado('');
      await cargarTodo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la caja');
    } finally {
      setProcesando(false);
    }
  }

  async function registrarMovimiento() {
    if (!token || !sesion) return;

    if (!movDescripcion.trim()) {
      setError('Escribe la descripción del movimiento');
      return;
    }

    if (Number(movMonto || 0) <= 0) {
      setError('El monto debe ser mayor a cero');
      return;
    }

    setRegistrando(true);
    setError('');

    try {
      await cajaMovimientoApi(token, {
        tipo: movTipo,
        monto: Number(movMonto),
        descripcion: movDescripcion.trim(),
        cuenta_codigo: movTipo === 'GASTO_EFECTIVO' ? movCuenta : undefined,
        soporte_url: movSoporte.trim() || undefined,
      });

      const actual = await sesionActualApi(token);
      setSesion(actual.sesion);
      toast.success('Movimiento registrado');
      setMovMonto('');
      setMovDescripcion('');
      setMovSoporte('');
      await cargarTodo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el movimiento');
    } finally {
      setRegistrando(false);
    }
  }

  async function cambioTurno() {
    if (!token || !sesion) return;

    const monto = Number(montoCambio || montoDeclarado || 0);
    setProcesando(true);
    setError('');

    try {
      const respuesta = await cajaCambioTurnoApi(token, sesion.id, monto);
      toast.success(
        `Cambio de turno: cierre #${respuesta.cierre.id}, nuevo turno #${respuesta.nueva.id}, diferencia ${formatoMoneda(respuesta.diferencia)}`
      );
      setMontoCambio('');
      await cargarTodo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo hacer el cambio de turno');
    } finally {
      setProcesando(false);
    }
  }

  async function trasladar() {
    if (!token) return;
    if (!trasladoOrigen || !trasladoDestino || trasladoOrigen === trasladoDestino) {
      setError('Selecciona dos cajas diferentes');
      return;
    }

    if (Number(trasladoMonto || 0) <= 0) {
      setError('El monto del traslado debe ser mayor a cero');
      return;
    }

    setTrasladando(true);
    setError('');

    try {
      await cajaTrasladoApi(token, {
        sesion_origen_id: Number(trasladoOrigen),
        sesion_destino_id: Number(trasladoDestino),
        monto: Number(trasladoMonto),
        descripcion: trasladoDescripcion.trim() || 'Traslado entre cajas',
      });
      toast.success('Traslado registrado');
      setTrasladoMonto('');
      await cargarTodo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el traslado');
    } finally {
      setTrasladando(false);
    }
  }

  async function descargarCuadre() {
    if (!token || !sesion) return;
    setError('');

    try {
      const blob = await cuadreCajaPdfApi(token, sesion.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el cuadre');
    }
  }

  if (!token) return null;

  if (cargando) {
    return <div className="text-sm text-stone-light">Consultando caja…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link to="/checkin" className="btn-primary">
          Ir a check-in
        </Link>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      {cierre && (
        <section className="card border-success/30 bg-success/5">
          <p className="text-sm font-medium text-success">Caja cerrada</p>
          <h2 className="mt-1 font-display text-2xl text-stone">
            {Number(cierre.diferencia) === 0 ? 'Cuadre exacto' : 'Cierre con diferencia'}
          </h2>

          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/70 p-4">
              <dt className="text-xs text-stone-light">Efectivo esperado</dt>
              <dd className="mt-1 text-lg font-semibold">
                {formatoMoneda(Number(cierre.monto_sistema_efectivo ?? 0))}
              </dd>
            </div>
            <div className="rounded-xl bg-white/70 p-4">
              <dt className="text-xs text-stone-light">Declarado</dt>
              <dd className="mt-1 text-lg font-semibold">
                {formatoMoneda(Number(cierre.monto_declarado ?? 0))}
              </dd>
            </div>
            <div className="rounded-xl bg-white/70 p-4">
              <dt className="text-xs text-stone-light">Diferencia</dt>
              <dd
                className={`mt-1 text-lg font-semibold ${
                  Number(cierre.diferencia) === 0 ? 'text-success' : 'text-error'
                }`}
              >
                {formatoMoneda(Number(cierre.diferencia ?? 0))}
              </dd>
            </div>
          </dl>

          <button
            className="btn-primary mt-5"
            onClick={() => {
              setCierre(null);
              setMontoApertura('');
            }}
          >
            Abrir nueva caja
          </button>
        </section>
      )}

      {!cierre && !sesion && (
        <section className="card max-w-xl">
          <h2 className="font-display text-xl text-stone">Abrir caja</h2>
          <p className="mt-1 text-sm text-stone-light">
            Cuenta el efectivo inicial del turno y regístralo. Sin caja abierta no se pueden
            cobrar pagos en efectivo.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="punto_venta">Punto de venta</label>
              <select
                id="punto_venta"
                className="input"
                value={puntoVentaCodigo}
                onChange={(event) => setPuntoVentaCodigo(event.target.value)}
              >
                {puntosVenta.map((punto) => (
                  <option key={punto.codigo} value={punto.codigo}>
                    {punto.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="monto_apertura">Monto inicial en efectivo</label>
              <MoneyInput
                id="monto_apertura"
                value={montoApertura}
                onChange={setMontoApertura}
              />
            </div>
          </div>

          <button className="btn-primary mt-4" onClick={() => void abrir()} disabled={procesando}>
            {procesando ? 'Abriendo…' : 'Abrir caja'}
          </button>
        </section>
      )}

      {!cierre && sesion && (
        <>
          <section className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-success">Caja abierta</p>
                <h2 className="mt-1 font-display text-2xl text-stone">
                  Turno #{sesion.id}
                </h2>
                <p className="mt-1 text-sm text-stone-light">
                  Abierta {formatoFecha(sesion.fecha_apertura)}
                </p>
              </div>
              <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                {sesion.movimientos.length} movimiento(s)
              </span>
              <button
                className="rounded-lg border border-gold/40 px-3 py-1 text-xs text-gold-dark"
                onClick={() => void descargarCuadre()}
              >
                Cuadre PDF
              </button>
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-cream-dark/60 p-4">
                <dt className="text-xs text-stone-light">Monto inicial</dt>
                <dd className="mt-1 text-lg font-semibold">
                  {formatoMoneda(Number(sesion.monto_apertura))}
                </dd>
              </div>
              <div className="rounded-xl bg-cream-dark/60 p-4">
                <dt className="text-xs text-stone-light">Efectivo esperado</dt>
                <dd className="mt-1 text-lg font-semibold">
                  {formatoMoneda(sesion.efectivo_esperado)}
                </dd>
              </div>
              <div className="rounded-xl bg-cream-dark/60 p-4">
                <dt className="text-xs text-stone-light">Estado</dt>
                <dd className="mt-1 text-lg font-semibold text-success">Abierta</dd>
              </div>
            </dl>
          </section>

          <section className="card">
            <h2 className="font-display text-xl text-stone">Movimientos del turno</h2>

            {sesion.movimientos.length === 0 ? (
              <p className="mt-3 text-sm text-stone-light">Todavía no hay movimientos.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-cream-dark text-xs uppercase tracking-wide text-stone-light">
                      <th className="py-2 pr-4">Tipo</th>
                      <th className="py-2 pr-4">Referencia</th>
                      <th className="py-2 pr-4">Monto</th>
                      <th className="py-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sesion.movimientos.map((movimiento) => (
                      <tr key={movimiento.id} className="border-b border-cream-dark/60">
                        <td className="py-2 pr-4 capitalize">{formatoTipo(movimiento.tipo)}</td>
                        <td className="py-2 pr-4 text-stone-light">
                          {movimiento.referencia_tipo ?? '—'}
                          {movimiento.referencia_id ? ` #${movimiento.referencia_id}` : ''}
                        </td>
                        <td className="py-2 pr-4 font-medium">
                          {formatoMoneda(Number(movimiento.monto))}
                        </td>
                        <td className="py-2 text-stone-light">{formatoFecha(movimiento.fecha)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="font-display text-xl text-stone">Registrar movimiento</h2>
            <p className="mt-1 text-sm text-stone-light">
              Gastos, retiros del dueño, aportes y ajustes del turno.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="mov_tipo">Tipo</label>
                <select
                  id="mov_tipo"
                  className="input"
                  value={movTipo}
                  onChange={(event) =>
                    setMovTipo(
                      event.target.value as
                        | 'GASTO_EFECTIVO'
                        | 'RETIRO_DUENO'
                        | 'APORTE'
                        | 'AJUSTE_FALTANTE'
                        | 'AJUSTE_SOBRANTE'
                    )
                  }
                >
                  <option value="GASTO_EFECTIVO">Gasto en efectivo</option>
                  <option value="RETIRO_DUENO">Retiro del dueño</option>
                  <option value="APORTE">Aporte del dueño</option>
                  <option value="AJUSTE_FALTANTE">Ajuste por faltante</option>
                  <option value="AJUSTE_SOBRANTE">Ajuste por sobrante</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="mov_monto">Monto</label>
                <MoneyInput id="mov_monto" value={movMonto} onChange={setMovMonto} />
              </div>
            </div>

            <div className="mt-3">
              <label className="label" htmlFor="mov_descripcion">Descripción</label>
              <input
                id="mov_descripcion"
                className="input"
                value={movDescripcion}
                onChange={(event) => setMovDescripcion(event.target.value)}
                placeholder="Compra de nevera, retiro del dueño, ajuste…"
              />
            </div>

            {movTipo === 'GASTO_EFECTIVO' && (
              <div className="mt-3">
                <label className="label" htmlFor="mov_cuenta">Cuenta del gasto</label>
                <select
                  id="mov_cuenta"
                  className="input"
                  value={movCuenta}
                  onChange={(event) => setMovCuenta(event.target.value)}
                >
                  <option value="6101">Lavandería</option>
                  <option value="6102">Servicios</option>
                  <option value="6103">Nómina</option>
                  <option value="6104">Mantenimiento</option>
                  <option value="6105">Administración</option>
                  <option value="6106">Cortesías</option>
                  <option value="6108">General</option>
                </select>
              </div>
            )}

            <div className="mt-3">
              <label className="label" htmlFor="mov_soporte">Soporte o factura (URL)</label>
              <input
                id="mov_soporte"
                className="input"
                value={movSoporte}
                onChange={(event) => setMovSoporte(event.target.value)}
                placeholder="Enlace al soporte digital"
              />
            </div>

            <button
              className="btn-primary mt-4 w-full"
              onClick={() => void registrarMovimiento()}
              disabled={registrando || !movDescripcion || Number(movMonto || 0) <= 0}
            >
              {registrando ? 'Registrando…' : 'Registrar movimiento'}
            </button>
          </section>

          <section className="card">
            <h2 className="font-display text-xl text-stone">Cambio de turno</h2>
            <p className="mt-1 text-sm text-stone-light">
              El entrante cuenta el efectivo, el saliente responde y el nuevo turno abre con lo contado.
            </p>

            <div className="mt-4">
              <label className="label" htmlFor="monto_cambio">Efectivo contado por el entrante</label>
              <MoneyInput
                id="monto_cambio"
                value={montoCambio}
                onChange={setMontoCambio}
                placeholder={String(sesion.efectivo_esperado)}
              />
            </div>

            <button
              className="btn-primary mt-4 w-full"
              onClick={() => void cambioTurno()}
              disabled={procesando}
            >
              {procesando ? 'Entregando…' : 'Entregar turno y abrir nuevo'}
            </button>
          </section>

          <section className="card max-w-xl">
            <h2 className="font-display text-xl text-stone">Cerrar caja</h2>
            <p className="mt-1 text-sm text-stone-light">
              Cuenta el efectivo físico y compáralo con el esperado.
            </p>

            <div className="mt-4">
              <label className="label" htmlFor="monto_declarado">Efectivo declarado</label>
              <MoneyInput
                id="monto_declarado"
                value={montoDeclarado}
                onChange={setMontoDeclarado}
              />
              <p className="mt-2 text-xs text-stone-light">
                Esperado por el sistema: {formatoMoneda(sesion.efectivo_esperado)}
              </p>
            </div>

            <button className="btn-primary mt-4" onClick={() => void cerrar()} disabled={procesando}>
              {procesando ? 'Cerrando…' : 'Cerrar caja'}
            </button>
          </section>
        </>
      )}
      {sesionesAbiertas.length > 0 && (
        <section className="card">
          <h2 className="font-display text-xl text-stone">Cajas abiertas y traslados</h2>
          <p className="mt-1 text-sm text-stone-light">
            El efectivo de bar terraza o restaurante se traslada a la caja central.
          </p>

          <div className="mt-4 space-y-2">
            {sesionesAbiertas.map((abierta) => (
              <div
                key={abierta.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cream-dark px-3 py-2 text-sm"
              >
                <span className="font-medium">{abierta.punto_venta_nombre}</span>
                <span className="text-stone-light">
                  Turno #{abierta.id} · esperado {formatoMoneda(abierta.efectivo_esperado)}
                </span>
              </div>
            ))}
          </div>

          {puntosVenta.some(
            (punto) => !sesionesAbiertas.some((abierta) => abierta.punto_venta === punto.codigo)
          ) && (
            <div className="mt-5 rounded-xl border border-cream-dark bg-cream/50 p-4">
              <h3 className="font-display text-lg text-stone">Abrir otra caja</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="otro_punto">Punto de venta</label>
                  <select
                    id="otro_punto"
                    className="input"
                    value={puntoVentaCodigo}
                    onChange={(event) => setPuntoVentaCodigo(event.target.value)}
                  >
                    {puntosVenta
                      .filter(
                        (punto) =>
                          !sesionesAbiertas.some((abierta) => abierta.punto_venta === punto.codigo)
                      )
                      .map((punto) => (
                        <option key={punto.codigo} value={punto.codigo}>
                          {punto.nombre}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="otro_monto">Monto inicial</label>
                  <MoneyInput
                    id="otro_monto"
                    value={montoApertura}
                    onChange={setMontoApertura}
                  />
                </div>
              </div>
              <button
                className="btn-secondary mt-3"
                onClick={() => void abrir()}
                disabled={procesando}
              >
                Abrir caja
              </button>
            </div>
          )}

          {sesionesAbiertas.length >= 2 && (
            <div className="mt-5 border-t border-cream-dark pt-4">
              <h3 className="font-display text-lg text-stone">Registrar traslado</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="traslado_origen">Desde</label>
                  <select
                    id="traslado_origen"
                    className="input"
                    value={trasladoOrigen}
                    onChange={(event) => setTrasladoOrigen(event.target.value)}
                  >
                    {sesionesAbiertas.map((abierta) => (
                      <option key={abierta.id} value={abierta.id}>
                        {abierta.punto_venta_nombre} · {formatoMoneda(abierta.efectivo_esperado)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="traslado_destino">Hacia</label>
                  <select
                    id="traslado_destino"
                    className="input"
                    value={trasladoDestino}
                    onChange={(event) => setTrasladoDestino(event.target.value)}
                  >
                    {sesionesAbiertas.map((abierta) => (
                      <option key={abierta.id} value={abierta.id}>
                        {abierta.punto_venta_nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="traslado_monto">Monto</label>
                  <MoneyInput
                    id="traslado_monto"
                    value={trasladoMonto}
                    onChange={setTrasladoMonto}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="traslado_descripcion">Descripción</label>
                  <input
                    id="traslado_descripcion"
                    className="input"
                    value={trasladoDescripcion}
                    onChange={(event) => setTrasladoDescripcion(event.target.value)}
                  />
                </div>
              </div>
              <button
                className="btn-primary mt-3"
                onClick={() => void trasladar()}
                disabled={trasladando || Number(trasladoMonto || 0) <= 0}
              >
                {trasladando ? 'Trasladando…' : 'Registrar traslado'}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
