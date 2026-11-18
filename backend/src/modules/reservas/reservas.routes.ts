import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { registrarAsiento } from '../contabilidad/contabilidad.service.js';
import { cotizarHabitacion } from '../tarifas/tarifas.service.js';

export const reservasRouter = Router();

reservasRouter.use(requireAuth);

const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const clienteSchema = z.object({
  nombre: z.string().trim().min(2),
  tipo_documento: z.string().trim().max(10).optional(),
  numero_documento: z.string().trim().max(30).optional(),
  telefono: z.string().trim().max(40).optional(),
  email: z.string().trim().max(150).optional(),
});

function calcularNoches(desde: string, hasta: string): number {
  const a = Date.UTC(Number(desde.slice(0, 4)), Number(desde.slice(5, 7)) - 1, Number(desde.slice(8, 10)));
  const b = Date.UTC(Number(hasta.slice(0, 4)), Number(hasta.slice(5, 7)) - 1, Number(hasta.slice(8, 10)));
  return Math.round((b - a) / 86_400_000);
}

function fechaTexto(valor: unknown): string {
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor).slice(0, 10);
}

async function habitacionDisponible(
  habitacionId: number,
  desde: string,
  hasta: string,
  excluirReservaHabitacionId?: number
): Promise<boolean> {
  const { rows } = await db.query<{ id: number }>(
    `SELECT rh.id
     FROM reserva_habitacion rh
     WHERE rh.habitacion_id = $1
       AND rh.estado IN ('ACTIVA', 'CHECKIN')
       AND rh.fecha_entrada < $3::date
       AND rh.fecha_salida > $2::date
       AND ($4::bigint IS NULL OR rh.id <> $4::bigint)
     LIMIT 1`,
    [habitacionId, desde, hasta, excluirReservaHabitacionId ?? null]
  );
  return rows.length === 0;
}

