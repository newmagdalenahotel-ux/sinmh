import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { db } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';

export const cobrosRouter = Router();

cobrosRouter.use(requireAuth);

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatoFecha(valor: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor));
}

cobrosRouter.get('/:id/recibo', async (req, res) => {
  const cobroId = Number(req.params.id);
  if (!Number.isInteger(cobroId) || cobroId <= 0) {
    res.status(400).json({ error: 'Cobro inválido' });
    return;
  }

  const consulta = await db.query<{
    id: number;
    monto: string;
    metodo_pago: string;
    tipo_documento: string;
    fecha: string;
    notas: string | null;
    razon_social: string | null;
    numero_documento: string | null;
    folio_id: number | null;
    codigo: string | null;
    habitacion: string | null;
    huesped: string | null;
  }>(
    `SELECT c.id, c.monto, c.metodo_pago, c.tipo_documento, c.fecha, c.notas,
            cl.razon_social, cl.numero_documento,
            f.id AS folio_id, r.codigo, h.numero AS habitacion,
            hu.nombre_completo AS huesped
     FROM cobro c
     LEFT JOIN cliente cl ON cl.id = c.cliente_id
     LEFT JOIN folio f ON f.id = c.folio_id
     LEFT JOIN reserva r ON r.id = f.reserva_id
     LEFT JOIN reserva_habitacion rh ON rh.reserva_id = r.id
     LEFT JOIN habitacion h ON h.id = rh.habitacion_id
     LEFT JOIN huesped hu ON hu.reserva_habitacion_id = rh.id AND hu.es_titular
     WHERE c.id = $1`,
    [cobroId]
  );

  const cobro = consulta.rows[0];
  if (!cobro) {
    res.status(404).json({ error: 'Cobro no encontrado' });
    return;
  }

  const configuracion = await db.query<{ clave: string; valor: string }>(
    "SELECT clave, valor FROM configuracion WHERE clave IN ('hotel_nombre', 'hotel_nit')"
  );
  const config = Object.fromEntries(configuracion.rows.map((fila) => [fila.clave, fila.valor]));

  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="recibo-${cobroId}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).text(config.hotel_nombre ?? 'Hotel New Magdalena', { align: 'center' });
  doc.fontSize(9).text(`NIT ${config.hotel_nit ?? ''}`, { align: 'center' });
  doc.moveDown(0.8);
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor('#c8a96e')
    .lineWidth(1)
    .stroke();
  doc.moveDown(1.2);

  doc.fontSize(14).text('RECIBO DE CAJA', { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(10).text(`Recibo No. ${cobro.id}`);
  doc.text(`Fecha: ${formatoFecha(cobro.fecha)}`);
  doc.text(`Cliente: ${cobro.razon_social ?? cobro.huesped ?? 'Consumidor final'}`);
  if (cobro.numero_documento) doc.text(`Documento: ${cobro.numero_documento}`);
  if (cobro.codigo) doc.text(`Reserva: ${cobro.codigo}`);
  if (cobro.habitacion) doc.text(`Habitación: ${cobro.habitacion}`);
  doc.moveDown(1);

  doc.fontSize(11).text(`Total: ${formatoMoneda(Number(cobro.monto))}`, { align: 'right' });
  doc.text(`Método de pago: ${cobro.metodo_pago}`, { align: 'right' });
  doc.text(`Documento: ${cobro.tipo_documento}`, { align: 'right' });

  if (cobro.notas) {
    doc.moveDown(1);
    doc.fontSize(9).text(`Notas: ${cobro.notas}`);
  }

  doc.moveDown(2);
  doc.fontSize(9).fillColor('#7a7a7a').text('Gracias por su visita.', { align: 'center' });

  doc.end();
});
