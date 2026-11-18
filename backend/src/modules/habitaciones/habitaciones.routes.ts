import { Router } from 'express';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';

export const habitacionesRouter = Router();

habitacionesRouter.use(requireAuth);

habitacionesRouter.get('/', async (_req, res) => {
  const { rows } = await db.query(
    `SELECT id, numero, tipo_uso, clima, capacidad_max, es_suite, piso, activo, notas
     FROM habitacion
     ORDER BY piso, numero`
  );
  res.json({ habitaciones: rows });
});