reservasRouter.get('/', async (req, res) => {
  const parsed = z
    .object({
      estado: z.string().trim().max(20).optional(),
      buscar: z.string().trim().max(80).optional(),
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
    filtros.push(`r.estado = $${valores.length}`);
  }

  if (parsed.data.buscar) {
    valores.push(`%${parsed.data.buscar}%`);
    filtros.push(
      `(r.codigo ILIKE $${valores.length} OR c.razon_social ILIKE $${valores.length} OR c.numero_documento ILIKE $${valores.length})`
    );
  }

  const where = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT r.id, r.codigo, r.estado, r.fecha_entrada, r.fecha_salida,
            r.total, r.saldo, r.desayuno_modo, r.desayunos_total,
            r.temporada, r.escenario,
            c.razon_social AS cliente, c.numero_documento,
            rh.id AS reserva_habitacion_id, rh.pax, rh.precio_noche,
            h.id AS habitacion_id, h.numero AS habitacion
     FROM reserva r
     JOIN reserva_habitacion rh ON rh.reserva_id = r.id
     JOIN habitacion h ON h.id = rh.habitacion_id
     LEFT JOIN cliente c ON c.id = r.titular_cliente_id
     ${where}
     ORDER BY r.fecha_entrada DESC, r.id DESC
     LIMIT 200`,
    valores
  );

  res.json({ reservas: rows });
});

reservasRouter.get('/:id', async (req, res) => {
  const reservaId = Number(req.params.id);
  if (!Number.isInteger(reservaId) || reservaId <= 0) {
    res.status(400).json({ error: 'Reserva inválida' });
    return;
  }

  const { rows } = await db.query(
    `SELECT r.id, r.codigo, r.estado, r.fecha_entrada, r.fecha_salida,
            r.modalidad, r.total, r.saldo, r.notas,
            r.incluye_desayuno, r.desayuno_modo, r.desayunos_pax, r.desayunos_total,
            r.total_desayuno, r.temporada, r.escenario,
            rh.id AS reserva_habitacion_id, rh.pax, rh.precio_noche, rh.estado AS rh_estado,
            h.id AS habitacion_id, h.numero AS habitacion, h.clima,
            c.id AS cliente_id, c.razon_social AS cliente, c.tipo_documento, c.numero_documento,
            c.telefono, c.email
     FROM reserva r
     JOIN reserva_habitacion rh ON rh.reserva_id = r.id
     JOIN habitacion h ON h.id = rh.habitacion_id
     LEFT JOIN cliente c ON c.id = r.titular_cliente_id
     WHERE r.id = $1`,
    [reservaId]
  );

  if (!rows[0]) {
    res.status(404).json({ error: 'Reserva no encontrada' });
    return;
  }

  res.json({ reserva: rows[0] });
});

const crearSchema = z.object({
  habitacion_id: z.coerce.number().int().positive(),
  pax: z.coerce.number().int().min(1).max(6),
  fecha_entrada: fechaSchema,
  fecha_salida: fechaSchema,
  temporada: z.enum(['BAJA', 'ALTA']),
  escenario: z.enum(['NORMAL', 'A', 'B', 'C']).default('NORMAL'),
  cliente: clienteSchema,
  desayuno: z.enum(['NO', 'PAGADO', 'INCLUIDO']).default('NO'),
  notas: z.string().trim().max(500).optional(),
});

reservasRouter.post('/', async (req, res) => {
  const parsed = crearSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.issues });
    return;
  }

  const datos = parsed.data;
  const noches = calcularNoches(datos.fecha_entrada, datos.fecha_salida);
  if (noches < 1) {
    res.status(400).json({ error: 'La fecha de salida debe ser posterior a la de entrada' });
    return;
  }

  const cotizacion = await cotizarHabitacion(
    datos.habitacion_id,
    datos.pax,
    datos.temporada,
    datos.escenario
  );

  if (!cotizacion.ok) {
    res.status(cotizacion.status).json({ error: cotizacion.error });
    return;
  }

  if (!(await habitacionDisponible(datos.habitacion_id, datos.fecha_entrada, datos.fecha_salida))) {
    res.status(409).json({ error: 'La habitación no está disponible en esas fechas' });
    return;
  }

  const precioNoche = Number(cotizacion.cotizacion.precio);
  const totalAlojamiento = precioNoche * noches;
  const desayunosPax = datos.desayuno === 'NO' ? 0 : datos.pax;
  const desayunosTotal = datos.desayuno === 'NO' ? 0 : datos.pax * noches;
  const totalDesayuno = datos.desayuno === 'PAGADO' ? desayunosTotal * 15_000 : 0;
  const total = totalAlojamiento + totalDesayuno;

  const resultado = await db.transaction(async (tx) => {
    let clienteId: number | undefined;

    if (datos.cliente.numero_documento) {
      const existente = await tx.query<{ id: number }>(
        `SELECT id FROM cliente
         WHERE numero_documento = $1 AND tipo = 'PARTICULAR'
         LIMIT 1`,
        [datos.cliente.numero_documento]
      );
      clienteId = existente.rows[0]?.id;
    }

    if (!clienteId) {
      const creado = await tx.query<{ id: number }>(
        `INSERT INTO cliente (tipo, razon_social, tipo_documento, numero_documento, telefono, email)
         VALUES ('PARTICULAR', $1, $2, $3, $4, $5)
         RETURNING id`,
        [
          datos.cliente.nombre,
          datos.cliente.tipo_documento ?? null,
          datos.cliente.numero_documento ?? null,
          datos.cliente.telefono ?? null,
          datos.cliente.email ?? null,
        ]
      );
      clienteId = creado.rows[0]?.id;
    }

    if (!clienteId) throw new Error('No se pudo crear el cliente');

    const secuencia = await tx.query<{ n: string }>("SELECT nextval('reserva_codigo_seq') AS n");
    const consecutivo = String(secuencia.rows[0]?.n ?? '0').padStart(4, '0');
    const codigo = `R-${datos.fecha_entrada.replaceAll('-', '')}-${consecutivo}`;

    const reserva = await tx.query<{ id: number }>(
      `INSERT INTO reserva
         (codigo, titular_cliente_id, fecha_entrada, fecha_salida, modalidad, estado,
          temporada, escenario, total, saldo, notas, incluye_desayuno, desayuno_modo,
          desayunos_pax, desayunos_total, total_desayuno)
       VALUES ($1, $2, $3::date, $4::date, 'NOCHE', 'CONFIRMADA', $5, $6, $7, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        codigo,
        clienteId,
        datos.fecha_entrada,
        datos.fecha_salida,
        datos.temporada,
        datos.escenario,
        total,
        datos.notas ?? null,
        datos.desayuno === 'INCLUIDO',
        datos.desayuno,
        desayunosPax,
        desayunosTotal,
        totalDesayuno,
      ]
    );

    const reservaId = reserva.rows[0]?.id;
    if (!reservaId) throw new Error('No se pudo crear la reserva');

    await tx.query(
      `INSERT INTO reserva_habitacion
         (reserva_id, habitacion_id, pax, clima, precio_noche, fecha_entrada, fecha_salida, estado)
       VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, 'ACTIVA')`,
      [
        reservaId,
        datos.habitacion_id,
        datos.pax,
        cotizacion.cotizacion.habitacion.clima,
        precioNoche,
        datos.fecha_entrada,
        datos.fecha_salida,
      ]
    );

    return {
      id: reservaId,
      codigo,
      estado: 'CONFIRMADA',
      cliente: datos.cliente.nombre,
      habitacion: cotizacion.cotizacion.habitacion.numero,
      habitacion_id: datos.habitacion_id,
      fecha_entrada: datos.fecha_entrada,
      fecha_salida: datos.fecha_salida,
      noches,
      total,
      saldo: total,
    };
  });

  res.status(201).json({ reserva: resultado });
});

