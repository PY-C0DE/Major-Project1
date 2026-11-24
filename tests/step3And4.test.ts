import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolvePostgresSslConfig } from '../src/db/index';
import { parseTickerMasterCsv } from '../scripts/importTickers';
import { inferCurrencyFromTicker } from '../src/utils/currency';
import { resolveExchangeMicInfo } from '../src/shared/tickerMetadata';
import {
  YahooFinanceMarketDataProvider,
  TwelveDataMarketDataProvider,
  createConfiguredMarketDataProvider,
  resetMarketDataProvider,
  setMarketDataProvider,
  MarketHistoryFetchResult
} from '../src/server/providers/marketDataProvider';
import { computeAllIndicators, PriceBar, ComputedBar } from '../src/server/math/indicators';
import {
  clearEvaluationCaches,
  runAggregateModelEvaluation,
  buildModelAuditPayload,
  evaluateSentimentAblationOnSeries,
  isModelEvaluationAvailable
} from '../src/server/math/evaluation';
import {
  alignTimestampToTradingDate,
  alignSentimentRecordsToExchangeCalendar,
  formatTimestampInExchangeTimezone,
  isExchangeHoliday,
  isExchangeTradingDay,
  getNextTradingDay
} from '../src/server/math/exchangeCalendar';
import { buildDailySentimentRecordsFromLiveArticles } from '../src/server/math/nlpEngine';
import { alignSentimentAndReturns } from '../src/server/math/lagAnalysis';
import { DailySentimentRecord, NewsItem } from '../src/types';

function makeLiveTradingSeries(days = 180, startIso = '2026-01-02', seedOffset = 1): ComputedBar[] {
  const raw: PriceBar[] = [];
  let cur = startIso;
  let price = 100 + seedOffset * 10;
  for (let i = 0; i < days; i++) {
    const dow = new Date(`${cur}T12:00:00Z`).getUTCDay();
    if (dow !== 0 && dow !== 6) {
      const wave = Math.sin((i + seedOffset) * 0.23) * 0.009 + 0.0005;
      const open = Number(price.toFixed(2));
      price = Math.max(10, price * (1 + wave));
      const close = Number(price.toFixed(2));
      raw.push({
        date: cur,
        open,
        high: Number((Math.max(open, close) * 1.006).toFixed(2)),
        low: Number((Math.min(open, close) * 0.994).toFixed(2)),
        close,
        volume: 1_500_000 + (i % 5) * 120_000,
        source: 'live'
      });
    }
    const nextDt = new Date(Date.parse(`${cur}T12:00:00Z`) + 86_400_000);
    cur = nextDt.toISOString().slice(0, 10);
  }
  return computeAllIndicators(raw);
}

describe('Postgres SSL Defaults & Extended Global Ticker Seed', () => {
  it('verifies certificates by default when SSL is enabled or host is remote, and warns on explicit override', () => {
    const warnings: string[] = [];
    const warn = (msg: string) => warnings.push(msg);

    // Localhost without SQL_SSL disables SSL
    assert.equal(resolvePostgresSslConfig({ SQL_HOST: '127.0.0.1' }, warn), false);
    assert.equal(warnings.length, 0);

    // Remote TCP host without SQL_SSL enables SSL with rejectUnauthorized: true
    assert.deepEqual(resolvePostgresSslConfig({ SQL_HOST: '34.101.10.2' }, warn), {
      rejectUnauthorized: true
    });
    assert.equal(warnings.length, 0);

    // SQL_SSL=true verifies certificates by default
    assert.deepEqual(resolvePostgresSslConfig({ SQL_HOST: '127.0.0.1', SQL_SSL: 'true' }, warn), {
      rejectUnauthorized: true
    });
    assert.equal(warnings.length, 0);

    // Explicit opt-out sets rejectUnauthorized: false AND logs security warning
    assert.deepEqual(
      resolvePostgresSslConfig(
        { SQL_HOST: '34.101.10.2', SQL_SSL: 'true', SQL_SSL_REJECT_UNAUTHORIZED: 'false' },
        warn
      ),
      { rejectUnauthorized: false }
    );
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /certificate verification is disabled/i);

    // Explicit SQL_SSL=false keeps SSL off
    assert.equal(resolvePostgresSslConfig({ SQL_HOST: '34.101.10.2', SQL_SSL: 'false' }, warn), false);

    // Unix domain sockets (e.g., Cloud SQL Auth Proxy) never support Postgres in-band TLS
    assert.equal(
      resolvePostgresSslConfig(
        {
          SQL_HOST: '/app/cloudsql/project:region:instance',
          SQL_SSL: 'True',
          SQL_SSL_REJECT_UNAUTHORIZED: 'True'
        },
        warn
      ),
      false
    );
  });

  it('parses extended global_tickers.csv covering 28+ exchanges including XKOS, XSHG, XSHE, XMAD, XMIL, XSTO, XOSL, XHEL, XBRU, XJSE, XMEX, XIDX', () => {
    const csvPath = path.resolve(process.cwd(), 'scripts/seeds/global_tickers.csv');
    const content = fs.readFileSync(csvPath, 'utf8');
    const items = parseTickerMasterCsv(content);
    assert.ok(items.length >= 135, `Expected expanded CSV seed >= 135 rows, got ${items.length}`);

    const mics = new Set(items.map((item) => item.exchange));
    for (const expectedMic of ['XKOS', 'XSHG', 'XSHE', 'XMAD', 'XMIL', 'XSTO', 'XOSL', 'XHEL', 'XBRU', 'XJSE', 'XMEX', 'XIDX']) {
      assert.ok(mics.has(expectedMic), `CSV seed should include exchange MIC ${expectedMic}`);
    }

    assert.equal(inferCurrencyFromTicker('WALMEX.MX'), 'MXN');
    assert.equal(inferCurrencyFromTicker('BBCA.JK'), 'IDR');
    assert.equal(resolveExchangeMicInfo('NPN.JO').mic, 'XJSE');
    assert.equal(resolveExchangeMicInfo('ABI.BR').mic, 'XBRU');
    assert.equal(resolveExchangeMicInfo('NOKIA.HE').mic, 'XHEL');
  });
});

