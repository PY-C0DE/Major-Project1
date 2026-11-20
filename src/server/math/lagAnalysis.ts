/**
 * Sentiment-Price Lag Analysis Engine (Task 3)
 *
 * Computes cross-correlation profiles between daily credibility-weighted sentiment S_t
 * and daily asset returns R_{t+k} across lags k in [-5, +5]:
 *   - k > 0: sentiment leads future returns (predictive test)
 *   - k = 0: contemporaneous association
 *   - k < 0: past returns lead sentiment (reverse causality / reaction test)
 *
 * Statistical rigor:
 *   - Missing sentiment days stay missing (never 0-filled)
 *   - Returns both Pearson r and Spearman rho (rank-based with average tie handling)
 *   - 95% confidence intervals via seeded date-block bootstrap (single ticker)
 *     or seeded date-clustered bootstrap (pooled cross-ticker)
 *   - Multiple-testing adjustment across all 11 lags via Benjamini-Hochberg FDR & Bonferroni
 *   - Strictly refuses correlation output (`available: false`) when paired sample size n < 30
 */

import { ComputedBar } from './indicators';
import {
  DailySentimentRecord,
  LagAnalysisResult,
  LagCorrelationPoint
} from '../../types';
import { BOOTSTRAP_SEED, mulberry32 } from './evaluation';

export const LAG_WINDOW_MIN = -5;
export const LAG_WINDOW_MAX = 5;
export const LAG_TOTAL_COUNT = LAG_WINDOW_MAX - LAG_WINDOW_MIN + 1; // 11 lags
export const LAG_MIN_PAIRED_DAYS = 30;
export const LAG_BOOTSTRAP_RESAMPLES = 1000;
export const LAG_BOOTSTRAP_SEED = BOOTSTRAP_SEED + 31;

interface PairedObservation {
  date: string;
  ticker: string;
  sentiment: number;
  ret: number;
}

function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

function logGamma(z: number): number {
  const g = 7;
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  const shifted = z - 1;
  let x = p[0];
  for (let i = 1; i < g + 2; i++) {
    x += p[i] / (shifted + i);
  }
  const t = shifted + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Continued-fraction evaluation of regularized incomplete beta function I_x(a, b)
 */
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-30;

  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }

  return h;
}

function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logBeta(a, b) * -1 + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/**
 * Exact two-sided p-value for correlation coefficient r with sample size n (df = n - 2).
 */
export function correlationTwoSidedPValue(r: number, n: number): number {
  if (!Number.isFinite(r) || n <= 2) return 1;
  const absR = Math.min(1, Math.abs(r));
  if (absR >= 1 - 1e-12) return 0;
  if (absR < 1e-12) return 1;
  const df = n - 2;
  const t2 = (df * absR * absR) / Math.max(1e-15, 1 - absR * absR);
  const x = df / (df + t2);
  const p = regularizedIncompleteBeta(x, df / 2, 0.5);
  return Math.max(0, Math.min(1, Number.isFinite(p) ? p : 1));
}

export function computePearsonR(x: number[], y: number[]): number | null {
  const n = Math.min(x.length, y.length);
  if (n < 3) return null;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  const denom = Math.sqrt(varX * varY);
  if (denom <= 1e-15) return null;
  return Math.max(-1, Math.min(1, cov / denom));
}

function rankWithTies(values: number[]): number[] {
  const n = values.length;
  const indexed = values.map((v, idx) => ({ v, idx })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(n);

  let i = 0;
  while (i < n) {
    let j = i + 1;
    while (j < n && indexed[j].v === indexed[i].v) {
      j++;
    }
    // 1-based average rank for ties across [i .. j - 1]
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks[indexed[k].idx] = avgRank;
    }
    i = j;
  }
  return ranks;
}

export function computeSpearmanRho(x: number[], y: number[]): number | null {
  const n = Math.min(x.length, y.length);
  if (n < 3) return null;
  const rx = rankWithTies(x.slice(0, n));
  const ry = rankWithTies(y.slice(0, n));
  return computePearsonR(rx, ry);
}

function linearQuantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  const w = pos - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

/**
 * Aligns daily sentiment records at date t with daily returns at t + lagK
 * for a single ticker. Strictly preserves missing sentiment days (never 0-fills).
 */
export function alignSentimentAndReturns(
  bars: Pick<ComputedBar, 'date' | 'close'>[],
  sentimentRecords: DailySentimentRecord[],
  lagK: number
): PairedObservation[] {
  if (!bars || bars.length < 2 || !sentimentRecords || sentimentRecords.length === 0) {
    return [];
  }

  const sortedBars = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  const dateToIdx = new Map<string, number>();
  for (let i = 0; i < sortedBars.length; i++) {
    dateToIdx.set(sortedBars[i].date, i);
  }

  const sortedSentiment = [...sentimentRecords]
    .filter((r) => r && r.articleCount > 0 && Number.isFinite(r.credibilityWeightedNetScore))
    .sort((a, b) => a.date.localeCompare(b.date));

  const pairs: PairedObservation[] = [];
  for (const rec of sortedSentiment) {
    const tIdx = dateToIdx.get(rec.date);
    if (tIdx === undefined) continue;
    const targetIdx = tIdx + lagK;
    if (targetIdx < 1 || targetIdx >= sortedBars.length) continue;

    const prevClose = sortedBars[targetIdx - 1].close;
    const currClose = sortedBars[targetIdx].close;
    if (!Number.isFinite(prevClose) || !Number.isFinite(currClose) || prevClose <= 0 || currClose <= 0) {
      continue;
    }

    const ret = (currClose - prevClose) / prevClose;
    pairs.push({
      date: rec.date,
      ticker: rec.ticker,
      sentiment: rec.credibilityWeightedNetScore,
      ret
    });
  }

  return pairs;
}

/**
 * Circular / moving date-block bootstrap 95% CIs for Pearson r & Spearman rho (single ticker).
 */
function computeDateBlockBootstrapCIs(
  pairs: PairedObservation[],
  resamples: number,
  seed: number
): { pearsonCI95: [number, number] | null; spearmanCI95: [number, number] | null } {
  const n = pairs.length;
  if (n < 8) return { pearsonCI95: null, spearmanCI95: null };

  const blockSize = Math.max(2, Math.min(5, Math.round(Math.cbrt(n))));
  const rng = mulberry32(seed);
  const pearsonSamples: number[] = [];
  const spearmanSamples: number[] = [];

  for (let b = 0; b < resamples; b++) {
    const sx: number[] = new Array(n);
    const sy: number[] = new Array(n);
    let written = 0;

    while (written < n) {
      const start = Math.floor(rng() * n);
      for (let off = 0; off < blockSize && written < n; off++) {
        const obs = pairs[(start + off) % n];
        sx[written] = obs.sentiment;
        sy[written] = obs.ret;
        written++;
      }
    }

    const r = computePearsonR(sx, sy);
    if (r !== null && Number.isFinite(r)) pearsonSamples.push(r);
    const rho = computeSpearmanRho(sx, sy);
    if (rho !== null && Number.isFinite(rho)) spearmanSamples.push(rho);
  }

  pearsonSamples.sort((a, b) => a - b);
  spearmanSamples.sort((a, b) => a - b);

  return {
    pearsonCI95:
      pearsonSamples.length >= 20
        ? [
            Number(linearQuantile(pearsonSamples, 0.025).toFixed(4)),
            Number(linearQuantile(pearsonSamples, 0.975).toFixed(4))
          ]
        : null,
    spearmanCI95:
      spearmanSamples.length >= 20
        ? [
            Number(linearQuantile(spearmanSamples, 0.025).toFixed(4)),
            Number(linearQuantile(spearmanSamples, 0.975).toFixed(4))
          ]
        : null
  };
}

/**
 * Date-clustered bootstrap 95% CIs across pooled multi-ticker observations.
 */
