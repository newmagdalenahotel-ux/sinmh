import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { parse } from 'csv-parse/sync';
import { db } from '../db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const seedsDir = path.resolve(here, '../../../seeds');

type HabitacionCsv = {
  numero: string;
  tipo_uso: string;
  clima: string;
  capacidad_max: string;
  es_suite: string;
  piso: string;
  activo: string;
  notas: string;
  acomodaciones: string;
};

type TarifaCsv = {
  tipo: string;
  temporada: string;
  acomodacion: string;
  escenario: string;
  valor: string;
};

const habitaciones = parse(await readFile(path.join(seedsDir, 'habitaciones.csv'), 'utf8'), {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as HabitacionCsv[];

const tarifas = parse(await readFile(path.join(seedsDir, 'tarifas.csv'), 'utf8'), {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as TarifaCsv[];

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
  ['hora_decision_temporada', '15:00'],
];

const temporadasBase = [
  ['BAJA', 'Temporada baja'],
  ['ALTA', 'Temporada alta'],
  ['UNICA', 'Tarifa única'],
] as const;

const centrosBase = [
  ['ALOJAMIENTO', 'Alojamiento', 'INGRESO'],
  ['BAR_RECEPCION', 'Bar Recepción', 'INGRESO'],
  ['BAR_TERRAZA', 'Bar Terraza', 'INGRESO'],
  ['RESTAURANTE', 'Restaurante', 'INGRESO'],
  ['EVENTOS', 'Eventos', 'INGRESO'],
  ['PISCINA_PASADIA', 'Piscina - Pasadías', 'INGRESO'],
  ['LAVANDERIA', 'Lavandería', 'COSTE'],
  ['TOUR_REPRESA', 'Tour Represa de Prado', 'INGRESO'],
] as const;

const puntosVentaBase = [['RECEPCION', 'Recepción', 'ALOJAMIENTO']] as const;

const cuentasBase = [
  ['1101', 'Caja', 'ACTIVO'],
  ['1102', 'Bancos', 'ACTIVO'],
  ['1103', 'Cuentas por cobrar', 'ACTIVO'],
  ['1104', 'Inventario', 'ACTIVO'],
  ['2101', 'IVA por pagar', 'PASIVO'],
  ['2102', 'Cuentas por pagar proveedores', 'PASIVO'],
  ['2103', 'Ingreso diferido', 'PASIVO'],
  ['3101', 'Patrimonio', 'PATRIMONIO'],
  ['3102', 'Retiros del socio', 'PATRIMONIO'],
  ['4101', 'Ingreso Alojamiento', 'INGRESO'],
  ['4102', 'Ingreso Bar Recepción', 'INGRESO'],
  ['4103', 'Ingreso Bar Terraza', 'INGRESO'],
  ['4104', 'Ingreso Restaurante', 'INGRESO'],
  ['4105', 'Ingreso Eventos', 'INGRESO'],
  ['4106', 'Ingreso Piscina Pasadía', 'INGRESO'],
  ['4107', 'Ingreso Tour Represa', 'INGRESO'],
  ['4108', 'Ingreso Lavandería', 'INGRESO'],
  ['5101', 'Costo Bebidas', 'COSTO'],
  ['5102', 'Costo Alimentos', 'COSTO'],
  ['6101', 'Gasto Lavandería', 'GASTO'],
  ['6102', 'Gasto Servicios', 'GASTO'],
  ['6103', 'Gasto Nómina', 'GASTO'],
  ['6104', 'Gasto Mantenimiento', 'GASTO'],
  ['6105', 'Gasto Administración', 'GASTO'],
  ['6106', 'Gasto Cortesías', 'GASTO'],
] as const;

const productosBase = [
  ['AGUA500', 'Agua 500 ml', 'Bebidas sin alcohol', 3000, 1200, 24, 6],
  ['GASEOSA400', 'Gaseosa 400 ml', 'Bebidas sin alcohol', 4000, 1800, 24, 6],
  ['CERVEZA', 'Cerveza nacional', 'Bebidas alcohólicas', 6000, 3000, 24, 6],
  ['AGUA1L', 'Agua 1 litro', 'Bebidas sin alcohol', 5000, 2000, 12, 4],
  ['SNACK', 'Snack', 'Aperitivos', 3000, 1500, 12, 4],
] as const;

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

  for (const [codigo, nombre] of temporadasBase) {
    await tx.query(
      'INSERT INTO temporada (codigo, nombre) VALUES ($1, $2) ON CONFLICT (codigo) DO NOTHING',
      [codigo, nombre]
    );
  }

  for (const [codigo, nombre, tipo] of centrosBase) {
    await tx.query(
      'INSERT INTO centro (codigo, nombre, tipo) VALUES ($1, $2, $3) ON CONFLICT (codigo) DO NOTHING',
      [codigo, nombre, tipo]
    );
  }

  for (const [codigo, nombre, centroCodigo] of puntosVentaBase) {
    await tx.query(
      `INSERT INTO punto_venta (codigo, nombre, centro_id)
       VALUES ($1, $2, (SELECT id FROM centro WHERE codigo = $3))
       ON CONFLICT (codigo) DO NOTHING`,
      [codigo, nombre, centroCodigo]
    );
  }

  for (const [codigo, nombre, tipo] of cuentasBase) {
    await tx.query(
      'INSERT INTO cuenta (codigo, nombre, tipo) VALUES ($1, $2, $3) ON CONFLICT (codigo) DO NOTHING',
      [codigo, nombre, tipo]
    );
  }

  for (const [codigo, nombre, categoria, precioVenta, costo, stock, stockMinimo] of productosBase) {
    await tx.query(
      `INSERT INTO producto
         (codigo, nombre, categoria, precio_venta, costo, stock, stock_minimo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (codigo) DO NOTHING`,
      [codigo, nombre, categoria, precioVenta, costo, stock, stockMinimo]
    );
  }

  const temporadas = new Map(
    (await tx.query<{ id: number; codigo: string }>('SELECT id, codigo FROM temporada')).rows.map(
      (row) => [row.codigo, row.id]
    )
  );

  for (const habitacion of habitaciones) {
    await tx.query(
      `INSERT INTO habitacion
         (numero, tipo_uso, clima, capacidad_max, es_suite, piso, activo, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (numero) DO UPDATE SET
         tipo_uso = EXCLUDED.tipo_uso,
         clima = EXCLUDED.clima,
         capacidad_max = EXCLUDED.capacidad_max,
         es_suite = EXCLUDED.es_suite,
         piso = EXCLUDED.piso,
         activo = EXCLUDED.activo,
         notas = EXCLUDED.notas,
         updated_at = now()`,
      [
        habitacion.numero,
        habitacion.tipo_uso,
        habitacion.clima,
        Number(habitacion.capacidad_max),
        habitacion.es_suite === 'true',
        Number(habitacion.piso),
        habitacion.activo === 'true',
        habitacion.notas,
      ]
    );

    const creada = await tx.query<{ id: number }>('SELECT id FROM habitacion WHERE numero = $1', [
      habitacion.numero,
    ]);
    const habitacionId = creada.rows[0]?.id;

    if (habitacionId) {
      await tx.query('DELETE FROM habitacion_acomodacion WHERE habitacion_id = $1', [habitacionId]);

      for (const pax of habitacion.acomodaciones
        .split(',')
        .map((valor) => valor.trim())
        .filter(Boolean)) {
        await tx.query(
          'INSERT INTO habitacion_acomodacion (habitacion_id, pax) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [habitacionId, Number(pax)]
        );
      }
    }
  }

  for (const tarifa of tarifas) {
    const temporadaId = temporadas.get(tarifa.temporada);
    if (!temporadaId) throw new Error(`Temporada desconocida: ${tarifa.temporada}`);

    await tx.query(
      `INSERT INTO tarifa (tipo_clima, temporada_id, acomodacion, escenario, valor)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tipo_clima, temporada_id, acomodacion, escenario)
       DO UPDATE SET valor = EXCLUDED.valor`,
      [tarifa.tipo, temporadaId, Number(tarifa.acomodacion), tarifa.escenario, Number(tarifa.valor)]
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

console.log(`Semilla aplicada: ${habitaciones.length} habitaciones y ${tarifas.length} tarifas.`);
console.log(`Usuario: ${adminUsername}`);
console.log(`Contraseña: ${adminPassword} (cambiar en producción)`);
await db.close();
