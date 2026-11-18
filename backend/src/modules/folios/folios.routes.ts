import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { registrarAsiento } from '../contabilidad/contabilidad.service.js';

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

const centroCuenta: Record<string, string> = {
  ALOJAMIENTO: '4101',
  BAR_RECEPCION: '4102',
  BAR_TERRAZA: '4103',
  RESTAURANTE: '4104',
  EVENTOS: '4105',
  PISCINA_PASADIA: '4106',
  TOUR_REPRESA: '4107',
  LAVANDERIA: '4108',
};

const cargoSchema = z.object({
  concepto: z.string().trim().min(2).max(200),
  centro_codigo: z.string().trim().min(1),
  cantidad: z.coerce.number().positive().max(1000).default(1),
  precio_unitario: z.coerce.number().min(0).default(0),
  es_cortesia: z.boolean().default(false),
  motivo_cortesia: z.string().trim().max(300).optional(),
});

foliosRouter.post('/:id/cargos', async (req, res) => {
  const folioId = Number(req.params.id);
  if (!Number.isInteger(folioId) || folioId <= 0) {
    res.status(400).json({ error: 'Folio inválido' });
    return;
  }

  const parsed = cargoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.issues });
    return;
  }

  const usuarioId = Number(req.user?.sub);
  if (!Number.isFinite(usuarioId)) {
    res.status(401).json({ error: 'Usuario inválido' });
    return;
  }

  const folio = await db.query<{ id: number; saldo: string; estado: string }>(
    'SELECT id, saldo, estado FROM folio WHERE id = $1',
    [folioId]
  );

  const actual = folio.rows[0];
  if (!actual) {
    res.status(404).json({ error: 'Folio no encontrado' });
    return;
  }

  if (actual.estado !== 'ABIERTO') {
    res.status(409).json({ error: 'El folio está cerrado' });
    return;
  }

  const centro = await db.query<{ id: number; codigo: string; nombre: string }>(
    'SELECT id, codigo, nombre FROM centro WHERE codigo = $1 AND activo = true',
    [parsed.data.centro_codigo]
  );

  const centroActual = centro.rows[0];
  if (!centroActual) {
    res.status(400).json({ error: 'Centro inválido' });
    return;
  }

  const monto = parsed.data.es_cortesia
    ? 0
    : Math.round(parsed.data.cantidad * parsed.data.precio_unitario * 100) / 100;

  if (!parsed.data.es_cortesia && monto <= 0) {
    res.status(400).json({ error: 'El cargo debe tener un valor mayor a cero' });
    return;
  }

  const cuentaCodigo = centroCuenta[centroActual.codigo] ?? '4101';

  const resultado = await db.transaction(async (tx) => {
    const cargo = await tx.query<{ id: number }>(
      `INSERT INTO folio_cargo
         (folio_id, concepto, centro_id, cantidad, precio_unitario, monto,
          es_cortesia, autorizado_por_id, motivo_cortesia, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        folioId,
        parsed.data.concepto,
        centroActual.id,
        parsed.data.cantidad,
        parsed.data.precio_unitario,
        monto,
        parsed.data.es_cortesia,
        parsed.data.es_cortesia ? usuarioId : null,
        parsed.data.motivo_cortesia ?? null,
        usuarioId,
      ]
    );

    const cargoId = cargo.rows[0]?.id;
    if (!cargoId) throw new Error('No se pudo crear el cargo');

    if (monto > 0) {
      await registrarAsiento(tx, {
        descripcion: `Cargo manual folio ${folioId}`,
        origenTipo: 'CARGO_MANUAL',
        origenId: cargoId,
        usuarioId,
        lineas: [
          { cuenta: '1103', debe: monto, descripcion: parsed.data.concepto },
          {
            cuenta: cuentaCodigo,
            centro: centroActual.codigo,
            haber: monto,
            descripcion: parsed.data.concepto,
          },
        ],
      });
    }

    await tx.query('UPDATE folio SET saldo = saldo + $1 WHERE id = $2', [monto, folioId]);

    return {
      cargoId,
      folioId,
      monto,
      saldo: Number(actual.saldo) + monto,
      centro: centroActual.codigo,
    };
  });

  res.status(201).json({ cargo: resultado });
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

  const esCredito = saldo > 0 && parsed.data.metodo_pago === 'CREDITO';
  let clienteCredito:
    | { tipo: string; cupo_credito: string; dias_credito: number }
    | null = null;

  if (esCredito) {
    if (!folio.titular_cliente_id) {
      res.status(400).json({ error: 'El folio no tiene cliente para otorgar crédito' });
      return;
    }

    const cliente = await db.query<{
      tipo: string;
      cupo_credito: string;
      dias_credito: number;
    }>('SELECT tipo, cupo_credito, dias_credito FROM cliente WHERE id = $1', [
      folio.titular_cliente_id,
    ]);

    clienteCredito = cliente.rows[0] ?? null;

    if (!clienteCredito || !['EMPRESA', 'EMPLEADO', 'GRUPO_TRABAJO'].includes(clienteCredito.tipo)) {
      res.status(400).json({ error: 'El crédito es solo para empresa, empleado o grupo de trabajo' });
      return;
    }

    if (clienteCredito.tipo !== 'EMPRESA') {
      const cupo = Number(clienteCredito.cupo_credito);
      const usado = await db.query<{ total: string }>(
        `SELECT COALESCE(SUM(saldo), 0) AS total
         FROM cuenta_cobrar
         WHERE cliente_id = $1 AND estado IN ('PENDIENTE', 'PARCIAL', 'VENCIDA')`,
        [folio.titular_cliente_id]
      );

      if (cupo > 0 && Number(usado.rows[0]?.total ?? 0) + saldo > cupo) {
        res.status(400).json({ error: 'El saldo supera el cupo de crédito del cliente' });
        return;
      }
    }
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

    if (saldo > 0 && esCredito && clienteCredito) {
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + clienteCredito.dias_credito);

      await tx.query(
        `INSERT INTO cuenta_cobrar
           (cliente_id, folio_id, monto_original, saldo, fecha_emision,
            fecha_vencimiento, estado, notas)
         VALUES ($1, $2, $3, $3, CURRENT_DATE, $4, 'PENDIENTE', $5)`,
        [
          folio.titular_cliente_id,
          folioId,
          saldo,
          fechaVencimiento.toISOString().slice(0, 10),
          `Check-out ${folio.codigo}`,
        ]
      );
    } else if (saldo > 0 && parsed.data.metodo_pago) {
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

      if (cobroId && saldo > 0 && parsed.data.metodo_pago) {
        const cuentaPago = parsed.data.metodo_pago === 'EFECTIVO' ? '1101' : '1102';

        await registrarAsiento(tx, {
          descripcion: `Check-out ${folio.codigo}`,
          origenTipo: 'CHECKOUT_COBRO',
          origenId: cobroId,
          usuarioId,
          lineas: [
            { cuenta: cuentaPago, debe: saldo },
            { cuenta: '1103', haber: saldo },
          ],
        });
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
