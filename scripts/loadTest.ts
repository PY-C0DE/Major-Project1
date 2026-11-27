import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import autocannon from 'autocannon';
import { createApp } from '../server';
import { db, getRepository } from '../src/server/store/db';
import { closePool } from '../src/db/index';
import { BackgroundJobQueue } from '../src/server/jobs/jobQueue';
import { computeAllIndicators, PriceBar } from '../src/server/math/indicators';
import {
  MarketDataProvider,
  MarketHistoryFetchResult,
  MarketNewsFetchResult,
  MarketQuoteFetchResult,
  MarketSearchFetchResult,
  resetMarketDataProvider,
  setMarketDataProvider
} from '../src/server/providers/marketDataProvider';
import { MarketIndexItem, StockQuote } from '../src/types';
import { MacroIndexConfig } from '../src/shared/macroMarkets';

interface PercentileSummary {
  p50Ms: number;
  p95Ms: number;
  p975Ms: number;
  p99Ms: number;
  maxMs: number;
}

interface EndpointStageResult {
  endpoint: string;
  method: 'GET' | 'POST';
  connections: number;
  durationSec: number;
  totalRequests: number;
  rpsAvg: number;
  latency: PercentileSummary;
  errors: number;
  timeouts: number;
  non2xx: number;
}

function computePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  const idx = Math.max(0, Math.min(sorted.length - 1, rank));
  return Number(sorted[idx].toFixed(2));
}

function buildOfflineBenchmarkProvider(
  sampleBars: ReturnType<typeof computeAllIndicators>
): MarketDataProvider {
  const fetchedAt = '2026-11-26T00:00:00.000Z';
  const lastBar = sampleBars[sampleBars.length - 1];
  const prevBar = sampleBars[sampleBars.length - 2] ?? lastBar;

  const stubQuote: StockQuote = {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    price: lastBar.close,
    change: Number((lastBar.close - prevBar.close).toFixed(2)),
    changePercent: Number((((lastBar.close - prevBar.close) / (prevBar.close || 1)) * 100).toFixed(2)),
    open: lastBar.open,
    high: lastBar.high,
    low: lastBar.low,
    previousClose: prevBar.close,
    high52: Number((lastBar.close * 1.25).toFixed(2)),
    low52: Number((lastBar.close * 0.72).toFixed(2)),
    volume: lastBar.volume,
    pe: 42.5,
    marketCap: 3_100_000_000_000,
    currency: 'USD',
    exchange: 'NASDAQ',
    lastUpdated: fetchedAt,
    fetchedAt,
    isLive: true,
    dataSource: 'live',
    provider: 'loadtest-fixture',
    exchangeTimezoneName: 'America/New_York'
  };

  return {
    name: 'loadtest-fixture',
    licenceNote: 'Local deterministic OHLCV fixture for HTTP throughput benchmarking only.',
    async getHistory(ticker: string): Promise<MarketHistoryFetchResult> {
      return {
        ticker,
        bars: sampleBars.map((b) => ({ ...b, source: 'live' as const })),
        source: 'live',
        dataSource: 'live',
        provider: 'loadtest-fixture',
        fetchedAt
      };
    },
    async getQuote(ticker: string): Promise<MarketQuoteFetchResult> {
      return {
        quote: { ...stubQuote, ticker },
        dataSource: 'live',
        provider: 'loadtest-fixture',
        fetchedAt
      };
    },
    async getIndexQuote(symbol: string, cfg: MacroIndexConfig): Promise<MarketIndexItem> {
      return {
        name: cfg.name,
        symbol,
        region: cfg.region,
        val: '5,000.00',
        change: '+12.00',
        pct: '+0.24%',
        up: true,
        price: 5000,
        changeValue: 12,
        isLive: true,
        dataSource: 'live',
        fetchedAt,
        provider: 'loadtest-fixture'
      };
    },
    async getFxRate(): Promise<number | null> {
      return 1;
    },
    async search(): Promise<MarketSearchFetchResult> {
      return {
        items: [],
        dataSource: 'live',
        provider: 'loadtest-fixture',
        fetchedAt
      };
    },
    async getNews(ticker: string): Promise<MarketNewsFetchResult> {
      return {
        articles: [
          {
            title: `${ticker} posts steady data center growth in quarterly update`,
            summary: `${ticker} reported steady quarterly infrastructure demand.`,
            source: 'Reuters',
            url: 'https://example.com/news/1',
            publishedAt: '2026-11-25T14:30:00Z',
            isLive: true
          },
          {
            title: `${ticker} maintains full-year capital expenditure outlook`,
            summary: `${ticker} reiterated its full-year capital spending guidance.`,
            source: 'Bloomberg',
            url: 'https://example.com/news/2',
            publishedAt: '2026-11-24T13:15:00Z',
            isLive: true
          }
        ],
        dataSource: 'live',
        provider: 'loadtest-fixture',
        fetchedAt
      };
    },
    clearCache(): void {}
  };
}

