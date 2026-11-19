import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { MoneyInput } from '../components/MoneyInput';
import { useToast } from '../components/Toast';
import {
  actualizarReservaApi,
  cancelarReservaApi,
  checkinReservaApi,
  clientesApi,
  contratoReservaPdfApi,
  cotizarApi,
  crearReservaApi,
  crearReservaMaestraApi,
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

function iniciales(nombre: string | null) {
  if (!nombre) return '??';
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');
}

function formatoFechaCorta(valor: string) {
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' })
    .format(new Date(`${valor.slice(0, 10)}T12:00:00`))
    .replace('.', '')
    .replace(' de ', ' ');
}

function formatoFechaCreacion(valor: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(valor))
    .replace('.', '')
    .replace(/ de /g, ' ');
}

function nochesEntre(entrada: string, salida: string) {
  return Math.max(
    0,
    Math.round(
      (Date.parse(`${salida.slice(0, 10)}T12:00:00`) -
        Date.parse(`${entrada.slice(0, 10)}T12:00:00`)) /
        86_400_000
    )
  );
}

function tipoHabitacion(habitacion: Habitacion | undefined) {
  if (!habitacion) return 'Habitación';
  if (habitacion.es_suite) return 'Suite';
  if (habitacion.capacidad_max <= 2) {
    return habitacion.clima === 'AC' ? 'Doble A/C' : 'Doble ventilador';
  }
  return `${habitacion.capacidad_max} pax · ${habitacion.clima === 'AC' ? 'A/C' : 'Ventilador'}`;
}

type NombreIcono =
  | 'buscar'
  | 'grupo'
  | 'checkin'
  | 'mas'
  | 'documento'
  | 'editar'
  | 'cancelar'
  | 'folio'
  | 'flecha'
  | 'cama';

function Icono({ nombre, className = 'h-4 w-4' }: { nombre: NombreIcono; className?: string }) {
  const contenido: Record<NombreIcono, ReactNode> = {
    buscar: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    grupo: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    checkin: (
      <>
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <path d="m10 17 5-5-5-5" />
        <path d="M15 12H3" />
      </>
    ),
    mas: <path d="M12 5v14M5 12h14" />,
    documento: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8M8 17h8" />
      </>
    ),
    editar: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
      </>
    ),
    cancelar: <path d="M18 6 6 18M6 6l12 12" />,
    folio: (
      <>
        <path d="M4 4h16v16H4z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    flecha: <path d="m9 18 6-6-6-6" />,
    cama: (
      <>
        <path d="M3 7v11M21 7v11" />
        <path d="M3 12h18v6H3z" />
        <path d="M6 12V9h5v3" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {contenido[nombre]}
    </svg>
  );
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
  motivo_visita: '',
  como_llego: '',
  placa_vehiculo: '',
};

