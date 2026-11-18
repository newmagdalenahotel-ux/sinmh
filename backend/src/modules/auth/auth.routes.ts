import { Router } from 'express';
import { z } from 'zod';
import { signToken } from '../../lib/jwt.js';
import { requireAuth } from '../../middleware/auth.js';
import { validarCredenciales } from './auth.service.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }

  const { username, password } = parsed.data;
  const usuario = await validarCredenciales(username, password);

  if (!usuario) {
    res.status(401).json({ error: 'Credenciales inválidas' });
    return;
  }

  const token = signToken({
    sub: String(usuario.id),
    username: usuario.username,
    rol: usuario.rol,
  });

  res.json({
    token,
    usuario: {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre_completo,
      rol: usuario.rol,
    },
  });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ usuario: req.user });
});
