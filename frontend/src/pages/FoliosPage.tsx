import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  centrosApi,
  checkoutApi,
  crearCargoApi,
  folioApi,
  foliosApi,
  reciboPdfApi,
  type Centro,
  type FolioDetalle,
  type FolioResumen,
} from '../lib/api';

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatoFecha(valor: string) {
  const soloFecha = valor.slice(0, 10);
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short' }).format(
    new Date(`${soloFecha}T12:00:00`)
  );
}

function formatoFechaHora(valor: string) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(valor)
  );
}

export function FoliosPage() {
  const { token } = useAuth();
  const [folios, setFolios] = useState<FolioResumen[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [seleccion, setSeleccion] = useState<FolioDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [ultimoCobroId, setUltimoCobroId] = useState<number | null>(null);
  const [cargo, setCargo] = useState({
    concepto: '',
    centro_codigo: 'ALOJAMIENTO',
    cantidad: '1',
    precio_unitario: '0',
    es_cortesia: false,
    motivo_cortesia: '',
  });
  const [metodoPago, setMetodoPago] = useState<
    'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO'
  >('EFECTIVO');
  const [tipoDocumento, setTipoDocumento] = useState<
    'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA'
  >('NINGUNO');

  useEffect(() => {
    if (token) void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function cargar() {
    if (!token) return;
    setCargando(true);
    setError('');

    try {
      const [respuesta, respuestaCentros] = await Promise.all([
        foliosApi(token),
        centrosApi(token),
      ]);
      setFolios(respuesta.folios);
      setCentros(respuestaCentros.centros);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los folios');
    } finally {
      setCargando(false);
    }
  }

  async function elegir(folio: FolioResumen) {
    if (!token) return;
    setCargandoDetalle(true);
    setError('');
    setExito('');
    setUltimoCobroId(null);

    try {
      setSeleccion(await folioApi(token, folio.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir el folio');
    } finally {
      setCargandoDetalle(false);
    }
  }

  async function cerrarFolio() {
    if (!token || !seleccion) return;
    setProcesando(true);
    setError('');
    setExito('');

    try {
      const saldo = seleccion.totales.saldo;
      const respuesta = await checkoutApi(token, seleccion.folio.id, {
        metodo_pago: saldo > 0 ? metodoPago : undefined,
        tipo_documento: tipoDocumento,
      });

      setExito(
        `Check-out de ${seleccion.folio.huesped ?? 'huésped'} · reserva ${respuesta.reserva.codigo} · saldo ${formatoMoneda(0)}`
      );
      setUltimoCobroId(respuesta.cobro?.id ?? null);
      setSeleccion(null);
      setMetodoPago('EFECTIVO');
      setTipoDocumento('NINGUNO');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo hacer el check-out');
    } finally {
      setProcesando(false);
    }
  }

  async function imprimirRecibo(cobroId: number) {
    if (!token) return;
    setError('');

    try {
      const blob = await reciboPdfApi(token, cobroId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el recibo');
    }
  }

  async function agregarCargo() {
    if (!token || !seleccion) return;

    if (!cargo.concepto.trim()) {
      setError('Escribe el concepto del cargo');
      return;
    }

    setAgregando(true);
    setError('');
    setExito('');

    try {
      await crearCargoApi(token, seleccion.folio.id, {
        concepto: cargo.concepto.trim(),
        centro_codigo: cargo.centro_codigo,
        cantidad: Number(cargo.cantidad || 1),
        precio_unitario: cargo.es_cortesia ? 0 : Number(cargo.precio_unitario || 0),
        es_cortesia: cargo.es_cortesia,
        motivo_cortesia: cargo.motivo_cortesia.trim() || undefined,
      });

      const detalle = await folioApi(token, seleccion.folio.id);
      setSeleccion(detalle);
      setCargo({
        ...cargo,
        concepto: '',
        cantidad: '1',
        precio_unitario: '0',
        es_cortesia: false,
        motivo_cortesia: '',
      });
      setExito('Cargo agregado al folio');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el cargo');
    } finally {
      setAgregando(false);
    }
  }

  if (!token) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link to="/checkin" className="btn-primary">
          Nuevo check-in
        </Link>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      {exito && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">
          <span>{exito}</span>
          {ultimoCobroId && (
            <button
              className="rounded-lg border border-gold/40 px-3 py-1 text-xs text-gold-dark transition hover:bg-gold hover:text-navy-dark"
              onClick={() => void imprimirRecibo(ultimoCobroId)}
            >
              Imprimir recibo
            </button>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-stone">Folios abiertos</h2>
            <span className="text-xs text-stone-light">{folios.length}</span>
          </div>

          {cargando ? (
            <p className="mt-4 text-sm text-stone-light">Cargando…</p>
          ) : folios.length === 0 ? (
            <p className="mt-4 text-sm text-stone-light">No hay huéspedes en casa.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {folios.map((folio) => {
                const activo = seleccion?.folio.id === folio.id;
                return (
                  <button
                    key={folio.id}
                    type="button"
                    onClick={() => void elegir(folio)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      activo
                        ? 'border-gold bg-gold/10 ring-2 ring-gold/30'
                        : 'border-cream-dark bg-white hover:border-gold/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-lg text-stone">Hab. {folio.habitacion}</p>
                        <p className="text-sm text-stone-light">{folio.huesped ?? 'Sin titular'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatoMoneda(Number(folio.saldo))}</p>
                        <p className="text-xs text-stone-light">{folio.codigo}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-stone-light">
                      {formatoFecha(folio.fecha_entrada)} → {formatoFecha(folio.fecha_salida)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="card">
          {cargandoDetalle ? (
            <p className="text-sm text-stone-light">Cargando folio…</p>
          ) : seleccion ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gold-dark">Folio #{seleccion.folio.id}</p>
                  <h2 className="mt-1 font-display text-2xl text-stone">
                    Hab. {seleccion.folio.habitacion}
                  </h2>
                  <p className="text-sm text-stone-light">
                    {seleccion.folio.huesped ?? 'Sin titular'} · {seleccion.folio.codigo}
                  </p>
                </div>
                <span className="rounded-full bg-gold/10 px-2 py-1 text-[11px] text-gold-dark">
                  {seleccion.folio.estado}
                </span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-cream-dark text-xs uppercase tracking-wide text-stone-light">
                      <th className="py-2 pr-3">Concepto</th>
                      <th className="py-2 pr-3">Cant.</th>
                      <th className="py-2 pr-3">Valor</th>
                      <th className="py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seleccion.cargos.map((cargo) => (
                      <tr key={cargo.id} className="border-b border-cream-dark/60">
                        <td className="py-2 pr-3">{cargo.concepto}</td>
                        <td className="py-2 pr-3 text-stone-light">{Number(cargo.cantidad)}</td>
                        <td className="py-2 pr-3 text-stone-light">
                          {formatoMoneda(Number(cargo.precio_unitario))}
                        </td>
                        <td className="py-2 font-medium">{formatoMoneda(Number(cargo.monto))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-light">Cargos</dt>
                  <dd>{formatoMoneda(seleccion.totales.cargos)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-light">Pagos</dt>
                  <dd>{formatoMoneda(seleccion.totales.cobros)}</dd>
                </div>
                <div className="flex justify-between border-t border-cream-dark pt-2 text-base font-semibold">
                  <dt>Saldo</dt>
                  <dd>{formatoMoneda(seleccion.totales.saldo)}</dd>
                </div>
              </dl>

              {seleccion.cobros.length > 0 && (
                <div className="mt-4 rounded-xl border border-cream-dark p-3">
                  <h3 className="text-sm font-semibold text-stone">Pagos registrados</h3>
                  <div className="mt-2 space-y-2">
                    {seleccion.cobros.map((cobro) => (
                      <div
                        key={cobro.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span className="text-stone-light">
                          {formatoFechaHora(cobro.fecha)} · {cobro.metodo_pago}
                        </span>
                        <span className="font-medium">{formatoMoneda(Number(cobro.monto))}</span>
                        <button
                          type="button"
                          className="rounded-lg border border-gold/40 px-2.5 py-1 text-xs text-gold-dark transition hover:bg-gold hover:text-navy-dark"
                          onClick={() => void imprimirRecibo(cobro.id)}
                        >
                          Recibo
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-xl border border-cream-dark bg-cream/50 p-4">
                <h3 className="font-display text-lg text-stone">Agregar cargo</h3>

                <div className="mt-3 space-y-3">
                  <div>
                    <label className="label" htmlFor="cargo_concepto">Concepto</label>
                    <input
                      id="cargo_concepto"
                      className="input"
                      value={cargo.concepto}
                      onChange={(event) => setCargo({ ...cargo, concepto: event.target.value })}
                      placeholder="Minibar, noche extra, huésped adicional…"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="cargo_centro">Centro</label>
                      <select
                        id="cargo_centro"
                        className="input"
                        value={cargo.centro_codigo}
                        onChange={(event) =>
                          setCargo({ ...cargo, centro_codigo: event.target.value })
                        }
                      >
                        {centros.map((centro) => (
                          <option key={centro.codigo} value={centro.codigo}>
                            {centro.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="cargo_cantidad">Cantidad</label>
                      <input
                        id="cargo_cantidad"
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="input"
                        value={cargo.cantidad}
                        onChange={(event) => setCargo({ ...cargo, cantidad: event.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="cargo_precio">Precio unitario</label>
                      <input
                        id="cargo_precio"
                        type="number"
                        min="0"
                        className="input"
                        value={cargo.es_cortesia ? '0' : cargo.precio_unitario}
                        onChange={(event) =>
                          setCargo({ ...cargo, precio_unitario: event.target.value })
                        }
                        disabled={cargo.es_cortesia}
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={cargo.es_cortesia}
                          onChange={(event) =>
                            setCargo({ ...cargo, es_cortesia: event.target.checked })
                          }
                        />
                        Cortesía (monto 0)
                      </label>
                    </div>
                  </div>

                  {cargo.es_cortesia && (
                    <div>
                      <label className="label" htmlFor="cargo_motivo">Motivo de la cortesía</label>
                      <input
                        id="cargo_motivo"
                        className="input"
                        value={cargo.motivo_cortesia}
                        onChange={(event) =>
                          setCargo({ ...cargo, motivo_cortesia: event.target.value })
                        }
                      />
                    </div>
                  )}

                  <button
                    className="btn-primary w-full"
                    onClick={() => void agregarCargo()}
                    disabled={agregando || !cargo.concepto.trim()}
                  >
                    {agregando ? 'Agregando…' : 'Agregar cargo'}
                  </button>
                </div>
              </div>

              {seleccion.totales.saldo > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="metodo_pago">Método de pago</label>
                    <select
                      id="metodo_pago"
                      className="input"
                      value={metodoPago}
                      onChange={(event) =>
                        setMetodoPago(
                          event.target.value as
                            | 'EFECTIVO'
                            | 'TARJETA'
                            | 'TRANSFERENCIA'
                            | 'CREDITO'
                        )
                      }
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TARJETA">Tarjeta</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="CREDITO">Crédito (empresa/empleado)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="tipo_documento">Documento</label>
                    <select
                      id="tipo_documento"
                      className="input"
                      value={tipoDocumento}
                      onChange={(event) =>
                        setTipoDocumento(
                          event.target.value as 'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA'
                        )
                      }
                    >
                      <option value="NINGUNO">Ninguno</option>
                      <option value="RECIBO_CAJA">Recibo de caja</option>
                      <option value="FACTURA_ELECTRONICA">Factura electrónica</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                className="btn-primary mt-4 w-full"
                onClick={() => void cerrarFolio()}
                disabled={procesando}
              >
                {procesando
                  ? 'Cerrando…'
                  : seleccion.totales.saldo > 0
                    ? `Cobrar ${formatoMoneda(seleccion.totales.saldo)} y hacer check-out`
                    : 'Cerrar folio y hacer check-out'}
              </button>

              <p className="mt-3 text-xs text-stone-light">
                Abierto {formatoFechaHora(seleccion.folio.fecha_apertura)}. Si el pago es en
                efectivo, la caja debe estar abierta.
              </p>
            </>
          ) : (
            <div>
              <h2 className="font-display text-xl text-stone">Selecciona un folio</h2>
              <p className="mt-2 text-sm text-stone-light">
                Aquí verás los cargos, los pagos y el saldo antes de hacer el check-out.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
