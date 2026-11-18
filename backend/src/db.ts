import { mkdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { config } from './config.js';

/**
 * PostgreSQL embebido para desarrollo y operación local.
 * En producción se puede cambiar por un PostgreSQL real usando la misma base.
 */
mkdirSync(config.databaseDir, { recursive: true });

export const db = new PGlite(config.databaseDir, {
  extensions: { pgcrypto, btree_gist },
});

await db.waitReady;
