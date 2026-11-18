import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  actualizarReservaApi,
  cancelarReservaApi,
  checkinReservaApi,
  clientesApi,
  cotizarApi,
  crearReservaApi,
  disponibilidadApi,
  habitacionesApi,
  reservaApi,
  reservasApi,
  type Cliente,
  type Habitacion,
  type ReservaDetalle,
  type ReservaPayload,
  type ReservaResumen,
} from '../lib/api';

function fechaLocal(offsetDias = 0) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + offsetDias);
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

function formatoFecha(valor: string) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short' }).format(
    new Date(`${valor.slice(0, 10)}T12:00:00`)
  );
}

function etiquetaEstado(estado: string) {
  const etiquetas: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    CONFIRMADA: 'Confirmada',
    CHECKIN: 'En casa',
    CHECKOUT: 'Check-out',
    CANCELADA: 'Cancelada',
    NO_SHOW: 'No show',
  };
  return etiquetas[estado] ?? estado;
}

const formularioInicial: ReservaPayload = {
  habitacion_id: 0,
  pax: 2,
  fecha_entrada: fechaLocal(0),
  fecha_salida: fechaLocal(1),
  temporada: 'BAJA',
  escenario: 'NORMAL',
  cliente: {
    nombre: '',
    tipo_documento: 'CC',
    numero_documento: '',
    telefono: '',
    email: '',
  },
  desayuno: 'NO',
  notas: '',
};

