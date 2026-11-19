const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type Usuario = {
  id: number;
  username: string;
  nombre: string;
  rol: string;
};

export type Habitacion = {
  id: number;
  numero: string;
  tipo_uso?: string;
  clima: 'AC' | 'VENTILADOR';
  capacidad_max: number;
  es_suite: boolean;
  piso: number;
  notas: string;
};

export type Cotizacion = {
  habitacion: {
    id: number;
    numero: string;
    clima: 'AC' | 'VENTILADOR';
    es_suite: boolean;
  };
  pax: number;
  acomodacion: number;
  temporada: string;
  escenario: string;
  es_suite_premium: boolean;
  precio: number;
};

export type CheckinPayload = {
  habitacion_id: number;
  pax: number;
  fecha_entrada: string;
  fecha_salida: string;
  temporada: 'BAJA' | 'ALTA';
  escenario: 'NORMAL' | 'A' | 'B' | 'C';
  cliente: {
    nombre: string;
    tipo_documento?: string;
    numero_documento?: string;
    telefono?: string;
    email?: string;
  };
  desayuno: 'NO' | 'PAGADO' | 'INCLUIDO';
  pago?: {
    monto: number;
    metodo_pago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO';
    tipo_documento: 'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA';
    notas?: string;
  };
  notas?: string;
};

export type CheckinResultado = {
  reserva: {
    id: number;
    codigo: string;
    estado: string;
    fecha_entrada: string;
    fecha_salida: string;
    noches: number;
    total: number;
    saldo: number;
  };
  habitacion: { id: number; numero: string; clima: string; es_suite: boolean };
  folio: { id: number; saldo: number };
  cargos: { alojamiento: number; desayuno: number };
  cobro: { id: number; monto: number; metodo_pago?: string } | null;
  desayuno: { modo: string; pax: number; total: number };
};

type LoginResponse = {
  token: string;
  usuario: Usuario;
};

type MeResponse = {
  usuario: {
    sub: string;
    username: string;
    nombre: string;
    rol: string;
  };
};

