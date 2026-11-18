import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { config } from './config.js';
import { db } from './db.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { barRouter } from './modules/bar/bar.routes.js';
import { cajaRouter } from './modules/caja/caja.routes.js';
import { catalogosRouter } from './modules/catalogos/catalogos.routes.js';
import { checkinRouter } from './modules/checkin/checkin.routes.js';
import { cobrosRouter } from './modules/cobros/cobros.routes.js';
import { disponibilidadRouter } from './modules/disponibilidad/disponibilidad.routes.js';
import { foliosRouter } from './modules/folios/folios.routes.js';
import { habitacionesRouter } from './modules/habitaciones/habitaciones.routes.js';
import { productosRouter } from './modules/productos/productos.routes.js';
import { reportesRouter } from './modules/reportes/reportes.routes.js';
import { reservasRouter } from './modules/reservas/reservas.routes.js';
import { tarifasRouter } from './modules/tarifas/tarifas.routes.js';

const app = express();

// En desarrollo se permite el frontend local; en producción se restringe.
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', servicio: 'sinmh-backend', base: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', base: 'no disponible' });
  }
});

app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/catalogos', catalogosRouter);
app.use('/habitaciones', habitacionesRouter);
app.use('/tarifas', tarifasRouter);
app.use('/disponibilidad', disponibilidadRouter);
app.use('/checkin', checkinRouter);
app.use('/caja', cajaRouter);
app.use('/cobros', cobrosRouter);
app.use('/productos', productosRouter);
app.use('/reservas', reservasRouter);
app.use('/bar', barRouter);
app.use('/folios', foliosRouter);
app.use('/reportes', reportesRouter);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
};
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`SINMH API en http://localhost:${config.port}`);
});
