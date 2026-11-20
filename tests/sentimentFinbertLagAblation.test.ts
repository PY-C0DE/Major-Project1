import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  scoreHeadlinesWithFinbert,
  setFinbertPipelineOverride,
  resetFinbertState,
  getFinbertCacheStats
} from '../src/server/math/finbertSentiment';
import { db } from '../src/server/store/db';
import {
  computeTickerLagAnalysis,
  computePooledLagAnalysis
} from '../src/server/math/lagAnalysis';
import {
  buildCausalSentimentFeatureMatrix,
  fitEnsembleModel,
  predictEnsembleReturn
} from '../src/server/math/modelEngine';
import {
  evaluateSentimentAblationOnSeries,
  mulberry32
} from '../src/server/math/evaluation';
import { ComputedBar } from '../src/server/math/indicators';
import { DailySentimentRecord } from '../src/types';

function makeSyntheticComputedBars(count: number, seed: number, returnOverrides?: Map<number, number>): ComputedBar[] {
  const rng = mulberry32(seed);
  const bars: ComputedBar[] = [];
  let price = 100;
  const startMs = Date.UTC(2025, 0, 2); // 2025-01-02
  let dayOffset = 0;

  for (let i = 0; i < count; i++) {
    // Advance weekdays only
    let d = new Date(startMs + dayOffset * 86_400_000);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
      dayOffset++;
      d = new Date(startMs + dayOffset * 86_400_000);
    }
    const isoDate = d.toISOString().slice(0, 10);
    dayOffset++;

    const ret = returnOverrides?.has(i)
      ? returnOverrides.get(i)!
      : (rng() - 0.49) * 0.025;
    if (i > 0) {
      price = Math.max(10, price * (1 + ret));
    }
    const open = price * (1 - 0.002 + rng() * 0.004);
    const high = Math.max(open, price) * (1 + rng() * 0.006);
    const low = Math.min(open, price) * (1 - rng() * 0.006);

    bars.push({
      date: isoDate,
      open,
      high,
      low,
      close: price,
      volume: 1_000_000 + Math.floor(rng() * 500_000),
      sma20: price * (0.99 + rng() * 0.02),
      sma50: price * (0.98 + rng() * 0.04),
      ema12: price * (0.995 + rng() * 0.01),
      ema26: price * (0.99 + rng() * 0.02),
      rsi14: 45 + rng() * 20,
      macd: (rng() - 0.5) * 1.2,
      macdSignal: (rng() - 0.5) * 1.0,
      macdHist: (rng() - 0.5) * 0.4,
      bbUpper: price * 1.03,
      bbMiddle: price,
      bbLower: price * 0.97,
      atr14: price * 0.015,
      returns: i === 0 ? 0 : ret,
      volatility20: 0.015 + rng() * 0.005
    });
  }

  return bars;
}

describe('Task 1: FinBERT transformer sentiment, caching, probabilities & fallback', () => {
  beforeEach(() => {
    resetFinbertState();
  });

  afterEach(() => {
    resetFinbertState();
  });

  it('scores headlines with FinBERT probabilities in [0,1], netScore = p_pos - p_neg in [-1,1], and caches by (headline+publisher)', async () => {
    let invokeCount = 0;
    setFinbertPipelineOverride(async () => {
      return async (texts: string | string[]) => {
        invokeCount++;
        const list = Array.isArray(texts) ? texts : [texts];
        return list.map(() => [
          { label: 'positive', score: 0.80 },
          { label: 'neutral', score: 0.15 },
          { label: 'negative', score: 0.05 }
        ]);
      };
    });

    const firstBatch = await scoreHeadlinesWithFinbert([
      { headline: 'Quarterly revenue surges to record high', publisher: 'Reuters' },
      { headline: 'Guidance reaffirmed for fiscal year', publisher: 'Bloomberg' }
    ]);

    assert.equal(firstBatch.length, 2);
    assert.equal(invokeCount, 1);
    for (const item of firstBatch) {
      assert.equal(item.sentimentSource, 'finbert');
      assert.equal(item.sentiment, 'positive');
      assert.ok(item.probabilities.positive >= 0 && item.probabilities.positive <= 1);
      assert.ok(item.probabilities.neutral >= 0 && item.probabilities.neutral <= 1);
      assert.ok(item.probabilities.negative >= 0 && item.probabilities.negative <= 1);
      assert.ok(item.sentimentScore >= -1 && item.sentimentScore <= 1);
      assert.ok(Math.abs(item.sentimentScore - (item.probabilities.positive - item.probabilities.negative)) < 1e-4);
    }

    // Re-score identical (headline, publisher) pair -> must hit SHA-256 cache without invoking pipeline again
    const cachedBatch = await scoreHeadlinesWithFinbert([
      { headline: 'Quarterly revenue surges to record high', publisher: 'Reuters' }
    ]);
    assert.equal(cachedBatch.length, 1);
    assert.equal(cachedBatch[0].sentimentSource, 'finbert');
    assert.equal(invokeCount, 1, 'Expected SHA-256 cache hit to avoid calling pipeline again');

    const stats = getFinbertCacheStats();
    assert.equal(stats.size, 2);
    assert.equal(stats.hits, 1);
  });

  it('falls back cleanly to keyword lexicon when FinBERT pipeline load fails or times out', async () => {
    setFinbertPipelineOverride(async () => {
      throw new Error('Simulated ONNX download failure');
    });

    const res = await scoreHeadlinesWithFinbert([
      { headline: 'Shares plunge after earnings miss and regulatory investigation', publisher: 'WSJ' }
    ]);

    assert.equal(res.length, 1);
    assert.equal(res[0].sentimentSource, 'lexicon');
    assert.equal(res[0].sentiment, 'negative');
    assert.ok(res[0].sentimentScore < 0 && res[0].sentimentScore >= -1);
  });
});

