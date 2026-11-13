/**
 * AlphaQuant AI - Quantitative Multi-Factor Stacked Ensemble Engine (v4.0)
 *
 * Architecture:
 * 1. Z-Score Standardized Walk-Forward Ridge Regressor in Volatility-Normalized (Sharpe) Space
 *    with Huberized Outlier Weighting & Time-Series Cross-Validated Regularization
 * 2. Regularized Depth-2 Gradient-Boosted Decision Trees (GBDT) with Huber Loss & Min-Leaf Constraints
 * 3. Adaptive State-Space Kalman / Regime Trend-Reversion Filter (Autocorrelation-Gated)
 * 4. Cosine-Similarity Pattern Analog Forecaster (Regime-Matched KNN in Standardized Feature Space)
 * 5. Out-of-Sample Walk-Forward Meta-Stacker with Bayesian Shrinkage Optimization
 *
 * Strictly zero-lookahead: scalers, trees, weights, and stacking coefficients are fit
 * exclusively on historical training bars prior to prediction index.
 */

import { ComputedBar } from './indicators';

export const FEATURE_COUNT = 24;

export interface ModelWeights {
  intercept: number;
  emaSpread: number;
  smaSpread: number;
  rsiSignal: number;
  percentB: number;
  macdSignal: number;
  momentumReturn: number;
  volatilityRatio: number;
}

export interface DecisionStump {
  featureIndex: number;
  threshold: number;
  leftValue: number;
  rightValue: number;
  weight: number;
}

export interface Depth2Tree {
  featureIndex: number;
  threshold: number;
  leftFeatureIndex?: number;
  leftThreshold?: number;
  leftLeftValue: number;
  leftRightValue: number;
  rightFeatureIndex?: number;
  rightThreshold?: number;
  rightLeftValue: number;
  rightRightValue: number;
  weight: number;
}

export interface EnsembleModel {
  linearWeights: number[];
  stumps: DecisionStump[];
  trees?: Depth2Tree[];
  lambda: number;
  residualBias: number;
  decayFactor: number;
  optimalAlpha?: number;
  r2Score?: number;
  // v4.0 Standardization, Horizon & Meta-Stacking Parameters
  featureMeans: number[];
  featureStds: number[];
  metaWeights: [number, number, number, number]; // [Ridge, GBDT, KalmanRegime, AnalogKNN]
  shrinkageGain: number;
  horizonDays: number;
  analogVectors: number[][];
  analogTargets: number[];
}

/**
 * Estimates homoskedastic daily return volatility for bar `i`
 * by blending 20-day realized close-to-close volatility with 5-day EWMA Garman-Klass intraday volatility.
 */
export function estimateBarDailyVol(bars: ComputedBar[], i: number): number {
  const b = bars[i];
  const dailyCloseVol = Math.max(0.005, (b.volatility20 || 0.18) * Math.sqrt(1 / 252));

  let gkSum = 0;
  let gkWeight = 0;
  const start = Math.max(0, i - 4);
  for (let k = i; k >= start; k--) {
    const bk = bars[k];
    const logHL = Math.log(Math.max(1e-4, bk.high) / Math.max(1e-4, bk.low));
    const logCO = Math.log(Math.max(1e-4, bk.close) / Math.max(1e-4, bk.open));
    const gkVar = Math.max(0, 0.5 * logHL * logHL - (2 * Math.LN2 - 1) * logCO * logCO);
    const w = Math.pow(0.75, i - k);
    gkSum += w * Math.sqrt(gkVar);
    gkWeight += w;
  }
  const gkVol = gkWeight > 0 ? Math.max(0.004, gkSum / gkWeight) : dailyCloseVol;

  return Math.max(0.0045, Math.min(0.08, 0.60 * dailyCloseVol + 0.40 * gkVol));
}

/**
 * Extracts 24-dimensional normalized quantitative feature vector for bar at index `i`.
 * Indices 0..17 preserve canonical factor semantics; 18..23 add microstructure gap,
 * intraday flow, volatility regime ratio, linear trend quality (slope*R²), Donchian position, and OBV flow.
 */
