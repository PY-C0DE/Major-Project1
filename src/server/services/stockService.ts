/**
 * Stock Data Service
 * Provides live quotes, historical OHLCV bars, ticker & company name search,
 * intelligent company-name-to-ticker resolution, and resilient caching
 * backed by the pluggable MarketDataProvider abstraction.
 */

import { StockQuote, StockSearchResult, MarketIndexItem, QuickWatchItem, TickerSearchResponse } from '../../types';
import { ComputedBar } from '../math/indicators';

import { TICKER_CATALOG, TickerMeta } from '../../shared/tickerCatalog';
import {
  MACRO_INDEX_CATALOG,
  MacroIndexConfig,
  MacroMarketId,
  DEFAULT_MARKET_IDS,
  resolveIndicesForMarkets
} from '../../shared/macroMarkets';
import { getCurrencySymbol, inferCurrencyFromTicker, inferExchangeFromTicker } from '../../utils/currency';
import { db } from '../store/db';
import {
  getMarketDataProvider,
  MarketHistoryFetchResult
} from '../providers/marketDataProvider';

export { TICKER_CATALOG };
export type { TickerMeta };

export interface HistoricalDataResult extends MarketHistoryFetchResult {
  bars: ComputedBar[];
  source: 'live' | 'synthetic';
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry<StockSearchResult[]>>();
const SEARCH_TTL_MS = 5 * 60 * 1000;

/**
 * Known legacy, demerged, or superseded corporate ticker migrations.
 * Automatically resolves delisted historical symbols to their true active traded counterpart.
 */
export const LEGACY_TICKER_MAP: Record<string, string> = {
  'TATAMOTORS.NS': 'TMCV.NS',
  'TATAMOTORS': 'TMCV.NS',
  'TAMO.NS': 'TMCV.NS',
  'TAMO': 'TMCV.NS',
  'TATAMTRDVR.NS': 'TMCV.NS',
  'ZOMATO.NS': 'ETERNAL.NS',
  'ZOMATO': 'ETERNAL.NS',
};

/**
 * Resolves metadata for a ticker from TICKER_CATALOG -> ticker_master DB -> exchange inference.
 */
async function resolveTickerMeta(ticker: string): Promise<TickerMeta> {
  const catalogMeta = TICKER_CATALOG.find(t => t.ticker === ticker);
  if (catalogMeta) return catalogMeta;

  let dbMasterMeta: Awaited<ReturnType<typeof db.getTickerBySymbol>> | undefined;
  try {
    dbMasterMeta = await db.getTickerBySymbol(ticker);
  } catch {
    dbMasterMeta = undefined;
  }

  return {
    ticker,
    name: dbMasterMeta?.name || ticker,
    exchange: dbMasterMeta?.exchangeCode || inferExchangeFromTicker(ticker),
    currency: dbMasterMeta?.currency || inferCurrencyFromTicker(ticker),
    basePrice: dbMasterMeta?.basePrice ?? (ticker.endsWith('.KS') || ticker.endsWith('.KQ') ? 56000.0 : 150.0),
    pe: 24.0,
    marketCap: 10000000000,
    sector: dbMasterMeta?.sector || 'Equity',
    aliases: dbMasterMeta?.aliases || []
  };
}

/**
 * Intelligent company-name-to-ticker resolver
 * Resolves user inputs like "Reliance", "Tata Motors", "Zomato", "Nvidia", "Google", "Apple", "SBI"
 * directly into standard official active tickers ('RELIANCE.NS', 'TMCV.NS', 'ETERNAL.NS', 'NVDA', 'GOOGL', 'AAPL', 'SBIN.NS').
 */
export async function resolveTickerOrName(query: string): Promise<string> {
  if (!query) return 'RELIANCE.NS';
  const clean = query.trim();
  const upper = clean.toUpperCase();

  // 0. Check legacy/demerged migration map (e.g. TATAMOTORS -> TMCV.NS, ZOMATO -> ETERNAL.NS)
  if (LEGACY_TICKER_MAP[upper]) return LEGACY_TICKER_MAP[upper];
  const nseCandidate = upper.endsWith('.NS') ? upper : `${upper}.NS`;
  if (LEGACY_TICKER_MAP[nseCandidate]) return LEGACY_TICKER_MAP[nseCandidate];

  // 1. Check if it's already an exact ticker in our catalog
  const exactTicker = TICKER_CATALOG.find(t => t.ticker === upper);
  if (exactTicker) return exactTicker.ticker;

  // 2. Check if it's an Indian symbol without '.NS' (e.g. 'RELIANCE', 'TCS', 'INFY', 'TMCV')
  const exactNse = TICKER_CATALOG.find(t => t.ticker === nseCandidate);
  if (exactNse) return exactNse.ticker;

  // 3. Check local catalog by company name or aliases
  const lower = clean.toLowerCase();
  const catalogMatch = TICKER_CATALOG.find(t => {
    if (t.name.toLowerCase() === lower) return true;
    if (t.aliases.some(a => a.toLowerCase() === lower)) return true;
    if (t.name.toLowerCase().startsWith(lower)) return true;
    if (t.aliases.some(a => a.toLowerCase().startsWith(lower))) return true;
    return false;
  });

  if (catalogMatch) return catalogMatch.ticker;

  // 4. Secondary catalog match: word boundary or substring match
  const looseMatch = TICKER_CATALOG.find(t => {
    return t.name.toLowerCase().includes(lower) || t.aliases.some(a => a.toLowerCase().includes(lower));
  });
  if (looseMatch) return looseMatch.ticker;

  // 4b. Check global ticker_master repository before falling back to raw uppercase or provider search
  try {
    const dbMatch = await db.resolveTickerSymbol(clean);
    if (dbMatch?.symbol) {
      return dbMatch.symbol;
    }
  } catch {
    // Non-fatal fallback
  }

  // 5. If it looks like a symbol already (no spaces, <= 10 chars, uppercase), use it directly
  if (!clean.includes(' ') && clean.length <= 10) {
    return upper;
  }

  // 6. Asynchronously resolve unknown company names via active MarketDataProvider
  try {
    const searchRes = await getMarketDataProvider().search(clean, 3);
    const equityMatch = searchRes.items.find(q => q.ticker && (q.quoteType === 'EQUITY' || !q.quoteType));
    const chosen = equityMatch?.ticker || searchRes.items[0]?.ticker;
    if (chosen) {
      return LEGACY_TICKER_MAP[chosen] || chosen;
    }
  } catch {
    // Fall back to upper string
  }

  return upper;
}

export async function searchTickersMaster(params: {
  q?: string;
  country?: string;
  exchange?: string;
  page?: number;
  limit?: number;
}): Promise<TickerSearchResponse> {
  return db.searchTickers({
    q: params.q,
    country: params.country,
    exchange: params.exchange,
    page: params.page,
    limit: params.limit,
    activeOnly: true
  });
}

/**
 * Searches stocks by symbol, company name, or aliases
 * Combines the database-backed global ticker_master universe with live MarketDataProvider discovery,
 * with strict deduplication to ensure exactly one true ticker per corporate entity.
 */
export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const qClean = (query || '').trim();
  const cacheKey = qClean.toLowerCase();

  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SEARCH_TTL_MS) {
    return cached.data;
  }

  const results: StockSearchResult[] = [];
  const seenTickers = new Set<string>();

  // 1. Query ranked ticker_master database first
  try {
    const dbPage = await db.searchTickers({ q: qClean, page: 1, limit: 16, activeOnly: true });
    for (const item of dbPage.items) {
      if (seenTickers.has(item.symbol)) continue;
      const catalogMatch = TICKER_CATALOG.find(t => t.ticker === item.symbol);
      results.push({
        ticker: item.symbol,
        name: item.name,
        exchange: item.exchangeCode || item.exchange,
        exchangeCode: item.exchange,
        country: item.country,
        currency: item.currency,
        timezone: item.timezone,
        assetType: item.assetType,
        price: catalogMatch?.basePrice ?? item.basePrice ?? undefined,
        sector: item.sector || catalogMatch?.sector
      });
      seenTickers.add(item.symbol);
    }
  } catch {
    // Fall back to local catalog if repository search fails
  }

  if (!qClean && results.length === 0) {
    for (const t of TICKER_CATALOG.slice(0, 12)) {
      results.push({
        ticker: t.ticker,
        name: t.name,
        exchange: t.exchange,
        currency: t.currency,
        price: t.basePrice,
        sector: t.sector
      });
      seenTickers.add(t.ticker);
    }
    return results;
  }

  if (!qClean) {
    return results.slice(0, 12);
  }

  // 2. Query active MarketDataProvider search for global equities if query is >= 2 chars
  if (qClean.length >= 2) {
    try {
      const remote = await getMarketDataProvider().search(qClean, 10);
      for (const item of remote.items) {
        let sym = item.ticker;
        if (!sym) continue;

        if (LEGACY_TICKER_MAP[sym]) {
          sym = LEGACY_TICKER_MAP[sym];
        }

        if (
          sym.includes('=') ||
          sym.includes('^') ||
          sym.includes('-BL.') ||
          sym.includes('-BZ.') ||
          sym.includes('-SM.')
        ) {
          continue;
        }

        if (sym === 'TATAMOTORS.NS' || sym === 'ZOMATO.NS' || sym === 'TATAMTRDVR.NS') {
          continue;
        }

        if (sym.endsWith('.BO')) {
          const nseEquivalent = sym.replace('.BO', '.NS');
          if (seenTickers.has(nseEquivalent) || TICKER_CATALOG.some(t => t.ticker === nseEquivalent)) {
            continue;
          }
        }

        if (seenTickers.has(sym)) continue;

        const matchingCatalog = TICKER_CATALOG.find(t => t.ticker === sym);
        results.push({
          ticker: sym,
          name: matchingCatalog ? matchingCatalog.name : item.name,
          exchange: matchingCatalog?.exchange || item.exchange || inferExchangeFromTicker(sym),
          currency: matchingCatalog?.currency || item.currency || inferCurrencyFromTicker(sym),
          price: matchingCatalog?.basePrice,
          sector: matchingCatalog?.sector || item.sector || 'Public Equity'
        });
        seenTickers.add(sym);
      }
    } catch {
      // Provider search error: local database matches still returned
    }
  }

  searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
  return results.slice(0, 16);
}