type DisponibilidadResponse = {
  desde: string;
  hasta: string;
  pax: number;
  total: number;
  habitaciones: Habitacion[];
};

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Error ${res.status}`);
  }

  return (await res.json()) as T;
}

export function loginApi(username: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function meApi(token: string): Promise<Usuario> {
  const { usuario } = await request<MeResponse>('/auth/me', {}, token);
  return {
    id: Number(usuario.sub),
    username: usuario.username,
    nombre: usuario.nombre,
    rol: usuario.rol,
  };
}

export function disponibilidadApi(
  token: string,
  desde: string,
  hasta: string,
  pax: number
) {
  const params = new URLSearchParams({ desde, hasta, pax: String(pax) });
  return request<DisponibilidadResponse>(`/disponibilidad?${params.toString()}`, {}, token);
}

export function habitacionesApi(token: string) {
  return request<{ habitaciones: Habitacion[] }>('/habitaciones', {}, token);
}

export type HabitacionTablero = {
  id: number;
  numero: string;
  piso: number | null;
  clima: 'AC' | 'VENTILADOR' | 'N/A';
  capacidad_max: number;
  es_suite: boolean;
  estado_operativo: 'LIMPIA' | 'SUCIA' | 'MANTENIMIENTO';
  estado: 'LIBRE' | 'OCUPADA' | 'RESERVADA' | 'SUCIA' | 'MANTENIMIENTO';
};

export function tableroHabitacionesApi(token: string) {
  return request<{ habitaciones: HabitacionTablero[] }>('/habitaciones/tablero', {}, token);
}

export function actualizarEstadoHabitacionApi(
  token: string,
  habitacionId: number,
  estado: 'LIMPIA' | 'SUCIA' | 'MANTENIMIENTO'
) {
  return request<{ habitacion: { id: number; numero: string; estado_operativo: string } }>(
    `/habitaciones/${habitacionId}/estado`,
    { method: 'PUT', body: JSON.stringify({ estado_operativo: estado }) },
    token
  );
}

export function cotizarApi(
  token: string,
  habitacionId: number,
  pax: number,
  temporada: 'BAJA' | 'ALTA',
  escenario: 'NORMAL' | 'A' | 'B' | 'C'
) {
  const params = new URLSearchParams({
    habitacion_id: String(habitacionId),
    pax: String(pax),
    temporada,
    escenario,
  });
  return request<Cotizacion>(`/tarifas/cotizar?${params.toString()}`, {}, token);
}

export function checkinApi(token: string, payload: CheckinPayload) {
  return request<CheckinResultado>(
    '/checkin',
    { method: 'POST', body: JSON.stringify(payload) },
    token
  );
}

export type MovimientoCaja = {
  id: number;
  tipo: string;
  monto: string;
  referencia_tipo: string | null;
  referencia_id: number | null;
  fecha: string;
  notas: string | null;
};

export type SesionCaja = {
  id: number;
  punto_venta_id: number;
  punto_venta: string;
  usuario_apertura_id: number;
  usuario_cierre_id: number | null;
  fecha_apertura: string;
  fecha_cierre: string | null;
  monto_apertura: string;
  monto_sistema_efectivo: string | null;
  monto_declarado: string | null;
  diferencia: string | null;
  autorizado_por_id: number | null;
  estado: 'ABIERTA' | 'CERRADA';
  notas: string | null;
  efectivo_esperado: number;
  movimientos: MovimientoCaja[];
};

export function sesionActualApi(token: string) {
  return request<{ sesion: SesionCaja | null }>('/caja/sesion-actual', {}, token);
}

export function abrirCajaApi(
  token: string,
  montoApertura: number,
  notas?: string,
  puntoVentaCodigo?: string
) {
  return request<{ sesion: SesionCaja }>(
    '/caja/sesiones',
    {
      method: 'POST',
      body: JSON.stringify({
        monto_apertura: montoApertura,
        notas,
        punto_venta_codigo: puntoVentaCodigo ?? 'RECEPCION',
      }),
    },
    token
  );
}

export function cerrarCajaApi(
  token: string,
  sesionId: number,
  montoDeclarado: number,
  notas?: string
) {
  return request<{ sesion: SesionCaja; efectivo_esperado: number }>(
    `/caja/sesiones/${sesionId}/cerrar`,
    {
      method: 'POST',
      body: JSON.stringify({ monto_declarado: montoDeclarado, notas }),
    },
    token
  );
}

export type MovimientoCajaPayload = {
  tipo:
    | 'GASTO_EFECTIVO'
    | 'RETIRO_DUENO'
    | 'APORTE'
    | 'AJUSTE_FALTANTE'
    | 'AJUSTE_SOBRANTE';
  monto: number;
  descripcion: string;
  cuenta_codigo?: string;
  soporte_url?: string;
};

export function cajaMovimientoApi(token: string, payload: MovimientoCajaPayload) {
  return request<{
    movimiento: { id: number; tipo: string; monto: number };
    efectivo_esperado: number;
  }>('/caja/movimientos', { method: 'POST', body: JSON.stringify(payload) }, token);
}

export type PuntoVenta = {
  id: number;
  codigo: string;
  nombre: string;
  centro: string;
};

export type SesionAbierta = SesionCaja & {
  punto_venta_nombre: string;
};

export function cajaPuntosVentaApi(token: string) {
  return request<{ puntos_venta: PuntoVenta[] }>('/caja/puntos-venta', {}, token);
}

export function cajaSesionesAbiertasApi(token: string) {
  return request<{ sesiones: SesionAbierta[] }>('/caja/sesiones-abiertas', {}, token);
}

export function cajaTrasladoApi(
  token: string,
  payload: {
    sesion_origen_id: number;
    sesion_destino_id: number;
    monto: number;
    descripcion: string;
  }
) {
  return request<{ traslado: { salida: number; entrada: number } }>(
    '/caja/traslados',
    { method: 'POST', body: JSON.stringify(payload) },
    token
  );
}

export function cajaCambioTurnoApi(
  token: string,
  sesionId: number,
  montoDeclarado: number,
  notas?: string
) {
  return request<{
    cierre: SesionCaja;
    nueva: SesionCaja;
    efectivo_esperado: number;
    diferencia: number;
  }>(`/caja/sesiones/${sesionId}/cambio-turno`, {
    method: 'POST',
    body: JSON.stringify({ monto_declarado: montoDeclarado, notas }),
  }, token);
}

export async function cuadreCajaPdfApi(token: string, sesionId: number): Promise<Blob> {
  const respuesta = await fetch(`${API_URL}/caja/sesiones/${sesionId}/cuadre.pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!respuesta.ok) {
    throw new Error('No se pudo generar el cuadre de caja');
  }

  return respuesta.blob();
}

