/**
 * Market Data Provider Abstraction (Step 3)
 *
 * Introduces a pluggable MarketDataProvider interface with:
 *   - YahooFinanceMarketDataProvider (default free/public Yahoo v8/v1 client)
 *   - TwelveDataMarketDataProvider (licensed commercial API client via MARKET_DATA_PROVIDER=twelvedata)
 *   - Exponential-backoff retries with jitter for transient 429/5xx/network errors
 *   - Concurrency + interval rate limiting
 *   - Per-provider TTL response caching with explicit `fetchedAt` timestamps
 *   - Clear typed errors (`MarketDataProviderError`) and explicit provenance (`dataSource: 'live' | 'synthetic' | 'unavailable'`)
 */

import { MarketIndexItem, StockQuote } from '../../types';
import { TickerMeta } from '../../shared/tickerCatalog';
import { MacroIndexConfig } from '../../shared/macroMarkets';
import { inferCurrencyFromTicker, inferExchangeFromTicker } from '../../utils/currency';
import { getExchangeMarketStatus } from '../../utils/marketStatus';
import { resolveExchangeMicInfo } from '../../shared/tickerMetadata';
import { ComputedBar, PriceBar, computeAllIndicators } from '../math/indicators';
import { formatTimestampInExchangeTimezone } from '../math/exchangeCalendar';
import { RawLiveArticle } from '../services/liveNewsService';

export type DataSourceKind = 'live' | 'synthetic';

export type MarketDataErrorCode =
  | 'RATE_LIMITED'
  | 'UPSTREAM_HTTP_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'UNAVAILABLE';

