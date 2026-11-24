/**
 * One-off Idempotent Migration Script: Import Legacy JSON Store -> PostgreSQL
 * Usage: npm run db:import-json [-- --file=data/alphaquant_store.json]
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { closePool, hasPostgresConfig } from '../src/db/index.ts';
import { LegacyJsonSnapshot, PostgresRepository } from '../src/server/store/repository';

async function main() {
  const fileArg = process.argv.find((arg) => arg.startsWith('--file='));
  const targetRel = fileArg ? fileArg.slice('--file='.length) : process.env.ALPHAQUANT_STORE_PATH || 'data/alphaquant_store.json';
  const targetPath = path.isAbsolute(targetRel) ? targetRel : path.resolve(process.cwd(), targetRel);

  if (!hasPostgresConfig()) {
    console.error('[Import JSON] Missing PostgreSQL configuration (SQL_HOST, SQL_USER, SQL_PASSWORD, SQL_DB_NAME).');
    process.exit(1);
  }

  if (!fs.existsSync(targetPath)) {
    console.log(`[Import JSON] No JSON store found at ${targetPath}. Nothing to import.`);
    return;
  }

  const raw = fs.readFileSync(targetPath, 'utf8');
  if (!raw.trim()) {
    console.log(`[Import JSON] File ${targetPath} is empty. Nothing to import.`);
    return;
  }

  const snapshot: LegacyJsonSnapshot = JSON.parse(raw);
  const repo = new PostgresRepository();
  const counts = await repo.importSnapshot(snapshot);

  console.log('[Import JSON] Migration complete (idempotent on existing keys):');
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch((err) => {
    console.error('[Import JSON] Fatal error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
