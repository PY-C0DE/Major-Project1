/**
 * Stratified Universe Sampling & Regional Grouping Helpers
 *
 * Ensures global ticker_master audits:
 *   1. Sample up to N active equities per exchange MIC (default 15), ranked by
 *      marketCap/liquidity when populated and filled via deterministic seeded PRNG otherwise.
 *   2. Isolate delisted (active=false) equities into a separate stratum so stopped price
 *      series never contaminate active universe metrics or breakdowns.
 *   3. Group ISO-2 countries consistently into institutional macro regions.
 */

import {
  PerExchangeSamplingCount,
  TickerMasterItem,
  UniverseSamplingMetadata
} from '../../types';

export const DEFAULT_UNIVERSE_PER_EXCHANGE = 15;
export const DEFAULT_UNIVERSE_SAMPLE_SEED = 20261127;

const COUNTRY_REGION_MAP: Record<string, string> = {
  // North America
  US: 'North America',
  CA: 'North America',
  MX: 'North America',
  // South America
  BR: 'South America',
  AR: 'South America',
  CL: 'South America',
  CO: 'South America',
  PE: 'South America',
  // Europe
  GB: 'Europe',
  DE: 'Europe',
  FR: 'Europe',
  NL: 'Europe',
  BE: 'Europe',
  CH: 'Europe',
  ES: 'Europe',
  IT: 'Europe',
  DK: 'Europe',
  SE: 'Europe',
  FI: 'Europe',
  NO: 'Europe',
  PL: 'Europe',
  PT: 'Europe',
  IE: 'Europe',
  AT: 'Europe',
  TR: 'Europe',
  // Asia-Pacific
  IN: 'Asia-Pacific',
  JP: 'Asia-Pacific',
  HK: 'Asia-Pacific',
  KR: 'Asia-Pacific',
  TW: 'Asia-Pacific',
  CN: 'Asia-Pacific',
  SG: 'Asia-Pacific',
  ID: 'Asia-Pacific',
  MY: 'Asia-Pacific',
  TH: 'Asia-Pacific',
  AU: 'Asia-Pacific',
  NZ: 'Asia-Pacific',
  // Middle East & Africa
  ZA: 'Middle East & Africa',
  AE: 'Middle East & Africa',
  SA: 'Middle East & Africa',
  IL: 'Middle East & Africa'
};

export function getRegionForCountry(countryCode?: string): string {
  const iso = (countryCode || '').trim().toUpperCase();
  if (!iso) return 'Other';
  return COUNTRY_REGION_MAP[iso] || 'Other';
}

function fnv1aHash32(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export interface ParsedUniverseCliArgs {
  useUniverse: boolean;
  perExchange: number;
  seed: number;
}

export function parseUniverseCliArgs(argv: string[]): ParsedUniverseCliArgs {
  let useUniverse = false;
  let perExchange = DEFAULT_UNIVERSE_PER_EXCHANGE;
  let seed = DEFAULT_UNIVERSE_SAMPLE_SEED;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--universe') {
      useUniverse = true;
    } else if (arg.startsWith('--per-exchange=')) {
      const n = Number(arg.slice('--per-exchange='.length));
      if (Number.isInteger(n) && n > 0) perExchange = n;
    } else if (arg === '--per-exchange' && argv[i + 1]) {
      const n = Number(argv[i + 1]);
      if (Number.isInteger(n) && n > 0) perExchange = n;
      i++;
    } else if (arg.startsWith('--seed=')) {
      const s = Number(arg.slice('--seed='.length));
      if (Number.isInteger(s)) seed = s;
    } else if (arg === '--seed' && argv[i + 1]) {
      const s = Number(argv[i + 1]);
      if (Number.isInteger(s)) seed = s;
      i++;
    }
  }

  return { useUniverse, perExchange, seed };
}

export interface StratifiedUniverseSampleResult {
  sampledActive: TickerMasterItem[];
  delistedEquities: TickerMasterItem[];
  perExchangeCounts: PerExchangeSamplingCount[];
  sampling: UniverseSamplingMetadata;
}

function getSizeMetric(item: TickerMasterItem): number | null {
  const cap = typeof item.marketCap === 'number' && Number.isFinite(item.marketCap) && item.marketCap > 0
    ? item.marketCap
    : null;
  const liq = typeof item.liquidity === 'number' && Number.isFinite(item.liquidity) && item.liquidity > 0
    ? item.liquidity
    : null;
  if (cap !== null) return cap;
  if (liq !== null) return liq;
  return null;
}