describe('Step 3 — MarketDataProvider Abstraction (Retries, Rate Limiting, Caching, Provenance, Audit Record)', () => {
  it('retries transient 503/429 failures with backoff, does not retry 404, and caches live responses with fetchedAt', async () => {
    let callsForAapl = 0;
    let callsForMissing = 0;
    const sampleBars = makeLiveTradingSeries(60);
    const mockTimestamps = sampleBars.map((b) => Math.floor(Date.parse(`${b.date}T15:00:00Z`) / 1000));

    const mockFetch: typeof fetch = (async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes('MISSING')) {
        callsForMissing++;
        return new Response(JSON.stringify({ chart: { error: { code: 'Not Found' } } }), {
          status: 404,
          headers: { 'content-type': 'application/json' }
        });
      }
      callsForAapl++;
      if (callsForAapl === 1) {
        return new Response('rate limited', { status: 429, headers: { 'retry-after': '0' } });
      }
      if (callsForAapl === 2) {
        return new Response('server error', { status: 503 });
      }
      return new Response(
        JSON.stringify({
          chart: {
            result: [
              {
                meta: { exchangeName: 'NMS', currency: 'USD', exchangeTimezoneName: 'America/New_York' },
                timestamp: mockTimestamps,
                indicators: {
                  quote: [
                    {
                      open: sampleBars.map((b) => b.open),
                      high: sampleBars.map((b) => b.high),
                      low: sampleBars.map((b) => b.low),
                      close: sampleBars.map((b) => b.close),
                      volume: sampleBars.map((b) => b.volume)
                    }
                  ]
                }
              }
            ]
          }
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }) as typeof fetch;

    const provider = new YahooFinanceMarketDataProvider({
      fetchFn: mockFetch,
      maxRetries: 2,
      baseDelayMs: 2,
      minIntervalMs: 0
    });

    const first = await provider.getHistory('AAPL', 100);
    assert.equal(callsForAapl, 3, 'Should retry twice after 429 and 503 before succeeding');
    assert.equal(first.source, 'live');
    assert.equal(first.dataSource, 'live');
    assert.equal(first.provider, 'yahoo-finance-v8');
    assert.ok(first.fetchedAt && !isNaN(Date.parse(first.fetchedAt)));
    assert.ok(first.bars.every((b) => b.source === 'live'));

    // Cached second read must hit cache without making an HTTP request
    const second = await provider.getHistory('AAPL', 100);
    assert.equal(callsForAapl, 3, 'Cached history call should not invoke upstream fetch');
    assert.equal(second.fetchedAt, first.fetchedAt);

    // 404 falls back cleanly to explicitly labelled synthetic data WITHOUT retrying 3 times
    const missing = await provider.getHistory('MISSING', 60);
    assert.equal(callsForMissing, 1, '404 client error must not trigger retries');
    assert.equal(missing.source, 'synthetic');
    assert.equal(missing.dataSource, 'synthetic');
    assert.equal(missing.provider, 'simulated-fallback');
    assert.ok(missing.bars.length === 60);
    assert.ok(missing.bars.every((b) => b.source === 'synthetic'), 'Every fallback bar must be explicitly tagged synthetic');
  });

  it('enforces maxConcurrent rate-limiting across concurrent quote requests', async () => {
    let active = 0;
    let maxObserved = 0;

    const mockFetch: typeof fetch = (async () => {
      active++;
      maxObserved = Math.max(maxObserved, active);
      await new Promise((r) => setTimeout(r, 15));
      active--;
      return new Response(
        JSON.stringify({
          chart: {
            result: [
              {
                meta: {
                  regularMarketPrice: 120.5,
                  chartPreviousClose: 119.0,
                  currency: 'USD',
                  exchangeName: 'NMS',
                  exchangeTimezoneName: 'America/New_York'
                }
              }
            ]
          }
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }) as typeof fetch;

    const provider = new YahooFinanceMarketDataProvider({
      fetchFn: mockFetch,
      maxConcurrent: 2,
      minIntervalMs: 5,
      maxRetries: 0
    });

    await Promise.all([
      provider.getQuote('AAPL'),
      provider.getQuote('MSFT'),
      provider.getQuote('NVDA'),
      provider.getQuote('GOOGL'),
      provider.getQuote('AMZN')
    ]);

    assert.ok(maxObserved <= 2, `Expected max concurrent upstream requests <= 2, saw ${maxObserved}`);
  });

  it('selects TwelveDataMarketDataProvider behind MARKET_DATA_PROVIDER flag and records provider name + licence in audit.json', async () => {
    const td = createConfiguredMarketDataProvider({
      MARKET_DATA_PROVIDER: 'twelvedata',
      TWELVE_DATA_API_KEY: 'test-td-key'
    });
    assert.ok(td instanceof TwelveDataMarketDataProvider);
    assert.equal(td.name, 'twelvedata');

    setMarketDataProvider(td);
    clearEvaluationCaches();
    try {
      const fetcher = async (ticker: string): Promise<MarketHistoryFetchResult> => ({
        ticker,
        bars: makeLiveTradingSeries(180, '2025-10-01', ticker === 'AAPL' ? 1 : 2),
        source: 'live',
        dataSource: 'live',
        provider: td.name,
        providerLicence: td.licenceNote,
        fetchedAt: '2026-11-24T00:00:00.000Z'
      });

      const evalRes = await runAggregateModelEvaluation(fetcher, [
        { ticker: 'AAPL', name: 'Apple Inc.' },
        { ticker: 'MSFT', name: 'Microsoft Corp.' }
      ]);
      assert.ok(isModelEvaluationAvailable(evalRes));
      const auditPayload = buildModelAuditPayload(evalRes);
      assert.equal(auditPayload.available, true);
      assert.equal(auditPayload.dataProvider, 'twelvedata');
      assert.match(auditPayload.dataProviderLicence || '', /Twelve Data/i);
    } finally {
      resetMarketDataProvider();
      clearEvaluationCaches();
    }
  });
});

describe('Step 4 — Exchange Calendars, Holidays, DST Transitions & Exchange-Local Sentiment Alignment', () => {
  it('aligns NSE (Asia/Kolkata) news across close cutoff (15:30 IST) and Indian market holidays (Holi & Gandhi Jayanti)', () => {
    // 2026-03-02 09:00 UTC = 14:30 IST (open NSE day before Holi 2026-03-03)
    const preClose = alignTimestampToTradingDate('2026-03-02T09:00:00Z', 'RELIANCE.NS');
    assert.equal(preClose.exchangeLocalDate, '2026-03-02');
    assert.equal(preClose.tradingDate, '2026-03-02');
    assert.equal(preClose.rolledForward, false);

    // 2026-03-02 10:30 UTC = 16:00 IST (after NSE close -> rolls forward skipping Holi 2026-03-03 to 2026-03-04!)
    assert.equal(isExchangeHoliday('2026-03-03', 'RELIANCE.NS'), true);
    assert.equal(isExchangeTradingDay('2026-03-03', 'RELIANCE.NS'), false);
    const afterCloseBeforeHoliday = alignTimestampToTradingDate('2026-03-02T10:30:00Z', 'RELIANCE.NS');
    assert.equal(afterCloseBeforeHoliday.tradingDate, '2026-03-04');
    assert.equal(afterCloseBeforeHoliday.rolledForward, true);

    // Gandhi Jayanti (Oct 2, 2026 Friday) -> rolls over weekend to Oct 5 Monday
    assert.equal(isExchangeHoliday('2026-10-02', 'XNSE'), true);
    assert.equal(getNextTradingDay('2026-10-02', 'XNSE'), '2026-10-05');
  });

  it('handles NYSE (America/New_York) DST transitions (March spring-forward & November fall-back) and US holidays', () => {
    // Before US DST spring-forward (2026-03-08): 20:30 UTC == 15:30 EST (before 16:00 close)
    const preDst = alignTimestampToTradingDate('2026-03-06T20:30:00Z', 'AAPL');
    assert.equal(preDst.exchangeLocalHour, 15);
    assert.equal(preDst.exchangeLocalMinute, 30);
    assert.equal(preDst.tradingDate, '2026-03-06');
    assert.equal(preDst.rolledForward, false);

    // After US DST spring-forward (2026-03-09): same UTC instant 20:30 UTC == 16:30 EDT (AFTER 16:00 close!)
    const postSpringDst = alignTimestampToTradingDate('2026-03-09T20:30:00Z', 'AAPL');
    assert.equal(postSpringDst.exchangeLocalHour, 16);
    assert.equal(postSpringDst.exchangeLocalMinute, 30);
    assert.equal(postSpringDst.tradingDate, '2026-03-10');
    assert.equal(postSpringDst.rolledForward, true);
    assert.equal(postSpringDst.rollReason, 'after_close');

    // Fall-back DST (2026-11-01): 20:30 UTC on 2026-11-02 == 15:30 EST (before close again)
    const postFallBack = alignTimestampToTradingDate('2026-11-02T20:30:00Z', 'AAPL');
    assert.equal(postFallBack.exchangeLocalHour, 15);
    assert.equal(postFallBack.tradingDate, '2026-11-02');
    assert.equal(postFallBack.rolledForward, false);

    // Thanksgiving Holiday (2026-11-26) -> rolls to 2026-11-27
    assert.equal(isExchangeHoliday('2026-11-26', 'XNYS'), true);
    const thanksgiving = alignTimestampToTradingDate('2026-11-26T15:00:00Z', 'AAPL');
    assert.equal(thanksgiving.tradingDate, '2026-11-27');
    assert.equal(thanksgiving.rollReason, 'holiday');

    // Observed Independence Day (2026-07-04 Sat -> observed 2026-07-03 Fri): after close Thu 2026-07-02 rolls to Mon 2026-07-06
    assert.equal(isExchangeHoliday('2026-07-03', 'XNYS'), true);
    const july4Weekend = alignTimestampToTradingDate('2026-07-02T21:00:00Z', 'AAPL');
    assert.equal(july4Weekend.tradingDate, '2026-07-06');
  });

  it('aligns KRX (Asia/Seoul) UTC midnight shifts and Korean holidays (Independence Day Substitute & Year-End Closure)', () => {
    // 2026-03-01 16:30 UTC == 2026-03-02 01:30 KST (Mon substitute for Mar 1 Independence Movement Day) -> rolls to 2026-03-03
    assert.equal(formatTimestampInExchangeTimezone('2026-03-01T16:30:00Z', '005930.KS'), '2026-03-02');
    assert.equal(isExchangeHoliday('2026-03-02', '005930.KS'), true);
    const krHoliday = alignTimestampToTradingDate('2026-03-01T16:30:00Z', '005930.KS');
    assert.equal(krHoliday.exchangeLocalDate, '2026-03-02');
    assert.equal(krHoliday.tradingDate, '2026-03-03');

    // Regular KRX session: 05:30 UTC == 14:30 KST (before 15:30 KST close); 07:00 UTC == 16:00 KST (after close)
    const krOpen = alignTimestampToTradingDate('2026-03-04T05:30:00Z', '005930.KS');
    assert.equal(krOpen.tradingDate, '2026-03-04');
    const krAfter = alignTimestampToTradingDate('2026-03-04T07:00:00Z', '005930.KS');
    assert.equal(krAfter.tradingDate, '2026-03-05');

    // KRX Dec 31 year-end market holiday
    assert.equal(isExchangeHoliday('2026-12-31', 'XKRX'), true);
  });

  it('aligns European XETRA (Europe/Berlin) across EU DST transitions and Easter holiday weekend', () => {
    // Before EU DST spring-forward (2026-03-29): 2026-03-27 16:00 UTC == 17:00 CET (before 17:30 CET close)
    const cetPre = alignTimestampToTradingDate('2026-03-27T16:00:00Z', 'SAP.DE');
    assert.equal(cetPre.exchangeLocalHour, 17);
    assert.equal(cetPre.tradingDate, '2026-03-27');
    assert.equal(cetPre.rolledForward, false);

    // After EU DST spring-forward (2026-03-30): 16:00 UTC == 18:00 CEST (after 17:30 CEST close -> next day)
    const cestPost = alignTimestampToTradingDate('2026-03-30T16:00:00Z', 'SAP.DE');
    assert.equal(cestPost.exchangeLocalHour, 18);
    assert.equal(cestPost.tradingDate, '2026-03-31');
    assert.equal(cestPost.rolledForward, true);

    // XETRA Good Friday (2026-04-03) + Easter Monday (2026-04-06): Thu after-close rolls to Tue 2026-04-07
    assert.equal(isExchangeHoliday('2026-04-03', 'XETR'), true);
    assert.equal(isExchangeHoliday('2026-04-06', 'XETR'), true);
    const easterRoll = alignTimestampToTradingDate('2026-04-02T16:30:00Z', 'SAP.DE');
    assert.equal(easterRoll.tradingDate, '2026-04-07');
  });

  it('aligns live news daily aggregation, lag analysis, and causal sentiment ablation cleanly across holidays & DST', () => {
    const liveArticles: NewsItem[] = [
      {
        id: 'art-1',
        ticker: 'SAP.DE',
        headline: 'SAP Beats Q1 Cloud Guidance',
        summary: 'Strong backlog growth.',
        source: 'Reuters',
        url: 'https://example.com/1',
        publishedAt: '2026-04-02T16:30:00Z', // 18:30 CEST -> rolls over Good Friday + Easter Monday to 2026-04-07
        sentiment: 'positive',
        sentimentScore: 0.72,
        probabilities: { positive: 0.82, neutral: 0.08, negative: 0.1 },
        confidence: 0.82,
        factCheckStatus: 'Verified',
        verificationScore: 0.98,
        sourceCredibility: 0.98,
        isLive: true,
        dataSource: 'live',
        sentimentSource: 'finbert'
      }
    ];

    const records = buildDailySentimentRecordsFromLiveArticles('SAP.DE', liveArticles);
    assert.equal(records.length, 1);
    assert.equal(records[0].date, '2026-04-07');

    // Holiday sentiment records passed directly into alignSentimentAndReturns snap onto next exchange trading bar
    const bars: Pick<ComputedBar, 'date' | 'close'>[] = [
      { date: '2026-04-02', close: 200 },
      { date: '2026-04-07', close: 204 },
      { date: '2026-04-08', close: 208 }
    ];
    const holidayRecord: DailySentimentRecord[] = [
      {
        ticker: 'SAP.DE',
        date: '2026-04-03', // Good Friday holiday
        credibilityWeightedNetScore: 0.8,
        articleCount: 2,
        sentimentSource: 'finbert',
        updatedAt: '2026-04-03T10:00:00Z'
      }
    ];

    const lag1Pairs = alignSentimentAndReturns(bars, holidayRecord, 1);
    assert.equal(lag1Pairs.length, 1);
    assert.equal(lag1Pairs[0].date, '2026-04-07');
    assert.ok(Math.abs(lag1Pairs[0].ret - (208 - 204) / 204) < 1e-6);

    const alignedForEval = alignSentimentRecordsToExchangeCalendar(holidayRecord, 'SAP.DE');
    assert.equal(alignedForEval[0].date, '2026-04-07');

    // Causal ablation handles holiday-aligned records without failing or leaking
    const nyseBars = makeLiveTradingSeries(180, '2026-01-02', 3);
    const nyseSentiment: DailySentimentRecord[] = nyseBars.slice(-30).map((b) => ({
      ticker: 'AAPL',
      date: b.date,
      credibilityWeightedNetScore: 0.25,
      articleCount: 2,
      sentimentSource: 'finbert',
      updatedAt: `${b.date}T15:00:00Z`
    }));
    const ablation = evaluateSentimentAblationOnSeries(
      [{ ticker: 'AAPL', bars: nyseBars, sentimentRecords: nyseSentiment }],
      { minMatchedSamples: 10, minMatchedDates: 10, resamples: 100 }
    );
    assert.equal(ablation.available, true);
    assert.ok(ablation.matchedSamples >= 10);
  });
});
