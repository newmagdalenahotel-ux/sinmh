import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { MoneyInput } from '../components/MoneyInput';
import { SlideOver } from '../components/SlideOver';
import { useToast } from '../components/Toast';
import { ReservaDetalleContenido } from './ReservaDetallePage';
import { GrupoDetalleContenido } from './GrupoDetallePage';
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
  type HabitacionDisponible,
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
    hour: '2-digit',
    minute: '2-digit',
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
  | 'ver';

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
    ver: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12" />
        <circle cx="12" cy="12" r="3" />
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
  origen_reserva: 'DIRECTO',
};

export function ReservasPage() {
  const { token, usuario } = useAuth();
  const toast = useToast();
  const [reservas, setReservas] = useState<ReservaResumen[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [habitaciones, setHabitaciones] = useState<HabitacionDisponible[]>([]);
  const [mostrarNoDisponibles, setMostrarNoDisponibles] = useState(false);
  const [habitacionAutorizar, setHabitacionAutorizar] = useState<HabitacionDisponible | null>(null);
  const [motivoAutorizacion, setMotivoAutorizacion] = useState('No hay habitaciones de menor capacidad');
  const [autorizacionParcial, setAutorizacionParcial] = useState(false);
  const [motivoUsoParcial, setMotivoUsoParcial] = useState('');
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
  const [pagosExtra, setPagosExtra] = useState<
    Array<{ monto: number | ''; metodo: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' }>
  >([]);
  const totalPagosReserva =
    Number(anticipoMonto || 0) +
    pagosExtra.reduce((suma, pago) => suma + Number(pago.monto || 0), 0);
  const [precioNoche, setPrecioNoche] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [pasoReserva, setPasoReserva] = useState(1);
  const [erroresReserva, setErroresReserva] = useState<{
    fechas?: string;
    habitacion?: string;
    nombre?: string;
    documento?: string;
    telefono?: string;
    email?: string;
    motivo?: string;
    origen?: string;
  }>({});
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [listaClientesAbierta, setListaClientesAbierta] = useState(false);
  const [drawerGrupo, setDrawerGrupo] = useState(false);
  const [reservaVer, setReservaVer] = useState<ReservaResumen | null>(null);
  const [grupoVer, setGrupoVer] = useState<number | null>(null);
  const [grupoError, setGrupoError] = useState('');
  const [creandoGrupo, setCreandoGrupo] = useState(false);
  const [grupoForm, setGrupoForm] = useState({
    fecha_entrada: fechaLocal(0),
    fecha_salida: fechaLocal(1),
    cliente_id: 0,
    cliente_nombre: '',
    cliente_documento: '',
    notas: '',
    origen_reserva: 'DIRECTO' as 'WHATSAPP' | 'TELEFONO' | 'DIRECTO' | 'CORREO' | 'WEB' | 'OTA',
    habitaciones: [
      {
        habitacion_id: 0,
        pax: 2,
        desayuno: 'NO' as 'NO' | 'PAGADO' | 'INCLUIDO',
        huesped_nombre: '',
        huesped_documento: '',
      },
      {
        habitacion_id: 0,
        pax: 2,
        desayuno: 'NO' as 'NO' | 'PAGADO' | 'INCLUIDO',
        huesped_nombre: '',
        huesped_documento: '',
      },
    ],
  });
  const [reservaCheckin, setReservaCheckin] = useState<ReservaResumen | null>(null);
  const [pagoMonto, setPagoMonto] = useState<number | ''>('');
  const [pagosCheckinExtra, setPagosCheckinExtra] = useState<
    Array<{ monto: number | ''; metodo: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' }>
  >([]);
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

  useEffect(() => {
    if (error) toast.error(error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  async function cargar() {
    if (!token) return;
    setPagina(1);
    setCargando(true);
    setError('');

    try {
      const grupos: Record<string, string[]> = {
        RESERVADAS: ['PENDIENTE', 'CONFIRMADA'],
        EN_CASA: ['CHECKIN'],
        CHECKOUT: ['CHECKOUT'],
        CANCELADAS: ['CANCELADA'],
        NO_SHOW: ['NO_SHOW'],
      };
      const estadoGrupo = grupos[filtroEstado];
      const estadoApi = estadoGrupo ? undefined : filtroEstado || undefined;
      const [respuesta, respuestaClientes, respuestaHabitaciones] = await Promise.all([
        reservasApi(token, {
          estado: estadoApi,
          buscar: buscar.trim() || undefined,
        }),
        clientesApi(token),
        habitacionesApi(token),
      ]);
      const filtradas = estadoGrupo
        ? respuesta.reservas.filter((reserva) => estadoGrupo.includes(reserva.estado))
        : respuesta.reservas;

      setReservas(filtradas);
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
        const disponibles = respuesta.habitaciones.filter((h) => h.disponible);
        const seleccionada = respuesta.habitaciones.find((h) => h.id === form.habitacion_id);
        if (seleccionada?.disponible) {
          setAutorizacionParcial(false);
          setMotivoUsoParcial('');
        }
        const existe = disponibles.some((h) => h.id === form.habitacion_id);
        if (!existe) {
          setForm((actual) => ({
            ...actual,
            habitacion_id: disponibles[0]?.id ?? 0,
          }));
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
    cotizarApi(
      token,
      form.habitacion_id,
      form.pax,
      form.temporada,
      form.escenario,
      autorizacionParcial
    )
      .then((cotizacion) => {
        if (activo) setPrecioNoche(cotizacion.precio);
      })
      .catch(() => {
        if (activo) setPrecioNoche(null);
      });

    return () => {
      activo = false;
    };
  }, [token, form.habitacion_id, form.pax, form.temporada, form.escenario, autorizacionParcial]);

  function validarPaso1() {
    const nuevos: typeof erroresReserva = {};
    if (noches < 1) nuevos.fechas = 'La fecha de salida debe ser posterior a la entrada.';
    if (!form.habitacion_id) nuevos.habitacion = 'Selecciona una habitación.';
    setErroresReserva((actuales) => ({ ...actuales, ...nuevos }));
    return Object.keys(nuevos).length === 0;
  }

  function validarPaso2() {
    const nuevos: typeof erroresReserva = {};
    if (form.cliente.nombre.trim().length < 3) {
      nuevos.nombre = 'Escribe el nombre completo (mínimo 3 caracteres).';
    }

    const documento = form.cliente.numero_documento?.trim() ?? '';
    if (!documento) {
      nuevos.documento = 'Escribe el documento.';
    }

    const telefono = form.cliente.telefono?.trim() ?? '';
    if (!telefono) {
      nuevos.telefono = 'Escribe un teléfono.';
    } else if (!/^[+\d\s()-]{7,20}$/.test(telefono)) {
      nuevos.telefono = 'El teléfono debe tener entre 7 y 20 dígitos.';
    }

    const email = form.cliente.email?.trim() ?? '';
    if (!email) {
      nuevos.email = 'Escribe un correo.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nuevos.email = 'Escribe un correo válido, por ejemplo nombre@hotel.com.';
    }

    if (!form.motivo_visita) {
      nuevos.motivo = 'Selecciona Turismo o Corporativo.';
    }

    if (!form.origen_reserva) {
      nuevos.origen = 'Selecciona el origen de la reserva.';
    }

    setErroresReserva((actuales) => ({ ...actuales, ...nuevos }));
    return Object.keys(nuevos).length === 0;
  }

  function continuarPaso1() {
    if (validarPaso1()) setPasoReserva(2);
  }

  function continuarPaso2() {
    if (validarPaso2()) setPasoReserva(3);
  }

  async function crear() {
    if (!token) return;

    if (!validarPaso1()) {
      setPasoReserva(1);
      return;
    }

    if (!validarPaso2()) {
      setPasoReserva(2);
      return;
    }

    setCreando(true);
    setError('');

    const pagos = [
      ...(Number(anticipoMonto || 0) > 0
        ? [
            {
              monto: Number(anticipoMonto),
              metodo_pago: anticipoMetodo,
              tipo_documento: 'NINGUNO' as const,
            },
          ]
        : []),
      ...pagosExtra
        .filter((pago) => Number(pago.monto || 0) > 0)
        .map((pago) => ({
          monto: Number(pago.monto),
          metodo_pago: pago.metodo,
          tipo_documento: 'NINGUNO' as const,
        })),
    ];

    try {
      const respuesta = await crearReservaApi(token, {
        ...form,
        autorizacion_parcial: autorizacionParcial,
        motivo_uso_parcial: autorizacionParcial ? motivoUsoParcial : undefined,
        cliente: {
          ...form.cliente,
          email: form.cliente.email?.trim() || undefined,
          numero_documento: form.cliente.numero_documento?.trim() || undefined,
        },
        anticipo: pagos.length
          ? { monto: pagos.reduce((suma, pago) => suma + pago.monto, 0), metodo_pago: 'EFECTIVO', tipo_documento: 'NINGUNO' }
          : undefined,
        pagos: pagos.length ? pagos : undefined,
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
      setPagosExtra([]);
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
    setReservaVer(null);
    setGrupoVer(null);
    setReservaCheckin(reserva);
    setPagoMonto(Number(reserva.saldo));
    setPagoMetodo('EFECTIVO');
    setPagosCheckinExtra([]);
    setPagoDocumento('NINGUNO');
    setError('');
    setDrawerAbierto(true);
  }

  function abrirNuevaReserva() {
    setEdicion(null);
    setReservaCheckin(null);
    setReservaVer(null);
    setGrupoVer(null);
    setPasoReserva(1);
    setBusquedaCliente('');
    setListaClientesAbierta(false);
    setPagosExtra([]);
    setMostrarNoDisponibles(false);
    setHabitacionAutorizar(null);
    setAutorizacionParcial(false);
    setMotivoUsoParcial('');
    setErroresReserva({});
    setError('');
    setDrawerAbierto(true);
  }

  function abrirVer(reserva: ReservaResumen) {
    setDrawerAbierto(false);
    setDrawerGrupo(false);
    setEdicion(null);
    setReservaCheckin(null);
    setGrupoVer(null);
    setReservaVer(reserva);
  }

  function cerrarVer() {
    setReservaVer(null);
  }

  function abrirGrupoVer(maestraId: number) {
    setDrawerAbierto(false);
    setDrawerGrupo(false);
    setEdicion(null);
    setReservaCheckin(null);
    setReservaVer(null);
    setGrupoVer(maestraId);
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
    setReservaVer(null);
    setGrupoVer(null);
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

    if (habitaciones.some((item) => !item.huesped_nombre?.trim())) {
      setGrupoError('Escribe el huésped de cada habitación');
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
        origen_reserva: grupoForm.origen_reserva,
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
    const pagos = pagoMetodo === 'CREDITO'
      ? []
      : [
          {
            monto,
            metodo_pago: pagoMetodo,
            tipo_documento: pagoDocumento,
          },
          ...pagosCheckinExtra
            .filter((pago) => Number(pago.monto || 0) > 0)
            .map((pago) => ({
              monto: Number(pago.monto),
              metodo_pago: pago.metodo,
              tipo_documento: pagoDocumento,
            })),
        ];
    setProcesandoCheckin(true);
    setError('');

    try {
      const respuesta = await checkinReservaApi(token, reservaCheckin.id, {
        ...(pagos.length
          ? { pagos }
          : { pago: { monto: 0, metodo_pago: 'CREDITO' as const, tipo_documento: pagoDocumento } }),
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
    setReservaVer(null);
    setGrupoVer(null);

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

  function seleccionarCliente(cliente: Cliente) {
    setForm({
      ...form,
      cliente_id: cliente.id,
      cliente: {
        ...form.cliente,
        nombre: cliente.razon_social,
        tipo_documento: cliente.tipo_documento ?? 'CC',
        numero_documento: cliente.numero_documento ?? '',
        telefono: cliente.telefono ?? '',
        email: cliente.email ?? '',
      },
    });
    setBusquedaCliente(cliente.razon_social);
    setListaClientesAbierta(false);
  }

  function limpiarCliente() {
    setForm({
      ...form,
      cliente_id: undefined,
      cliente: { ...form.cliente, nombre: '', numero_documento: '' },
    });
    setBusquedaCliente('');
    setListaClientesAbierta(false);
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
  const clientesFiltrados = clientes
    .filter((cliente) => {
      const texto = busquedaCliente.trim().toLowerCase();
      if (!texto) return true;
      return `${cliente.razon_social} ${cliente.numero_documento ?? ''}`
        .toLowerCase()
        .includes(texto);
    })
    .slice(0, 8);
  const noDisponibles = habitaciones.filter((habitacion) => !habitacion.disponible).length;
  const hayDisponibles = habitaciones.some((habitacion) => habitacion.disponible);
  const habitacionesVisibles = mostrarNoDisponibles
    ? habitaciones
    : habitaciones.filter((habitacion) => habitacion.disponible);

  async function autorizarHabitacion() {
    if (!habitacionAutorizar) return;

    if (!['ADMIN', 'GERENTE'].includes(usuario?.rol ?? '')) {
      toast.error('Solo administración o gerencia puede autorizar uso parcial');
      return;
    }

    setForm({ ...form, habitacion_id: habitacionAutorizar.id });
    setAutorizacionParcial(true);
    setMotivoUsoParcial(motivoAutorizacion.trim() || 'Uso parcial autorizado');
    setErroresReserva((actuales) => ({ ...actuales, habitacion: undefined }));
    setHabitacionAutorizar(null);
  }
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
              <option value="">Todas las reservas</option>
              <option value="RESERVADAS">Reservadas</option>
              <option value="EN_CASA">En casa</option>
              <option value="CHECKOUT">Check-out</option>
              <option value="CANCELADAS">Canceladas</option>
              <option value="NO_SHOW">No show</option>
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
              Check-in sin reserva
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
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-cream-dark text-[11px] uppercase tracking-wide text-stone-light">
                      <th className="px-4 py-3 font-medium">Reserva / Fecha creación</th>
                      <th className="px-4 py-3 font-medium">Huésped titular</th>
                      <th className="px-4 py-3 font-medium">Habitación asignada</th>
                      <th className="px-4 py-3 font-medium">Estancia / Noches</th>
                      <th className="px-4 py-3 font-medium">Valor / Anticipo / Saldo</th>
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
                            {reserva.maestra_codigo && reserva.maestra_id && (
                              <button
                                type="button"
                                onClick={() => abrirGrupoVer(reserva.maestra_id as number)}
                                className="mt-1 inline-flex rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold-dark hover:bg-gold/20"
                              >
                                Grupo {reserva.maestra_codigo}
                              </button>
                            )}
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <div>
                              <p className="whitespace-nowrap font-medium text-stone">
                                {reserva.cliente ?? 'Sin titular'}
                              </p>
                              <p className="whitespace-nowrap text-xs text-stone-light">
                                {reserva.tipo_documento ?? 'DOC'}{' '}
                                {reserva.numero_documento ?? '—'}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <p className="whitespace-nowrap font-medium text-stone">
                              Hab. {reserva.habitacion}
                            </p>
                            <p className="whitespace-nowrap text-xs text-stone-light">
                              {tipoHabitacion(habitacion)} · {reserva.pax} pax
                            </p>
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

                          <td className="px-4 py-4 align-middle">
                            <p className="font-semibold text-stone">
                              {formatoMoneda(Number(reserva.total))}
                            </p>
                            {Number(reserva.anticipo) > 0 && (
                              <p className="text-xs text-success">
                                Anticipo: {formatoMoneda(Number(reserva.anticipo))}
                              </p>
                            )}
                            <p className="text-xs text-stone-light">
                              Saldo: {formatoMoneda(Number(reserva.saldo))}
                            </p>
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
                                title="Ver detalle"
                                aria-label={`Ver detalle de ${reserva.codigo}`}
                                className="rounded-lg p-2 text-stone-light transition hover:bg-cream hover:text-navy"
                                onClick={() => abrirVer(reserva)}
                              >
                                <Icono nombre="ver" />
                              </button>

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

        <SlideOver
          open={drawerAbierto}
          onClose={cerrarDrawer}
          title={edicion ? 'Editar reserva' : reservaCheckin ? 'Check-in de reserva' : 'Nueva reserva'}
          subtitle={
            edicion
              ? `${edicion.codigo} · ${edicion.cliente}`
              : reservaCheckin
                ? `${reservaCheckin.codigo} · Hab. ${reservaCheckin.habitacion}`
                : 'Registra la estadía, el huésped y el pago.'
          }
        >

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

              {pagoMetodo !== 'CREDITO' && (
                <>
                  {pagosCheckinExtra.map((pago, indice) => (
                    <div key={indice} className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor={`pago_checkin_extra_${indice}`}>
                          Pago {indice + 2}
                        </label>
                        <MoneyInput
                          id={`pago_checkin_extra_${indice}`}
                          value={pago.monto}
                          onChange={(valor) =>
                            setPagosCheckinExtra((actuales) =>
                              actuales.map((fila, posicion) =>
                                posicion === indice ? { ...fila, monto: valor } : fila
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor={`pago_checkin_metodo_${indice}`}>
                          Método
                        </label>
                        <div className="flex gap-2">
                          <select
                            id={`pago_checkin_metodo_${indice}`}
                            className="input"
                            value={pago.metodo}
                            onChange={(event) =>
                              setPagosCheckinExtra((actuales) =>
                                actuales.map((fila, posicion) =>
                                  posicion === indice
                                    ? {
                                        ...fila,
                                        metodo: event.target.value as
                                          | 'EFECTIVO'
                                          | 'TARJETA'
                                          | 'TRANSFERENCIA',
                                      }
                                    : fila
                                )
                              )
                            }
                          >
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="TARJETA">Tarjeta</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                          </select>
                          <button
                            type="button"
                            className="rounded-lg border border-error/30 px-3 text-xs text-error"
                            onClick={() =>
                              setPagosCheckinExtra((actuales) =>
                                actuales.filter((_, posicion) => posicion !== indice)
                              )
                            }
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-secondary mt-3 px-3 py-2 text-xs"
                    onClick={() =>
                      setPagosCheckinExtra((actuales) => [
                        ...actuales,
                        { monto: '', metodo: 'TRANSFERENCIA' },
                      ])
                    }
                  >
                    + Agregar pago
                  </button>
                </>
              )}

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

          {!edicion && !reservaCheckin && (
            <section className="card">
              <div className="mb-5 flex flex-wrap gap-2">
                {[
                  { numero: 1, texto: 'Estadía' },
                  { numero: 2, texto: 'Huésped y origen' },
                  { numero: 3, texto: 'Pago' },
                ].map((etapa) => (
                  <div
                    key={etapa.numero}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${
                      pasoReserva === etapa.numero
                        ? 'bg-gold/20 font-semibold text-gold-dark'
                        : 'bg-cream text-stone-light'
                    }`}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px]">
                      {etapa.numero}
                    </span>
                    {etapa.texto}
                  </div>
                ))}
              </div>

              {pasoReserva === 1 && (
                <div className="space-y-3">
                  <h2 className="font-display text-xl text-stone">1. Fechas, personas y habitación</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="fecha_entrada">
                        Entrada <span className="text-error">*</span>
                      </label>
                      <input
                        id="fecha_entrada"
                        type="date"
                        className="input"
                        value={form.fecha_entrada}
                        onChange={(event) => {
                          setForm({ ...form, fecha_entrada: event.target.value });
                          setErroresReserva((actuales) => ({ ...actuales, fechas: undefined }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="fecha_salida">
                        Salida <span className="text-error">*</span>
                      </label>
                      <input
                        id="fecha_salida"
                        type="date"
                        className={`input ${erroresReserva.fechas ? 'border-error' : ''}`}
                        value={form.fecha_salida}
                        onChange={(event) => {
                          setForm({ ...form, fecha_salida: event.target.value });
                          setErroresReserva((actuales) => ({ ...actuales, fechas: undefined }));
                        }}
                      />
                    </div>
                  </div>
                  {erroresReserva.fechas && (
                    <p className="text-xs text-error">{erroresReserva.fechas}</p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="pax">
                        Personas <span className="text-error">*</span>
                      </label>
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
                    <div className="sm:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="label mb-0">
                          Habitaciones {mostrarNoDisponibles ? 'del período' : 'disponibles'}{' '}
                          <span className="text-error">*</span>
                        </label>
                        {noDisponibles > 0 && (
                          <button
                            type="button"
                            className="text-xs font-medium text-gold-dark underline"
                            onClick={() => setMostrarNoDisponibles((actual) => !actual)}
                          >
                            {mostrarNoDisponibles
                              ? 'Ver solo disponibles'
                              : `Ver no disponibles (${noDisponibles})`}
                          </button>
                        )}
                      </div>
                      <div className="mt-2 grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {habitacionesVisibles.map((habitacion) => {
                          const activa =
                            form.habitacion_id === habitacion.id ||
                            (autorizacionParcial && form.habitacion_id === habitacion.id);
                          const autorizable =
                            !hayDisponibles && habitacion.permite_autorizacion;
                          const bloqueada = !habitacion.disponible && !autorizable;
                          return (
                            <button
                              key={habitacion.id}
                              type="button"
                              disabled={bloqueada}
                              onClick={() => {
                                if (habitacion.disponible) {
                                  setForm({ ...form, habitacion_id: habitacion.id });
                                  setAutorizacionParcial(false);
                                  setMotivoUsoParcial('');
                                  setErroresReserva((actuales) => ({
                                    ...actuales,
                                    habitacion: undefined,
                                  }));
                                } else if (autorizable) {
                                  setHabitacionAutorizar(habitacion);
                                  setMotivoAutorizacion(
                                    'No hay habitaciones de menor capacidad'
                                  );
                                }
                              }}
                              className={`rounded-xl border p-3 text-left transition ${
                                bloqueada
                                  ? 'cursor-not-allowed border-cream-dark bg-cream/40 opacity-60'
                                  : activa
                                    ? 'border-gold bg-gold/10 ring-2 ring-gold/30'
                                    : 'border-cream-dark bg-white hover:border-gold/50'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-stone">Hab. {habitacion.numero}</p>
                                <span className="text-xs text-stone-light">
                                  {habitacion.es_suite ? 'Suite' : `${habitacion.capacidad_max} pax`}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-stone-light">
                                {habitacion.clima === 'AC' ? 'Aire acondicionado' : 'Ventilador'}
                                {habitacion.es_suite ? ' · Suite' : ''}
                              </p>
                              {habitacion.motivo && (
                                <p className="mt-1 text-[11px] font-medium text-error">
                                  {habitacion.motivo === 'MANTENIMIENTO'
                                    ? 'Mantenimiento'
                                    : habitacion.motivo === 'EN_CASA'
                                      ? 'En casa'
                                      : habitacion.motivo === 'RESERVADA'
                                        ? 'Reservada en estas fechas'
                                        : habitacion.motivo === 'OCUPADA'
                                          ? 'Ocupada en esas fechas'
                                          : `No permite ${form.pax} pax`}
                                </p>
                              )}
                              {autorizable && !activa && (
                                <p className="mt-1 text-[11px] font-medium text-warning">
                                  Requiere autorización
                                </p>
                              )}
                              {activa && autorizacionParcial && (
                                <p className="mt-1 text-[11px] font-medium text-gold-dark">
                                  Uso parcial autorizado
                                </p>
                              )}
                              {activa && !autorizacionParcial && (
                                <p className="mt-1 text-[11px] font-medium text-gold-dark">
                                  Seleccionada
                                </p>
                              )}
                              {habitacion.advertencia === 'LIMPIEZA' && (
                                <p className="mt-1 text-[11px] font-medium text-warning">
                                  Limpieza pendiente
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {habitacionesVisibles.length === 0 && (
                        <p className="mt-2 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
                          No hay habitaciones disponibles para esas fechas y personas.
                          {noDisponibles > 0 ? ' Puedes revisar las no disponibles con el enlace de arriba.' : ''}
                        </p>
                      )}
                      {erroresReserva.habitacion && (
                        <p className="mt-2 text-xs text-error">{erroresReserva.habitacion}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
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

                  {precioNocheMostrado > 0 && (
                    <p className="rounded-lg bg-cream px-3 py-2 text-sm text-stone-light">
                      Precio por noche: <strong>{formatoMoneda(precioNocheMostrado)}</strong> · Total
                      alojamiento: <strong>{formatoMoneda(totalAlojamientoMostrado)}</strong>
                    </p>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={continuarPaso1}
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {pasoReserva === 2 && (
                <div className="space-y-3">
                  <h2 className="font-display text-xl text-stone">2. Huésped y origen</h2>

                  <div>
                    <label className="label" htmlFor="buscar_cliente">Buscar cliente existente</label>
                    <div className="relative">
                      <input
                        id="buscar_cliente"
                        className="input"
                        placeholder="Nombre, documento o teléfono…"
                        value={busquedaCliente}
                        onChange={(event) => {
                          setBusquedaCliente(event.target.value);
                          setListaClientesAbierta(true);
                          if (form.cliente_id) {
                            setForm({ ...form, cliente_id: undefined });
                          }
                        }}
                        onFocus={() => setListaClientesAbierta(true)}
                        autoComplete="off"
                      />
                      {listaClientesAbierta && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-cream-dark bg-white p-1 shadow-xl">
                          <button
                            type="button"
                            className="w-full rounded-lg px-3 py-2 text-left text-sm text-gold-dark hover:bg-gold/10"
                            onClick={limpiarCliente}
                          >
                            + Nuevo cliente
                          </button>
                          {clientesFiltrados.length === 0 ? (
                            <p className="px-3 py-2 text-sm text-stone-light">
                              No hay coincidencias.
                            </p>
                          ) : (
                            clientesFiltrados.map((cliente) => (
                              <button
                                key={cliente.id}
                                type="button"
                                className="w-full rounded-lg px-3 py-2 text-left hover:bg-cream"
                                onClick={() => seleccionarCliente(cliente)}
                              >
                                <p className="text-sm font-medium text-stone">
                                  {cliente.razon_social}
                                </p>
                                <p className="text-xs text-stone-light">
                                  {cliente.tipo} · {cliente.tipo_documento ?? ''}{' '}
                                  {cliente.numero_documento ?? ''}
                                  {cliente.tarifa_plan !== 'PUBLICA'
                                    ? ` · ${cliente.tarifa_plan}`
                                    : ''}
                                </p>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {clienteSeleccionado ? (
                      <p className="mt-2 flex items-center justify-between rounded-lg bg-gold/10 px-3 py-2 text-xs text-gold-dark">
                        <span>
                          {clienteSeleccionado.razon_social} · {clienteSeleccionado.tipo}
                        </span>
                        <button type="button" className="underline" onClick={limpiarCliente}>
                          Quitar
                        </button>
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-stone-light">
                        Escribe para buscar o crea un cliente nuevo.
                      </p>
                    )}
                    {clienteSeleccionado && tarifaNegociada > 0 && (
                      <p className="mt-2 rounded-lg bg-gold/10 px-3 py-2 text-xs text-gold-dark">
                        Tarifa {clienteSeleccionado.tarifa_plan}:{' '}
                        {formatoMoneda(tarifaNegociada)} por noche
                        {clienteSeleccionado.tarifa_desayuno_incluido ? ' · incluye desayuno' : ''}.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="cliente">
                        Nombre completo <span className="text-error">*</span>
                      </label>
                      <input
                        id="cliente"
                        className={`input ${erroresReserva.nombre ? 'border-error' : ''}`}
                        aria-invalid={Boolean(erroresReserva.nombre)}
                        value={form.cliente.nombre}
                        onBlur={() => {
                          if (form.cliente.nombre.trim().length < 3) {
                            setErroresReserva((actuales) => ({
                              ...actuales,
                              nombre: 'Escribe el nombre completo (mínimo 3 caracteres).',
                            }));
                          }
                        }}
                        onChange={(event) => {
                          setForm({
                            ...form,
                            cliente: { ...form.cliente, nombre: event.target.value },
                          });
                          setErroresReserva((actuales) => ({ ...actuales, nombre: undefined }));
                        }}
                      />
                      {erroresReserva.nombre && (
                        <p className="mt-1 text-xs text-error">{erroresReserva.nombre}</p>
                      )}
                    </div>
                    <div>
                      <label className="label" htmlFor="documento">
                        Documento <span className="text-error">*</span>
                      </label>
                      <input
                        id="documento"
                        className={`input ${erroresReserva.documento ? 'border-error' : ''}`}
                        aria-invalid={Boolean(erroresReserva.documento)}
                        value={form.cliente.numero_documento ?? ''}
                        onBlur={() => {
                          const documento = form.cliente.numero_documento?.trim() ?? '';
                          if (!documento) {
                            setErroresReserva((actuales) => ({
                              ...actuales,
                              documento: 'Escribe el documento.',
                            }));
                          }
                        }}
                        onChange={(event) => {
                          setForm({
                            ...form,
                            cliente: { ...form.cliente, numero_documento: event.target.value },
                          });
                          setErroresReserva((actuales) => ({
                            ...actuales,
                            documento: undefined,
                          }));
                        }}
                      />
                      {erroresReserva.documento && (
                        <p className="mt-1 text-xs text-error">{erroresReserva.documento}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="telefono">
                        Teléfono <span className="text-error">*</span>
                      </label>
                      <input
                        id="telefono"
                        className={`input ${erroresReserva.telefono ? 'border-error' : ''}`}
                        aria-invalid={Boolean(erroresReserva.telefono)}
                        value={form.cliente.telefono ?? ''}
                        onBlur={() => {
                          const telefono = form.cliente.telefono?.trim() ?? '';
                          if (!telefono) {
                            setErroresReserva((actuales) => ({
                              ...actuales,
                              telefono: 'Escribe un teléfono.',
                            }));
                          } else if (!/^[+\d\s()-]{7,20}$/.test(telefono)) {
                            setErroresReserva((actuales) => ({
                              ...actuales,
                              telefono: 'El teléfono debe tener entre 7 y 20 dígitos.',
                            }));
                          }
                        }}
                        onChange={(event) => {
                          setForm({
                            ...form,
                            cliente: { ...form.cliente, telefono: event.target.value },
                          });
                          setErroresReserva((actuales) => ({
                            ...actuales,
                            telefono: undefined,
                          }));
                        }}
                      />
                      {erroresReserva.telefono && (
                        <p className="mt-1 text-xs text-error">{erroresReserva.telefono}</p>
                      )}
                    </div>
                    <div>
                      <label className="label" htmlFor="email">
                        Correo <span className="text-error">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        className={`input ${erroresReserva.email ? 'border-error' : ''}`}
                        aria-invalid={Boolean(erroresReserva.email)}
                        value={form.cliente.email ?? ''}
                        onBlur={() => {
                          const email = form.cliente.email?.trim() ?? '';
                          if (!email) {
                            setErroresReserva((actuales) => ({
                              ...actuales,
                              email: 'Escribe un correo.',
                            }));
                          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                            setErroresReserva((actuales) => ({
                              ...actuales,
                              email: 'Escribe un correo válido, por ejemplo nombre@hotel.com.',
                            }));
                          }
                        }}
                        onChange={(event) => {
                          setForm({
                            ...form,
                            cliente: { ...form.cliente, email: event.target.value },
                          });
                          setErroresReserva((actuales) => ({
                            ...actuales,
                            email: undefined,
                          }));
                        }}
                      />
                      {erroresReserva.email && (
                        <p className="mt-1 text-xs text-error">{erroresReserva.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="motivo_visita">
                        Motivo <span className="text-error">*</span>
                      </label>
                      <select
                        id="motivo_visita"
                        className={`input ${erroresReserva.motivo ? 'border-error' : ''}`}
                        aria-invalid={Boolean(erroresReserva.motivo)}
                        value={form.motivo_visita ?? ''}
                        onChange={(event) => {
                          setForm({ ...form, motivo_visita: event.target.value });
                          setErroresReserva((actuales) => ({ ...actuales, motivo: undefined }));
                        }}
                      >
                        <option value="">Selecciona</option>
                        <option value="TURISMO">Turismo</option>
                        <option value="CORPORATIVO">Corporativo</option>
                      </select>
                      {erroresReserva.motivo && (
                        <p className="mt-1 text-xs text-error">{erroresReserva.motivo}</p>
                      )}
                    </div>
                    <div>
                      <label className="label" htmlFor="origen_reserva">
                        Origen <span className="text-error">*</span>
                      </label>
                      <select
                        id="origen_reserva"
                        className={`input ${erroresReserva.origen ? 'border-error' : ''}`}
                        aria-invalid={Boolean(erroresReserva.origen)}
                        value={form.origen_reserva ?? 'DIRECTO'}
                        onChange={(event) => {
                          setForm({
                            ...form,
                            origen_reserva: event.target.value as typeof form.origen_reserva,
                          });
                          setErroresReserva((actuales) => ({ ...actuales, origen: undefined }));
                        }}
                      >
                        <option value="DIRECTO">Directo</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="TELEFONO">Teléfono</option>
                        <option value="CORREO">Correo</option>
                        <option value="WEB">Web</option>
                        <option value="OTA">OTA</option>
                      </select>
                      {erroresReserva.origen && (
                        <p className="mt-1 text-xs text-error">{erroresReserva.origen}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between gap-2 pt-2">
                    <button type="button" className="btn-secondary" onClick={() => setPasoReserva(1)}>
                      Atrás
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={continuarPaso2}
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {pasoReserva === 3 && (
                <div className="space-y-3">
                  <h2 className="font-display text-xl text-stone">3. Pago y confirmación</h2>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="anticipo">Pago 1</label>
                      <MoneyInput
                        id="anticipo"
                        value={anticipoMonto}
                        onChange={setAnticipoMonto}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="anticipo_metodo">Método del pago 1</label>
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
                  </div>

                  {pagosExtra.map((pago, indice) => (
                    <div key={indice} className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor={`pago_extra_${indice}`}>
                          Pago {indice + 2}
                        </label>
                        <MoneyInput
                          id={`pago_extra_${indice}`}
                          value={pago.monto}
                          onChange={(valor) =>
                            setPagosExtra((actuales) =>
                              actuales.map((fila, posicion) =>
                                posicion === indice ? { ...fila, monto: valor } : fila
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor={`pago_extra_metodo_${indice}`}>
                          Método del pago {indice + 2}
                        </label>
                        <div className="flex gap-2">
                          <select
                            id={`pago_extra_metodo_${indice}`}
                            className="input"
                            value={pago.metodo}
                            onChange={(event) =>
                              setPagosExtra((actuales) =>
                                actuales.map((fila, posicion) =>
                                  posicion === indice
                                    ? {
                                        ...fila,
                                        metodo: event.target.value as
                                          | 'EFECTIVO'
                                          | 'TARJETA'
                                          | 'TRANSFERENCIA',
                                      }
                                    : fila
                                )
                              )
                            }
                          >
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="TARJETA">Tarjeta</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                          </select>
                          <button
                            type="button"
                            className="rounded-lg border border-error/30 px-3 text-xs text-error"
                            onClick={() =>
                              setPagosExtra((actuales) =>
                                actuales.filter((_, posicion) => posicion !== indice)
                              )
                            }
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-xs"
                    onClick={() =>
                      setPagosExtra((actuales) => [
                        ...actuales,
                        { monto: '', metodo: 'TRANSFERENCIA' },
                      ])
                    }
                  >
                    + Agregar pago
                  </button>

                  <p className="rounded-lg bg-cream px-3 py-2 text-xs text-stone-light">
                    {totalPagosReserva > 0
                      ? `Pagos registrados: ${formatoMoneda(totalPagosReserva)}.`
                      : 'Sin anticipo: la reserva queda confirmada con el saldo total. Déjalo en 0 si la política no exige abono.'}
                  </p>

                  <div>
                    <label className="label" htmlFor="notas_reserva">Notas</label>
                    <input
                      id="notas_reserva"
                      className="input"
                      value={form.notas ?? ''}
                      onChange={(event) => setForm({ ...form, notas: event.target.value })}
                    />
                  </div>

                  <div className="rounded-xl border border-cream-dark bg-cream/50 p-3 text-sm">
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
                    {totalPagosReserva > 0 && (
                      <div className="mt-1 flex justify-between text-gold-dark">
                        <span>Saldo con pagos</span>
                        <span>
                          {formatoMoneda(
                            Math.max(
                              0,
                              totalAlojamientoMostrado +
                                totalDesayuno -
                                totalPagosReserva
                            )
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between gap-2 pt-2">
                    <button type="button" className="btn-secondary" onClick={() => setPasoReserva(2)}>
                      Atrás
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => void crear()}
                      disabled={creando}
                    >
                      {creando ? 'Creando…' : 'Crear reserva'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </SlideOver>

        <SlideOver
          open={drawerGrupo}
          onClose={() => setDrawerGrupo(false)}
          title="Reserva grupal"
          subtitle="Un pagador, varias habitaciones."
        >

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
                      {
                        habitacion_id: 0,
                        pax: 2,
                        desayuno: 'NO',
                        huesped_nombre: '',
                        huesped_documento: '',
                      },
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

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor={`grupo_huesped_${indice}`}>Huésped de la habitación</label>
                      <input
                        id={`grupo_huesped_${indice}`}
                        className="input"
                        value={item.huesped_nombre ?? ''}
                        onChange={(event) =>
                          setGrupoForm({
                            ...grupoForm,
                            habitaciones: grupoForm.habitaciones.map((fila, posicion) =>
                              posicion === indice
                                ? { ...fila, huesped_nombre: event.target.value }
                                : fila
                            ),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor={`grupo_doc_${indice}`}>Documento</label>
                      <input
                        id={`grupo_doc_${indice}`}
                        className="input"
                        value={item.huesped_documento ?? ''}
                        onChange={(event) =>
                          setGrupoForm({
                            ...grupoForm,
                            habitaciones: grupoForm.habitaciones.map((fila, posicion) =>
                              posicion === indice
                                ? { ...fila, huesped_documento: event.target.value }
                                : fila
                            ),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="label" htmlFor="grupo_origen">Origen</label>
              <select
                id="grupo_origen"
                className="input"
                value={grupoForm.origen_reserva}
                onChange={(event) =>
                  setGrupoForm({
                    ...grupoForm,
                    origen_reserva: event.target.value as typeof grupoForm.origen_reserva,
                  })
                }
              >
                <option value="DIRECTO">Directo</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="TELEFONO">Teléfono</option>
                <option value="CORREO">Correo</option>
                <option value="WEB">Web</option>
                <option value="OTA">OTA</option>
              </select>
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
                grupoForm.habitaciones.every((item) => !item.habitacion_id) ||
                grupoForm.habitaciones.some(
                  (item) => item.habitacion_id > 0 && !item.huesped_nombre?.trim()
                )
              }
            >
              {creandoGrupo ? 'Creando grupo…' : 'Crear reserva grupal'}
            </button>
          </section>
        </SlideOver>

        <SlideOver
          open={Boolean(reservaVer)}
          onClose={cerrarVer}
          size="detail"
          title="Detalle de reserva"
          subtitle={reservaVer ? `${reservaVer.codigo} · ${reservaVer.cliente ?? 'Sin titular'}` : undefined}
        >
          {reservaVer && (
            <ReservaDetalleContenido reservaId={reservaVer.id} onClose={cerrarVer} />
          )}
        </SlideOver>

        <SlideOver
          open={grupoVer !== null}
          onClose={() => setGrupoVer(null)}
          size="detail"
          title="Detalle del grupo"
          subtitle="Pagador, habitaciones y saldos."
        >
          {grupoVer !== null && (
            <GrupoDetalleContenido
              grupoId={grupoVer}
              onClose={() => setGrupoVer(null)}
            />
          )}
        </SlideOver>

        {habitacionAutorizar && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Cerrar autorización"
              className="absolute inset-0 bg-navy-dark/60 backdrop-blur-[2px]"
              onClick={() => setHabitacionAutorizar(null)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Autorizar uso parcial"
              className="relative w-full max-w-md rounded-2xl border border-gold/20 bg-cream p-6 shadow-2xl"
            >
              <h2 className="font-display text-xl text-stone">Autorizar uso parcial</h2>
              <p className="mt-1 text-sm text-stone-light">
                Hab. {habitacionAutorizar.numero} · capacidad {habitacionAutorizar.capacidad_max}{' '}
                pax · se usaría para {form.pax} pax.
              </p>
              <p className="mt-2 rounded-lg bg-gold/10 px-3 py-2 text-xs text-gold-dark">
                Se cobrará la tarifa correspondiente a {form.pax} pax. Solo administración o
                gerencia puede aprobar esta excepción.
              </p>
              <div className="mt-4">
                <label className="label" htmlFor="motivo_autorizacion">Motivo</label>
                <textarea
                  id="motivo_autorizacion"
                  className="input min-h-20"
                  value={motivoAutorizacion}
                  onChange={(event) => setMotivoAutorizacion(event.target.value)}
                />
              </div>
              {!['ADMIN', 'GERENTE'].includes(usuario?.rol ?? '') && (
                <p className="mt-2 text-xs text-error">
                  Tu rol no puede autorizar. Pide autorización a gerencia.
                </p>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setHabitacionAutorizar(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!['ADMIN', 'GERENTE'].includes(usuario?.rol ?? '')}
                  onClick={() => void autorizarHabitacion()}
                >
                  Autorizar y seleccionar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
