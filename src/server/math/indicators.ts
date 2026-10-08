/**
 * Financial Technical Indicators Engine
 * Implements SMA, EMA, RSI, MACD, Bollinger Bands, ATR, ROC, and Momentum
 * with time-series integrity (no future data leakage).
 */

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ComputedBar extends PriceBar {
  sma20?: number;
  sma50?: number;
  ema12?: number;
  ema26?: number;
  rsi14?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  bbUpper?: number;
  bbLower?: number;
  bbMiddle?: number;
  atr14?: number;
  momentum?: number;
  roc?: number;
  returns?: number;
  volatility20?: number;
}

/**
 * Calculates Simple Moving Average
 */
export function calculateSMA(data: number[], period: number): (number | undefined)[] {
  const result: (number | undefined)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(undefined);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      result.push(sum / period);
    }
  }
  return result;
}

/**
 * Calculates Exponential Moving Average
 */
export function calculateEMA(data: number[], period: number): (number | undefined)[] {
  const result: (number | undefined)[] = [];
  const k = 2 / (period + 1);
  let prevEma: number | undefined = undefined;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(undefined);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[j];
      }
      prevEma = sum / period;
      result.push(prevEma);
    } else if (prevEma !== undefined) {
      prevEma = data[i] * k + prevEma * (1 - k);
      result.push(prevEma);
    }
  }
  return result;
}

/**
 * Calculates Wilder's Relative Strength Index (RSI 14)
 */
export function calculateRSI(closes: number[], period = 14): (number | undefined)[] {
  const result: (number | undefined)[] = [];
  if (closes.length <= period) {
    return closes.map(() => undefined);
  }

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    const change = changes[i];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;

  // First values before period
  for (let i = 0; i < period; i++) {
    result.push(undefined);
  }

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + rs));

  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    result.push(Number(rsi.toFixed(2)));
  }

  return result;
}

/**
 * Calculates MACD (12, 26, 9)
 */
export function calculateMACD(closes: number[]): {
  macd: (number | undefined)[];
  signal: (number | undefined)[];
  hist: (number | undefined)[];
} {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);

  const macdLine: (number | undefined)[] = [];
  for (let i = 0; i < closes.length; i++) {
    const e12 = ema12[i];
    const e26 = ema26[i];
    if (e12 !== undefined && e26 !== undefined) {
      macdLine.push(e12 - e26);
    } else {
      macdLine.push(undefined);
    }
  }

  // Filter defined values for signal line
  const validMacd: number[] = [];
  const validIndices: number[] = [];
  macdLine.forEach((val, idx) => {
    if (val !== undefined) {
      validMacd.push(val);
      validIndices.push(idx);
    }
  });

  const signalLineValid = calculateEMA(validMacd, 9);

  const signalLine: (number | undefined)[] = new Array(closes.length).fill(undefined);
  const histogram: (number | undefined)[] = new Array(closes.length).fill(undefined);

  validIndices.forEach((origIdx, validIdx) => {
    const sig = signalLineValid[validIdx];
    signalLine[origIdx] = sig;
    const macdVal = macdLine[origIdx];
    if (macdVal !== undefined && sig !== undefined) {
      histogram[origIdx] = macdVal - sig;
    }
  });

  return { macd: macdLine, signal: signalLine, hist: histogram };
}

/**
 * Calculates Bollinger Bands (20 period, 2 standard deviations)
 */
export function calculateBollingerBands(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2
): {
  upper: (number | undefined)[];
  middle: (number | undefined)[];
  lower: (number | undefined)[];
} {
  const sma = calculateSMA(closes, period);
  const upper: (number | undefined)[] = [];
  const middle: (number | undefined)[] = [];
  const lower: (number | undefined)[] = [];

  for (let i = 0; i < closes.length; i++) {
    const mean = sma[i];
    if (mean === undefined) {
      upper.push(undefined);
      middle.push(undefined);
      lower.push(undefined);
    } else {
      let sumSqDiff = 0;
      for (let j = 0; j < period; j++) {
        const diff = closes[i - j] - mean;
        sumSqDiff += diff * diff;
      }
      const stdDev = Math.sqrt(sumSqDiff / period);
      middle.push(Number(mean.toFixed(2)));
      upper.push(Number((mean + stdDevMultiplier * stdDev).toFixed(2)));
      lower.push(Number((mean - stdDevMultiplier * stdDev).toFixed(2)));
    }
  }

  return { upper, middle, lower };
}

/**
 * Calculates Average True Range (ATR 14)
 */
export function calculateATR(bars: PriceBar[], period = 14): (number | undefined)[] {
  const result: (number | undefined)[] = [];
  if (bars.length < period) return bars.map(() => undefined);

  const trs: number[] = [bars[0].high - bars[0].low];
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevClose = bars[i - 1].close;
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trs.push(tr);
  }

  let atr = 0;
  for (let i = 0; i < period; i++) {
    atr += trs[i];
    result.push(undefined);
  }
  atr /= period;
  result[period - 1] = Number(atr.toFixed(2));

  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    result.push(Number(atr.toFixed(2)));
  }

  return result;
}

/**
 * Enriches historical raw OHLCV bars with full technical indicator suite
 */
export function computeAllIndicators(bars: PriceBar[]): ComputedBar[] {
  const closes = bars.map(b => b.close);
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const rsi14 = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const bb = calculateBollingerBands(closes, 20, 2);
  const atr = calculateATR(bars, 14);

  return bars.map((bar, i) => {
    const prevClose = i > 0 ? bars[i - 1].close : bar.close;
    const ret = prevClose > 0 ? (bar.close - prevClose) / prevClose : 0;
    
    // Rolling 20-day annualized volatility
    let vol20 = 0.15;
    if (i >= 20) {
      let sumSq = 0;
      for (let k = 0; k < 20; k++) {
        const c1 = bars[i - k].close;
        const c0 = bars[i - k - 1].close;
        const r = (c1 - c0) / c0;
        sumSq += r * r;
      }
      vol20 = Math.sqrt((sumSq / 20) * 252);
    }

    const momentum = i >= 10 ? bar.close - bars[i - 10].close : 0;
    const roc = i >= 10 && bars[i - 10].close > 0 ? ((bar.close - bars[i - 10].close) / bars[i - 10].close) * 100 : 0;

    return {
      ...bar,
      sma20: sma20[i] !== undefined ? Number(sma20[i]?.toFixed(2)) : undefined,
      sma50: sma50[i] !== undefined ? Number(sma50[i]?.toFixed(2)) : undefined,
      ema12: ema12[i] !== undefined ? Number(ema12[i]?.toFixed(2)) : undefined,
      ema26: ema26[i] !== undefined ? Number(ema26[i]?.toFixed(2)) : undefined,
      rsi14: rsi14[i] !== undefined ? Number(rsi14[i]?.toFixed(2)) : undefined,
      macd: macd.macd[i] !== undefined ? Number(macd.macd[i]?.toFixed(3)) : undefined,
      macdSignal: macd.signal[i] !== undefined ? Number(macd.signal[i]?.toFixed(3)) : undefined,
      macdHist: macd.hist[i] !== undefined ? Number(macd.hist[i]?.toFixed(3)) : undefined,
      bbUpper: bb.upper[i],
      bbMiddle: bb.middle[i],
      bbLower: bb.lower[i],
      atr14: atr[i],
      momentum: Number(momentum.toFixed(2)),
      roc: Number(roc.toFixed(2)),
      returns: Number(ret.toFixed(4)),
      volatility20: Number(vol20.toFixed(4))
    };
  });
}
