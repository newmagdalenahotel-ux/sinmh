import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';

export const habitacionesRouter = Router();

habitacionesRouter.use(requireAuth);

habitacionesRouter.get('/', async (_req, res) => {
  const { rows } = await db.query(
    `SELECT id, numero, tipo_uso, clima, capacidad_max, es_suite, piso, activo,
            estado_operativo, notas
     FROM habitacion
     ORDER BY piso, numero`
  );
  res.json({ habitaciones: rows });
});

habitacionesRouter.get('/tablero', async (_req, res) => {
  const { rows } = await db.query(
    `SELECT h.id, h.numero, h.piso, h.clima, h.capacidad_max, h.es_suite,
            h.estado_operativo,
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM reserva_habitacion rh
                JOIN reserva r ON r.id = rh.reserva_id
                WHERE rh.habitacion_id = h.id
                  AND rh.estado = 'CHECKIN'
                  AND r.estado = 'CHECKIN'
              ) THEN 'OCUPADA'
              WHEN h.estado_operativo IN ('SUCIA', 'MANTENIMIENTO') THEN h.estado_operativo
              WHEN EXISTS (
                SELECT 1
                FROM reserva_habitacion rh
                JOIN reserva r ON r.id = rh.reserva_id
                WHERE rh.habitacion_id = h.id
                  AND rh.estado = 'ACTIVA'
                  AND r.estado IN ('PENDIENTE', 'CONFIRMADA')
                  AND CURRENT_DATE BETWEEN rh.fecha_entrada AND rh.fecha_salida
              ) THEN 'RESERVADA'
              ELSE 'LIBRE'
            END AS estado
     FROM habitacion h
     WHERE h.activo = true AND h.tipo_uso = 'HABITACION'
     ORDER BY h.piso, h.numero`
  );

  res.json({ habitaciones: rows });
});

const estadoSchema = z.object({
  estado_operativo: z.enum(['LIMPIA', 'SUCIA', 'MANTENIMIENTO']),
});

habitacionesRouter.put('/:id/estado', async (req, res) => {
  const habitacionId = Number(req.params.id);
  if (!Number.isInteger(habitacionId) || habitacionId <= 0) {
    res.status(400).json({ error: 'Habitación inválida' });
    return;
  }

  const parsed = estadoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Estado inválido' });
    return;
  }

  const { rows } = await db.query(
    `UPDATE habitacion
     SET estado_operativo = $1, updated_at = now()
     WHERE id = $2
     RETURNING id, numero, estado_operativo`,
    [parsed.data.estado_operativo, habitacionId]
  );

  if (!rows[0]) {
    res.status(404).json({ error: 'Habitación no encontrada' });
    return;
  }

  res.json({ habitacion: rows[0] });
});
