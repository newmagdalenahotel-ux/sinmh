import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

type UsuarioFila = {
  id: number;
  username: string;
  nombre_completo: string;
  email: string | null;
  activo: boolean;
  rol: string | null;
  created_at: string;
};

adminRouter.get('/usuarios', async (_req, res) => {
  const { rows } = await db.query<UsuarioFila>(
    `SELECT u.id, u.username, u.nombre_completo, u.email, u.activo,
            r.codigo AS rol, u.created_at
     FROM usuario u
     LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
     LEFT JOIN rol r ON r.id = ur.rol_id
     ORDER BY u.id`
  );
  res.json({ usuarios: rows });
});

adminRouter.get('/roles', async (_req, res) => {
  const { rows } = await db.query('SELECT id, codigo, nombre FROM rol ORDER BY id');
  res.json({ roles: rows });
});

const crearSchema = z.object({
  username: z.string().trim().min(3).max(60),
  nombre_completo: z.string().trim().min(2).max(150),
  email: z.string().trim().max(150).optional(),
  password: z.string().min(6).max(100),
  rol: z.enum(['ADMIN', 'GERENTE', 'RECEPCION', 'CAJERO']),
  activo: z.boolean().default(true),
});

adminRouter.post('/usuarios', async (req, res) => {
  const parsed = crearSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.issues });
    return;
  }

  const rol = await db.query<{ id: number }>('SELECT id FROM rol WHERE codigo = $1', [
    parsed.data.rol,
  ]);
  const rolId = rol.rows[0]?.id;
  if (!rolId) {
    res.status(400).json({ error: 'Rol inválido' });
    return;
  }

  try {
    const hash = await bcrypt.hash(parsed.data.password, 12);

    const resultado = await db.transaction(async (tx) => {
      const usuario = await tx.query<{ id: number }>(
        `INSERT INTO usuario (username, nombre_completo, email, password_hash, activo)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          parsed.data.username,
          parsed.data.nombre_completo,
          parsed.data.email ?? null,
          hash,
          parsed.data.activo,
        ]
      );

      const usuarioId = usuario.rows[0]?.id;
      if (!usuarioId) throw new Error('No se pudo crear el usuario');

      await tx.query('INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, $2)', [
        usuarioId,
        rolId,
      ]);

      return usuarioId;
    });

    res.status(201).json({
      usuario: {
        id: resultado,
        username: parsed.data.username,
        nombre_completo: parsed.data.nombre_completo,
        email: parsed.data.email ?? null,
        activo: parsed.data.activo,
        rol: parsed.data.rol,
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'Ese nombre de usuario ya existe' });
      return;
    }
    throw error;
  }
});

const actualizarSchema = z.object({
  nombre_completo: z.string().trim().min(2).max(150).optional(),
  email: z.string().trim().max(150).optional(),
  password: z.string().min(6).max(100).optional(),
  rol: z.enum(['ADMIN', 'GERENTE', 'RECEPCION', 'CAJERO']).optional(),
  activo: z.boolean().optional(),
});

adminRouter.put('/usuarios/:id', async (req, res) => {
  const usuarioId = Number(req.params.id);
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    res.status(400).json({ error: 'Usuario inválido' });
    return;
  }

  const parsed = actualizarSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }

  const actual = await db.query<UsuarioFila & { password_hash: string }>(
    `SELECT u.id, u.username, u.nombre_completo, u.email, u.activo,
            r.codigo AS rol, u.created_at, u.password_hash
     FROM usuario u
     LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
     LEFT JOIN rol r ON r.id = ur.rol_id
     WHERE u.id = $1`,
    [usuarioId]
  );

  const usuario = actual.rows[0];
  if (!usuario) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  if (usuarioId === Number(req.user?.sub) && parsed.data.activo === false) {
    res.status(400).json({ error: 'No puedes desactivar tu propio usuario' });
    return;
  }

  const hash = parsed.data.password
    ? await bcrypt.hash(parsed.data.password, 12)
    : usuario.password_hash;

  await db.transaction(async (tx) => {
    await tx.query(
      `UPDATE usuario
       SET nombre_completo = $1, email = $2, password_hash = $3, activo = $4, updated_at = now()
       WHERE id = $5`,
      [
        parsed.data.nombre_completo ?? usuario.nombre_completo,
        parsed.data.email ?? usuario.email,
        hash,
        parsed.data.activo ?? usuario.activo,
        usuarioId,
      ]
    );

    if (parsed.data.rol) {
      const rol = await tx.query<{ id: number }>('SELECT id FROM rol WHERE codigo = $1', [
        parsed.data.rol,
      ]);
      const rolId = rol.rows[0]?.id;
      if (!rolId) throw new Error('Rol inválido');

      await tx.query('DELETE FROM usuario_rol WHERE usuario_id = $1', [usuarioId]);
      await tx.query('INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, $2)', [
        usuarioId,
        rolId,
      ]);
    }
  });

  res.json({ ok: true });
});
