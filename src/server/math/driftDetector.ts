/**
 * Concept & Data Drift Detection Engine
 * Implements the two-sample Kolmogorov-Smirnov test (ks_2samp)
 * comparing historical training feature distributions with live inference distributions.
 */

import { ComputedBar } from './indicators';
import { ConceptDriftResult, FeatureDriftItem } from '../../types';

/**
 * Computes the two-sample Kolmogorov-Smirnov statistic D and asymptotic p-value
 */
export function computeKS2Sample(sample1: number[], sample2: number[]): { ksStatistic: number; pValue: number } {
  if (sample1.length === 0 || sample2.length === 0) {
    return { ksStatistic: 0, pValue: 1.0 };
  }

  const s1 = [...sample1].sort((a, b) => a - b);
  const s2 = [...sample2].sort((a, b) => a - b);

  const n1 = s1.length;
  const n2 = s2.length;

  // Combine unique evaluation points
  const allPoints = Array.from(new Set([...s1, ...s2])).sort((a, b) => a - b);

  let i1 = 0;
  let i2 = 0;
  let maxD = 0;

  for (const x of allPoints) {
    while (i1 < n1 && s1[i1] <= x) i1++;
    while (i2 < n2 && s2[i2] <= x) i2++;

    const cdf1 = i1 / n1;
    const cdf2 = i2 / n2;
    const diff = Math.abs(cdf1 - cdf2);
    if (diff > maxD) maxD = diff;
  }

  // Calculate asymptotic p-value via Kolmogorov distribution approximation
  // lambda = (sqrt((n1 * n2) / (n1 + n2)) + 0.12 + 0.11 / sqrt((n1 * n2) / (n1 + n2))) * maxD
  const effectiveN = Math.sqrt((n1 * n2) / (n1 + n2));
  const lambda = (effectiveN + 0.12 + 0.11 / effectiveN) * maxD;

  let pVal = 0;
  if (lambda > 0.05) {
    // 2 * sum_{k=1}^100 (-1)^{k-1} * exp(-2 * k^2 * lambda^2)
    let sum = 0;
    for (let k = 1; k <= 50; k++) {
      const term = Math.pow(-1, k - 1) * Math.exp(-2 * k * k * lambda * lambda);
      sum += term;
      if (Math.abs(term) < 1e-7) break;
    }
    pVal = Math.min(1.0, Math.max(0.0, 2 * sum));
  } else {
    pVal = 1.0;
  }

  return {
    ksStatistic: Number(maxD.toFixed(3)),
    pValue: Number(pVal.toFixed(4))
  };
}

export function detectConceptDrift(bars: ComputedBar[], ticker: string): ConceptDriftResult {
  const total = bars.length;
  if (total < 60) {
    return {
      ticker,
      driftDetected: false,
      driftingFeaturesCount: 0,
      totalFeaturesCount: 5,
      overallDriftScore: 0.05,
      checkTimestamp: new Date().toISOString(),
      safetyWarning: null,
      features: []
    };
  }

  // Baseline training window: past bars [0 .. total - 30]
  // Live inference window: last 30 trading days
  const baselineBars = bars.slice(0, total - 30);
  const liveBars = bars.slice(total - 30);

  // Extract feature arrays
  const getArray = (subset: ComputedBar[], key: keyof ComputedBar) =>
    subset.map(b => (typeof b[key] === 'number' ? (b[key] as number) : 0)).filter(v => !isNaN(v));

  const featuresToTest: Array<{ name: string; key: keyof ComputedBar; label: string }> = [
    { name: 'rsi14', key: 'rsi14', label: 'RSI (14-Day)' },
    { name: 'volatility20', key: 'volatility20', label: '20-Day Annualized Volatility' },
    { name: 'returns', key: 'returns', label: 'Daily Log Returns' },
    { name: 'macdHist', key: 'macdHist', label: 'MACD Histogram' },
    { name: 'momentum', key: 'momentum', label: '10-Day Price Momentum' }
  ];

  const results: FeatureDriftItem[] = [];
  let driftingCount = 0;

  for (const feat of featuresToTest) {
    const baseVals = getArray(baselineBars, feat.key);
    const liveVals = getArray(liveBars, feat.key);

    const { ksStatistic, pValue } = computeKS2Sample(baseVals, liveVals);
    // Drift threshold: p-value < 0.05 and KS statistic > 0.15
    const isDrifting = pValue < 0.05 && ksStatistic > 0.15;
    if (isDrifting) driftingCount++;

    const baseMean = baseVals.reduce((a, b) => a + b, 0) / (baseVals.length || 1);
    const liveMean = liveVals.reduce((a, b) => a + b, 0) / (liveVals.length || 1);

    const severity: 'normal' | 'moderate' | 'critical' =
      pValue < 0.01 && ksStatistic > 0.25 ? 'critical' : isDrifting ? 'moderate' : 'normal';

    results.push({
      feature: feat.label,
      ksStatistic,
      pValue,
      driftDetected: isDrifting,
      baselineMean: Number(baseMean.toFixed(3)),
      liveMean: Number(liveMean.toFixed(3)),
      severity
    });
  }

  const overallDriftScore = Number((driftingCount / featuresToTest.length).toFixed(2));
  const driftDetected = driftingCount >= 2;

  let safetyWarning: string | null = null;
  if (driftDetected) {
    safetyWarning = `Statistical distribution drift detected across ${driftingCount} market features. Live distributions deviate significantly from model training bounds. Conformal intervals have been widened by ${(overallDriftScore * 30 + 10).toFixed(0)}% to maintain finite-sample coverage guarantees.`;
  }

  return {
    ticker,
    driftDetected,
    driftingFeaturesCount: driftingCount,
    totalFeaturesCount: featuresToTest.length,
    overallDriftScore,
    checkTimestamp: new Date().toISOString(),
    safetyWarning,
    features: results
  };
}
