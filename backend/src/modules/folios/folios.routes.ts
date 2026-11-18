import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';

export const foliosRouter = Router();

foliosRouter.use(requireAuth);

type FolioFila = {
  id: number;
  reserva_id: number;
  saldo: string;
  estado: string;
  fecha_apertura: string;
  fecha_cierre: string | null;
  codigo: string;
  fecha_entrada: string;
  fecha_salida: string;
  titular_cliente_id: number | null;
  habitacion: string;
  huesped: string | null;
};

type CargoFila = {
  id: number;
  fecha: string;
  concepto: string;
  cantidad: string;
  precio_unitario: string;
  monto: string;
};

type CobroFila = {
  id: number;
  fecha: string;
  monto: string;
  metodo_pago: string;
  tipo_documento: string;
  estado: string;
};

foliosRouter.get('/', async (_req, res) => {
  const { rows } = await db.query<FolioFila>(
    `SELECT f.id, f.reserva_id, f.saldo, f.estado, f.fecha_apertura, f.fecha_cierre,
            r.codigo, r.fecha_entrada, r.fecha_salida, r.titular_cliente_id,
            h.numero AS habitacion, hu.nombre_completo AS huesped
     FROM folio f
     JOIN reserva r ON r.id = f.reserva_id
     JOIN reserva_habitacion rh ON rh.reserva_id = r.id
     JOIN habitacion h ON h.id = rh.habitacion_id
     LEFT JOIN huesped hu ON hu.reserva_habitacion_id = rh.id AND hu.es_titular
     WHERE f.estado = 'ABIERTO'
     ORDER BY f.fecha_apertura DESC`
  );

  res.json({ folios: rows });
});

foliosRouter.get('/:id', async (req, res) => {
  const folioId = Number(req.params.id);
  if (!Number.isInteger(folioId) || folioId <= 0) {
    res.status(400).json({ error: 'Folio inválido' });
    return;
  }

  const consulta = await db.query<FolioFila>(
    `SELECT f.id, f.reserva_id, f.saldo, f.estado, f.fecha_apertura, f.fecha_cierre,
            r.codigo, r.fecha_entrada, r.fecha_salida, r.titular_cliente_id,
            h.numero AS habitacion, hu.nombre_completo AS huesped
     FROM folio f
     JOIN reserva r ON r.id = f.reserva_id
     JOIN reserva_habitacion rh ON rh.reserva_id = r.id
     JOIN habitacion h ON h.id = rh.habitacion_id
     LEFT JOIN huesped hu ON hu.reserva_habitacion_id = rh.id AND hu.es_titular
     WHERE f.id = $1`,
    [folioId]
  );

  const folio = consulta.rows[0];
  if (!folio) {
    res.status(404).json({ error: 'Folio no encontrado' });
    return;
  }

  const cargos = await db.query<CargoFila>(
    `SELECT id, fecha, concepto, cantidad, precio_unitario, monto
     FROM folio_cargo
     WHERE folio_id = $1 AND NOT anulado
     ORDER BY fecha`,
    [folioId]
  );

  const cobros = await db.query<CobroFila>(
    `SELECT id, fecha, monto, metodo_pago, tipo_documento, estado
     FROM cobro
     WHERE folio_id = $1
     ORDER BY fecha`,
    [folioId]
  );

  const totalCargos = cargos.rows.reduce((suma, cargo) => suma + Number(cargo.monto), 0);
  const totalCobros = cobros.rows
    .filter((cobro) => cobro.estado === 'ACTIVO')
    .reduce((suma, cobro) => suma + Number(cobro.monto), 0);

  res.json({
    folio,
    cargos: cargos.rows,
    cobros: cobros.rows,
    totales: {
      cargos: totalCargos,
      cobros: totalCobros,
      saldo: totalCargos - totalCobros,
    },
  });
});

const checkoutSchema = z.object({
  metodo_pago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO']).optional(),
  tipo_documento: z
    .enum(['NINGUNO', 'RECIBO_CAJA', 'FACTURA_ELECTRONICA'])
    .default('NINGUNO'),
  notas: z.string().trim().max(300).optional(),
});

