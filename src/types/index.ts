export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  high52: number;
  low52: number;
  volume: number;
  pe?: number;
  marketCap?: number;
  currency: string;
  exchange: string;
  lastUpdated: string;
}

export interface HistoricalBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20?: number;
  sma50?: number;
  rsi?: number;
  macd?: number;
  bbUpper?: number;
  bbLower?: number;
  predictedClose?: number;
  lowerBound?: number;
  upperBound?: number;
}

export interface TechnicalIndicators {
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  rsi14: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  bbUpper: number;
  bbLower: number;
  bbMiddle: number;
  atr14: number;
  momentum: number;
  roc: number;
}

export interface FeatureContribution {
  feature: string;
  impact: number; // e.g. +18% or -12%
  category: 'technical' | 'sentiment' | 'macro' | 'regime';
  description: string;
}

export interface ConformalPrediction {
  ticker: string;
  currentPrice: number;
  predictedPrice: number;
  predictionChangePercent: number;
  lowerBound: number;
  upperBound: number;
  confidenceLevel: number; // e.g. 0.90
  intervalWidth: number;
  intervalWidthPercent: number;
  horizonDays: number;
  modelVersion: string;
  predictionTimestamp: string;
  topFeatures: FeatureContribution[];
  methodology: string;
  empiricalCoverage?: number;
  directionalAccuracy?: number;
}

export interface EquityCurvePoint {
  date: string;
  strategyValue: number;
  benchmarkValue: number;
  drawdown: number;
  signal?: 'BUY' | 'SELL' | 'HOLD';
}

export interface StrategyPerformanceMetrics {
  strategyName: string;
  ticker: string;
  totalReturnPct: number;
  benchmarkReturnPct: number;
  alphaPct: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  winRatePct: number;
  totalTrades: number;
  profitFactor: number;
  equityCurve: EquityCurvePoint[];
}

export interface CorrelationAsset {
  ticker: string;
  name: string;
  regime: string;
  volatility: number;
  beta: number;
}

export interface CorrelationMatrixData {
  tickers: string[];
  assets: CorrelationAsset[];
  matrix: number[][]; // N x N pairwise correlation values (-1 to +1)
  calculatedAt: string;
}

export interface HistoricalRegimeItem {
  date: string;
  regime: number;
  regimeName: string;
  volatility: number;
  returns: number;
}

export interface MarketRegime {
  ticker: string;
  currentRegime: string;
  regimeId: number;
  regimeProbability: number;
  stabilityScore: number;
  volatilityLevel: string;
  transitionMatrix: number[][];
  regimeCharacteristics: {
    regime0: { name: string; meanReturn: number; volatility: number; interpretation: string };
    regime1: { name: string; meanReturn: number; volatility: number; interpretation: string };
  };
  historicalRegimes: HistoricalRegimeItem[];
}

export interface NewsItem {
  id: string;
  ticker: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // -1.0 to +1.0
  probabilities: {
    positive: number;
    neutral: number;
    negative: number;
  };
  confidence: number;
  factCheckStatus: 'Verified' | 'Partially Verified' | 'Unverified' | 'Contradicted' | 'No Fact Check Found';
  verificationScore: number; // 0 to 1
  sourceCredibility: number; // 0 to 1
}

export interface FeatureDriftItem {
  feature: string;
  ksStatistic: number;
  pValue: number;
  driftDetected: boolean;
  baselineMean: number;
  liveMean: number;
  severity: 'normal' | 'moderate' | 'critical';
}

export interface ConceptDriftResult {
  ticker: string;
  driftDetected: boolean;
  driftingFeaturesCount: number;
  totalFeaturesCount: number;
  overallDriftScore: number;
  checkTimestamp: string;
  safetyWarning: string | null;
  features: FeatureDriftItem[];
}

export interface ModelComparisonItem {
  model: string;
  mae: number;
  rmse: number;
  r2: number;
  directionalAccuracy: number;
  trainingTimeSec: number;
  isProduction: boolean;
}

export interface BacktestDataPoint {
  date: string;
  actual: number;
  predicted: number;
  lower: number;
  upper: number;
  residual: number;
}

export interface ModelEvaluation {
  ticker: string;
  modelName: string;
  horizonDays: number;
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
  directionalAccuracy: number;
  totalBacktestSamples: number;
  evaluatedAt: string;
  comparison: ModelComparisonItem[];
  backtestSeries: BacktestDataPoint[];
}

export interface PortfolioHolding {
  id: string;
  ticker: string;
  companyName: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalInvested: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  purchaseDate: string;
  notes?: string;
}

export interface RebalanceSuggestion {
  holdingId?: string;
  ticker: string;
  companyName: string;
  currentPrice: number;
  currentQuantity: number;
  currentWeightPct: number;
  optimalWeightPct: number;
  currentValue: number;
  targetValue: number;
  valueDelta: number; // targetValue - currentValue
  quantityDelta: number; // suggested shares to buy (positive) or sell (negative)
  targetQuantity: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  actionLabel: string;
  expectedReturnAnnualPct: number;
  volatilityAnnualPct: number;
}

export interface EfficientFrontierPoint {
  volatilityPct: number;
  expectedReturnPct: number;
  sharpeRatio: number;
  label?: string;
  isCurrent?: boolean;
  isMaxSharpe?: boolean;
  isMinVol?: boolean;
}

export interface PortfolioOptimizationResult {
  objective: 'max_sharpe' | 'min_volatility' | 'equal_weight';
  totalPortfolioValue: number;
  riskFreeRate: number;
  currentMetrics: {
    expectedReturnAnnualPct: number;
    volatilityAnnualPct: number;
    sharpeRatio: number;
    diversificationRatio: number;
  };
  optimalMetrics: {
    expectedReturnAnnualPct: number;
    volatilityAnnualPct: number;
    sharpeRatio: number;
    sharpeGainPct: number;
    volatilityReductionPct: number;
    expectedReturnDeltaPct: number;
  };
  suggestions: RebalanceSuggestion[];
  efficientFrontier: EfficientFrontierPoint[];
  correlationMatrix: {
    tickers: string[];
    matrix: number[][];
  };
  optimizedAt: string;
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  companyName: string;
  currentPrice: number;
  dailyChange: number;
  dailyChangePercent: number;
  predictedPrice: number;
  lowerBound: number;
  upperBound: number;
  regime: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  driftStatus: 'Healthy' | 'Drift Detected';
}

export interface AlertRule {
  id: string;
  ticker: string;
  type: 'price_above' | 'price_below' | 'regime_shift' | 'drift_detected' | 'interval_widening' | 'sentiment_shift';
  threshold?: number;
  label: string;
  enabled: boolean;
  createdAt: string;
  lastTriggered?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isDemoUser?: boolean;
  avatarUrl?: string;
  title?: string;
  organization?: string;
  phone?: string;
  bio?: string;
  timezone?: string;
  currencyPreference?: 'INR' | 'USD';
  defaultExchange?: 'NSE' | 'NASDAQ';
  confidenceLevel?: number;
  twoFactorEnabled?: boolean;
  notifications?: {
    emailAlerts: boolean;
    regimeShifts: boolean;
    driftWarnings: boolean;
    marketOpenSummary: boolean;
  };
}