describe('Task 2: Daily sentiment store persistence and immutability rules', () => {
  let tmpStorePath: string;
  let prevStoreEnv: string | undefined;

  beforeEach(async () => {
    prevStoreEnv = process.env.ALPHAQUANT_STORE_PATH;
    tmpStorePath = path.join(os.tmpdir(), `aq-test-store-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    process.env.ALPHAQUANT_STORE_PATH = tmpStorePath;
    await db.reloadStoreFromDisk(tmpStorePath);
  });

  afterEach(async () => {
    if (prevStoreEnv === undefined) {
      delete process.env.ALPHAQUANT_STORE_PATH;
    } else {
      process.env.ALPHAQUANT_STORE_PATH = prevStoreEnv;
    }
    await db.reloadStoreFromDisk();
    try {
      if (fs.existsSync(tmpStorePath)) fs.unlinkSync(tmpStorePath);
    } catch {
      // ignore cleanup error
    }
  });

  it('appends non-zero days, refuses to overwrite past dates, skips zero-article days, and persists across disk reload', async () => {
    const todayDate = '2026-05-10';
    const initial: DailySentimentRecord[] = [
      {
        date: '2026-05-08',
        ticker: 'AAPL',
        credibilityWeightedNetScore: 0.42,
        articleCount: 4,
        sentimentSource: 'finbert',
        updatedAt: '2026-05-08T18:00:00Z'
      },
      {
        date: '2026-05-09',
        ticker: 'AAPL',
        credibilityWeightedNetScore: 0,
        articleCount: 0, // Must be omitted, never stored as 0
        sentimentSource: 'lexicon',
        updatedAt: '2026-05-09T18:00:00Z'
      },
      {
        date: '2026-05-10',
        ticker: 'AAPL',
        credibilityWeightedNetScore: -0.25,
        articleCount: 2,
        sentimentSource: 'finbert',
        updatedAt: '2026-05-10T10:00:00Z'
      }
    ];

    const s1 = db.upsertDailySentiment(initial, { todayDate });
    assert.equal(s1.inserted, 2);
    assert.equal(s1.skippedInvalid, 1);

    // Attempt to overwrite past day (2026-05-08) AND update today (2026-05-10)
    const s2 = db.upsertDailySentiment(
      [
        {
          date: '2026-05-08',
          ticker: 'AAPL',
          credibilityWeightedNetScore: -0.99,
          articleCount: 10,
          sentimentSource: 'lexicon',
          updatedAt: '2026-05-10T12:00:00Z'
        },
        {
          date: '2026-05-10',
          ticker: 'AAPL',
          credibilityWeightedNetScore: -0.45,
          articleCount: 5,
          sentimentSource: 'finbert',
          updatedAt: '2026-05-10T12:00:00Z'
        }
      ],
      { todayDate }
    );
    assert.equal(s2.skippedExistingPast, 1);
    assert.equal(s2.updatedToday, 1);

    await db.flushToDisk();
    await db.reloadStoreFromDisk(tmpStorePath);

    const saved = db.getDailySentimentForTicker('AAPL');
    assert.equal(saved.length, 2, 'Zero-article day 2026-05-09 must stay missing');
    assert.equal(saved[0].date, '2026-05-08');
    assert.ok(Math.abs(saved[0].credibilityWeightedNetScore - 0.42) < 1e-4, 'Past day must never be overwritten');
    assert.equal(saved[1].date, '2026-05-10');
    assert.ok(Math.abs(saved[1].credibilityWeightedNetScore - (-0.45)) < 1e-4, 'Same-day update should apply');
  });
});

describe('Task 3: Sentiment-price lag analysis (known lag-2, null series, small-sample refusal, pooled)', () => {
  it('returns available: false with explanation when paired days < 30', () => {
    const bars = makeSyntheticComputedBars(60, 101);
    const fewSentiment: DailySentimentRecord[] = bars.slice(10, 22).map((b, idx) => ({
      date: b.date,
      ticker: 'SMALLTEST',
      credibilityWeightedNetScore: idx % 2 === 0 ? 0.4 : -0.3,
      articleCount: 3,
      sentimentSource: 'finbert',
      updatedAt: b.date
    }));

    const result = computeTickerLagAnalysis('SMALLTEST', bars, fewSentiment, { resamples: 200 });
    assert.equal(result.available, false);
    assert.ok(result.reason && result.reason.includes('minimum 30'));
    assert.equal(result.lags.length, 0);
  });

  it('recovers a planted lag-2 sentiment->return signal on synthetic data and rejects pure noise', () => {
    const rng = mulberry32(4242);
    const count = 110;
    const sentimentByIdx: number[] = [];
    for (let i = 0; i < count; i++) {
      sentimentByIdx.push((rng() - 0.5) * 1.6); // in [-0.8, 0.8]
    }

    // Return at bar i follows sentiment at bar i - 2 (lag k = +2)
    const retOverrides = new Map<number, number>();
    for (let i = 2; i < count; i++) {
      retOverrides.set(i, 0.03 * sentimentByIdx[i - 2] + (rng() - 0.5) * 0.004);
    }

    const bars = makeSyntheticComputedBars(count, 4242, retOverrides);
    const sentimentRecords: DailySentimentRecord[] = bars.slice(5, count - 5).map((b, offset) => ({
      date: b.date,
      ticker: 'LAG2TEST',
      credibilityWeightedNetScore: Number(sentimentByIdx[offset + 5].toFixed(4)),
      articleCount: 4,
      sentimentSource: 'finbert',
      updatedAt: b.date
    }));

    const sigRes = computeTickerLagAnalysis('LAG2TEST', bars, sentimentRecords, { resamples: 300, seed: 777 });
    assert.equal(sigRes.available, true);
    assert.equal(sigRes.lags.length, 11);
    assert.equal(sigRes.hasSignificantLag, true);
    assert.ok(sigRes.bestLag, 'Expected bestLag to be identified');
    assert.equal(sigRes.bestLag!.lag, 2, `Expected planted lag k=+2, got ${sigRes.bestLag!.lag}`);
    assert.equal(sigRes.bestLag!.significant, true);
    assert.ok((sigRes.bestLag!.spearmanRho ?? 0) > 0.6);

    const lag2Point = sigRes.lags.find((p) => p.lag === 2)!;
    assert.ok(lag2Point.spearmanCI95 && lag2Point.spearmanCI95[0] > 0.4);
    assert.ok(lag2Point.bhQValue !== null && lag2Point.bhQValue < 0.01);

    // Pooled cross-ticker test across 2 tickers sharing the lag-2 mechanism
    const pooled = computePooledLagAnalysis(
      [
        { ticker: 'LAG2A', bars, sentimentRecords },
        {
          ticker: 'LAG2B',
          bars,
          sentimentRecords: sentimentRecords.map((r) => ({ ...r, ticker: 'LAG2B' }))
        }
      ],
      { resamples: 200, seed: 888 }
    );
    assert.equal(pooled.available, true);
    assert.equal(pooled.scope, 'pooled');
    assert.equal(pooled.bestLag?.lag, 2);
    assert.equal(pooled.hasSignificantLag, true);

    // Pure uncorrelated series must not flag a false discovery
    const rngNoise = mulberry32(9991);
    const noiseBars = makeSyntheticComputedBars(110, 12345);
    const noiseSentiment: DailySentimentRecord[] = noiseBars.slice(5, 95).map((b) => ({
      date: b.date,
      ticker: 'NOISETEST',
      credibilityWeightedNetScore: Number(((rngNoise() - 0.5) * 1.4).toFixed(4)),
      articleCount: 2,
      sentimentSource: 'lexicon',
      updatedAt: b.date
    }));
    const noiseRes = computeTickerLagAnalysis('NOISETEST', noiseBars, noiseSentiment, { resamples: 250, seed: 555 });
    assert.equal(noiseRes.available, true);
    assert.equal(noiseRes.hasSignificantLag, false);
  });
});

describe('Task 4: Strictly causal sentiment features & paired walk-forward ablation', () => {
  it('excludes contemporaneous/future sentiment (rec.date >= predictionDate) and keeps 24-factor baseline identical', () => {
    const bars = makeSyntheticComputedBars(180, 31415);
    const targetIdx = 120;
    const predictionDate = bars[targetIdx + 1].date; // bar i predicts bar i+1

    // Same-day and future sentiment records must NOT leak into row targetIdx or earlier
    const futureOnlySentiment: DailySentimentRecord[] = [
      {
        date: predictionDate, // exact target date -> forbidden!
        ticker: 'CAUSAL',
        credibilityWeightedNetScore: 0.95,
        articleCount: 8,
        sentimentSource: 'finbert',
        updatedAt: predictionDate
      },
      {
        date: bars[targetIdx + 3].date, // strictly future -> forbidden!
        ticker: 'CAUSAL',
        credibilityWeightedNetScore: -0.95,
        articleCount: 10,
        sentimentSource: 'finbert',
        updatedAt: bars[targetIdx + 3].date
      }
    ];

    const causalMatrix = buildCausalSentimentFeatureMatrix(bars, futureOnlySentiment);
    assert.deepEqual(causalMatrix[targetIdx], [0, 0, 0, 1], 'Target bar must treat future/target-date sentiment as missing');
    assert.deepEqual(causalMatrix[targetIdx - 1], [0, 0, 0, 1]);

    // When a record exists strictly before predictionDate (at barDate), row targetIdx receives it,
    // while rows before barDate still see [0, 0, 0, 1].
    const pastDate = bars[targetIdx].date;
    const pastMatrix = buildCausalSentimentFeatureMatrix(bars, [
      {
        date: pastDate,
        ticker: 'CAUSAL',
        credibilityWeightedNetScore: 0.65,
        articleCount: 5,
        sentimentSource: 'finbert',
        updatedAt: pastDate
      }
    ]);
    assert.equal(pastMatrix[targetIdx][3], 0, 'Strictly past record relative to predictionDate should be visible');
    assert.ok(Math.abs(pastMatrix[targetIdx][0] - 0.65) < 1e-6);
    assert.deepEqual(pastMatrix[targetIdx - 1], [0, 0, 0, 1], 'Earlier bars cannot see future sentiment');

    // Verify 24-factor price-only ensemble model fits and predicts cleanly identically across repeated runs
    const m1 = fitEnsembleModel(bars, 25, 140, 1);
    const m2 = fitEnsembleModel(bars, 25, 140, 1);
    assert.equal(m1.linearWeights.length, 24);
    assert.equal(predictEnsembleReturn(m1, bars, 150, true), predictEnsembleReturn(m2, bars, 150, true));
  });

  it('runs paired walk-forward ablation returning available:false on insufficient overlap and full metrics on adequate overlap', () => {
    const barsA = makeSyntheticComputedBars(320, 2025);
    const barsB = makeSyntheticComputedBars(320, 2026);
    const barsC = makeSyntheticComputedBars(320, 2027);

    // 1. Sparse overlap -> must return available: false
    const sparse = evaluateSentimentAblationOnSeries([
      {
        ticker: 'SPARSE',
        bars: barsA,
        sentimentRecords: barsA.slice(295, 300).map((b) => ({
          date: b.date,
          ticker: 'SPARSE',
          credibilityWeightedNetScore: 0.25,
          articleCount: 2,
          sentimentSource: 'finbert',
          updatedAt: b.date
        }))
      }
    ]);
    assert.equal(sparse.available, false);
    assert.ok(sparse.reason && sparse.matchedDates < sparse.minRequiredDates);

    // 2. Sufficient multi-asset overlap -> must run both arms identically on matched OOS dates
    const makeRecords = (ticker: string, bars: ComputedBar[]): DailySentimentRecord[] =>
      bars.slice(180, 315).map((b, idx) => ({
        date: b.date,
        ticker,
        credibilityWeightedNetScore: Number((((idx % 7) - 3) * 0.2).toFixed(3)),
        articleCount: 2 + (idx % 4),
        sentimentSource: 'finbert',
        updatedAt: b.date
      }));

    const fullAblation = evaluateSentimentAblationOnSeries(
      [
        { ticker: 'ABL_A', bars: barsA, sentimentRecords: makeRecords('ABL_A', barsA) },
        { ticker: 'ABL_B', bars: barsB, sentimentRecords: makeRecords('ABL_B', barsB) },
        { ticker: 'ABL_C', bars: barsC, sentimentRecords: makeRecords('ABL_C', barsC) }
      ],
      { resamples: 200 }
    );

    assert.equal(fullAblation.available, true);
    assert.ok(fullAblation.priceOnly && fullAblation.pricePlusSentiment && fullAblation.pairedDiff);
    assert.equal(fullAblation.priceOnly!.samples, fullAblation.pricePlusSentiment!.samples);
    assert.equal(fullAblation.priceOnly!.distinctDates, fullAblation.pricePlusSentiment!.distinctDates);
    assert.equal(fullAblation.pairedDiff!.maeDiffCI95.length, 2);
    assert.equal(fullAblation.pairedDiff!.directionalAccuracyDiffCI95.length, 2);
  });
});