export function ReservasPage() {
  const { token } = useAuth();
  const [reservas, setReservas] = useState<ReservaResumen[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [habitacionesTodas, setHabitacionesTodas] = useState<Habitacion[]>([]);
  const [edicion, setEdicion] = useState<ReservaDetalle | null>(null);
  const [editForm, setEditForm] = useState({
    fecha_entrada: '',
    fecha_salida: '',
    habitacion_id: 0,
    pax: 2,
    temporada: 'BAJA' as 'BAJA' | 'ALTA',
    escenario: 'NORMAL' as 'NORMAL' | 'A' | 'B' | 'C',
    desayuno: 'NO' as 'NO' | 'PAGADO' | 'INCLUIDO',
    notas: '',
  });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [buscar, setBuscar] = useState('');
  const [form, setForm] = useState<ReservaPayload>(formularioInicial);
  const [anticipoMonto, setAnticipoMonto] = useState('');
  const [anticipoMetodo, setAnticipoMetodo] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>(
    'EFECTIVO'
  );
  const [precioNoche, setPrecioNoche] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [reservaCheckin, setReservaCheckin] = useState<ReservaResumen | null>(null);
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoMetodo, setPagoMetodo] = useState<
    'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO'
  >('EFECTIVO');
  const [pagoDocumento, setPagoDocumento] = useState<
    'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA'
  >('NINGUNO');
  const [procesandoCheckin, setProcesandoCheckin] = useState(false);

  useEffect(() => {
    if (token) void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function cargar() {
    if (!token) return;
    setCargando(true);
    setError('');

    try {
      const [respuesta, respuestaClientes, respuestaHabitaciones] = await Promise.all([
        reservasApi(token, {
          estado: filtroEstado || undefined,
          buscar: buscar.trim() || undefined,
        }),
        clientesApi(token),
        habitacionesApi(token),
      ]);
      setReservas(respuesta.reservas);
      setClientes(respuestaClientes.clientes);
      setHabitacionesTodas(respuestaHabitaciones.habitaciones);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las reservas');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    if (!form.fecha_entrada || !form.fecha_salida || form.fecha_salida <= form.fecha_entrada) {
      setHabitaciones([]);
      return;
    }

    let activo = true;
    disponibilidadApi(token, form.fecha_entrada, form.fecha_salida, form.pax)
      .then((respuesta) => {
        if (!activo) return;
        setHabitaciones(respuesta.habitaciones);
        if (respuesta.habitaciones.length > 0) {
          const existe = respuesta.habitaciones.some((h) => h.id === form.habitacion_id);
          if (!existe) setForm((actual) => ({ ...actual, habitacion_id: respuesta.habitaciones[0].id }));
        } else {
          setForm((actual) => ({ ...actual, habitacion_id: 0 }));
        }
      })
      .catch(() => {
        if (activo) setHabitaciones([]);
      });

    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, form.fecha_entrada, form.fecha_salida, form.pax]);

  useEffect(() => {
    if (!token || !form.habitacion_id) {
      setPrecioNoche(null);
      return;
    }

    let activo = true;
    cotizarApi(token, form.habitacion_id, form.pax, form.temporada, form.escenario)
      .then((cotizacion) => {
        if (activo) setPrecioNoche(cotizacion.precio);
      })
      .catch(() => {
        if (activo) setPrecioNoche(null);
      });

    return () => {
      activo = false;
    };
  }, [token, form.habitacion_id, form.pax, form.temporada, form.escenario]);

  async function crear() {
    if (!token) return;

    if (!form.cliente.nombre.trim()) {
      setError('Escribe el nombre del cliente');
      return;
    }

    if (!form.habitacion_id) {
      setError('Selecciona una habitación disponible');
      return;
    }

    setCreando(true);
    setError('');
    setExito('');

    try {
      const respuesta = await crearReservaApi(token, {
        ...form,
        cliente: {
          ...form.cliente,
          email: form.cliente.email?.trim() || undefined,
          numero_documento: form.cliente.numero_documento?.trim() || undefined,
        },
        anticipo:
          Number(anticipoMonto || 0) > 0
            ? {
                monto: Number(anticipoMonto),
                metodo_pago: anticipoMetodo,
                tipo_documento: 'NINGUNO',
              }
            : undefined,
        notas: form.notas?.trim() || undefined,
      });
      setExito(`Reserva ${respuesta.reserva.codigo} creada por ${formatoMoneda(Number(respuesta.reserva.total))}`);
      setForm({
        ...formularioInicial,
        fecha_entrada: form.fecha_entrada,
        fecha_salida: form.fecha_salida,
        habitacion_id: respuesta.reserva.habitacion_id ?? form.habitacion_id,
      });
      setAnticipoMonto('');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la reserva');
    } finally {
      setCreando(false);
    }
  }

  async function cancelar(reserva: ReservaResumen) {
    if (!token) return;
    if (!window.confirm(`¿Cancelar la reserva ${reserva.codigo}?`)) return;

    setError('');
    setExito('');
    try {
      await cancelarReservaApi(token, reserva.id);
      setExito(`Reserva ${reserva.codigo} cancelada`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar la reserva');
    }
  }

  function abrirCheckin(reserva: ReservaResumen) {
    setReservaCheckin(reserva);
    setPagoMonto(String(Number(reserva.saldo)));
    setPagoMetodo('EFECTIVO');
    setPagoDocumento('NINGUNO');
    setError('');
    setExito('');
  }

  async function hacerCheckin() {
    if (!token || !reservaCheckin) return;

    const monto = pagoMetodo === 'CREDITO' ? 0 : Number(pagoMonto || 0);
    setProcesandoCheckin(true);
    setError('');
    setExito('');

    try {
      const respuesta = await checkinReservaApi(token, reservaCheckin.id, {
        pago: {
          monto,
          metodo_pago: pagoMetodo,
          tipo_documento: pagoDocumento,
        },
      });
      setExito(
        `Check-in de ${respuesta.reserva.codigo} · folio #${respuesta.folio.id} · saldo ${formatoMoneda(respuesta.reserva.saldo)}`
      );
      setReservaCheckin(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo hacer el check-in');
    } finally {
      setProcesandoCheckin(false);
    }
  }

  async function abrirEdicion(reserva: ReservaResumen) {
    if (!token) return;
    setError('');
    setExito('');

    try {
      const detalle = await reservaApi(token, reserva.id);
      setEdicion(detalle.reserva);
      setEditForm({
        fecha_entrada: detalle.reserva.fecha_entrada.slice(0, 10),
        fecha_salida: detalle.reserva.fecha_salida.slice(0, 10),
        habitacion_id: detalle.reserva.habitacion_id,
        pax: detalle.reserva.pax,
        temporada: detalle.reserva.temporada,
        escenario: detalle.reserva.escenario,
        desayuno: detalle.reserva.desayuno_modo as 'NO' | 'PAGADO' | 'INCLUIDO',
        notas: detalle.reserva.notas ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir la reserva');
    }
  }

  async function guardarEdicion() {
    if (!token || !edicion) return;
    setGuardandoEdicion(true);
    setError('');
    setExito('');

    try {
      await actualizarReservaApi(token, edicion.id, {
        fecha_entrada: editForm.fecha_entrada,
        fecha_salida: editForm.fecha_salida,
        habitacion_id: editForm.habitacion_id,
        pax: editForm.pax,
        temporada: editForm.temporada,
        escenario: editForm.escenario,
        desayuno: editForm.desayuno,
        notas: editForm.notas || undefined,
      });
      setExito(`Reserva ${edicion.codigo} actualizada`);
      setEdicion(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la reserva');
    } finally {
      setGuardandoEdicion(false);
    }
  }

  if (!token) return null;

  const noches = Math.max(
    0,
    Math.round(
      (Date.parse(`${form.fecha_salida}T12:00:00`) - Date.parse(`${form.fecha_entrada}T12:00:00`)) /
        86_400_000
    )
  );
  const totalAlojamiento = (precioNoche ?? 0) * noches;
  const totalDesayuno =
    form.desayuno === 'PAGADO'
      ? form.pax * noches * 15_000
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gold-dark">Alojamiento</p>
          <h1 className="font-display text-3xl text-stone">Reservas</h1>
          <p className="mt-1 text-sm text-stone-light">
            Crea la reserva, confirma la habitación y conviértela en check-in.
          </p>
        </div>
        <Link to="/checkin" className="btn-secondary">Check-in directo</Link>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      {exito && <div className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{exito}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl text-stone">Reservas</h2>
            <div className="flex flex-wrap gap-2">
              <select
                className="input py-2 text-sm"
                value={filtroEstado}
                onChange={(event) => setFiltroEstado(event.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="CONFIRMADA">Confirmadas</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="CHECKIN">En casa</option>
                <option value="CANCELADA">Canceladas</option>
              </select>
              <input
                className="input py-2 text-sm"
                placeholder="Buscar código o cliente"
                value={buscar}
                onChange={(event) => setBuscar(event.target.value)}
              />
              <button className="btn-secondary px-3 py-2 text-sm" onClick={() => void cargar()}>
                Buscar
              </button>
            </div>
          </div>

          {cargando ? (
            <p className="mt-4 text-sm text-stone-light">Cargando…</p>
          ) : reservas.length === 0 ? (
            <p className="mt-4 text-sm text-stone-light">No hay reservas con ese filtro.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cream-dark text-xs uppercase tracking-wide text-stone-light">
                    <th className="py-2 pr-3">Reserva</th>
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3">Fechas</th>
                    <th className="py-2 pr-3">Hab.</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.map((reserva) => (
                    <tr key={reserva.id} className="border-b border-cream-dark/60 align-top">
                      <td className="py-3 pr-3">
                        <p className="font-medium">{reserva.codigo}</p>
                        <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] text-stone-light">
                          {etiquetaEstado(reserva.estado)}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <p>{reserva.cliente ?? 'Sin titular'}</p>
                        <p className="text-xs text-stone-light">{reserva.numero_documento ?? '—'}</p>
                      </td>
                      <td className="py-3 pr-3 text-xs text-stone-light">
                        {formatoFecha(reserva.fecha_entrada)} → {formatoFecha(reserva.fecha_salida)}
                      </td>
                      <td className="py-3 pr-3">{reserva.habitacion}</td>
                      <td className="py-3 text-right">
                        <p className="font-medium">{formatoMoneda(Number(reserva.total))}</p>
                        <p className="text-xs text-stone-light">Saldo {formatoMoneda(Number(reserva.saldo))}</p>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          {['PENDIENTE', 'CONFIRMADA'].includes(reserva.estado) && (
                            <>
                              <button
                                className="rounded-lg bg-navy px-2 py-1 text-xs text-cream"
                                onClick={() => abrirCheckin(reserva)}
                              >
                                Check-in
                              </button>
                              <button
                                className="rounded-lg border border-cream-dark px-2 py-1 text-xs"
                                onClick={() => void abrirEdicion(reserva)}
                              >
                                Editar
                              </button>
                              <button
                                className="rounded-lg border border-error/30 px-2 py-1 text-xs text-error"
                                onClick={() => void cancelar(reserva)}
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          {reserva.estado === 'CHECKIN' && (
                            <Link to="/folios" className="rounded-lg border border-gold/40 px-2 py-1 text-xs text-gold-dark">
                              Ver folio
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-6">
          {edicion && (
            <section className="card border-gold/40">
              <h2 className="font-display text-xl text-stone">Editar reserva {edicion.codigo}</h2>
              <p className="mt-1 text-sm text-stone-light">
                {edicion.cliente} · {edicion.habitacion}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="edit_entrada">Entrada</label>
                  <input
                    id="edit_entrada"
                    type="date"
                    className="input"
                    value={editForm.fecha_entrada}
                    onChange={(event) =>
                      setEditForm({ ...editForm, fecha_entrada: event.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label" htmlFor="edit_salida">Salida</label>
                  <input
                    id="edit_salida"
                    type="date"
                    className="input"
                    value={editForm.fecha_salida}
                    onChange={(event) =>
                      setEditForm({ ...editForm, fecha_salida: event.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label" htmlFor="edit_habitacion">Habitación</label>
                  <select
                    id="edit_habitacion"
                    className="input"
                    value={editForm.habitacion_id}
                    onChange={(event) =>
                      setEditForm({ ...editForm, habitacion_id: Number(event.target.value) })
                    }
                  >
                    {habitacionesTodas
                      .filter((habitacion) => habitacion.tipo_uso === 'HABITACION')
                      .map((habitacion) => (
                        <option key={habitacion.id} value={habitacion.id}>
                          {habitacion.numero} · {habitacion.clima} · {habitacion.capacidad_max} pax
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="edit_pax">Pax</label>
                  <input
                    id="edit_pax"
                    type="number"
                    min="1"
                    max="6"
                    className="input"
                    value={editForm.pax}
                    onChange={(event) =>
                      setEditForm({ ...editForm, pax: Number(event.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="label" htmlFor="edit_temporada">Temporada</label>
                  <select
                    id="edit_temporada"
                    className="input"
                    value={editForm.temporada}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        temporada: event.target.value as 'BAJA' | 'ALTA',
                      })
                    }
                  >
                    <option value="BAJA">Baja</option>
                    <option value="ALTA">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="edit_escenario">Escenario</label>
                  <select
                    id="edit_escenario"
                    className="input"
                    value={editForm.escenario}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        escenario: event.target.value as 'NORMAL' | 'A' | 'B' | 'C',
                      })
                    }
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="edit_desayuno">Desayuno</label>
                  <select
                    id="edit_desayuno"
                    className="input"
                    value={editForm.desayuno}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        desayuno: event.target.value as 'NO' | 'PAGADO' | 'INCLUIDO',
                      })
                    }
                  >
                    <option value="NO">No incluye</option>
                    <option value="PAGADO">Pagado</option>
                    <option value="INCLUIDO">Incluido</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="edit_notas">Notas</label>
                  <input
                    id="edit_notas"
                    className="input"
                    value={editForm.notas}
                    onChange={(event) => setEditForm({ ...editForm, notas: event.target.value })}
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  className="btn-primary flex-1"
                  onClick={() => void guardarEdicion()}
                  disabled={guardandoEdicion}
                >
                  {guardandoEdicion ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setEdicion(null)}
                  disabled={guardandoEdicion}
                >
                  Cerrar
                </button>
              </div>
            </section>
          )}

          {reservaCheckin && (
            <section className="card border-gold/40">
              <h2 className="font-display text-xl text-stone">Check-in de reserva</h2>
              <p className="mt-1 text-sm text-stone-light">
                {reservaCheckin.codigo} · Hab. {reservaCheckin.habitacion} · {reservaCheckin.cliente}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="pago_monto">Monto a cobrar</label>
                  <input
                    id="pago_monto"
                    type="number"
                    className="input"
                    value={pagoMonto}
                    onChange={(event) => setPagoMonto(event.target.value)}
                    disabled={pagoMetodo === 'CREDITO'}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="pago_metodo">Método</label>
                  <select
                    id="pago_metodo"
                    className="input"
                    value={pagoMetodo}
                    onChange={(event) =>
                      setPagoMetodo(
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
              </div>

              <div className="mt-3">
                <label className="label" htmlFor="pago_documento">Documento</label>
                <select
                  id="pago_documento"
                  className="input"
                  value={pagoDocumento}
                  onChange={(event) =>
                    setPagoDocumento(
                      event.target.value as 'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA'
                    )
                  }
                >
                  <option value="NINGUNO">Ninguno</option>
                  <option value="RECIBO_CAJA">Recibo de caja</option>
                  <option value="FACTURA_ELECTRONICA">Factura electrónica</option>
                </select>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  className="btn-primary flex-1"
                  onClick={() => void hacerCheckin()}
                  disabled={procesandoCheckin}
                >
                  {procesandoCheckin ? 'Procesando…' : 'Confirmar check-in'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setReservaCheckin(null)}
                  disabled={procesandoCheckin}
                >
                  Volver
                </button>
              </div>
            </section>
          )}

          <section className="card">
            <h2 className="font-display text-xl text-stone">Nueva reserva</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="fecha_entrada">Entrada</label>
                <input
                  id="fecha_entrada"
                  type="date"
                  className="input"
                  value={form.fecha_entrada}
                  onChange={(event) => setForm({ ...form, fecha_entrada: event.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="fecha_salida">Salida</label>
                <input
                  id="fecha_salida"
                  type="date"
                  className="input"
                  value={form.fecha_salida}
                  onChange={(event) => setForm({ ...form, fecha_salida: event.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="pax">Pax</label>
                <input
                  id="pax"
                  type="number"
                  min="1"
                  max="6"
                  className="input"
                  value={form.pax}
                  onChange={(event) => setForm({ ...form, pax: Number(event.target.value) })}
                />
              </div>
              <div>
                <label className="label" htmlFor="habitacion">Habitación</label>
                <select
                  id="habitacion"
                  className="input"
                  value={form.habitacion_id || ''}
                  onChange={(event) =>
                    setForm({ ...form, habitacion_id: Number(event.target.value) })
                  }
                >
                  <option value="">Selecciona</option>
                  {habitaciones.map((habitacion) => (
                    <option key={habitacion.id} value={habitacion.id}>
                      {habitacion.numero} · {habitacion.clima} · {habitacion.capacidad_max} pax
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="temporada">Temporada</label>
                <select
                  id="temporada"
                  className="input"
                  value={form.temporada}
                  onChange={(event) =>
                    setForm({ ...form, temporada: event.target.value as 'BAJA' | 'ALTA' })
                  }
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
                  value={form.escenario}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      escenario: event.target.value as 'NORMAL' | 'A' | 'B' | 'C',
                    })
                  }
                >
                  <option value="NORMAL">Normal</option>
                  <option value="A">A · llegada tarde</option>
                  <option value="B">B · 2+ noches</option>
                  <option value="C">C · grupo</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="desayuno">Desayuno</label>
                <select
                  id="desayuno"
                  className="input"
                  value={form.desayuno}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      desayuno: event.target.value as 'NO' | 'PAGADO' | 'INCLUIDO',
                    })
                  }
                >
                  <option value="NO">No incluye</option>
                  <option value="PAGADO">Pagado</option>
                  <option value="INCLUIDO">Incluido</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="anticipo">Anticipo</label>
                <input
                  id="anticipo"
                  type="number"
                  min="0"
                  className="input"
                  value={anticipoMonto}
                  onChange={(event) => setAnticipoMonto(event.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label" htmlFor="anticipo_metodo">Método del anticipo</label>
                <select
                  id="anticipo_metodo"
                  className="input"
                  value={anticipoMetodo}
                  onChange={(event) =>
                    setAnticipoMetodo(
                      event.target.value as 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'
                    )
                  }
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="cliente_existente">Cliente existente</label>
                <select
                  id="cliente_existente"
                  className="input"
                  value={form.cliente_id ?? ''}
                  onChange={(event) => {
                    const id = Number(event.target.value);
                    const cliente = clientes.find((item) => item.id === id);
                    setForm({
                      ...form,
                      cliente_id: id || undefined,
                      cliente: cliente
                        ? {
                            ...form.cliente,
                            nombre: cliente.razon_social,
                            tipo_documento: cliente.tipo_documento ?? 'CC',
                            numero_documento: cliente.numero_documento ?? '',
                            telefono: cliente.telefono ?? '',
                            email: cliente.email ?? '',
                          }
                        : { ...form.cliente, nombre: '', numero_documento: '' },
                    });
                  }}
                >
                  <option value="">Nuevo cliente particular</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.razon_social} · {cliente.tipo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="cliente">Cliente</label>
                <input
                  id="cliente"
                  className="input"
                  value={form.cliente.nombre}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      cliente: { ...form.cliente, nombre: event.target.value },
                    })
                  }
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="label" htmlFor="documento">Documento</label>
                <input
                  id="documento"
                  className="input"
                  value={form.cliente.numero_documento ?? ''}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      cliente: { ...form.cliente, numero_documento: event.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label className="label" htmlFor="telefono">Teléfono</label>
                <input
                  id="telefono"
                  className="input"
                  value={form.cliente.telefono ?? ''}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      cliente: { ...form.cliente, telefono: event.target.value },
                    })
                  }
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="label" htmlFor="notas_reserva">Notas</label>
              <input
                id="notas_reserva"
                className="input"
                value={form.notas ?? ''}
                onChange={(event) => setForm({ ...form, notas: event.target.value })}
              />
            </div>

            <div className="mt-4 rounded-xl border border-cream-dark bg-cream/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-light">Alojamiento</span>
                <span>{formatoMoneda(totalAlojamiento)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-stone-light">Desayuno</span>
                <span>{formatoMoneda(totalDesayuno)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-cream-dark pt-2 font-semibold">
                <span>Total estimado</span>
                <span>{formatoMoneda(totalAlojamiento + totalDesayuno)}</span>
              </div>
              {Number(anticipoMonto || 0) > 0 && (
                <div className="mt-1 flex justify-between text-gold-dark">
                  <span>Saldo con anticipo</span>
                  <span>
                    {formatoMoneda(
                      Math.max(0, totalAlojamiento + totalDesayuno - Number(anticipoMonto || 0))
                    )}
                  </span>
                </div>
              )}
            </div>

            <button
              className="btn-primary mt-3 w-full"
              onClick={() => void crear()}
              disabled={creando || !form.cliente.nombre || !form.habitacion_id || noches < 1}
            >
              {creando ? 'Creando…' : 'Crear reserva'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