function computeDateClusteredBootstrapCorrCIs(
  pairs: PairedObservation[],
  resamples: number,
  seed: number
): {
  nDates: number;
  pearsonCI95: [number, number] | null;
  spearmanCI95: [number, number] | null;
} {
  const byDate = new Map<string, PairedObservation[]>();
  for (const obs of pairs) {
    const list = byDate.get(obs.date) || [];
    list.push(obs);
    byDate.set(obs.date, list);
  }

  const dates = Array.from(byDate.keys()).sort();
  const numDates = dates.length;
  if (numDates < 5) {
    return { nDates: numDates, pearsonCI95: null, spearmanCI95: null };
  }

  const clusters = dates.map((d) => byDate.get(d)!);
  const rng = mulberry32(seed);
  const pearsonSamples: number[] = [];
  const spearmanSamples: number[] = [];

  for (let b = 0; b < resamples; b++) {
    const sx: number[] = [];
    const sy: number[] = [];
    for (let k = 0; k < numDates; k++) {
      const cluster = clusters[Math.floor(rng() * numDates)];
      for (const obs of cluster) {
        sx.push(obs.sentiment);
        sy.push(obs.ret);
      }
    }
    const r = computePearsonR(sx, sy);
    if (r !== null && Number.isFinite(r)) pearsonSamples.push(r);
    const rho = computeSpearmanRho(sx, sy);
    if (rho !== null && Number.isFinite(rho)) spearmanSamples.push(rho);
  }

  pearsonSamples.sort((a, b) => a - b);
  spearmanSamples.sort((a, b) => a - b);

  return {
    nDates: numDates,
    pearsonCI95:
      pearsonSamples.length >= 20
        ? [
            Number(linearQuantile(pearsonSamples, 0.025).toFixed(4)),
            Number(linearQuantile(pearsonSamples, 0.975).toFixed(4))
          ]
        : null,
    spearmanCI95:
      spearmanSamples.length >= 20
        ? [
            Number(linearQuantile(spearmanSamples, 0.025).toFixed(4)),
            Number(linearQuantile(spearmanSamples, 0.975).toFixed(4))
          ]
        : null
  };
}

/**
 * Applies Benjamini-Hochberg step-up FDR adjustment & Bonferroni across m = 11 lags.
 */
function applyMultipleTestingCorrections(points: LagCorrelationPoint[], totalTests = LAG_TOTAL_COUNT): void {
  const eligible: Array<{ idx: number; p: number }> = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i].spearmanPValue;
    if (p !== null && Number.isFinite(p)) {
      eligible.push({ idx: i, p });
      points[i].bonferroniPValue = Number(Math.min(1, p * totalTests).toFixed(6));
    } else {
      points[i].bonferroniPValue = null;
      points[i].bhQValue = null;
      points[i].significant = false;
    }
  }

  if (eligible.length === 0) return;

  eligible.sort((a, b) => a.p - b.p);
  let minRunningQ = 1;
  for (let rankZero = eligible.length - 1; rankZero >= 0; rankZero--) {
    const rank = rankZero + 1;
    const rawQ = (totalTests / rank) * eligible[rankZero].p;
    minRunningQ = Math.min(minRunningQ, Math.min(1, rawQ));
    const point = points[eligible[rankZero].idx];
    point.bhQValue = Number(minRunningQ.toFixed(6));
    point.significant = point.bhQValue < 0.05;
  }
}

function pickBestLag(points: LagCorrelationPoint[]): LagAnalysisResult['bestLag'] {
  const candidates = points.filter((p) => p.spearmanPValue !== null && p.bhQValue !== null);
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const qa = a.bhQValue ?? 1;
    const qb = b.bhQValue ?? 1;
    if (qa !== qb) return qa - qb;
    const pa = a.spearmanPValue ?? 1;
    const pb = b.spearmanPValue ?? 1;
    if (pa !== pb) return pa - pb;
    return Math.abs(b.spearmanRho ?? 0) - Math.abs(a.spearmanRho ?? 0);
  });

  const best = candidates[0];
  return {
    lag: best.lag,
    spearmanRho: best.spearmanRho,
    pearsonR: best.pearsonR,
    bhQValue: best.bhQValue,
    bonferroniPValue: best.bonferroniPValue,
    significant: best.significant
  };
}

