import { Router } from 'express';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';

export const catalogosRouter = Router();

catalogosRouter.use(requireAuth);

catalogosRouter.get('/centros', async (_req, res) => {
  const { rows } = await db.query(
    'SELECT id, codigo, nombre, tipo FROM centro WHERE activo = true ORDER BY id'
  );
  res.json({ centros: rows });
});