export function stratifiedSampleUniverse(
  allMasterTickers: TickerMasterItem[],
  options?: { perExchange?: number; seed?: number }
): StratifiedUniverseSampleResult {
  const perExchange = Math.max(1, Math.floor(options?.perExchange ?? DEFAULT_UNIVERSE_PER_EXCHANGE));
  const seed = Math.floor(options?.seed ?? DEFAULT_UNIVERSE_SAMPLE_SEED);

  // Deduplicate by uppercase symbol (preserving active flag accurately)
  const dedupedMap = new Map<string, TickerMasterItem>();
  for (const raw of allMasterTickers) {
    if (!raw?.symbol) continue;
    const sym = raw.symbol.trim().toUpperCase();
    if (!sym) continue;
    dedupedMap.set(sym, { ...raw, symbol: sym });
  }

  const allEquities = Array.from(dedupedMap.values()).filter(
    (t) => !t.assetType || t.assetType.toUpperCase() === 'EQUITY'
  );

  const activeEquities = allEquities.filter((t) => t.active !== false);
  const delistedEquities = allEquities
    .filter((t) => t.active === false)
    .sort((a, b) => a.exchange.localeCompare(b.exchange) || a.symbol.localeCompare(b.symbol));

  const delistedByExchange = new Map<string, TickerMasterItem[]>();
  for (const d of delistedEquities) {
    const mic = (d.exchange || 'UNKNOWN').trim().toUpperCase();
    const list = delistedByExchange.get(mic) || [];
    list.push(d);
    delistedByExchange.set(mic, list);
  }

  const byExchange = new Map<string, TickerMasterItem[]>();
  for (const t of activeEquities) {
    const mic = (t.exchange || 'UNKNOWN').trim().toUpperCase();
    const list = byExchange.get(mic) || [];
    list.push(t);
    byExchange.set(mic, list);
  }

  const allExchangeMics = Array.from(
    new Set([...byExchange.keys(), ...delistedByExchange.keys()])
  ).sort();

  const sampledActive: TickerMasterItem[] = [];
  const perExchangeCounts: PerExchangeSamplingCount[] = [];

  for (const mic of allExchangeMics) {
    const pool = (byExchange.get(mic) || []).slice().sort((a, b) => a.symbol.localeCompare(b.symbol));
    const delistedCount = delistedByExchange.get(mic)?.length ?? 0;

    if (pool.length === 0) {
      const sampleDelisted = delistedByExchange.get(mic)?.[0];
      perExchangeCounts.push({
        exchange: mic,
        exchangeCode: sampleDelisted?.exchangeCode || mic,
        country: sampleDelisted?.country || 'UNKNOWN',
        availableActive: 0,
        requested: 0,
        evaluated: 0,
        skipped: 0,
        skippedByReason: {},
        delistedCount,
        samplingStrategy: 'seeded_random'
      });
      continue;
    }

    const withSize: Array<{ item: TickerMasterItem; size: number }> = [];
    const withoutSize: TickerMasterItem[] = [];
    for (const item of pool) {
      const sz = getSizeMetric(item);
      if (sz !== null) {
        withSize.push({ item, size: sz });
      } else {
        withoutSize.push(item);
      }
    }

    withSize.sort((a, b) => b.size - a.size || a.item.symbol.localeCompare(b.item.symbol));
    const selectedFromSize = withSize.slice(0, perExchange).map((x) => x.item);

    const remainingSlots = Math.max(0, perExchange - selectedFromSize.length);
    let selectedFromSeeded: TickerMasterItem[] = [];
    if (remainingSlots > 0 && withoutSize.length > 0) {
      const exSeed = (seed ^ fnv1aHash32(mic)) >>> 0;
      selectedFromSeeded = seededShuffle(withoutSize, exSeed).slice(0, remainingSlots);
    }

    const chosen = [...selectedFromSize, ...selectedFromSeeded];
    sampledActive.push(...chosen);

    const samplingStrategy: PerExchangeSamplingCount['samplingStrategy'] =
      selectedFromSize.length === chosen.length && chosen.length > 0
        ? 'market_cap'
        : selectedFromSize.length > 0
          ? 'mixed_cap_and_seeded_random'
          : 'seeded_random';

    const first = pool[0];
    perExchangeCounts.push({
      exchange: mic,
      exchangeCode: first.exchangeCode || mic,
      country: first.country || 'UNKNOWN',
      availableActive: pool.length,
      requested: chosen.length,
      evaluated: 0,
      skipped: 0,
      skippedByReason: {},
      delistedCount,
      samplingStrategy
    });
  }

  return {
    sampledActive,
    delistedEquities,
    perExchangeCounts,
    sampling: {
      perExchange,
      seed,
      method: 'market_cap_or_liquidity_then_seeded_random',
      totalMasterRows: dedupedMap.size,
      activeEquitiesCount: activeEquities.length,
      delistedEquitiesCount: delistedEquities.length,
      sampledActiveRequested: sampledActive.length,
      exchangesCovered: byExchange.size
    }
  };
}