async function runStage(opts: {
  url: string;
  endpoint: string;
  method: 'GET' | 'POST';
  connections: number;
  durationSec: number;
  headers?: Record<string, string>;
  body?: string;
}): Promise<EndpointStageResult> {
  const responseLatencies: number[] = [];

  const result = await new Promise<autocannon.Result>((resolve, reject) => {
    const instance = autocannon(
      {
        url: `${opts.url}${opts.endpoint}`,
        method: opts.method,
        connections: opts.connections,
        duration: opts.durationSec,
        headers: opts.headers,
        body: opts.body,
        timeout: 20
      },
      (err, res) => {
        if (err) reject(err);
        else resolve(res);
      }
    );

    instance.on('response', (_client, _statusCode, _resBytes, responseTime) => {
      if (Number.isFinite(responseTime)) {
        responseLatencies.push(responseTime);
      }
    });
  });

  responseLatencies.sort((a, b) => a - b);
  const p95Measured =
    responseLatencies.length > 0
      ? computePercentile(responseLatencies, 95)
      : Number(result.latency.p97_5.toFixed(2));

  return {
    endpoint: opts.endpoint,
    method: opts.method,
    connections: opts.connections,
    durationSec: opts.durationSec,
    totalRequests: result.requests.total,
    rpsAvg: Number(result.requests.average.toFixed(1)),
    latency: {
      p50Ms: Number(result.latency.p50.toFixed(2)),
      p95Ms: p95Measured,
      p975Ms: Number(result.latency.p97_5.toFixed(2)),
      p99Ms: Number(result.latency.p99.toFixed(2)),
      maxMs: Number(result.latency.max.toFixed(2))
    },
    errors: result.errors,
    timeouts: result.timeouts,
    non2xx: result.non2xx
  };
}

