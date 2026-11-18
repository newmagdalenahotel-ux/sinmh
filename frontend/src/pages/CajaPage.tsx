import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  abrirCajaApi,
  cajaMovimientoApi,
  cerrarCajaApi,
  sesionActualApi,
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
  const [sesion, setSesion] = useState<SesionCaja | null>(null);
  const [cierre, setCierre] = useState<SesionCaja | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [montoApertura, setMontoApertura] = useState('');
  const [montoDeclarado, setMontoDeclarado] = useState('');
  const [movTipo, setMovTipo] = useState<
    'GASTO_EFECTIVO' | 'RETIRO_DUENO' | 'APORTE' | 'AJUSTE_FALTANTE' | 'AJUSTE_SOBRANTE'
  >('GASTO_EFECTIVO');
  const [movMonto, setMovMonto] = useState('');
  const [movDescripcion, setMovDescripcion] = useState('');
  const [movCuenta, setMovCuenta] = useState('6105');
  const [movSoporte, setMovSoporte] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const [exito, setExito] = useState('');

  useEffect(() => {
    if (!token) return;

    let activo = true;
    setCargando(true);

    sesionActualApi(token)
      .then((respuesta) => {
        if (!activo) return;
        setSesion(respuesta.sesion);
        if (respuesta.sesion) setMontoDeclarado(String(respuesta.sesion.efectivo_esperado));
      })
      .catch((err) => {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudo consultar la caja');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [token]);

  async function abrir() {
    if (!token) return;
    setProcesando(true);
    setError('');

    try {
      const respuesta = await abrirCajaApi(token, Number(montoApertura || 0));
      setSesion(respuesta.sesion);
      setCierre(null);
      setMontoDeclarado(String(respuesta.sesion.efectivo_esperado));
      setMontoApertura('');
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
    setExito('');

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
      setExito('Movimiento registrado');
      setMovMonto('');
      setMovDescripcion('');
      setMovSoporte('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el movimiento');
    } finally {
      setRegistrando(false);
    }
  }

  if (!token) return null;

  if (cargando) {
    return <div className="text-sm text-stone-light">Consultando caja…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gold-dark">Recepción</p>
          <h1 className="font-display text-3xl text-stone">Caja</h1>
          <p className="mt-1 text-sm text-stone-light">
            Apertura, movimientos y cierre del turno de recepción.
          </p>
        </div>
        <Link to="/checkin" className="btn-primary">
          Ir a check-in
        </Link>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      {exito && <div className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{exito}</div>}

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

          <div className="mt-4">
            <label className="label" htmlFor="monto_apertura">Monto inicial en efectivo</label>
            <input
              id="monto_apertura"
              type="number"
              min="0"
              className="input"
              value={montoApertura}
              onChange={(event) => setMontoApertura(event.target.value)}
              placeholder="0"
            />
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
                <input
                  id="mov_monto"
                  type="number"
                  min="0"
                  className="input"
                  value={movMonto}
                  onChange={(event) => setMovMonto(event.target.value)}
                />
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

          <section className="card max-w-xl">
            <h2 className="font-display text-xl text-stone">Cerrar caja</h2>
            <p className="mt-1 text-sm text-stone-light">
              Cuenta el efectivo físico y compáralo con el esperado.
            </p>

            <div className="mt-4">
              <label className="label" htmlFor="monto_declarado">Efectivo declarado</label>
              <input
                id="monto_declarado"
                type="number"
                min="0"
                className="input"
                value={montoDeclarado}
                onChange={(event) => setMontoDeclarado(event.target.value)}
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
    </div>
  );
}