const actualizarSchema = z.object({
  habitacion_id: z.coerce.number().int().positive().optional(),
  pax: z.coerce.number().int().min(1).max(6).optional(),
  fecha_entrada: fechaSchema.optional(),
  fecha_salida: fechaSchema.optional(),
  temporada: z.enum(['BAJA', 'ALTA']).optional(),
  escenario: z.enum(['NORMAL', 'A', 'B', 'C']).optional(),
  desayuno: z.enum(['NO', 'PAGADO', 'INCLUIDO']).optional(),
  notas: z.string().trim().max(500).optional(),
});

reservasRouter.put('/:id', async (req, res) => {
  const reservaId = Number(req.params.id);
  if (!Number.isInteger(reservaId) || reservaId <= 0) {
    res.status(400).json({ error: 'Reserva inválida' });
    return;
  }

  const parsed = actualizarSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }

  const actual = await db.query<{
    id: number;
    estado: string;
    fecha_entrada: string;
    fecha_salida: string;
    total_desayuno: string;
    temporada: 'BAJA' | 'ALTA';
    escenario: 'NORMAL' | 'A' | 'B' | 'C';
    rh_id: number;
    habitacion_id: number;
    pax: number;
    precio_noche: string;
    clima: string;
    desayuno_modo: string;
  }>(
    `SELECT r.id, r.estado, r.fecha_entrada, r.fecha_salida, r.total_desayuno,
            r.temporada, r.escenario,
            rh.id AS rh_id, rh.habitacion_id, rh.pax, rh.precio_noche, rh.clima,
            r.desayuno_modo
     FROM reserva r
     JOIN reserva_habitacion rh ON rh.reserva_id = r.id
     WHERE r.id = $1`,
    [reservaId]
  );

  const reserva = actual.rows[0];
  if (!reserva) {
    res.status(404).json({ error: 'Reserva no encontrada' });
    return;
  }

  if (!['PENDIENTE', 'CONFIRMADA'].includes(reserva.estado)) {
    res.status(409).json({ error: 'La reserva ya inició o está cerrada' });
    return;
  }

  const fechaEntrada = parsed.data.fecha_entrada ?? fechaTexto(reserva.fecha_entrada);
  const fechaSalida = parsed.data.fecha_salida ?? fechaTexto(reserva.fecha_salida);
  const habitacionId = parsed.data.habitacion_id ?? reserva.habitacion_id;
  const pax = parsed.data.pax ?? reserva.pax;
  const desayuno = parsed.data.desayuno ?? (reserva.desayuno_modo as 'NO' | 'PAGADO' | 'INCLUIDO');
  const temporada = parsed.data.temporada ?? reserva.temporada;
  const escenario = parsed.data.escenario ?? reserva.escenario;

  const noches = calcularNoches(fechaEntrada, fechaSalida);
  if (noches < 1) {
    res.status(400).json({ error: 'La fecha de salida debe ser posterior a la de entrada' });
    return;
  }

  if (!(await habitacionDisponible(habitacionId, fechaEntrada, fechaSalida, reserva.rh_id))) {
    res.status(409).json({ error: 'La habitación no está disponible en esas fechas' });
    return;
  }

  const cotizacion = await cotizarHabitacion(
    habitacionId,
    pax,
    temporada,
    escenario
  );

  if (!cotizacion.ok) {
    res.status(cotizacion.status).json({ error: cotizacion.error });
    return;
  }

  const precioNoche = Number(cotizacion.cotizacion.precio);
  const totalAlojamiento = precioNoche * noches;
  const desayunosPax = desayuno === 'NO' ? 0 : pax;
  const desayunosTotal = desayuno === 'NO' ? 0 : pax * noches;
  const totalDesayuno = desayuno === 'PAGADO' ? desayunosTotal * 15_000 : 0;
  const total = totalAlojamiento + totalDesayuno;

  await db.transaction(async (tx) => {
    await tx.query(
      `UPDATE reserva
       SET fecha_entrada = $1::date, fecha_salida = $2::date, total = $3, saldo = $3,
           notas = COALESCE($4, notas), incluye_desayuno = $5, desayuno_modo = $6,
           desayunos_pax = $7, desayunos_total = $8, total_desayuno = $9,
           temporada = $10, escenario = $11
       WHERE id = $12`,
      [
        fechaEntrada,
        fechaSalida,
        total,
        parsed.data.notas ?? null,
        desayuno === 'INCLUIDO',
        desayuno,
        desayunosPax,
        desayunosTotal,
        totalDesayuno,
        temporada,
        escenario,
        reservaId,
      ]
    );

    await tx.query(
      `UPDATE reserva_habitacion
       SET habitacion_id = $1, pax = $2, clima = $3, precio_noche = $4,
           fecha_entrada = $5::date, fecha_salida = $6::date
       WHERE id = $7`,
      [
        habitacionId,
        pax,
        cotizacion.cotizacion.habitacion.clima,
        precioNoche,
        fechaEntrada,
        fechaSalida,
        reserva.rh_id,
      ]
    );
  });

  res.json({ ok: true });
});