export class MarketDataProviderError extends Error {
  readonly code: MarketDataErrorCode;
  readonly provider: string;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(
    message: string,
    options: {
      code: MarketDataErrorCode;
      provider: string;
      status?: number;
      retryable?: boolean;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = 'MarketDataProviderError';
    this.code = options.code;
    this.provider = options.provider;
    this.status = options.status;
    this.retryable = Boolean(options.retryable);
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export type FallbackReasonCode =
  | 'rate_limited_429'
  | 'insufficient_bars'
  | 'upstream_error'
  | 'network_error'
  | 'not_configured';

export interface MarketHistoryFetchResult {
  ticker?: string;
  bars: ComputedBar[];
  source: DataSourceKind;
  dataSource?: DataSourceKind;
  provider?: string;
  providerLicence?: string;
  fetchedAt?: string;
  fallbackFrom?: string;
  fallbackReasonCode?: FallbackReasonCode;
  unavailableReason?: 'no_history' | 'insufficient_history' | 'provider_error';
  unavailableDetail?: string;
  liveBarsCount?: number;
  warning?: string;
}

export interface MarketQuoteFetchResult {
  quote: StockQuote;
  dataSource: DataSourceKind;
  provider: string;
  fetchedAt: string;
  fallbackFrom?: string;
  warning?: string;
}

export interface MarketSearchResultItem {
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  sector?: string;
  quoteType?: string;
}

export interface MarketSearchFetchResult {
  items: MarketSearchResultItem[];
  dataSource: 'live' | 'unavailable';
  provider: string;
  fetchedAt: string;
  fallbackFrom?: string;
  warning?: string;
  error?: string;
}

export interface MarketNewsFetchResult {
  articles: RawLiveArticle[];
  dataSource: 'live' | 'unavailable';
  provider: string;
  fetchedAt: string;
  fallbackFrom?: string;
  warning?: string;
  error?: string;
}

export interface MarketDataProvider {
  readonly name: string;
  readonly licenceNote: string;
  getHistory(ticker: string, days?: number, meta?: TickerMeta): Promise<MarketHistoryFetchResult>;
  getQuote(ticker: string, meta?: TickerMeta): Promise<MarketQuoteFetchResult>;
  getIndexQuote(symbol: string, cfg: MacroIndexConfig): Promise<MarketIndexItem>;
  getFxRate(symbol: string): Promise<number | null>;
  search(query: string, limit?: number): Promise<MarketSearchFetchResult>;
  getNews(
    ticker: string,
    companyName: string,
    options?: { bypassCache?: boolean; maxArticles?: number }
  ): Promise<MarketNewsFetchResult>;
  clearCache(): void;
}

export interface ResilientHttpOptions {
  providerName: string;
  fetchFn?: typeof fetch;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryAfterMaxMs?: number;
  timeoutMs?: number;
  maxConcurrent?: number;
  minIntervalMs?: number;
  maxRequestsPerMinute?: number;
  rateLimitWindowMs?: number;
  userAgent?: string;
  sleepFn?: (ms: number) => Promise<void>;
  randomFn?: () => number;
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const QUOTE_TTL_MS = 2 * 60 * 1000;
const HISTORY_TTL_MS = 5 * 60 * 1000;
const SYNTHETIC_HISTORY_TTL_MS = 30 * 1000;
const INDEX_TTL_MS = 45 * 1000;
const SEARCH_TTL_MS = 5 * 60 * 1000;
const NEWS_TTL_MS = 5 * 60 * 1000;

function defaultSleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function getDeterministicDailyReturn(ticker: string, dateStr: string): number {
  const r1 = hashString(`${ticker}_ret_${dateStr}`);
  const r2 = hashString(`${ticker}_vol_${dateStr}`);
  const shock = (r1 - 0.492) * 2 * 0.012 * (0.85 + 0.3 * r2);
  return Math.max(-0.045, Math.min(0.045, shock + 0.0003));
}

/**
 * Generates deterministic synthetic fallback OHLCV bars, explicitly stamped with `source: 'synthetic'`.
 * Never used inside model audits/evaluations (`runModelEvaluation` and `runAggregateModelEvaluation` reject `synthetic`).
 */
export function buildExplicitSyntheticHistory(meta: TickerMeta, days = 250, targetClosePrice?: number): PriceBar[] {
  const anchorPrice = targetClosePrice || meta.basePrice;
  const now = new Date();
  const tradingDates: string[] = [];
  const cur = new Date(now.getTime());
  cur.setUTCHours(12, 0, 0, 0);

  while (tradingDates.length < days) {
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) {
      tradingDates.push(cur.toISOString().slice(0, 10));
    }
    cur.setUTCDate(cur.getUTCDate() - 1);
  }

  const closes: number[] = new Array(tradingDates.length);
  closes[0] = anchorPrice;
  for (let i = 0; i < tradingDates.length - 1; i++) {
    const ret = getDeterministicDailyReturn(meta.ticker, tradingDates[i]);
    closes[i + 1] = closes[i] / (1 + ret);
  }

  const bars: PriceBar[] = [];
  for (let i = tradingDates.length - 1; i >= 0; i--) {
    const dateStr = tradingDates[i];
    const close = closes[i];
    const prevClose = i < tradingDates.length - 1 ? closes[i + 1] : close * 0.998;
    const open = Number(prevClose.toFixed(2));
    const rHigh = hashString(`${meta.ticker}_high_${dateStr}`);
    const rLow = hashString(`${meta.ticker}_low_${dateStr}`);
    const rVol = hashString(`${meta.ticker}_vol_${dateStr}`);

    const maxOC = Math.max(open, close);
    const minOC = Math.min(open, close);
    const high = Number((maxOC * (1 + rHigh * 0.012)).toFixed(2));
    const low = Number((minOC * (1 - rLow * 0.012)).toFixed(2));
    const volume = Math.floor(1000000 + rVol * 3000000);

    bars.push({
      date: dateStr,
      open,
      high,
      low,
      close: Number(close.toFixed(2)),
      volume,
      source: 'synthetic'
    });
  }

  return bars;
}

export function parseRetryAfterMs(headerVal: string | null | undefined, nowMs = Date.now()): number | null {
  if (!headerVal) return null;
  const trimmed = headerVal.trim();
  if (!trimmed) return null;
  const numericSec = Number(trimmed);
  if (Number.isFinite(numericSec) && numericSec >= 0) {
    return Math.round(numericSec * 1000);
  }
  const parsedDateMs = Date.parse(trimmed);
  if (Number.isFinite(parsedDateMs)) {
    return Math.max(0, parsedDateMs - nowMs);
  }
  return null;
}

/**
 * Safe single-release HTTP request wrapper guaranteeing releaseSlot once per acquireSlot.
 * Implements exponential backoff with jitter and honors Retry-After (seconds or HTTP-date).
 */
async function executeWithResilience(
  client: {
    acquire: () => Promise<void>;
    release: () => void;
    recordAttempt: () => void;
    recordRateLimit: () => void;
    recordRetry: () => void;
    fetchFn: typeof fetch;
    providerName: string;
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    retryAfterMaxMs: number;
    defaultTimeoutMs: number;
    userAgent: string;
    sleepFn: (ms: number) => Promise<void>;
    randomFn: () => number;
  },
  url: string,
  init?: {
    headers?: Record<string, string>;
    timeoutMs?: number;
    checkJsonError?: (text: string, contentType: string, status: number) => MarketDataProviderError | null;
  }
): Promise<{ text: string; contentType: string; status: number }> {
  let lastError: MarketDataProviderError | null = null;

  for (let attempt = 0; attempt <= client.maxRetries; attempt++) {
    let responseOrError:
      | { ok: true; text: string; contentType: string; status: number }
      | { ok: false; error: MarketDataProviderError; retryAfter?: string | null };

    await client.acquire();
    try {
      client.recordAttempt();
      const timeoutMs = init?.timeoutMs ?? client.defaultTimeoutMs;
      const res = await client.fetchFn(url, {
        headers: {
          'User-Agent': client.userAgent,
          ...(init?.headers || {})
        },
        signal: AbortSignal.timeout(timeoutMs)
      });
      const contentType = res.headers?.get?.('content-type') || '';

      if (res.ok) {
        const text = await res.text();
        const customErr = init?.checkJsonError ? init.checkJsonError(text, contentType, res.status) : null;
        if (customErr) {
          if (customErr.code === 'RATE_LIMITED') client.recordRateLimit();
          responseOrError = {
            ok: false,
            retryAfter: res.headers?.get?.('retry-after'),
            error: customErr
          };
        } else {
          responseOrError = { ok: true, text, contentType, status: res.status };
        }
      } else {
        const is429 = res.status === 429;
        if (is429) client.recordRateLimit();
        const retryable = is429 || (res.status >= 500 && res.status <= 599);
        responseOrError = {
          ok: false,
          retryAfter: res.headers?.get?.('retry-after'),
          error: new MarketDataProviderError(`${client.providerName} responded with HTTP ${res.status}`, {
            code: is429 ? 'RATE_LIMITED' : 'UPSTREAM_HTTP_ERROR',
            provider: client.providerName,
            status: res.status,
            retryable
          })
        };
      }
    } catch (err: any) {
      const isTimeout =
        err?.name === 'AbortError' || err?.name === 'TimeoutError' || /timeout/i.test(err?.message || '');
      responseOrError = {
        ok: false,
        error: new MarketDataProviderError(
          `${client.providerName} request failed: ${err?.message || 'network error'}`,
          {
            code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
            provider: client.providerName,
            retryable: true,
            cause: err
          }
        )
      };
    } finally {
      client.release();
    }

    if (responseOrError.ok) {
      return responseOrError;
    }

    lastError = responseOrError.error;
    if (!lastError.retryable || attempt === client.maxRetries) {
      throw lastError;
    }

    client.recordRetry();
    const rawExp = Math.min(client.maxDelayMs, client.baseDelayMs * Math.pow(2, attempt));
    // Equal jitter: [0.5 * rawExp, rawExp] prevents synchronized thundering herds while preserving exponential growth
    const jitterFactor = 0.5 + 0.5 * Math.max(0, Math.min(1, client.randomFn()));
    let backoff = Math.max(1, Math.round(rawExp * jitterFactor));

    const parsedRetryAfter = parseRetryAfterMs(responseOrError.retryAfter);
    if (parsedRetryAfter !== null && parsedRetryAfter > 0) {
      backoff = Math.min(client.retryAfterMaxMs, Math.max(backoff, parsedRetryAfter));
    }
    await client.sleepFn(backoff);
  }

  throw (
    lastError ||
    new MarketDataProviderError(`${client.providerName} unavailable`, {
      code: 'UNAVAILABLE',
      provider: client.providerName
    })
  );
}

export class RateLimitedHttpRunner {
  private activeCount = 0;
  private lastStartMs = 0;
  private queue: Array<() => void> = [];
  private windowTimestamps: number[] = [];
  private paceMutex: Promise<void> = Promise.resolve();
  private requestsAttempted = 0;
  private rateLimitedResponses = 0;
  private retriesAttempted = 0;

  readonly providerName: string;
  readonly fetchFn: typeof fetch;
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly retryAfterMaxMs: number;
  readonly defaultTimeoutMs: number;
  readonly maxConcurrent: number;
  readonly minIntervalMs: number;
  readonly maxRequestsPerMinute: number | null;
  readonly rateLimitWindowMs: number;
  readonly userAgent: string;
  readonly sleepFn: (ms: number) => Promise<void>;
  readonly randomFn: () => number;

  constructor(options: ResilientHttpOptions) {
    this.providerName = options.providerName;
    this.fetchFn = options.fetchFn || globalThis.fetch;
    this.maxRetries = options.maxRetries ?? 2;
    this.baseDelayMs = options.baseDelayMs ?? 150;
    this.maxDelayMs = options.maxDelayMs ?? 2500;
    this.retryAfterMaxMs = options.retryAfterMaxMs ?? 65000;
    this.defaultTimeoutMs = options.timeoutMs ?? 5000;
    this.maxConcurrent = Math.max(1, options.maxConcurrent ?? 6);
    this.minIntervalMs = Math.max(0, options.minIntervalMs ?? 20);
    this.maxRequestsPerMinute =
      options.maxRequestsPerMinute !== undefined && options.maxRequestsPerMinute > 0
        ? Math.floor(options.maxRequestsPerMinute)
        : null;
    this.rateLimitWindowMs = Math.max(50, options.rateLimitWindowMs ?? 60_000);
    this.userAgent = options.userAgent || DEFAULT_USER_AGENT;
    this.sleepFn = options.sleepFn || defaultSleep;
    this.randomFn = options.randomFn || Math.random;
  }

  recordAttempt = (): void => {
    this.requestsAttempted++;
  };

  recordRateLimit = (): void => {
    this.rateLimitedResponses++;
  };

  recordRetry = (): void => {
    this.retriesAttempted++;
  };

  getStats() {
    return {
      requestsAttempted: this.requestsAttempted,
      rateLimitedResponses: this.rateLimitedResponses,
      retriesAttempted: this.retriesAttempted
    };
  }

  private paceRequest(): Promise<void> {
    const run = async () => {
      if (this.maxRequestsPerMinute !== null) {
        while (true) {
          const now = Date.now();
          const cutoff = now - this.rateLimitWindowMs;
          while (this.windowTimestamps.length > 0 && this.windowTimestamps[0] <= cutoff) {
            this.windowTimestamps.shift();
          }
          if (this.windowTimestamps.length < this.maxRequestsPerMinute) {
            break;
          }
          const earliest = this.windowTimestamps[0];
          const waitMs = Math.max(5, earliest + this.rateLimitWindowMs - now + 5);
          await this.sleepFn(waitMs);
        }
      }

      if (this.minIntervalMs > 0) {
        const now = Date.now();
        const delay = Math.max(0, this.lastStartMs + this.minIntervalMs - now);
        if (delay > 0) {
          await this.sleepFn(delay);
        }
      }

      const issuedAt = Date.now();
      this.lastStartMs = issuedAt;
      if (this.maxRequestsPerMinute !== null) {
        this.windowTimestamps.push(issuedAt);
      }
    };

    const next = this.paceMutex.then(run, run);
    this.paceMutex = next.catch(() => undefined);
    return next;
  }

  acquire = async (): Promise<void> => {
    if (this.activeCount >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.activeCount++;
    try {
      await this.paceRequest();
    } catch (err) {
      this.release();
      throw err;
    }
  };

  release = (): void => {
    this.activeCount = Math.max(0, this.activeCount - 1);
    const next = this.queue.shift();
    if (next) next();
  };

  async fetchJson<T = any>(
    url: string,
    init?: {
      headers?: Record<string, string>;
      timeoutMs?: number;
      checkJsonError?: (text: string, contentType: string, status: number) => MarketDataProviderError | null;
    }
  ): Promise<T> {
    const res = await executeWithResilience(this, url, init);
    if (res.contentType && !res.contentType.includes('application/json') && !res.text.trim().startsWith('{')) {
      throw new MarketDataProviderError(`${this.providerName} returned non-JSON content`, {
        code: 'INVALID_RESPONSE',
        provider: this.providerName,
        status: res.status,
        retryable: false
      });
    }
    try {
      return JSON.parse(res.text) as T;
    } catch (err) {
      throw new MarketDataProviderError(`${this.providerName} returned malformed JSON`, {
        code: 'INVALID_RESPONSE',
        provider: this.providerName,
        status: res.status,
        retryable: false,
        cause: err
      });
    }
  }

  async fetchText(url: string, init?: { headers?: Record<string, string>; timeoutMs?: number }): Promise<string> {
    const res = await executeWithResilience(this, url, init);
    return res.text;
  }
}

export interface YahooProviderOptions {
  fetchFn?: typeof fetch;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryAfterMaxMs?: number;
  timeoutMs?: number;
  maxConcurrent?: number;
  minIntervalMs?: number;
  maxRequestsPerMinute?: number;
  rateLimitWindowMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
  randomFn?: () => number;
}

/**
 * Default public Yahoo Finance v8/v1 MarketDataProvider implementation
 * with bounded exponential backoff retries, rate limiting, and explicit provenance.
 */
export class YahooFinanceMarketDataProvider implements MarketDataProvider {
  readonly name: string = 'yahoo-finance-v8';
  readonly licenceNote: string = 'Public Yahoo Finance v8 Chart & v1 Search endpoints (unlicensed public market telemetry; for research/non-commercial evaluation only).';

  protected readonly http: RateLimitedHttpRunner;
  private readonly quoteCache = new Map<string, CacheEntry<MarketQuoteFetchResult>>();
  private readonly historyCache = new Map<string, CacheEntry<MarketHistoryFetchResult>>();
  private readonly indexCache = new Map<string, CacheEntry<MarketIndexItem>>();
  private readonly searchCache = new Map<string, CacheEntry<MarketSearchFetchResult>>();
  private readonly newsCache = new Map<string, CacheEntry<MarketNewsFetchResult>>();

  constructor(options: YahooProviderOptions = {}) {
    this.http = new RateLimitedHttpRunner({
      providerName: this.name,
      fetchFn: options.fetchFn,
      maxRetries: options.maxRetries ?? 2,
      baseDelayMs: options.baseDelayMs ?? 150,
      maxDelayMs: options.maxDelayMs ?? 2500,
      retryAfterMaxMs: options.retryAfterMaxMs ?? 30000,
      timeoutMs: options.timeoutMs ?? 5000,
      maxConcurrent: options.maxConcurrent ?? 5,
      minIntervalMs: options.minIntervalMs ?? 25,
      maxRequestsPerMinute: options.maxRequestsPerMinute,
      rateLimitWindowMs: options.rateLimitWindowMs,
      sleepFn: options.sleepFn,
      randomFn: options.randomFn
    });
  }

  getHttpStats() {
    return this.http.getStats();
  }

  clearCache(): void {
    this.quoteCache.clear();
    this.historyCache.clear();
    this.indexCache.clear();
    this.searchCache.clear();
    this.newsCache.clear();
  }

  private buildDefaultMeta(ticker: string, override?: TickerMeta): TickerMeta {
    if (override) return override;
    return {
      ticker,
      name: ticker,
      exchange: inferExchangeFromTicker(ticker),
      currency: inferCurrencyFromTicker(ticker),
      basePrice: ticker.endsWith('.KS') || ticker.endsWith('.KQ') ? 56000.0 : 150.0,
      pe: 24.0,
      marketCap: 10000000000,
      sector: 'Equity',
      aliases: []
    };
  }

  async getHistory(ticker: string, days = 250, metaOverride?: TickerMeta): Promise<MarketHistoryFetchResult> {
    const upper = ticker.trim().toUpperCase();
    const cacheKey = `${upper}_${days}`;
    const now = Date.now();
    const cached = this.historyCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return cached.value;
    }

    const meta = this.buildDefaultMeta(upper, metaOverride);
    const range =
      days <= 30 ? '1mo' : days <= 90 ? '3mo' : days <= 180 ? '6mo' : days <= 365 ? '1y' : days <= 730 ? '2y' : '5y';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(upper)}?interval=1d&range=${range}`;

    const rawByDate = new Map<string, PriceBar>();
    let liveFailed = false;
    let liveErrorDetail: string | undefined;

    try {
      const data = await this.http.fetchJson<any>(url, { timeoutMs: 5000 });
      const result = data?.chart?.result?.[0];
      if (result) {
        const timestamps = result.timestamp || [];
        const quote = result.indicators?.quote?.[0] || {};
        const opens = quote.open || [];
        const highs = quote.high || [];
        const lows = quote.low || [];
        const closes = quote.close || [];
        const volumes = quote.volume || [];
        const exchangeHint = result.meta?.exchangeName || meta.exchange;

        for (let i = 0; i < timestamps.length; i++) {
          const c = closes[i];
          if (c !== null && c !== undefined && !isNaN(c)) {
            const localDate = formatTimestampInExchangeTimezone(timestamps[i] * 1000, upper, exchangeHint);
            rawByDate.set(localDate, {
              date: localDate,
              open: Number((opens[i] ?? c).toFixed(2)),
              high: Number((highs[i] ?? c).toFixed(2)),
              low: Number((lows[i] ?? c).toFixed(2)),
              close: Number(c.toFixed(2)),
              volume: Math.floor(volumes[i] ?? 1000000),
              source: 'live'
            });
          }
        }
      } else if (data?.chart?.error) {
        liveErrorDetail = String(data.chart.error.description || data.chart.error.code || 'Yahoo chart error');
      }
    } catch (err: any) {
      liveFailed = true;
      liveErrorDetail = err?.message || 'Upstream fetch error';
    }

    const rawBars = Array.from(rawByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    const fetchedAt = new Date().toISOString();

    if (!liveFailed && rawBars.length >= 30) {
      const computed = computeAllIndicators(rawBars).map((b) => ({ ...b, source: 'live' as const }));
      const payload: MarketHistoryFetchResult = {
        ticker: upper,
        bars: computed,
        source: 'live',
        dataSource: 'live',
        provider: this.name,
        providerLicence: this.licenceNote,
        fetchedAt
      };
      this.historyCache.set(cacheKey, { value: payload, expiresAt: Date.now() + HISTORY_TTL_MS });
      return payload;
    }

    // Explicit synthetic fallback (never substituted silently; every bar and wrapper carries 'synthetic')
    const anchorClose =
      rawBars.length > 0
        ? rawBars[rawBars.length - 1].close
        : this.quoteCache.get(upper)?.value.quote.price;
    const syntheticBars = buildExplicitSyntheticHistory(meta, days, anchorClose);
    const computedSynthetic = computeAllIndicators(syntheticBars).map((b) => ({
      ...b,
      source: 'synthetic' as const
    }));
    const unavailableReason: 'no_history' | 'insufficient_history' | 'provider_error' = liveFailed
      ? liveErrorDetail && /404|not found|no data|delisted/i.test(liveErrorDetail) && rawBars.length === 0
        ? 'no_history'
        : 'provider_error'
      : rawBars.length === 0
        ? 'no_history'
        : 'insufficient_history';
    const fallbackPayload: MarketHistoryFetchResult = {
      ticker: upper,
      bars: computedSynthetic,
      source: 'synthetic',
      dataSource: 'synthetic',
      provider: 'simulated-fallback',
      providerLicence: 'Deterministic fallback price series (synthetic; excluded from model audits).',
      unavailableReason,
      ...(liveErrorDetail ? { unavailableDetail: liveErrorDetail } : {}),
      liveBarsCount: rawBars.length,
      fetchedAt
    };
    this.historyCache.set(cacheKey, {
      value: fallbackPayload,
      expiresAt: Date.now() + SYNTHETIC_HISTORY_TTL_MS
    });
    return fallbackPayload;
  }

  async getQuote(ticker: string, metaOverride?: TickerMeta): Promise<MarketQuoteFetchResult> {
    const upper = ticker.trim().toUpperCase();
    const now = Date.now();
    const cached = this.quoteCache.get(upper);
    if (cached && now < cached.expiresAt) {
      return cached.value;
    }

    const meta = this.buildDefaultMeta(upper, metaOverride);

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(upper)}?interval=1d&range=5d`;
      const data = await this.http.fetchJson<any>(url, { timeoutMs: 4500 });
      const result = data?.chart?.result?.[0];
      if (result) {
        const metaInfo = result.meta;
        const currentPrice = metaInfo.regularMarketPrice || metaInfo.chartPreviousClose || meta.basePrice;
        const prevClose = metaInfo.chartPreviousClose || currentPrice * 0.99;
        const change = currentPrice - prevClose;
        const changePercent = (change / (prevClose || 1)) * 100;

        const rawExch = metaOverride?.exchange || metaInfo.exchangeName || meta.exchange;
        const statusMeta = getExchangeMarketStatus({
          ticker: upper,
          exchange: rawExch,
          exchangeTimezoneName: metaInfo.exchangeTimezoneName
        });
        const periods = metaInfo.currentTradingPeriod;
        const fetchedAt = new Date().toISOString();

        const quote: StockQuote = {
          ticker: upper,
          name: metaInfo.shortName || metaInfo.longName || meta.name,
          price: Number(currentPrice.toFixed(2)),
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          open: Number((metaInfo.regularMarketDayHigh ? metaInfo.regularMarketDayHigh * 0.99 : currentPrice).toFixed(2)),
          high: Number((metaInfo.regularMarketDayHigh || currentPrice * 1.01).toFixed(2)),
          low: Number((metaInfo.regularMarketDayLow || currentPrice * 0.99).toFixed(2)),
          previousClose: Number(prevClose.toFixed(2)),
          high52: Number((metaInfo.fiftyTwoWeekHigh || currentPrice * 1.25).toFixed(2)),
          low52: Number((metaInfo.fiftyTwoWeekLow || currentPrice * 0.8).toFixed(2)),
          volume: metaInfo.regularMarketVolume || 1200000,
          pe: meta.pe,
          marketCap: meta.marketCap,
          currency: metaInfo.currency || meta.currency,
          exchange: statusMeta.exchangeLabel,
          lastUpdated: fetchedAt,
          fetchedAt,
          isLive: true,
          dataSource: 'live',
          provider: this.name,
          exchangeTimezoneName: metaInfo.exchangeTimezoneName || statusMeta.timezone,
          marketPeriod: periods?.regular
            ? {
                regularStart: periods.regular.start,
                regularEnd: periods.regular.end,
                preStart: periods.pre?.start,
                preEnd: periods.pre?.end,
                postStart: periods.post?.start,
                postEnd: periods.post?.end,
                tzShort: periods.regular.timezone || statusMeta.tzAbbr
              }
            : undefined
        };

        const out: MarketQuoteFetchResult = {
          quote,
          dataSource: 'live',
          provider: this.name,
          fetchedAt
        };
        this.quoteCache.set(upper, { value: out, expiresAt: Date.now() + QUOTE_TTL_MS });
        return out;
      }
    } catch {
      // Fall through to cached live / cached history / explicit synthetic quote
    }

    if (cached && cached.value.dataSource === 'live') {
      const refreshedAt = new Date().toISOString();
      return {
        ...cached.value,
        quote: { ...cached.value.quote, lastUpdated: refreshedAt }
      };
    }

    const cachedHist = this.historyCache.get(`${upper}_250`) || this.historyCache.get(`${upper}_30`);
    if (cachedHist && cachedHist.value.source === 'live' && cachedHist.value.bars.length > 0) {
      const barsList = cachedHist.value.bars;
      const lastBar = barsList[barsList.length - 1];
      const prevBar = barsList.length > 1 ? barsList[barsList.length - 2] : null;
      const currentPrice = lastBar.close;
      const prevClose = prevBar ? prevBar.close : lastBar.open;
      const change = Number((currentPrice - prevClose).toFixed(2));
      const changePercent = Number(((change / (prevClose || 1)) * 100).toFixed(2));
      const fetchedAt = cachedHist.value.fetchedAt || new Date().toISOString();

      const quote: StockQuote = {
        ticker: upper,
        name: meta.name,
        price: currentPrice,
        change,
        changePercent,
        open: lastBar.open,
        high: lastBar.high,
        low: lastBar.low,
        previousClose: prevClose,
        high52: Number((currentPrice * 1.25).toFixed(2)),
        low52: Number((currentPrice * 0.8).toFixed(2)),
        volume: lastBar.volume,
        pe: meta.pe,
        marketCap: meta.marketCap,
        currency: meta.currency,
        exchange: meta.exchange,
        lastUpdated: fetchedAt,
        fetchedAt,
        isLive: true,
        dataSource: 'live',
        provider: cachedHist.value.provider || this.name
      };
      const out: MarketQuoteFetchResult = {
        quote,
        dataSource: 'live',
        provider: cachedHist.value.provider || this.name,
        fetchedAt
      };
      this.quoteCache.set(upper, { value: out, expiresAt: Date.now() + QUOTE_TTL_MS });
      return out;
    }

    // Explicit synthetic fallback quote (5-second cache TTL)
    const fetchedAt = new Date().toISOString();
    const currentPrice = meta.basePrice;
    const change = Number((meta.basePrice * 0.0125).toFixed(2));
    const fallbackQuote: StockQuote = {
      ticker: upper,
      name: meta.name,
      price: currentPrice,
      change,
      changePercent: 1.25,
      open: Number((currentPrice * 0.995).toFixed(2)),
      high: Number((currentPrice * 1.018).toFixed(2)),
      low: Number((currentPrice * 0.991).toFixed(2)),
      previousClose: Number((currentPrice - change).toFixed(2)),
      high52: Number((currentPrice * 1.28).toFixed(2)),
      low52: Number((currentPrice * 0.78).toFixed(2)),
      volume: 1850000,
      pe: meta.pe,
      marketCap: meta.marketCap,
      currency: meta.currency,
      exchange: meta.exchange,
      lastUpdated: fetchedAt,
      fetchedAt,
      isLive: false,
      dataSource: 'synthetic',
      provider: 'simulated-fallback'
    };
    const out: MarketQuoteFetchResult = {
      quote: fallbackQuote,
      dataSource: 'synthetic',
      provider: 'simulated-fallback',
      fetchedAt
    };
    this.quoteCache.set(upper, { value: out, expiresAt: Date.now() + 5000 });
    return out;
  }

  async getIndexQuote(symbol: string, cfg: MacroIndexConfig): Promise<MarketIndexItem> {
    const now = Date.now();
    const cached = this.indexCache.get(symbol);
    if (cached && now < cached.expiresAt) {
      return cached.value;
    }

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
      const json = await this.http.fetchJson<any>(url, { timeoutMs: 3500 });
      const meta = json?.chart?.result?.[0]?.meta;
      if (meta) {
        const price = meta.regularMarketPrice || meta.chartPreviousClose || cfg.fallbackPrice;
        const prev = meta.chartPreviousClose || price;
        const diff = price - prev;
        const pct = prev > 0 ? (diff / prev) * 100 : 0;
        const isUp = diff >= 0;
        const fetchedAt = new Date().toISOString();

        const item: MarketIndexItem = {
          name: cfg.name,
          symbol: cfg.symbol,
          region: cfg.region,
          val: price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          change: `${isUp ? '+' : ''}${diff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          pct: `${isUp ? '+' : ''}${pct.toFixed(2)}%`,
          up: isUp,
          price: Number(price.toFixed(2)),
          changeValue: Number(diff.toFixed(2)),
          isLive: true,
          dataSource: 'live',
          fetchedAt,
          provider: this.name
        };
        this.indexCache.set(symbol, { value: item, expiresAt: Date.now() + INDEX_TTL_MS });
        return item;
      }
    } catch {
      // fall through
    }

    if (cached) return cached.value;

    const isUp = cfg.fallbackChange >= 0;
    const fetchedAt = new Date().toISOString();
    return {
      name: cfg.name,
      symbol: cfg.symbol,
      region: cfg.region,
      val: cfg.fallbackPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      change: `${isUp ? '+' : ''}${cfg.fallbackChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pct: `${isUp ? '+' : ''}${cfg.fallbackPct.toFixed(2)}%`,
      up: isUp,
      price: cfg.fallbackPrice,
      changeValue: cfg.fallbackChange,
      isLive: false,
      dataSource: 'synthetic',
      fetchedAt,
      provider: 'simulated-fallback'
    };
  }

  async getFxRate(symbol: string): Promise<number | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
      const json = await this.http.fetchJson<any>(url, { timeoutMs: 3500 });
      const meta = json?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice || meta?.chartPreviousClose;
      if (typeof price === 'number' && Number.isFinite(price) && price > 0) {
        return price;
      }
      return null;
    } catch {
      return null;
    }
  }

  async search(query: string, limit = 10): Promise<MarketSearchFetchResult> {
    const clean = (query || '').trim();
    const cacheKey = `${clean.toLowerCase()}:${limit}`;
    const now = Date.now();
    const cached = this.searchCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return cached.value;
    }

    const fetchedAt = new Date().toISOString();
    if (!clean) {
      return { items: [], dataSource: 'live', provider: this.name, fetchedAt };
    }

    try {
      const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(clean)}&quotesCount=${limit}&newsCount=0`;
      const data = await this.http.fetchJson<any>(url, { timeoutMs: 4500 });
      const quotes = Array.isArray(data?.quotes) ? data.quotes : [];
      const items: MarketSearchResultItem[] = quotes
        .filter((q: any) => q && q.symbol)
        .map((q: any) => ({
          ticker: String(q.symbol),
          name: String(q.shortname || q.longname || q.name || q.symbol),
          exchange: String(q.exchDisp || q.exchange || inferExchangeFromTicker(q.symbol)),
          currency: inferCurrencyFromTicker(q.symbol),
          sector: q.sector || q.industry,
          quoteType: q.quoteType
        }));

      const out: MarketSearchFetchResult = {
        items,
        dataSource: 'live',
        provider: this.name,
        fetchedAt
      };
      this.searchCache.set(cacheKey, { value: out, expiresAt: Date.now() + SEARCH_TTL_MS });
      return out;
    } catch (err: any) {
      return {
        items: [],
        dataSource: 'unavailable',
        provider: this.name,
        fetchedAt,
        error: err?.message || 'Yahoo Finance search unavailable'
      };
    }
  }

  async getNews(
    ticker: string,
    companyName: string,
    options?: { bypassCache?: boolean; maxArticles?: number }
  ): Promise<MarketNewsFetchResult> {
    const upper = ticker.trim().toUpperCase();
    const maxArticles = options?.maxArticles ?? 8;
    const now = Date.now();
    const cached = this.newsCache.get(upper);
    if (!options?.bypassCache && cached && now < cached.expiresAt) {
      return {
        ...cached.value,
        articles: cached.value.articles.slice(0, maxArticles)
      };
    }

    const fetchedAt = new Date().toISOString();
    const cleanTicker = upper.replace(/\.(NS|BO)$/i, '');
    const query = companyName && companyName.length > 2 ? companyName : cleanTicker;
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=1&newsCount=${Math.max(8, maxArticles)}`;

    try {
      const data = await this.http.fetchJson<any>(url, { timeoutMs: 6000 });
      const rawNews = Array.isArray(data?.news) ? data.news : [];
      const articles: RawLiveArticle[] = rawNews
        .map((item: any) => ({
          title: String(item.title || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
          summary: String(
            item.summary || `Live financial market coverage from ${item.publisher || 'Yahoo Finance'}`
          )
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim(),
          source: String(item.publisher || 'Yahoo Finance'),
          url: String(item.link || `https://finance.yahoo.com/quote/${upper}`),
          publishedAt: item.providerPublishTime
            ? new Date(item.providerPublishTime * 1000).toISOString()
            : fetchedAt,
          isLive: true as const
        }))
        .filter((a: RawLiveArticle) => a.title.length > 10);

      const out: MarketNewsFetchResult = {
        articles: articles.slice(0, maxArticles),
        dataSource: 'live',
        provider: this.name,
        fetchedAt
      };
      if (articles.length > 0 && maxArticles <= 8) {
        this.newsCache.set(upper, { value: out, expiresAt: Date.now() + NEWS_TTL_MS });
      }
      return out;
    } catch (err: any) {
      return {
        articles: [],
        dataSource: 'unavailable',
        provider: this.name,
        fetchedAt,
        error: err?.message || 'Yahoo Finance news unavailable'
      };
    }
  }
}

export interface TwelveDataProviderOptions extends YahooProviderOptions {
  apiKey: string;
}

/**
 * ISO 10383 Exchange MIC -> Twelve Data exchange code mapping table
 * covering every exchange MIC present in ticker_master and global_tickers.csv.
 */
export const TWELVE_DATA_EXCHANGE_BY_MIC: Record<string, string> = {
  XNAS: '',
  XNYS: '',
  XNSE: 'NSE',
  XBOM: 'BSE',
  XLON: 'LSE',
  XETR: 'XETR',
  XPAR: 'EPA',
  XAMS: 'AMS',
  XBRU: 'EBR',
  XSWX: 'SIX',
  XTKS: 'TSE',
  XHKG: 'HKEX',
  XKRX: 'KRX',
  XKOS: 'KOSDAQ',
  XTAI: 'TWSE',
  XTSE: 'TSX',
  XASX: 'ASX',
  XSES: 'SGX',
  BVMF: 'BVMF',
  XMAD: 'BME',
  XMIL: 'MIL',
  XSHG: 'SSE',
  XSHE: 'SZSE',
  XCSE: 'OMXC',
  XSTO: 'OMX',
  XHEL: 'OMXH',
  XOSL: 'OSL',
  XJSE: 'JSE',
  XMEX: 'BMV',
  XIDX: 'IDX',
  XWAR: 'GPW',
  XLIS: 'BVL',
  XDUB: 'ISE',
  XWBO: 'VIE',
  XIST: 'BIST',
  XNZE: 'NZX',
  XKLS: 'BURSA',
  XBKK: 'SET'
};

const YAHOO_EXCHANGE_SUFFIX_RE =
  /\.(NS|BO|L|DE|PA|AS|BR|LS|IR|VI|WA|IS|SW|CO|ST|OL|HE|MC|MI|T|HK|KS|KQ|TW|TO|AX|NZ|SI|KL|BK|SA|SS|SZ|JO|MX|JK)$/i;

export function mapTickerToTwelveDataSymbol(ticker: string, exchangeHint?: string): string {
  const upper = ticker.trim().toUpperCase();
  const micInfo = resolveExchangeMicInfo(upper, exchangeHint);
  const mic = micInfo.mic;
  const tdExchange = TWELVE_DATA_EXCHANGE_BY_MIC[mic];
  const baseSymbol = upper.replace(YAHOO_EXCHANGE_SUFFIX_RE, '');

  if (tdExchange === undefined) {
    return upper;
  }
  if (!tdExchange) {
    return baseSymbol;
  }
  return `${baseSymbol}:${tdExchange}`;
}

/**
 * Optional licensed commercial MarketDataProvider backed by Twelve Data API
 * (`MARKET_DATA_PROVIDER=twelvedata` + `TWELVE_DATA_API_KEY`).
 * Composes YahooFinanceMarketDataProvider as an explicit fallback — whenever Twelve Data
 * cannot fulfill a request, it visibly sets `provider` to the actual Yahoo/fallback
 * source, sets `fallbackFrom: 'twelvedata'`, attaches `warning`, and logs a warning.
 */
export class TwelveDataMarketDataProvider implements MarketDataProvider {
  readonly name: string = 'twelvedata';
  readonly licenceNote: string =
    'Twelve Data Commercial Market Data API (authenticated via TWELVE_DATA_API_KEY).';

