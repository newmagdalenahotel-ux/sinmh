import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, '../../migrations');

await db.exec(`
  CREATE TABLE IF NOT EXISTS migracion (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(200) UNIQUE NOT NULL,
    aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`);

const files = (await readdir(migrationsDir))
  .filter((file) => file.endsWith('.sql'))
  .sort();

const aplicadas = new Set(
  (await db.query<{ nombre: string }>('SELECT nombre FROM migracion')).rows.map((row) => row.nombre)
);

for (const file of files) {
  if (aplicadas.has(file)) {
    console.log(`= ${file} (ya aplicada)`);
    continue;
  }

  const sql = await readFile(path.join(migrationsDir, file), 'utf8');

  await db.transaction(async (tx) => {
    await tx.exec(sql);
    await tx.query('INSERT INTO migracion (nombre) VALUES ($1)', [file]);
  });

  console.log(`+ ${file}`);
}

console.log('Migraciones al día.');
await db.close();