reservasRouter.post('/:id/cancelar', async (req, res) => {
  const reservaId = Number(req.params.id);
  if (!Number.isInteger(reservaId) || reservaId <= 0) {
    res.status(400).json({ error: 'Reserva inválida' });
    return;
  }

  const reserva = await db.query<{ id: number; estado: string }>(
    'SELECT id, estado FROM reserva WHERE id = $1',
    [reservaId]
  );

  const actual = reserva.rows[0];
  if (!actual) {
    res.status(404).json({ error: 'Reserva no encontrada' });
    return;
  }

  if (!['PENDIENTE', 'CONFIRMADA'].includes(actual.estado)) {
    res.status(409).json({ error: 'La reserva ya inició o está cerrada' });
    return;
  }

  await db.transaction(async (tx) => {
    await tx.query("UPDATE reserva SET estado = 'CANCELADA' WHERE id = $1", [reservaId]);
    await tx.query("UPDATE reserva_habitacion SET estado = 'CANCELADA' WHERE reserva_id = $1", [
      reservaId,
    ]);
  });

  res.json({ ok: true });
});

const checkinSchema = z.object({
  pago: z
    .object({
      monto: z.coerce.number().min(0),
      metodo_pago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO']),
      tipo_documento: z.enum(['NINGUNO', 'RECIBO_CAJA', 'FACTURA_ELECTRONICA']).default('NINGUNO'),
      notas: z.string().trim().max(300).optional(),
    })
    .optional(),
});

