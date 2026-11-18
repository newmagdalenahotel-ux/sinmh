import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { registrarAsiento } from '../contabilidad/contabilidad.service.js';

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

async function obtenerSesionAbierta(puntoVentaCodigo = 'RECEPCION'): Promise<SesionCaja | null> {
  const { rows } = await db.query<SesionCaja>(
    `SELECT sc.*, pv.codigo AS punto_venta
     FROM sesion_caja sc
     JOIN punto_venta pv ON pv.id = sc.punto_venta_id
     WHERE pv.codigo = $1 AND sc.estado = 'ABIERTA'
     LIMIT 1`,
    [puntoVentaCodigo]
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

cajaRouter.get('/cuenta-socio', async (_req, res) => {
  const { rows } = await db.query(
    `SELECT cs.id, cs.tipo, cs.monto, cs.saldo_acumulado, cs.fecha, cs.descripcion,
            u.nombre_completo AS usuario
     FROM cuenta_socio cs
     LEFT JOIN usuario u ON u.id = cs.usuario_id
     ORDER BY cs.fecha DESC, cs.id DESC
     LIMIT 100`
  );

  res.json({
    saldo: rows.length > 0 ? Number((rows[0] as { saldo_acumulado: string }).saldo_acumulado) : 0,
    movimientos: rows,
  });
});

cajaRouter.get('/puntos-venta', async (_req, res) => {
  const { rows } = await db.query(
    `SELECT pv.id, pv.codigo, pv.nombre, c.codigo AS centro
     FROM punto_venta pv
     JOIN centro c ON c.id = pv.centro_id
     WHERE pv.activo = true
     ORDER BY pv.id`
  );
  res.json({ puntos_venta: rows });
});

cajaRouter.get('/sesiones-abiertas', async (_req, res) => {
  const { rows } = await db.query<SesionCaja>(
    `SELECT sc.*, pv.codigo AS punto_venta, pv.nombre AS punto_venta_nombre
     FROM sesion_caja sc
     JOIN punto_venta pv ON pv.id = sc.punto_venta_id
     WHERE sc.estado = 'ABIERTA'
     ORDER BY sc.fecha_apertura`
  );

  const sesiones = [];
  for (const sesion of rows) {
    const neto = await calcularNeto(sesion.id);
    sesiones.push({
      ...sesion,
      efectivo_esperado: Number(sesion.monto_apertura) + neto,
    });
  }

  res.json({ sesiones });
});

const trasladoSchema = z.object({
  sesion_origen_id: z.coerce.number().int().positive(),
  sesion_destino_id: z.coerce.number().int().positive(),
  monto: z.coerce.number().positive(),
  descripcion: z.string().trim().min(2).max(300),
});

cajaRouter.post('/traslados', async (req, res) => {
  const parsed = trasladoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }

  if (parsed.data.sesion_origen_id === parsed.data.sesion_destino_id) {
    res.status(400).json({ error: 'La caja de origen y destino deben ser diferentes' });
    return;
  }

  const usuarioId = Number(req.user?.sub);
  if (!Number.isFinite(usuarioId)) {
    res.status(401).json({ error: 'Usuario inválido' });
    return;
  }

  const sesiones = await db.query<{ id: number; estado: string; monto_apertura: string }>(
    'SELECT id, estado, monto_apertura FROM sesion_caja WHERE id = ANY($1::bigint[])',
    [[parsed.data.sesion_origen_id, parsed.data.sesion_destino_id]]
  );

  const origen = sesiones.rows.find((sesion) => sesion.id === parsed.data.sesion_origen_id);
  const destino = sesiones.rows.find((sesion) => sesion.id === parsed.data.sesion_destino_id);

  if (!origen || !destino) {
    res.status(404).json({ error: 'Una de las cajas no existe' });
    return;
  }

  if (origen.estado !== 'ABIERTA' || destino.estado !== 'ABIERTA') {
    res.status(409).json({ error: 'Las dos cajas deben estar abiertas' });
    return;
  }

  const netoOrigen = await calcularNeto(origen.id);
  const disponible = Number(origen.monto_apertura) + netoOrigen;
  if (disponible < parsed.data.monto) {
    res.status(400).json({ error: 'La caja de origen no tiene efectivo suficiente' });
    return;
  }

  const resultado = await db.transaction(async (tx) => {
    const salida = await tx.query<{ id: number }>(
      `INSERT INTO movimiento_caja
         (sesion_caja_id, tipo, monto, referencia_tipo, usuario_id, notas,
          contraparte_sesion_id)
       VALUES ($1, 'TRASLADO_SALIDA', $2, 'TRASLADO', $3, $4, $5)
       RETURNING id`,
      [
        origen.id,
        parsed.data.monto,
        usuarioId,
        parsed.data.descripcion,
        destino.id,
      ]
    );

    const entrada = await tx.query<{ id: number }>(
      `INSERT INTO movimiento_caja
         (sesion_caja_id, tipo, monto, referencia_tipo, usuario_id, notas,
          contraparte_sesion_id, contraparte_movimiento_id)
       VALUES ($1, 'TRASLADO_ENTRADA', $2, 'TRASLADO', $3, $4, $5, $6)
       RETURNING id`,
      [
        destino.id,
        parsed.data.monto,
        usuarioId,
        parsed.data.descripcion,
        origen.id,
        salida.rows[0]?.id ?? null,
      ]
    );

    await tx.query(
      'UPDATE movimiento_caja SET contraparte_movimiento_id = $1 WHERE id = $2',
      [entrada.rows[0]?.id ?? null, salida.rows[0]?.id ?? null]
    );

    return { salida: salida.rows[0]?.id, entrada: entrada.rows[0]?.id };
  });

  res.status(201).json({ traslado: resultado });
});

const cambioTurnoSchema = z.object({
  monto_declarado: z.coerce.number().min(0),
  notas: z.string().trim().max(300).optional(),
});

cajaRouter.post('/sesiones/:id/cambio-turno', async (req, res) => {
  const sesionId = Number(req.params.id);
  if (!Number.isInteger(sesionId) || sesionId <= 0) {
    res.status(400).json({ error: 'Sesión inválida' });
    return;
  }

  const parsed = cambioTurnoSchema.safeParse(req.body);
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
  if (!actual || actual.estado !== 'ABIERTA') {
    res.status(409).json({ error: 'La caja no está abierta' });
    return;
  }

  const neto = await calcularNeto(sesionId);
  const efectivoEsperado = Number(actual.monto_apertura) + neto;
  const diferencia = parsed.data.monto_declarado - efectivoEsperado;

  const resultado = await db.transaction(async (tx) => {
    const cierre = await tx.query<SesionCaja>(
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

    const nueva = await tx.query<SesionCaja>(
      `INSERT INTO sesion_caja
         (punto_venta_id, usuario_apertura_id, monto_apertura, notas)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        actual.punto_venta_id,
        usuarioId,
        parsed.data.monto_declarado,
        `Cambio de turno. Entrega sesión #${sesionId}`,
      ]
    );

    return { cierre: cierre.rows[0], nueva: nueva.rows[0] };
  });

  res.json({ ...resultado, efectivo_esperado: efectivoEsperado, diferencia });
});

const movimientoSchema = z.object({
  tipo: z.enum([
    'GASTO_EFECTIVO',
    'RETIRO_DUENO',
    'APORTE',
    'AJUSTE_FALTANTE',
    'AJUSTE_SOBRANTE',
  ]),
  monto: z.coerce.number().positive(),
  descripcion: z.string().trim().min(2).max(300),
  cuenta_codigo: z.string().trim().max(20).optional(),
  soporte_url: z.string().trim().max(500).optional(),
});

cajaRouter.post('/movimientos', async (req, res) => {
  const parsed = movimientoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.issues });
    return;
  }

  const usuarioId = Number(req.user?.sub);
  if (!Number.isFinite(usuarioId)) {
    res.status(401).json({ error: 'Usuario inválido' });
    return;
  }

  const sesion = await obtenerSesionAbierta();
  if (!sesion) {
    res.status(409).json({ error: 'No hay caja abierta' });
    return;
  }

  let tipoMovimiento = parsed.data.tipo === 'APORTE' ? 'INGRESO' : parsed.data.tipo;
  let lineas: Array<{ cuenta: string; debe?: number; haber?: number; descripcion?: string }>;

  if (parsed.data.tipo === 'GASTO_EFECTIVO') {
    const cuentaCodigo = parsed.data.cuenta_codigo ?? '6105';
    const cuenta = await db.query<{ codigo: string }>(
      "SELECT codigo FROM cuenta WHERE codigo = $1 AND tipo = 'GASTO'",
      [cuentaCodigo]
    );

    if (!cuenta.rows[0]) {
      res.status(400).json({ error: 'Cuenta de gasto inválida' });
      return;
    }

    lineas = [
      { cuenta: cuentaCodigo, debe: parsed.data.monto },
      { cuenta: '1101', haber: parsed.data.monto },
    ];
  } else if (parsed.data.tipo === 'RETIRO_DUENO') {
    lineas = [
      { cuenta: '3102', debe: parsed.data.monto },
      { cuenta: '1101', haber: parsed.data.monto },
    ];
  } else if (parsed.data.tipo === 'APORTE') {
    lineas = [
      { cuenta: '1101', debe: parsed.data.monto },
      { cuenta: '3101', haber: parsed.data.monto },
    ];
  } else if (parsed.data.tipo === 'AJUSTE_FALTANTE') {
    lineas = [
      { cuenta: '6107', debe: parsed.data.monto },
      { cuenta: '1101', haber: parsed.data.monto },
    ];
  } else {
    lineas = [
      { cuenta: '1101', debe: parsed.data.monto },
      { cuenta: '4109', haber: parsed.data.monto },
    ];
  }

  const movimiento = await db.transaction(async (tx) => {
    const creado = await tx.query<{ id: number }>(
      `INSERT INTO movimiento_caja
         (sesion_caja_id, tipo, monto, referencia_tipo, usuario_id, notas,
          autorizado_por_id, soporte_url)
       VALUES ($1, $2, $3, 'MOVIMIENTO', $4, $5, $4, $6)
       RETURNING id`,
      [
        sesion.id,
        tipoMovimiento,
        parsed.data.monto,
        usuarioId,
        parsed.data.descripcion,
        parsed.data.soporte_url ?? null,
      ]
    );

    const movimientoId = creado.rows[0]?.id;
    if (!movimientoId) throw new Error('No se pudo crear el movimiento');

    if (parsed.data.tipo === 'APORTE' || parsed.data.tipo === 'RETIRO_DUENO') {
      const anterior = await tx.query<{ saldo_acumulado: string }>(
        'SELECT saldo_acumulado FROM cuenta_socio ORDER BY id DESC LIMIT 1'
      );
      const saldoAnterior = Number(anterior.rows[0]?.saldo_acumulado ?? 0);
      const nuevoSaldo =
        parsed.data.tipo === 'APORTE'
          ? saldoAnterior + parsed.data.monto
          : saldoAnterior - parsed.data.monto;

      await tx.query(
        `INSERT INTO cuenta_socio
           (tipo, monto, saldo_acumulado, descripcion, movimiento_caja_id, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          parsed.data.tipo === 'APORTE' ? 'APORTE' : 'RETIRO',
          parsed.data.monto,
          nuevoSaldo,
          parsed.data.descripcion,
          movimientoId,
          usuarioId,
        ]
      );
    }

    await registrarAsiento(tx, {
      descripcion: parsed.data.descripcion,
      origenTipo: 'MOVIMIENTO_CAJA',
      origenId: movimientoId,
      usuarioId,
      lineas,
    });

    return movimientoId;
  });

  const neto = await calcularNeto(sesion.id);
  res.status(201).json({
    movimiento: { id: movimiento, tipo: tipoMovimiento, monto: parsed.data.monto },
    efectivo_esperado: Number(sesion.monto_apertura) + neto,
  });
});

const abrirSchema = z.object({
  monto_apertura: z.coerce.number().min(0),
  punto_venta_codigo: z.string().trim().max(40).default('RECEPCION'),
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

  const abierta = await obtenerSesionAbierta(parsed.data.punto_venta_codigo);
  if (abierta) {
    res.status(409).json({ error: `Ya hay una caja abierta para ${parsed.data.punto_venta_codigo}` });
    return;
  }

  const puntoVenta = await db.query<{ id: number; codigo: string }>(
    'SELECT id, codigo FROM punto_venta WHERE codigo = $1 LIMIT 1',
    [parsed.data.punto_venta_codigo]
  );
  const puntoVentaActual = puntoVenta.rows[0];
  if (!puntoVentaActual) {
    res.status(400).json({ error: 'Punto de venta inválido' });
    return;
  }

  try {
    const { rows } = await db.query<SesionCaja>(
      `INSERT INTO sesion_caja
         (punto_venta_id, usuario_apertura_id, monto_apertura, notas)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [puntoVentaActual.id, usuarioId, parsed.data.monto_apertura, parsed.data.notas ?? null]
    );

    res.status(201).json({
      sesion: {
        ...rows[0],
        punto_venta: puntoVentaActual.codigo,
        efectivo_esperado: parsed.data.monto_apertura,
        movimientos: [],
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ error: `Ya hay una caja abierta para ${puntoVentaActual.codigo}` });
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
