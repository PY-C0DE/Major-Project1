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

export interface StockSearchResult {
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  price?: number;
  changePercent?: number;
  sector?: string;
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
  targetDate?: string; // e.g. "2026-10-27"
  targetDateFormatted?: string; // e.g. "Tue, Oct 27, 2026"
  empiricalCoverage?: number;
  directionalAccuracy?: number;
  priceAccuracy?: number;
  previousDayStats?: PreviousDayStats;
  classifiedEvents?: ClassifiedFinancialEvent[];
  decisionSignal?: DecisionSignal;
}

export interface EquityCurvePoint {
  date: string;
  strategyValue: number;
  benchmarkValue: number;
  drawdown?: number;
  drawdownPct?: number;
  signal?: 'BUY' | 'SELL' | 'HOLD';
  tradeSignal?: 'BUY' | 'SELL' | 'HOLD';
  cashBalance?: number;
}

export interface StrategyPerformanceMetrics {
  strategyName: string;
  ticker: string;
  totalReturnPct: number;
  benchmarkReturnPct: number;
  alphaPct: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  winRatePct: number | null;
  totalTrades: number;
  profitFactor: number | null;
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
  conformalCoverage?: number;
  priceAccuracy?: number;
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
  averageBuyPrice?: number;
  currentPrice: number;
  totalInvested: number;
  currentValue: number;
  pnl: number;
  unrealizedPnl?: number;
  pnlPercent: number;
  unrealizedPnlPercent?: number;
  purchaseDate: string;
  addedAt?: string;
  sector?: string;
  currency?: string;
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
  targetWeightPct: number;
  weightDeltaPct: number;
  currentValue: number;
  targetValue: number;
  valueDelta: number; // targetValue - currentValue
  quantityDelta: number; // suggested shares to buy (positive) or sell (negative)
  targetQuantity: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  actionLabel: string;
  rationale?: string;
  expectedReturnAnnualPct: number;
  volatilityAnnualPct: number;
}

