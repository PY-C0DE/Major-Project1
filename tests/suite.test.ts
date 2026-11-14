import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { createApp, getJwtSecret } from '../server';
import { computeKS2Sample } from '../src/server/math/driftDetector';
import { computeCorrelationMatrix } from '../src/server/math/correlation';
import { computeAllIndicators, PriceBar } from '../src/server/math/indicators';
import {
  runModelEvaluation,
  computeProjectWideAccuracy,
  runAggregateModelEvaluation,
  clearEvaluationCaches,
  computeSummaryStats,
  computeWilson95Interval,
  computeBinomialOneSidedPValue,
  isModelEvaluationAvailable
} from '../src/server/math/evaluation';
import { optimizePortfolioHoldings } from '../src/server/math/portfolioOptimizer';
import { DEFAULT_CONFORMAL_CONFIDENCE } from '../src/shared/modelConfig';
import { HistoricalBar, PortfolioHolding } from '../src/types';

const TEST_JWT_SECRET = 'test-jwt-secret-key-at-least-32-characters-long';

describe('AlphaQuant Real App Auth, Rate Limiting & Security', () => {
  it('returns 401 on protected /api/auth/me with no token and with invalid token when ALLOW_DEMO_MODE is unset', async () => {
    const prevAllowDemo = process.env.ALLOW_DEMO_MODE;
    delete process.env.ALLOW_DEMO_MODE;

    try {
      const app = createApp({ jwtSecret: TEST_JWT_SECRET });

      const noTokenRes = await request(app).get('/api/auth/me');
      assert.equal(noTokenRes.status, 401);

      const badTokenRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token');
      assert.equal(badTokenRes.status, 401);
    } finally {
      if (prevAllowDemo === undefined) delete process.env.ALLOW_DEMO_MODE;
      else process.env.ALLOW_DEMO_MODE = prevAllowDemo;
    }
  });

  it('resolves missing token to the demo user when ALLOW_DEMO_MODE=true', async () => {
    const prevAllowDemo = process.env.ALLOW_DEMO_MODE;
    process.env.ALLOW_DEMO_MODE = 'true';

    try {
      const app = createApp({ jwtSecret: TEST_JWT_SECRET });
      const res = await request(app).get('/api/auth/me');
      assert.equal(res.status, 200);
      assert.equal(res.body.email, 'alex.morgan@alphaquant.ai');
      assert.equal(res.body.isDemoUser, true);
    } finally {
      if (prevAllowDemo === undefined) delete process.env.ALLOW_DEMO_MODE;
      else process.env.ALLOW_DEMO_MODE = prevAllowDemo;
    }
  });

  it('rejects wrong demo password with 401 and accepts correct password with JWT token', async () => {
    const prevAllowDemo = process.env.ALLOW_DEMO_MODE;
    delete process.env.ALLOW_DEMO_MODE;

    try {
      const app = createApp({ jwtSecret: TEST_JWT_SECRET });

      const badLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alex.morgan@alphaquant.ai', password: 'wrong-password' });
      assert.equal(badLogin.status, 401);

      const goodLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alex.morgan@alphaquant.ai', password: 'demo1234' });
      assert.equal(goodLogin.status, 200);
      assert.ok(typeof goodLogin.body.token === 'string' && goodLogin.body.token.length > 20);
    } finally {
      if (prevAllowDemo === undefined) delete process.env.ALLOW_DEMO_MODE;
      else process.env.ALLOW_DEMO_MODE = prevAllowDemo;
    }
  });

  it('returns 429 on the 6th rapid request to /api/auth/login', async () => {
    const app = createApp({ jwtSecret: TEST_JWT_SECRET, allowDemoMode: false });

    for (let attempt = 1; attempt <= 5; attempt++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alex.morgan@alphaquant.ai', password: 'wrong-password' });
      assert.equal(res.status, 401, `Attempt ${attempt} should return 401 before rate limit`);
    }

    const sixthRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alex.morgan@alphaquant.ai', password: 'wrong-password' });
    assert.equal(sixthRes.status, 429, '6th rapid login attempt must return HTTP 429');
  });

  it('rejects missing, short, and known placeholder JWT_SECRET values in production mode', () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevSecret = process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';

    try {
      delete process.env.JWT_SECRET;
      assert.throws(() => getJwtSecret(), /required/i);

      process.env.JWT_SECRET = 'too-short-secret';
      assert.throws(() => getJwtSecret(), /32 characters/i);

      process.env.JWT_SECRET = 'super_secret_jwt_alphaquant_key_replace_in_production_32char_min';
      assert.throws(() => getJwtSecret(), /placeholder/i);

      process.env.JWT_SECRET = 'a_valid_random_production_secret_with_more_than_32_characters_123';
      assert.equal(getJwtSecret(), 'a_valid_random_production_secret_with_more_than_32_characters_123');
    } finally {
      if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNodeEnv;
      if (prevSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = prevSecret;
    }
  });
});