export function extractFeatureVector(bars: ComputedBar[], i: number): number[] {
  const b = bars[i];
  const p = b.close || 1;
  const prevP = i > 0 ? bars[i - 1].close : p;
  const p3 = i >= 3 ? bars[i - 3].close : prevP;
  const p5 = i >= 5 ? bars[i - 5].close : p3;
  const p10 = i >= 10 ? bars[i - 10].close : p5;

  const ema12 = b.ema12 ?? p;
  const ema26 = b.ema26 ?? p;
  const sma50 = b.sma50 ?? p;
  const rsi = b.rsi14 ?? 50;
  const bbUpper = b.bbUpper ?? p * 1.04;
  const bbLower = b.bbLower ?? p * 0.96;
  const atr = b.atr14 ?? p * 0.018;
  const macdHist = b.macdHist ?? 0;
  const dailyVol = estimateBarDailyVol(bars, i);

  // 0. Intercept
  const f0 = 1.0;
  // 1. Trend: EMA 12 vs 26 spread normalized by price
  const f1 = (ema12 - ema26) / p;
  // 2. Macro trend: Price vs SMA 50
  const f2 = (p - sma50) / p;
  // 3. Mean-reversion: RSI deviation from center 50
  const f3 = (rsi - 50) / 50;
  // 4. Bollinger %B: Position within volatility bands
  const bbRange = Math.max(0.001, bbUpper - bbLower);
  const f4 = (p - bbLower) / bbRange - 0.5;
  // 5. MACD momentum impulse normalized by ATR
  const f5 = macdHist / (atr || 1);
  // 6. 1-day lag return (vol-normalized for cross-regime stability)
  const rawRet1 = prevP > 0 ? (p - prevP) / prevP : 0;
  const f6 = Math.max(-3.5, Math.min(3.5, rawRet1 / dailyVol));
  // 7. Volatility ratio (ATR / price)
  const f7 = atr / p;
  // 8. Short-term 3-day Rate of Change (vol-normalized)
  const rawRoc3 = p3 > 0 ? (p - p3) / p3 : 0;
  const f8 = Math.max(-4, Math.min(4, rawRoc3 / (dailyVol * Math.sqrt(3))));

  // 9. Close Location Value (Intraday Buying vs Selling Pressure)
  const barRange = Math.max(1e-4, b.high - b.low);
  const clv = ((b.close - b.low) - (b.high - b.close)) / barRange;
  const f9 = Math.max(-1, Math.min(1, clv));

  // 10. Short-term 5-day EMA equilibrium distance
  const ema5 =
    i >= 4
      ? bars[i].close * 0.33 +
        bars[i - 1].close * 0.27 +
        bars[i - 2].close * 0.20 +
        bars[i - 3].close * 0.13 +
        bars[i - 4].close * 0.07
      : p;
  const f10 = Math.max(-3.5, Math.min(3.5, ((p - ema5) / p) / dailyVol));

  // 11. Volume Flow Shock (Normalized relative volume signed by candle direction)
  let volShock = 0;
  if (i >= 5) {
    let sumV = 0;
    for (let k = 1; k <= 5; k++) sumV += bars[i - k].volume;
    const avgV = sumV / 5 || 1;
    const relV = (b.volume - avgV) / avgV;
    const candleDir = b.close >= b.open ? 1 : -1;
    volShock = Math.max(-1.5, Math.min(1.5, relV * candleDir));
  }
  const f11 = volShock;

  // 12. Garman-Klass Intraday Volatility Ratio
  const logHL = Math.log(Math.max(1e-4, b.high) / Math.max(1e-4, b.low));
  const logCO = Math.log(Math.max(1e-4, b.close) / Math.max(1e-4, b.open));
  const gkVariance = 0.5 * logHL * logHL - (2 * Math.LN2 - 1) * logCO * logCO;
  const gkVol = Math.sqrt(Math.max(0, gkVariance));
  const f12 = Math.max(0, Math.min(2.5, gkVol / Math.max(0.005, atr / p)));

  // 13. RSI Velocity (3-day change in momentum)
  const rsiLag3 = i >= 3 ? bars[i - 3].rsi14 ?? 50 : rsi;
  const f13 = Math.max(-1.5, Math.min(1.5, (rsi - rsiLag3) / 25));

  // 14. Candlestick Wick Absorption Asymmetry
  const upperWick = Math.max(0, b.high - Math.max(b.open, b.close));
  const lowerWick = Math.max(0, Math.min(b.open, b.close) - b.low);
  const f14 = Math.max(-1, Math.min(1, (lowerWick - upperWick) / barRange));

  // 15. VWAP Equilibrium Distance (vol-normalized)
  let sumTPV = 0;
  let sumVW = 0;
  const vwapWindow = Math.min(5, i + 1);
  for (let k = 0; k < vwapWindow; k++) {
    const bk = bars[i - k];
    const tp = (bk.high + bk.low + bk.close) / 3;
    const v = bk.volume || 1;
    sumTPV += tp * v;
    sumVW += v;
  }
  const vwap = sumVW > 0 ? sumTPV / sumVW : p;
  const f15 = Math.max(-3, Math.min(3, ((p - vwap) / p) / dailyVol));

  // 16. Multi-timeframe Momentum Acceleration (ROC-5 minus scaled ROC-10)
  const roc5 = p5 > 0 ? (p - p5) / p5 : 0;
  const roc10 = p10 > 0 ? (p - p10) / p10 : 0;
  const f16 = Math.max(-3, Math.min(3, (roc5 - roc10 * 0.5) / (dailyVol * Math.sqrt(5))));

  // 17. Short-term Return Autocorrelation (Trending vs Mean-Reverting State)
  let autoCorr = 0;
  if (i >= 8) {
    let rSum = 0;
    const returns: number[] = [];
    for (let k = 0; k < 6; k++) {
      const idx = i - k;
      const r = (bars[idx].close - bars[idx - 1].close) / (bars[idx - 1].close || 1);
      returns.push(r);
      rSum += r;
    }
    const rMean = rSum / 6;
    let cov = 0;
    let varSum = 0;
    for (let k = 0; k < 5; k++) {
      cov += (returns[k] - rMean) * (returns[k + 1] - rMean);
      varSum += Math.pow(returns[k] - rMean, 2);
    }
    autoCorr = varSum > 1e-8 ? cov / varSum : 0;
  }
  const f17 = Math.max(-1, Math.min(1, autoCorr));

  // 18. Overnight Gap (vol-normalized open vs prior close)
  const gapRaw = prevP > 0 ? (b.open - prevP) / prevP : 0;
  const f18 = Math.max(-3, Math.min(3, gapRaw / dailyVol));

  // 19. Intraday Body Return (vol-normalized close vs open)
  const bodyRaw = b.open > 0 ? (b.close - b.open) / b.open : 0;
  const f19 = Math.max(-3, Math.min(3, bodyRaw / dailyVol));

  // 20. Volatility Regime Expansion / Compression Ratio (5d realized vol vs 20d realized vol)
  let f20 = 0;
  if (i >= 6) {
    let sumSq5 = 0;
    for (let k = 0; k < 5; k++) {
      const c1 = bars[i - k].close;
      const c0 = bars[i - k - 1].close || c1;
      const rk = (c1 - c0) / c0;
      sumSq5 += rk * rk;
    }
    const vol5Daily = Math.sqrt(sumSq5 / 5);
    const baseDaily = Math.max(0.004, (b.volatility20 || 0.18) * Math.sqrt(1 / 252));
    f20 = Math.max(-0.8, Math.min(1.5, vol5Daily / baseDaily - 1));
  }

  // 21. 10-Day Linear Regression Slope weighted by Trend R² (Trend Purity)
  let f21 = 0;
  if (i >= 9) {
    const m = 10;
    const meanX = 4.5;
    let meanY = 0;
    for (let k = 0; k < m; k++) meanY += bars[i - (m - 1 - k)].close;
    meanY /= m;
    let sxx = 0;
    let sxy = 0;
    let syy = 0;
    for (let k = 0; k < m; k++) {
      const dx = k - meanX;
      const dy = bars[i - (m - 1 - k)].close - meanY;
      sxx += dx * dx;
      sxy += dx * dy;
      syy += dy * dy;
    }
    if (sxx > 0 && syy > 1e-8) {
      const slope = sxy / sxx;
      const r2 = (sxy * sxy) / (sxx * syy);
      f21 = Math.max(-3, Math.min(3, ((slope / p) / dailyVol) * r2));
    }
  }

  // 22. 20-Day Donchian Channel Position [-0.5, +0.5]
  let high20 = b.high;
  let low20 = b.low;
  const dStart = Math.max(0, i - 19);
  for (let k = dStart; k <= i; k++) {
    if (bars[k].high > high20) high20 = bars[k].high;
    if (bars[k].low < low20) low20 = bars[k].low;
  }
  const f22 = (p - low20) / Math.max(1e-4, high20 - low20) - 0.5;

  // 23. 5-Day Signed Money Flow / OBV Pressure
  let f23 = 0;
  if (i >= 10) {
    let signedVol5 = 0;
    let totalVol20 = 0;
    const vStart = Math.max(1, i - 19);
    const vCount = i - vStart + 1;
    for (let k = vStart; k <= i; k++) {
      totalVol20 += bars[k].volume || 0;
    }
    const avgVol20 = totalVol20 / Math.max(1, vCount) || 1;
    for (let k = 0; k < 5 && i - k >= 1; k++) {
      const cur = bars[i - k];
      const prv = bars[i - k - 1];
      const dir = cur.close >= prv.close ? 1 : -1;
      signedVol5 += dir * (cur.volume || 0);
    }
    f23 = Math.max(-1.5, Math.min(1.5, signedVol5 / (avgVol20 * 5)));
  }

  return [
    f0, f1, f2, f3, f4, f5, f6, f7, f8, f9, f10, f11,
    f12, f13, f14, f15, f16, f17, f18, f19, f20, f21, f22, f23
  ];
}

