import { Router } from 'express';
import PDFDocument from 'pdfkit';
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

const anticipoSchema = z.object({
  monto: z.coerce.number().positive(),
  metodo_pago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA']),
  tipo_documento: z.enum(['NINGUNO', 'RECIBO_CAJA', 'FACTURA_ELECTRONICA']).default('NINGUNO'),
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

function fechaONull(valor: unknown): string | null {
  if (!valor) return null;
  return fechaTexto(valor);
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

type TarifaCliente = {
  plan: 'PUBLICA' | 'EMPRESA' | 'EMPLEADO' | 'GRUPO';
  precio_noche: number;
  desayuno_incluido: boolean;
};

async function tarifaDeCliente(
  clienteId: number | undefined,
  fechaEntrada: string
): Promise<TarifaCliente | null> {
  if (!clienteId) return null;

  const { rows } = await db.query<{
    tarifa_plan: 'PUBLICA' | 'EMPRESA' | 'EMPLEADO' | 'GRUPO';
    tarifa_precio_noche: string | null;
    tarifa_desayuno_incluido: boolean;
    tarifa_vigente_desde: string | null;
    tarifa_vigente_hasta: string | null;
  }>(
    `SELECT tarifa_plan, tarifa_precio_noche, tarifa_desayuno_incluido,
            tarifa_vigente_desde, tarifa_vigente_hasta
     FROM cliente
     WHERE id = $1 AND activo = true`,
    [clienteId]
  );

  const cliente = rows[0];
  if (!cliente || cliente.tarifa_plan === 'PUBLICA') return null;

  const precio = Number(cliente.tarifa_precio_noche ?? 0);
  if (precio <= 0) return null;

  const desde = fechaONull(cliente.tarifa_vigente_desde);
  const hasta = fechaONull(cliente.tarifa_vigente_hasta);
  if (desde && fechaEntrada < desde) return null;
  if (hasta && fechaEntrada > hasta) return null;

  return {
    plan: cliente.tarifa_plan,
    precio_noche: precio,
    desayuno_incluido: cliente.tarifa_desayuno_incluido,
  };
}

async function clienteExistentePorDocumento(numeroDocumento: string | undefined) {
  if (!numeroDocumento) return undefined;

  const { rows } = await db.query<{ id: number }>(
    `SELECT id FROM cliente
     WHERE numero_documento = $1 AND tipo = 'PARTICULAR'
     LIMIT 1`,
    [numeroDocumento]
  );

  return rows[0]?.id;
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
    `SELECT r.id, r.codigo, r.estado, r.created_at, r.fecha_entrada, r.fecha_salida,
            r.total, r.saldo, r.anticipo, r.desayuno_modo, r.desayunos_total,
            r.temporada, r.escenario, r.maestra_id, rm.codigo AS maestra_codigo,
            r.motivo_visita, r.como_llego, r.origen_reserva,
            r.tarifa_plan, r.tarifa_negociada,
            c.razon_social AS cliente, c.tipo_documento, c.numero_documento,
            rh.id AS reserva_habitacion_id, rh.pax, rh.precio_noche,
            h.id AS habitacion_id, h.numero AS habitacion
     FROM reserva r
     JOIN reserva_habitacion rh ON rh.reserva_id = r.id
     JOIN habitacion h ON h.id = rh.habitacion_id
     LEFT JOIN cliente c ON c.id = r.titular_cliente_id
     LEFT JOIN reserva_maestra rm ON rm.id = r.maestra_id
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
            r.modalidad, r.total, r.saldo, r.anticipo, r.notas,
            r.incluye_desayuno, r.desayuno_modo, r.desayunos_pax, r.desayunos_total,
            r.total_desayuno, r.temporada, r.escenario, r.maestra_id,
            r.motivo_visita, r.como_llego, r.placa_vehiculo, r.origen_reserva,
            r.tarifa_plan, r.tarifa_negociada, r.tarifa_motivo,
            rm.codigo AS maestra_codigo, rm.pagador_cliente_id,
            rh.id AS reserva_habitacion_id, rh.pax, rh.precio_noche, rh.estado AS rh_estado,
            h.id AS habitacion_id, h.numero AS habitacion, h.clima,
            c.id AS cliente_id, c.razon_social AS cliente, c.tipo_documento, c.numero_documento,
            c.telefono, c.email
     FROM reserva r
     JOIN reserva_habitacion rh ON rh.reserva_id = r.id
     JOIN habitacion h ON h.id = rh.habitacion_id
     LEFT JOIN cliente c ON c.id = r.titular_cliente_id
     LEFT JOIN reserva_maestra rm ON rm.id = r.maestra_id
     WHERE r.id = $1`,
    [reservaId]
  );

  if (!rows[0]) {
    res.status(404).json({ error: 'Reserva no encontrada' });
    return;
  }

  res.json({ reserva: rows[0] });
});

reservasRouter.get('/:id/detalle', async (req, res) => {
  type DetalleReserva = {
    id: number;
    codigo: string;
    estado: string;
    created_at: unknown;
    saldo: string;
    reserva_habitacion_id: number;
    habitacion: string;
  };
  type DetalleHuesped = {
    checkin_ts: unknown;
    checkout_ts: unknown;
  };
  type DetallePago = {
    fecha: unknown;
    monto: string;
    metodo_pago: string;
    es_anticipo: boolean;
  };

  const reservaId = Number(req.params.id);
  if (!Number.isInteger(reservaId) || reservaId <= 0) {
    res.status(400).json({ error: 'Reserva inválida' });
    return;
  }

  const consulta = await db.query<DetalleReserva>(
    `SELECT r.id, r.codigo, r.estado, r.created_at, r.fecha_entrada, r.fecha_salida,
            r.modalidad, r.total, r.saldo, r.anticipo, r.notas,
            r.incluye_desayuno, r.desayuno_modo, r.desayunos_pax, r.desayunos_total,
            r.total_desayuno, r.temporada, r.escenario, r.maestra_id,
            rm.codigo AS maestra_codigo,
            r.motivo_visita, r.como_llego, r.placa_vehiculo, r.origen_reserva,
            r.tarifa_plan, r.tarifa_negociada, r.tarifa_motivo,
            rh.id AS reserva_habitacion_id, rh.pax, rh.precio_noche, rh.estado AS rh_estado,
            h.id AS habitacion_id, h.numero AS habitacion, h.clima, h.es_suite,
            h.capacidad_max, h.piso, h.notas AS habitacion_notas,
            c.id AS cliente_id, c.razon_social AS cliente, c.tipo AS cliente_tipo,
            c.tipo_documento, c.numero_documento, c.telefono, c.email,
            c.direccion, c.ciudad, c.notas AS cliente_notas
     FROM reserva r
     JOIN reserva_habitacion rh ON rh.reserva_id = r.id
     JOIN habitacion h ON h.id = rh.habitacion_id
     LEFT JOIN cliente c ON c.id = r.titular_cliente_id
     LEFT JOIN reserva_maestra rm ON rm.id = r.maestra_id
     WHERE r.id = $1`,
    [reservaId]
  );

  const reserva = consulta.rows[0];
  if (!reserva) {
    res.status(404).json({ error: 'Reserva no encontrada' });
    return;
  }

  const huesped = await db.query<DetalleHuesped>(
    `SELECT nombre_completo, tipo_documento, numero_documento, telefono, email,
            es_titular, checkin_ts, checkout_ts
     FROM huesped
     WHERE reserva_habitacion_id = $1
     ORDER BY es_titular DESC, id
     LIMIT 1`,
    [reserva.reserva_habitacion_id]
  );

  const cargos = await db.query(
    `SELECT fc.id, fc.fecha, fc.concepto, fc.cantidad, fc.precio_unitario,
            fc.monto, fc.es_cortesia, fc.anulado, ce.nombre AS centro
     FROM folio f
     JOIN folio_cargo fc ON fc.folio_id = f.id
     LEFT JOIN centro ce ON ce.id = fc.centro_id
     WHERE f.reserva_id = $1
     ORDER BY fc.fecha, fc.id`,
    [reservaId]
  );

  const pagos = await db.query<DetallePago>(
    `SELECT c.id, c.fecha, c.monto, c.metodo_pago, c.tipo_documento,
            c.es_anticipo, c.aplicado, c.notas, u.nombre_completo AS usuario
     FROM cobro c
     LEFT JOIN usuario u ON u.id = c.usuario_id
     WHERE c.reserva_id = $1
        OR c.folio_id IN (SELECT id FROM folio WHERE reserva_id = $1)
     ORDER BY c.fecha, c.id`,
    [reservaId]
  );

  const cuentas = await db.query(
    `SELECT cc.id, cc.monto_original, cc.saldo, cc.estado, cc.fecha_emision,
            cc.fecha_vencimiento
     FROM cuenta_cobrar cc
     WHERE cc.folio_id IN (SELECT id FROM folio WHERE reserva_id = $1)
     ORDER BY cc.id`,
    [reservaId]
  );

  const historial: Array<{ fecha: unknown; titulo: string; detalle?: string }> = [];
  historial.push({
    fecha: reserva.created_at,
    titulo: 'Reserva creada',
    detalle: `Código ${reserva.codigo}`,
  });

  if (huesped.rows[0]?.checkin_ts) {
    historial.push({
      fecha: huesped.rows[0].checkin_ts,
      titulo: 'Check-in',
      detalle: `Habitación ${reserva.habitacion}`,
    });
  }

  for (const pago of pagos.rows) {
    historial.push({
      fecha: pago.fecha,
      titulo: pago.es_anticipo ? 'Anticipo recibido' : 'Pago recibido',
      detalle: `${pago.metodo_pago} · ${Number(pago.monto).toLocaleString('es-CO')}`,
    });
  }

  if (huesped.rows[0]?.checkout_ts) {
    historial.push({
      fecha: huesped.rows[0].checkout_ts,
      titulo: 'Check-out',
      detalle: `Saldo ${Number(reserva.saldo).toLocaleString('es-CO')}`,
    });
  }

  historial.sort((a, b) => new Date(String(a.fecha)).getTime() - new Date(String(b.fecha)).getTime());

  res.json({
    reserva,
    huesped: huesped.rows[0] ?? null,
    cargos: cargos.rows,
    pagos: pagos.rows,
    cuentas_cobrar: cuentas.rows,
    historial,
  });
});

reservasRouter.get('/:id/contrato', async (req, res) => {  const reservaId = Number(req.params.id);
  if (!Number.isInteger(reservaId) || reservaId <= 0) {
    res.status(400).json({ error: 'Reserva inválida' });
    return;
  }

  const consulta = await db.query<{
    codigo: string;
    cliente: string;
    tipo_documento: string | null;
    numero_documento: string | null;
    telefono: string | null;
    email: string | null;
    habitacion: string;
    pax: number;
    fecha_entrada: unknown;
    fecha_salida: unknown;
    total: string;
    saldo: string;
    anticipo: string;
    desayuno_modo: string;
  }>(
    `SELECT r.codigo, c.razon_social AS cliente, c.tipo_documento, c.numero_documento,
            c.telefono, c.email, h.numero AS habitacion, rh.pax,
            r.fecha_entrada, r.fecha_salida, r.total, r.saldo, r.anticipo, r.desayuno_modo
     FROM reserva r
     JOIN reserva_habitacion rh ON rh.reserva_id = r.id
     JOIN habitacion h ON h.id = rh.habitacion_id
     LEFT JOIN cliente c ON c.id = r.titular_cliente_id
     WHERE r.id = $1`,
    [reservaId]
  );

  const reserva = consulta.rows[0];
  if (!reserva) {
    res.status(404).json({ error: 'Reserva no encontrada' });
    return;
  }

  const entrada = fechaTexto(reserva.fecha_entrada);
  const salida = fechaTexto(reserva.fecha_salida);
  const noches = calcularNoches(entrada, salida);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="contrato-${reserva.codigo}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).text('Hotel New Magdalena', { align: 'center' });
  doc.fontSize(9).text('NIT 901.088.516-5', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text('CONTRATO DE HOSPEDAJE', { align: 'center' });
  doc.moveDown();

  doc.fontSize(10).text(`Reserva: ${reserva.codigo}`);
  doc.text(`Huésped: ${reserva.cliente}`);
  doc.text(
    `Documento: ${reserva.tipo_documento ?? ''} ${reserva.numero_documento ?? ''}`.trim()
  );
  if (reserva.telefono) doc.text(`Teléfono: ${reserva.telefono}`);
  if (reserva.email) doc.text(`Email: ${reserva.email}`);
  doc.moveDown();

  doc.font('Helvetica-Bold').text('Condiciones de la estadía');
  doc.font('Helvetica');
  doc.text(`Habitación: ${reserva.habitacion}`);
  doc.text(`Personas: ${reserva.pax}`);
  doc.text(`Entrada: ${entrada}`);
  doc.text(`Salida: ${salida}`);
  doc.text(`Noches: ${noches}`);
  doc.text(`Desayuno: ${reserva.desayuno_modo}`);
  doc.moveDown();

  doc.text(`Total: $${Number(reserva.total).toLocaleString('es-CO')}`);
  doc.text(`Anticipo: $${Number(reserva.anticipo).toLocaleString('es-CO')}`);
  doc.text(`Saldo: $${Number(reserva.saldo).toLocaleString('es-CO')}`);
  doc.moveDown();

  doc.fontSize(9).text(
    'El huésped se compromete a respetar las normas del hotel, cuidar las instalaciones y ' +
      'pagar los consumos adicionales al momento del check-out. La tarifa se cobra por persona ' +
      'y por noche. El check-out es a la 1:00 p.m. salvo acuerdo previo.'
  );
  doc.moveDown(2);
  doc.text('Firma del huésped: ______________________________');
  doc.moveDown();
  doc.text('Firma del hotel: ______________________________');
  doc.end();
});

const crearSchema = z.object({
  cliente_id: z.coerce.number().int().positive().optional(),
  habitacion_id: z.coerce.number().int().positive(),
  pax: z.coerce.number().int().min(1).max(6),
  fecha_entrada: fechaSchema,
  fecha_salida: fechaSchema,
  temporada: z.enum(['BAJA', 'ALTA']),
  escenario: z.enum(['NORMAL', 'A', 'B', 'C']).default('NORMAL'),
  cliente: clienteSchema,
  desayuno: z.enum(['NO', 'PAGADO', 'INCLUIDO']).default('NO'),
  anticipo: anticipoSchema.optional(),
  pagos: z.array(anticipoSchema).min(1).max(5).optional(),
  notas: z.string().trim().max(500).optional(),
  motivo_visita: z.string().trim().max(120).optional(),
  como_llego: z.string().trim().max(60).optional(),
  placa_vehiculo: z.string().trim().max(20).optional(),
  origen_reserva: z
    .enum(['WHATSAPP', 'TELEFONO', 'DIRECTO', 'CORREO', 'WEB', 'OTA'])
    .optional(),
});

reservasRouter.post('/', async (req, res) => {
  const parsed = crearSchema.safeParse(req.body);
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

  const clienteTarifaId =
    datos.cliente_id ?? (await clienteExistentePorDocumento(datos.cliente.numero_documento));
  const tarifaCliente = await tarifaDeCliente(clienteTarifaId, datos.fecha_entrada);
  const planTarifa = tarifaCliente?.plan ?? 'PUBLICA';

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

  const precioNoche = tarifaCliente?.precio_noche ?? Number(cotizacion.cotizacion.precio);
  const desayuno =
    tarifaCliente?.desayuno_incluido && datos.desayuno === 'NO' ? 'INCLUIDO' : datos.desayuno;
  const totalAlojamiento = precioNoche * noches;
  const desayunosPax = desayuno === 'NO' ? 0 : datos.pax;
  const desayunosTotal = desayuno === 'NO' ? 0 : datos.pax * noches;
  const totalDesayuno = desayuno === 'PAGADO' ? desayunosTotal * 15_000 : 0;
  const total = totalAlojamiento + totalDesayuno;
  const pagos = datos.pagos?.length
    ? datos.pagos
    : datos.anticipo
      ? [datos.anticipo]
      : [];
  const montoAnticipo = pagos.reduce((suma, pago) => suma + pago.monto, 0);

  if (montoAnticipo > total) {
    res.status(400).json({ error: 'Los pagos no pueden ser mayores al total' });
    return;
  }

  let sesionAnticipoId: number | null = null;
  if (pagos.some((pago) => pago.metodo_pago === 'EFECTIVO')) {
    const caja = await db.query<{ id: number }>(
      `SELECT sc.id
       FROM sesion_caja sc
       JOIN punto_venta pv ON pv.id = sc.punto_venta_id
       WHERE pv.codigo = 'RECEPCION' AND sc.estado = 'ABIERTA'
       LIMIT 1`
    );

    if (!caja.rows[0]) {
      res.status(409).json({ error: 'No hay caja abierta para recibir pagos en efectivo' });
      return;
    }

    sesionAnticipoId = caja.rows[0].id;
  }

  const saldoInicial = total - montoAnticipo;

  const resultado = await db.transaction(async (tx) => {
    let clienteId: number | undefined = datos.cliente_id;

    if (clienteId) {
      const existente = await tx.query<{ id: number }>(
        'SELECT id FROM cliente WHERE id = $1 AND activo = true',
        [clienteId]
      );
      if (!existente.rows[0]) throw new Error('Cliente no encontrado o inactivo');
    }

    if (!clienteId && datos.cliente.numero_documento) {
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
          desayunos_pax, desayunos_total, total_desayuno,
          tarifa_plan, tarifa_negociada, tarifa_motivo, motivo_visita, como_llego,
          placa_vehiculo, origen_reserva)
       VALUES ($1, $2, $3::date, $4::date, 'NOCHE', 'CONFIRMADA', $5, $6, $7, $7, $8, $9,
               $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
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
        desayuno === 'INCLUIDO',
        desayuno,
        desayunosPax,
        desayunosTotal,
        totalDesayuno,
        planTarifa,
        tarifaCliente?.precio_noche ?? null,
        tarifaCliente ? `Tarifa ${planTarifa} del cliente` : null,
        datos.motivo_visita ?? null,
        datos.como_llego ?? null,
        datos.placa_vehiculo ?? null,
        datos.origen_reserva ?? null,
      ]
    );

    const reservaId = reserva.rows[0]?.id;
    if (!reservaId) throw new Error('No se pudo crear la reserva');

    if (pagos.length > 0 && clienteId) {
      for (const pago of pagos) {
        const cobro = await tx.query<{ id: number }>(
          `INSERT INTO cobro
             (folio_id, cliente_id, reserva_id, tipo_documento, monto, metodo_pago,
              sesion_caja_id, usuario_id, notas, es_anticipo)
           VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, true)
           RETURNING id`,
          [
            clienteId,
            reservaId,
            pago.tipo_documento,
            pago.monto,
            pago.metodo_pago,
            pago.metodo_pago === 'EFECTIVO' ? sesionAnticipoId : null,
            usuarioId,
            `Anticipo reserva ${codigo}`,
          ]
        );

        const cobroId = cobro.rows[0]?.id;
        if (!cobroId) throw new Error('No se pudo registrar el pago');

        if (pago.metodo_pago === 'EFECTIVO' && sesionAnticipoId !== null) {
          await tx.query(
            `INSERT INTO movimiento_caja
               (sesion_caja_id, tipo, monto, referencia_tipo, referencia_id, usuario_id)
             VALUES ($1, 'VENTA_EFECTIVO', $2, 'COBRO', $3, $4)`,
            [sesionAnticipoId, pago.monto, cobroId, usuarioId]
          );
        }

        const cuentaPago = pago.metodo_pago === 'EFECTIVO' ? '1101' : '1102';

        await registrarAsiento(tx, {
          descripcion: `Anticipo reserva ${codigo}`,
          origenTipo: 'ANTICIPO_RESERVA',
          origenId: cobroId,
          usuarioId,
          lineas: [
            { cuenta: cuentaPago, debe: pago.monto },
            { cuenta: '2103', haber: pago.monto },
          ],
        });
      }

      await tx.query('UPDATE reserva SET anticipo = $1, saldo = $2 WHERE id = $3', [
        montoAnticipo,
        saldoInicial,
        reservaId,
      ]);
    }

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
      saldo: saldoInicial,
      anticipo: montoAnticipo,
      tarifa_plan: planTarifa,
      tarifa_negociada: tarifaCliente?.precio_noche ?? null,
      precio_noche: precioNoche,
    };
  });

  res.status(201).json({ reserva: resultado });
});

