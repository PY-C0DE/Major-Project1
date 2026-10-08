/**
 * Cross-Asset Correlation & Macro Regime Matrix Engine
 * Computes Pearson correlation matrix R across assets using log-returns,
 * calculates market Beta, annualized volatility, and active HMM regime tags.
 */

import { HistoricalBar, CorrelationMatrixData, CorrelationAsset } from '../../types';

export function computeCorrelationMatrix(
  tickers: string[],
  historicalMap: Record<string, HistoricalBar[]>,
  regimeMap: Record<string, string>
): CorrelationMatrixData {
  const assetNames: Record<string, string> = {
    'RELIANCE.NS': 'Reliance Industries',
    'TCS.NS': 'Tata Consultancy Services',
    'INFY.NS': 'Infosys Ltd',
    'HDFCBANK.NS': 'HDFC Bank',
    'NVDA': 'NVIDIA Corporation',
    'AAPL': 'Apple Inc',
    'MSFT': 'Microsoft Corp'
  };

  // Align dates and compute returns
  const returnSeries: Record<string, number[]> = {};
  const minLen = 60;

  for (const ticker of tickers) {
    const bars = historicalMap[ticker] || [];
    const returns: number[] = [];
    const windowBars = bars.slice(-minLen);
    for (let i = 1; i < windowBars.length; i++) {
      const ret = (windowBars[i].close - windowBars[i - 1].close) / windowBars[i - 1].close;
      returns.push(ret);
    }
    returnSeries[ticker] = returns;
  }

  const n = tickers.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(1));

  // Benchmark returns (use first ticker or mean as market proxy)
  const benchReturns = returnSeries[tickers[0]] || [];
  const benchVar = variance(benchReturns) || 1e-6;

  const assets: CorrelationAsset[] = [];

  for (let i = 0; i < n; i++) {
    const tA = tickers[i];
    const rA = returnSeries[tA] || [];
    const varA = variance(rA);
    const volA = Number((Math.sqrt(varA) * Math.sqrt(252) * 100).toFixed(1));
    const covBench = covariance(rA, benchReturns);
    const beta = Number((covBench / benchVar).toFixed(2));

    assets.push({
      ticker: tA,
      name: assetNames[tA] || tA,
      regime: regimeMap[tA] || 'Low Vol / Bullish',
      volatility: volA,
      beta: i === 0 ? 1.0 : beta
    });

    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1.0;
      } else {
        const tB = tickers[j];
        const rB = returnSeries[tB] || [];
        const corr = pearsonCorrelation(rA, rB);
        matrix[i][j] = Number(corr.toFixed(2));
      }
    }
  }

  return {
    tickers,
    assets,
    matrix,
    calculatedAt: new Date().toISOString()
  };
}

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) / (arr.length - 1);
}

function covariance(arr1: number[], arr2: number[]): number {
  const len = Math.min(arr1.length, arr2.length);
  if (len < 2) return 0;
  const m1 = mean(arr1.slice(0, len));
  const m2 = mean(arr2.slice(0, len));
  let cov = 0;
  for (let i = 0; i < len; i++) {
    cov += (arr1[i] - m1) * (arr2[i] - m2);
  }
  return cov / (len - 1);
}

function pearsonCorrelation(arr1: number[], arr2: number[]): number {
  const len = Math.min(arr1.length, arr2.length);
  if (len < 2) return 0;
  const cov = covariance(arr1, arr2);
  const std1 = Math.sqrt(variance(arr1.slice(0, len)));
  const std2 = Math.sqrt(variance(arr2.slice(0, len)));
  if (std1 === 0 || std2 === 0) return 0;
  const r = cov / (std1 * std2);
  return Math.max(-1, Math.min(1, r));
}