export type FolioResumen = {
  id: number;
  reserva_id: number;
  saldo: string;
  estado: string;
  fecha_apertura: string;
  fecha_cierre: string | null;
  codigo: string;
  fecha_entrada: string;
  fecha_salida: string;
  titular_cliente_id: number | null;
  habitacion: string;
  huesped: string | null;
};

export type CargoFolio = {
  id: number;
  fecha: string;
  concepto: string;
  cantidad: string;
  precio_unitario: string;
  monto: string;
};

export type CobroFolio = {
  id: number;
  fecha: string;
  monto: string;
  metodo_pago: string;
  tipo_documento: string;
  estado: string;
};

export type FolioDetalle = {
  folio: FolioResumen;
  cargos: CargoFolio[];
  cobros: CobroFolio[];
  totales: { cargos: number; cobros: number; saldo: number };
};

export type CheckoutPayload = {
  metodo_pago?: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO';
  tipo_documento?: 'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA';
  notas?: string;
};

export type CheckoutResultado = {
  folio: { id: number; estado: string };
  reserva: { id: number; codigo: string; estado: string };
  cobro: {
    id: number;
    monto: number;
    metodo_pago?: string;
    sesion_caja_id: number | null;
  } | null;
  totales: { cargos: number; cobros: number; saldo: number };
};

export function foliosApi(token: string) {
  return request<{ folios: FolioResumen[] }>('/folios', {}, token);
}

export function folioApi(token: string, folioId: number) {
  return request<FolioDetalle>(`/folios/${folioId}`, {}, token);
}

export function checkoutApi(token: string, folioId: number, payload: CheckoutPayload) {
  return request<CheckoutResultado>(
    `/folios/${folioId}/checkout`,
    { method: 'POST', body: JSON.stringify(payload) },
    token
  );
}

export type IngresoDetalle = {
  centro_codigo: string;
  centro: string;
  cuenta_codigo: string;
  cuenta: string;
  total: string;
};

export type ReporteIngresos = {
  fecha: string;
  total: number;
  detalle: IngresoDetalle[];
};

export type ReporteOcupacion = {
  total: number;
  ocupadas: number;
  porcentaje: number;
};

export type LibroMovimiento = {
  id: number;
  fecha: string;
  cuenta_codigo: string;
  cuenta: string;
  centro: string;
  debe: string;
  haber: string;
  descripcion: string | null;
  origen_tipo: string;
};

export function reporteIngresosApi(token: string, fecha: string) {
  return request<ReporteIngresos>(`/reportes/ingresos?fecha=${fecha}`, {}, token);
}

export function reporteOcupacionApi(token: string) {
  return request<ReporteOcupacion>('/reportes/ocupacion', {}, token);
}

export function reporteLibroApi(token: string, desde: string, hasta: string) {
  return request<{ desde: string; hasta: string; movimientos: LibroMovimiento[] }>(
    `/reportes/libro?desde=${desde}&hasta=${hasta}`,
    {},
    token
  );
}

export type UsuarioAdmin = {
  id: number;
  username: string;
  nombre_completo: string;
  email: string | null;
  activo: boolean;
  rol: string | null;
  created_at: string;
};

export type RolAdmin = {
  id: number;
  codigo: string;
  nombre: string;
};

export type NuevoUsuario = {
  username: string;
  nombre_completo: string;
  email?: string;
  password: string;
  rol: 'ADMIN' | 'GERENTE' | 'RECEPCION' | 'CAJERO';
  activo?: boolean;
};