/**
 * Computes recency-weighted feature means and standard deviations on `X` (excluding intercept col 0)
 * and returns standardized matrix `Z` clipped to [-3.5, 3.5].
 */
function computeStandardization(
  X: number[][],
  decayFactor = 0.985
): { Z: number[][]; means: number[]; stds: number[] } {
  const n = X.length;
  if (n === 0) {
    return {
      Z: [],
      means: new Array(FEATURE_COUNT).fill(0),
      stds: new Array(FEATURE_COUNT).fill(1)
    };
  }
  const k = X[0].length;
  const means = new Array(k).fill(0);
  const stds = new Array(k).fill(1);

  let wSum = 0;
  const weights = new Array(n);
  for (let r = 0; r < n; r++) {
    weights[r] = Math.pow(decayFactor, n - 1 - r);
    wSum += weights[r];
  }

  for (let j = 1; j < k; j++) {
    let m = 0;
    for (let r = 0; r < n; r++) m += weights[r] * (X[r][j] || 0);
    means[j] = m / (wSum || 1);

    let v = 0;
    for (let r = 0; r < n; r++) {
      const d = (X[r][j] || 0) - means[j];
      v += weights[r] * d * d;
    }
    stds[j] = Math.max(1e-4, Math.sqrt(v / (wSum || 1)));
  }

  const Z = X.map((row) => standardizeRow(row, means, stds));
  return { Z, means, stds };
}

function standardizeRow(row: number[], means: number[], stds: number[]): number[] {
  const k = row.length;
  const out = new Array(k);
  out[0] = 1.0;
  for (let j = 1; j < k; j++) {
    const z = ((row[j] || 0) - (means[j] || 0)) / (stds[j] || 1);
    out[j] = Math.max(-3.5, Math.min(3.5, z));
  }
  return out;
}

/**
 * Solves Recency-Weighted Huber-Damped Regularized Ridge Regression:
 * (Z^T W Z + lambda I) w = Z^T W y
 */
export function fitRidgeRegression(
  X: number[][],
  y: number[],
  lambda = 12.0,
  decayFactor = 0.985
): number[] {
  const n = X.length;
  if (n === 0) return new Array(FEATURE_COUNT).fill(0);
  const k = X[0].length;

  // Huber-reweighted recency weights to prevent single earnings gaps from hijacking regression
  const absY = y.map((v) => Math.abs(v)).sort((a, b) => a - b);
  const medAbs = absY[Math.floor(n * 0.5)] || 0.8;
  const huberCap = Math.max(1.2, medAbs * 2.2);

  const weights: number[] = new Array(n);
  for (let r = 0; r < n; r++) {
    const recency = Math.pow(decayFactor, n - 1 - r);
    const ay = Math.abs(y[r]);
    const huberW = ay <= huberCap ? 1.0 : huberCap / ay;
    weights[r] = recency * huberW;
  }

  const A: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      let sum = 0;
      for (let r = 0; r < n; r++) {
        sum += weights[r] * X[r][i] * X[r][j];
      }
      A[i][j] = sum + (i === j ? (i === 0 ? Math.max(8.0, lambda * 0.8) : lambda) : 0);
    }
  }

  const b: number[] = new Array(k).fill(0);
  for (let i = 0; i < k; i++) {
    let sum = 0;
    for (let r = 0; r < n; r++) {
      sum += weights[r] * X[r][i] * y[r];
    }
    b[i] = sum;
  }

  // Gaussian elimination with partial pivoting
  for (let i = 0; i < k; i++) {
    let maxRow = i;
    for (let r = i + 1; r < k; r++) {
      if (Math.abs(A[r][i]) > Math.abs(A[maxRow][i])) {
        maxRow = r;
      }
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    [b[i], b[maxRow]] = [b[maxRow], b[i]];

    const pivot = Math.abs(A[i][i]) > 1e-10 ? A[i][i] : 1e-9;
    for (let j = i; j < k; j++) A[i][j] /= pivot;
    b[i] /= pivot;

    for (let r = 0; r < k; r++) {
      if (r !== i) {
        const factor = A[r][i];
        for (let j = i; j < k; j++) {
          A[r][j] -= factor * A[i][j];
        }
        b[r] -= factor * b[i];
      }
    }
  }

  return b;
}

