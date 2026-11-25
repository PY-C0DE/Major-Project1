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
  TWELVE_DATA_EXCHANGE_BY_MIC,
  mapTickerToTwelveDataSymbol,
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
import { buildAuditCsv } from '../src/shared/auditExport';
import {
  EXCHANGE_HOLIDAY_COVERAGE,
  HOLIDAY_DATA_RETRIEVED_AT,
  MissingExchangeHolidayDataError,
  alignTimestampToTradingDate,
  alignSentimentRecordsToExchangeCalendar,
  formatTimestampInExchangeTimezone,
  getExchangeHolidaysForYear,
  getExchangeHolidayMetadata,
  hasExchangeHolidayCoverage,
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

  it('maps symbols across all 30 ticker_master exchange MICs for TwelveDataMarketDataProvider and fails non-silently on fallback', async () => {
    assert.equal(Object.keys(TWELVE_DATA_EXCHANGE_BY_MIC).length, 30);

    const sampleMappings: Array<[string, string | undefined, string]> = [
      ['AAPL', 'XNAS', 'AAPL'],
      ['JPM', 'XNYS', 'JPM'],
      ['RELIANCE.NS', undefined, 'RELIANCE:NSE'],
      ['TCS.BO', undefined, 'TCS:BSE'],
      ['AZN.L', undefined, 'AZN:LSE'],
      ['SAP.DE', undefined, 'SAP:XETR'],
      ['MC.PA', undefined, 'MC:EPA'],
      ['ASML.AS', undefined, 'ASML:AMS'],
      ['ABI.BR', undefined, 'ABI:EBR'],
      ['NESN.SW', undefined, 'NESN:SIX'],
      ['7203.T', undefined, '7203:TSE'],
      ['0700.HK', undefined, '0700:HKEX'],
      ['005930.KS', undefined, '005930:KRX'],
      ['035720.KQ', undefined, '035720:KOSDAQ'],
      ['2330.TW', undefined, '2330:TWSE'],
      ['RY.TO', undefined, 'RY:TSX'],
      ['CBA.AX', undefined, 'CBA:ASX'],
      ['D05.SI', undefined, 'D05:SGX'],
      ['PETR4.SA', undefined, 'PETR4:BVMF'],
      ['SAN.MC', undefined, 'SAN:BME'],
      ['ENI.MI', undefined, 'ENI:MIL'],
      ['600519.SS', undefined, '600519:SSE'],
      ['000001.SZ', undefined, '000001:SZSE'],
      ['NOVO-B.CO', undefined, 'NOVO-B:OMXC'],
      ['VOLV-B.ST', undefined, 'VOLV-B:OMX'],
      ['NOKIA.HE', undefined, 'NOKIA:OMXH'],
      ['EQNR.OL', undefined, 'EQNR:OSL'],
      ['NPN.JO', undefined, 'NPN:JSE'],
      ['WALMEX.MX', undefined, 'WALMEX:BMV'],
      ['BBCA.JK', undefined, 'BBCA:IDX']
    ];
    for (const [ticker, hint, expected] of sampleMappings) {
      assert.equal(mapTickerToTwelveDataSymbol(ticker, hint), expected, `MIC mapping mismatch for ${ticker}`);
    }

    // Verify fallback never masks itself as 'twelvedata': logs warning, sets fallbackFrom='twelvedata', provider=actualProvider
    const sampleBars = makeLiveTradingSeries(180, '2025-10-01', 4);
    const mockTimestamps = sampleBars.map((b) => Math.floor(Date.parse(`${b.date}T15:00:00Z`) / 1000));
    const warningsLogged: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warningsLogged.push(args.map(String).join(' '));
    };

    try {
      const mockFetch: typeof fetch = (async (url: string | URL | Request) => {
        const u = String(url);
        if (u.includes('api.twelvedata.com')) {
          return new Response(JSON.stringify({ status: 'error', message: 'Twelve Data symbol quota exhausted' }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
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

      const td = new TwelveDataMarketDataProvider({
        apiKey: 'test-td-key',
        fetchFn: mockFetch,
        maxRetries: 0,
        minIntervalMs: 0
      });

      const res = await td.getHistory('AAPL', 180);
      assert.equal(res.source, 'live');
      assert.equal(res.provider, 'yahoo-finance-v8');
      assert.notEqual(res.provider, 'twelvedata');
      assert.equal(res.fallbackFrom, 'twelvedata');
      assert.match(res.warning || '', /fell back to yahoo-finance-v8/i);
      assert.ok(warningsLogged.some((w) => w.includes('Twelve Data history unavailable for AAPL')));

      clearEvaluationCaches();
      setMarketDataProvider(td);
      const evalRes = await runAggregateModelEvaluation(
        async (ticker) => td.getHistory(ticker, 180),
        [{ ticker: 'AAPL', name: 'Apple Inc.' }]
      );
      assert.ok(isModelEvaluationAvailable(evalRes));
      const auditPayload = buildModelAuditPayload(evalRes);
      assert.equal(auditPayload.dataProvider, 'yahoo-finance-v8');
      assert.equal(auditPayload.fallbackFrom, 'twelvedata');
      assert.match(auditPayload.providerWarning || '', /fell back to yahoo-finance-v8/i);

      const csv = buildAuditCsv(auditPayload, 'AAPL');
      assert.match(csv, /fallbackFrom=twelvedata/);
      assert.match(csv, /# providerWarning:/);
    } finally {
      console.warn = origWarn;
      resetMarketDataProvider();
      clearEvaluationCaches();
    }
  });

  it('enforces verified exchange holiday coverage bounds (throwing MissingExchangeHolidayDataError for uncovered years) and applies date-holidays market rules', () => {
    assert.equal(HOLIDAY_DATA_RETRIEVED_AT, '2026-11-24');
    const nseMeta = getExchangeHolidayMetadata('XNSE');
    assert.ok(nseMeta);
    assert.equal(nseMeta.retrievedAt, '2026-11-24');
    assert.equal(hasExchangeHolidayCoverage('XNSE', 2026), true);
    assert.equal(hasExchangeHolidayCoverage('XNSE', 2027), false);

    // Uncovered future/past years and unsupported MICs must throw MissingExchangeHolidayDataError
    assert.throws(
      () => getExchangeHolidaysForYear('XNSE', 2027),
      (err: unknown) => err instanceof MissingExchangeHolidayDataError && err.mic === 'XNSE' && err.year === 2027
    );
    assert.throws(
      () => isExchangeHoliday('2023-01-26', 'XNSE'),
      (err: unknown) => err instanceof MissingExchangeHolidayDataError && err.mic === 'XNSE' && err.year === 2023
    );
    assert.throws(
      () => isExchangeTradingDay('2027-01-04', 'XKRX'),
      (err: unknown) => err instanceof MissingExchangeHolidayDataError && err.mic === 'XKRX' && err.year === 2027
    );
    assert.throws(
      () => getExchangeHolidaysForYear('XUNKNOWN', 2026),
      (err: unknown) => err instanceof MissingExchangeHolidayDataError && err.mic === 'XUNKNOWN'
    );

    // Market vs civil rules derived cleanly from date-holidays + exchange overrides:
    // NYSE Rule 7.2 remains OPEN on Columbus Day (2026-10-12) and Veterans Day (2026-11-11)
    assert.equal(isExchangeHoliday('2026-10-12', 'XNYS'), false);
    assert.equal(isExchangeHoliday('2026-11-11', 'XNYS'), false);
    // XETRA closes Dec 24 & Dec 31 and stays open German Unity Day (2026-10-03 is Sat; check 2025-10-03 Fri)
    assert.equal(isExchangeHoliday('2025-10-03', 'XETR'), false);
    assert.equal(isExchangeHoliday('2026-12-24', 'XETR'), true);
    assert.equal(isExchangeHoliday('2026-12-31', 'XETR'), true);
    // Every configured coverage entry must yield non-empty holiday sets within its declared window
    for (const [mic, spec] of Object.entries(EXCHANGE_HOLIDAY_COVERAGE)) {
      const set2026 = getExchangeHolidaysForYear(mic, spec.maxYear);
      assert.ok(set2026.size >= 4, `Expected >=4 holidays for ${mic} in ${spec.maxYear}, got ${set2026.size}`);
    }
  });

  it('aligns Tokyo TSE (XTKS, Asia/Tokyo, 7203.T) and Hong Kong HKEX (XHKG, Asia/Hong_Kong, 0700.HK) calendars & holidays', () => {
    // TSE (XTKS): session closes 15:30 JST (06:30 UTC)
    // 2026-05-01 05:00 UTC == 14:00 JST (before 15:30 JST close on Friday before Golden Week May 4-6)
    const tseOpen = alignTimestampToTradingDate('2026-05-01T05:00:00Z', '7203.T');
    assert.equal(tseOpen.exchangeLocalDate, '2026-05-01');
    assert.equal(tseOpen.tradingDate, '2026-05-01');
    assert.equal(tseOpen.rolledForward, false);

    // 2026-05-01 07:00 UTC == 16:00 JST (after close -> skips weekend + Greenery Day May 4 + Children's Day May 5 + Constitution Day substitute May 6 -> 2026-05-07!)
    assert.equal(isExchangeHoliday('2026-05-04', 'XTKS'), true);
    assert.equal(isExchangeHoliday('2026-05-05', 'XTKS'), true);
    assert.equal(isExchangeHoliday('2026-05-06', 'XTKS'), true);
    const tseGoldenWeek = alignTimestampToTradingDate('2026-05-01T07:00:00Z', '7203.T');
    assert.equal(tseGoldenWeek.tradingDate, '2026-05-07');
    assert.equal(tseGoldenWeek.rolledForward, true);

    // Statutory JPX closures: Jan 2, Jan 3, Dec 31
    assert.equal(isExchangeHoliday('2026-01-02', 'XTKS'), true);
    assert.equal(isExchangeHoliday('2026-12-31', 'XTKS'), true);

    // HKEX (XHKG): session closes 16:00 HKT (08:00 UTC)
    // 2026-06-30 07:30 UTC == 15:30 HKT (before 16:00 close)
    const hkOpen = alignTimestampToTradingDate('2026-06-30T07:30:00Z', '0700.HK');
    assert.equal(hkOpen.tradingDate, '2026-06-30');
    assert.equal(hkOpen.rolledForward, false);

    // 2026-06-30 08:30 UTC == 16:30 HKT (after close before HKSAR Establishment Day 2026-07-01 -> rolls to 2026-07-02!)
    assert.equal(isExchangeHoliday('2026-07-01', 'XHKG'), true);
    const hkBeforeHksar = alignTimestampToTradingDate('2026-06-30T08:30:00Z', '0700.HK');
    assert.equal(hkBeforeHksar.tradingDate, '2026-07-02');
    assert.equal(hkBeforeHksar.rolledForward, true);

    // HKEX National Day (2026-10-01) & Chung Yeung / Lunar New Year
    assert.equal(isExchangeHoliday('2026-10-01', 'XHKG'), true);
    assert.equal(isExchangeHoliday('2026-02-17', 'XHKG'), true);
  });
});
