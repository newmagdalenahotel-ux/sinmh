import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';

export const tarifasRouter = Router();

tarifasRouter.use(requireAuth);

const filtroSchema = z.object({
  tipo_clima: z.enum(['AC', 'VENTILADOR']).optional(),
  temporada: z.enum(['BAJA', 'ALTA', 'UNICA']).optional(),
  acomodacion: z.coerce.number().int().min(1).max(6).optional(),
  escenario: z.enum(['NORMAL', 'A', 'B', 'C']).optional(),
});

tarifasRouter.get('/', async (req, res) => {
  const parsed = filtroSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Parámetros inválidos' });
    return;
  }

  const { tipo_clima, temporada, acomodacion, escenario } = parsed.data;
  const condiciones: string[] = [];
  const parametros: unknown[] = [];

  if (tipo_clima) {
    parametros.push(tipo_clima);
    condiciones.push(`t.tipo_clima = $${parametros.length}`);
  }
  if (temporada) {
    parametros.push(temporada);
    condiciones.push(`te.codigo = $${parametros.length}`);
  }
  if (acomodacion) {
    parametros.push(acomodacion);
    condiciones.push(`t.acomodacion = $${parametros.length}`);
  }
  if (escenario) {
    parametros.push(escenario);
    condiciones.push(`t.escenario = $${parametros.length}`);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  const { rows } = await db.query(
    `SELECT t.id, t.tipo_clima, te.codigo AS temporada, t.acomodacion, t.escenario, t.valor
     FROM tarifa t
     JOIN temporada te ON te.id = t.temporada_id
     ${where}
     ORDER BY t.tipo_clima, te.codigo, t.acomodacion, t.escenario`,
    parametros
  );

  res.json({ tarifas: rows });
});

const cotizarSchema = z.object({
  habitacion_id: z.coerce.number().int().positive(),
  pax: z.coerce.number().int().min(1).max(6),
  temporada: z.enum(['BAJA', 'ALTA']),
  escenario: z.enum(['NORMAL', 'A', 'B', 'C']).default('NORMAL'),
});

tarifasRouter.get('/cotizar', async (req, res) => {
  const parsed = cotizarSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Parámetros inválidos' });
    return;
  }

  const { habitacion_id, pax, temporada, escenario } = parsed.data;

  const consulta = await db.query<{
    id: number;
    numero: string;
    clima: 'AC' | 'VENTILADOR';
    es_suite: boolean;
    capacidad_max: number;
    permitido: number | null;
  }>(
    `SELECT h.id, h.numero, h.clima, h.es_suite, h.capacidad_max, ha.pax AS permitido
     FROM habitacion h
     LEFT JOIN habitacion_acomodacion ha ON ha.habitacion_id = h.id AND ha.pax = $2
     WHERE h.id = $1 AND h.activo = true AND h.tipo_uso = 'HABITACION'`,
    [habitacion_id, pax]
  );

  const habitacion = consulta.rows[0];
  if (!habitacion || habitacion.permitido === null) {
    res.status(400).json({ error: `La habitación no está disponible para ${pax} personas` });
    return;
  }

  const esSuitePremium = habitacion.es_suite && pax === 2;
  const acomodacion = esSuitePremium ? 6 : pax;
  const temporadaCodigo = habitacion.clima === 'VENTILADOR' ? 'UNICA' : temporada;
  const escenarioCodigo = habitacion.clima === 'VENTILADOR' ? 'NORMAL' : escenario;

  const tarifa = await db.query<{ valor: string }>(
    `SELECT t.valor
     FROM tarifa t
     JOIN temporada te ON te.id = t.temporada_id
     WHERE t.tipo_clima = $1 AND te.codigo = $2 AND t.acomodacion = $3 AND t.escenario = $4
     LIMIT 1`,
    [habitacion.clima, temporadaCodigo, acomodacion, escenarioCodigo]
  );

  if (!tarifa.rows[0]) {
    res.status(404).json({ error: 'No hay tarifa para esa combinación' });
    return;
  }

  res.json({
    habitacion: {
      id: habitacion.id,
      numero: habitacion.numero,
      clima: habitacion.clima,
      es_suite: habitacion.es_suite,
    },
    pax,
    acomodacion,
    temporada: temporadaCodigo,
    escenario: escenarioCodigo,
    es_suite_premium: esSuitePremium,
    precio: Number(tarifa.rows[0].valor),
  });
});
