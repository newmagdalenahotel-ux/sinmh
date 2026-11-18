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

export function abrirCajaApi(token: string, montoApertura: number, notas?: string) {
  return request<{ sesion: SesionCaja }>(
    '/caja/sesiones',
    {
      method: 'POST',
      body: JSON.stringify({ monto_apertura: montoApertura, notas }),
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
