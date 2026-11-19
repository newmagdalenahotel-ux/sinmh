import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';

export const clientesRouter = Router();

clientesRouter.use(requireAuth);

const clienteSchema = z.object({
  tipo: z.enum(['PARTICULAR', 'EMPRESA', 'EMPLEADO', 'GRUPO_TRABAJO', 'SOCIO']),
  razon_social: z.string().trim().min(2).max(200),
  tipo_documento: z.string().trim().max(10).optional(),
  numero_documento: z.string().trim().max(30).optional(),
  telefono: z.string().trim().max(40).optional(),
  email: z.string().trim().max(150).optional(),
  direccion: z.string().trim().max(200).optional(),
  ciudad: z.string().trim().max(100).optional(),
  notas: z.string().trim().max(500).optional(),
  cupo_credito: z.coerce.number().min(0).default(0),
  dias_credito: z.coerce.number().int().min(0).max(365).default(0),
  tarifa_plan: z.enum(['PUBLICA', 'EMPRESA', 'EMPLEADO', 'GRUPO']).default('PUBLICA'),
  tarifa_precio_noche: z.coerce.number().min(0).optional(),
  tarifa_desayuno_incluido: z.boolean().default(false),
  tarifa_vigente_desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tarifa_vigente_hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function validarTarifa(
  plan: string,
  precio: number | undefined,
  desde: string | undefined,
  hasta: string | undefined
): string | null {
  if (plan !== 'PUBLICA' && (!precio || precio <= 0)) {
    return 'La tarifa negociada debe ser mayor a cero';
  }

  if (desde && hasta && hasta <= desde) {
    return 'La vigencia de la tarifa debe terminar después de iniciar';
  }

  return null;
}

function fechaTexto(valor: unknown): string | undefined {
  if (!valor) return undefined;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor).slice(0, 10);
}

clientesRouter.get('/', async (req, res) => {
  const parsed = z
    .object({
      buscar: z.string().trim().max(80).optional(),
      tipo: z.string().trim().max(20).optional(),
    })
    .safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: 'Filtros inválidos' });
    return;
  }

  const filtros = ['activo = true'];
  const valores: unknown[] = [];

  if (parsed.data.buscar) {
    valores.push(`%${parsed.data.buscar}%`);
    filtros.push(
      `(razon_social ILIKE $${valores.length} OR numero_documento ILIKE $${valores.length})`
    );
  }

  if (parsed.data.tipo) {
    valores.push(parsed.data.tipo);
    filtros.push(`tipo = $${valores.length}`);
  }

  const { rows } = await db.query(
    `SELECT id, tipo, razon_social, tipo_documento, numero_documento, telefono, email,
            direccion, ciudad, notas, cupo_credito, dias_credito,
            tarifa_plan, tarifa_precio_noche, tarifa_desayuno_incluido,
            tarifa_vigente_desde, tarifa_vigente_hasta, activo
     FROM cliente
     WHERE ${filtros.join(' AND ')}
     ORDER BY razon_social
     LIMIT 200`,
    valores
  );

  res.json({ clientes: rows });
});

clientesRouter.get('/:id', async (req, res) => {
  const clienteId = Number(req.params.id);
  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    res.status(400).json({ error: 'Cliente inválido' });
    return;
  }

  const { rows } = await db.query(
    `SELECT id, tipo, razon_social, tipo_documento, numero_documento, telefono, email,
            direccion, ciudad, notas, cupo_credito, dias_credito,
            tarifa_plan, tarifa_precio_noche, tarifa_desayuno_incluido,
            tarifa_vigente_desde, tarifa_vigente_hasta, activo
     FROM cliente WHERE id = $1`,
    [clienteId]
  );

  if (!rows[0]) {
    res.status(404).json({ error: 'Cliente no encontrado' });
    return;
  }

  res.json({ cliente: rows[0] });
});

clientesRouter.post('/', async (req, res) => {
  const parsed = clienteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.issues });
    return;
  }

  const errorTarifa = validarTarifa(
    parsed.data.tarifa_plan,
    parsed.data.tarifa_precio_noche,
    parsed.data.tarifa_vigente_desde,
    parsed.data.tarifa_vigente_hasta
  );
  if (errorTarifa) {
    res.status(400).json({ error: errorTarifa });
    return;
  }

  const { rows } = await db.query(
    `INSERT INTO cliente
       (tipo, razon_social, tipo_documento, numero_documento, telefono, email,
        direccion, ciudad, notas, cupo_credito, dias_credito,
        tarifa_plan, tarifa_precio_noche, tarifa_desayuno_incluido,
        tarifa_vigente_desde, tarifa_vigente_hasta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::date, $16::date)
     RETURNING id, tipo, razon_social, tipo_documento, numero_documento, telefono,
               email, direccion, ciudad, notas, cupo_credito, dias_credito,
               tarifa_plan, tarifa_precio_noche, tarifa_desayuno_incluido,
               tarifa_vigente_desde, tarifa_vigente_hasta, activo`,
    [
      parsed.data.tipo,
      parsed.data.razon_social,
      parsed.data.tipo_documento ?? null,
      parsed.data.numero_documento ?? null,
      parsed.data.telefono ?? null,
      parsed.data.email ?? null,
      parsed.data.direccion ?? null,
      parsed.data.ciudad ?? null,
      parsed.data.notas ?? null,
      parsed.data.cupo_credito,
      parsed.data.dias_credito,
      parsed.data.tarifa_plan,
      parsed.data.tarifa_precio_noche ?? null,
      parsed.data.tarifa_desayuno_incluido,
      parsed.data.tarifa_vigente_desde ?? null,
      parsed.data.tarifa_vigente_hasta ?? null,
    ]
  );

  res.status(201).json({ cliente: rows[0] });
});

