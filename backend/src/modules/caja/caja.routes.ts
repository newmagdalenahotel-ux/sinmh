import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';

export const cajaRouter = Router();

cajaRouter.use(requireAuth);

type SesionCaja = {
  id: number;
  punto_venta_id: number;
  punto_venta: string;
  usuario_apertura_id: number;
  usuario_cierre_id: number | null;
  fecha_apertura: string;
  fecha_cierre: string | null;
  monto_apertura: string;
  monto_sistema_efectivo: string | null;
  monto_declarado: string | null;
  diferencia: string | null;
  autorizado_por_id: number | null;
  estado: 'ABIERTA' | 'CERRADA';
  notas: string | null;
};

async function obtenerSesionAbierta(): Promise<SesionCaja | null> {
  const { rows } = await db.query<SesionCaja>(
    `SELECT sc.*, pv.codigo AS punto_venta
     FROM sesion_caja sc
     JOIN punto_venta pv ON pv.id = sc.punto_venta_id
     WHERE pv.codigo = 'RECEPCION' AND sc.estado = 'ABIERTA'
     LIMIT 1`
  );
  return rows[0] ?? null;
}

async function calcularNeto(sesionId: number): Promise<number> {
  const { rows } = await db.query<{ neto: string }>(
    `SELECT COALESCE(SUM(
       CASE
         WHEN tipo IN ('VENTA_EFECTIVO', 'INGRESO', 'TRASLADO_ENTRADA', 'APORTE_PAGO', 'AJUSTE_SOBRANTE') THEN monto
         WHEN tipo IN ('GASTO_EFECTIVO', 'RETIRO', 'RETIRO_DUENO', 'TRASLADO_SALIDA', 'AJUSTE_FALTANTE') THEN -monto
         ELSE 0
       END
     ), 0) AS neto
     FROM movimiento_caja
     WHERE sesion_caja_id = $1`,
    [sesionId]
  );
  return Number(rows[0]?.neto ?? 0);
}

async function movimientosDe(sesionId: number) {
  const { rows } = await db.query(
    `SELECT id, tipo, monto, referencia_tipo, referencia_id, fecha, notas
     FROM movimiento_caja
     WHERE sesion_caja_id = $1
     ORDER BY fecha DESC
     LIMIT 100`,
    [sesionId]
  );
  return rows;
}

cajaRouter.get('/sesion-actual', async (_req, res) => {
  const sesion = await obtenerSesionAbierta();

  if (!sesion) {
    res.json({ sesion: null });
    return;
  }

  const neto = await calcularNeto(sesion.id);
  const efectivoEsperado = Number(sesion.monto_apertura) + neto;

  res.json({
    sesion: {
      ...sesion,
      efectivo_esperado: efectivoEsperado,
      movimientos: await movimientosDe(sesion.id),
    },
  });
});

const abrirSchema = z.object({
  monto_apertura: z.coerce.number().min(0),
  notas: z.string().trim().max(300).optional(),
});

cajaRouter.post('/sesiones', async (req, res) => {
  const parsed = abrirSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }

  const usuarioId = Number(req.user?.sub);
  if (!Number.isFinite(usuarioId)) {
    res.status(401).json({ error: 'Usuario inválido' });
    return;
  }

  const abierta = await obtenerSesionAbierta();
  if (abierta) {
    res.status(409).json({ error: 'Ya hay una caja abierta para recepción' });
    return;
  }

  const puntoVenta = await db.query<{ id: number }>(
    "SELECT id FROM punto_venta WHERE codigo = 'RECEPCION' LIMIT 1"
  );
  const puntoVentaId = puntoVenta.rows[0]?.id;
  if (!puntoVentaId) {
    res.status(500).json({ error: 'No está configurado el punto de venta de recepción' });
    return;
  }

  try {
    const { rows } = await db.query<SesionCaja>(
      `INSERT INTO sesion_caja
         (punto_venta_id, usuario_apertura_id, monto_apertura, notas)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [puntoVentaId, usuarioId, parsed.data.monto_apertura, parsed.data.notas ?? null]
    );

    res.status(201).json({
      sesion: {
        ...rows[0],
        punto_venta: 'RECEPCION',
        efectivo_esperado: parsed.data.monto_apertura,
        movimientos: [],
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'Ya hay una caja abierta para recepción' });
      return;
    }
    throw error;
  }
});

const cerrarSchema = z.object({
  monto_declarado: z.coerce.number().min(0),
  notas: z.string().trim().max(300).optional(),
});

cajaRouter.post('/sesiones/:id/cerrar', async (req, res) => {
  const sesionId = Number(req.params.id);
  if (!Number.isInteger(sesionId) || sesionId <= 0) {
    res.status(400).json({ error: 'Sesión inválida' });
    return;
  }

  const parsed = cerrarSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }

  const usuarioId = Number(req.user?.sub);
  if (!Number.isFinite(usuarioId)) {
    res.status(401).json({ error: 'Usuario inválido' });
    return;
  }

  const sesion = await db.query<SesionCaja>('SELECT * FROM sesion_caja WHERE id = $1', [sesionId]);
  const actual = sesion.rows[0];

  if (!actual) {
    res.status(404).json({ error: 'Sesión no encontrada' });
    return;
  }

  if (actual.estado !== 'ABIERTA') {
    res.status(409).json({ error: 'La sesión ya está cerrada' });
    return;
  }

  const neto = await calcularNeto(sesionId);
  const efectivoEsperado = Number(actual.monto_apertura) + neto;
  const diferencia = parsed.data.monto_declarado - efectivoEsperado;

  const { rows } = await db.query<SesionCaja>(
    `UPDATE sesion_caja
     SET usuario_cierre_id = $1,
         fecha_cierre = now(),
         monto_sistema_efectivo = $2,
         monto_declarado = $3,
         diferencia = $4,
         autorizado_por_id = $5,
         estado = 'CERRADA',
         notas = COALESCE($6, notas)
     WHERE id = $7
     RETURNING *`,
    [
      usuarioId,
      efectivoEsperado,
      parsed.data.monto_declarado,
      diferencia,
      diferencia !== 0 ? usuarioId : null,
      parsed.data.notas ?? null,
      sesionId,
    ]
  );

  res.json({ sesion: rows[0], efectivo_esperado: efectivoEsperado });
});

cajaRouter.get('/sesiones/:id', async (req, res) => {
  const sesionId = Number(req.params.id);
  if (!Number.isInteger(sesionId) || sesionId <= 0) {
    res.status(400).json({ error: 'Sesión inválida' });
    return;
  }

  const sesion = await db.query<SesionCaja>('SELECT * FROM sesion_caja WHERE id = $1', [sesionId]);
  const actual = sesion.rows[0];
  if (!actual) {
    res.status(404).json({ error: 'Sesión no encontrada' });
    return;
  }

  const neto = await calcularNeto(sesionId);
  res.json({
    sesion: {
      ...actual,
      efectivo_esperado: Number(actual.monto_apertura) + neto,
      movimientos: await movimientosDe(sesionId),
    },
  });
});