/**
 * Fetches stock quote via active MarketDataProvider with explicit provenance (`dataSource`, `fetchedAt`, `provider`).
 */
export async function getStockQuote(tickerOrName: string): Promise<StockQuote> {
  const ticker = await resolveTickerOrName(tickerOrName);
  const meta = await resolveTickerMeta(ticker);
  const res = await getMarketDataProvider().getQuote(ticker, meta);
  return {
    ...res.quote,
    dataSource: res.dataSource,
    fetchedAt: res.fetchedAt,
    provider: res.provider,
    ...(res.fallbackFrom ? { fallbackFrom: res.fallbackFrom } : {}),
    ...(res.warning ? { warning: res.warning } : {})
  };
}

/**
 * Fetches historical OHLCV bars and computes full technical indicators via MarketDataProvider,
 * returning explicit provenance (`'live' | 'synthetic'`, `fetchedAt`, `provider`).
 */
export async function getHistoricalDataWithSource(tickerOrName: string, days = 250): Promise<HistoricalDataResult> {
  const ticker = await resolveTickerOrName(tickerOrName);
  const meta = await resolveTickerMeta(ticker);
  const res = await getMarketDataProvider().getHistory(ticker, days, meta);
  return {
    ...res,
    ticker,
    dataSource: res.dataSource || res.source,
    fetchedAt: res.fetchedAt || new Date().toISOString()
  };
}

