/**
 * AlphaQuant AI - Machine Learning Prediction Engine
 * Implements regularized Ridge Regression and multi-factor signal fusion
 * trained directly on historical OHLCV data without any hardcoded offsets.
 */

import { ComputedBar } from './indicators';

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

/**
 * Extracts normalized mathematical feature vector for bar at index i
 */
export function extractFeatureVector(bars: ComputedBar[], i: number): number[] {
  const b = bars[i];
  const p = b.close;
  const prevP = i > 0 ? bars[i - 1].close : p;

  const ema12 = b.ema12 ?? p;
  const ema26 = b.ema26 ?? p;
  const sma50 = b.sma50 ?? p;
  const rsi = b.rsi14 ?? 50;
  const bbUpper = b.bbUpper ?? (p * 1.04);
  const bbLower = b.bbLower ?? (p * 0.96);
  const atr = b.atr14 ?? (p * 0.018);
  const macdHist = b.macdHist ?? 0;

  // 1. Intercept
  const f0 = 1.0;
  // 2. Trend: EMA 12 vs 26 spread normalized by price
  const f1 = (ema12 - ema26) / (p || 1);
  // 3. Macro trend: Price vs SMA 50
  const f2 = (p - sma50) / (p || 1);
  // 4. Mean-reversion: RSI deviation from center 50
  const f3 = (rsi - 50) / 50;
  // 5. Bollinger %B: Position within volatility bands
  const bbRange = Math.max(0.001, bbUpper - bbLower);
  const f4 = (p - bbLower) / bbRange - 0.5;
  // 6. MACD momentum impulse normalized by ATR
  const f5 = macdHist / (atr || 1);
  // 7. Recent price return
  const f6 = prevP > 0 ? (p - prevP) / prevP : 0;
  // 8. Volatility ratio
  const f7 = atr / (p || 1);

  return [f0, f1, f2, f3, f4, f5, f6, f7];
}

/**
 * Solves regularized least-squares (Ridge regression): (X^T X + lambda I) w = X^T y
 * using Gaussian elimination with partial pivoting for numerical stability.
 */
export function fitRidgeRegression(X: number[][], y: number[], lambda = 0.05): number[] {
  const n = X.length;
  if (n === 0) return [0, 0, 0, 0, 0, 0, 0, 0];
  const k = X[0].length;

  // Compute XtX
  const A: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      let sum = 0;
      for (let r = 0; r < n; r++) {
        sum += X[r][i] * X[r][j];
      }
      A[i][j] = sum + (i === j ? lambda : 0);
    }
  }

  // Compute Xty
  const b: number[] = new Array(k).fill(0);
  for (let i = 0; i < k; i++) {
    let sum = 0;
    for (let r = 0; r < n; r++) {
      sum += X[r][i] * y[r];
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

    const pivot = A[i][i] !== 0 ? A[i][i] : 1e-9;
    for (let j = i; j < k; j++) {
      A[i][j] /= pivot;
    }
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

/**
 * Predicts expected return using fitted weights and feature vector
 */
export function predictReturnFromFeatures(weights: number[], features: number[]): number {
  let expectedReturn = 0;
  for (let j = 0; j < weights.length; j++) {
    expectedReturn += weights[j] * (features[j] || 0);
  }
  // Safe bounds: cap 1-day predicted return between -8% and +8%
  return Math.max(-0.08, Math.min(0.08, expectedReturn));
}