describe('AlphaQuant Quantitative Model Evaluation (Real Function & Fixture)', () => {
  const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/synthetic_ohlcv.json');
  const rawBars: PriceBar[] = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

  it('maintains strict walk-forward causality, computes coverage from backtestSeries, and includes all baselines', () => {
    const computedBars = computeAllIndicators(rawBars);
    const evalBaseline = runModelEvaluation(computedBars, 'SYNTH.TEST');

    assert.ok(evalBaseline.backtestSeries.length > 20, 'Expected non-trivial backtestSeries');
    assert.ok(evalBaseline.conformalCoverage !== undefined);
    assert.ok(
      evalBaseline.conformalCoverage >= 0 && evalBaseline.conformalCoverage <= 100,
      'Conformal coverage must be between 0 and 100'
    );

    // Verify conformalCoverage matches the empirical in-bounds fraction of backtestSeries
    const inBounds = evalBaseline.backtestSeries.filter(
      (pt) => pt.actual >= pt.lower && pt.actual <= pt.upper
    ).length;
    const expectedCoverage = Number(((inBounds / evalBaseline.backtestSeries.length) * 100).toFixed(1));
    assert.equal(evalBaseline.conformalCoverage, expectedCoverage);

    // (a) Walk-forward causality: changing bars strictly AFTER targetIdx must not alter prediction for targetIdx
    const testStartIndex = rawBars.length - evalBaseline.backtestSeries.length;
    const offset = 10;
    const targetIdx = testStartIndex + offset;

    const mutatedRawBars: PriceBar[] = rawBars.map((bar, idx) => {
      if (idx <= targetIdx) return { ...bar };
      return {
        ...bar,
        open: Number((bar.open * 4.5).toFixed(2)),
        high: Number((bar.high * 4.8).toFixed(2)),
        low: Number((bar.low * 4.2).toFixed(2)),
        close: Number((bar.close * 4.6).toFixed(2)),
        volume: bar.volume * 8,
      };
    });

    const evalMutated = runModelEvaluation(computeAllIndicators(mutatedRawBars), 'SYNTH.TEST');
    assert.equal(
      evalMutated.backtestSeries[offset].predicted,
      evalBaseline.backtestSeries[offset].predicted,
      'Changing bars strictly after bar i must not alter predicted price for bar i'
    );
    assert.equal(
      evalMutated.backtestSeries[offset].lower,
      evalBaseline.backtestSeries[offset].lower,
      'Changing bars strictly after bar i must not alter lower bound for bar i'
    );
    assert.equal(
      evalMutated.backtestSeries[offset].upper,
      evalBaseline.backtestSeries[offset].upper,
      'Changing bars strictly after bar i must not alter upper bound for bar i'
    );

    // (c) Verify all required baselines are present
    const modelNames = evalBaseline.comparison.map((c) => c.model);
    assert.ok(modelNames.some((m) => m.includes('AlphaQuant Production')), 'Production model row missing');
    assert.ok(modelNames.some((m) => m.includes('SMA-20')), 'SMA baseline row missing');
    assert.ok(modelNames.some((m) => m.includes('Linear Model (OLS)')), 'OLS baseline row missing');
    const naiveRow = evalBaseline.comparison.find((c) => c.model.includes('Naive Last-Price'));
    assert.ok(naiveRow, 'Naive Last-Price baseline row missing');
    assert.equal(naiveRow.directionalAccuracy, null, 'Naive Last-Price directionalAccuracy must be null');

    const alwaysUpRow = evalBaseline.comparison.find((c) => c.model === 'Always Up');
    assert.ok(alwaysUpRow, 'Always Up directional baseline row missing');
    assert.equal(typeof alwaysUpRow.directionalAccuracy, 'number');

    const persistRow = evalBaseline.comparison.find((c) => c.model.includes('Persistence'));
    assert.ok(persistRow, 'Persistence directional baseline row missing');
    assert.equal(typeof persistRow.directionalAccuracy, 'number');
  });

  it('refuses evaluation on synthetic series and returns 503 when no live market data is available', async () => {
    const computedBars = computeAllIndicators(rawBars);

    // 1. Direct evaluation refuses synthetic provenance
    assert.throws(() => runModelEvaluation(computedBars, 'SYNTH.TEST', 'synthetic'), /synthetic/i);

    // 2. Project-wide accuracy & aggregate evaluation skip synthetic and return { available: false }
    clearEvaluationCaches();
    const synthFetcher = async () => ({ bars: computedBars, source: 'synthetic' as const });

    const projUnavailable = await computeProjectWideAccuracy(synthFetcher, ['AAA', 'BBB']);
    assert.equal(projUnavailable.available, false);
    assert.equal(projUnavailable.reason, 'No live market data');
    assert.equal(projUnavailable.evaluatedAssetsCount, 0);

    const aggUnavailable = await runAggregateModelEvaluation(synthFetcher, [{ ticker: 'AAA', name: 'AAA' }]);
    assert.equal(aggUnavailable.available, false);
    assert.equal(aggUnavailable.reason, 'No live market data');
    assert.equal(aggUnavailable.evaluatedAssetsCount, 0);

    // 3. Mixed: only live series are evaluated, synthetic series are skipped
    clearEvaluationCaches();
    const mixedFetcher = async (ticker: string) => ({
      bars: computedBars,
      source: ticker === 'LIVE.NS' ? ('live' as const) : ('synthetic' as const)
    });
    const projMixed = await computeProjectWideAccuracy(mixedFetcher, ['FAKE1', 'LIVE.NS', 'FAKE2']);
    assert.equal(projMixed.available, true);
    assert.equal(projMixed.dataSource, 'live');
    assert.equal(projMixed.evaluatedAssetsCount, 1);

    // 4. Real Express endpoints return 503 with explicit reason when only synthetic data exists
    clearEvaluationCaches();
    const app = createApp({
      jwtSecret: TEST_JWT_SECRET,
      fetchHistoryWithSource: synthFetcher
    });

    const singleRes = await request(app).get('/api/model/metrics?ticker=NVDA');
    assert.equal(singleRes.status, 503);
    assert.equal(singleRes.body.available, false);
    assert.equal(singleRes.body.reason, 'No live market data');

    const allRes = await request(app).get('/api/model/metrics?ticker=ALL');
    assert.equal(allRes.status, 503);
    assert.equal(allRes.body.available, false);
    assert.equal(allRes.body.reason, 'No live market data');

    const accRes = await request(app).get('/api/metrics/accuracy');
    assert.equal(accRes.status, 503);
    assert.equal(accRes.body.available, false);
    assert.equal(accRes.body.reason, 'No live market data');

    clearEvaluationCaches();
  });
});