/**
 * Thin wrapper preserving ComputedBar[] return type for callers that only need bars.
 */
export async function getHistoricalData(tickerOrName: string, days = 250): Promise<ComputedBar[]> {
  const { bars } = await getHistoricalDataWithSource(tickerOrName, days);
  return bars;
}

export async function getMarketIndices(options?: {
  markets?: string[];
  symbols?: string[];
}): Promise<MarketIndexItem[]> {
  let targetConfigs: MacroIndexConfig[];
  if (options?.symbols && options.symbols.length > 0) {
    const symSet = options.symbols.map((s) => s.trim().toUpperCase());
    targetConfigs = MACRO_INDEX_CATALOG.filter((c) => symSet.includes(c.symbol.toUpperCase()));
    if (targetConfigs.length === 0) {
      targetConfigs = resolveIndicesForMarkets(DEFAULT_MARKET_IDS);
    }
  } else if (options?.markets && options.markets.length > 0) {
    const marketIds = options.markets.map((m) => m.trim().toUpperCase()) as MacroMarketId[];
    targetConfigs = resolveIndicesForMarkets(marketIds);
  } else {
    targetConfigs = resolveIndicesForMarkets(DEFAULT_MARKET_IDS);
  }

  const provider = getMarketDataProvider();
  return Promise.all(targetConfigs.map((cfg) => provider.getIndexQuote(cfg.symbol, cfg)));
}