function buildMarkdownReport(params: {
  measuredAt: string;
  repoBackend: string;
  nodeVersion: string;
  cpuModel: string;
  cpuCount: number;
  totalMemGb: string;
  durationSec: number;
  concurrencies: number[];
  stages: EndpointStageResult[];
}): string {
  const lines: string[] = [];
  lines.push('# AlphaQuant AI — Load & Concurrency Benchmark Report');
  lines.push('');
  lines.push(`- **Measured At (UTC):** \`${params.measuredAt}\``);
  lines.push(`- **Generator Command:** \`npx tsx scripts/loadTest.ts --write-report\``);
  lines.push(`- **Repository Backend:** \`${params.repoBackend}\``);
  lines.push(`- **Runtime:** Node \`${params.nodeVersion}\` | CPU: \`${params.cpuModel}\` (${params.cpuCount} cores) | RAM: \`${params.totalMemGb} GB\``);
  lines.push(`- **Stage Duration:** ${params.durationSec}s per tier for light/auth endpoints, ${Math.max(params.durationSec, 12)}s for CPU-bound \`/api/predictions/NVDA\` (\`c = ${params.concurrencies.join(', ')}\`)`);
  lines.push(
    '- **Test Conditions:** Loopback Express HTTP server with `createApp(...)`, rate limits raised for throughput measurement (rate-limit enforcement verified separately in `tests/security.test.ts`), and local deterministic OHLCV/news fixture provider (`MarketDataProvider`) so external Yahoo network throttling does not distort Express/DB/conformal timings.'
  );
  lines.push('');
  lines.push('## Measured Throughput & Latency Distribution');
  lines.push('');
  lines.push('| Endpoint | Connections | Dur (s) | Total Req | RPS (avg) | p50 (ms) | p95 (ms) | p97.5 (ms) | p99 (ms) | Max (ms) | Errors | Non-2xx |');
  lines.push('| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const s of params.stages) {
    lines.push(
      `| \`${s.method} ${s.endpoint}\` | ${s.connections} | ${s.durationSec} | ${s.totalRequests} | ${s.rpsAvg.toFixed(1)} | ${s.latency.p50Ms.toFixed(2)} | ${s.latency.p95Ms.toFixed(2)} | ${s.latency.p975Ms.toFixed(2)} | ${s.latency.p99Ms.toFixed(2)} | ${s.latency.maxMs.toFixed(2)} | ${s.errors + s.timeouts} | ${s.non2xx} |`
    );
  }
  lines.push('');

  const byEndpoint = new Map<string, EndpointStageResult[]>();
  for (const s of params.stages) {
    const key = `${s.method} ${s.endpoint}`;
    const arr = byEndpoint.get(key) || [];
    arr.push(s);
    byEndpoint.set(key, arr);
  }

  lines.push('## Bottleneck Analysis & Capacity Observations');
  lines.push('');
  for (const [ep, rows] of byEndpoint.entries()) {
    const c1 = rows[0];
    const cMax = rows[rows.length - 1];
    lines.push(
      `- **\`${ep}\`**: Peak average throughput ${Math.max(...rows.map((r) => r.rpsAvg)).toFixed(1)} RPS; latency scales from \`p50=${c1.latency.p50Ms.toFixed(2)}ms / p95=${c1.latency.p95Ms.toFixed(2)}ms\` at \`c=${c1.connections}\` to \`p50=${cMax.latency.p50Ms.toFixed(2)}ms / p95=${cMax.latency.p95Ms.toFixed(2)}ms / p99=${cMax.latency.p99Ms.toFixed(2)}ms\` at \`c=${cMax.connections}\` (errors: ${rows.reduce((a, b) => a + b.errors + b.timeouts, 0)}, non-2xx: ${rows.reduce((a, b) => a + b.non2xx, 0)}).`
    );
  }
  lines.push('');
  lines.push('### Key Architectural Bottlenecks');
  lines.push('1. **`POST /api/auth/login` (bcrypt + DB lookup):** Intentionally CPU-bound via salted `bcryptjs` password verification (cost factor 10). Under high concurrency (`c=25–50`), event-loop/thread-pool hashing caps throughput and raises tail latency, which aligns cleanly with the production `5 req/min` credential rate limiter (`authCredentialLimiter`).');
  lines.push('2. **`GET /api/predictions/:ticker` (Synchronous Conformal & Ensemble Training):** Fits the 4-learner AlphaQuant ensemble + split-conformal calibration windows synchronously on the Node event loop per request. Heavy horizontal traffic should front this route with worker threads or short-TTL response caching keyed by latest market bar timestamp.');
  lines.push('3. **`GET /api/tickers/search` (Indexed `ticker_master` Queries):** Leverages PostgreSQL indexes (`ticker_master_active_country_exchange_idx`, `ticker_master_name_idx`, `ticker_master_exchange_code_idx`) with SQL `LIMIT/OFFSET` pagination across active equities.');
  lines.push('4. **`GET /api/jobs` (JWT Auth + Queue Snapshot):** Lightweight HMAC-SHA256 verification + user lookup; scales with Postgres connection pool size (with Redis connection latency when `JOB_QUEUE_BACKEND=bullmq`).');
  lines.push('');
  lines.push('## Honest Scope & Limitations');
  lines.push('- These numbers reflect single-process loopback Express + active repository behavior under a deterministic local OHLCV fixture provider; live Yahoo Finance / Twelve Data upstream network variance, FinBERT cold ONNX model loading on uncached multilingual/English headlines, and multi-region Cloud SQL round-trip RTT vary with external network conditions.');
  lines.push('- Default production rate limits (`authCredentialLimiter: 5/min`, `heavyJobRateLimiter: 20/min`, `apiRateLimiter: 300/min`) were raised inside this benchmark harness strictly to measure unthrottled endpoint saturation behavior.');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const writeReport = args.has('--write-report');
  const durationSec = Number(process.env.LOAD_TEST_DURATION_SEC || '4') || 4;
  const concurrencies = [1, 10, 25, 50];

  const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/synthetic_ohlcv.json');
  const rawBars: PriceBar[] = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  const computedBars = computeAllIndicators(rawBars);

  const prevDisableFinbert = process.env.DISABLE_FINBERT;
  process.env.DISABLE_FINBERT = 'true';
  const benchmarkProvider = buildOfflineBenchmarkProvider(computedBars);
  setMarketDataProvider(benchmarkProvider);

  const queue = new BackgroundJobQueue({ concurrency: 2, warnOnFallback: false });
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  const app = createApp({
    allowDemoMode: false,
    jwtSecret,
    apiRateLimitMax: 1_000_000,
    authRateLimitMax: 1_000_000,
    heavyRateLimitMax: 1_000_000,
    jobQueue: queue,
    fetchHistoryWithSource: async (ticker: string) => benchmarkProvider.getHistory(ticker, 250)
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind ephemeral benchmark HTTP server.');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const repoBackend = getRepository().constructor.name;

  const benchEmail = `loadtest-${Date.now()}@alphaquant.local`;
  const benchPassword = 'LoadTest!Password2026';
  let benchToken = '';

  try {
    // Register ephemeral benchmark user and enqueue one lightweight refit job
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Load Benchmark Runner',
        email: benchEmail,
        password: benchPassword
      })
    });
    if (!regRes.ok) {
      throw new Error(`Benchmark user registration failed (${regRes.status}): ${await regRes.text()}`);
    }
    const regJson = (await regRes.json()) as { token: string };
    benchToken = regJson.token;

    // Warm up search/prediction once (verifies 200 OK on every endpoint before timing)
    for (const checkPath of ['/api/tickers/search?q=RELIANCE&limit=24', '/api/predictions/NVDA']) {
      const r = await fetch(`${baseUrl}${checkPath}`);
      if (!r.ok) throw new Error(`Warmup GET ${checkPath} failed: ${r.status}`);
    }
    const jobWarm = await fetch(`${baseUrl}/api/jobs`, {
      headers: { authorization: `Bearer ${benchToken}` }
    });
    if (!jobWarm.ok) throw new Error(`Warmup GET /api/jobs failed: ${jobWarm.status}`);

    const endpoints: Array<{
      endpoint: string;
      method: 'GET' | 'POST';
      durationSec?: number;
      headers?: Record<string, string>;
      body?: string;
    }> = [
      { endpoint: '/api/tickers/search?q=RELIANCE&limit=24', method: 'GET', durationSec },
      {
        endpoint: '/api/auth/login',
        method: 'POST',
        durationSec,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: benchEmail, password: benchPassword })
      },
      {
        endpoint: '/api/jobs',
        method: 'GET',
        durationSec,
        headers: { authorization: `Bearer ${benchToken}` }
      },
      // CPU-bound synchronous conformal/ensemble route runs last with a longer window so c=25/c=50 batches complete cleanly
      {
        endpoint: '/api/predictions/NVDA',
        method: 'GET',
        durationSec: Math.max(durationSec, 12)
      }
    ];

    const stages: EndpointStageResult[] = [];
    console.log(
      `[LoadTest] Target=${baseUrl} | Repository=${repoBackend} | BaseStageDuration=${durationSec}s | Concurrencies=${concurrencies.join(',')}`
    );

    for (const ep of endpoints) {
      const stageDur = ep.durationSec ?? durationSec;
      for (const c of concurrencies) {
        const res = await runStage({
          url: baseUrl,
          endpoint: ep.endpoint,
          method: ep.method,
          connections: c,
          durationSec: stageDur,
          headers: ep.headers,
          body: ep.body
        });
        stages.push(res);
        console.log(
          `  [${ep.method} ${ep.endpoint}] c=${c} (${stageDur}s): ${res.rpsAvg} RPS | p50=${res.latency.p50Ms}ms | p95=${res.latency.p95Ms}ms | p99=${res.latency.p99Ms}ms | err=${res.errors} | non2xx=${res.non2xx}`
        );
      }
      // Allow pool / event loop to drain cleanly between endpoint families
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (writeReport) {
      const cpus = os.cpus();
      const report = buildMarkdownReport({
        measuredAt: new Date().toISOString(),
        repoBackend,
        nodeVersion: process.version,
        cpuModel: cpus[0]?.model || 'unknown',
        cpuCount: cpus.length,
        totalMemGb: (os.totalmem() / (1024 ** 3)).toFixed(1),
        durationSec,
        concurrencies,
        stages
      });
      const outPath = path.resolve(process.cwd(), 'docs/load-test-report.md');
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, report, 'utf8');
      console.log(`[LoadTest] Wrote ${outPath}`);
    }
  } finally {
    // Clean up ephemeral load-test user cleanly so Cloud SQL has zero leftover test records
    if (benchToken) {
      await fetch(`${baseUrl}/api/account`, {
        method: 'DELETE',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${benchToken}`
        },
        body: JSON.stringify({
          confirmText: 'DELETE MY ACCOUNT',
          currentPassword: benchPassword
        })
      }).catch(() => {});
    } else {
      const leftover = await db.getUserByEmail(benchEmail).catch(() => undefined);
      if (leftover) await db.deleteUser(leftover.id).catch(() => {});
    }

    if (prevDisableFinbert === undefined) delete process.env.DISABLE_FINBERT;
    else process.env.DISABLE_FINBERT = prevDisableFinbert;
    resetMarketDataProvider();
    await queue.close().catch(() => {});
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closePool().catch(() => {});
  }
}

main().catch((err) => {
  console.error('[LoadTest] Fatal error:', err);
  process.exitCode = 1;
});
