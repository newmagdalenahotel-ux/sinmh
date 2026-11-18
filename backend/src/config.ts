import 'dotenv/config';
import path from 'node:path';

const databaseDir = process.env.DATABASE_DIR ?? './.data/pglite';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  databaseDir: path.resolve(process.cwd(), databaseDir),
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
