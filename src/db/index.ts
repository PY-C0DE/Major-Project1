import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

export type AlphaQuantDrizzleDb = NodePgDatabase<typeof schema>;

let poolInstance: Pool | null = null;
let dbInstance: AlphaQuantDrizzleDb | null = null;

export function hasPostgresConfig(): boolean {
  return Boolean(
    process.env.SQL_HOST?.trim() &&
      process.env.SQL_USER?.trim() &&
      process.env.SQL_DB_NAME?.trim()
  );
}

export function createPool(): Pool {
  if (!hasPostgresConfig()) {
    throw new Error(
      'PostgreSQL configuration missing: SQL_HOST, SQL_USER, SQL_PASSWORD, and SQL_DB_NAME are required.'
    );
  }
  const pool = new Pool({
    host: process.env.SQL_HOST,
    port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD || '',
    database: process.env.SQL_DB_NAME,
    max: 10,
    connectionTimeoutMillis: 15000,
    ssl: process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool client error:', err);
  });
  return pool;
}

export function getPool(): Pool {
  if (!poolInstance) {
    poolInstance = createPool();
  }
  return poolInstance;
}

export function getDb(): AlphaQuantDrizzleDb {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

export async function closePool(): Promise<void> {
  if (poolInstance) {
    const closing = poolInstance;
    poolInstance = null;
    dbInstance = null;
    await closing.end();
  }
}
