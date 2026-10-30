/**
 * Real-Time Black-Scholes Options Chains & Greeks Analytics Engine
 * Calculates:
 * - Option pricing (Call & Put)
 * - Greeks: Delta (Δ), Gamma (Γ), Theta (Θ), Vega (ν), Rho (ρ)
 * - Implied Volatility (IV) smile across strike ladder
 * - Expected price moves (1-day, 7-day, 30-day)
 * - Put/Call Ratio (Volume & Open Interest)
 */

export interface OptionContract {
  strike: number;
  type: 'CALL' | 'PUT';
  bid: number;
  ask: number;
  lastPrice: number;
  iv: number; // in %
  delta: number;
  gamma: number;
  theta: number; // per day
  vega: number; // per 1% vol
  rho: number;
  volume: number;
  openInterest: number;
  inTheMoney: boolean;
}

export interface OptionsChainResponse {
  ticker: string;
  spotPrice: number;
  atmIV: number;
  expiryDate: string;
  daysToExpiry: number;
  riskFreeRate: number;
  putCallRatioVolume: number;
  putCallRatioOI: number;
  expectedMove1Day: number;
  expectedMove7Day: number;
  expectedMove30Day: number;
  ivSmile: Array<{ strike: number; callIV: number; putIV: number; isATM: boolean }>;
  strikes: Array<{
    strike: number;
    call: OptionContract;
    put: OptionContract;
  }>;
}

// Standard normal cumulative distribution function (Abramowitz & Stegun approximation)
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2.0);
  const t = 1.0 / (1.0 + p * absX);
  const erf = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * erf);
}