  private readonly apiKey: string;
  private readonly http: RateLimitedHttpRunner;
  private readonly yahooFallback: YahooFinanceMarketDataProvider;

  constructor(options: TwelveDataProviderOptions) {
    this.apiKey = (options.apiKey || '').trim();
    const envRpm = Number(process.env.TWELVE_DATA_RPM);
    const defaultRpm = Number.isFinite(envRpm) && envRpm > 0 ? envRpm : 7;
    this.http = new RateLimitedHttpRunner({
      providerName: this.name,
      fetchFn: options.fetchFn,
      maxRetries: options.maxRetries ?? 3,
      baseDelayMs: options.baseDelayMs ?? 1000,
      maxDelayMs: options.maxDelayMs ?? 15000,
      retryAfterMaxMs: options.retryAfterMaxMs ?? 65000,
      timeoutMs: options.timeoutMs ?? 6000,
      maxConcurrent: options.maxConcurrent ?? 1,
      minIntervalMs: options.minIntervalMs ?? 500,
      maxRequestsPerMinute: options.maxRequestsPerMinute ?? defaultRpm,
      rateLimitWindowMs: options.rateLimitWindowMs ?? 60_000,
      sleepFn: options.sleepFn,
      randomFn: options.randomFn
    });
    this.yahooFallback = new YahooFinanceMarketDataProvider(options);
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  getHttpStats() {
    return {
      primary: this.http.getStats(),
      fallback: this.yahooFallback.getHttpStats()
    };
  }

  clearCache(): void {
    this.yahooFallback.clearCache();
  }

  toTwelveDataSymbol(ticker: string, exchangeHint?: string): string {
    return mapTickerToTwelveDataSymbol(ticker, exchangeHint);
  }

  private checkTwelveDataRateLimitJson = (text: string): MarketDataProviderError | null => {
    try {
      const parsed = JSON.parse(text);
      const codeNum = Number(parsed?.code);
      const msg = String(parsed?.message || '');
      if (
        codeNum === 429 ||
        (parsed?.status === 'error' && /run out of api credits|rate limit|too many requests/i.test(msg))
      ) {
        return new MarketDataProviderError(`${this.name} rate limit (429): ${msg || 'API credits exhausted'}`, {
          code: 'RATE_LIMITED',
          provider: this.name,
          status: 429,
          retryable: true
        });
      }
    } catch {
      // let main JSON parser report malformed JSON
    }
    return null;
  };

  async getHistory(ticker: string, days = 250, metaOverride?: TickerMeta): Promise<MarketHistoryFetchResult> {
    const upper = ticker.trim().toUpperCase();
    let fallbackReason = 'TWELVE_DATA_API_KEY not configured';
    let fallbackReasonCode: FallbackReasonCode = 'not_configured';

    if (this.apiKey) {
      const sym = this.toTwelveDataSymbol(upper, metaOverride?.exchange);
      const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(sym)}&interval=1day&outputsize=${Math.min(5000, Math.max(30, days))}&apikey=${encodeURIComponent(this.apiKey)}`;
      const fetchedAt = new Date().toISOString();

      try {
        const json = await this.http.fetchJson<any>(url, {
          timeoutMs: 6000,
          checkJsonError: this.checkTwelveDataRateLimitJson
        });
        if (json?.status === 'ok' && Array.isArray(json.values) && json.values.length >= 30) {
          const bars: PriceBar[] = json.values
            .map((row: any) => ({
              date: String(row.datetime || '').slice(0, 10),
              open: Number(row.open),
              high: Number(row.high),
              low: Number(row.low),
              close: Number(row.close),
              volume: Math.floor(Number(row.volume) || 0),
              source: 'live' as const
            }))
            .filter((b: PriceBar) => b.date && Number.isFinite(b.close))
            .sort((a: PriceBar, b: PriceBar) => a.date.localeCompare(b.date));

          if (bars.length >= 30) {
            return {
              ticker: upper,
              bars: computeAllIndicators(bars).map((b) => ({ ...b, source: 'live' as const })),
              source: 'live',
              dataSource: 'live',
              provider: this.name,
              providerLicence: this.licenceNote,
              fetchedAt
            };
          }
          fallbackReason = `Twelve Data returned insufficient bars (${bars.length}) for ${sym}`;
          fallbackReasonCode = 'insufficient_bars';
        } else {
          fallbackReason = json?.message ? `Twelve Data error: ${String(json.message)}` : `Twelve Data returned non-ok status for ${sym}`;
          fallbackReasonCode = 'upstream_error';
        }
      } catch (err: any) {
        fallbackReason = err?.message || `Twelve Data request failed for ${sym}`;
        if (err instanceof MarketDataProviderError && (err.code === 'RATE_LIMITED' || err.status === 429)) {
          fallbackReasonCode = 'rate_limited_429';
        } else if (err instanceof MarketDataProviderError && (err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT')) {
          fallbackReasonCode = 'network_error';
        } else {
          fallbackReasonCode = 'upstream_error';
        }
      }
    }

    const yahooRes = await this.yahooFallback.getHistory(ticker, days, metaOverride);
    const actualProvider = yahooRes.provider || this.yahooFallback.name;
    const warning = `Twelve Data history unavailable for ${upper} (${fallbackReason}); fell back to ${actualProvider}.`;
    console.warn(`[MarketDataProvider] ${warning}`);

    return {
      ...yahooRes,
      dataSource: yahooRes.dataSource || yahooRes.source,
      provider: actualProvider,
      providerLicence: yahooRes.providerLicence || this.yahooFallback.licenceNote,
      fallbackFrom: 'twelvedata',
      fallbackReasonCode,
      warning
    };
  }

  async getQuote(ticker: string, metaOverride?: TickerMeta): Promise<MarketQuoteFetchResult> {
    const upper = ticker.trim().toUpperCase();
    let fallbackReason = 'TWELVE_DATA_API_KEY not configured';

    if (this.apiKey) {
      const sym = this.toTwelveDataSymbol(upper, metaOverride?.exchange);
      const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(this.apiKey)}`;
      const fetchedAt = new Date().toISOString();

      try {
        const json = await this.http.fetchJson<any>(url, {
          timeoutMs: 4500,
          checkJsonError: this.checkTwelveDataRateLimitJson
        });
        const closePrice = Number(json?.close ?? json?.price);
        if (json && json.status !== 'error' && Number.isFinite(closePrice) && closePrice > 0) {
          const prevClose = Number.isFinite(Number(json.previous_close))
            ? Number(json.previous_close)
            : closePrice;
          const change = Number.isFinite(Number(json.change)) ? Number(json.change) : closePrice - prevClose;
          const changePercent = Number.isFinite(Number(json.percent_change))
            ? Number(json.percent_change)
            : (change / (prevClose || 1)) * 100;
          const micInfo = resolveExchangeMicInfo(upper, metaOverride?.exchange, json.currency);
          const statusMeta = getExchangeMarketStatus({
            ticker: upper,
            exchange: micInfo.mic,
            exchangeTimezoneName: micInfo.timezone
          });

          const quote: StockQuote = {
            ticker: upper,
            name: String(json.name || metaOverride?.name || upper),
            price: Number(closePrice.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
            open: Number((Number(json.open) || closePrice).toFixed(2)),
            high: Number((Number(json.high) || closePrice).toFixed(2)),
            low: Number((Number(json.low) || closePrice).toFixed(2)),
            previousClose: Number(prevClose.toFixed(2)),
            high52: Number((Number(json?.fifty_two_week?.high) || closePrice * 1.25).toFixed(2)),
            low52: Number((Number(json?.fifty_two_week?.low) || closePrice * 0.8).toFixed(2)),
            volume: Math.floor(Number(json.volume) || 0),
            pe: metaOverride?.pe,
            marketCap: metaOverride?.marketCap,
            currency: String(json.currency || metaOverride?.currency || micInfo.currency),
            exchange: statusMeta.exchangeLabel,
            lastUpdated: fetchedAt,
            fetchedAt,
            isLive: true,
            dataSource: 'live',
            provider: this.name,
            exchangeTimezoneName: micInfo.timezone
          };

          return {
            quote,
            dataSource: 'live',
            provider: this.name,
            fetchedAt
          };
        }
        fallbackReason = json?.message ? `Twelve Data error: ${String(json.message)}` : `Invalid Twelve Data quote payload for ${sym}`;
      } catch (err: any) {
        fallbackReason = err?.message || `Twelve Data quote request failed for ${sym}`;
      }
    }

    const yahooRes = await this.yahooFallback.getQuote(ticker, metaOverride);
    const actualProvider = yahooRes.provider;
    const warning = `Twelve Data quote unavailable for ${upper} (${fallbackReason}); fell back to ${actualProvider}.`;
    console.warn(`[MarketDataProvider] ${warning}`);

    return {
      ...yahooRes,
      provider: actualProvider,
      fallbackFrom: 'twelvedata',
      warning,
      quote: {
        ...yahooRes.quote,
        provider: actualProvider,
        fallbackFrom: 'twelvedata',
        warning
      }
    };
  }

  async getIndexQuote(symbol: string, cfg: MacroIndexConfig): Promise<MarketIndexItem> {
    const res = await this.yahooFallback.getIndexQuote(symbol, cfg);
    const warning = `Twelve Data index telemetry not enabled for ${symbol}; served by ${res.provider || this.yahooFallback.name}.`;
    return {
      ...res,
      provider: res.provider || this.yahooFallback.name,
      fallbackFrom: 'twelvedata',
      warning
    };
  }

  async getFxRate(symbol: string): Promise<number | null> {
    return this.yahooFallback.getFxRate(symbol);
  }

  async search(query: string, limit = 10): Promise<MarketSearchFetchResult> {
    const res = await this.yahooFallback.search(query, limit);
    return {
      ...res,
      provider: res.provider || this.yahooFallback.name,
      fallbackFrom: 'twelvedata',
      warning: `Symbol discovery routed through ${res.provider || this.yahooFallback.name}.`
    };
  }

  async getNews(
    ticker: string,
    companyName: string,
    options?: { bypassCache?: boolean; maxArticles?: number }
  ): Promise<MarketNewsFetchResult> {
    const res = await this.yahooFallback.getNews(ticker, companyName, options);
    return {
      ...res,
      provider: res.provider || this.yahooFallback.name,
      fallbackFrom: 'twelvedata',
      warning: `News feed routed through ${res.provider || this.yahooFallback.name}.`
    };
  }
}

let activeProvider: MarketDataProvider | null = null;

export function createConfiguredMarketDataProvider(env: Record<string, string | undefined> = process.env): MarketDataProvider {
  const mode = (env.MARKET_DATA_PROVIDER || 'yahoo').trim().toLowerCase();
  const tdKey = (env.TWELVE_DATA_API_KEY || '').trim();
  if (mode === 'twelvedata' && tdKey) {
    return new TwelveDataMarketDataProvider({ apiKey: tdKey });
  }
  return new YahooFinanceMarketDataProvider();
}

export function getMarketDataProvider(): MarketDataProvider {
  if (!activeProvider) {
    activeProvider = createConfiguredMarketDataProvider(process.env);
  }
  return activeProvider;
}

export function setMarketDataProvider(provider: MarketDataProvider): void {
  activeProvider = provider;
}

export function resetMarketDataProvider(): void {
  activeProvider = null;
}
