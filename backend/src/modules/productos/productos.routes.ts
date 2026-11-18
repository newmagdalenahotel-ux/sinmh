import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';

export const productosRouter = Router();

productosRouter.use(requireAuth);

productosRouter.get('/', async (_req, res) => {
  const { rows } = await db.query(
    `SELECT id, codigo, nombre, categoria, precio_venta, costo, stock, stock_minimo, activo
     FROM producto
     ORDER BY nombre`
  );
  res.json({ productos: rows });
});

const productoSchema = z.object({
  codigo: z.string().trim().min(2).max(40),
  nombre: z.string().trim().min(2).max(150),
  categoria: z.string().trim().max(60).optional(),
  precio_venta: z.coerce.number().min(0),
  costo: z.coerce.number().min(0).default(0),
  stock: z.coerce.number().min(0).default(0),
  stock_minimo: z.coerce.number().min(0).default(0),
  activo: z.boolean().default(true),
});

productosRouter.post('/', async (req, res) => {
  const parsed = productoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.issues });
    return;
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO producto
         (codigo, nombre, categoria, precio_venta, costo, stock, stock_minimo, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, codigo, nombre, categoria, precio_venta, costo, stock, stock_minimo, activo`,
      [
        parsed.data.codigo,
        parsed.data.nombre,
        parsed.data.categoria ?? null,
        parsed.data.precio_venta,
        parsed.data.costo,
        parsed.data.stock,
        parsed.data.stock_minimo,
        parsed.data.activo,
      ]
    );
    res.status(201).json({ producto: rows[0] });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'Ese código de producto ya existe' });
      return;
    }
    throw error;
  }
});