describe('Kolmogorov-Smirnov 2-Sample Test', () => {
  it('computes exact KS statistic and p-value for identical and shifted distributions', () => {
    const sampleA = [1.2, 1.4, 1.5, 1.3, 1.6, 1.4, 1.5];
    const sampleIdentical = [1.2, 1.4, 1.5, 1.3, 1.6, 1.4, 1.5];
    const identicalKS = computeKS2Sample(sampleA, sampleIdentical);
    assert.equal(identicalKS.ksStatistic, 0, 'Identical distributions must have KS statistic of 0');
    assert.equal(identicalKS.pValue, 1.0, 'Identical distributions must have p-value of 1.0');

    const sampleShifted = [10.1, 10.5, 10.8, 11.2, 10.9, 11.5, 12.0];
    const shiftedKS = computeKS2Sample(sampleA, sampleShifted);
    assert.equal(shiftedKS.ksStatistic, 1.0, 'Disjoint distributions must have KS statistic of 1.0');
    assert.ok(shiftedKS.pValue < 0.05, 'Disjoint distributions must indicate statistical significance (p < 0.05)');
  });
});

describe('Correlation Matrix Engine', () => {
  it('computes identity diagonal and bounded [-1, 1] pairwise correlations', () => {
    const makeBars = (base: number, step: number): HistoricalBar[] => {
      return Array.from({ length: 65 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        open: base + i * step,
        high: base + i * step + 1,
        low: base + i * step - 1,
        close: base + i * step,
        volume: 100000
      }));
    };
    const historyMap = {
      'RELIANCE.NS': makeBars(2500, 5),
      'TCS.NS': makeBars(3500, 7)
    };
    const corrResult = computeCorrelationMatrix(['RELIANCE.NS', 'TCS.NS'], historyMap, {
      'RELIANCE.NS': 'Bullish',
      'TCS.NS': 'Bullish'
    });
    assert.equal(corrResult.matrix[0][0], 1.0, 'Self-correlation must be 1.0');
    assert.equal(corrResult.matrix[1][1], 1.0, 'Self-correlation must be 1.0');
    assert.ok(corrResult.matrix[0][1] >= -1.0 && corrResult.matrix[0][1] <= 1.0, 'Correlation must be in [-1, 1]');
  });
});

