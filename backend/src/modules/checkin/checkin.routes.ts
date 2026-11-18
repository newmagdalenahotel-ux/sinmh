import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { cotizarHabitacion } from '../tarifas/tarifas.service.js';

export const checkinRouter = Router();

checkinRouter.use(requireAuth);

const clienteSchema = z.object({
  nombre: z.string().trim().min(2),
  tipo_documento: z.string().trim().max(10).optional(),
  numero_documento: z.string().trim().max(30).optional(),
  telefono: z.string().trim().max(40).optional(),
  email: z.string().trim().max(150).optional(),
});

const pagoSchema = z.object({
  monto: z.coerce.number().min(0),
  metodo_pago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO']),
  tipo_documento: z.enum(['NINGUNO', 'RECIBO_CAJA', 'FACTURA_ELECTRONICA']).default('NINGUNO'),
  notas: z.string().trim().max(300).optional(),
});

const checkinSchema = z.object({
  habitacion_id: z.coerce.number().int().positive(),
  pax: z.coerce.number().int().min(1).max(6),
  fecha_entrada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_salida: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  temporada: z.enum(['BAJA', 'ALTA']),
  escenario: z.enum(['NORMAL', 'A', 'B', 'C']).default('NORMAL'),
  cliente: clienteSchema,
  desayuno: z.enum(['NO', 'PAGADO', 'INCLUIDO']).default('NO'),
  pago: pagoSchema.optional(),
  notas: z.string().trim().max(500).optional(),
});

function calcularNoches(desde: string, hasta: string): number {
  const a = Date.UTC(Number(desde.slice(0, 4)), Number(desde.slice(5, 7)) - 1, Number(desde.slice(8, 10)));
  const b = Date.UTC(Number(hasta.slice(0, 4)), Number(hasta.slice(5, 7)) - 1, Number(hasta.slice(8, 10)));
  return Math.round((b - a) / 86_400_000);
}

checkinRouter.post('/', async (req, res) => {
  const parsed = checkinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.issues });
    return;
  }

  const datos = parsed.data;
  const usuarioId = Number(req.user?.sub);

  if (!Number.isFinite(usuarioId)) {
    res.status(401).json({ error: 'Usuario inválido' });
    return;
  }

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

  const yaOcupada = await db.query(
    `SELECT 1
     FROM reserva_habitacion
     WHERE habitacion_id = $1
       AND estado IN ('ACTIVA', 'CHECKIN')
       AND fecha_entrada < $3::date
       AND fecha_salida > $2::date
     LIMIT 1`,
    [datos.habitacion_id, datos.fecha_entrada, datos.fecha_salida]
  );

  if (yaOcupada.rows.length > 0) {
    res.status(409).json({ error: 'La habitación ya está ocupada en esas fechas' });
    return;
  }

  const precioNoche = cotizacion.cotizacion.precio;
  const totalAlojamiento = precioNoche * noches;
  const desayunosPax = datos.desayuno === 'NO' ? 0 : datos.pax;
  const desayunosTotal = datos.desayuno === 'NO' ? 0 : datos.pax * noches;
  const totalDesayuno = datos.desayuno === 'PAGADO' ? desayunosTotal * 15_000 : 0;
  const total = totalAlojamiento + totalDesayuno;
  const montoPagado = datos.pago?.monto ?? 0;

  if (montoPagado > total) {
    res.status(400).json({ error: 'El pago no puede ser mayor al total' });
    return;
  }

  if (datos.pago?.metodo_pago === 'CREDITO' && montoPagado > 0) {
    res.status(400).json({ error: 'Un pago a crédito no puede tener monto' });
    return;
  }

  const saldo = total - montoPagado;

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
          total, saldo, notas, incluye_desayuno, desayuno_modo, desayunos_pax,
          desayunos_total, total_desayuno)
       VALUES ($1, $2, $3::date, $4::date, 'NOCHE', 'CHECKIN', $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        codigo,
        clienteId,
        datos.fecha_entrada,
        datos.fecha_salida,
        total,
        saldo,
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

    const reservaHabitacion = await tx.query<{ id: number }>(
      `INSERT INTO reserva_habitacion
         (reserva_id, habitacion_id, pax, clima, precio_noche, fecha_entrada, fecha_salida, estado)
       VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, 'CHECKIN')
       RETURNING id`,
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
    const reservaHabitacionId = reservaHabitacion.rows[0]?.id;
    if (!reservaHabitacionId) throw new Error('No se pudo crear la reserva de habitación');

    await tx.query(
      `INSERT INTO huesped
         (reserva_habitacion_id, cliente_id, nombre_completo, tipo_documento, numero_documento,
          telefono, email, es_titular)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [
        reservaHabitacionId,
        clienteId,
        datos.cliente.nombre,
        datos.cliente.tipo_documento ?? null,
        datos.cliente.numero_documento ?? null,
        datos.cliente.telefono ?? null,
        datos.cliente.email ?? null,
      ]
    );

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
      [reservaId, clienteId, total]
    );
    const folioId = folio.rows[0]?.id;
    if (!folioId) throw new Error('No se pudo crear el folio');

    await tx.query(
      `INSERT INTO folio_cargo
         (folio_id, concepto, centro_id, cantidad, precio_unitario, monto, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        folioId,
        `Alojamiento ${noches} noche(s) - hab. ${cotizacion.cotizacion.habitacion.numero}`,
        centroAlojamiento.id,
        noches,
        precioNoche,
        totalAlojamiento,
        usuarioId,
      ]
    );

    if (datos.desayuno === 'PAGADO' && totalDesayuno > 0) {
      await tx.query(
        `INSERT INTO folio_cargo
           (folio_id, concepto, centro_id, cantidad, precio_unitario, monto, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          folioId,
          `Desayuno ${desayunosTotal} (${datos.pax} pax x ${noches} noches)`,
          centroRestaurante.id,
          desayunosTotal,
          15_000,
          totalDesayuno,
          usuarioId,
        ]
      );
    }

    let cobroId: number | null = null;

    if (montoPagado > 0 && datos.pago) {
      const cobro = await tx.query<{ id: number }>(
        `INSERT INTO cobro
           (folio_id, cliente_id, tipo_documento, monto, metodo_pago, usuario_id, notas)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          folioId,
          clienteId,
          datos.pago.tipo_documento,
          montoPagado,
          datos.pago.metodo_pago,
          usuarioId,
          datos.pago.notas ?? null,
        ]
      );
      cobroId = cobro.rows[0]?.id ?? null;
    }

    await tx.query('UPDATE folio SET saldo = $1 WHERE id = $2', [saldo, folioId]);
    await tx.query('UPDATE reserva SET saldo = $1 WHERE id = $2', [saldo, reservaId]);

    return {
      reserva: {
        id: reservaId,
        codigo,
        estado: 'CHECKIN',
        fecha_entrada: datos.fecha_entrada,
        fecha_salida: datos.fecha_salida,
        noches,
        total,
        saldo,
      },
      habitacion: cotizacion.cotizacion.habitacion,
      huesped: { nombre_completo: datos.cliente.nombre },
      folio: { id: folioId, saldo },
      cargos: { alojamiento: totalAlojamiento, desayuno: totalDesayuno },
      cobro: cobroId
        ? { id: cobroId, monto: montoPagado, metodo_pago: datos.pago?.metodo_pago }
        : null,
      desayuno: { modo: datos.desayuno, pax: desayunosPax, total: desayunosTotal },
    };
  });

  res.status(201).json(resultado);
});
