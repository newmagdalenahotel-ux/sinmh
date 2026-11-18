import bcrypt from 'bcryptjs';
import { db } from '../db.js';

const roles = [
  ['ADMIN', 'Administrador'],
  ['GERENTE', 'Gerente'],
  ['RECEPCION', 'Recepcionista'],
  ['CAJERO', 'Cajero'],
] as const;

const configuracion: Array<[string, string]> = [
  ['hotel_nombre', 'Hotel New Magdalena'],
  ['hotel_nit', '901.088.516-5'],
  ['moneda', 'COP'],
  ['zona_horaria', 'America/Bogota'],
  ['desayuno_precio', '15000'],
  ['temporada_umbral', '15'],
];

const adminUsername = 'admin';
const adminPassword = 'admin123';

await db.transaction(async (tx) => {
  for (const [codigo, nombre] of roles) {
    await tx.query(
      'INSERT INTO rol (codigo, nombre) VALUES ($1, $2) ON CONFLICT (codigo) DO NOTHING',
      [codigo, nombre]
    );
  }

  for (const [clave, valor] of configuracion) {
    await tx.query(
      'INSERT INTO configuracion (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO NOTHING',
      [clave, valor]
    );
  }

  const rolAdmin = await tx.query<{ id: number }>('SELECT id FROM rol WHERE codigo = $1', ['ADMIN']);
  const rolId = rolAdmin.rows[0]?.id;
  if (!rolId) throw new Error('No se encontró el rol ADMIN');

  const existente = await tx.query<{ id: number }>('SELECT id FROM usuario WHERE username = $1', [
    adminUsername,
  ]);

  let usuarioId = existente.rows[0]?.id;

  if (!usuarioId) {
    const hash = await bcrypt.hash(adminPassword, 12);
    const creado = await tx.query<{ id: number }>(
      `INSERT INTO usuario (username, nombre_completo, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [adminUsername, 'Administrador', 'admin@hotel.local', hash]
    );
    usuarioId = creado.rows[0]?.id;
  }

  if (!usuarioId) throw new Error('No se pudo crear el usuario admin');

  await tx.query(
    'INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [usuarioId, rolId]
  );
});

console.log('Semilla aplicada.');
console.log(`Usuario: ${adminUsername}`);
console.log(`Contraseña: ${adminPassword} (cambiar en producción)`);
await db.close();
