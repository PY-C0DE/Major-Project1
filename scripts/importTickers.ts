/**
 * Global Ticker Master Importer
 * Seeds the 62 core TICKER_CATALOG assets first, then loads additional global symbols from CSV.
 * Usage: npm run db:import-tickers [-- --csv=scripts/seeds/global_tickers.csv]
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { TickerMasterItem } from '../src/types';
import { getSeededCatalogTickers } from '../src/shared/tickerMetadata';
import { closePool, hasPostgresConfig } from '../src/db/index.ts';
import { PostgresRepository } from '../src/server/store/repository';

export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseTickerMasterCsv(csvContent: string): TickerMasterItem[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (lines.length <= 1) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const colIndex = new Map<string, number>();
  header.forEach((col, idx) => colIndex.set(col, idx));

  const items: TickerMasterItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const get = (key: string) => {
      const idx = colIndex.get(key);
      return idx !== undefined ? (cols[idx] || '').trim() : '';
    };

    const symbol = get('symbol').toUpperCase();
    const name = get('name');
    if (!symbol || !name) continue;

    const aliasesRaw = get('aliases');
    const aliases = aliasesRaw
      ? aliasesRaw
          .split('|')
          .map((a) => a.trim())
          .filter(Boolean)
      : [];

    items.push({
      symbol,
      name,
      exchange: get('exchange') || 'XNAS',
      exchangeCode: get('exchangeCode') || get('exchange') || 'NASDAQ',
      country: get('country') || 'US',
      currency: get('currency') || 'USD',
      timezone: get('timezone') || 'America/New_York',
      assetType: get('assetType') || 'EQUITY',
      sector: get('sector') || 'Global Equities',
      pe: null,
      marketCap: null,
      basePrice: null,
      aliases,
      active: get('active').toLowerCase() !== 'false'
    });
  }

  return items;
}

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
