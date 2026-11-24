import fs from 'fs';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

export type AlphaQuantDrizzleDb = NodePgDatabase<typeof schema>;

let poolInstance: Pool | null = null;
let dbInstance: AlphaQuantDrizzleDb | null = null;

export interface PostgresSslConfig {
  rejectUnauthorized: boolean;
  ca?: string;
}

const LOCAL_POSTGRES_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres']);

function readOptionalCaCertificate(caInput?: string): string | undefined {
  const trimmed = caInput?.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes('BEGIN CERTIFICATE')) {
    return trimmed.replace(/\\n/g, '\n');
  }
  if (fs.existsSync(trimmed)) {
    return fs.readFileSync(trimmed, 'utf8');
  }
  return trimmed;
}

/**
 * Resolves PostgreSQL TLS settings safely:
 * - Verifies server certificates (`rejectUnauthorized: true`) by default whenever SSL is enabled
 *   or when connecting to a remote TCP host.
 * - Requires an explicit override (`SQL_SSL_REJECT_UNAUTHORIZED=false` or `SQL_SSL=no-verify`)
 *   to disable certificate verification, emitting a security warning when active.
 */
export function resolvePostgresSslConfig(
  env: Record<string, string | undefined> = process.env,
  warn: (message: string) => void = (msg) => console.warn(msg)
): false | PostgresSslConfig {
  const rawSsl = (env.SQL_SSL || '').trim().toLowerCase();
  const host = (env.SQL_HOST || '').trim();

  if (rawSsl === 'false' || rawSsl === 'disable' || rawSsl === '0') {
    return false;
  }

  const isUnixSocket = host.startsWith('/');
  if (isUnixSocket) {
    // PostgreSQL does not support in-band TLS over AF_UNIX domain sockets
    // (Cloud SQL Auth Proxy handles mTLS/IAM encryption at the socket proxy layer).
    return false;
  }

  const isLocalHost = !host || LOCAL_POSTGRES_HOSTS.has(host.toLowerCase());
  const explicitlyEnabled =
    rawSsl === 'true' ||
    rawSsl === 'require' ||
    rawSsl === 'verify-ca' ||
    rawSsl === 'verify-full' ||
    rawSsl === 'no-verify' ||
    rawSsl === '1';

  const sslActive = explicitlyEnabled || (!rawSsl && !isLocalHost);
  if (!sslActive) {
    return false;
  }

  const ca = readOptionalCaCertificate(env.SQL_SSL_CA);
  const rawReject = (env.SQL_SSL_REJECT_UNAUTHORIZED || '').trim().toLowerCase();
  const disableVerification = rawReject === 'false' || rawReject === '0' || rawSsl === 'no-verify';

  if (disableVerification) {
    warn(
      '⚠️ [SECURITY WARNING] PostgreSQL TLS certificate verification is disabled (rejectUnauthorized: false). Use SQL_SSL_CA or verified certificates in production.'
    );
    return ca ? { rejectUnauthorized: false, ca } : { rejectUnauthorized: false };
  }

  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
}

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
    ssl: resolvePostgresSslConfig(process.env)
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
