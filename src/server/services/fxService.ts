/**
 * Real-Time Foreign Exchange (FX) Rate Service
 * Fetches live USD-pivot spot FX rates via Yahoo Finance chart API
 * with 60-second in-memory caching and resilient baseline fallbacks.
 */

export interface FxRatesResponse {
  base: 'USD';
  rates: Record<string, number>; // Units of currency per 1 USD
  timestamp: string;
  isLive: boolean;
  source: string;
}

// Baseline reference rates per 1 USD (used only if live fetch fails)
const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1,
  INR: 85.5,
  KRW: 1380.0,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 154.0,
  CNY: 7.22,
  HKD: 7.78,
  TWD: 32.1,
  CAD: 1.39,
  AUD: 1.52,
  SGD: 1.33,
  CHF: 0.88,
  BRL: 5.75
};

const SUPPORTED_FX_PAIRS: { code: string; symbol: string }[] = [
  { code: 'INR', symbol: 'INR=X' },
  { code: 'KRW', symbol: 'KRW=X' },
  { code: 'EUR', symbol: 'EUR=X' },
  { code: 'GBP', symbol: 'GBP=X' },
  { code: 'JPY', symbol: 'JPY=X' },
  { code: 'CNY', symbol: 'CNY=X' },
  { code: 'HKD', symbol: 'HKD=X' },
  { code: 'TWD', symbol: 'TWD=X' },
  { code: 'CAD', symbol: 'CAD=X' },
  { code: 'AUD', symbol: 'AUD=X' },
  { code: 'SGD', symbol: 'SGD=X' },
  { code: 'CHF', symbol: 'CHF=X' },
  { code: 'BRL', symbol: 'BRL=X' }
];

let cachedFx: { data: FxRatesResponse; fetchedAt: number } | null = null;
const FX_TTL_MS = 60 * 1000; // 60 seconds live refresh

async function fetchYahooFxRate(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(3500)
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice || meta?.chartPreviousClose;
    if (typeof price === 'number' && isFinite(price) && price > 0) {
      return price;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getFxRates(): Promise<FxRatesResponse> {
  const now = Date.now();
  if (cachedFx && now - cachedFx.fetchedAt < FX_TTL_MS) {
    return cachedFx.data;
  }

  const rates: Record<string, number> = { ...FALLBACK_USD_RATES };
  let liveHits = 0;

  const settled = await Promise.all(
    SUPPORTED_FX_PAIRS.map(async (pair) => {
      const rate = await fetchYahooFxRate(pair.symbol);
      return { code: pair.code, rate };
    })
  );

  for (const item of settled) {
    if (item.rate !== null) {
      rates[item.code] = Number(item.rate.toFixed(6));
      liveHits++;
    }
  }

  const result: FxRatesResponse = {
    base: 'USD',
    rates,
    timestamp: new Date().toISOString(),
    isLive: liveHits > 0,
    source: liveHits > 0 ? 'Yahoo Finance Spot FX' : 'Reference FX Baseline'
  };

  cachedFx = { data: result, fetchedAt: now };
  return result;
}