const grupoSchema = z.object({
  cliente_id: z.coerce.number().int().positive().optional(),
  cliente: clienteSchema.extend({
    tipo: z.enum(['PARTICULAR', 'EMPRESA', 'EMPLEADO', 'GRUPO_TRABAJO', 'SOCIO']).default('PARTICULAR'),
  }),
  fecha_entrada: fechaSchema,
  fecha_salida: fechaSchema,
  habitaciones: z
    .array(
      z.object({
        habitacion_id: z.coerce.number().int().positive(),
        pax: z.coerce.number().int().min(1).max(6),
        desayuno: z.enum(['NO', 'PAGADO', 'INCLUIDO']).default('NO'),
        huesped_nombre: z.string().trim().max(200).optional(),
        huesped_documento: z.string().trim().max(30).optional(),
      })
    )
    .min(1)
    .max(10),
  notas: z.string().trim().max(500).optional(),
  origen_reserva: z
    .enum(['WHATSAPP', 'TELEFONO', 'DIRECTO', 'CORREO', 'WEB', 'OTA'])
    .optional(),
});

reservasRouter.post('/maestra', async (req, res) => {
  const parsed = grupoSchema.safeParse(req.body);
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

  const ids = new Set(datos.habitaciones.map((item) => item.habitacion_id));
  if (ids.size !== datos.habitaciones.length) {
    res.status(400).json({ error: 'No se puede repetir la misma habitación' });
    return;
  }

  for (const item of datos.habitaciones) {
    if (!(await habitacionDisponible(item.habitacion_id, datos.fecha_entrada, datos.fecha_salida))) {
      res.status(409).json({ error: `La habitación ${item.habitacion_id} no está disponible` });
      return;
    }
  }

  const clienteTarifaId =
    datos.cliente_id ?? (await clienteExistentePorDocumento(datos.cliente.numero_documento));
  const tarifaCliente = await tarifaDeCliente(clienteTarifaId, datos.fecha_entrada);

  const cotizaciones: Array<{
    habitacion_id: number;
    pax: number;
    desayuno: 'NO' | 'PAGADO' | 'INCLUIDO';
    huesped_nombre?: string;
    huesped_documento?: string;
    cotizacion: { habitacion: { numero: string; clima: string } };
    precioNoche: number;
    totalAlojamiento: number;
    totalDesayuno: number;
    total: number;
  }> = [];
  for (const item of datos.habitaciones) {
    const cotizacion = await cotizarHabitacion(
      item.habitacion_id,
      item.pax,
      'BAJA',
      'NORMAL'
    );

    if (!cotizacion.ok) {
      res.status(cotizacion.status).json({ error: cotizacion.error });
      return;
    }

    const precioNoche = tarifaCliente?.precio_noche ?? Number(cotizacion.cotizacion.precio);
    const desayuno =
      tarifaCliente?.desayuno_incluido && item.desayuno === 'NO' ? 'INCLUIDO' : item.desayuno;
    const totalAlojamiento = precioNoche * noches;
    const totalDesayuno = desayuno === 'PAGADO' ? item.pax * noches * 15_000 : 0;

    cotizaciones.push({
      ...item,
      cotizacion: cotizacion.cotizacion,
      desayuno,
      precioNoche,
      totalAlojamiento,
      totalDesayuno,
      total: totalAlojamiento + totalDesayuno,
    });
  }

  const totalGrupo = cotizaciones.reduce((suma, item) => suma + item.total, 0);

  const resultado = await db.transaction(async (tx) => {
    let pagadorId = datos.cliente_id;

    if (pagadorId) {
      const existente = await tx.query<{ id: number }>(
        'SELECT id FROM cliente WHERE id = $1 AND activo = true',
        [pagadorId]
      );
      if (!existente.rows[0]) throw new Error('Cliente pagador no encontrado');
    } else {
      if (datos.cliente.numero_documento) {
        const existente = await tx.query<{ id: number }>(
          'SELECT id FROM cliente WHERE numero_documento = $1 AND activo = true LIMIT 1',
          [datos.cliente.numero_documento]
        );
        pagadorId = existente.rows[0]?.id;
      }

      if (!pagadorId) {
        const creado = await tx.query<{ id: number }>(
          `INSERT INTO cliente
             (tipo, razon_social, tipo_documento, numero_documento, telefono, email)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            datos.cliente.tipo,
            datos.cliente.nombre,
            datos.cliente.tipo_documento ?? null,
            datos.cliente.numero_documento ?? null,
            datos.cliente.telefono ?? null,
            datos.cliente.email ?? null,
          ]
        );
        pagadorId = creado.rows[0]?.id;
      }
    }

    if (!pagadorId) throw new Error('No se pudo crear el cliente pagador');

    const secuenciaMaestra = await tx.query<{ n: string }>(
      "SELECT nextval('reserva_maestra_codigo_seq') AS n"
    );
    const consecutivoMaestra = String(secuenciaMaestra.rows[0]?.n ?? '0').padStart(4, '0');
    const codigoMaestra = `G-${datos.fecha_entrada.replaceAll('-', '')}-${consecutivoMaestra}`;

    const maestra = await tx.query<{ id: number }>(
      `INSERT INTO reserva_maestra
         (codigo, pagador_cliente_id, fecha_entrada, fecha_salida, estado, notas)
       VALUES ($1, $2, $3::date, $4::date, 'CONFIRMADA', $5)
       RETURNING id`,
      [
        codigoMaestra,
        pagadorId,
        datos.fecha_entrada,
        datos.fecha_salida,
        datos.notas ?? null,
      ]
    );

    const maestraId = maestra.rows[0]?.id;
    if (!maestraId) throw new Error('No se pudo crear la reserva maestra');

    const hijas = [];
    for (const item of cotizaciones) {
      const secuencia = await tx.query<{ n: string }>("SELECT nextval('reserva_codigo_seq') AS n");
      const consecutivo = String(secuencia.rows[0]?.n ?? '0').padStart(4, '0');
      const codigo = `R-${datos.fecha_entrada.replaceAll('-', '')}-${consecutivo}`;

      const reserva = await tx.query<{ id: number }>(
        `INSERT INTO reserva
           (codigo, titular_cliente_id, fecha_entrada, fecha_salida, modalidad, estado,
            temporada, escenario, total, saldo, notas, incluye_desayuno, desayuno_modo,
            desayunos_pax, desayunos_total, total_desayuno, tarifa_plan,
            tarifa_negociada, tarifa_motivo, maestra_id, origen_reserva)
         VALUES ($1, $2, $3::date, $4::date, 'NOCHE', 'CONFIRMADA', 'BAJA', 'NORMAL',
                 $5, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING id`,
        [
          codigo,
          pagadorId,
          datos.fecha_entrada,
          datos.fecha_salida,
          item.total,
          datos.notas ?? null,
          item.desayuno === 'INCLUIDO',
          item.desayuno,
          item.desayuno === 'NO' ? 0 : item.pax,
          item.desayuno === 'NO' ? 0 : item.pax * noches,
          item.totalDesayuno,
          tarifaCliente?.plan ?? 'PUBLICA',
          tarifaCliente?.precio_noche ?? null,
          tarifaCliente ? `Tarifa ${tarifaCliente.plan} del pagador` : null,
          maestraId,
          datos.origen_reserva ?? null,
        ]
      );

      const reservaId = reserva.rows[0]?.id;
      if (!reservaId) throw new Error('No se pudo crear una reserva del grupo');

      await tx.query(
        `INSERT INTO reserva_habitacion
           (reserva_id, habitacion_id, pax, clima, precio_noche, fecha_entrada, fecha_salida, estado,
            huesped_nombre, huesped_documento)
         VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, 'ACTIVA', $8, $9)`,
        [
          reservaId,
          item.habitacion_id,
          item.pax,
          item.cotizacion.habitacion.clima,
          item.precioNoche,
          datos.fecha_entrada,
          datos.fecha_salida,
          item.huesped_nombre ?? null,
          item.huesped_documento ?? null,
        ]
      );

      hijas.push({
        id: reservaId,
        codigo,
        habitacion: item.cotizacion.habitacion.numero,
        habitacion_id: item.habitacion_id,
        pax: item.pax,
        total: item.total,
        saldo: item.total,
      });
    }

    return {
      maestra: {
        id: maestraId,
        codigo: codigoMaestra,
        pagador_cliente_id: pagadorId,
        pagador: datos.cliente.nombre,
        fecha_entrada: datos.fecha_entrada,
        fecha_salida: datos.fecha_salida,
        noches,
        total: totalGrupo,
        habitaciones: hijas.length,
      },
      reservas: hijas,
    };
  });

  res.status(201).json(resultado);
});

reservasRouter.get('/maestra/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Reserva maestra inválida' });
    return;
  }

  const maestra = await db.query(
    `SELECT rm.id, rm.codigo, rm.estado, rm.created_at, rm.fecha_entrada, rm.fecha_salida,
            rm.notas, c.id AS pagador_cliente_id, c.razon_social AS pagador,
            c.tipo AS pagador_tipo, c.tipo_documento, c.numero_documento,
            c.telefono, c.email, c.tarifa_plan
     FROM reserva_maestra rm
     JOIN cliente c ON c.id = rm.pagador_cliente_id
     WHERE rm.id = $1`,
    [id]
  );

  if (!maestra.rows[0]) {
    res.status(404).json({ error: 'Reserva maestra no encontrada' });
    return;
  }

  const hijas = await db.query(
    `SELECT r.id, r.codigo, r.estado, r.total, r.saldo,
            rh.pax, rh.precio_noche, rh.huesped_nombre, rh.huesped_documento,
            h.numero AS habitacion, h.id AS habitacion_id
     FROM reserva r
     JOIN reserva_habitacion rh ON rh.reserva_id = r.id
     JOIN habitacion h ON h.id = rh.habitacion_id
     WHERE r.maestra_id = $1
     ORDER BY h.numero`,
    [id]
  );

  res.json({ maestra: maestra.rows[0], reservas: hijas.rows });
});

reservasRouter.post('/maestra/:id/cancelar', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Reserva maestra inválida' });
    return;
  }

  const hijas = await db.query<{ id: number; estado: string }>(
    'SELECT id, estado FROM reserva WHERE maestra_id = $1',
    [id]
  );

  if (hijas.rows.length === 0) {
    res.status(404).json({ error: 'Reserva maestra no encontrada' });
    return;
  }

  if (hijas.rows.some((item) => !['PENDIENTE', 'CONFIRMADA'].includes(item.estado))) {
    res.status(409).json({ error: 'El grupo ya inició; no se puede cancelar completo' });
    return;
  }

  await db.transaction(async (tx) => {
    await tx.query(
      "UPDATE reserva SET estado = 'CANCELADA' WHERE maestra_id = $1",
      [id]
    );
    await tx.query(
      `UPDATE reserva_habitacion SET estado = 'CANCELADA'
       WHERE reserva_id IN (SELECT id FROM reserva WHERE maestra_id = $1)`,
      [id]
    );
    await tx.query("UPDATE reserva_maestra SET estado = 'CANCELADA' WHERE id = $1", [id]);
  });

  res.json({ ok: true });
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
  motivo_visita: z.string().trim().max(120).optional(),
  como_llego: z.string().trim().max(60).optional(),
  placa_vehiculo: z.string().trim().max(20).optional(),
  origen_reserva: z
    .enum(['WHATSAPP', 'TELEFONO', 'DIRECTO', 'CORREO', 'WEB', 'OTA'])
    .optional(),
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
    tarifa_plan: string;
    tarifa_negociada: string | null;
  }>(
    `SELECT r.id, r.estado, r.fecha_entrada, r.fecha_salida, r.total_desayuno,
            r.temporada, r.escenario, r.tarifa_plan, r.tarifa_negociada,
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

  const precioNoche =
    reserva.tarifa_plan !== 'PUBLICA' && reserva.tarifa_negociada
      ? Number(reserva.tarifa_negociada)
      : Number(cotizacion.cotizacion.precio);
  const totalAlojamiento = precioNoche * noches;
  const desayunosPax = desayuno === 'NO' ? 0 : pax;
  const desayunosTotal = desayuno === 'NO' ? 0 : pax * noches;
  const totalDesayuno = desayuno === 'PAGADO' ? desayunosTotal * 15_000 : 0;
  const total = totalAlojamiento + totalDesayuno;

  await db.transaction(async (tx) => {
    await tx.query(
      `UPDATE reserva
       SET fecha_entrada = $1::date, fecha_salida = $2::date, total = $3,
           saldo = GREATEST(0, $3 - anticipo),
           notas = COALESCE($4, notas), incluye_desayuno = $5, desayuno_modo = $6,
           desayunos_pax = $7, desayunos_total = $8, total_desayuno = $9,
           temporada = $10, escenario = $11,
           motivo_visita = COALESCE($12, motivo_visita),
           como_llego = COALESCE($13, como_llego),
           placa_vehiculo = COALESCE($14, placa_vehiculo),
           origen_reserva = COALESCE($15, origen_reserva)
       WHERE id = $16`,
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
        parsed.data.motivo_visita ?? null,
        parsed.data.como_llego ?? null,
        parsed.data.placa_vehiculo ?? null,
        parsed.data.origen_reserva ?? null,
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
  pagos: z
    .array(
      z.object({
        monto: z.coerce.number().min(0),
        metodo_pago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO']),
        tipo_documento: z.enum(['NINGUNO', 'RECIBO_CAJA', 'FACTURA_ELECTRONICA']).default('NINGUNO'),
        notas: z.string().trim().max(300).optional(),
      })
    )
    .min(1)
    .max(5)
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
    anticipo: string;
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
    huesped_nombre: string | null;
    huesped_documento: string | null;
  }>(
    `SELECT r.id, r.codigo, r.estado, r.fecha_entrada, r.fecha_salida, r.total,
            r.total_desayuno, r.anticipo, r.desayuno_modo, r.desayunos_pax, r.desayunos_total,
            c.id AS cliente_id, c.razon_social AS cliente, c.tipo_documento,
            c.numero_documento, c.telefono, c.email,
            rh.id AS rh_id, rh.habitacion_id, h.numero, rh.pax, rh.precio_noche, rh.clima,
            rh.huesped_nombre, rh.huesped_documento
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
  const anticipo = Number(reserva.anticipo);
  const noches = calcularNoches(fechaTexto(reserva.fecha_entrada), fechaTexto(reserva.fecha_salida));
  const pagos = parsed.data.pagos?.length
    ? parsed.data.pagos
    : parsed.data.pago
      ? [parsed.data.pago]
      : [];
  const montoPagado = pagos.reduce((suma, pago) => suma + pago.monto, 0);

  if (montoPagado > total - anticipo) {
    res.status(400).json({ error: 'Los pagos no pueden ser mayores al saldo pendiente' });
    return;
  }

  if (pagos.some((pago) => pago.metodo_pago === 'CREDITO' && pago.monto > 0)) {
    res.status(400).json({ error: 'Un pago a crédito no puede tener monto' });
    return;
  }

  let sesionCajaId: number | null = null;
  if (pagos.some((pago) => pago.metodo_pago === 'EFECTIVO' && pago.monto > 0)) {
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

  const saldo = total - anticipo - montoPagado;

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
        reserva.huesped_nombre ?? reserva.cliente,
        reserva.tipo_documento,
        reserva.huesped_documento ?? reserva.numero_documento,
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

    if (anticipo > 0) {
      const anticipoCobro = await tx.query<{ id: number }>(
        `SELECT id FROM cobro
         WHERE reserva_id = $1 AND es_anticipo = true AND NOT aplicado
         ORDER BY id
         LIMIT 1`,
        [reserva.id]
      );

      const anticipoCobroId = anticipoCobro.rows[0]?.id;
      if (!anticipoCobroId) throw new Error('No se encontró el anticipo de la reserva');

      await tx.query('UPDATE cobro SET folio_id = $1, aplicado = true WHERE id = $2', [
        folioId,
        anticipoCobroId,
      ]);

      await registrarAsiento(tx, {
        descripcion: `Anticipo aplicado ${reserva.codigo}`,
        origenTipo: 'ANTICIPO_APLICADO',
        origenId: anticipoCobroId,
        usuarioId,
        lineas: [
          { cuenta: '2103', debe: anticipo },
          { cuenta: '1103', haber: anticipo },
        ],
      });
    }

    let cobroId: number | null = null;

    for (const pago of pagos) {
      if (pago.monto <= 0) continue;

      const cobro = await tx.query<{ id: number }>(
        `INSERT INTO cobro
           (folio_id, cliente_id, tipo_documento, monto, metodo_pago, sesion_caja_id, usuario_id, notas)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          folioId,
          reserva.cliente_id,
          pago.tipo_documento,
          pago.monto,
          pago.metodo_pago,
          pago.metodo_pago === 'EFECTIVO' ? sesionCajaId : null,
          usuarioId,
          pago.notas ?? null,
        ]
      );

      const cobroActualId = cobro.rows[0]?.id ?? null;
      if (cobroId === null) cobroId = cobroActualId;

      if (cobroActualId && pago.metodo_pago === 'EFECTIVO' && sesionCajaId !== null) {
        await tx.query(
          `INSERT INTO movimiento_caja
             (sesion_caja_id, tipo, monto, referencia_tipo, referencia_id, usuario_id)
           VALUES ($1, 'VENTA_EFECTIVO', $2, 'COBRO', $3, $4)`,
          [sesionCajaId, pago.monto, cobroActualId, usuarioId]
        );
      }

      if (cobroActualId) {
        const cuentaPago = pago.metodo_pago === 'EFECTIVO' ? '1101' : '1102';

        await registrarAsiento(tx, {
          descripcion: `Cobro check-in ${reserva.codigo}`,
          origenTipo: 'COBRO',
          origenId: cobroActualId,
          usuarioId,
          lineas: [
            { cuenta: cuentaPago, debe: pago.monto },
            { cuenta: '1103', haber: pago.monto },
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
    await tx.query(
      `UPDATE reserva_maestra
       SET estado = 'CHECKIN'
       WHERE id = (SELECT maestra_id FROM reserva WHERE id = $1)
         AND estado IN ('PENDIENTE', 'CONFIRMADA')`,
      [reserva.id]
    );
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
        anticipo,
      },
      habitacion: { numero: reserva.numero },
      huesped: { nombre_completo: reserva.cliente },
      folio: { id: folioId, saldo },
      cargos: { alojamiento: totalAlojamiento, desayuno: totalDesayuno },
      cobro: cobroId
        ? { id: cobroId, monto: montoPagado, metodo_pago: pagos[0]?.metodo_pago }
        : null,
    };
  });

  res.status(201).json(resultado);
});