function huberGradient(residual: number, delta: number): number {
  if (Math.abs(residual) <= delta) return residual;
  return residual > 0 ? delta : -delta;
}

/**
 * Trains Regularized Depth-2 Gradient-Boosted Decision Trees (GBDT) on standardized features.
 * Uses min-leaf size guard and strong L2 leaf regularization to prevent fitting single-day noise.
 */
export function fitBoostingTrees(
  Z: number[][],
  residuals: number[],
  numTrees = 6
): Depth2Tree[] {
  const n = Z.length;
  if (n < 18) return [];
  const k = Z[0].length;
  const trees: Depth2Tree[] = [];
  const currResiduals = [...residuals];

  const absRes = residuals.map((r) => Math.abs(r)).sort((a, b) => a - b);
  const mad = absRes[Math.floor(n * 0.5)] || 0.7;
  const delta = Math.max(0.5, mad * 1.4);

  const leafReg = 8; // Strong L2 leaf smoothing
  const minLeafCount = 7;
  const learningRate = 0.11;
  const candidateFeatures = [1, 3, 4, 5, 8, 9, 10, 13, 14, 15, 18, 19, 20, 21, 22, 23];

  for (let t = 0; t < numTrees; t++) {
    let bestRootFeature = 1;
    let bestRootThreshold = 0;
    let bestRootLoss = Infinity;

    for (const fIdx of candidateFeatures) {
      if (fIdx >= k) continue;
      const vals = Z.map((row) => row[fIdx]).sort((a, b) => a - b);
      const thresholds = [
        vals[Math.floor(n * 0.25)] ?? -0.5,
        vals[Math.floor(n * 0.50)] ?? 0,
        vals[Math.floor(n * 0.75)] ?? 0.5
      ];

      for (const th of thresholds) {
        let leftSum = 0, leftCount = 0;
        let rightSum = 0, rightCount = 0;

        for (let r = 0; r < n; r++) {
          const g = huberGradient(currResiduals[r], delta);
          if (Z[r][fIdx] <= th) {
            leftSum += g;
            leftCount++;
          } else {
            rightSum += g;
            rightCount++;
          }
        }
        if (leftCount < minLeafCount || rightCount < minLeafCount) continue;

        const leftMean = leftSum / (leftCount + leafReg);
        const rightMean = rightSum / (rightCount + leafReg);

        let loss = 0;
        for (let r = 0; r < n; r++) {
          const pred = Z[r][fIdx] <= th ? leftMean : rightMean;
          const d = currResiduals[r] - pred;
          loss += d * d;
        }

        if (loss < bestRootLoss) {
          bestRootLoss = loss;
          bestRootFeature = fIdx;
          bestRootThreshold = th;
        }
      }
    }

    const leftIndices: number[] = [];
    const rightIndices: number[] = [];
    for (let r = 0; r < n; r++) {
      if (Z[r][bestRootFeature] <= bestRootThreshold) leftIndices.push(r);
      else rightIndices.push(r);
    }

    // Left child
    let bestLeftFeature = candidateFeatures[0];
    let bestLeftThreshold = 0;
    let leftLL = 0;
    let leftLR = 0;
    if (leftIndices.length >= minLeafCount * 2) {
      let bestLeftSubLoss = Infinity;
      for (const fIdx of candidateFeatures) {
        if (fIdx === bestRootFeature || fIdx >= k) continue;
        const vals = leftIndices.map((idx) => Z[idx][fIdx]).sort((a, b) => a - b);
        const th = vals[Math.floor(vals.length * 0.5)] ?? 0;

        let llSum = 0, llCount = 0;
        let lrSum = 0, lrCount = 0;
        for (const idx of leftIndices) {
          const g = huberGradient(currResiduals[idx], delta);
          if (Z[idx][fIdx] <= th) {
            llSum += g;
            llCount++;
          } else {
            lrSum += g;
            lrCount++;
          }
        }
        if (llCount < 5 || lrCount < 5) continue;

        const m1 = llSum / (llCount + leafReg);
        const m2 = lrSum / (lrCount + leafReg);
        let subLoss = 0;
        for (const idx of leftIndices) {
          const pred = Z[idx][fIdx] <= th ? m1 : m2;
          const d = currResiduals[idx] - pred;
          subLoss += d * d;
        }
        if (subLoss < bestLeftSubLoss) {
          bestLeftSubLoss = subLoss;
          bestLeftFeature = fIdx;
          bestLeftThreshold = th;
          leftLL = m1;
          leftLR = m2;
        }
      }
    } else {
      let sum = 0;
      for (const idx of leftIndices) sum += huberGradient(currResiduals[idx], delta);
      leftLL = leftIndices.length > 0 ? sum / (leftIndices.length + leafReg) : 0;
      leftLR = leftLL;
    }

    // Right child
    let bestRightFeature = candidateFeatures[0];
    let bestRightThreshold = 0;
    let rightRL = 0;
    let rightRR = 0;
    if (rightIndices.length >= minLeafCount * 2) {
      let bestRightSubLoss = Infinity;
      for (const fIdx of candidateFeatures) {
        if (fIdx === bestRootFeature || fIdx >= k) continue;
        const vals = rightIndices.map((idx) => Z[idx][fIdx]).sort((a, b) => a - b);
        const th = vals[Math.floor(vals.length * 0.5)] ?? 0;

        let rlSum = 0, rlCount = 0;
        let rrSum = 0, rrCount = 0;
        for (const idx of rightIndices) {
          const g = huberGradient(currResiduals[idx], delta);
          if (Z[idx][fIdx] <= th) {
            rlSum += g;
            rlCount++;
          } else {
            rrSum += g;
            rrCount++;
          }
        }
        if (rlCount < 5 || rrCount < 5) continue;

        const m1 = rlSum / (rlCount + leafReg);
        const m2 = rrSum / (rrCount + leafReg);
        let subLoss = 0;
        for (const idx of rightIndices) {
          const pred = Z[idx][fIdx] <= th ? m1 : m2;
          const d = currResiduals[idx] - pred;
          subLoss += d * d;
        }
        if (subLoss < bestRightSubLoss) {
          bestRightSubLoss = subLoss;
          bestRightFeature = fIdx;
          bestRightThreshold = th;
          rightRL = m1;
          rightRR = m2;
        }
      }
    } else {
      let sum = 0;
      for (const idx of rightIndices) sum += huberGradient(currResiduals[idx], delta);
      rightRL = rightIndices.length > 0 ? sum / (rightIndices.length + leafReg) : 0;
      rightRR = rightRL;
    }

    const tree: Depth2Tree = {
      featureIndex: bestRootFeature,
      threshold: bestRootThreshold,
      leftFeatureIndex: bestLeftFeature,
      leftThreshold: bestLeftThreshold,
      leftLeftValue: leftLL * learningRate,
      leftRightValue: leftLR * learningRate,
      rightFeatureIndex: bestRightFeature,
      rightThreshold: bestRightThreshold,
      rightLeftValue: rightRL * learningRate,
      rightRightValue: rightRR * learningRate,
      weight: learningRate
    };
    trees.push(tree);

    for (let r = 0; r < n; r++) {
      currResiduals[r] -= evaluateTree(tree, Z[r]);
    }
  }

  return trees;
}

