import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { config } from './config.js';
import { db } from './db.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { checkinRouter } from './modules/checkin/checkin.routes.js';
import { disponibilidadRouter } from './modules/disponibilidad/disponibilidad.routes.js';
import { habitacionesRouter } from './modules/habitaciones/habitaciones.routes.js';
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
app.use('/habitaciones', habitacionesRouter);
app.use('/tarifas', tarifasRouter);
app.use('/disponibilidad', disponibilidadRouter);
app.use('/checkin', checkinRouter);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
};
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`SINMH API en http://localhost:${config.port}`);
});
