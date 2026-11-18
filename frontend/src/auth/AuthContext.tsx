import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loginApi, meApi, type Usuario } from '../lib/api';

const TOKEN_KEY = 'sinmh_token';

type AuthContextValue = {
  token: string | null;
  usuario: Usuario | null;
  cargando: boolean;
  iniciarSesion: (username: string, password: string) => Promise<void>;
  cerrarSesion: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setUsuario(null);
      setCargando(false);
      return;
    }

    let activo = true;
    setCargando(true);

    meApi(token)
      .then((usuarioActual) => {
        if (activo) setUsuario(usuarioActual);
      })
      .catch(() => {
        if (activo) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUsuario(null);
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [token]);

  async function iniciarSesion(username: string, password: string) {
    const respuesta = await loginApi(username, password);
    localStorage.setItem(TOKEN_KEY, respuesta.token);
    setToken(respuesta.token);
    setUsuario(respuesta.usuario);
  }

  function cerrarSesion() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ token, usuario, cargando, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return contexto;
}