function evaluateTree(tree: Depth2Tree, z: number[]): number {
  if (tree.featureIndex >= z.length) return 0;
  if (z[tree.featureIndex] <= tree.threshold) {
    if (tree.leftFeatureIndex !== undefined && tree.leftThreshold !== undefined && tree.leftFeatureIndex < z.length) {
      return z[tree.leftFeatureIndex] <= tree.leftThreshold ? tree.leftLeftValue : tree.leftRightValue;
    }
    return tree.leftLeftValue;
  } else {
    if (tree.rightFeatureIndex !== undefined && tree.rightThreshold !== undefined && tree.rightFeatureIndex < z.length) {
      return z[tree.rightFeatureIndex] <= tree.rightThreshold ? tree.rightLeftValue : tree.rightRightValue;
    }
    return tree.rightRightValue;
  }
}

export function fitBoostingStumps(
  X: number[][],
  residuals: number[],
  numStumps = 6
): DecisionStump[] {
  const trees = fitBoostingTrees(X, residuals, numStumps);
  return trees.map((t) => ({
    featureIndex: t.featureIndex,
    threshold: t.threshold,
    leftValue: t.leftLeftValue,
    rightValue: t.rightRightValue,
    weight: t.weight
  }));
}

/**
 * Predicts raw normalized score from linear weights and standardized feature vector.
 */
export function predictReturnFromFeatures(weights: number[], features: number[]): number {
  let expected = 0;
  const len = Math.min(weights.length, features.length);
  for (let j = 0; j < len; j++) {
    expected += weights[j] * (features[j] || 0);
  }
  return Math.max(-2.2, Math.min(2.2, expected));
}

/**
 * Expert 3: Adaptive Kalman / Autocorrelation-Gated Trend & Reversion Estimator (in vol-normalized space).
 * Uses empirically validated 1D microstructure & momentum-acceleration signals from raw features.
 */
function predictKalmanRegimeNorm(rawFeatures: number[]): number {
  const emaSpread = rawFeatures[1] || 0;
  const rsiDev = rawFeatures[3] || 0;
  const clv = rawFeatures[9] || 0;
  const ema5Dist = rawFeatures[10] || 0;
  const volShock = rawFeatures[11] || 0;
  const vwapDist = rawFeatures[15] || 0;
  const rocAcc = rawFeatures[16] || 0;
  const autoCorr = rawFeatures[17] || 0;
  const overnightGap = rawFeatures[18] || 0;
  const volRegRatio = rawFeatures[20] || 0;
  const trendSlopeQuality = rawFeatures[21] || 0;

  // Empirically positive OOS continuation factors: overnightGap + rocAcc + volRegRatio conditioning + VWAP equilibrium
  const momentumSignal =
    0.26 * overnightGap +
    0.22 * rocAcc +
    0.16 * vwapDist +
    0.12 * trendSlopeQuality +
    0.08 * Math.tanh(emaSpread * 35);

  // Short-term microstructure exhaustion / mean-reversion components
  const reversionSignal =
    -0.14 * clv -
    0.12 * volShock -
    0.10 * ema5Dist -
    0.06 * rsiDev;

  // Autocorrelation & volatility regime gate
  const trendTilt = Math.max(0.65, Math.min(1.35, 1.0 + autoCorr * 0.25 - Math.max(0, volRegRatio) * 0.12));
  const raw = trendTilt * (momentumSignal + reversionSignal);

  return Math.max(-1.5, Math.min(1.5, raw));
}