export interface EfficientFrontierPoint {
  volatilityPct: number;
  expectedReturnPct: number;
  sharpeRatio: number;
  label?: string;
  isCurrent?: boolean;
  isOptimal?: boolean;
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

export interface ProjectWideAccuracyResult {
  priceAccuracyPct: number;
  mape: number;
  evaluatedAssetsCount: number;
  mae: number;
  rmse: number;
  directionalAccuracyPct: number;
  conformalCoveragePct: number;
  benchmark: string;
  evaluatedAt: string;
}

export interface OptionContract {
  strike: number;
  type: 'CALL' | 'PUT';
  bid: number;
  ask: number;
  lastPrice: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
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

export interface AutomatedBacktestResult {
  ticker: string;
  strategyName: string;
  lookbackDays: number;
  initialCapital: number;
  strategyFinalValue: number;
  benchmarkFinalValue: number;
  strategyReturnPct: number;
  benchmarkReturnPct: number;
  alphaOutperformancePct: number;
  strategySharpeRatio: number;
  benchmarkSharpeRatio: number;
  strategyMaxDrawdownPct: number;
  benchmarkMaxDrawdownPct: number;
  winRatePct: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  equityCurve: EquityCurvePoint[];
  backtestExecutedAt: string;
}

export interface BrokerOrder {
  id: string;
  ticker: string;
  side: 'BUY' | 'SELL';
  qty: number;
  type: 'MARKET' | 'LIMIT';
  limitPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  timeInForce: 'DAY' | 'GTC';
  status: 'FILLED' | 'NEW' | 'CANCELED' | 'REJECTED';
  filledPrice: number;
  filledAt: string;
  createdAt: string;
  routingVenue: string;
  commission: number;
}

export interface BrokerAccount {
  accountId: string;
  accountNumber: string;
  status: 'ACTIVE' | 'ONBOARDING';
  currency: 'USD' | 'INR';
  buyingPower: number;
  cash: number;
  portfolioValue: number;
  dayTradeCount: number;
  multiplier: number;
  gateway: string;
  lastSyncAt: string;
}

export interface SocialDiscussion {
  id: string;
  ticker: string;
  source: 'Reddit / r/wallstreetbets' | 'FinTwit / Verified Quants' | 'Institutional Bloomberg Terminal' | 'Discord Quant Desk';
  author: string;
  authorBadge: 'Top Contributor' | 'CFA Institute' | 'Verified Quant' | 'Algorithmic Fund';
  title: string;
  content: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentScore: number;
  upvotes: number;
  commentsCount: number;
  timeAgo: string;
  verifiedTrade?: {
    action: 'BUY' | 'SELL';
    price: string;
    target: string;
  };
}

export interface VerifiedTrader {
  id: string;
  name: string;
  handle: string;
  title: string;
  avatarSeed: string;
  aum: string;
  winRatePct: number;
  return30dPct: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  followersCount: number;
  strategyDescription: string;
  holdings: Array<{ ticker: string; weightPct: number }>;
}

export interface PreviousDayStats {
  previousDate: string;
  previousClose: number;
  previousHigh: number;
  previousLow: number;
  previousOpen: number;
  predictedClose: number;
  lowerBound: number;
  upperBound: number;
  confidenceLevel: number;
  hit: boolean; // Did actual close fall inside lowerBound and upperBound?
  errorAbsolute: number;
  errorPercent: number;
  actualReturnPercent: number;
  predictedReturnPercent: number;
  trailing5DayHits: Array<{
    date: string;
    actualClose: number;
    predictedClose: number;
    lowerBound: number;
    upperBound: number;
    hit: boolean;
    errorPct: number;
  }>;
}

export interface ClassifiedFinancialEvent {
  id: string;
  title: string;
  summary: string;
  category: 'Mergers & Acquisitions (M&A)' | 'Earnings & Guidance' | 'Regulatory & Legal' | 'Product & Expansion' | 'Dividends & Capital' | 'Macro & Monetary';
  eventImpact: 'High Bullish Catalyst' | 'Moderate Bullish' | 'Neutral Event' | 'Moderate Bearish' | 'High Risk Headwind';
  predictedPriceEffectPct: number;
  confidenceScore: number;
  source: string;
  timeAgo: string;
  incorporationInModel: string;
}

export interface DecisionSignal {
  recommendation: 'STRONG BUY' | 'BUY' | 'HOLD' | 'TAKE PROFIT / SELL';
  targetPrice: number;
  stopLossPrice: number;
  riskRewardRatio: number;
  confidenceScore: number;
  holdingActionRationale: string;
  sellTriggerCondition: string;
  holdSafetyCondition: string;
  factors: {
    conformalPosition: 'Below Lower Bound' | 'Inside Channel' | 'Above Upper Bound';
    regimeAlignment: string;
    rsiState: string;
    costBasisComparison?: string;
  };
}

export interface StressTestScenario {
  id: string;
  name: string;
  historicalPeriod: string;
  description: string;
  marketDropPct: number;
  volatilitySpikePct: number;
  techDropPct: number;
  financialsDropPct: number;
  energyDropPct: number;
  defensiveDropPct: number;
  interestRateBps: number;
}

export interface StressTestResult {
  scenarioName: string;
  marketShockPct: number;
  initialPortfolioValue: number;
  projectedPortfolioValue: number;
  projectedLossDollar: number;
  projectedLossPct: number;
  var95Dollar: number;
  var99Dollar: number;
  maxDrawdownProjectedPct: number;
  assetImpacts: Array<{
    ticker: string;
    companyName: string;
    currentValue: number;
    projectedValue: number;
    shockDollar: number;
    shockPct: number;
    beta: number;
    sector: string;
    vulnerabilityLevel: 'Low' | 'Moderate' | 'Severe';
  }>;
  riskMitigations: Array<{
    category: string;
    recommendation: string;
    expectedProtectionDollar: number;
  }>;
}

export interface NewInvestorShareIdea {
  ticker: string;
  name: string;
  category: 'Conservative Wealth Builder' | 'Balanced Growth' | 'High Alpha Momentum' | 'Defensive Dividend';
  recommendedAction: 'BUY' | 'HOLD' | 'SELL';
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  expectedAnnualReturn: string;
  riskRating: 'Low Risk' | 'Medium Risk' | 'Higher Volatility';
  simpleExplanation: string;
  whyInvestNow: string;
  minimumInvestmentAmount: number;
}

export interface InvestorGuideTopic {
  id: string;
  title: string;
  icon: string;
  shortSummary: string;
  fullExplanation: string;
  keyTakeaway: string;
  exampleScenario: string;
}