// Standard normal probability density function
function normalPDF(x: number): number {
  return (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Calculates Black-Scholes price and Greeks for a single strike
 */
export function calculateBlackScholes(
  S: number, // Spot price
  K: number, // Strike price
  T: number, // Time to expiration in years (e.g. 30/365)
  r: number, // Risk-free rate (e.g. 0.05)
  sigma: number, // Volatility (e.g. 0.25)
  type: 'CALL' | 'PUT'
) {
  const safeT = Math.max(T, 0.001);
  const safeSigma = Math.max(sigma, 0.01);

  const d1 = (Math.log(S / K) + (r + 0.5 * safeSigma * safeSigma) * safeT) / (safeSigma * Math.sqrt(safeT));
  const d2 = d1 - safeSigma * Math.sqrt(safeT);

  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  const n_d1 = normalPDF(d1);

  let price = 0;
  let delta = 0;
  let theta = 0;
  let rho = 0;

  // Gamma and Vega are identical for Call and Put
  const gamma = n_d1 / (S * safeSigma * Math.sqrt(safeT));
  const vega = (S * Math.sqrt(safeT) * n_d1) / 100; // sensitivity per 1% IV change

  if (type === 'CALL') {
    price = S * Nd1 - K * Math.exp(-r * safeT) * Nd2;
    delta = Nd1;
    theta = (-(S * safeSigma * n_d1) / (2 * Math.sqrt(safeT)) - r * K * Math.exp(-r * safeT) * Nd2) / 365;
    rho = (K * safeT * Math.exp(-r * safeT) * Nd2) / 100;
  } else {
    const N_minus_d1 = normalCDF(-d1);
    const N_minus_d2 = normalCDF(-d2);
    price = K * Math.exp(-r * safeT) * N_minus_d2 - S * N_minus_d1;
    delta = Nd1 - 1;
    theta = (-(S * safeSigma * n_d1) / (2 * Math.sqrt(safeT)) + r * K * Math.exp(-r * safeT) * N_minus_d2) / 365;
    rho = (-K * safeT * Math.exp(-r * safeT) * N_minus_d2) / 100;
  }

  return {
    price: Math.max(0.01, Number(price.toFixed(2))),
    delta: Number(delta.toFixed(3)),
    gamma: Number(gamma.toFixed(4)),
    theta: Number(theta.toFixed(3)),
    vega: Number(vega.toFixed(3)),
    rho: Number(rho.toFixed(3))
  };
}

/**
 * Builds a full Options Chain matrix with Greeks, IV smile, and Expected Moves
 */
export function generateOptionsChain(
  ticker: string,
  spotPrice: number,
  baseHistoricalVol = 0.24,
  daysToExpiry = 30
): OptionsChainResponse {
  const r = 0.0525; // Benchmark risk-free interest rate
  const T = daysToExpiry / 365;
  const atmIV = Math.max(0.12, Math.min(0.85, baseHistoricalVol * 1.15));

  // Determine strike step size depending on stock price magnitude
  let step = 10;
  if (spotPrice > 5000) step = 100;
  else if (spotPrice > 2000) step = 50;
  else if (spotPrice > 500) step = 20;
  else if (spotPrice > 100) step = 5;
  else if (spotPrice > 20) step = 2.5;
  else step = 1;

  const atmStrike = Math.round(spotPrice / step) * step;

  // Generate 11 strikes: 5 OTM, 1 ATM, 5 ITM
  const strikeCount = 11;
  const halfCount = Math.floor(strikeCount / 2);
  const strikes: Array<{ strike: number; call: OptionContract; put: OptionContract }> = [];
  const ivSmile: Array<{ strike: number; callIV: number; putIV: number; isATM: boolean }> = [];

  let totalCallVol = 0;
  let totalPutVol = 0;
  let totalCallOI = 0;
  let totalPutOI = 0;

  for (let i = -halfCount; i <= halfCount; i++) {
    const strike = atmStrike + i * step;
    const moneyness = strike / spotPrice; // <1: put OTM, >1: call OTM

    // Volatility skew / smile: OTM Puts trade at higher IV (downside protection skew)
    const callSkew = Math.max(0.10, atmIV + 0.18 * Math.pow(moneyness - 1, 2) + (moneyness < 1 ? 0.04 * (1 - moneyness) : -0.01 * (moneyness - 1)));
    const putSkew = Math.max(0.10, atmIV + 0.22 * Math.pow(moneyness - 1, 2) + (moneyness < 1 ? 0.08 * (1 - moneyness) : 0));

    const callBS = calculateBlackScholes(spotPrice, strike, T, r, callSkew, 'CALL');
    const putBS = calculateBlackScholes(spotPrice, strike, T, r, putSkew, 'PUT');

    const spreadFactor = 0.015;
    const callBid = Math.max(0.01, Number((callBS.price * (1 - spreadFactor)).toFixed(2)));
    const callAsk = Number((callBS.price * (1 + spreadFactor)).toFixed(2));
    const putBid = Math.max(0.01, Number((putBS.price * (1 - spreadFactor)).toFixed(2)));
    const putAsk = Number((putBS.price * (1 + spreadFactor)).toFixed(2));

    // Simulated volume & OI decaying away from ATM
    const proximity = Math.exp(-Math.abs(strike - spotPrice) / (spotPrice * 0.08));
    const callVol = Math.floor((1200 + 4800 * proximity) * (1 + 0.3 * Math.sin(strike)));
    const putVol = Math.floor((1100 + 4400 * proximity) * (1 + 0.3 * Math.cos(strike)));
    const callOI = Math.floor(callVol * 4.5);
    const putOI = Math.floor(putVol * 4.2);

    totalCallVol += callVol;
    totalPutVol += putVol;
    totalCallOI += callOI;
    totalPutOI += putOI;

    const isATM = strike === atmStrike;

    ivSmile.push({
      strike,
      callIV: Number((callSkew * 100).toFixed(1)),
      putIV: Number((putSkew * 100).toFixed(1)),
      isATM
    });

    strikes.push({
      strike,
      call: {
        strike,
        type: 'CALL',
        bid: callBid,
        ask: callAsk,
        lastPrice: callBS.price,
        iv: Number((callSkew * 100).toFixed(1)),
        delta: callBS.delta,
        gamma: callBS.gamma,
        theta: callBS.theta,
        vega: callBS.vega,
        rho: callBS.rho,
        volume: callVol,
        openInterest: callOI,
        inTheMoney: spotPrice > strike
      },
      put: {
        strike,
        type: 'PUT',
        bid: putBid,
        ask: putAsk,
        lastPrice: putBS.price,
        iv: Number((putSkew * 100).toFixed(1)),
        delta: putBS.delta,
        gamma: putBS.gamma,
        theta: putBS.theta,
        vega: putBS.vega,
        rho: putBS.rho,
        volume: putVol,
        openInterest: putOI,
        inTheMoney: spotPrice < strike
      }
    });
  }

  // Calculate Expected Moves
  // ±Move = Spot * ATM_IV * sqrt(days / 365)
  const expMove1 = Number((spotPrice * atmIV * Math.sqrt(1 / 365)).toFixed(2));
  const expMove7 = Number((spotPrice * atmIV * Math.sqrt(7 / 365)).toFixed(2));
  const expMove30 = Number((spotPrice * atmIV * Math.sqrt(30 / 365)).toFixed(2));

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + daysToExpiry);

  return {
    ticker,
    spotPrice,
    atmIV: Number((atmIV * 100).toFixed(1)),
    expiryDate: expiry.toISOString().split('T')[0],
    daysToExpiry,
    riskFreeRate: Number((r * 100).toFixed(2)),
    putCallRatioVolume: Number((totalPutVol / (totalCallVol || 1)).toFixed(2)),
    putCallRatioOI: Number((totalPutOI / (totalCallOI || 1)).toFixed(2)),
    expectedMove1Day: expMove1,
    expectedMove7Day: expMove7,
    expectedMove30Day: expMove30,
    ivSmile,
    strikes
  };
}

/**
 * Builds a 3D Implied Volatility Surface across multiple strike prices and expirations
 * (Strikes x Tenors) with full Black-Scholes Greeks, skew telemetry, and term structure.
 */
export function generateVolatilitySurface(
  ticker: string,
  spotPrice: number,
  baseHistoricalVol = 0.24
) {
  const r = 0.0525;
  const baseAtmIV = Math.max(0.12, Math.min(0.85, baseHistoricalVol * 1.15));

  // Determine strike step size depending on stock price magnitude
  let step = 10;
  if (spotPrice > 5000) step = 100;
  else if (spotPrice > 2000) step = 50;
  else if (spotPrice > 500) step = 20;
  else if (spotPrice > 100) step = 5;
  else if (spotPrice > 20) step = 2.5;
  else step = 1;

  const atmStrike = Math.round(spotPrice / step) * step;

  // 13 strike steps around spot: 6 OTM puts, 1 ATM, 6 OTM calls
  const strikeCount = 13;
  const halfCount = Math.floor(strikeCount / 2);
  const strikes: number[] = [];
  for (let i = -halfCount; i <= halfCount; i++) {
    strikes.push(atmStrike + i * step);
  }

  // Multi-tenor term structure cycles
  const tenors = [
    { days: 7, label: '7D Weekly' },
    { days: 14, label: '14D Bi-Weekly' },
    { days: 30, label: '30D 1-Month' },
    { days: 60, label: '60D 2-Month' },
    { days: 90, label: '90D Quarterly' },
    { days: 180, label: '180D Semi-Annual' }
  ];

  const expirationsMeta: Array<{
    days: number;
    label: string;
    date: string;
    atmIV: number;
    expMove: number;
  }> = [];

  const points: Array<{
    strike: number;
    moneyness: number;
    daysToExpiry: number;
    expiryLabel: string;
    expiryDate: string;
    callIV: number;
    putIV: number;
    midIV: number;
    deltaCall: number;
    deltaPut: number;
    gamma: number;
    vega: number;
    theta: number;
    callPrice: number;
    putPrice: number;
    isATM: boolean;
  }> = [];

  let overallMinIV = 999;
  let overallMaxIV = 0;

  tenors.forEach(tenor => {
    const T = tenor.days / 365;
    // Term structure slight contango / mean-reversion
    const tenorAtmIV = Math.max(0.12, baseAtmIV * (1 + 0.04 * Math.log(tenor.days / 30)));
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + tenor.days);
    const dateStr = expDate.toISOString().split('T')[0];
    const expMove = Number((spotPrice * tenorAtmIV * Math.sqrt(T)).toFixed(2));

    expirationsMeta.push({
      days: tenor.days,
      label: tenor.label,
      date: dateStr,
      atmIV: Number((tenorAtmIV * 100).toFixed(1)),
      expMove
    });

    // Curvature scales with 1 / sqrt(T) (SABR / Heston asymptotic property)
    const curvatureFactor = Math.min(2.4, Math.max(0.55, 0.42 / Math.sqrt(Math.max(0.015, T))));

    strikes.forEach(strike => {
      const moneyness = strike / spotPrice;
      const isATM = strike === atmStrike;

      // Realistic downside skew: OTM Puts have steep IV, OTM Calls flatten or rise mildly
      const callSkew = Math.max(
        0.08,
        tenorAtmIV + curvatureFactor * 0.12 * Math.pow(moneyness - 1, 2) + (moneyness < 1 ? 0.04 * (1 - moneyness) : -0.015 * (moneyness - 1))
      );
      const putSkew = Math.max(
        0.08,
        tenorAtmIV + curvatureFactor * 0.16 * Math.pow(moneyness - 1, 2) + (moneyness < 1 ? 0.09 * (1 - moneyness) : 0.01 * (moneyness - 1))
      );

      const callBS = calculateBlackScholes(spotPrice, strike, T, r, callSkew, 'CALL');
      const putBS = calculateBlackScholes(spotPrice, strike, T, r, putSkew, 'PUT');

      const callIVPct = Number((callSkew * 100).toFixed(1));
      const putIVPct = Number((putSkew * 100).toFixed(1));
      const midIVPct = Number(((callIVPct + putIVPct) / 2).toFixed(1));

      overallMinIV = Math.min(overallMinIV, callIVPct, putIVPct);
      overallMaxIV = Math.max(overallMaxIV, callIVPct, putIVPct);

      points.push({
        strike,
        moneyness: Number(moneyness.toFixed(3)),
        daysToExpiry: tenor.days,
        expiryLabel: tenor.label,
        expiryDate: dateStr,
        callIV: callIVPct,
        putIV: putIVPct,
        midIV: midIVPct,
        deltaCall: callBS.delta,
        deltaPut: putBS.delta,
        gamma: callBS.gamma,
        vega: callBS.vega,
        theta: callBS.theta,
        callPrice: callBS.price,
        putPrice: putBS.price,
        isATM
      });
    });
  });

  // Calculate 25-Delta Skew at 30-day maturity
  const month30Points = points.filter(p => p.daysToExpiry === 30);
  const put25 = month30Points.reduce((prev, curr) =>
    Math.abs(Math.abs(curr.deltaPut) - 0.25) < Math.abs(Math.abs(prev.deltaPut) - 0.25) ? curr : prev,
    month30Points[0] || points[0]
  );
  const call25 = month30Points.reduce((prev, curr) =>
    Math.abs(curr.deltaCall - 0.25) < Math.abs(prev.deltaCall - 0.25) ? curr : prev,
    month30Points[0] || points[0]
  );

  const skew25Delta = Number(((put25?.putIV || 0) - (call25?.callIV || 0)).toFixed(2));

  // Determine Term Structure slope
  const atm7 = expirationsMeta.find(e => e.days === 7)?.atmIV || 0;
  const atm180 = expirationsMeta.find(e => e.days === 180)?.atmIV || 0;
  let termStructureSlope: 'Contango' | 'Backwardation' | 'Flat' = 'Flat';
  if (atm180 - atm7 > 1.2) {
    termStructureSlope = 'Contango';
  } else if (atm7 - atm180 > 1.2) {
    termStructureSlope = 'Backwardation';
  }

  return {
    ticker,
    spotPrice,
    atmIV: Number((baseAtmIV * 100).toFixed(1)),
    expirations: expirationsMeta,
    strikes,
    points,
    skew25Delta,
    termStructureSlope,
    ivMin: Number(overallMinIV.toFixed(1)),
    ivMax: Number(overallMaxIV.toFixed(1)),
    generatedAt: new Date().toISOString()
  };
}

