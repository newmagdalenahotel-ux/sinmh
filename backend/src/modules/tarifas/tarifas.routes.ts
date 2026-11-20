import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { cotizarHabitacion } from './tarifas.service.js';

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
  autorizacion_parcial: z.coerce.boolean().optional(),
});

tarifasRouter.get('/cotizar', async (req, res) => {
  const parsed = cotizarSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Parámetros inválidos' });
    return;
  }

  const { habitacion_id, pax, temporada, escenario, autorizacion_parcial } = parsed.data;
  const resultado = await cotizarHabitacion(
    habitacion_id,
    pax,
    temporada,
    escenario,
    autorizacion_parcial === true
  );

  if (!resultado.ok) {
    res.status(resultado.status).json({ error: resultado.error });
    return;
  }

  res.json(resultado.cotizacion);
});
