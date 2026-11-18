import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  actualizarUsuarioApi,
  crearUsuarioApi,
  rolesAdminApi,
  usuariosAdminApi,
  type NuevoUsuario,
  type RolAdmin,
  type UsuarioAdmin,
} from '../lib/api';

const usuarioNuevo: NuevoUsuario = {
  username: '',
  nombre_completo: '',
  email: '',
  password: '',
  rol: 'RECEPCION',
  activo: true,
};

export function ConfiguracionPage() {
  const { token, usuario } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [roles, setRoles] = useState<RolAdmin[]>([]);
  const [nuevo, setNuevo] = useState<NuevoUsuario>(usuarioNuevo);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => {
    if (token) void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function cargar() {
    if (!token) return;
    setCargando(true);
    setError('');

    try {
      const [respuestaUsuarios, respuestaRoles] = await Promise.all([
        usuariosAdminApi(token),
        rolesAdminApi(token),
      ]);
      setUsuarios(respuestaUsuarios.usuarios);
      setRoles(respuestaRoles.roles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la configuración');
    } finally {
      setCargando(false);
    }
  }

  async function crear() {
    if (!token) return;
    setProcesando(true);
    setError('');
    setExito('');

    try {
      await crearUsuarioApi(token, {
        ...nuevo,
        email: nuevo.email?.trim() || undefined,
      });
      setNuevo(usuarioNuevo);
      setExito('Usuario creado');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el usuario');
    } finally {
      setProcesando(false);
    }
  }

  async function cambiarActivo(usuarioFila: UsuarioAdmin) {
    if (!token) return;
    setProcesando(true);
    setError('');
    setExito('');

    try {
      await actualizarUsuarioApi(token, usuarioFila.id, { activo: !usuarioFila.activo });
      setExito(`Usuario ${usuarioFila.username} ${usuarioFila.activo ? 'desactivado' : 'activado'}`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el usuario');
    } finally {
      setProcesando(false);
    }
  }

  async function cambiarRol(usuarioFila: UsuarioAdmin, rol: string) {
    if (!token) return;
    setProcesando(true);
    setError('');
    setExito('');

    try {
      await actualizarUsuarioApi(token, usuarioFila.id, {
        rol: rol as NuevoUsuario['rol'],
      });
      setExito(`Rol de ${usuarioFila.username} actualizado`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el rol');
    } finally {
      setProcesando(false);
    }
  }

  if (!token) return null;

  if (usuario?.rol !== 'ADMIN') {
    return (
      <div className="card max-w-xl">
        <h1 className="font-display text-2xl text-stone">Configuración</h1>
        <p className="mt-2 text-sm text-stone-light">
          Solo el administrador puede gestionar usuarios y roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-gold-dark">Recepción</p>
        <h1 className="font-display text-3xl text-stone">Usuarios y roles</h1>
        <p className="mt-1 text-sm text-stone-light">
          Crea las cuentas de recepción, caja y gerencia.
        </p>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      {exito && <div className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{exito}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-stone">Usuarios</h2>
            <span className="text-xs text-stone-light">{usuarios.length}</span>
          </div>

          {cargando ? (
            <p className="mt-4 text-sm text-stone-light">Cargando…</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cream-dark text-xs uppercase tracking-wide text-stone-light">
                    <th className="py-2 pr-3">Usuario</th>
                    <th className="py-2 pr-3">Rol</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((fila) => (
                    <tr key={fila.id} className="border-b border-cream-dark/60">
                      <td className="py-3 pr-3">
                        <p className="font-medium">{fila.username}</p>
                        <p className="text-xs text-stone-light">{fila.nombre_completo}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <select
                          className="rounded-lg border border-cream-dark bg-white px-2 py-1 text-xs"
                          value={fila.rol ?? ''}
                          onChange={(event) => void cambiarRol(fila, event.target.value)}
                          disabled={procesando}
                        >
                          {roles.map((rol) => (
                            <option key={rol.codigo} value={rol.codigo}>
                              {rol.nombre}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                            fila.activo
                              ? 'bg-success/10 text-success'
                              : 'bg-error/10 text-error'
                          }`}
                        >
                          {fila.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          className="rounded-lg border border-gold/40 px-3 py-1 text-xs text-gold-dark transition hover:bg-gold hover:text-navy-dark"
                          onClick={() => void cambiarActivo(fila)}
                          disabled={procesando}
                        >
                          {fila.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="font-display text-xl text-stone">Nuevo usuario</h2>

          <div className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="username">Usuario</label>
              <input
                id="username"
                className="input"
                value={nuevo.username}
                onChange={(event) => setNuevo({ ...nuevo, username: event.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="nombre_completo">Nombre completo</label>
              <input
                id="nombre_completo"
                className="input"
                value={nuevo.nombre_completo}
                onChange={(event) => setNuevo({ ...nuevo, nombre_completo: event.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                value={nuevo.email ?? ''}
                onChange={(event) => setNuevo({ ...nuevo, email: event.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                className="input"
                value={nuevo.password}
                onChange={(event) => setNuevo({ ...nuevo, password: event.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="rol">Rol</label>
              <select
                id="rol"
                className="input"
                value={nuevo.rol}
                onChange={(event) =>
                  setNuevo({ ...nuevo, rol: event.target.value as NuevoUsuario['rol'] })
                }
              >
                {roles.map((rol) => (
                  <option key={rol.codigo} value={rol.codigo}>
                    {rol.nombre}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn-primary w-full"
              onClick={() => void crear()}
              disabled={procesando || !nuevo.username || !nuevo.nombre_completo || !nuevo.password}
            >
              {procesando ? 'Guardando…' : 'Crear usuario'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