/**
 * Single-ticker Sentiment-Price Lag Analysis for lags k = -5..+5.
 */
export function computeTickerLagAnalysis(
  ticker: string,
  bars: Pick<ComputedBar, 'date' | 'close'>[],
  sentimentRecords: DailySentimentRecord[],
  options?: { resamples?: number; seed?: number; minPairedDays?: number }
): LagAnalysisResult {
  const resamples = options?.resamples ?? LAG_BOOTSTRAP_RESAMPLES;
  const seed = options?.seed ?? LAG_BOOTSTRAP_SEED;
  const minRequired = options?.minPairedDays ?? LAG_MIN_PAIRED_DAYS;

  const validRecords = sentimentRecords.filter((r) => r && r.articleCount > 0);
  const lagsByK: Array<{ lag: number; pairs: PairedObservation[] }> = [];
  let maxPairedDays = 0;

  for (let k = LAG_WINDOW_MIN; k <= LAG_WINDOW_MAX; k++) {
    const pairs = alignSentimentAndReturns(bars, validRecords, k);
    lagsByK.push({ lag: k, pairs });
    if (pairs.length > maxPairedDays) maxPairedDays = pairs.length;
  }

  const nowIso = new Date().toISOString();
  if (maxPairedDays < minRequired) {
    return {
      available: false,
      reason: `Insufficient paired sentiment-return days for ${ticker}: found ${maxPairedDays} aligned trading day(s), minimum ${minRequired} required before computing lag correlations.`,
      ticker,
      scope: 'single',
      totalStoredSentimentDays: validRecords.length,
      maxPairedDays,
      minRequiredPairs: minRequired,
      bootstrapResamples: resamples,
      bootstrapSeed: seed,
      multipleTestingMethod: 'benjamini-hochberg-and-bonferroni',
      alpha: 0.05,
      lags: [],
      bestLag: null,
      hasSignificantLag: false,
      interpretationNote: `Unavailable: only ${maxPairedDays} paired day(s) collected so far (minimum ${minRequired} required to avoid small-sample noise). Missing news days are omitted rather than zero-filled.`,
      computedAt: nowIso
    };
  }

  const lagPoints: LagCorrelationPoint[] = lagsByK.map(({ lag, pairs }, idx) => {
    const n = pairs.length;
    if (n < minRequired) {
      return {
        lag,
        n,
        nDates: new Set(pairs.map((p) => p.date)).size,
        pearsonR: null,
        pearsonPValue: null,
        pearsonCI95: null,
        spearmanRho: null,
        spearmanPValue: null,
        spearmanCI95: null,
        bonferroniPValue: null,
        bhQValue: null,
        significant: false
      };
    }

    const xs = pairs.map((p) => p.sentiment);
    const ys = pairs.map((p) => p.ret);
    const pearsonR = computePearsonR(xs, ys);
    const spearmanRho = computeSpearmanRho(xs, ys);
    const pearsonP = pearsonR !== null ? correlationTwoSidedPValue(pearsonR, n) : null;
    const spearmanP = spearmanRho !== null ? correlationTwoSidedPValue(spearmanRho, n) : null;
    const { pearsonCI95, spearmanCI95 } = computeDateBlockBootstrapCIs(pairs, resamples, seed + idx * 97);

    return {
      lag,
      n,
      nDates: new Set(pairs.map((p) => p.date)).size,
      pearsonR: pearsonR !== null ? Number(pearsonR.toFixed(4)) : null,
      pearsonPValue: pearsonP !== null ? Number(pearsonP.toFixed(6)) : null,
      pearsonCI95,
      spearmanRho: spearmanRho !== null ? Number(spearmanRho.toFixed(4)) : null,
      spearmanPValue: spearmanP !== null ? Number(spearmanP.toFixed(6)) : null,
      spearmanCI95,
      bonferroniPValue: null,
      bhQValue: null,
      significant: false
    };
  });

  applyMultipleTestingCorrections(lagPoints, LAG_TOTAL_COUNT);
  const bestLag = pickBestLag(lagPoints);
  const hasSignificantLag = lagPoints.some((p) => p.significant);

  const interpretationNote = bestLag
    ? hasSignificantLag
      ? `Strongest association at lag k = ${bestLag.lag >= 0 ? `+${bestLag.lag}` : bestLag.lag} (Spearman rho = ${bestLag.spearmanRho}, BH q = ${bestLag.bhQValue}, Bonferroni p = ${bestLag.bonferroniPValue}).`
      : `No statistically significant lead or lag correlation survived Benjamini-Hochberg / Bonferroni multiple-testing correction across the 11 lags (smallest BH q = ${bestLag.bhQValue} at k = ${bestLag.lag >= 0 ? `+${bestLag.lag}` : bestLag.lag}).`
    : 'No eligible lags with sufficient variance to compute correlation.';

  return {
    available: true,
    ticker,
    scope: 'single',
    totalStoredSentimentDays: validRecords.length,
    maxPairedDays,
    minRequiredPairs: minRequired,
    bootstrapResamples: resamples,
    bootstrapSeed: seed,
    multipleTestingMethod: 'benjamini-hochberg-and-bonferroni',
    alpha: 0.05,
    lags: lagPoints,
    bestLag,
    hasSignificantLag,
    interpretationNote,
    computedAt: nowIso
  };
}