const actualizarSchema = z.object({
  tipo: z.enum(['PARTICULAR', 'EMPRESA', 'EMPLEADO', 'GRUPO_TRABAJO', 'SOCIO']).optional(),
  razon_social: z.string().trim().min(2).max(200).optional(),
  tipo_documento: z.string().trim().max(10).optional(),
  numero_documento: z.string().trim().max(30).optional(),
  telefono: z.string().trim().max(40).optional(),
  email: z.string().trim().max(150).optional(),
  direccion: z.string().trim().max(200).optional(),
  ciudad: z.string().trim().max(100).optional(),
  notas: z.string().trim().max(500).optional(),
  cupo_credito: z.coerce.number().min(0).optional(),
  dias_credito: z.coerce.number().int().min(0).max(365).optional(),
  tarifa_plan: z.enum(['PUBLICA', 'EMPRESA', 'EMPLEADO', 'GRUPO']).optional(),
  tarifa_precio_noche: z.coerce.number().min(0).optional(),
  tarifa_desayuno_incluido: z.boolean().optional(),
  tarifa_vigente_desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tarifa_vigente_hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

clientesRouter.put('/:id', async (req, res) => {
  const clienteId = Number(req.params.id);
  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    res.status(400).json({ error: 'Cliente inválido' });
    return;
  }

  const parsed = actualizarSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }

  const actual = await db.query<{
    tipo: string;
    razon_social: string;
    tipo_documento: string | null;
    numero_documento: string | null;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    ciudad: string | null;
    notas: string | null;
    cupo_credito: string;
    dias_credito: number;
    tarifa_plan: string;
    tarifa_precio_noche: string | null;
    tarifa_desayuno_incluido: boolean;
    tarifa_vigente_desde: unknown;
    tarifa_vigente_hasta: unknown;
  }>('SELECT * FROM cliente WHERE id = $1', [clienteId]);

  const cliente = actual.rows[0];
  if (!cliente) {
    res.status(404).json({ error: 'Cliente no encontrado' });
    return;
  }

  const plan = parsed.data.tarifa_plan ?? cliente.tarifa_plan;
  const precio =
    parsed.data.tarifa_precio_noche ??
    (cliente.tarifa_precio_noche ? Number(cliente.tarifa_precio_noche) : undefined);
  const desde = parsed.data.tarifa_vigente_desde ?? fechaTexto(cliente.tarifa_vigente_desde);
  const hasta = parsed.data.tarifa_vigente_hasta ?? fechaTexto(cliente.tarifa_vigente_hasta);

  const errorTarifa = validarTarifa(plan, precio, desde, hasta);
  if (errorTarifa) {
    res.status(400).json({ error: errorTarifa });
    return;
  }

  const { rows } = await db.query(
    `UPDATE cliente
     SET tipo = $1, razon_social = $2, tipo_documento = $3, numero_documento = $4,
         telefono = $5, email = $6, direccion = $7, ciudad = $8, notas = $9,
         cupo_credito = $10, dias_credito = $11, tarifa_plan = $12,
         tarifa_precio_noche = $13, tarifa_desayuno_incluido = $14,
         tarifa_vigente_desde = $15::date, tarifa_vigente_hasta = $16::date,
         updated_at = now()
     WHERE id = $17
     RETURNING id, tipo, razon_social, tipo_documento, numero_documento, telefono,
               email, direccion, ciudad, notas, cupo_credito, dias_credito,
               tarifa_plan, tarifa_precio_noche, tarifa_desayuno_incluido,
               tarifa_vigente_desde, tarifa_vigente_hasta, activo`,
    [
      parsed.data.tipo ?? cliente.tipo,
      parsed.data.razon_social ?? cliente.razon_social,
      parsed.data.tipo_documento ?? cliente.tipo_documento,
      parsed.data.numero_documento ?? cliente.numero_documento,
      parsed.data.telefono ?? cliente.telefono,
      parsed.data.email ?? cliente.email,
      parsed.data.direccion ?? cliente.direccion,
      parsed.data.ciudad ?? cliente.ciudad,
      parsed.data.notas ?? cliente.notas,
      parsed.data.cupo_credito ?? cliente.cupo_credito,
      parsed.data.dias_credito ?? cliente.dias_credito,
      plan,
      precio ?? null,
      parsed.data.tarifa_desayuno_incluido ?? cliente.tarifa_desayuno_incluido,
      desde ?? null,
      hasta ?? null,
      clienteId,
    ]
  );

  res.json({ cliente: rows[0] });
});

clientesRouter.delete('/:id', async (req, res) => {
  const clienteId = Number(req.params.id);
  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    res.status(400).json({ error: 'Cliente inválido' });
    return;
  }

  await db.query('UPDATE cliente SET activo = false, updated_at = now() WHERE id = $1', [
    clienteId,
  ]);
  res.json({ ok: true });
});