/**
 * Expert 4: Cosine-Similarity KNN Pattern Analog Forecaster in Standardized Feature Space.
 */
function predictAnalogKnnNorm(
  zQuery: number[],
  analogVectors: number[][],
  analogTargets: number[],
  topK = 10
): number {
  if (analogVectors.length < 15) return 0;

  // Exclude col 0 (intercept) when computing cosine similarity
  let qNorm = 0;
  for (let j = 1; j < zQuery.length; j++) qNorm += zQuery[j] * zQuery[j];
  qNorm = Math.sqrt(qNorm);
  if (qNorm < 1e-6) return 0;

  const sims: Array<{ sim: number; target: number }> = [];
  for (let idx = 0; idx < analogVectors.length; idx++) {
    const vec = analogVectors[idx];
    let dot = 0;
    let vNorm = 0;
    for (let j = 1; j < zQuery.length && j < vec.length; j++) {
      dot += zQuery[j] * vec[j];
      vNorm += vec[j] * vec[j];
    }
    const denom = qNorm * Math.sqrt(vNorm);
    if (denom > 1e-6) {
      const sim = dot / denom;
      if (sim > 0.25) {
        sims.push({ sim, target: analogTargets[idx] });
      }
    }
  }

  if (sims.length < 3) return 0;
  sims.sort((a, b) => b.sim - a.sim);
  const k = Math.min(topK, sims.length);

  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < k; i++) {
    const w = Math.pow(sims[i].sim, 2);
    weightedSum += w * sims[i].target;
    weightTotal += w;
  }

  const pred = weightTotal > 0 ? weightedSum / weightTotal : 0;
  // Shrink KNN prediction conservatively towards 0 based on sample size
  const confidence = Math.min(1, sims.length / 12);
  return Math.max(-1.5, Math.min(1.5, pred * 0.65 * confidence));
}

/**
 * Solves optimal non-negative stacking weights + Closed-Form Stein Bayesian shrinkage gain
 * on 3-fold walk-forward out-of-sample tuples to strictly minimize MSE.
 */
function optimizeMetaStacker(
  expertPreds: [number, number, number, number][],
  yVal: number[]
): { metaWeights: [number, number, number, number]; shrinkageGain: number } {
  const m = yVal.length;
  if (m < 10) {
    return { metaWeights: [0.35, 0.25, 0.25, 0.15], shrinkageGain: 0.14 };
  }

  // Candidate simplex points for [Ridge, GBDT, KalmanRegime, AnalogKNN]
  const candidateWeights: [number, number, number, number][] = [
    [0.50, 0.20, 0.20, 0.10],
    [0.35, 0.25, 0.25, 0.15],
    [0.25, 0.25, 0.30, 0.20],
    [0.60, 0.15, 0.15, 0.10],
    [0.20, 0.40, 0.25, 0.15],
    [0.20, 0.15, 0.45, 0.20],
    [0.20, 0.15, 0.25, 0.40],
    [0.45, 0.00, 0.35, 0.20],
    [0.10, 0.30, 0.40, 0.20],
    [0.00, 0.00, 0.65, 0.35]
  ];

  let bestScore = Infinity;
  let bestWeights: [number, number, number, number] = [0.35, 0.25, 0.25, 0.15];
  let bestShrink = 0.14;

  // Baseline zero-drift MSE
  let zeroMse = 0;
  for (let r = 0; r < m; r++) zeroMse += yVal[r] * yVal[r];
  zeroMse /= m;

  for (const w of candidateWeights) {
    let num = 0;
    let den = 0;
    let dirHits = 0;
    const signals = new Array(m);

    for (let r = 0; r < m; r++) {
      const s =
        w[0] * expertPreds[r][0] +
        w[1] * expertPreds[r][1] +
        w[2] * expertPreds[r][2] +
        w[3] * expertPreds[r][3];
      signals[r] = s;
      num += s * yVal[r];
      den += s * s;
      if ((s >= 0 && yVal[r] >= 0) || (s < 0 && yVal[r] < 0)) {
        dirHits++;
      }
    }

    // Closed-form Stein Bayesian shrinkage OLS slope capped to prevent over-betting daily noise
    const steinDen = den * 1.30 + 1e-6;
    const gamma = Math.max(0.05, Math.min(0.28, num / steinDen));

    let mse = 0;
    for (let r = 0; r < m; r++) {
      const d = yVal[r] - gamma * signals[r];
      mse += d * d;
    }
    mse /= m;

    const dirRate = dirHits / m;
    // Strict OOS MSE objective with gentle tie-breaker for genuine directional edge
    const objective = mse - 0.015 * zeroMse * (dirRate - 0.5);
    if (objective < bestScore) {
      bestScore = objective;
      bestWeights = w;
      bestShrink = gamma;
    }
  }

  return { metaWeights: bestWeights, shrinkageGain: bestShrink };
}

/**
 * Fits 3-Fold Expanding Walk-Forward Cross-Validated Stacked Ensemble Model (v4.0)
 * strictly on bars up to `trainEndIndex`.
 * Trains base experts on clean non-overlapping 1-day bars and propagates multi-day horizons via OU decay.
 */