describe('Portfolio Optimizer Reproducibility', () => {
  it('returns identical weights and lookback metadata across identical calls', () => {
    const makeSeries = (start: number, drift: number, amp: number): HistoricalBar[] =>
      Array.from({ length: 110 }, (_, i) => {
        const close = Number((start + i * drift + Math.sin(i * 0.4) * amp).toFixed(2));
        return {
          date: `2026-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
          open: close - 0.5,
          high: close + 1.0,
          low: close - 1.0,
          close,
          volume: 100000
        };
      });

    const holdings: PortfolioHolding[] = [
      {
        id: 'h1',
        ticker: 'AAPL',
        companyName: 'Apple Inc',
        quantity: 10,
        avgBuyPrice: 180,
        currentPrice: 200,
        totalInvested: 1800,
        currentValue: 2000,
        pnl: 200,
        pnlPercent: 11.1,
        purchaseDate: '2026-01-01'
      },
      {
        id: 'h2',
        ticker: 'NVDA',
        companyName: 'NVIDIA Corp',
        quantity: 15,
        avgBuyPrice: 100,
        currentPrice: 140,
        totalInvested: 1500,
        currentValue: 2100,
        pnl: 600,
        pnlPercent: 40.0,
        purchaseDate: '2026-01-01'
      },
      {
        id: 'h3',
        ticker: 'MSFT',
        companyName: 'Microsoft Corp',
        quantity: 5,
        avgBuyPrice: 400,
        currentPrice: 420,
        totalInvested: 2000,
        currentValue: 2100,
        pnl: 100,
        pnlPercent: 5.0,
        purchaseDate: '2026-01-01'
      }
    ];

    const histMap: Record<string, HistoricalBar[]> = {
      AAPL: makeSeries(150, 0.45, 2.5),
      NVDA: makeSeries(90, 0.50, 4.0),
      MSFT: makeSeries(350, 0.60, 3.0)
    };

    const run1 = optimizePortfolioHoldings(holdings, histMap, 'max_sharpe', 0.05, 0.55, 0.04);
    const run2 = optimizePortfolioHoldings(holdings, histMap, 'max_sharpe', 0.05, 0.55, 0.04);

    assert.equal(run1.lookbackDays, 90);
    assert.equal(run1.covarianceShrinkage, 0.2);
    assert.deepEqual(
      run1.suggestions.map((s) => ({ ticker: s.ticker, optimalWeightPct: s.optimalWeightPct, action: s.action })),
      run2.suggestions.map((s) => ({ ticker: s.ticker, optimalWeightPct: s.optimalWeightPct, action: s.action }))
    );
  });
});

describe('Model Config & Renamed Strategy Endpoints', () => {
  it('uses ensemble_conformal strategy name and unified 90% default coverage', async () => {
    const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/synthetic_ohlcv.json');
    const rawBars: PriceBar[] = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    const computedBars = computeAllIndicators(rawBars);

    const app = createApp({
      jwtSecret: TEST_JWT_SECRET,
      fetchHistoryWithSource: async () => ({ bars: computedBars, source: 'live' as const })
    });

    const healthRes = await request(app).get('/api/model/health');
    assert.equal(healthRes.status, 200);
    assert.equal(healthRes.body.conformalCoverageTarget, DEFAULT_CONFORMAL_CONFIDENCE);
    assert.ok(String(healthRes.body.predictionEngine).includes('AlphaQuant Ensemble'));

    const backtestRes = await request(app).get('/api/backtest/automated?ticker=AAPL&strategy=ensemble_conformal');
    assert.equal(backtestRes.status, 200);
    assert.equal(backtestRes.body.strategyName, 'AlphaQuant Ensemble + Split-Conformal Quantile Strategy');

    const defaultBacktestRes = await request(app).get('/api/backtest/automated?ticker=AAPL');
    assert.equal(defaultBacktestRes.status, 200);
    assert.equal(defaultBacktestRes.body.strategyName, 'AlphaQuant Ensemble + Split-Conformal Quantile Strategy');
  });
});

describe('Statistical Power, 2-Year Evaluation Window, Wilson CI, Binomial Test & Model Audit API', () => {
  function generateDeterministic2YearBars(count = 520, slope = 0.08): HistoricalBar[] {
    const startMs = Date.UTC(2024, 0, 2);
    const bars: HistoricalBar[] = [];
    let price = 120.0;
    let dayOffset = 0;

    while (bars.length < count) {
      const d = new Date(startMs + dayOffset * 86400_000);
      dayOffset++;
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6) continue;
      const idx = bars.length;
      const ret = 0.0004 + Math.sin(idx * 0.27) * 0.011 + slope * 0.001;
      const open = Number((price * (1 + Math.cos(idx * 0.19) * 0.002)).toFixed(2));
      price = Math.max(10, price * (1 + ret));
      const close = Number(price.toFixed(2));
      const high = Number((Math.max(open, close) * 1.008).toFixed(2));
      const low = Number((Math.min(open, close) * 0.992).toFixed(2));
      bars.push({
        date: d.toISOString().split('T')[0],
        open,
        high,
        low,
        close,
        volume: 1_500_000 + (idx % 17) * 50_000
      });
    }
    return bars;
  }

  it('computes accurate summary stats, Wilson 95% CI, and exact one-sided binomial p-values even at large n', () => {
    const stats = computeSummaryStats([10, 20, 30, 40]);
    assert.equal(stats.mean, 25);
    assert.equal(stats.median, 25);
    assert.equal(stats.min, 10);
    assert.equal(stats.max, 40);

    // 60/100 Wilson 95% CI is approx [50.20%, 69.06%]
    const [ciLo, ciHi] = computeWilson95Interval(60, 100);
    assert.ok(ciLo > 49.5 && ciLo < 51.0, `Expected lower ~50.2, got ${ciLo}`);
    assert.ok(ciHi > 68.5 && ciHi < 69.8, `Expected upper ~69.06, got ${ciHi}`);

    // Exact binomial test P(X >= 9 | n=10, p=0.5) = (10 + 1) / 1024 = 0.0107421875
    const pSmall = computeBinomialOneSidedPValue(9, 10, 0.5);
    assert.ok(Math.abs(pSmall - 11 / 1024) < 1e-9, `Expected 11/1024, got ${pSmall}`);

    // Large n = 6000 pooled test predictions must stay finite in [0, 1]
    const pLarge = computeBinomialOneSidedPValue(3300, 6000, 0.52);
    assert.ok(Number.isFinite(pLarge) && pLarge >= 0 && pLarge <= 1);
    assert.ok(pLarge < 0.001);
  });

  it('uses >= 120 trading day walk-forward test window on 2-year history and aggregates across ALL live catalog tickers', async () => {
    const raw520 = generateDeterministic2YearBars(520);
    const computed520 = computeAllIndicators(raw520);

    const singleEval = runModelEvaluation(computed520, 'TEST2Y.NS', 'live');
    assert.ok(singleEval.totalBacktestSamples >= 120, `Expected >= 120 test days, got ${singleEval.totalBacktestSamples}`);
    assert.ok(singleEval.testWindowStart && singleEval.testWindowEnd);
    assert.ok(singleEval.testWindowStart! < singleEval.testWindowEnd!);
    assert.ok(singleEval.directionalStats);
    assert.equal(singleEval.directionalStats.totalTestPredictions, singleEval.totalBacktestSamples);
    assert.ok(
      singleEval.directionalStats.wilson95CI[0] <= singleEval.directionalStats.pooledDirectionalAccuracyPct &&
      singleEval.directionalStats.pooledDirectionalAccuracyPct <= singleEval.directionalStats.wilson95CI[1]
    );

    // Build 22 catalog entries (more than old 18 cap) and confirm ALL live ones are evaluated and days >= 500 requested
    clearEvaluationCaches();
    const requestedDays: number[] = [];
    const catalog = Array.from({ length: 22 }, (_, i) => ({
      ticker: `LIVE${i + 1}.NS`,
      name: `Live Test Asset ${i + 1}`
    }));

    const agg = await runAggregateModelEvaluation(async (ticker, days) => {
      requestedDays.push(days);
      return { bars: computed520, source: 'live' as const };
    }, catalog);

    assert.ok(isModelEvaluationAvailable(agg));
    assert.ok(requestedDays.every((d) => d >= 500), 'Must request >= 2 years (>= 500 days) of history');
    assert.equal(agg.evaluatedAssetsCount, 22, 'Must evaluate all live catalog tickers without 18-ticker truncation');
    assert.equal(agg.assetBreakdown?.length, 22);
    assert.ok(agg.summaryStats);
    assert.ok(agg.directionalStats);
    assert.equal(agg.directionalStats.totalTestPredictions, 22 * singleEval.totalBacktestSamples);
    clearEvaluationCaches();
  });

  it('exposes GET /api/model/audit returning per-asset provenance, windows, summary stats, and 503 when unavailable', async () => {
    const raw520 = generateDeterministic2YearBars(520);
    const computed520 = computeAllIndicators(raw520);

    clearEvaluationCaches();
    const unavailApp = createApp({
      jwtSecret: TEST_JWT_SECRET,
      fetchHistoryWithSource: async () => ({ bars: computed520, source: 'synthetic' as const })
    });
    const res503 = await request(unavailApp).get('/api/model/audit');
    assert.equal(res503.status, 503);
    assert.equal(res503.body.available, false);

    clearEvaluationCaches();
    const liveApp = createApp({
      jwtSecret: TEST_JWT_SECRET,
      fetchHistoryWithSource: async () => ({ bars: computed520, source: 'live' as const })
    });
    const res200 = await request(liveApp).get('/api/model/audit?ticker=NVDA');
    assert.equal(res200.status, 200);
    assert.equal(res200.body.available, true);
    assert.equal(res200.body.dataSource, 'live');
    assert.ok(res200.body.totalTestPredictions >= 120);
    assert.ok(Array.isArray(res200.body.assets) && res200.body.assets.length === 1);
    assert.equal(res200.body.assets[0].dataSource, 'live');
    assert.ok(res200.body.assets[0].testWindowStart && res200.body.assets[0].testWindowEnd);
    assert.ok(res200.body.directionalStats.wilson95CI.length === 2);
    assert.ok(typeof res200.body.directionalStats.binomialPValueVsAlwaysUp === 'number');
    clearEvaluationCaches();
  });
});


