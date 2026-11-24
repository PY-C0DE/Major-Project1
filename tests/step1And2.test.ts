/**
 * Step 1 & Step 2 Verification Tests:
 * 1. Pluggable DatabaseRepository + InMemoryRepository CRUD across all 7 tables
 * 2. Fail-closed production check when Postgres configuration is missing
 * 3. Ranked GET /api/tickers/search filtering, pagination, and MIC/country/currency metadata
 * 4. Multi-currency aggregation safety (never averaging raw MAE/RMSE across currencies)
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import {
  createInMemoryRepository,
  resetRepository,
  setRepository
} from '../src/server/store/db';
import { createApp } from '../server';
import { computeAllIndicators } from '../src/server/math/indicators';
import {
  clearEvaluationCaches,
  computeProjectWideAccuracy,
  evaluateSentimentAblationOnSeries,
  isModelEvaluationAvailable,
  runAggregateModelEvaluation
} from '../src/server/math/evaluation';
import { DailySentimentRecord, HistoricalBar, TickerMasterItem } from '../src/types';

function makeDeterministicBars(count = 480, startPrice = 150): HistoricalBar[] {
  const bars: HistoricalBar[] = [];
  let price = startPrice;
  const baseDate = new Date('2024-01-02T00:00:00Z');
  for (let i = 0; i < count; i++) {
    const d = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
    const wave = Math.sin(i / 11) * 0.012 + Math.cos(i / 23) * 0.006 + 0.0004;
    const open = price;
    price = Math.max(10, price * (1 + wave));
    const high = Math.max(open, price) * 1.008;
    const low = Math.min(open, price) * 0.992;
    bars.push({
      date: d.toISOString().split('T')[0],
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(price.toFixed(2)),
      volume: 1_200_000 + (i % 17) * 50_000
    });
  }
  return bars;
}

describe('Step 1: Pluggable Repository, Schema Entities & Production Fail-Closed Guard', () => {
  it('supports CRUD across users, portfolio, watchlist, alerts, prediction history, daily sentiment, and snapshot import', async () => {
    const repo = createInMemoryRepository();

    // Users & Firebase sync
    const fbUser = await repo.getOrCreateFirebaseUser({
      uid: 'firebase-uid-123',
      email: 'quant@alphaquant.ai',
      name: 'Quant Researcher',
      avatarUrl: 'https://example.com/avatar.png'
    });
    assert.equal(fbUser.email, 'quant@alphaquant.ai');
    assert.equal(fbUser.uid, 'firebase-uid-123');
    const fetchedByUid = await repo.getUserByFirebaseUid('firebase-uid-123');
    assert.equal(fetchedByUid?.id, fbUser.id);

    // Portfolio with native currency
    await repo.addHolding(fbUser.id, {
      id: 'hold-1',
      ticker: 'RELIANCE.NS',
      companyName: 'Reliance Industries',
      quantity: 10,
      avgBuyPrice: 2800,
      currentPrice: 2950,
      totalInvested: 28000,
      currentValue: 29500,
      pnl: 1500,
      pnlPercent: 5.36,
      purchaseDate: '2026-01-15',
      currency: 'INR'
    });
    const holdings = await repo.getPortfolio(fbUser.id);
    assert.equal(holdings.length, 1);
    assert.equal(holdings[0].currency, 'INR');
    await repo.updateHolding(fbUser.id, 'hold-1', { quantity: 15 });
    assert.equal((await repo.getPortfolio(fbUser.id))[0].quantity, 15);
    assert.equal(await repo.deleteHolding(fbUser.id, 'hold-1'), true);
    assert.equal((await repo.getPortfolio(fbUser.id)).length, 0);

    // Watchlist
    const wl1 = await repo.addToWatchlist(fbUser.id, 'nvda');
    assert.ok(wl1.includes('NVDA'));
    const wl2 = await repo.removeFromWatchlist(fbUser.id, 'NVDA');
    assert.ok(!wl2.includes('NVDA'));

    // Alerts
    const alert = await repo.createAlert(fbUser.id, {
      id: 'al-1',
      ticker: 'AAPL',
      type: 'price_above',
      direction: 'above',
      threshold: 250,
      label: 'AAPL above $250',
      enabled: true,
      createdAt: new Date().toISOString()
    });
    assert.equal(alert.enabled, true);
    const toggled = await repo.toggleAlert(fbUser.id, 'al-1', false);
    assert.equal(toggled?.enabled, false);
    assert.equal(await repo.deleteAlert(fbUser.id, 'al-1'), true);

    // Prediction History with currency
    await repo.addPrediction({
      id: 'pred-1',
      userId: fbUser.id,
      ticker: 'ASML.AS',
      currency: 'EUR',
      predictedPrice: 890,
      currentPrice: 875,
      lowerBound: 850,
      upperBound: 930,
      confidenceLevel: 0.9,
      marketRegime: 'Bullish Low-Volatility',
      sentimentScore: 0.32,
      timestamp: new Date().toISOString()
    });
    const preds = await repo.getPredictionHistory(fbUser.id, 'ASML.AS');
    assert.equal(preds.length, 1);
    assert.equal(preds[0].currency, 'EUR');

    // Daily Sentiment uniqueness & immutability on past dates
    const s1 = await repo.upsertDailySentiment(
      [
        {
          date: '2026-04-01',
          ticker: 'ASML.AS',
          credibilityWeightedNetScore: 0.55,
          articleCount: 3,
          sentimentSource: 'finbert',
          updatedAt: '2026-04-01T18:00:00Z'
        }
      ],
      { todayDate: '2026-04-05' }
    );
    assert.equal(s1.inserted, 1);
    const s2 = await repo.upsertDailySentiment(
      [
        {
          date: '2026-04-01',
          ticker: 'ASML.AS',
          credibilityWeightedNetScore: -0.9,
          articleCount: 5,
          sentimentSource: 'lexicon',
          updatedAt: '2026-04-05T12:00:00Z'
        }
      ],
      { todayDate: '2026-04-05' }
    );
    assert.equal(s2.skippedExistingPast, 1);
    assert.equal((await repo.getDailySentimentForTicker('ASML.AS'))[0].credibilityWeightedNetScore, 0.55);

    // Legacy snapshot import
    const imported = await repo.importSnapshot({
      watchlists: [[fbUser.id, ['MSFT', 'AAPL']]]
    });
    assert.equal(imported.watchlists, 2);
    assert.ok((await repo.getWatchlist(fbUser.id)).includes('MSFT'));
  });

  it('fails closed in NODE_ENV=production when PostgreSQL credentials are absent', () => {
    const savedEnv = {
      NODE_ENV: process.env.NODE_ENV,
      SQL_HOST: process.env.SQL_HOST,
      SQL_USER: process.env.SQL_USER,
      SQL_PASSWORD: process.env.SQL_PASSWORD,
      SQL_DB_NAME: process.env.SQL_DB_NAME,
      ALPHAQUANT_STORE_PATH: process.env.ALPHAQUANT_STORE_PATH,
      ALPHAQUANT_STORE_MODE: process.env.ALPHAQUANT_STORE_MODE,
      ALPHAQUANT_USE_PG_IN_TESTS: process.env.ALPHAQUANT_USE_PG_IN_TESTS
    };

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.SQL_HOST;
      delete process.env.SQL_USER;
      delete process.env.SQL_PASSWORD;
      delete process.env.SQL_DB_NAME;
      delete process.env.ALPHAQUANT_STORE_PATH;
      delete process.env.ALPHAQUANT_STORE_MODE;
      delete process.env.ALPHAQUANT_USE_PG_IN_TESTS;

      assert.throws(() => resetRepository(), /Database configuration missing in production/i);
    } finally {
      for (const [key, val] of Object.entries(savedEnv)) {
        if (val === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = val;
        }
      }
      resetRepository();
    }
  });
});

describe('Step 2: Global Ticker Master Ranked Search & Multi-Currency Safety', () => {
  beforeEach(() => {
    clearEvaluationCaches();
  });

  afterEach(() => {
    resetRepository();
    clearEvaluationCaches();
  });

  it('exposes ranked, filtered, paginated GET /api/tickers/search with MIC exchange, country, and currency', async () => {
    const repo = createInMemoryRepository();
    const seedItems: TickerMasterItem[] = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'XNAS',
        exchangeCode: 'NASDAQ',
        country: 'US',
        currency: 'USD',
        timezone: 'America/New_York',
        assetType: 'EQUITY',
        sector: 'Technology',
        aliases: ['apple'],
        active: true
      },
      {
        symbol: 'AAP',
        name: 'Advance Auto Parts Inc.',
        exchange: 'XNYS',
        exchangeCode: 'NYSE',
        country: 'US',
        currency: 'USD',
        timezone: 'America/New_York',
        assetType: 'EQUITY',
        sector: 'Consumer Cyclical',
        aliases: [],
        active: true
      },
      {
        symbol: 'RELIANCE.NS',
        name: 'Reliance Industries Ltd.',
        exchange: 'XNSE',
        exchangeCode: 'NSE',
        country: 'IN',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        assetType: 'EQUITY',
        sector: 'Energy & Conglomerate',
        aliases: ['ril'],
        active: true
      },
      {
        symbol: 'SHEL.L',
        name: 'Shell plc',
        exchange: 'XLON',
        exchangeCode: 'LSE',
        country: 'GB',
        currency: 'GBP',
        timezone: 'Europe/London',
        assetType: 'EQUITY',
        sector: 'Energy',
        aliases: ['royal dutch shell'],
        active: true
      },
      {
        symbol: '7203.T',
        name: 'Toyota Motor Corporation',
        exchange: 'XTKS',
        exchangeCode: 'TSE',
        country: 'JP',
        currency: 'JPY',
        timezone: 'Asia/Tokyo',
        assetType: 'EQUITY',
        sector: 'Automotive',
        aliases: ['toyota'],
        active: true
      }
    ];
    await repo.upsertTickers(seedItems);
    setRepository(repo);

    const app = createApp({ jwtSecret: 'alphaquant-step2-test-secret-0123456789' });

    // Ranked exact match 'AAP' beats prefix match 'AAPL'
    const rankedRes = await request(app).get('/api/tickers/search?q=aap');
    assert.equal(rankedRes.status, 200);
    assert.ok(rankedRes.body.items.length >= 2);
    assert.equal(rankedRes.body.items[0].symbol, 'AAP');
    assert.equal(rankedRes.body.items[1].symbol, 'AAPL');
    assert.equal(rankedRes.body.items[1].exchange, 'XNAS');
    assert.equal(rankedRes.body.items[1].country, 'US');
    assert.equal(rankedRes.body.items[1].currency, 'USD');

    // Country filter
    const ukRes = await request(app).get('/api/tickers/search?country=GB');
    assert.equal(ukRes.status, 200);
    assert.ok(ukRes.body.items.some((i: TickerMasterItem) => i.symbol === 'SHEL.L' && i.currency === 'GBP'));
    assert.ok(ukRes.body.items.every((i: TickerMasterItem) => i.country === 'GB'));

    // MIC Exchange filter
    const jpRes = await request(app).get('/api/tickers/search?exchange=XTKS');
    assert.equal(jpRes.status, 200);
    assert.ok(jpRes.body.items.some((i: TickerMasterItem) => i.symbol === '7203.T' && i.currency === 'JPY'));
    assert.ok(jpRes.body.items.every((i: TickerMasterItem) => i.exchange === 'XTKS'));

    // Pagination + filter facets
    const paged = await request(app).get('/api/tickers/search?page=1&limit=2');
    assert.equal(paged.status, 200);
    assert.equal(paged.body.items.length, 2);
    assert.ok(paged.body.total >= 5);
    assert.ok(paged.body.totalPages >= 3);
    assert.ok(Array.isArray(paged.body.filters.countries));
    assert.ok(Array.isArray(paged.body.filters.exchanges));
  });

  it('prevents averaging raw MAE/RMSE across multiple currencies while preserving scale-free metrics', async () => {
    const inrBars = computeAllIndicators(makeDeterministicBars(480, 2500));
    const usdBars = computeAllIndicators(makeDeterministicBars(480, 180));

    const fetcher = async (ticker: string) => ({
      bars: ticker.endsWith('.NS') ? inrBars : usdBars,
      source: 'live' as const
    });

    // 1. Homogeneous INR universe -> numeric MAE & RMSE with INR currency
    clearEvaluationCaches();
    const sameCurrAgg = await runAggregateModelEvaluation(fetcher, [
      { ticker: 'RELIANCE.NS', name: 'Reliance Industries' },
      { ticker: 'TCS.NS', name: 'Tata Consultancy Services' }
    ]);
    assert.ok(isModelEvaluationAvailable(sameCurrAgg));
    assert.equal(sameCurrAgg.currency, 'INR');
    assert.ok(typeof sameCurrAgg.mae === 'number' && sameCurrAgg.mae > 0);
    assert.ok(typeof sameCurrAgg.rmse === 'number' && sameCurrAgg.rmse > 0);

    // 2. Mixed INR + USD universe -> currency === 'MIXED', raw errors === null, scale-free metrics intact
    clearEvaluationCaches();
    const mixedAgg = await runAggregateModelEvaluation(fetcher, [
      { ticker: 'RELIANCE.NS', name: 'Reliance Industries' },
      { ticker: 'AAPL', name: 'Apple Inc.' }
    ]);
    assert.ok(isModelEvaluationAvailable(mixedAgg));
    assert.equal(mixedAgg.currency, 'MIXED');
    assert.equal(mixedAgg.mae, null);
    assert.equal(mixedAgg.rmse, null);
    assert.equal(mixedAgg.naiveMae, null);
    assert.equal(mixedAgg.naiveRmse, null);
    assert.ok(mixedAgg.comparison.every((row) => row.mae === null && row.rmse === null));
    assert.ok(typeof mixedAgg.priceAccuracy === 'number' && Number.isFinite(mixedAgg.priceAccuracy));
    assert.ok(typeof mixedAgg.maeSkillVsNaive === 'number' && Number.isFinite(mixedAgg.maeSkillVsNaive));
    assert.ok(typeof mixedAgg.directionalAccuracy === 'number' && Number.isFinite(mixedAgg.directionalAccuracy));
    assert.equal(mixedAgg.assetBreakdown?.[0].currency, 'INR');
    assert.equal(mixedAgg.assetBreakdown?.[1].currency, 'USD');

    // 3. computeProjectWideAccuracy mixed currency safety
    clearEvaluationCaches();
    const projMixed = await computeProjectWideAccuracy(fetcher, ['RELIANCE.NS', 'AAPL']);
    assert.equal(projMixed.available, true);
    assert.equal(projMixed.currency, 'MIXED');
    assert.equal(projMixed.mae, null);
    assert.equal(projMixed.rmse, null);
    assert.ok(typeof projMixed.priceAccuracyPct === 'number' && Number.isFinite(projMixed.priceAccuracyPct));

    // 4. Sentiment ablation mixed currency safety
    const makeSent = (ticker: string): DailySentimentRecord[] =>
      inrBars.slice(180, 320).map((b, idx) => ({
        date: b.date,
        ticker,
        credibilityWeightedNetScore: ((idx % 5) - 2) * 0.2,
        articleCount: 3,
        sentimentSource: 'finbert',
        updatedAt: b.date
      }));
    const mixedAblation = evaluateSentimentAblationOnSeries(
      [
        { ticker: 'RELIANCE.NS', bars: inrBars.slice(0, 330), sentimentRecords: makeSent('RELIANCE.NS') },
        { ticker: 'AAPL', bars: usdBars.slice(0, 330), sentimentRecords: makeSent('AAPL') }
      ],
      { resamples: 100 }
    );
    assert.equal(mixedAblation.available, true);
    assert.equal(mixedAblation.currency, 'MIXED');
    assert.equal(mixedAblation.priceOnly?.mae, null);
    assert.equal(mixedAblation.priceOnly?.rmse, null);
    assert.equal(mixedAblation.pairedDiff?.maeDiff, null);
    assert.equal(mixedAblation.pairedDiff?.maeDiffCI95, null);
    assert.ok(typeof mixedAblation.priceOnly?.priceAccuracy === 'number');
  });
});