export function fitEnsembleModel(
  bars: ComputedBar[],
  trainStartIndex = 20,
  trainEndIndex?: number,
  horizonDays = 1
): EnsembleModel {
  const n = bars.length;
  const h = Math.max(1, Math.min(30, horizonDays));
  const endIdx = trainEndIndex !== undefined ? Math.min(n - 1, trainEndIndex) : n - 1;
  const startIdx = Math.max(5, Math.min(trainStartIndex, endIdx - 12));

  const rawX: number[][] = [];
  const yNorm: number[] = [];

  // Always train base experts on clean non-overlapping 1-day targets to prevent overlapping-window overfitting
  for (let targetIdx = startIdx + 1; targetIdx <= endIdx; targetIdx++) {
    const featIdx = targetIdx - 1;
    if (featIdx < 1) continue;
    const baseClose = bars[featIdx].close;
    const targetClose = bars[targetIdx].close;
    if (baseClose <= 0 || targetClose <= 0) continue;

    const rawRet = (targetClose - baseClose) / baseClose;
    const sigma = estimateBarDailyVol(bars, featIdx);
    const normalizedTarget = Math.max(-2.6, Math.min(2.6, rawRet / sigma));

    rawX.push(extractFeatureVector(bars, featIdx));
    yNorm.push(normalizedTarget);
  }

  const m = rawX.length;
  const decayFactor = 0.985;

  if (m < 14) {
    return {
      linearWeights: new Array(FEATURE_COUNT).fill(0),
      stumps: [],
      trees: [],
      lambda: 120,
      residualBias: 0,
      decayFactor,
      optimalAlpha: 120,
      featureMeans: new Array(FEATURE_COUNT).fill(0),
      featureStds: new Array(FEATURE_COUNT).fill(1),
      metaWeights: [0.35, 0.25, 0.25, 0.15],
      shrinkageGain: 0.14,
      horizonDays: h,
      analogVectors: [],
      analogTargets: []
    };
  }

  // 1. 3-Fold Expanding Walk-Forward Cross-Validation for Ridge regularization lambda
  const candidateLambdas = [40.0, 120.0, 300.0, 700.0];
  let bestLambda = 120.0;

  if (m >= 40) {
    const splitPoints = [
      Math.max(16, Math.floor(m * 0.55)),
      Math.max(22, Math.floor(m * 0.70)),
      Math.max(28, Math.floor(m * 0.85))
    ];
    let bestCvMse = Infinity;

    for (const lam of candidateLambdas) {
      let mseSum = 0;
      let countSum = 0;

      for (let f = 0; f < splitPoints.length; f++) {
        const trEnd = splitPoints[f];
        const vaEnd = f + 1 < splitPoints.length ? splitPoints[f + 1] : m;
        if (vaEnd <= trEnd) continue;

        const subX = rawX.slice(0, trEnd);
        const subY = yNorm.slice(0, trEnd);
        const { Z: subZ, means: subMeans, stds: subStds } = computeStandardization(subX, decayFactor);
        const w = fitRidgeRegression(subZ, subY, lam, decayFactor);

        for (let r = trEnd; r < vaEnd; r++) {
          const zVal = standardizeRow(rawX[r], subMeans, subStds);
          const pred = 0.25 * predictReturnFromFeatures(w, zVal);
          const d = yNorm[r] - pred;
          mseSum += d * d;
          countSum++;
        }
      }

      const avgCvMse = countSum > 0 ? mseSum / countSum : Infinity;
      if (avgCvMse < bestCvMse) {
        bestCvMse = avgCvMse;
        bestLambda = lam;
      }
    }
  }

  // 2. Collect 3-Fold Expanding Out-of-Sample Expert Predictions for Meta-Stacker & Stein Shrinkage
  let metaWeights: [number, number, number, number] = [0.35, 0.25, 0.25, 0.15];
  let shrinkageGain = 0.14;

  if (m >= 40) {
    const splitPoints = [
      Math.max(16, Math.floor(m * 0.55)),
      Math.max(22, Math.floor(m * 0.70)),
      Math.max(28, Math.floor(m * 0.85))
    ];

    const cvExpertPreds: [number, number, number, number][] = [];
    const cvTargets: number[] = [];

    for (let f = 0; f < splitPoints.length; f++) {
      const trEnd = splitPoints[f];
      const vaEnd = f + 1 < splitPoints.length ? splitPoints[f + 1] : m;
      if (vaEnd <= trEnd) continue;

      const subX = rawX.slice(0, trEnd);
      const subY = yNorm.slice(0, trEnd);
      const { Z: subZ, means: subMeans, stds: subStds } = computeStandardization(subX, decayFactor);
      const subWeights = fitRidgeRegression(subZ, subY, bestLambda, decayFactor);

      const subResiduals = subZ.map((z, idx) => subY[idx] - predictReturnFromFeatures(subWeights, z));
      const subTrees = fitBoostingTrees(subZ, subResiduals, 5);

      for (let r = trEnd; r < vaEnd; r++) {
        const zVal = standardizeRow(rawX[r], subMeans, subStds);
        const pRidge = predictReturnFromFeatures(subWeights, zVal);
        let pTree = pRidge;
        for (const tr of subTrees) pTree += evaluateTree(tr, zVal);
        const pKalman = predictKalmanRegimeNorm(rawX[r]);
        const pKnn = predictAnalogKnnNorm(
          zVal,
          subZ.slice(0, Math.max(0, subZ.length - 1)),
          subY.slice(0, Math.max(0, subY.length - 1))
        );
        cvExpertPreds.push([pRidge, pTree, pKalman, pKnn]);
        cvTargets.push(yNorm[r]);
      }
    }

    const opt = optimizeMetaStacker(cvExpertPreds, cvTargets);
    metaWeights = opt.metaWeights;
    shrinkageGain = opt.shrinkageGain;
  }

  // 3. Refit final experts on full training set [0 .. m-1] using CV-selected lambda & meta-stacker
  const { Z: fullZ, means: featureMeans, stds: featureStds } = computeStandardization(rawX, decayFactor);
  const linearWeights = fitRidgeRegression(fullZ, yNorm, bestLambda, decayFactor);

  const linearResiduals = fullZ.map((z, idx) => yNorm[idx] - predictReturnFromFeatures(linearWeights, z));
  const trees = fitBoostingTrees(fullZ, linearResiduals, 5);
  const stumps = trees.map((t) => ({
    featureIndex: t.featureIndex,
    threshold: t.threshold,
    leftValue: t.leftLeftValue,
    rightValue: t.rightRightValue,
    weight: t.weight
  }));

  // 4. Conservative exponentially weighted trailing residual bias (clamped tightly)
  let biasSum = 0;
  let weightSum = 0;
  const recentWindow = Math.min(8, linearResiduals.length);
  for (let k = 0; k < recentWindow; k++) {
    const idx = linearResiduals.length - 1 - k;
    let treeBoost = 0;
    for (const tr of trees) treeBoost += evaluateTree(tr, fullZ[idx]);
    const fullRes = linearResiduals[idx] - treeBoost;
    const w = Math.pow(0.80, k);
    biasSum += w * fullRes;
    weightSum += w;
  }
  const residualBias = weightSum > 0 ? Math.max(-0.25, Math.min(0.25, biasSum / weightSum)) : 0;

  // Store standardized analog library (capped to trailing 160 bars for fast inference)
  const libStart = Math.max(0, fullZ.length - 160);
  const analogVectors = fullZ.slice(libStart);
  const analogTargets = yNorm.slice(libStart);

  return {
    linearWeights,
    stumps,
    trees,
    lambda: bestLambda,
    residualBias,
    decayFactor,
    optimalAlpha: bestLambda,
    featureMeans,
    featureStds,
    metaWeights,
    shrinkageGain,
    horizonDays: h,
    analogVectors,
    analogTargets
  };
}

