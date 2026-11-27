/**
 * Global Ticker Master Importer
 * Seeds the 62 core TICKER_CATALOG assets first, then loads additional global symbols from CSV.
 * Usage: npm run db:import-tickers [-- --csv=scripts/seeds/global_tickers.csv]
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { TickerMasterItem } from '../src/types';
import {
  getSeededCatalogTickers,
  parseCsvLine,
  parseTickerMasterCsv
} from '../src/shared/tickerMetadata';
import { closePool, hasPostgresConfig } from '../src/db/index.ts';
import { PostgresRepository } from '../src/server/store/repository';

export { parseCsvLine, parseTickerMasterCsv };

async function main() {
  if (!hasPostgresConfig()) {
    console.error('[Import Tickers] Missing PostgreSQL configuration (SQL_HOST, SQL_USER, SQL_PASSWORD, SQL_DB_NAME).');
    process.exit(1);
  }

  const csvArg = process.argv.find((arg) => arg.startsWith('--csv='));
  const csvRel = csvArg ? csvArg.slice('--csv='.length) : 'scripts/seeds/global_tickers.csv';
  const csvPath = path.isAbsolute(csvRel) ? csvRel : path.resolve(process.cwd(), csvRel);

  const repo = new PostgresRepository();
  const catalogItems = getSeededCatalogTickers();
  const catalogRes = await repo.upsertTickers(catalogItems);
  console.log(`[Import Tickers] Seeded ${catalogRes.upserted} core catalog tickers.`);

  if (fs.existsSync(csvPath)) {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvItems = parseTickerMasterCsv(csvContent);
    const csvRes = await repo.upsertTickers(csvItems);
    console.log(`[Import Tickers] Upserted ${csvRes.upserted} global tickers from ${csvRel}.`);
  } else {
    console.warn(`[Import Tickers] CSV file not found at ${csvPath}; only core catalog was seeded.`);
  }

  const total = await repo.getAllTickers(false);
  console.log(`[Import Tickers] Total ticker_master rows in PostgreSQL: ${total.length}`);
}

const isEntrypoint = process.argv[1] && process.argv[1].includes('importTickers');
if (isEntrypoint) {
  main()
    .catch((err) => {
      console.error('[Import Tickers] Fatal error:', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closePool();
    });
}
