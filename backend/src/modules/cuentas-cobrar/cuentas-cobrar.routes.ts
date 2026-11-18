import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { registrarAsiento } from '../contabilidad/contabilidad.service.js';

export const cuentasCobrarRouter = Router();

cuentasCobrarRouter.use(requireAuth);

cuentasCobrarRouter.get('/', async (req, res) => {
  const parsed = z
    .object({
      estado: z.string().trim().max(20).optional(),
      cliente_id: z.coerce.number().int().positive().optional(),
    })
    .safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: 'Filtros inválidos' });
    return;
  }

  const filtros: string[] = [];
  const valores: unknown[] = [];

  if (parsed.data.estado) {
    valores.push(parsed.data.estado);
    filtros.push(`cc.estado = $${valores.length}`);
  }

  if (parsed.data.cliente_id) {
    valores.push(parsed.data.cliente_id);
    filtros.push(`cc.cliente_id = $${valores.length}`);
  }

  const where = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT cc.id, cc.cliente_id, c.razon_social AS cliente, c.tipo AS tipo_cliente,
            cc.folio_id, cc.monto_original, cc.saldo, cc.fecha_emision,
            cc.fecha_vencimiento, cc.estado, cc.notas
     FROM cuenta_cobrar cc
     JOIN cliente c ON c.id = cc.cliente_id
     ${where}
     ORDER BY cc.fecha_vencimiento NULLS LAST, cc.id`,
    valores
  );

  const total = rows.reduce<number>(
    (suma, fila) => suma + Number((fila as { saldo: string }).saldo),
    0
  );
  res.json({ cuentas: rows, total });
});

cuentasCobrarRouter.get('/:id', async (req, res) => {
  const cuentaId = Number(req.params.id);
  if (!Number.isInteger(cuentaId) || cuentaId <= 0) {
    res.status(400).json({ error: 'Cuenta inválida' });
    return;
  }

  const cuenta = await db.query(
    `SELECT cc.id, cc.cliente_id, c.razon_social AS cliente, c.tipo AS tipo_cliente,
            cc.folio_id, cc.monto_original, cc.saldo, cc.fecha_emision,
            cc.fecha_vencimiento, cc.estado, cc.notas
     FROM cuenta_cobrar cc
     JOIN cliente c ON c.id = cc.cliente_id
     WHERE cc.id = $1`,
    [cuentaId]
  );

  if (!cuenta.rows[0]) {
    res.status(404).json({ error: 'Cuenta no encontrada' });
    return;
  }

  const pagos = await db.query(
    `SELECT p.id, p.monto, p.fecha, p.notas, u.nombre_completo AS usuario
     FROM cuenta_cobrar_pago p
     LEFT JOIN usuario u ON u.id = p.usuario_id
     WHERE p.cuenta_cobrar_id = $1
     ORDER BY p.fecha DESC`,
    [cuentaId]
  );

  res.json({ cuenta: cuenta.rows[0], pagos: pagos.rows });
});

const abonoSchema = z.object({
  monto: z.coerce.number().positive(),
  metodo_pago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA']),
  tipo_documento: z
    .enum(['NINGUNO', 'RECIBO_CAJA', 'FACTURA_ELECTRONICA'])
    .default('NINGUNO'),
  notas: z.string().trim().max(300).optional(),
});

cuentasCobrarRouter.post('/:id/abonos', async (req, res) => {
  const cuentaId = Number(req.params.id);
  if (!Number.isInteger(cuentaId) || cuentaId <= 0) {
    res.status(400).json({ error: 'Cuenta inválida' });
    return;
  }

  const parsed = abonoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }

  const usuarioId = Number(req.user?.sub);
  if (!Number.isFinite(usuarioId)) {
    res.status(401).json({ error: 'Usuario inválido' });
    return;
  }

  const consulta = await db.query<{
    id: number;
    cliente_id: number;
    saldo: string;
    estado: string;
  }>('SELECT id, cliente_id, saldo, estado FROM cuenta_cobrar WHERE id = $1', [cuentaId]);

  const cuenta = consulta.rows[0];
  if (!cuenta) {
    res.status(404).json({ error: 'Cuenta no encontrada' });
    return;
  }

  if (cuenta.estado === 'PAGADA' || cuenta.estado === 'ANULADA') {
    res.status(409).json({ error: 'La cuenta ya está cerrada' });
    return;
  }

  const saldo = Number(cuenta.saldo);
  if (parsed.data.monto > saldo) {
    res.status(400).json({ error: 'El abono no puede superar el saldo' });
    return;
  }

  let sesionCajaId: number | null = null;
  if (parsed.data.metodo_pago === 'EFECTIVO') {
    const caja = await db.query<{ id: number }>(
      `SELECT sc.id
       FROM sesion_caja sc
       JOIN punto_venta pv ON pv.id = sc.punto_venta_id
       WHERE pv.codigo = 'RECEPCION' AND sc.estado = 'ABIERTA'
       LIMIT 1`
    );

    if (!caja.rows[0]) {
      res.status(409).json({ error: 'No hay caja abierta para recibir efectivo' });
      return;
    }

    sesionCajaId = caja.rows[0].id;
  }

  const nuevoSaldo = saldo - parsed.data.monto;
  const nuevoEstado = nuevoSaldo === 0 ? 'PAGADA' : 'PARCIAL';

  const resultado = await db.transaction(async (tx) => {
    const cobro = await tx.query<{ id: number }>(
      `INSERT INTO cobro
         (folio_id, cliente_id, tipo_documento, monto, metodo_pago, sesion_caja_id,
          usuario_id, notas, cuenta_cobrar_id)
       VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        cuenta.cliente_id,
        parsed.data.tipo_documento,
        parsed.data.monto,
        parsed.data.metodo_pago,
        sesionCajaId,
        usuarioId,
        parsed.data.notas ?? `Abono cuenta por cobrar #${cuentaId}`,
        cuentaId,
      ]
    );

    const cobroId = cobro.rows[0]?.id;
    if (!cobroId) throw new Error('No se pudo registrar el cobro');

    if (sesionCajaId !== null) {
      await tx.query(
        `INSERT INTO movimiento_caja
           (sesion_caja_id, tipo, monto, referencia_tipo, referencia_id, usuario_id)
         VALUES ($1, 'VENTA_EFECTIVO', $2, 'COBRO', $3, $4)`,
        [sesionCajaId, parsed.data.monto, cobroId, usuarioId]
      );
    }

    await tx.query(
      `INSERT INTO cuenta_cobrar_pago
         (cuenta_cobrar_id, cobro_id, monto, usuario_id, notas)
       VALUES ($1, $2, $3, $4, $5)`,
      [cuentaId, cobroId, parsed.data.monto, usuarioId, parsed.data.notas ?? null]
    );

    await tx.query(
      'UPDATE cuenta_cobrar SET saldo = $1, estado = $2 WHERE id = $3',
      [nuevoSaldo, nuevoEstado, cuentaId]
    );

    const cuentaPago = parsed.data.metodo_pago === 'EFECTIVO' ? '1101' : '1102';

    await registrarAsiento(tx, {
      descripcion: `Abono cuenta por cobrar #${cuentaId}`,
      origenTipo: 'ABONO_CXC',
      origenId: cobroId,
      usuarioId,
      lineas: [
        { cuenta: cuentaPago, debe: parsed.data.monto },
        { cuenta: '1103', haber: parsed.data.monto },
      ],
    });

    return { cobroId, saldo: nuevoSaldo, estado: nuevoEstado };
  });

  res.status(201).json({ abono: resultado });
});