/**
 * Pooled Cross-Ticker Sentiment-Price Lag Analysis with date-clustered bootstrap.
 */
export function computePooledLagAnalysis(
  tickerInputs: Array<{
    ticker: string;
    bars: Pick<ComputedBar, 'date' | 'close'>[];
    sentimentRecords: DailySentimentRecord[];
  }>,
  options?: { resamples?: number; seed?: number; minPairedObservations?: number }
): LagAnalysisResult {
  const resamples = options?.resamples ?? LAG_BOOTSTRAP_RESAMPLES;
  const seed = options?.seed ?? LAG_BOOTSTRAP_SEED;
  const minRequired = options?.minPairedObservations ?? LAG_MIN_PAIRED_DAYS;

  const totalStoredSentimentDays = tickerInputs.reduce(
    (acc, it) => acc + it.sentimentRecords.filter((r) => r.articleCount > 0).length,
    0
  );

  const lagsByK: Array<{ lag: number; pairs: PairedObservation[] }> = [];
  let maxPairedObs = 0;

  for (let k = LAG_WINDOW_MIN; k <= LAG_WINDOW_MAX; k++) {
    const pooledPairs: PairedObservation[] = [];
    for (const item of tickerInputs) {
      const pairs = alignSentimentAndReturns(item.bars, item.sentimentRecords, k);
      pooledPairs.push(...pairs);
    }
    lagsByK.push({ lag: k, pairs: pooledPairs });
    if (pooledPairs.length > maxPairedObs) maxPairedObs = pooledPairs.length;
  }

  const nowIso = new Date().toISOString();
  const activeTickersCount = tickerInputs.filter(
    (it) => it.sentimentRecords.some((r) => r.articleCount > 0)
  ).length;

  if (maxPairedObs < minRequired) {
    return {
      available: false,
      reason: `Insufficient pooled sentiment-return observations across ${activeTickersCount} ticker(s): found ${maxPairedObs} aligned (ticker, date) pairs, minimum ${minRequired} required.`,
      ticker: 'ALL',
      scope: 'pooled',
      totalStoredSentimentDays,
      maxPairedDays: maxPairedObs,
      minRequiredPairs: minRequired,
      bootstrapResamples: resamples,
      bootstrapSeed: seed,
      multipleTestingMethod: 'benjamini-hochberg-and-bonferroni',
      alpha: 0.05,
      lags: [],
      bestLag: null,
      hasSignificantLag: false,
      evaluatedTickersCount: activeTickersCount,
      interpretationNote: `Unavailable: only ${maxPairedObs} pooled (ticker, date) sentiment-return pairs collected so far across ${activeTickersCount} ticker(s) (minimum ${minRequired} required). Run daily sentiment collection over multiple market days to accumulate sample size.`,
      computedAt: nowIso
    };
  }

  const lagPoints: LagCorrelationPoint[] = lagsByK.map(({ lag, pairs }, idx) => {
    const n = pairs.length;
    const distinctDates = new Set(pairs.map((p) => p.date)).size;
    if (n < minRequired || distinctDates < 5) {
      return {
        lag,
        n,
        nDates: distinctDates,
        pearsonR: null,
        pearsonPValue: null,
        pearsonCI95: null,
        spearmanRho: null,
        spearmanPValue: null,
        spearmanCI95: null,
        bonferroniPValue: null,
        bhQValue: null,
        significant: false
      };
    }

    const xs = pairs.map((p) => p.sentiment);
    const ys = pairs.map((p) => p.ret);
    const pearsonR = computePearsonR(xs, ys);
    const spearmanRho = computeSpearmanRho(xs, ys);
    const pearsonP = pearsonR !== null ? correlationTwoSidedPValue(pearsonR, n) : null;
    const spearmanP = spearmanRho !== null ? correlationTwoSidedPValue(spearmanRho, n) : null;
    const { nDates, pearsonCI95, spearmanCI95 } = computeDateClusteredBootstrapCorrCIs(
      pairs,
      resamples,
      seed + idx * 101
    );

    return {
      lag,
      n,
      nDates,
      pearsonR: pearsonR !== null ? Number(pearsonR.toFixed(4)) : null,
      pearsonPValue: pearsonP !== null ? Number(pearsonP.toFixed(6)) : null,
      pearsonCI95,
      spearmanRho: spearmanRho !== null ? Number(spearmanRho.toFixed(4)) : null,
      spearmanPValue: spearmanP !== null ? Number(spearmanP.toFixed(6)) : null,
      spearmanCI95,
      bonferroniPValue: null,
      bhQValue: null,
      significant: false
    };
  });

  applyMultipleTestingCorrections(lagPoints, LAG_TOTAL_COUNT);
  const bestLag = pickBestLag(lagPoints);
  const hasSignificantLag = lagPoints.some((p) => p.significant);
  const totalObservationsAcrossLags = lagPoints.reduce((acc, p) => acc + p.n, 0);

  const interpretationNote = bestLag
    ? hasSignificantLag
      ? `Pooled cross-ticker lag k = ${bestLag.lag >= 0 ? `+${bestLag.lag}` : bestLag.lag} is statistically significant after multiple-testing correction (Spearman rho = ${bestLag.spearmanRho}, BH q = ${bestLag.bhQValue}, Bonferroni p = ${bestLag.bonferroniPValue}). Date-clustered 95% CIs account for cross-asset correlation.`
      : `No pooled lead or lag correlation survived Benjamini-Hochberg / Bonferroni multiple-testing correction across the 11 lags (smallest BH q = ${bestLag.bhQValue} at k = ${bestLag.lag >= 0 ? `+${bestLag.lag}` : bestLag.lag}). Sentiment does not show a statistically reliable linear/rank signal over returns in this sample.`
    : 'Insufficient overlapping trading dates across tickers for pooled correlation.';

  return {
    available: true,
    ticker: 'ALL',
    scope: 'pooled',
    totalStoredSentimentDays,
    maxPairedDays: maxPairedObs,
    minRequiredPairs: minRequired,
    bootstrapResamples: resamples,
    bootstrapSeed: seed,
    multipleTestingMethod: 'benjamini-hochberg-and-bonferroni',
    alpha: 0.05,
    lags: lagPoints,
    bestLag,
    hasSignificantLag,
    evaluatedTickersCount: activeTickersCount,
    totalObservationsAcrossLags,
    interpretationNote,
    computedAt: nowIso
  };
}
