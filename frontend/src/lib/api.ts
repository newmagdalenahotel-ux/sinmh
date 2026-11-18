const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type Usuario = {
  id: number;
  username: string;
  nombre: string;
  rol: string;
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
  const { usuario } = await request<MeResponse>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

  return {
    id: Number(usuario.sub),
    username: usuario.username,
    nombre: usuario.nombre,
    rol: usuario.rol,
  };
}