const QUICK_WATCH_DEFS = [
  { ticker: 'RELIANCE.NS', name: 'Reliance Ind.', sector: 'Energy & Tech', currency: 'INR' },
  { ticker: 'TCS.NS', name: 'Tata Consultancy', sector: 'IT Services', currency: 'INR' },
  { ticker: 'NVDA', name: 'NVIDIA Corp', sector: 'Semiconductors', currency: 'USD' },
  { ticker: 'AAPL', name: 'Apple Inc', sector: 'Consumer Tech', currency: 'USD' },
  { ticker: 'INFY.NS', name: 'Infosys Ltd.', sector: 'Cloud & Digital', currency: 'INR' }
];

let cachedQuickWatch: { timestamp: number; data: QuickWatchItem[] } | null = null;
const QUICK_WATCH_CACHE_TTL = 45 * 1000;

export async function getQuickWatchQuotes(): Promise<QuickWatchItem[]> {
  const now = Date.now();
  if (cachedQuickWatch && now - cachedQuickWatch.timestamp < QUICK_WATCH_CACHE_TTL) {
    return cachedQuickWatch.data;
  }

  const items = await Promise.all(
    QUICK_WATCH_DEFS.map(async (def) => {
      try {
        const q = await getStockQuote(def.ticker);
        const isUp = q.change >= 0;
        const sym = getCurrencySymbol(q.currency, def.ticker);
        return {
          ticker: def.ticker,
          name: def.name,
          price: `${sym}${q.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          priceNum: q.price,
          chg: `${isUp ? '+' : ''}${q.changePercent.toFixed(2)}%`,
          chgPct: q.changePercent,
          up: isUp,
          sector: def.sector,
          currency: q.currency,
          isLive: q.isLive,
          dataSource: q.dataSource || (q.isLive ? 'live' : 'synthetic'),
          fetchedAt: q.fetchedAt || q.lastUpdated,
          provider: q.provider
        } as QuickWatchItem;
      } catch {
        const cat = TICKER_CATALOG.find(t => t.ticker === def.ticker);
        const price = cat?.basePrice || 100;
        const sym = getCurrencySymbol(def.currency, def.ticker);
        return {
          ticker: def.ticker,
          name: def.name,
          price: `${sym}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          priceNum: price,
          chg: '+1.20%',
          chgPct: 1.20,
          up: true,
          sector: def.sector,
          currency: def.currency,
          isLive: false,
          dataSource: 'synthetic',
          fetchedAt: new Date().toISOString(),
          provider: 'simulated-fallback'
        } as QuickWatchItem;
      }
    })
  );

  cachedQuickWatch = { timestamp: now, data: items };
  return items;
}
