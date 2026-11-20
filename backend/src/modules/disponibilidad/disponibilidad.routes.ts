import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';

export const disponibilidadRouter = Router();

disponibilidadRouter.use(requireAuth);

const consultaSchema = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pax: z.coerce.number().int().min(1).max(6),
});

disponibilidadRouter.get('/', async (req, res) => {
  const parsed = consultaSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Parámetros inválidos' });
    return;
  }

  const { desde, hasta, pax } = parsed.data;
  if (hasta <= desde) {
    res.status(400).json({ error: 'La fecha de salida debe ser posterior a la de entrada' });
    return;
  }

  const { rows } = await db.query<{ disponible: boolean }>(
    `SELECT h.id, h.numero, h.clima, h.capacidad_max, h.es_suite, h.piso, h.notas,
            h.estado_operativo, ha.pax AS permitido,
            CASE
              WHEN h.estado_operativo = 'MANTENIMIENTO' THEN 'MANTENIMIENTO'
              WHEN ha.pax IS NULL THEN 'SIN_ACOMODACION'
              WHEN EXISTS (
                SELECT 1
                FROM reserva_habitacion rh
                WHERE rh.habitacion_id = h.id
                  AND rh.estado IN ('ACTIVA', 'CHECKIN')
                  AND rh.fecha_entrada < $2::date
                  AND rh.fecha_salida > $1::date
              ) THEN 'OCUPADA'
              ELSE NULL
            END AS motivo,
            CASE
              WHEN h.estado_operativo = 'SUCIA' THEN 'LIMPIEZA'
              ELSE NULL
            END AS advertencia,
            (
              h.estado_operativo <> 'MANTENIMIENTO'
              AND ha.pax IS NULL
              AND h.capacidad_max >= $3
              AND NOT EXISTS (
                SELECT 1
                FROM reserva_habitacion rh
                WHERE rh.habitacion_id = h.id
                  AND rh.estado IN ('ACTIVA', 'CHECKIN')
                  AND rh.fecha_entrada < $2::date
                  AND rh.fecha_salida > $1::date
              )
            ) AS permite_autorizacion,
            (
              h.estado_operativo <> 'MANTENIMIENTO'
              AND ha.pax IS NOT NULL
              AND NOT EXISTS (
                SELECT 1
                FROM reserva_habitacion rh
                WHERE rh.habitacion_id = h.id
                  AND rh.estado IN ('ACTIVA', 'CHECKIN')
                  AND rh.fecha_entrada < $2::date
                  AND rh.fecha_salida > $1::date
              )
            ) AS disponible
     FROM habitacion h
     LEFT JOIN habitacion_acomodacion ha ON ha.habitacion_id = h.id AND ha.pax = $3
     WHERE h.activo = true
       AND h.tipo_uso = 'HABITACION'
     ORDER BY h.piso, h.numero`,
    [desde, hasta, pax]
  );

  res.json({
    desde,
    hasta,
    pax,
    total: rows.filter((habitacion) => habitacion.disponible).length,
    habitaciones: rows,
  });
});
