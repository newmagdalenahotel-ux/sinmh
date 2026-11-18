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
