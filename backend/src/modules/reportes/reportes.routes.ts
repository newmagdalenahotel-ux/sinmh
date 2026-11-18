import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';

export const reportesRouter = Router();

reportesRouter.use(requireAuth);

const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

reportesRouter.get('/ingresos', async (req, res) => {
  const parsed = z.object({ fecha: fechaSchema }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Fecha inválida' });
    return;
  }

  const { rows } = await db.query<{
    centro_codigo: string;
    centro: string;
    cuenta_codigo: string;
    cuenta: string;
    total: string;
  }>(
    `SELECT COALESCE(ce.codigo, 'SIN_CENTRO') AS centro_codigo,
            COALESCE(ce.nombre, 'Sin centro') AS centro,
            c.codigo AS cuenta_codigo,
            c.nombre AS cuenta,
            SUM(l.haber - l.debe) AS total
     FROM asiento_linea l
     JOIN asiento a ON a.id = l.asiento_id
     JOIN cuenta c ON c.id = l.cuenta_id
     LEFT JOIN centro ce ON ce.id = l.centro_id
     WHERE c.tipo = 'INGRESO' AND a.fecha::date = $1::date
     GROUP BY ce.codigo, ce.nombre, c.codigo, c.nombre
     ORDER BY total DESC`,
    [parsed.data.fecha]
  );

  const total = rows.reduce((suma, fila) => suma + Number(fila.total), 0);
  res.json({ fecha: parsed.data.fecha, total, detalle: rows });
});

reportesRouter.get('/ocupacion', async (_req, res) => {
  const { rows } = await db.query<{ total: string; ocupadas: string }>(
    `SELECT
       (SELECT COUNT(*) FROM habitacion WHERE activo = true AND tipo_uso = 'HABITACION') AS total,
       (SELECT COUNT(DISTINCT rh.habitacion_id)
        FROM reserva_habitacion rh
        JOIN reserva r ON r.id = rh.reserva_id
        WHERE r.estado = 'CHECKIN'
          AND CURRENT_DATE BETWEEN r.fecha_entrada AND r.fecha_salida) AS ocupadas`
  );

  const total = Number(rows[0]?.total ?? 0);
  const ocupadas = Number(rows[0]?.ocupadas ?? 0);
  const porcentaje = total > 0 ? Math.round((ocupadas / total) * 1000) / 10 : 0;

  res.json({ total, ocupadas, porcentaje });
});

reportesRouter.get('/libro', async (req, res) => {
  const parsed = z
    .object({ desde: fechaSchema, hasta: fechaSchema })
    .safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: 'Fechas inválidas' });
    return;
  }

  const { rows } = await db.query(
    `SELECT l.id, l.fecha, c.codigo AS cuenta_codigo, c.nombre AS cuenta,
            COALESCE(ce.codigo, 'SIN_CENTRO') AS centro, l.debe, l.haber,
            l.descripcion, l.origen_tipo
     FROM libro_movimiento l
     JOIN cuenta c ON c.id = l.cuenta_id
     LEFT JOIN centro ce ON ce.id = l.centro_id
     WHERE l.fecha::date BETWEEN $1::date AND $2::date
     ORDER BY l.fecha, l.id
     LIMIT 500`,
    [parsed.data.desde, parsed.data.hasta]
  );

  res.json({ desde: parsed.data.desde, hasta: parsed.data.hasta, movimientos: rows });
});

reportesRouter.get('/desayunos', async (req, res) => {  const parsed = z.object({ fecha: fechaSchema }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Fecha inválida' });
    return;
  }

  const { rows } = await db.query<{
    codigo: string;
    habitacion: string;
    huesped: string | null;
    modo: string;
    pax: string;
  }>(
    `SELECT r.codigo, h.numero AS habitacion, hu.nombre_completo AS huesped,
            r.desayuno_modo AS modo, r.desayunos_pax AS pax
     FROM reserva r
     JOIN reserva_habitacion rh ON rh.reserva_id = r.id
     JOIN habitacion h ON h.id = rh.habitacion_id
     LEFT JOIN huesped hu ON hu.reserva_habitacion_id = rh.id AND hu.es_titular
     WHERE r.estado IN ('CHECKIN', 'CHECKOUT')
       AND r.fecha_entrada <= $1::date
       AND r.fecha_salida >= $1::date
       AND r.desayuno_modo IN ('PAGADO', 'INCLUIDO')
     ORDER BY h.numero`,
    [parsed.data.fecha]
  );

  const total = rows.reduce((suma, fila) => suma + Number(fila.pax), 0);
  res.json({ fecha: parsed.data.fecha, total, habitaciones: rows });
});

reportesRouter.get('/resultado-centros', async (req, res) => {
  const parsed = z.object({ mes: z.string().regex(/^\d{4}-\d{2}$/) }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Mes inválido' });
    return;
  }

  const desde = `${parsed.data.mes}-01`;

  const { rows } = await db.query(
    `SELECT COALESCE(ce.codigo, 'SIN_CENTRO') AS centro_codigo,
            COALESCE(ce.nombre, 'Sin centro') AS centro,
            SUM(CASE WHEN c.tipo = 'INGRESO' THEN l.haber - l.debe ELSE 0 END) AS ingresos,
            SUM(CASE WHEN c.tipo IN ('COSTO', 'GASTO') THEN l.debe - l.haber ELSE 0 END) AS costos
     FROM asiento_linea l
     JOIN asiento a ON a.id = l.asiento_id
     JOIN cuenta c ON c.id = l.cuenta_id
     LEFT JOIN centro ce ON ce.id = l.centro_id
     WHERE a.fecha >= $1::date
       AND a.fecha < ($1::date + interval '1 month')
     GROUP BY ce.codigo, ce.nombre
     HAVING SUM(l.debe) <> 0 OR SUM(l.haber) <> 0
     ORDER BY ingresos DESC`,
    [desde]
  );

  res.json({ mes: parsed.data.mes, centros: rows });
});