export type EditarUsuario = {
  nombre_completo?: string;
  email?: string;
  password?: string;
  rol?: 'ADMIN' | 'GERENTE' | 'RECEPCION' | 'CAJERO';
  activo?: boolean;
};

export function usuariosAdminApi(token: string) {
  return request<{ usuarios: UsuarioAdmin[] }>('/admin/usuarios', {}, token);
}

export function rolesAdminApi(token: string) {
  return request<{ roles: RolAdmin[] }>('/admin/roles', {}, token);
}

export function crearUsuarioApi(token: string, payload: NuevoUsuario) {
  return request<{ usuario: UsuarioAdmin }>(
    '/admin/usuarios',
    { method: 'POST', body: JSON.stringify(payload) },
    token
  );
}

export function actualizarUsuarioApi(token: string, usuarioId: number, payload: EditarUsuario) {
  return request<{ ok: boolean }>(
    `/admin/usuarios/${usuarioId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    token
  );
}

export type Centro = {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
};

export type CargoManualPayload = {
  concepto: string;
  centro_codigo: string;
  cantidad: number;
  precio_unitario: number;
  es_cortesia: boolean;
  motivo_cortesia?: string;
};

export type CargoManualResultado = {
  cargo: {
    cargoId: number;
    folioId: number;
    monto: number;
    saldo: number;
    centro: string;
  };
};

export function centrosApi(token: string) {
  return request<{ centros: Centro[] }>('/catalogos/centros', {}, token);
}

export function crearCargoApi(token: string, folioId: number, payload: CargoManualPayload) {
  return request<CargoManualResultado>(
    `/folios/${folioId}/cargos`,
    { method: 'POST', body: JSON.stringify(payload) },
    token
  );
}

export type DesayunoFila = {
  codigo: string;
  habitacion: string;
  huesped: string | null;
  modo: string;
  pax: string;
};

export type ReporteDesayunos = {
  fecha: string;
  total: number;
  habitaciones: DesayunoFila[];
};

export function reporteDesayunosApi(token: string, fecha: string) {
  return request<ReporteDesayunos>(`/reportes/desayunos?fecha=${fecha}`, {}, token);
}

export async function reciboPdfApi(token: string, cobroId: number): Promise<Blob> {
  const respuesta = await fetch(`${API_URL}/cobros/${cobroId}/recibo`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!respuesta.ok) {
    throw new Error('No se pudo generar el recibo');
  }

  return respuesta.blob();
}

export type Producto = {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string | null;
  precio_venta: string;
  costo: string;
  stock: string;
  stock_minimo: string;
  activo: boolean;
};

export type VentaBar = {
  id: number;
  fecha: string;
  total: string;
  metodo_pago: string;
  estado: string;
  habitacion: string | null;
  cliente: string | null;
};

export type VentaBarPayload = {
  items: Array<{ producto_id: number; cantidad: number }>;
  metodo_pago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CARGO_HABITACION';
  tipo_documento?: 'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA';
  folio_id?: number;
  notas?: string;
};

export type VentaBarResultado = {
  venta: {
    ventaId: number;
    total: number;
    estado: string;
    cobroId: number | null;
    folioId: number | null;
  };
};

export function productosApi(token: string) {
  return request<{ productos: Producto[] }>('/productos', {}, token);
}

export function ventasBarApi(token: string) {
  return request<{ ventas: VentaBar[] }>('/bar/ventas', {}, token);
}

export function venderBarApi(token: string, payload: VentaBarPayload) {
  return request<VentaBarResultado>(
    '/bar/ventas',
    { method: 'POST', body: JSON.stringify(payload) },
    token
  );
}

export type ReservaResumen = {
  id: number;
  codigo: string;
  estado: string;
  created_at: string;
  fecha_entrada: string;
  fecha_salida: string;
  total: string;
  saldo: string;
  anticipo: string;
  desayuno_modo: string;
  desayunos_total: number;
  temporada: 'BAJA' | 'ALTA';
  escenario: 'NORMAL' | 'A' | 'B' | 'C';
  maestra_id: number | null;
  maestra_codigo: string | null;
  motivo_visita: string | null;
  como_llego: string | null;
  origen_reserva: 'WHATSAPP' | 'TELEFONO' | 'DIRECTO' | 'CORREO' | 'WEB' | 'OTA' | null;
  tarifa_plan: 'PUBLICA' | 'EMPRESA' | 'EMPLEADO' | 'GRUPO';
  tarifa_negociada: string | null;
  cliente: string | null;
  tipo_documento: string | null;
  numero_documento: string | null;
  reserva_habitacion_id: number;
  pax: number;
  precio_noche: string;
  habitacion_id: number;
  habitacion: string;
};

export type ReservaDetalle = ReservaResumen & {
  modalidad: string;
  notas: string | null;
  incluye_desayuno: boolean;
  desayunos_pax: number;
  total_desayuno: string;
  rh_estado: string;
  clima: string;
  cliente_id: number;
  tipo_documento: string | null;
  telefono: string | null;
  email: string | null;
  placa_vehiculo: string | null;
  tarifa_motivo: string | null;
  maestra_codigo: string | null;
  pagador_cliente_id: number | null;
};

export type ReservaPayload = {
  cliente_id?: number;
  habitacion_id: number;
  pax: number;
  fecha_entrada: string;
  fecha_salida: string;
  temporada: 'BAJA' | 'ALTA';
  escenario: 'NORMAL' | 'A' | 'B' | 'C';
  cliente: {
    nombre: string;
    tipo_documento?: string;
    numero_documento?: string;
    telefono?: string;
    email?: string;
  };
  desayuno: 'NO' | 'PAGADO' | 'INCLUIDO';
  motivo_visita?: string;
  como_llego?: string;
  placa_vehiculo?: string;
  origen_reserva?: 'WHATSAPP' | 'TELEFONO' | 'DIRECTO' | 'CORREO' | 'WEB' | 'OTA';
  anticipo?: {
    monto: number;
    metodo_pago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
    tipo_documento: 'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA';
  };
  pagos?: Array<{
    monto: number;
    metodo_pago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
    tipo_documento: 'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA';
  }>;
  notas?: string;
};

export type CheckinReservaPayload = {
  pago?: {
    monto: number;
    metodo_pago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO';
    tipo_documento?: 'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA';
    notas?: string;
  };
  pagos?: Array<{
    monto: number;
    metodo_pago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO';
    tipo_documento?: 'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA';
    notas?: string;
  }>;
};

export function reservasApi(token: string, filtros?: { estado?: string; buscar?: string }) {
  const params = new URLSearchParams();
  if (filtros?.estado) params.set('estado', filtros.estado);
  if (filtros?.buscar) params.set('buscar', filtros.buscar);
  const query = params.toString();
  return request<{ reservas: ReservaResumen[] }>(
    `/reservas${query ? `?${query}` : ''}`,
    {},
    token
  );
}

export function reservaApi(token: string, reservaId: number) {
  return request<{ reserva: ReservaDetalle }>(`/reservas/${reservaId}`, {}, token);
}

export type ReservaDetalleCompleto = {
  reserva: ReservaDetalle & {
    created_at: string;
    cliente_tipo: string | null;
    direccion: string | null;
    ciudad: string | null;
    cliente_notas: string | null;
    placa_vehiculo: string | null;
    tarifa_motivo: string | null;
    maestra_codigo: string | null;
    habitacion_notas: string | null;
    es_suite: boolean;
    capacidad_max: number;
    piso: number | null;
  };
  huesped: {
    nombre_completo: string;
    tipo_documento: string | null;
    numero_documento: string | null;
    telefono: string | null;
    email: string | null;
    es_titular: boolean;
    checkin_ts: string | null;
    checkout_ts: string | null;
  } | null;
  cargos: Array<{
    id: number;
    fecha: string;
    concepto: string;
    cantidad: string;
    precio_unitario: string;
    monto: string;
    es_cortesia: boolean;
    anulado: boolean;
    centro: string | null;
  }>;
  pagos: Array<{
    id: number;
    fecha: string;
    monto: string;
    metodo_pago: string;
    tipo_documento: string;
    es_anticipo: boolean;
    aplicado: boolean;
    notas: string | null;
    usuario: string | null;
  }>;
  cuentas_cobrar: Array<{
    id: number;
    monto_original: string;
    saldo: string;
    estado: string;
    fecha_emision: string;
    fecha_vencimiento: string | null;
  }>;
  historial: Array<{ fecha: string; titulo: string; detalle?: string }>;
};

export function reservaDetalleApi(token: string, reservaId: number) {
  return request<ReservaDetalleCompleto>(`/reservas/${reservaId}/detalle`, {}, token);
}

export function crearReservaApi(token: string, payload: ReservaPayload) {
  return request<{ reserva: ReservaResumen }>(
    '/reservas',
    { method: 'POST', body: JSON.stringify(payload) },
    token
  );
}

export type ReservaMaestraPayload = {
  cliente_id?: number;
  cliente: {
    nombre: string;
    tipo?: 'PARTICULAR' | 'EMPRESA' | 'EMPLEADO' | 'GRUPO_TRABAJO' | 'SOCIO';
    tipo_documento?: string;
    numero_documento?: string;
    telefono?: string;
    email?: string;
  };
  fecha_entrada: string;
  fecha_salida: string;
  habitaciones: Array<{
    habitacion_id: number;
    pax: number;
    desayuno: 'NO' | 'PAGADO' | 'INCLUIDO';
    huesped_nombre?: string;
    huesped_documento?: string;
  }>;
  notas?: string;
  origen_reserva?: 'WHATSAPP' | 'TELEFONO' | 'DIRECTO' | 'CORREO' | 'WEB' | 'OTA';
};

export type ReservaMaestra = {
  maestra: {
    id: number;
    codigo: string;
    pagador_cliente_id: number;
    pagador: string;
    fecha_entrada: string;
    fecha_salida: string;
    noches: number;
    total: number;
    habitaciones: number;
  };
  reservas: Array<{
    id: number;
    codigo: string;
    habitacion: string;
    habitacion_id: number;
    pax: number;
    total: number;
    saldo: number;
  }>;
};

export function crearReservaMaestraApi(token: string, payload: ReservaMaestraPayload) {
  return request<ReservaMaestra>(
    '/reservas/maestra',
    { method: 'POST', body: JSON.stringify(payload) },
    token
  );
}

export type ReservaMaestraDetalle = {
  maestra: {
    id: number;
    codigo: string;
    estado: string;
    created_at: string;
    fecha_entrada: string;
    fecha_salida: string;
    notas: string | null;
    pagador_cliente_id: number;
    pagador: string;
    pagador_tipo: string;
    tipo_documento: string | null;
    numero_documento: string | null;
    telefono: string | null;
    email: string | null;
    tarifa_plan: string;
  };
  reservas: Array<{
    id: number;
    codigo: string;
    estado: string;
    total: string;
    saldo: string;
    pax: number;
    precio_noche: string;
    huesped_nombre: string | null;
    huesped_documento: string | null;
    habitacion: string;
    habitacion_id: number;
  }>;
};

export function reservaMaestraDetalleApi(token: string, id: number) {
  return request<ReservaMaestraDetalle>(`/reservas/maestra/${id}`, {}, token);
}

export function cancelarReservaMaestraApi(token: string, id: number) {
  return request<{ ok: boolean }>(
    `/reservas/maestra/${id}/cancelar`,
    { method: 'POST', body: JSON.stringify({}) },
    token
  );
}

export function actualizarReservaApi(
  token: string,
  reservaId: number,
  payload: Partial<ReservaPayload>
) {
  return request<{ ok: boolean }>(
    `/reservas/${reservaId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    token
  );
}

export function cancelarReservaApi(token: string, reservaId: number) {
  return request<{ ok: boolean }>(
    `/reservas/${reservaId}/cancelar`,
    { method: 'POST', body: JSON.stringify({}) },
    token
  );
}

export function checkinReservaApi(
  token: string,
  reservaId: number,
  payload: CheckinReservaPayload
) {
  return request<{
    reserva: { id: number; codigo: string; estado: string; total: number; saldo: number };
    folio: { id: number; saldo: number };
    cobro: { id: number; monto: number } | null;
  }>(`/reservas/${reservaId}/checkin`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function contratoReservaPdfApi(token: string, reservaId: number): Promise<Blob> {
  const respuesta = await fetch(`${API_URL}/reservas/${reservaId}/contrato`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!respuesta.ok) {
    throw new Error('No se pudo generar el contrato');
  }

  return respuesta.blob();
}

export type Cliente = {
  id: number;
  tipo: string;
  razon_social: string;
  tipo_documento: string | null;
  numero_documento: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  ciudad: string | null;
  notas: string | null;
  cupo_credito: string;
  dias_credito: number;
  tarifa_plan: 'PUBLICA' | 'EMPRESA' | 'EMPLEADO' | 'GRUPO';
  tarifa_precio_noche: string | null;
  tarifa_desayuno_incluido: boolean;
  tarifa_vigente_desde: string | null;
  tarifa_vigente_hasta: string | null;
  activo: boolean;
};

export type ClientePayload = {
  tipo: 'PARTICULAR' | 'EMPRESA' | 'EMPLEADO' | 'GRUPO_TRABAJO' | 'SOCIO';
  razon_social: string;
  tipo_documento?: string;
  numero_documento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  notas?: string;
  cupo_credito?: number;
  dias_credito?: number;
  tarifa_plan?: 'PUBLICA' | 'EMPRESA' | 'EMPLEADO' | 'GRUPO';
  tarifa_precio_noche?: number;
  tarifa_desayuno_incluido?: boolean;
  tarifa_vigente_desde?: string;
  tarifa_vigente_hasta?: string;
};

export function clientesApi(token: string, buscar?: string) {
  const params = new URLSearchParams();
  if (buscar) params.set('buscar', buscar);
  const query = params.toString();
  return request<{ clientes: Cliente[] }>(
    `/clientes${query ? `?${query}` : ''}`,
    {},
    token
  );
}

export function clienteApi(token: string, clienteId: number) {
  return request<{ cliente: Cliente }>(`/clientes/${clienteId}`, {}, token);
}

export function crearClienteApi(
  token: string,
  payload: ClientePayload
) {
  return request<{ cliente: Cliente }>(
    '/clientes',
    { method: 'POST', body: JSON.stringify(payload) },
    token
  );
}

export function actualizarClienteApi(
  token: string,
  clienteId: number,
  payload: Partial<ClientePayload>
) {
  return request<{ cliente: Cliente }>(
    `/clientes/${clienteId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    token
  );
}

export type CuentaCobrar = {
  id: number;
  cliente_id: number;
  cliente: string;
  tipo_cliente: string;
  folio_id: number | null;
  monto_original: string;
  saldo: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  estado: string;
  notas: string | null;
};

export function cuentasCobrarApi(token: string, estado?: string) {
  const params = new URLSearchParams();
  if (estado) params.set('estado', estado);
  const query = params.toString();
  return request<{ cuentas: CuentaCobrar[]; total: number }>(
    `/cuentas-cobrar${query ? `?${query}` : ''}`,
    {},
    token
  );
}

export function abonarCuentaApi(
  token: string,
  cuentaId: number,
  payload: {
    monto: number;
    metodo_pago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
    tipo_documento?: 'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA';
    notas?: string;
  }
) {
  return request<{
    abono: { cobroId: number; saldo: number; estado: string };
  }>(`/cuentas-cobrar/${cuentaId}/abonos`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export type CuentaSocioMovimiento = {
  id: number;
  tipo: 'APORTE' | 'RETIRO';
  monto: string;
  saldo_acumulado: string;
  fecha: string;
  descripcion: string | null;
  usuario: string | null;
};

export function cuentaSocioApi(token: string) {
  return request<{ saldo: number; movimientos: CuentaSocioMovimiento[] }>(
    '/caja/cuenta-socio',
    {},
    token
  );
}

export type ResultadoCentro = {
  centro_codigo: string;
  centro: string;
  ingresos: string;
  costos: string;
};

export function resultadoCentrosApi(token: string, mes: string) {
  return request<{ mes: string; centros: ResultadoCentro[] }>(
    `/reportes/resultado-centros?mes=${mes}`,
    {},
    token
  );
}
