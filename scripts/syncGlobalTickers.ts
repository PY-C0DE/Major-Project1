/**
 * Global Ticker Universe Synchronizer (ITEM 5)
 *
 * Downloads freely licensed MIT equity metadata CSVs from JerBouma/FinanceDatabase
 * across 38 global exchanges, prioritizes Large/Mid-Cap equities alongside a small sample
 * of delisted equities (`active=false`), preserves curated aliases from the existing seed,
 * and writes `scripts/seeds/global_tickers.csv`.
 *
 * Source: JerBouma/FinanceDatabase (MIT License)
 * Usage: npx tsx scripts/syncGlobalTickers.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { TICKER_CATALOG } from '../src/shared/tickerCatalog';
import {
  EXCHANGE_MIC_MAP,
  parseCsvLine,
  parseTickerMasterCsv
} from '../src/shared/tickerMetadata';
import { TickerMasterItem } from '../src/types';

interface ExchangeFeedSpec {
  fdCode: string;
  mic: string;
  expectedSuffix: string;
  targetActive: number;
  targetDelisted: number;
}

const EXCHANGE_FEEDS: ExchangeFeedSpec[] = [
  { fdCode: 'NMS', mic: 'XNAS', expectedSuffix: '', targetActive: 110, targetDelisted: 2 },
  { fdCode: 'NYQ', mic: 'XNYS', expectedSuffix: '', targetActive: 110, targetDelisted: 2 },
  { fdCode: 'NSI', mic: 'XNSE', expectedSuffix: '.NS', targetActive: 90, targetDelisted: 1 },
  { fdCode: 'BSE', mic: 'XBOM', expectedSuffix: '.BO', targetActive: 40, targetDelisted: 1 },
  { fdCode: 'LSE', mic: 'XLON', expectedSuffix: '.L', targetActive: 70, targetDelisted: 2 },
  { fdCode: 'GER', mic: 'XETR', expectedSuffix: '.DE', targetActive: 60, targetDelisted: 2 },
  { fdCode: 'PAR', mic: 'XPAR', expectedSuffix: '.PA', targetActive: 50, targetDelisted: 1 },
  { fdCode: 'AMS', mic: 'XAMS', expectedSuffix: '.AS', targetActive: 35, targetDelisted: 1 },
  { fdCode: 'BRU', mic: 'XBRU', expectedSuffix: '.BR', targetActive: 30, targetDelisted: 1 },
  { fdCode: 'LIS', mic: 'XLIS', expectedSuffix: '.LS', targetActive: 25, targetDelisted: 1 },
  { fdCode: 'ISE', mic: 'XDUB', expectedSuffix: '.IR', targetActive: 20, targetDelisted: 1 },
  { fdCode: 'VIE', mic: 'XWBO', expectedSuffix: '.VI', targetActive: 25, targetDelisted: 1 },
  { fdCode: 'WSE', mic: 'XWAR', expectedSuffix: '.WA', targetActive: 30, targetDelisted: 1 },
  { fdCode: 'IST', mic: 'XIST', expectedSuffix: '.IS', targetActive: 35, targetDelisted: 1 },
  { fdCode: 'EBS', mic: 'XSWX', expectedSuffix: '.SW', targetActive: 45, targetDelisted: 1 },
  { fdCode: 'MCE', mic: 'XMAD', expectedSuffix: '.MC', targetActive: 35, targetDelisted: 1 },
  { fdCode: 'MIL', mic: 'XMIL', expectedSuffix: '.MI', targetActive: 40, targetDelisted: 1 },
  { fdCode: 'CPH', mic: 'XCSE', expectedSuffix: '.CO', targetActive: 30, targetDelisted: 1 },
  { fdCode: 'STO', mic: 'XSTO', expectedSuffix: '.ST', targetActive: 40, targetDelisted: 1 },
  { fdCode: 'HEL', mic: 'XHEL', expectedSuffix: '.HE', targetActive: 30, targetDelisted: 1 },
  { fdCode: 'OSL', mic: 'XOSL', expectedSuffix: '.OL', targetActive: 30, targetDelisted: 1 },
  { fdCode: 'JPX', mic: 'XTKS', expectedSuffix: '.T', targetActive: 80, targetDelisted: 2 },
  { fdCode: 'HKG', mic: 'XHKG', expectedSuffix: '.HK', targetActive: 60, targetDelisted: 2 },
  { fdCode: 'KSC', mic: 'XKRX', expectedSuffix: '.KS', targetActive: 60, targetDelisted: 2 },
  { fdCode: 'KOE', mic: 'XKOS', expectedSuffix: '.KQ', targetActive: 35, targetDelisted: 1 },
  { fdCode: 'TAI', mic: 'XTAI', expectedSuffix: '.TW', targetActive: 50, targetDelisted: 1 },
  { fdCode: 'SHH', mic: 'XSHG', expectedSuffix: '.SS', targetActive: 50, targetDelisted: 1 },
  { fdCode: 'SHZ', mic: 'XSHE', expectedSuffix: '.SZ', targetActive: 50, targetDelisted: 1 },
  { fdCode: 'TOR', mic: 'XTSE', expectedSuffix: '.TO', targetActive: 60, targetDelisted: 2 },
  { fdCode: 'ASX', mic: 'XASX', expectedSuffix: '.AX', targetActive: 60, targetDelisted: 2 },
  { fdCode: 'NZE', mic: 'XNZE', expectedSuffix: '.NZ', targetActive: 25, targetDelisted: 1 },
  { fdCode: 'SES', mic: 'XSES', expectedSuffix: '.SI', targetActive: 35, targetDelisted: 1 },
  { fdCode: 'KLS', mic: 'XKLS', expectedSuffix: '.KL', targetActive: 35, targetDelisted: 1 },
  { fdCode: 'SET', mic: 'XBKK', expectedSuffix: '.BK', targetActive: 35, targetDelisted: 1 },
  { fdCode: 'SAO', mic: 'BVMF', expectedSuffix: '.SA', targetActive: 45, targetDelisted: 1 },
  { fdCode: 'JNB', mic: 'XJSE', expectedSuffix: '.JO', targetActive: 35, targetDelisted: 1 },
  { fdCode: 'MEX', mic: 'XMEX', expectedSuffix: '.MX', targetActive: 30, targetDelisted: 1 },
  { fdCode: 'JKT', mic: 'XIDX', expectedSuffix: '.JK', targetActive: 40, targetDelisted: 1 }
];

const FD_BASE_URL = 'https://raw.githubusercontent.com/JerBouma/FinanceDatabase/main/database/equities';
const CACHE_DIR = path.resolve(process.cwd(), '.cache/datasets/financedatabase');
const OUT_CSV = path.resolve(process.cwd(), 'scripts/seeds/global_tickers.csv');

function escapeCsvField(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

async function fetchFinanceDbCsv(fdCode: string): Promise<string> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cacheFile = path.join(CACHE_DIR, `${fdCode}.csv`);
  if (fs.existsSync(cacheFile)) {
    const cached = fs.readFileSync(cacheFile, 'utf8');
    if (cached.trim().length > 100) {
      return cached;
    }
  }
  const url = `${FD_BASE_URL}/${fdCode}.csv`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AlphaQuant-GlobalTickerSync/1.0' }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  const text = await res.text();
  fs.writeFileSync(cacheFile, text, 'utf8');
  return text;
}

function marketCapRank(cap: string): number {
  const c = cap.toLowerCase();
  if (c.includes('mega')) return 0;
  if (c.includes('large')) return 1;
  if (c.includes('mid')) return 2;
  if (c.includes('small')) return 3;
  if (c.includes('micro')) return 4;
  return 5;
}

function isCleanEquitySymbol(symbol: string, expectedSuffix: string): boolean {
  if (!symbol || symbol.length > 22) return false;
  if (symbol.includes(' ') || symbol.includes('=')) return false;
  if (expectedSuffix === '') {
    // US equities in FinanceDatabase: allow hyphenated class shares like BRK-B, BF-B; exclude warrants/units/dots
    return /^[A-Z0-9]{1,6}(?:-[A-Z])?$/.test(symbol);
  }
  if (!symbol.endsWith(expectedSuffix)) return false;
  const stem = symbol.slice(0, symbol.length - expectedSuffix.length);
  return /^[A-Z0-9-]{1,14}$/.test(stem);
}

interface ParsedFdRow {
  symbol: string;
  name: string;
  currency: string;
  sector: string;
  industry: string;
  marketCap: string;
  delisted: boolean;
}

function parseFinanceDatabaseCsv(csvText: string, expectedSuffix: string): ParsedFdRow[] {
  const lines = csvText.split(/\r?\n/);
  if (lines.length <= 1) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const idxSym = col('symbol');
  const idxName = col('name');
  const idxCurr = col('currency');
  const idxSector = col('sector');
  const idxIndustry = col('industry');
  const idxCap = col('market_cap');
  const idxDelisted = col('delisted');
  if (idxSym < 0 || idxName < 0) return [];

  const rows: ParsedFdRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCsvLine(line);
    const symbol = (cols[idxSym] || '').trim().toUpperCase();
    const name = (cols[idxName] || '').trim();
    if (!symbol || !name) continue;
    if (!isCleanEquitySymbol(symbol, expectedSuffix)) continue;
    // Skip obvious synthetic/unit/warrant/ADR share noise when name explicitly signals it
    if (/\b(Warrant|Right|Preferred|Pref\.|Units?)\b/i.test(name)) continue;

    rows.push({
      symbol,
      name,
      currency: (idxCurr >= 0 ? cols[idxCurr] : '')?.trim().toUpperCase() || '',
      sector: (idxSector >= 0 ? cols[idxSector] : '')?.trim() || '',
      industry: (idxIndustry >= 0 ? cols[idxIndustry] : '')?.trim() || '',
      marketCap: (idxCap >= 0 ? cols[idxCap] : '')?.trim() || '',
      delisted: (idxDelisted >= 0 ? cols[idxDelisted] : '')?.trim().toLowerCase() === 'true'
    });
  }
  return rows;
}

async function main() {
  const coreSymbols = new Set(TICKER_CATALOG.map((t) => t.ticker.toUpperCase()));

  // Preserve existing curated rows & aliases from scripts/seeds/global_tickers.csv
  const existingMap = new Map<string, TickerMasterItem>();
  if (fs.existsSync(OUT_CSV)) {
    const existingText = fs.readFileSync(OUT_CSV, 'utf8');
    for (const item of parseTickerMasterCsv(existingText)) {
      if (!coreSymbols.has(item.symbol.toUpperCase())) {
        existingMap.set(item.symbol.toUpperCase(), item);
      }
    }
  }

  const finalMap = new Map<string, TickerMasterItem>(existingMap);
  const perExchangeCounts: Record<string, { active: number; delisted: number }> = {};

  for (const spec of EXCHANGE_FEEDS) {
    const micInfo = EXCHANGE_MIC_MAP[spec.mic];
    if (!micInfo) {
      throw new Error(`Missing EXCHANGE_MIC_MAP entry for ${spec.mic}`);
    }

    const csvText = await fetchFinanceDbCsv(spec.fdCode);
    const parsed = parseFinanceDatabaseCsv(csvText, spec.expectedSuffix);

    const activeCandidates = parsed
      .filter((r) => !r.delisted)
      .sort((a, b) => marketCapRank(a.marketCap) - marketCapRank(b.marketCap) || a.symbol.localeCompare(b.symbol));

    const delistedCandidates = parsed
      .filter((r) => r.delisted)
      .sort((a, b) => marketCapRank(a.marketCap) - marketCapRank(b.marketCap) || a.symbol.localeCompare(b.symbol));

    let addedActive = 0;
    let addedDelisted = 0;

    // Count existing curated rows already belonging to this MIC
    for (const existing of finalMap.values()) {
      if (existing.exchange === spec.mic) {
        if (existing.active) addedActive++;
        else addedDelisted++;
      }
    }

    for (const row of activeCandidates) {
      if (addedActive >= spec.targetActive) break;
      if (coreSymbols.has(row.symbol) || finalMap.has(row.symbol)) continue;

      finalMap.set(row.symbol, {
        symbol: row.symbol,
        name: row.name,
        exchange: micInfo.mic,
        exchangeCode: micInfo.code,
        country: micInfo.country,
        currency: row.currency && /^[A-Z]{3}$/.test(row.currency) ? row.currency : micInfo.currency,
        timezone: micInfo.timezone,
        assetType: 'EQUITY',
        sector: row.sector || row.industry || 'Global Equities',
        pe: null,
        marketCap: null,
        basePrice: null,
        aliases: [],
        active: true
      });
      addedActive++;
    }

    for (const row of delistedCandidates) {
      if (addedDelisted >= spec.targetDelisted) break;
      if (coreSymbols.has(row.symbol) || finalMap.has(row.symbol)) continue;

      finalMap.set(row.symbol, {
        symbol: row.symbol,
        name: row.name,
        exchange: micInfo.mic,
        exchangeCode: micInfo.code,
        country: micInfo.country,
        currency: row.currency && /^[A-Z]{3}$/.test(row.currency) ? row.currency : micInfo.currency,
        timezone: micInfo.timezone,
        assetType: 'EQUITY',
        sector: row.sector || row.industry || 'Global Equities',
        pe: null,
        marketCap: null,
        basePrice: null,
        aliases: [],
        active: false
      });
      addedDelisted++;
    }

    perExchangeCounts[spec.mic] = { active: addedActive, delisted: addedDelisted };
  }

  const allRows = Array.from(finalMap.values()).sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    if (a.country !== b.country) return a.country.localeCompare(b.country);
    if (a.exchange !== b.exchange) return a.exchange.localeCompare(b.exchange);
    return a.symbol.localeCompare(b.symbol);
  });

  const activeRows = allRows.filter((r) => r.active);
  const delistedRows = allRows.filter((r) => !r.active);
  const distinctExchanges = new Set(activeRows.map((r) => r.exchange));
  const distinctCountries = new Set(activeRows.map((r) => r.country));

  const lines: string[] = [
    `# Source: JerBouma/FinanceDatabase (MIT License) merged with AlphaQuant curated global aliases`,
    `# RetrievedAt: 2026-11-26 | Exchanges: ${distinctExchanges.size} | Countries: ${distinctCountries.size} | Active: ${activeRows.length} | Delisted(inactive): ${delistedRows.length}`,
    'symbol,name,exchange,exchangeCode,country,currency,timezone,assetType,sector,aliases,active'
  ];

  for (const r of allRows) {
    lines.push(
      [
        escapeCsvField(r.symbol),
        escapeCsvField(r.name),
        escapeCsvField(r.exchange),
        escapeCsvField(r.exchangeCode),
        escapeCsvField(r.country),
        escapeCsvField(r.currency),
        escapeCsvField(r.timezone),
        escapeCsvField(r.assetType || 'EQUITY'),
        escapeCsvField(r.sector || 'Global Equities'),
        escapeCsvField((r.aliases || []).join('|')),
        r.active ? 'true' : 'false'
      ].join(',')
    );
  }

  fs.writeFileSync(OUT_CSV, lines.join('\n') + '\n', 'utf8');

  console.log(
    `[Sync Global Tickers] Wrote ${allRows.length} rows (${activeRows.length} active + ${delistedRows.length} delisted/inactive) across ${distinctExchanges.size} exchanges and ${distinctCountries.size} countries to ${OUT_CSV}`
  );
  console.log('[Sync Global Tickers] Per-exchange counts:', JSON.stringify(perExchangeCounts));
}

main().catch((err) => {
  console.error('[Sync Global Tickers] Fatal error:', err);
  process.exit(1);
});