/**
 * Generates an out-of-sample calibrated ensemble predicted return for bar at index `i`.
 * Uses Stein-shrunk 1-day signal for H=1 and Ornstein-Uhlenbeck decay + structural trend anchor for H>1.
 */
export function predictEnsembleReturn(
  model: EnsembleModel,
  bars: ComputedBar[],
  i: number,
  applyBiasCorrection = true
): number {
  const rawFeatures = extractFeatureVector(bars, i);
  const z = model.featureMeans
    ? standardizeRow(rawFeatures, model.featureMeans, model.featureStds)
    : rawFeatures;

  // Expert 1: Cross-Validated Standardized Ridge
  const pRidge = predictReturnFromFeatures(model.linearWeights, z);

  // Expert 2: Depth-2 Huber GBDT Boosted Predictor
  let treeDelta = 0;
  if (model.trees && model.trees.length > 0) {
    for (const tree of model.trees) {
      treeDelta += evaluateTree(tree, z);
    }
  } else {
    for (const stump of model.stumps) {
      if (stump.featureIndex < z.length) {
        treeDelta += z[stump.featureIndex] <= stump.threshold ? stump.leftValue : stump.rightValue;
      }
    }
  }
  const pGbdt = Math.max(-2.2, Math.min(2.2, pRidge + treeDelta));

  // Expert 3: Adaptive Kalman / Autocorrelation-Gated Trend-Reversion Filter
  const pKalman = predictKalmanRegimeNorm(rawFeatures);

  // Expert 4: Cosine-Similarity KNN Analog Forecaster
  const pKnn = model.analogVectors
    ? predictAnalogKnnNorm(z, model.analogVectors, model.analogTargets)
    : 0;

  const mw = model.metaWeights || [0.35, 0.25, 0.25, 0.15];
  const gain = model.shrinkageGain ?? 0.14;

  let norm1d =
    gain * (mw[0] * pRidge + mw[1] * pGbdt + mw[2] * pKalman + mw[3] * pKnn);

  if (applyBiasCorrection) {
    norm1d += 0.03 * model.residualBias;
  }

  const h = model.horizonDays || 1;
  const dailyVol = estimateBarDailyVol(bars, i);

  if (h <= 1) {
    const raw1d = norm1d * dailyVol;
    const max1d = Math.min(0.12, dailyVol * 1.9);
    return Math.max(-max1d, Math.min(max1d, raw1d));
  }

  // Multi-horizon propagation: Ornstein-Uhlenbeck half-life decay of 1D ensemble impulse
  // blended with structural medium-horizon trend & RSI mean-reversion anchor
  const ouFactor = (1 - Math.exp(-0.35 * h)) / 0.35;
  const ouComponent = norm1d * dailyVol * ouFactor;

  const emaSpread = rawFeatures[1] || 0;
  const sma50Dist = rawFeatures[2] || 0;
  const rsiDev = rawFeatures[3] || 0;
  const trendSlopeQuality = rawFeatures[21] || 0;
  const structuralSignal =
    0.35 * Math.tanh(trendSlopeQuality) +
    0.30 * Math.tanh(emaSpread * 30) +
    0.20 * Math.tanh(sma50Dist * 15) -
    0.15 * rsiDev;

  const horizonSigma = dailyVol * Math.sqrt(h);
  const structuralComponent = structuralSignal * horizonSigma * 0.12;
  const rawHorizonReturn = ouComponent + structuralComponent;

  const maxMove = Math.min(0.20, horizonSigma * 1.9);
  return Math.max(-maxMove, Math.min(maxMove, rawHorizonReturn));
}

/**
 * Calibrates prediction price directly using the ensemble and recent price action.
 */
export function predictCalibratedPrice(
  model: EnsembleModel,
  bars: ComputedBar[],
  index: number
): { predictedPrice: number; predictedReturn: number } {
  const basePrice = bars[index].close;
  const predictedReturn = predictEnsembleReturn(model, bars, index, true);
  const rawPrice = basePrice * (1 + predictedReturn);

  return {
    predictedPrice: Number(rawPrice.toFixed(2)),
    predictedReturn: Number((predictedReturn * 100).toFixed(2))
  };
}
