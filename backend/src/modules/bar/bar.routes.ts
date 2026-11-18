import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { registrarAsiento } from '../contabilidad/contabilidad.service.js';

export const barRouter = Router();

barRouter.use(requireAuth);

barRouter.get('/ventas', async (_req, res) => {
  const { rows } = await db.query(
    `SELECT v.id, v.fecha, v.total, v.metodo_pago, v.estado,
            h.numero AS habitacion, cl.razon_social AS cliente
     FROM venta_bar v
     LEFT JOIN folio f ON f.id = v.folio_id
     LEFT JOIN reserva r ON r.id = f.reserva_id
     LEFT JOIN reserva_habitacion rh ON rh.reserva_id = r.id
     LEFT JOIN habitacion h ON h.id = rh.habitacion_id
     LEFT JOIN cliente cl ON cl.id = v.cliente_id
     ORDER BY v.fecha DESC
     LIMIT 100`
  );
  res.json({ ventas: rows });
});

const ventaSchema = z.object({
  items: z
    .array(
      z.object({
        producto_id: z.coerce.number().int().positive(),
        cantidad: z.coerce.number().positive().max(1000),
      })
    )
    .min(1),
  metodo_pago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CARGO_HABITACION']),
  tipo_documento: z
    .enum(['NINGUNO', 'RECIBO_CAJA', 'FACTURA_ELECTRONICA'])
    .default('NINGUNO'),
  folio_id: z.coerce.number().int().positive().optional(),
  cliente_id: z.coerce.number().int().positive().optional(),
  notas: z.string().trim().max(300).optional(),
});

