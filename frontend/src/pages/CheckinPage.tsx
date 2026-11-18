import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  checkinApi,
  cotizarApi,
  disponibilidadApi,
  type CheckinResultado,
  type Cotizacion,
  type Habitacion,
} from '../lib/api';

function fechaLocal(offsetDias = 0) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + offsetDias);
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function nochesEntre(desde: string, hasta: string) {
  const a = Date.UTC(Number(desde.slice(0, 4)), Number(desde.slice(5, 7)) - 1, Number(desde.slice(8, 10)));
  const b = Date.UTC(Number(hasta.slice(0, 4)), Number(hasta.slice(5, 7)) - 1, Number(hasta.slice(8, 10)));
  return Math.round((b - a) / 86_400_000);
}

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

const clienteVacio = {
  nombre: '',
  tipo_documento: 'CC',
  numero_documento: '',
  telefono: '',
  email: '',
};

export function CheckinPage() {
  const { token } = useAuth();
  const [desde, setDesde] = useState(fechaLocal(0));
  const [hasta, setHasta] = useState(fechaLocal(1));
  const [pax, setPax] = useState(2);

  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [busquedaHecha, setBusquedaHecha] = useState(false);

  const [seleccion, setSeleccion] = useState<Habitacion | null>(null);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [temporada, setTemporada] = useState<'BAJA' | 'ALTA'>('BAJA');
  const [escenario, setEscenario] = useState<'NORMAL' | 'A' | 'B' | 'C'>('NORMAL');

  const [cliente, setCliente] = useState(clienteVacio);
  const [desayuno, setDesayuno] = useState<'NO' | 'PAGADO' | 'INCLUIDO'>('NO');
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO'>(
    'EFECTIVO'
  );
  const [tipoDocumentoPago, setTipoDocumentoPago] = useState<
    'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA'
  >('NINGUNO');
  const [monto, setMonto] = useState('');
  const [notas, setNotas] = useState('');

  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<CheckinResultado | null>(null);

  const noches = Math.max(0, nochesEntre(desde, hasta));
  const precioNoche = cotizacion?.precio ?? 0;
  const totalAlojamiento = precioNoche * noches;
  const totalDesayuno = desayuno === 'PAGADO' ? 15_000 * pax * noches : 0;
  const total = totalAlojamiento + totalDesayuno;
  const montoEfectivo = metodoPago === 'CREDITO' ? 0 : Number(monto || 0);
  const saldoEstimado = total - montoEfectivo;

  useEffect(() => {
    if (token) void buscar();
    // La búsqueda inicial usa las fechas y pax por defecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || !seleccion) {
      setCotizacion(null);
      return;
    }

    let activo = true;
    setError('');

    cotizarApi(token, seleccion.id, pax, temporada, escenario)
      .then((respuesta) => {
        if (activo) setCotizacion(respuesta);
      })
      .catch((err) => {
        if (activo) {
          setCotizacion(null);
          setError(err instanceof Error ? err.message : 'No se pudo cotizar');
        }
      });

    return () => {
      activo = false;
    };
  }, [token, seleccion, pax, temporada, escenario]);

  useEffect(() => {
    setMonto(String(total));
  }, [total]);

  async function buscar() {
    if (!token) return;

    if (hasta <= desde) {
      setError('La salida debe ser posterior a la entrada');
      return;
    }

    setBuscando(true);
    setError('');
    setSeleccion(null);
    setCotizacion(null);
    setResultado(null);

    try {
      const respuesta = await disponibilidadApi(token, desde, hasta, pax);
      setHabitaciones(respuesta.habitaciones);
      setBusquedaHecha(true);
    } catch (err) {
      setHabitaciones([]);
      setError(err instanceof Error ? err.message : 'No se pudo buscar disponibilidad');
    } finally {
      setBuscando(false);
    }
  }

  function elegirHabitacion(habitacion: Habitacion) {
    setSeleccion(habitacion);
    setCotizacion(null);
    setResultado(null);
    setError('');
  }

  async function confirmar() {
    if (!token || !seleccion || !cotizacion) return;

    if (!cliente.nombre.trim()) {
      setError('Escribe el nombre del huésped');
      return;
    }

    if (noches < 1) {
      setError('Las fechas no son válidas');
      return;
    }

    if (metodoPago !== 'CREDITO' && montoEfectivo > total) {
      setError('El pago no puede ser mayor al total');
      return;
    }

    setEnviando(true);
    setError('');

    try {
      const respuesta = await checkinApi(token, {
        habitacion_id: seleccion.id,
        pax,
        fecha_entrada: desde,
        fecha_salida: hasta,
        temporada,
        escenario,
        cliente: {
          nombre: cliente.nombre.trim(),
          tipo_documento: cliente.tipo_documento || undefined,
          numero_documento: cliente.numero_documento.trim() || undefined,
          telefono: cliente.telefono.trim() || undefined,
          email: cliente.email.trim() || undefined,
        },
        desayuno,
        pago: {
          monto: montoEfectivo,
          metodo_pago: metodoPago,
          tipo_documento: tipoDocumentoPago,
        },
        notas: notas.trim() || undefined,
      });

      setResultado(respuesta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo hacer el check-in');
    } finally {
      setEnviando(false);
    }
  }

  function nuevoCheckin() {
    setResultado(null);
    setSeleccion(null);
    setCotizacion(null);
    setCliente(clienteVacio);
    setDesayuno('NO');
    setMetodoPago('EFECTIVO');
    setTipoDocumentoPago('NINGUNO');
    setMonto('');
    setNotas('');
    void buscar();
  }

  if (!token) return null;

  if (resultado) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="card border-success/30 bg-success/5">
          <p className="text-sm font-medium text-success">Check-in realizado</p>
          <h1 className="mt-1 font-display text-3xl text-stone">Reserva {resultado.reserva.codigo}</h1>
          <p className="mt-2 text-sm text-stone-light">
            Habitación {resultado.habitacion.numero} · {resultado.reserva.noches} noche(s) ·{' '}
            {resultado.reserva.fecha_entrada} a {resultado.reserva.fecha_salida}
          </p>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white/70 p-4">
              <dt className="text-xs text-stone-light">Total</dt>
              <dd className="mt-1 text-xl font-semibold">{formatoMoneda(resultado.reserva.total)}</dd>
            </div>
            <div className="rounded-xl bg-white/70 p-4">
              <dt className="text-xs text-stone-light">Saldo</dt>
              <dd className="mt-1 text-xl font-semibold">{formatoMoneda(resultado.reserva.saldo)}</dd>
            </div>
            <div className="rounded-xl bg-white/70 p-4">
              <dt className="text-xs text-stone-light">Alojamiento</dt>
              <dd className="mt-1 text-lg">{formatoMoneda(resultado.cargos.alojamiento)}</dd>
            </div>
            <div className="rounded-xl bg-white/70 p-4">
              <dt className="text-xs text-stone-light">Desayuno</dt>
              <dd className="mt-1 text-lg">{formatoMoneda(resultado.cargos.desayuno)}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn-primary" onClick={nuevoCheckin}>
              Nuevo check-in
            </button>
            <span className="self-center text-xs text-stone-light">
              Folio #{resultado.folio.id} · {resultado.cobro ? 'Pago registrado' : 'Sin pago'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-gold-dark">Recepción</p>
        <h1 className="font-display text-3xl text-stone">Check-in</h1>
        <p className="mt-1 text-sm text-stone-light">
          Busca disponibilidad, cotiza y registra al huésped en una sola pantalla.
        </p>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="card">
            <h2 className="font-display text-xl text-stone">1. Fechas y personas</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div>
                <label className="label" htmlFor="desde">Entrada</label>
                <input
                  id="desde"
                  type="date"
                  className="input"
                  value={desde}
                  onChange={(event) => {
                    setDesde(event.target.value);
                    setSeleccion(null);
                  }}
                />
              </div>
              <div>
                <label className="label" htmlFor="hasta">Salida</label>
                <input
                  id="hasta"
                  type="date"
                  className="input"
                  value={hasta}
                  onChange={(event) => {
                    setHasta(event.target.value);
                    setSeleccion(null);
                  }}
                />
              </div>
              <div>
                <label className="label" htmlFor="pax">Personas</label>
                <select
                  id="pax"
                  className="input"
                  value={pax}
                  onChange={(event) => {
                    setPax(Number(event.target.value));
                    setSeleccion(null);
                  }}
                >
                  {[1, 2, 3, 4, 5, 6].map((numero) => (
                    <option key={numero} value={numero}>{numero}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button className="btn-primary w-full" onClick={() => void buscar()} disabled={buscando}>
                  {buscando ? 'Buscando…' : 'Buscar'}
                </button>
              </div>
            </div>
          </section>

          {busquedaHecha && (
            <section className="card">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl text-stone">2. Habitaciones disponibles</h2>
                <span className="text-xs text-stone-light">{habitaciones.length} disponibles</span>
              </div>

              {habitaciones.length === 0 ? (
                <p className="mt-4 text-sm text-stone-light">
                  No hay habitaciones para esas fechas y esa cantidad de personas.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {habitaciones.map((habitacion) => {
                    const activa = seleccion?.id === habitacion.id;
                    return (
                      <button
                        key={habitacion.id}
                        type="button"
                        onClick={() => elegirHabitacion(habitacion)}
                        className={`rounded-xl border p-4 text-left transition ${
                          activa
                            ? 'border-gold bg-gold/10 ring-2 ring-gold/30'
                            : 'border-cream-dark bg-white hover:border-gold/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-display text-xl text-stone">Hab. {habitacion.numero}</p>
                          <span className="text-xs text-stone-light">Piso {habitacion.piso}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                          <span className="rounded-full bg-cream-dark px-2 py-0.5 text-stone">
                            {habitacion.clima === 'AC' ? 'A/C' : 'Ventilador'}
                          </span>
                          <span className="rounded-full bg-cream-dark px-2 py-0.5 text-stone">
                            {habitacion.capacidad_max} pax máx.
                          </span>
                          {habitacion.es_suite && (
                            <span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold-dark">
                              Suite
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="space-y-6">
          {seleccion && cotizacion ? (
            <>
              <section className="card">
                <h2 className="font-display text-xl text-stone">3. Cotización</h2>
                <p className="mt-1 text-sm text-stone-light">Habitación {seleccion.numero}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="temporada">Temporada</label>
                    <select
                      id="temporada"
                      className="input"
                      value={temporada}
                      onChange={(event) => setTemporada(event.target.value as 'BAJA' | 'ALTA')}
                    >
                      <option value="BAJA">Baja</option>
                      <option value="ALTA">Alta</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="escenario">Escenario</label>
                    <select
                      id="escenario"
                      className="input"
                      value={escenario}
                      onChange={(event) =>
                        setEscenario(event.target.value as 'NORMAL' | 'A' | 'B' | 'C')
                      }
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="A">A · llegada tarde</option>
                      <option value="B">B · 2+ noches</option>
                      <option value="C">C · grupo</option>
                    </select>
                  </div>
                </div>

                {cotizacion.habitacion.clima === 'VENTILADOR' && (
                  <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                    Habitación con ventilador: temporada única y sin descuentos.
                  </p>
                )}

                {cotizacion.es_suite_premium && (
                  <p className="mt-3 rounded-lg bg-gold/10 px-3 py-2 text-xs text-gold-dark">
                    Suite para 2 personas: se cobra como 6 personas.
                  </p>
                )}

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-stone-light">Noches</dt>
                    <dd>{noches}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-stone-light">Precio por noche</dt>
                    <dd>{formatoMoneda(precioNoche)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-stone-light">Alojamiento</dt>
                    <dd>{formatoMoneda(totalAlojamiento)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-stone-light">Desayuno</dt>
                    <dd>{formatoMoneda(totalDesayuno)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-cream-dark pt-2 text-base font-semibold">
                    <dt>Total</dt>
                    <dd>{formatoMoneda(total)}</dd>
                  </div>
                </dl>
              </section>

              <section className="card">
                <h2 className="font-display text-xl text-stone">4. Huésped y pago</h2>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="label" htmlFor="nombre">Nombre completo</label>
                    <input
                      id="nombre"
                      className="input"
                      value={cliente.nombre}
                      onChange={(event) => setCliente({ ...cliente, nombre: event.target.value })}
                      placeholder="Nombre del huésped"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="tipo_documento">Tipo de documento</label>
                      <select
                        id="tipo_documento"
                        className="input"
                        value={cliente.tipo_documento}
                        onChange={(event) =>
                          setCliente({ ...cliente, tipo_documento: event.target.value })
                        }
                      >
                        <option value="CC">CC</option>
                        <option value="CE">CE</option>
                        <option value="PA">Pasaporte</option>
                        <option value="TI">TI</option>
                        <option value="RC">RC</option>
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="numero_documento">Número</label>
                      <input
                        id="numero_documento"
                        className="input"
                        value={cliente.numero_documento}
                        onChange={(event) =>
                          setCliente({ ...cliente, numero_documento: event.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="telefono">Teléfono</label>
                      <input
                        id="telefono"
                        className="input"
                        value={cliente.telefono}
                        onChange={(event) => setCliente({ ...cliente, telefono: event.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="email">Email</label>
                      <input
                        id="email"
                        className="input"
                        value={cliente.email}
                        onChange={(event) => setCliente({ ...cliente, email: event.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label" htmlFor="desayuno">Desayuno</label>
                    <select
                      id="desayuno"
                      className="input"
                      value={desayuno}
                      onChange={(event) =>
                        setDesayuno(event.target.value as 'NO' | 'PAGADO' | 'INCLUIDO')
                      }
                    >
                      <option value="NO">Sin desayuno</option>
                      <option value="PAGADO">Pagado (15.000 por persona/noche)</option>
                      <option value="INCLUIDO">Incluido en la tarifa</option>
                    </select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="metodo_pago">Método de pago</label>
                      <select
                        id="metodo_pago"
                        className="input"
                        value={metodoPago}
                        onChange={(event) =>
                          setMetodoPago(
                            event.target.value as 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO'
                          )
                        }
                      >
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TARJETA">Tarjeta</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                        <option value="CREDITO">Crédito</option>
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="monto">Monto recibido</label>
                      <input
                        id="monto"
                        type="number"
                        min="0"
                        max={total}
                        className="input"
                        value={metodoPago === 'CREDITO' ? '0' : monto}
                        onChange={(event) => setMonto(event.target.value)}
                        disabled={metodoPago === 'CREDITO'}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label" htmlFor="tipo_documento_pago">Documento del cobro</label>
                    <select
                      id="tipo_documento_pago"
                      className="input"
                      value={tipoDocumentoPago}
                      onChange={(event) =>
                        setTipoDocumentoPago(
                          event.target.value as 'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA'
                        )
                      }
                    >
                      <option value="NINGUNO">Ninguno</option>
                      <option value="RECIBO_CAJA">Recibo de caja</option>
                      <option value="FACTURA_ELECTRONICA">Factura electrónica (+19 %)</option>
                    </select>
                  </div>

                  <div>
                    <label className="label" htmlFor="notas">Notas</label>
                    <textarea
                      id="notas"
                      className="input h-20 py-2"
                      value={notas}
                      onChange={(event) => setNotas(event.target.value)}
                    />
                  </div>

                  <div className="rounded-xl bg-cream-dark/60 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone-light">Total</span>
                      <span className="font-semibold">{formatoMoneda(total)}</span>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span className="text-stone-light">Saldo estimado</span>
                      <span className="font-semibold">{formatoMoneda(Math.max(0, saldoEstimado))}</span>
                    </div>
                  </div>

                  <button
                    className="btn-primary w-full"
                    onClick={() => void confirmar()}
                    disabled={enviando || !cotizacion}
                  >
                    {enviando ? 'Registrando…' : 'Confirmar check-in'}
                  </button>
                </div>
              </section>
            </>
          ) : (
            <section className="card">
              <h2 className="font-display text-xl text-stone">Selecciona una habitación</h2>
              <p className="mt-2 text-sm text-stone-light">
                Busca por fechas y personas, elige la habitación y aquí aparecerá la cotización.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