foliosRouter.post('/:id/checkout', async (req, res) => {
  const folioId = Number(req.params.id);
  if (!Number.isInteger(folioId) || folioId <= 0) {
    res.status(400).json({ error: 'Folio inválido' });
    return;
  }

  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }

  const usuarioId = Number(req.user?.sub);
  if (!Number.isFinite(usuarioId)) {
    res.status(401).json({ error: 'Usuario inválido' });
    return;
  }

  const folioConsulta = await db.query<FolioFila>(
    `SELECT f.id, f.reserva_id, f.saldo, f.estado, f.fecha_apertura, f.fecha_cierre,
            r.codigo, r.fecha_entrada, r.fecha_salida, r.titular_cliente_id,
            h.numero AS habitacion, hu.nombre_completo AS huesped
     FROM folio f
     JOIN reserva r ON r.id = f.reserva_id
     JOIN reserva_habitacion rh ON rh.reserva_id = r.id
     JOIN habitacion h ON h.id = rh.habitacion_id
     LEFT JOIN huesped hu ON hu.reserva_habitacion_id = rh.id AND hu.es_titular
     WHERE f.id = $1`,
    [folioId]
  );

  const folio = folioConsulta.rows[0];
  if (!folio) {
    res.status(404).json({ error: 'Folio no encontrado' });
    return;
  }

  if (folio.estado !== 'ABIERTO') {
    res.status(409).json({ error: 'El folio ya está cerrado' });
    return;
  }

  const totalCargos = await db.query<{ total: string }>(
    `SELECT COALESCE(SUM(monto), 0) AS total
     FROM folio_cargo
     WHERE folio_id = $1 AND NOT anulado`,
    [folioId]
  );
  const totalCobros = await db.query<{ total: string }>(
    `SELECT COALESCE(SUM(monto), 0) AS total
     FROM cobro
     WHERE folio_id = $1 AND estado = 'ACTIVO'`,
    [folioId]
  );

  const cargos = Number(totalCargos.rows[0]?.total ?? 0);
  const cobros = Number(totalCobros.rows[0]?.total ?? 0);
  const saldo = Math.max(0, cargos - cobros);

  if (saldo > 0 && !parsed.data.metodo_pago) {
    res.status(400).json({ error: 'Falta el método de pago para cerrar el saldo' });
    return;
  }

  if (saldo > 0 && parsed.data.metodo_pago === 'CREDITO') {
    res.status(400).json({
      error: 'El check-out a crédito se implementa cuando esté el módulo de empresas',
    });
    return;
  }

  let sesionCajaId: number | null = null;

  if (saldo > 0 && parsed.data.metodo_pago === 'EFECTIVO') {
    const caja = await db.query<{ id: number }>(
      `SELECT sc.id
       FROM sesion_caja sc
       JOIN punto_venta pv ON pv.id = sc.punto_venta_id
       WHERE pv.codigo = 'RECEPCION' AND sc.estado = 'ABIERTA'
       LIMIT 1`
    );

    if (!caja.rows[0]) {
      res.status(409).json({
        error: 'No hay caja abierta. Abre la caja antes de cobrar en efectivo.',
      });
      return;
    }

    sesionCajaId = caja.rows[0].id;
  }

  const resultado = await db.transaction(async (tx) => {
    let cobroId: number | null = null;

    if (saldo > 0 && parsed.data.metodo_pago) {
      const cobro = await tx.query<{ id: number }>(
        `INSERT INTO cobro
           (folio_id, cliente_id, tipo_documento, monto, metodo_pago, sesion_caja_id, usuario_id, notas)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          folioId,
          folio.titular_cliente_id,
          parsed.data.tipo_documento,
          saldo,
          parsed.data.metodo_pago,
          sesionCajaId,
          usuarioId,
          parsed.data.notas ?? null,
        ]
      );
      cobroId = cobro.rows[0]?.id ?? null;

      if (cobroId && sesionCajaId !== null) {
        await tx.query(
          `INSERT INTO movimiento_caja
             (sesion_caja_id, tipo, monto, referencia_tipo, referencia_id, usuario_id)
           VALUES ($1, 'VENTA_EFECTIVO', $2, 'COBRO', $3, $4)`,
          [sesionCajaId, saldo, cobroId, usuarioId]
        );
      }
    }

    await tx.query(
      `UPDATE folio SET estado = 'CERRADO', fecha_cierre = now(), saldo = 0 WHERE id = $1`,
      [folioId]
    );
    await tx.query(
      `UPDATE reserva SET estado = 'CHECKOUT', saldo = 0 WHERE id = $1`,
      [folio.reserva_id]
    );
    await tx.query(
      `UPDATE reserva_habitacion SET estado = 'CHECKOUT' WHERE reserva_id = $1`,
      [folio.reserva_id]
    );
    await tx.query(
      `UPDATE huesped SET checkout_ts = now()
       WHERE reserva_habitacion_id IN (SELECT id FROM reserva_habitacion WHERE reserva_id = $1)`,
      [folio.reserva_id]
    );

    return {
      folio: { id: folioId, estado: 'CERRADO' },
      reserva: { id: folio.reserva_id, codigo: folio.codigo, estado: 'CHECKOUT' },
      cobro: cobroId
        ? {
            id: cobroId,
            monto: saldo,
            metodo_pago: parsed.data.metodo_pago,
            sesion_caja_id: sesionCajaId,
          }
        : null,
      totales: { cargos, cobros: cobros + (cobroId ? saldo : 0), saldo: 0 },
    };
  });

  res.json(resultado);
});