reservasRouter.post('/:id/checkin', async (req, res) => {
  const reservaId = Number(req.params.id);
  if (!Number.isInteger(reservaId) || reservaId <= 0) {
    res.status(400).json({ error: 'Reserva inválida' });
    return;
  }

  const parsed = checkinSchema.safeParse(req.body);
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
    codigo: string;
    estado: string;
    fecha_entrada: string;
    fecha_salida: string;
    total: string;
    total_desayuno: string;
    desayuno_modo: string;
    desayunos_pax: number;
    desayunos_total: number;
    cliente_id: number;
    cliente: string;
    tipo_documento: string | null;
    numero_documento: string | null;
    telefono: string | null;
    email: string | null;
    rh_id: number;
    habitacion_id: number;
    numero: string;
    pax: number;
    precio_noche: string;
    clima: string;
  }>(
    `SELECT r.id, r.codigo, r.estado, r.fecha_entrada, r.fecha_salida, r.total,
            r.total_desayuno, r.desayuno_modo, r.desayunos_pax, r.desayunos_total,
            c.id AS cliente_id, c.razon_social AS cliente, c.tipo_documento,
            c.numero_documento, c.telefono, c.email,
            rh.id AS rh_id, rh.habitacion_id, h.numero, rh.pax, rh.precio_noche, rh.clima
     FROM reserva r
     JOIN reserva_habitacion rh ON rh.reserva_id = r.id
     JOIN habitacion h ON h.id = rh.habitacion_id
     JOIN cliente c ON c.id = r.titular_cliente_id
     WHERE r.id = $1`,
    [reservaId]
  );

  const reserva = consulta.rows[0];
  if (!reserva) {
    res.status(404).json({ error: 'Reserva no encontrada' });
    return;
  }

  if (!['PENDIENTE', 'CONFIRMADA'].includes(reserva.estado)) {
    res.status(409).json({ error: 'La reserva ya inició o está cerrada' });
    return;
  }

  const total = Number(reserva.total);
  const totalDesayuno = Number(reserva.total_desayuno);
  const totalAlojamiento = total - totalDesayuno;
  const noches = calcularNoches(fechaTexto(reserva.fecha_entrada), fechaTexto(reserva.fecha_salida));
  const montoPagado = parsed.data.pago?.monto ?? 0;

  if (montoPagado > total) {
    res.status(400).json({ error: 'El pago no puede ser mayor al total' });
    return;
  }

  if (parsed.data.pago?.metodo_pago === 'CREDITO' && montoPagado > 0) {
    res.status(400).json({ error: 'Un pago a crédito no puede tener monto' });
    return;
  }

  let sesionCajaId: number | null = null;
  if (parsed.data.pago?.metodo_pago === 'EFECTIVO' && montoPagado > 0) {
    const caja = await db.query<{ id: number }>(
      `SELECT sc.id
       FROM sesion_caja sc
       JOIN punto_venta pv ON pv.id = sc.punto_venta_id
       WHERE pv.codigo = 'RECEPCION' AND sc.estado = 'ABIERTA'
       LIMIT 1`
    );

    if (!caja.rows[0]) {
      res.status(409).json({ error: 'No hay caja abierta. Abre la caja antes de cobrar en efectivo.' });
      return;
    }

    sesionCajaId = caja.rows[0].id;
  }

  const saldo = total - montoPagado;

  const resultado = await db.transaction(async (tx) => {
    const centros = await tx.query<{ id: number; codigo: string }>(
      "SELECT id, codigo FROM centro WHERE codigo IN ('ALOJAMIENTO', 'RESTAURANTE')"
    );
    const centroAlojamiento = centros.rows.find((centro) => centro.codigo === 'ALOJAMIENTO');
    const centroRestaurante = centros.rows.find((centro) => centro.codigo === 'RESTAURANTE');

    if (!centroAlojamiento || !centroRestaurante) {
      throw new Error('Faltan los centros ALOJAMIENTO o RESTAURANTE');
    }

    const folio = await tx.query<{ id: number }>(
      `INSERT INTO folio (reserva_id, tipo, responsable_cliente_id, estado, saldo)
       VALUES ($1, 'MAESTRO', $2, 'ABIERTO', $3)
       RETURNING id`,
      [reserva.id, reserva.cliente_id, total]
    );

    const folioId = folio.rows[0]?.id;
    if (!folioId) throw new Error('No se pudo crear el folio');

    await tx.query(
      `INSERT INTO huesped
         (reserva_habitacion_id, cliente_id, nombre_completo, tipo_documento, numero_documento,
          telefono, email, es_titular)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [
        reserva.rh_id,
        reserva.cliente_id,
        reserva.cliente,
        reserva.tipo_documento,
        reserva.numero_documento,
        reserva.telefono,
        reserva.email,
      ]
    );

    await tx.query(
      `INSERT INTO folio_cargo
         (folio_id, concepto, centro_id, cantidad, precio_unitario, monto, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        folioId,
        `Alojamiento ${noches} noche(s) - hab. ${reserva.numero}`,
        centroAlojamiento.id,
        noches,
        Number(reserva.precio_noche),
        totalAlojamiento,
        usuarioId,
      ]
    );

    if (totalDesayuno > 0) {
      await tx.query(
        `INSERT INTO folio_cargo
           (folio_id, concepto, centro_id, cantidad, precio_unitario, monto, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          folioId,
          `Desayuno ${reserva.desayunos_total} (${reserva.desayunos_pax} pax x ${noches} noches)`,
          centroRestaurante.id,
          reserva.desayunos_total,
          15_000,
          totalDesayuno,
          usuarioId,
        ]
      );
    }

    await registrarAsiento(tx, {
      descripcion: `Check-in ${reserva.codigo}`,
      origenTipo: 'CHECKIN',
      origenId: reserva.id,
      usuarioId,
      lineas: [
        { cuenta: '1103', debe: total, descripcion: `Cargo folio ${folioId}` },
        {
          cuenta: '4101',
          centro: 'ALOJAMIENTO',
          haber: totalAlojamiento,
          descripcion: `Alojamiento hab. ${reserva.numero}`,
        },
        ...(totalDesayuno > 0
          ? [
              {
                cuenta: '4104',
                centro: 'RESTAURANTE',
                haber: totalDesayuno,
                descripcion: 'Desayuno',
              },
            ]
          : []),
      ],
    });

    let cobroId: number | null = null;

    if (montoPagado > 0 && parsed.data.pago) {
      const cobro = await tx.query<{ id: number }>(
        `INSERT INTO cobro
           (folio_id, cliente_id, tipo_documento, monto, metodo_pago, sesion_caja_id, usuario_id, notas)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          folioId,
          reserva.cliente_id,
          parsed.data.pago.tipo_documento,
          montoPagado,
          parsed.data.pago.metodo_pago,
          sesionCajaId,
          usuarioId,
          parsed.data.pago.notas ?? null,
        ]
      );

      cobroId = cobro.rows[0]?.id ?? null;

      if (cobroId && sesionCajaId !== null) {
        await tx.query(
          `INSERT INTO movimiento_caja
             (sesion_caja_id, tipo, monto, referencia_tipo, referencia_id, usuario_id)
           VALUES ($1, 'VENTA_EFECTIVO', $2, 'COBRO', $3, $4)`,
          [sesionCajaId, montoPagado, cobroId, usuarioId]
        );
      }

      if (cobroId) {
        const cuentaPago = parsed.data.pago.metodo_pago === 'EFECTIVO' ? '1101' : '1102';

        await registrarAsiento(tx, {
          descripcion: `Cobro check-in ${reserva.codigo}`,
          origenTipo: 'COBRO',
          origenId: cobroId,
          usuarioId,
          lineas: [
            { cuenta: cuentaPago, debe: montoPagado },
            { cuenta: '1103', haber: montoPagado },
          ],
        });
      }
    }

    await tx.query("UPDATE reserva SET estado = 'CHECKIN', saldo = $1 WHERE id = $2", [
      saldo,
      reserva.id,
    ]);
    await tx.query("UPDATE reserva_habitacion SET estado = 'CHECKIN' WHERE id = $1", [
      reserva.rh_id,
    ]);
    await tx.query('UPDATE folio SET saldo = $1 WHERE id = $2', [saldo, folioId]);

    return {
      reserva: {
        id: reserva.id,
        codigo: reserva.codigo,
        estado: 'CHECKIN',
        fecha_entrada: reserva.fecha_entrada,
        fecha_salida: reserva.fecha_salida,
        noches,
        total,
        saldo,
      },
      habitacion: { numero: reserva.numero },
      huesped: { nombre_completo: reserva.cliente },
      folio: { id: folioId, saldo },
      cargos: { alojamiento: totalAlojamiento, desayuno: totalDesayuno },
      cobro: cobroId
        ? { id: cobroId, monto: montoPagado, metodo_pago: parsed.data.pago?.metodo_pago }
        : null,
    };
  });

  res.status(201).json(resultado);
});
