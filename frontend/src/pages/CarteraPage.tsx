import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { MoneyInput } from '../components/MoneyInput';
import { useToast } from '../components/Toast';
import {
  abonarCuentaApi,
  cuentasCobrarApi,
  type CuentaCobrar,
} from '../lib/api';

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatoFecha(valor: string | null) {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short' }).format(
    new Date(`${valor.slice(0, 10)}T12:00:00`)
  );
}

export function CarteraPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [cuentas, setCuentas] = useState<CuentaCobrar[]>([]);
  const [total, setTotal] = useState(0);
  const [seleccion, setSeleccion] = useState<CuentaCobrar | null>(null);
  const [monto, setMonto] = useState<number | ''>('');
  const [metodo, setMetodo] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [documento, setDocumento] = useState<'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA'>(
    'RECIBO_CAJA'
  );
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function cargar() {
    if (!token) return;
    setCargando(true);
    setError('');

    try {
      const respuesta = await cuentasCobrarApi(token);
      setCuentas(respuesta.cuentas);
      setTotal(respuesta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la cartera');
    } finally {
      setCargando(false);
    }
  }

  function abrirAbono(cuenta: CuentaCobrar) {
    setSeleccion(cuenta);
    setMonto(Number(cuenta.saldo));
    setMetodo('EFECTIVO');
    setDocumento('RECIBO_CAJA');
    setError('');
  }

  async function abonar() {
    if (!token || !seleccion) return;

    const valor = Number(monto || 0);
    if (valor <= 0) {
      setError('El abono debe ser mayor a cero');
      return;
    }

    setProcesando(true);
    setError('');

    try {
      const respuesta = await abonarCuentaApi(token, seleccion.id, {
        monto: valor,
        metodo_pago: metodo,
        tipo_documento: documento,
      });
      toast.success(
        `Abono registrado. Saldo ${formatoMoneda(respuesta.abono.saldo)} · ${respuesta.abono.estado}`
      );
      setSeleccion(null);
      setMonto('');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el abono');
    } finally {
      setProcesando(false);
    }
  }

  if (!token) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="rounded-xl bg-navy px-4 py-2 text-right text-cream">
          <p className="text-xs text-cream/60">Cartera total</p>
          <p className="font-display text-xl text-gold">{formatoMoneda(total)}</p>
        </div>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="card">
          <h2 className="font-display text-xl text-stone">Saldos pendientes</h2>

          {cargando ? (
            <p className="mt-4 text-sm text-stone-light">Cargando…</p>
          ) : cuentas.length === 0 ? (
            <p className="mt-4 text-sm text-stone-light">No hay cuentas por cobrar.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cream-dark text-xs uppercase tracking-wide text-stone-light">
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3">Emisión</th>
                    <th className="py-2 pr-3">Vence</th>
                    <th className="py-2 pr-3 text-right">Saldo</th>
                    <th className="py-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {cuentas.map((cuenta) => (
                    <tr key={cuenta.id} className="border-b border-cream-dark/60">
                      <td className="py-3 pr-3">
                        <p className="font-medium">{cuenta.cliente}</p>
                        <p className="text-xs text-stone-light">
                          {cuenta.tipo_cliente} · {cuenta.estado}
                        </p>
                      </td>
                      <td className="py-3 pr-3 text-stone-light">
                        {formatoFecha(cuenta.fecha_emision)}
                      </td>
                      <td className="py-3 pr-3 text-stone-light">
                        {formatoFecha(cuenta.fecha_vencimiento)}
                      </td>
                      <td className="py-3 pr-3 text-right font-medium">
                        {formatoMoneda(Number(cuenta.saldo))}
                      </td>
                      <td className="py-3 text-right">
                        {cuenta.estado !== 'PAGADA' && cuenta.estado !== 'ANULADA' && (
                          <button
                            className="rounded-lg border border-gold/40 px-2 py-1 text-xs text-gold-dark"
                            onClick={() => abrirAbono(cuenta)}
                          >
                            Abonar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="font-display text-xl text-stone">Registrar abono</h2>

          {!seleccion ? (
            <p className="mt-3 text-sm text-stone-light">
              Selecciona una cuenta de la lista para abonar.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-stone-light">
                {seleccion.cliente} · saldo {formatoMoneda(Number(seleccion.saldo))}
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="label" htmlFor="abono_monto">Monto</label>
                  <MoneyInput
                    id="abono_monto"
                    value={monto}
                    onChange={setMonto}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="abono_metodo">Método</label>
                  <select
                    id="abono_metodo"
                    className="input"
                    value={metodo}
                    onChange={(event) =>
                      setMetodo(event.target.value as 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA')
                    }
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="abono_documento">Documento</label>
                  <select
                    id="abono_documento"
                    className="input"
                    value={documento}
                    onChange={(event) =>
                      setDocumento(
                        event.target.value as
                          | 'NINGUNO'
                          | 'RECIBO_CAJA'
                          | 'FACTURA_ELECTRONICA'
                      )
                    }
                  >
                    <option value="NINGUNO">Ninguno</option>
                    <option value="RECIBO_CAJA">Recibo de caja</option>
                    <option value="FACTURA_ELECTRONICA">Factura electrónica</option>
                  </select>
                </div>

                <button
                  className="btn-primary w-full"
                  onClick={() => void abonar()}
                  disabled={procesando || Number(monto || 0) <= 0}
                >
                  {procesando ? 'Registrando…' : 'Registrar abono'}
                </button>
                <button
                  className="btn-secondary w-full"
                  onClick={() => setSeleccion(null)}
                  disabled={procesando}
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