barRouter.post('/ventas', async (req, res) => {
  const parsed = ventaSchema.safeParse(req.body);
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

  if (datos.metodo_pago === 'CARGO_HABITACION' && !datos.folio_id) {
    res.status(400).json({ error: 'Falta el folio para cargar a la habitación' });
    return;
  }

  const centro = await db.query<{ id: number }>(
    "SELECT id FROM centro WHERE codigo = 'BAR_RECEPCION' AND activo = true LIMIT 1"
  );
  const centroId = centro.rows[0]?.id;
  if (!centroId) {
    res.status(500).json({ error: 'No está configurado el centro de bar recepción' });
    return;
  }

  const productos: Array<{
    id: number;
    nombre: string;
    precio_venta: string;
    costo: string;
    stock: string;
    activo: boolean;
  }> = [];

  for (const item of datos.items) {
    const producto = await db.query<{
      id: number;
      nombre: string;
      precio_venta: string;
      costo: string;
      stock: string;
      activo: boolean;
    }>('SELECT id, nombre, precio_venta, costo, stock, activo FROM producto WHERE id = $1', [
      item.producto_id,
    ]);

    const fila = producto.rows[0];
    if (!fila || !fila.activo) {
      res.status(400).json({ error: `Producto no disponible: ${item.producto_id}` });
      return;
    }
    if (Number(fila.stock) < item.cantidad) {
      res.status(400).json({ error: `Stock insuficiente de ${fila.nombre}` });
      return;
    }

    productos.push(fila);
  }

  const total = Math.round(
    datos.items.reduce(
      (suma, item, indice) => suma + Number(productos[indice].precio_venta) * item.cantidad,
      0
    ) * 100
  ) / 100;

  if (total <= 0) {
    res.status(400).json({ error: 'La venta debe tener un valor mayor a cero' });
    return;
  }

  let folio:
    | { id: number; reserva_id: number; saldo: string; responsable_cliente_id: number | null }
    | undefined;

  if (datos.metodo_pago === 'CARGO_HABITACION' && datos.folio_id) {
    const consulta = await db.query<{
      id: number;
      reserva_id: number;
      saldo: string;
      responsable_cliente_id: number | null;
      estado: string;
    }>('SELECT id, reserva_id, saldo, responsable_cliente_id, estado FROM folio WHERE id = $1', [
      datos.folio_id,
    ]);

    const actual = consulta.rows[0];
    if (!actual || actual.estado !== 'ABIERTO') {
      res.status(400).json({ error: 'El folio no está abierto' });
      return;
    }

    folio = actual;
  }

  let sesionCajaId: number | null = null;

  if (datos.metodo_pago === 'EFECTIVO') {
    const caja = await db.query<{ id: number }>(
      `SELECT sc.id
       FROM sesion_caja sc
       JOIN punto_venta pv ON pv.id = sc.punto_venta_id
       WHERE pv.codigo = 'RECEPCION' AND sc.estado = 'ABIERTA'
       LIMIT 1`
    );

    if (!caja.rows[0]) {
      res.status(409).json({ error: 'No hay caja abierta. Abre la caja antes de vender en efectivo.' });
      return;
    }

    sesionCajaId = caja.rows[0].id;
  }

  const resultado = await db.transaction(async (tx) => {
    const venta = await tx.query<{ id: number }>(
      `INSERT INTO venta_bar
         (centro_id, usuario_id, cliente_id, folio_id, total, metodo_pago, tipo_documento,
          sesion_caja_id, estado, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        centroId,
        usuarioId,
        datos.cliente_id ?? null,
        folio?.id ?? null,
        total,
        datos.metodo_pago,
        datos.tipo_documento,
        sesionCajaId,
        datos.metodo_pago === 'CARGO_HABITACION' ? 'CARGADA' : 'PAGADA',
        datos.notas ?? null,
      ]
    );

    const ventaId = venta.rows[0]?.id;
    if (!ventaId) throw new Error('No se pudo crear la venta');

    for (const [indice, item] of datos.items.entries()) {
      const producto = productos[indice];
      const totalLinea = Math.round(Number(producto.precio_venta) * item.cantidad * 100) / 100;

      await tx.query(
        `INSERT INTO venta_bar_detalle
           (venta_id, producto_id, cantidad, precio_unitario, costo_unitario, total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [ventaId, producto.id, item.cantidad, producto.precio_venta, producto.costo, totalLinea]
      );

      await tx.query('UPDATE producto SET stock = stock - $1, updated_at = now() WHERE id = $2', [
        item.cantidad,
        producto.id,
      ]);

      await tx.query(
        `INSERT INTO movimiento_inventario
           (producto_id, tipo, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id)
         VALUES ($1, 'SALIDA', $2, $3, 'VENTA_BAR', $4, $5)`,
        [producto.id, item.cantidad, producto.costo, ventaId, usuarioId]
      );
    }

    const detalleTexto = datos.items
      .map((item, indice) => `${productos[indice].nombre} x${item.cantidad}`)
      .join(', ');

    if (folio) {
      await tx.query(
        `INSERT INTO folio_cargo
           (folio_id, concepto, centro_id, cantidad, precio_unitario, monto, usuario_id)
         VALUES ($1, $2, $3, 1, $4, $4, $5)`,
        [folio.id, `Bar recepción: ${detalleTexto}`, centroId, total, usuarioId]
      );

      await tx.query('UPDATE folio SET saldo = saldo + $1 WHERE id = $2', [total, folio.id]);

      await registrarAsiento(tx, {
        descripcion: `Venta bar a folio ${folio.id}`,
        origenTipo: 'VENTA_BAR',
        origenId: ventaId,
        usuarioId,
        lineas: [
          { cuenta: '1103', debe: total, descripcion: detalleTexto },
          { cuenta: '4102', centro: 'BAR_RECEPCION', haber: total, descripcion: detalleTexto },
        ],
      });

      return { ventaId, total, estado: 'CARGADA', cobroId: null, folioId: folio.id };
    }

    const cobro = await tx.query<{ id: number }>(
      `INSERT INTO cobro
         (folio_id, cliente_id, tipo_documento, monto, metodo_pago, sesion_caja_id, usuario_id, notas)
       VALUES (NULL, $1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        datos.cliente_id ?? null,
        datos.tipo_documento,
        total,
        datos.metodo_pago,
        sesionCajaId,
        usuarioId,
        datos.notas ?? null,
      ]
    );

    const cobroId = cobro.rows[0]?.id ?? null;

    if (cobroId && sesionCajaId !== null) {
      await tx.query(
        `INSERT INTO movimiento_caja
           (sesion_caja_id, tipo, monto, referencia_tipo, referencia_id, usuario_id)
         VALUES ($1, 'VENTA_EFECTIVO', $2, 'COBRO', $3, $4)`,
        [sesionCajaId, total, cobroId, usuarioId]
      );
    }

    const cuentaPago = datos.metodo_pago === 'EFECTIVO' ? '1101' : '1102';

    await registrarAsiento(tx, {
      descripcion: `Venta bar ${ventaId}`,
      origenTipo: 'VENTA_BAR',
      origenId: ventaId,
      usuarioId,
      lineas: [
        { cuenta: cuentaPago, debe: total, descripcion: detalleTexto },
        { cuenta: '4102', centro: 'BAR_RECEPCION', haber: total, descripcion: detalleTexto },
      ],
    });

    return { ventaId, total, estado: 'PAGADA', cobroId, folioId: null };
  });

  res.status(201).json({ venta: resultado });
});
