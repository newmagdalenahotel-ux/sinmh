import bcrypt from 'bcryptjs';
import { db } from '../../db.js';

export type UsuarioLogin = {
  id: number;
  username: string;
  nombre_completo: string;
  password_hash: string;
  rol: string;
};

export async function buscarUsuario(username: string): Promise<UsuarioLogin | null> {
  const { rows } = await db.query<UsuarioLogin>(
    `SELECT u.id, u.username, u.nombre_completo, u.password_hash, r.codigo AS rol
     FROM usuario u
     JOIN usuario_rol ur ON ur.usuario_id = u.id
     JOIN rol r ON r.id = ur.rol_id
     WHERE u.username = $1 AND u.activo = true
     LIMIT 1`,
    [username]
  );
  return rows[0] ?? null;
}

export async function validarCredenciales(
  username: string,
  password: string
): Promise<UsuarioLogin | null> {
  const usuario = await buscarUsuario(username);
  if (!usuario) return null;

  const ok = await bcrypt.compare(password, usuario.password_hash);
  return ok ? usuario : null;
}
