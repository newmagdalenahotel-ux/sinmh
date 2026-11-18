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
  cupo_credito: z.coerce.number().min(0).default(0),
  dias_credito: z.coerce.number().int().min(0).max(365).default(0),
});

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
            cupo_credito, dias_credito, activo
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
            cupo_credito, dias_credito, activo
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

  const { rows } = await db.query(
    `INSERT INTO cliente
       (tipo, razon_social, tipo_documento, numero_documento, telefono, email,
        cupo_credito, dias_credito)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, tipo, razon_social, tipo_documento, numero_documento, telefono,
               email, cupo_credito, dias_credito, activo`,
    [
      parsed.data.tipo,
      parsed.data.razon_social,
      parsed.data.tipo_documento ?? null,
      parsed.data.numero_documento ?? null,
      parsed.data.telefono ?? null,
      parsed.data.email ?? null,
      parsed.data.cupo_credito,
      parsed.data.dias_credito,
    ]
  );

  res.status(201).json({ cliente: rows[0] });
});

const actualizarSchema = clienteSchema.partial();

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
    cupo_credito: string;
    dias_credito: number;
  }>('SELECT * FROM cliente WHERE id = $1', [clienteId]);

  const cliente = actual.rows[0];
  if (!cliente) {
    res.status(404).json({ error: 'Cliente no encontrado' });
    return;
  }

  const { rows } = await db.query(
    `UPDATE cliente
     SET tipo = $1, razon_social = $2, tipo_documento = $3, numero_documento = $4,
         telefono = $5, email = $6, cupo_credito = $7, dias_credito = $8, updated_at = now()
     WHERE id = $9
     RETURNING id, tipo, razon_social, tipo_documento, numero_documento, telefono,
               email, cupo_credito, dias_credito, activo`,
    [
      parsed.data.tipo ?? cliente.tipo,
      parsed.data.razon_social ?? cliente.razon_social,
      parsed.data.tipo_documento ?? cliente.tipo_documento,
      parsed.data.numero_documento ?? cliente.numero_documento,
      parsed.data.telefono ?? cliente.telefono,
      parsed.data.email ?? cliente.email,
      parsed.data.cupo_credito ?? cliente.cupo_credito,
      parsed.data.dias_credito ?? cliente.dias_credito,
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