export function ReservasPage() {
  const { token } = useAuth();
  const toast = useToast();
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
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(20);
  const primeraBusqueda = useRef(true);
  const [form, setForm] = useState<ReservaPayload>(formularioInicial);
  const [anticipoMonto, setAnticipoMonto] = useState<number | ''>('');
  const [anticipoMetodo, setAnticipoMetodo] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>(
    'EFECTIVO'
  );
  const [precioNoche, setPrecioNoche] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [drawerGrupo, setDrawerGrupo] = useState(false);
  const [grupoError, setGrupoError] = useState('');
  const [creandoGrupo, setCreandoGrupo] = useState(false);
  const [grupoForm, setGrupoForm] = useState({
    fecha_entrada: fechaLocal(0),
    fecha_salida: fechaLocal(1),
    cliente_id: 0,
    cliente_nombre: '',
    cliente_documento: '',
    notas: '',
    habitaciones: [
      { habitacion_id: 0, pax: 2, desayuno: 'NO' as 'NO' | 'PAGADO' | 'INCLUIDO' },
      { habitacion_id: 0, pax: 2, desayuno: 'NO' as 'NO' | 'PAGADO' | 'INCLUIDO' },
    ],
  });
  const [reservaCheckin, setReservaCheckin] = useState<ReservaResumen | null>(null);
  const [pagoMonto, setPagoMonto] = useState<number | ''>('');
  const [pagoMetodo, setPagoMetodo] = useState<
    'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO'
  >('EFECTIVO');
  const [pagoDocumento, setPagoDocumento] = useState<
    'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA'
  >('NINGUNO');
  const [procesandoCheckin, setProcesandoCheckin] = useState(false);

  useEffect(() => {
    if (!drawerAbierto) return;

    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cerrarDrawer();
    };
    window.addEventListener('keydown', cerrarConEscape);

    return () => window.removeEventListener('keydown', cerrarConEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerAbierto]);

  useEffect(() => {
    if (!drawerGrupo) return;

    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerGrupo(false);
    };
    window.addEventListener('keydown', cerrarConEscape);

    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [drawerGrupo]);

  useEffect(() => {
    if (token) void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (primeraBusqueda.current) {
      primeraBusqueda.current = false;
      return;
    }

    const timer = window.setTimeout(() => void cargar(), 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscar, filtroEstado, token]);

  async function cargar() {
    if (!token) return;
    setPagina(1);
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
      toast.success(
        `Reserva ${respuesta.reserva.codigo} creada por ${formatoMoneda(Number(respuesta.reserva.total))}`
      );
      setDrawerAbierto(false);
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
    try {
      await cancelarReservaApi(token, reserva.id);
      toast.success(`Reserva ${reserva.codigo} cancelada`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar la reserva');
    }
  }

  function abrirCheckin(reserva: ReservaResumen) {
    setEdicion(null);
    setReservaCheckin(reserva);
    setPagoMonto(Number(reserva.saldo));
    setPagoMetodo('EFECTIVO');
    setPagoDocumento('NINGUNO');
    setError('');
    setDrawerAbierto(true);
  }

  function abrirNuevaReserva() {
    setEdicion(null);
    setReservaCheckin(null);
    setError('');
    setDrawerAbierto(true);
  }

  function cerrarDrawer() {
    setDrawerAbierto(false);
    setEdicion(null);
    setReservaCheckin(null);
    setError('');
  }

  function abrirGrupo() {
    setDrawerAbierto(false);
    setEdicion(null);
    setReservaCheckin(null);
    setGrupoError('');
    setDrawerGrupo(true);
  }

  async function crearGrupo() {
    if (!token) return;

    const habitaciones = grupoForm.habitaciones.filter((item) => item.habitacion_id > 0);
    if (habitaciones.length === 0) {
      setGrupoError('Selecciona al menos una habitación');
      return;
    }

    if (!grupoForm.cliente_nombre.trim()) {
      setGrupoError('Escribe el nombre del pagador');
      return;
    }

    setCreandoGrupo(true);
    setGrupoError('');

    try {
      const respuesta = await crearReservaMaestraApi(token, {
        cliente_id: grupoForm.cliente_id || undefined,
        cliente: {
          nombre: grupoForm.cliente_nombre.trim(),
          numero_documento: grupoForm.cliente_documento.trim() || undefined,
        },
        fecha_entrada: grupoForm.fecha_entrada,
        fecha_salida: grupoForm.fecha_salida,
        habitaciones,
        notas: grupoForm.notas.trim() || undefined,
      });

      toast.success(
        `${respuesta.maestra.codigo}: ${respuesta.maestra.habitaciones} habitaciones · ${formatoMoneda(respuesta.maestra.total)}`
      );
      setDrawerGrupo(false);
      await cargar();
    } catch (err) {
      setGrupoError(err instanceof Error ? err.message : 'No se pudo crear la reserva grupal');
    } finally {
      setCreandoGrupo(false);
    }
  }

  async function hacerCheckin() {
    if (!token || !reservaCheckin) return;

    const monto = pagoMetodo === 'CREDITO' ? 0 : Number(pagoMonto || 0);
    setProcesandoCheckin(true);
    setError('');

    try {
      const respuesta = await checkinReservaApi(token, reservaCheckin.id, {
        pago: {
          monto,
          metodo_pago: pagoMetodo,
          tipo_documento: pagoDocumento,
        },
      });
      toast.success(
        `Check-in de ${respuesta.reserva.codigo} · folio #${respuesta.folio.id} · saldo ${formatoMoneda(respuesta.reserva.saldo)}`
      );
      setReservaCheckin(null);
      setDrawerAbierto(false);
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
    setReservaCheckin(null);

    try {
      const detalle = await reservaApi(token, reserva.id);
      setEdicion(detalle.reserva);
      setDrawerAbierto(true);
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

  async function abrirContrato(reserva: ReservaResumen) {
    if (!token) return;
    setError('');

    try {
      const blob = await contratoReservaPdfApi(token, reserva.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el contrato');
    }
  }

  async function guardarEdicion() {
    if (!token || !edicion) return;
    setGuardandoEdicion(true);
    setError('');

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
      toast.success(`Reserva ${edicion.codigo} actualizada`);
      setEdicion(null);
      setDrawerAbierto(false);
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
  const clienteSeleccionado = clientes.find((cliente) => cliente.id === form.cliente_id);
  const pagadorGrupo = clientes.find((cliente) => cliente.id === grupoForm.cliente_id);
  const tarifaNegociada =
    clienteSeleccionado &&
    clienteSeleccionado.tarifa_plan !== 'PUBLICA' &&
    Number(clienteSeleccionado.tarifa_precio_noche ?? 0) > 0 &&
    (!clienteSeleccionado.tarifa_vigente_desde ||
      form.fecha_entrada >= clienteSeleccionado.tarifa_vigente_desde.slice(0, 10)) &&
    (!clienteSeleccionado.tarifa_vigente_hasta ||
      form.fecha_entrada <= clienteSeleccionado.tarifa_vigente_hasta.slice(0, 10))
      ? Number(clienteSeleccionado.tarifa_precio_noche)
      : 0;
  const precioNocheMostrado = tarifaNegociada > 0 ? tarifaNegociada : precioNoche ?? 0;
  const totalAlojamientoMostrado = precioNocheMostrado * noches;
  const totalDesayuno =
    form.desayuno === 'PAGADO'
      ? form.pax * noches * 15_000
      : 0;
  const totalPaginas = Math.max(1, Math.ceil(reservas.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const reservasVisibles = reservas.slice(
    (paginaActual - 1) * porPagina,
    paginaActual * porPagina
  );
  const habitacionPorId = new Map(
    habitacionesTodas.map((habitacion) => [habitacion.id, habitacion])
  );

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-cream-dark bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-cream-dark p-4">
            <div className="relative min-w-[240px] flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-light">
                <Icono nombre="buscar" />
              </span>
              <input
                className="input pl-9"
                placeholder="Buscar por código, cliente o documento…"
                value={buscar}
                onChange={(event) => setBuscar(event.target.value)}
                aria-label="Buscar reservas"
              />
            </div>

            <select
              className="input w-auto py-2 text-sm"
              value={filtroEstado}
              onChange={(event) => setFiltroEstado(event.target.value)}
              aria-label="Filtrar por estado"
            >
              <option value="">Todos los estados</option>
              <option value="CONFIRMADA">Confirmadas</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="CHECKIN">En casa</option>
              <option value="CHECKOUT">Check-out</option>
              <option value="CANCELADA">Canceladas</option>
            </select>

            <button className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm" onClick={abrirGrupo}>
              <Icono nombre="grupo" />
              Reserva grupal
            </button>
            <Link
              to="/checkin"
              className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm"
            >
              <Icono nombre="checkin" />
              Check-in directo
            </Link>
            <button
              className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-cream transition hover:bg-navy-dark"
              onClick={abrirNuevaReserva}
            >
              <Icono nombre="mas" />
              Nueva reserva
            </button>
          </div>

          {cargando ? (
            <p className="p-6 text-sm text-stone-light">Cargando reservas…</p>
          ) : reservas.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-display text-lg text-stone">No hay reservas con ese filtro</p>
              <p className="mt-1 text-sm text-stone-light">
                Cambia el estado o crea una reserva nueva.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-cream-dark text-[11px] uppercase tracking-wide text-stone-light">
                      <th className="px-4 py-3 font-medium">Reserva / Fecha creación</th>
                      <th className="px-4 py-3 font-medium">Huésped titular</th>
                      <th className="px-4 py-3 font-medium">Habitación asignada</th>
                      <th className="px-4 py-3 font-medium">Estancia / Noches</th>
                      <th className="px-4 py-3 font-medium">Ocupantes</th>
                      <th className="px-4 py-3 font-medium">Tarifa / Anticipo</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservasVisibles.map((reserva) => {
                      const nochesReserva = nochesEntre(
                        reserva.fecha_entrada,
                        reserva.fecha_salida
                      );
                      const habitacion = habitacionPorId.get(reserva.habitacion_id);
                      return (
                        <tr
                          key={reserva.id}
                          className="border-b border-cream-dark/60 transition last:border-0 hover:bg-cream/40"
                        >
                          <td className="px-4 py-4 align-middle">
                            <p className="whitespace-nowrap text-[13px] font-semibold text-stone">
                              {reserva.codigo}
                            </p>
                            <p className="mt-0.5 whitespace-nowrap text-xs text-stone-light">
                              {formatoFechaCreacion(reserva.created_at)}
                            </p>
                            {reserva.maestra_codigo && (
                              <p className="mt-1 inline-flex rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold-dark">
                                Grupo {reserva.maestra_codigo}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy/10 text-xs font-semibold text-navy">
                                {iniciales(reserva.cliente)}
                              </span>
                              <div>
                                <p className="whitespace-nowrap font-medium text-stone">
                                  {reserva.cliente ?? 'Sin titular'}
                                </p>
                                <p className="whitespace-nowrap text-xs text-stone-light">
                                  {reserva.tipo_documento ?? 'DOC'}{' '}
                                  {reserva.numero_documento ?? '—'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <div className="flex items-center gap-2">
                              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream text-gold-dark">
                                <Icono nombre="cama" />
                              </span>
                              <div>
                                <p className="whitespace-nowrap font-medium text-stone">
                                  Hab. {reserva.habitacion}
                                </p>
                                <p className="whitespace-nowrap text-xs text-stone-light">
                                  {tipoHabitacion(habitacion)}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <p className="whitespace-nowrap text-stone">
                              {formatoFechaCorta(reserva.fecha_entrada)} —{' '}
                              {formatoFechaCorta(reserva.fecha_salida)}
                            </p>
                            <p className="text-xs text-stone-light">
                              {nochesReserva} {nochesReserva === 1 ? 'noche' : 'noches'}
                            </p>
                          </td>

                          <td className="px-4 py-4 align-middle text-stone">
                            {reserva.pax} pax
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <p className="font-semibold text-stone">
                              {formatoMoneda(Number(reserva.total))}
                            </p>
                            {Number(reserva.anticipo) > 0 && (
                              <p className="text-xs text-success">
                                Anticipo: {formatoMoneda(Number(reserva.anticipo))}
                              </p>
                            )}
                            {Number(reserva.saldo) > 0 && (
                              <p className="text-xs text-stone-light">
                                Saldo: {formatoMoneda(Number(reserva.saldo))}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${claseEstado(reserva.estado)}`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {etiquetaEstado(reserva.estado)}
                            </span>
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="Contrato"
                                aria-label={`Contrato de ${reserva.codigo}`}
                                className="rounded-lg p-2 text-stone-light transition hover:bg-cream hover:text-navy"
                                onClick={() => void abrirContrato(reserva)}
                              >
                                <Icono nombre="documento" />
                              </button>

                              {['PENDIENTE', 'CONFIRMADA'].includes(reserva.estado) && (
                                <>
                                  <button
                                    type="button"
                                    title="Check-in"
                                    aria-label={`Check-in de ${reserva.codigo}`}
                                    className="rounded-lg p-2 text-navy transition hover:bg-navy/10"
                                    onClick={() => abrirCheckin(reserva)}
                                  >
                                    <Icono nombre="checkin" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Editar"
                                    aria-label={`Editar ${reserva.codigo}`}
                                    className="rounded-lg p-2 text-stone-light transition hover:bg-cream hover:text-navy"
                                    onClick={() => void abrirEdicion(reserva)}
                                  >
                                    <Icono nombre="editar" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Cancelar"
                                    aria-label={`Cancelar ${reserva.codigo}`}
                                    className="rounded-lg p-2 text-error transition hover:bg-error/10"
                                    onClick={() => void cancelar(reserva)}
                                  >
                                    <Icono nombre="cancelar" />
                                  </button>
                                </>
                              )}

                              {reserva.estado === 'CHECKIN' && (
                                <Link
                                  to="/folios"
                                  title="Ver folio"
                                  aria-label={`Ver folio de ${reserva.codigo}`}
                                  className="rounded-lg p-2 text-gold-dark transition hover:bg-gold/10"
                                >
                                  <Icono nombre="folio" />
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cream-dark px-4 py-3 text-xs text-stone-light">
                <p>
                  Mostrando{' '}
                  <span className="font-medium text-stone">
                    {reservas.length === 0 ? 0 : (paginaActual - 1) * porPagina + 1}
                  </span>{' '}
                  a{' '}
                  <span className="font-medium text-stone">
                    {Math.min(paginaActual * porPagina, reservas.length)}
                  </span>{' '}
                  de <span className="font-medium text-stone">{reservas.length}</span> reservas.
                </p>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    Por página:
                    <select
                      className="rounded-lg border border-cream-dark bg-white px-2 py-1 text-xs"
                      value={porPagina}
                      onChange={(event) => {
                        setPorPagina(Number(event.target.value));
                        setPagina(1);
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-lg border border-cream-dark p-1.5 disabled:opacity-40"
                      onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
                      disabled={paginaActual === 1}
                      aria-label="Página anterior"
                    >
                      <Icono nombre="flecha" className="h-3.5 w-3.5 rotate-180" />
                    </button>

                    {Array.from({ length: totalPaginas }, (_, indice) => indice + 1)
                      .filter(
                        (numero) =>
                          numero === 1 ||
                          numero === totalPaginas ||
                          Math.abs(numero - paginaActual) <= 1
                      )
                      .map((numero, indice, paginas) => (
                        <span key={numero} className="flex items-center gap-1">
                          {indice > 0 && paginas[indice - 1] !== numero - 1 && (
                            <span className="px-1 text-stone-light">…</span>
                          )}
                          <button
                            type="button"
                            className={`min-w-7 rounded-lg px-2 py-1 text-xs ${
                              numero === paginaActual
                                ? 'bg-gold text-navy-dark'
                                : 'border border-cream-dark bg-white text-stone-light hover:bg-cream'
                            }`}
                            onClick={() => setPagina(numero)}
                          >
                            {numero}
                          </button>
                        </span>
                      ))}

                    <button
                      type="button"
                      className="rounded-lg border border-cream-dark p-1.5 disabled:opacity-40"
                      onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))}
                      disabled={paginaActual === totalPaginas}
                      aria-label="Página siguiente"
                    >
                      <Icono nombre="flecha" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {drawerAbierto && (
          <button
            type="button"
            aria-label="Cerrar formulario"
            className="fixed inset-0 z-40 bg-navy-dark/60"
            onClick={cerrarDrawer}
          />
        )}

        <div
          className={
            drawerAbierto
              ? 'fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto bg-cream p-4 shadow-2xl sm:p-6'
              : 'hidden'
          }
          role="dialog"
          aria-modal="true"
          aria-label={edicion ? 'Editar reserva' : reservaCheckin ? 'Check-in de reserva' : 'Nueva reserva'}
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-light">
              {edicion ? 'Editar reserva' : reservaCheckin ? 'Check-in de reserva' : 'Nueva reserva'}
            </p>
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={cerrarDrawer}>
              Cerrar
            </button>
          </div>

          {edicion && (
            <section className="card border-gold/40">
              <p className="text-sm text-stone-light">
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
                  onClick={cerrarDrawer}
                  disabled={guardandoEdicion}
                >
                  Cerrar
                </button>
              </div>
            </section>
          )}

          {reservaCheckin && (
            <section className="card border-gold/40">
              <p className="mt-1 text-sm text-stone-light">
                {reservaCheckin.codigo} · Hab. {reservaCheckin.habitacion} · {reservaCheckin.cliente}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="pago_monto">Monto a cobrar</label>
                  <MoneyInput
                    id="pago_monto"
                    value={pagoMonto}
                    onChange={setPagoMonto}
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
                  onClick={cerrarDrawer}
                  disabled={procesandoCheckin}
                >
                  Volver
                </button>
              </div>
            </section>
          )}

          <section className="card">
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
                <MoneyInput
                  id="anticipo"
                  value={anticipoMonto}
                  onChange={setAnticipoMonto}
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
                      {cliente.tarifa_plan !== 'PUBLICA'
                        ? ` · ${cliente.tarifa_plan} ${formatoMoneda(Number(cliente.tarifa_precio_noche ?? 0))}`
                        : ''}
                    </option>
                  ))}
                </select>
                {clienteSeleccionado && tarifaNegociada > 0 && (
                  <p className="mt-2 rounded-lg bg-gold/10 px-3 py-2 text-xs text-gold-dark">
                    Tarifa {clienteSeleccionado.tarifa_plan}:{' '}
                    {formatoMoneda(Number(clienteSeleccionado.tarifa_precio_noche ?? 0))} por noche
                    {clienteSeleccionado.tarifa_desayuno_incluido ? ' · incluye desayuno' : ''}.
                  </p>
                )}
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

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="motivo_visita">Motivo de visita</label>
                <input
                  id="motivo_visita"
                  className="input"
                  value={form.motivo_visita ?? ''}
                  onChange={(event) => setForm({ ...form, motivo_visita: event.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="como_llego">Cómo llegó</label>
                <select
                  id="como_llego"
                  className="input"
                  value={form.como_llego ?? ''}
                  onChange={(event) => setForm({ ...form, como_llego: event.target.value })}
                >
                  <option value="">Sin dato</option>
                  <option value="CAMINANDO">Caminando</option>
                  <option value="CARRO">Carro</option>
                  <option value="TAXI">Taxi</option>
                  <option value="BUS">Bus</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="RECOMENDACION">Recomendación</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="label" htmlFor="placa_vehiculo">Placa del vehículo (opcional)</label>
              <input
                id="placa_vehiculo"
                className="input"
                value={form.placa_vehiculo ?? ''}
                onChange={(event) => setForm({ ...form, placa_vehiculo: event.target.value })}
              />
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
                <span>{formatoMoneda(totalAlojamientoMostrado)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-stone-light">Desayuno</span>
                <span>{formatoMoneda(totalDesayuno)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-cream-dark pt-2 font-semibold">
                <span>Total estimado</span>
                <span>{formatoMoneda(totalAlojamientoMostrado + totalDesayuno)}</span>
              </div>
              {Number(anticipoMonto || 0) > 0 && (
                <div className="mt-1 flex justify-between text-gold-dark">
                  <span>Saldo con anticipo</span>
                  <span>
                    {formatoMoneda(
                      Math.max(0, totalAlojamientoMostrado + totalDesayuno - Number(anticipoMonto || 0))
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

        {drawerGrupo && (
          <button
            type="button"
            aria-label="Cerrar reserva grupal"
            className="fixed inset-0 z-40 bg-navy-dark/60"
            onClick={() => setDrawerGrupo(false)}
          />
        )}

        <div
          className={
            drawerGrupo
              ? 'fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto bg-cream p-4 shadow-2xl sm:p-6'
              : 'hidden'
          }
          role="dialog"
          aria-modal="true"
          aria-label="Reserva grupal"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-light">
                Reserva grupal
              </p>
              <p className="text-xs text-stone-light">Un pagador, varias habitaciones.</p>
            </div>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              onClick={() => setDrawerGrupo(false)}
            >
              Cerrar
            </button>
          </div>

          {grupoError && (
            <div className="mb-3 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
              {grupoError}
            </div>
          )}

          <section className="card">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="grupo_entrada">Entrada</label>
                <input
                  id="grupo_entrada"
                  type="date"
                  className="input"
                  value={grupoForm.fecha_entrada}
                  onChange={(event) =>
                    setGrupoForm({ ...grupoForm, fecha_entrada: event.target.value })
                  }
                />
              </div>
              <div>
                <label className="label" htmlFor="grupo_salida">Salida</label>
                <input
                  id="grupo_salida"
                  type="date"
                  className="input"
                  value={grupoForm.fecha_salida}
                  onChange={(event) =>
                    setGrupoForm({ ...grupoForm, fecha_salida: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="label" htmlFor="grupo_pagador">Pagador existente</label>
              <select
                id="grupo_pagador"
                className="input"
                value={grupoForm.cliente_id || ''}
                onChange={(event) => {
                  const id = Number(event.target.value);
                  const cliente = clientes.find((item) => item.id === id);
                  setGrupoForm({
                    ...grupoForm,
                    cliente_id: id,
                    cliente_nombre: cliente?.razon_social ?? '',
                    cliente_documento: cliente?.numero_documento ?? '',
                  });
                }}
              >
                <option value="">Nuevo pagador</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.razon_social} · {cliente.tipo}
                  </option>
                ))}
              </select>
              {pagadorGrupo &&
                pagadorGrupo.tarifa_plan !== 'PUBLICA' &&
                Number(pagadorGrupo.tarifa_precio_noche ?? 0) > 0 && (
                <p className="mt-2 rounded-lg bg-gold/10 px-3 py-2 text-xs text-gold-dark">
                  El pagador tiene tarifa {pagadorGrupo.tarifa_plan} de{' '}
                  {formatoMoneda(Number(pagadorGrupo.tarifa_precio_noche ?? 0))} por noche. Se
                  aplicará a las habitaciones si está vigente.
                </p>
              )}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="grupo_nombre">Nombre del pagador</label>
                <input
                  id="grupo_nombre"
                  className="input"
                  value={grupoForm.cliente_nombre}
                  onChange={(event) =>
                    setGrupoForm({ ...grupoForm, cliente_nombre: event.target.value })
                  }
                />
              </div>
              <div>
                <label className="label" htmlFor="grupo_documento">Documento / NIT</label>
                <input
                  id="grupo_documento"
                  className="input"
                  value={grupoForm.cliente_documento}
                  onChange={(event) =>
                    setGrupoForm({ ...grupoForm, cliente_documento: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-stone">Habitaciones</p>
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-xs"
                onClick={() =>
                  setGrupoForm({
                    ...grupoForm,
                    habitaciones: [
                      ...grupoForm.habitaciones,
                      { habitacion_id: 0, pax: 2, desayuno: 'NO' },
                    ],
                  })
                }
                disabled={grupoForm.habitaciones.length >= 10}
              >
                Agregar habitación
              </button>
            </div>

            <div className="mt-2 space-y-3">
              {grupoForm.habitaciones.map((item, indice) => (
                <div key={indice} className="rounded-xl border border-cream-dark p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-light">
                      Habitación {indice + 1}
                    </p>
                    {grupoForm.habitaciones.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-error"
                        onClick={() =>
                          setGrupoForm({
                            ...grupoForm,
                            habitaciones: grupoForm.habitaciones.filter(
                              (_, posicion) => posicion !== indice
                            ),
                          })
                        }
                      >
                        Quitar
                      </button>
                    )}
                  </div>

                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor={`grupo_hab_${indice}`}>Habitación</label>
                      <select
                        id={`grupo_hab_${indice}`}
                        className="input"
                        value={item.habitacion_id || ''}
                        onChange={(event) =>
                          setGrupoForm({
                            ...grupoForm,
                            habitaciones: grupoForm.habitaciones.map((fila, posicion) =>
                              posicion === indice
                                ? { ...fila, habitacion_id: Number(event.target.value) }
                                : fila
                            ),
                          })
                        }
                      >
                        <option value="">Selecciona</option>
                        {habitacionesTodas
                          .filter(
                            (habitacion) =>
                              habitacion.tipo_uso === 'HABITACION' &&
                              habitacion.capacidad_max > 0
                          )
                          .map((habitacion) => (
                          <option key={habitacion.id} value={habitacion.id}>
                            {habitacion.numero} · {habitacion.capacidad_max} pax
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor={`grupo_pax_${indice}`}>Personas</label>
                      <select
                        id={`grupo_pax_${indice}`}
                        className="input"
                        value={item.pax}
                        onChange={(event) =>
                          setGrupoForm({
                            ...grupoForm,
                            habitaciones: grupoForm.habitaciones.map((fila, posicion) =>
                              posicion === indice
                                ? { ...fila, pax: Number(event.target.value) }
                                : fila
                            ),
                          })
                        }
                      >
                        {[1, 2, 3, 4, 5, 6].map((pax) => (
                          <option key={pax} value={pax}>{pax}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="label" htmlFor="grupo_notas">Notas</label>
              <input
                id="grupo_notas"
                className="input"
                value={grupoForm.notas}
                onChange={(event) => setGrupoForm({ ...grupoForm, notas: event.target.value })}
              />
            </div>

            <button
              className="btn-primary mt-4 w-full"
              onClick={() => void crearGrupo()}
              disabled={
                creandoGrupo ||
                !grupoForm.cliente_nombre.trim() ||
                grupoForm.habitaciones.every((item) => !item.habitacion_id)
              }
            >
              {creandoGrupo ? 'Creando grupo…' : 'Crear reserva grupal'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
