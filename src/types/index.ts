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
  fetchedAt?: string;
  isLive?: boolean;
  dataSource?: 'live' | 'synthetic';
  provider?: string;
  fallbackFrom?: string;
  warning?: string;
  exchangeTimezoneName?: string;
  marketPeriod?: {
    regularStart?: number;
    regularEnd?: number;
    preStart?: number;
    preEnd?: number;
    postStart?: number;
    postEnd?: number;
    tzShort?: string;
  };
}

export interface StockSearchResult {
  ticker: string;
  name: string;
  exchange: string;
  exchangeCode?: string;
  country?: string;
  currency: string;
  timezone?: string;
  assetType?: string;
  price?: number;
  changePercent?: number;
  sector?: string;
}

export interface TickerMasterItem {
  symbol: string;
  name: string;
  exchange: string; // ISO 10383 MIC code (e.g. XNSE, XNAS, XNYS, XLON)
  exchangeCode: string; // Display exchange code (e.g. NSE, NASDAQ, NYSE, LSE)
  country: string; // ISO 3166-1 alpha-2 country code (e.g. IN, US, GB)
  currency: string; // ISO 4217 currency code (e.g. INR, USD, GBP)
  timezone: string; // IANA timezone (e.g. Asia/Kolkata, America/New_York)
  assetType: string; // EQUITY, ETF, INDEX
  sector: string;
  pe?: number | null;
  marketCap?: number | null;
  basePrice?: number | null;
  aliases: string[];
  active: boolean;
}

export interface TickerSearchResponse {
  items: TickerMasterItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    countries: string[];
    exchanges: Array<{ mic: string; code: string; country: string }>;
  };
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
  sma200?: number;
  rsi?: number;
  macd?: number;
  bbUpper?: number;
  bbLower?: number;
  predictedClose?: number;
  lowerBound?: number;
  upperBound?: number;
  source?: 'live' | 'synthetic';
}

export interface TechnicalIndicators {
  sma20: number;
  sma50: number;
  sma200?: number;
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

export type SentimentSource = 'finbert' | 'lexicon' | 'multilingual-lexicon';

export interface LiveNewsMeta {
  isLive: boolean;
  liveArticlesCount: number;
  baselineArticlesCount: number;
  liveSentimentScore: number;
  baselineSentimentScore: number;
  blendedSentimentScore: number;
  sentimentSource?: SentimentSource | 'mixed';
  language?: string;
  modelId?: string;
  topLiveHeadline?: string;
  topLiveSource?: string;
  newsDriftImpactPct: number;
  lastLiveFetchTimestamp: string;
}

export interface ConformalPrediction {
  available?: true;
  reason?: string;
  ticker: string;
  currency?: string;
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
  liveNewsMeta?: LiveNewsMeta;
  dataSource?: 'live' | 'synthetic';
}

export interface UnavailableConformalPrediction {
  available: false;
  reason: string;
  ticker: string;
  currency?: string;
  dataSource?: 'live' | 'synthetic';
}

export type ConformalPredictionResponse = ConformalPrediction | UnavailableConformalPrediction;

export function isConformalPredictionAvailable(
  pred: ConformalPredictionResponse | null | undefined
): pred is ConformalPrediction {
  return Boolean(pred && pred.available !== false);
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
  dataSource?: 'live' | 'synthetic';
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
  isLive?: boolean;
  dataSource?: 'live' | 'synthetic';
  fetchedAt?: string;
  sentimentSource?: SentimentSource;
  language?: string;
  modelId?: string;
}

export interface MarketIndexItem {
  name: string;
  symbol: string;
  region: string;
  val: string;
  change: string;
  pct: string;
  up: boolean;
  price: number;
  changeValue: number;
  isLive?: boolean;
  dataSource?: 'live' | 'synthetic';
  fetchedAt?: string;
  provider?: string;
  fallbackFrom?: string;
  warning?: string;
}

export interface QuickWatchItem {
  ticker: string;
  name: string;
  price: string;
  priceNum: number;
  chg: string;
  chgPct: number;
  up: boolean;
  sector: string;
  currency: string;
  isLive?: boolean;
  dataSource?: 'live' | 'synthetic';
  fetchedAt?: string;
  provider?: string;
  fallbackFrom?: string;
  warning?: string;
}

export interface SentimentScoreResult {
  ticker: string;
  sentimentScore: number;
  label: 'Positive' | 'Negative' | 'Neutral';
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  sampleCount: number;
  liveCount: number;
  baselineCount: number;
  isLive: boolean;
  topLiveHeadline?: string;
  topLiveSource?: string;
  modelUsed: string;
  sentimentSource?: SentimentSource | 'mixed';
  language?: string;
  lastUpdated: string;
}

export interface DailySentimentRecord {
  ticker: string;
  date: string; // YYYY-MM-DD (Exchange-local trading date)
  credibilityWeightedNetScore: number; // [-1, 1]
  articleCount: number; // strictly > 0; zero-article days are omitted (missing)
  sentimentSource: SentimentSource | 'mixed';
  language?: string; // ISO 639-1 code or 'mixed'
  modelId?: string; // exact scorer id (e.g. 'Xenova/finbert', 'multilingual-lexicon-v1', 'keyword-lexicon-fallback')
  updatedAt: string;
}

export interface LagCorrelationPoint {
  lag: number; // k in -5..+5 (sentiment at t vs return at t+k)
  n: number;
  nDates?: number;
  pearsonR: number | null;
  pearsonPValue: number | null;
  pearsonCI95: [number, number] | null;
  spearmanRho: number | null;
  spearmanPValue: number | null;
  spearmanCI95: [number, number] | null;
  bonferroniPValue: number | null;
  bhQValue: number | null;
  significant: boolean;
}

export interface LagAnalysisResult {
  available: boolean;
  reason?: string;
  ticker: string;
  scope: 'single' | 'pooled';
  totalStoredSentimentDays: number;
  maxPairedDays: number;
  minRequiredPairs: number;
  bootstrapResamples: number;
  bootstrapSeed: number;
  multipleTestingMethod: 'benjamini-hochberg-and-bonferroni';
  alpha: number;
  lags: LagCorrelationPoint[];
  bestLag: {
    lag: number;
    spearmanRho: number | null;
    pearsonR: number | null;
    bhQValue: number | null;
    bonferroniPValue: number | null;
    significant: boolean;
  } | null;
  hasSignificantLag: boolean;
  interpretationNote: string;
  evaluatedTickersCount?: number;
  totalObservationsAcrossLags?: number;
  computedAt: string;
}

export interface SentimentAblationArmMetrics {
  name: 'Price-Only (24 Factors)' | 'Price + Causal Sentiment (28 Factors)';
  currency?: string;
  samples: number;
  distinctDates: number;
  assetsCount: number;
  mae: number | null;
  rmse: number | null;
  mape: number;
  priceAccuracy: number;
  naiveMape: number;
  naivePriceAccuracy: number;
  maeSkillVsNaive: number | null;
  rmseSkillVsNaive: number | null;
  directionalAccuracy: number;
  alwaysUpAccuracy: number;
  directionalEdgeVsAlwaysUpPct: number;
  directionalEdgeVsAlwaysUp95CI: [number, number];
  conformalCoverage: number;
}

export interface SentimentAblationResult {
  available: boolean;
  reason?: string;
  currency?: string;
  minRequiredSamples: number;
  minRequiredDates: number;
  matchedSamples: number;
  matchedDates: number;
  matchedAssetsCount: number;
  bootstrapResamples: number;
  bootstrapSeed: number;
  priceOnly?: SentimentAblationArmMetrics;
  pricePlusSentiment?: SentimentAblationArmMetrics;
  pairedDiff?: {
    currency?: string;
    priceAccuracyDiffPct: number; // plusSentiment - priceOnly
    maeSkillDiff: number;
    maeDiff: number | null; // plusSentiment - priceOnly (negative means lower error); null if mixed currency
    maeDiffCI95: [number, number] | null;
    directionalAccuracyDiffPp: number;
    directionalAccuracyDiffCI95: [number, number];
    conformalCoverageDiffPp: number;
    statisticallySignificantImprovement: boolean;
  };
  interpretationNote: string;
  evaluatedAt: string;
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
  dataSource?: 'live' | 'synthetic';
}

export interface ModelComparisonItem {
  model: string;
  mae: number | null;
  rmse: number | null;
  r2: number | null;
  mape?: number | null;
  priceAccuracy?: number | null;
  maeSkillVsNaive?: number | null;
  rmseSkillVsNaive?: number | null;
  directionalAccuracy: number | null;
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

export interface AssetBreakdownItem {
  ticker: string;
  name: string;
  currency?: string;
  dataSource: 'live' | 'synthetic';
  testWindowStart: string;
  testWindowEnd: string;
  priceAccuracy: number;
  naivePriceAccuracy: number;
  mape: number;
  naiveMape: number;
  maeSkillVsNaive: number | null;
  rmseSkillVsNaive: number | null;
  conformalCoverage: number;
  r2: number;
  directionalAccuracy: number;
  alwaysUpAccuracy: number;
  samples: number;
  rmse: number;
  naiveRmse: number;
  mae: number;
  naiveMae: number;
}

export interface MetricSummaryStats {
  mean: number;
  median: number;
  min: number;
  max: number;
}

export interface DailyHitRecord {
  date: string;
  modelHit: boolean;
  alwaysUpHit: boolean;
}

export interface PooledDirectionalStats {
  totalTestPredictions: number;
  modelHits: number;
  alwaysUpHits: number;
  pooledDirectionalAccuracyPct: number;
  pooledAlwaysUpAccuracyPct: number;
  wilson95CI: [number, number];
  binomialPValueVsAlwaysUp: number;
  directionalEdgeVsAlwaysUpPct?: number;
  directionalEdgeVsAlwaysUp95CI?: [number, number];
  bootstrapProbEdgePositive?: number;
  bootstrapResamples?: number;
  bootstrapSeed?: number;
  signTestWins?: number;
  signTestLosses?: number;
  signTestTies?: number;
  signTestPValue?: number;
}

export interface ModelFeatureImportance {
  feature: string;
  importance: number; // 0 to 100 percentage
  rawWeight: number;
  category: 'sentiment' | 'technical' | 'price_history' | 'macro' | 'regime';
  description: string;
  direction?: 'positive' | 'negative' | 'neutral';
}

export interface SkippedTickerRecord {
  ticker: string;
  reason: 'synthetic_data' | 'insufficient_history' | 'fetch_error';
  barsCount?: number;
  country?: string;
  exchange?: string;
}

export interface AuditEvaluationParams {
  historyDays: number;
  minBarsRequired: number;
  testWindowRule: string;
  retrainIntervalRule: string;
  calibrationWindowMax: number;
  conformalCoverageTarget: number;
  bootstrapResamples: number;
  bootstrapSeed: number;
  signTestNullP: number;
}

export interface ModelEvaluation {
  available?: boolean;
  reason?: string;
  gitCommit?: string | null;
  dataSource?: 'live' | 'synthetic' | 'mixed' | 'none';
  dataProvider?: string;
  dataProviderLicence?: string;
  fallbackFrom?: string;
  providerWarning?: string;
  evaluatedAssetsCount?: number;
  skippedTickers?: SkippedTickerRecord[];
  ticker: string;
  currency?: string;
  modelName: string;
  horizonDays: number;
  mae: number | null;
  rmse: number | null;
  mape: number;
  r2: number;
  naiveMae?: number | null;
  naiveRmse?: number | null;
  naiveMape?: number;
  naivePriceAccuracy?: number;
  maeSkillVsNaive?: number | null;
  rmseSkillVsNaive?: number | null;
  beatNaiveCount?: number;
  beatNaiveLabel?: string;
  directionalAccuracy: number;
  alwaysUpAccuracy?: number;
  conformalCoverage?: number;
  priceAccuracy?: number;
  totalBacktestSamples: number;
  testWindowStart?: string;
  testWindowEnd?: string;
  testWindowDays?: number;
  summaryStats?: {
    priceAccuracy?: MetricSummaryStats;
    naivePriceAccuracy?: MetricSummaryStats;
    mape: MetricSummaryStats;
    naiveMape?: MetricSummaryStats;
    maeSkillVsNaive?: MetricSummaryStats | null;
    rmseSkillVsNaive?: MetricSummaryStats | null;
    directionalAccuracy: MetricSummaryStats;
    conformalCoverage: MetricSummaryStats;
  };
  directionalStats?: PooledDirectionalStats;
  dailyHits?: DailyHitRecord[];
  evaluatedAt: string;
  comparison: ModelComparisonItem[];
  backtestSeries: BacktestDataPoint[];
  assetBreakdown?: AssetBreakdownItem[];
  totalAssetsCount?: number;
  isAllAssets?: boolean;
  featureImportance?: ModelFeatureImportance[];
  sentimentAblation?: SentimentAblationResult;
  universeMode?: 'catalog' | 'ticker_master';
  countryBreakdowns?: Record<string, UniverseBreakdownMetrics>;
  exchangeBreakdowns?: Record<string, UniverseBreakdownMetrics>;
}

export interface UnavailableEvaluation {
  available: false;
  reason: string;
  dataSource?: 'live' | 'synthetic' | 'mixed' | 'none';
  dataProvider?: string;
  dataProviderLicence?: string;
  fallbackFrom?: string;
  providerWarning?: string;
  evaluatedAssetsCount: number;
  skippedTickers?: SkippedTickerRecord[];
  ticker?: string;
}

export interface UniverseBreakdownMetrics {
  key: string;
  label: string;
  assetsCount: number;
  tickers: string[];
  currencies: string[];
  currency: string;
  mae: number | null;
  naiveMae: number | null;
  rmse: number | null;
  naiveRmse: number | null;
  mape: number;
  naiveMape: number;
  priceAccuracy: number;
  naivePriceAccuracy: number;
  maeSkillVsNaive: number | null;
  rmseSkillVsNaive: number | null;
  conformalCoverage: number;
  directionalAccuracy: number;
  alwaysUpAccuracy: number;
  beatNaiveCount: number;
  beatNaiveLabel: string;
  directionalStats: PooledDirectionalStats;
}

export interface ModelAuditResponse {
  available: boolean;
  reason?: string;
  gitCommit?: string | null;
  universeMode?: 'catalog' | 'ticker_master';
  evaluationParams?: AuditEvaluationParams;
  dataSource: 'live' | 'synthetic' | 'mixed' | 'none';
  dataProvider?: string;
  dataProviderLicence?: string;
  fallbackFrom?: string;
  providerWarning?: string;
  currency?: string;
  evaluatedAssetsCount: number;
  skippedTickers?: SkippedTickerRecord[];
  evaluatedAt?: string;
  testWindowStart?: string;
  testWindowEnd?: string;
  totalTestPredictions?: number;
  priceAccuracy?: number;
  naivePriceAccuracy?: number;
  mape?: number;
  naiveMape?: number;
  maeSkillVsNaive?: number | null;
  rmseSkillVsNaive?: number | null;
  beatNaiveCount?: number;
  beatNaiveLabel?: string;
  summaryStats?: ModelEvaluation['summaryStats'];
  directionalStats?: PooledDirectionalStats;
  comparison?: ModelComparisonItem[];
  assets?: AssetBreakdownItem[];
  countryBreakdowns?: Record<string, UniverseBreakdownMetrics>;
  exchangeBreakdowns?: Record<string, UniverseBreakdownMetrics>;
  sentimentAblation?: SentimentAblationResult;
}

export type BackgroundJobType = 'audit' | 'backfill' | 'refit';
export type BackgroundJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface BackgroundJobRecord {
  id: string;
  type: BackgroundJobType;
  status: BackgroundJobStatus;
  requestedBy?: string;
  payload: Record<string, unknown>;
  progress: {
    completed: number;
    total: number;
    message?: string;
  };
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  result?: unknown;
  error?: string;
  attemptsMade?: number;
  maxAttempts?: number;
  failedReason?: string;
  failedAt?: string;
  backend?: 'bullmq' | 'in-memory';
}

export interface BackgroundJobQueueStats {
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  concurrency: number;
  backend: 'bullmq' | 'in-memory';
}

export interface ComplianceConfig {
  disclaimerText: string;
  operatorLegalEntity: string;
  operatorAddress: string;
  operatorContactEmail: string;
  dpoContact: string;
  governingJurisdiction: string;
  updatedAt: string;
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
  lookbackDays?: number;
  covarianceShrinkage?: number;
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

export interface WatchlistPulseItem {
  id: string;
  ticker: string;
  companyName: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  confidence: number;
  isLive: boolean;
  sentimentSource?: SentimentSource;
  language?: string;
  modelId?: string;
  price?: number;
  changePercent?: number;
}

export interface WatchlistMarketMood {
  overallScore: number;
  marketMoodLabel: 'Strongly Bullish' | 'Bullish Bias' | 'Neutral Market' | 'Cautious / Bearish' | 'Strong Bearish Pressure';
  bullishPct: number;
  neutralPct: number;
  bearishPct: number;
  totalAssets: number;
  liveArticlesCount: number;
  lastUpdated: string;
}

export interface WatchlistPulseResponse {
  mood: WatchlistMarketMood;
  items: WatchlistPulseItem[];
}

export interface AlertRule {
  id: string;
  ticker: string;
  type:
    | 'price_above'
    | 'price_below'
    | 'percentage_change'
    | 'regime_shift'
    | 'drift_detected'
    | 'interval_widening'
    | 'sentiment_shift'
    | 'var_exceeded'
    | 'volatility_spike'
    | 'rsi_cross';
  threshold?: number;
  percentChangeThreshold?: number;
  direction?: 'above' | 'below';
  basePrice?: number;
  label: string;
  enabled: boolean;
  createdAt: string;
  lastTriggered?: string;
  channels?: ('email' | 'push')[];
  email?: string;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  driftThresholdPct?: number;
  // Risk-based Alert Fields
  varConfidenceLevel?: number; // 95 or 99 (%)
  varHorizonDays?: number;     // 1, 5, or 10 days
  varThresholdPct?: number;    // e.g. 3.5 (%)
  varThresholdDollar?: number; // e.g. $1,500
  varMetric?: 'parametric' | 'historical' | 'monte_carlo';
  volatilityThresholdPct?: number; // e.g. 32.0 (%)
  volatilityLookbackDays?: number; // 20, 30, or 60 days
  volatilityMetric?: 'annualized' | 'parkinson' | 'atr_pct';
  riskCategory?: 'Value-at-Risk (VaR)' | 'Volatility Surge' | 'Price & Technical' | 'Model & Drift' | 'RSI Momentum';
  riskSeverity?: 'Warning' | 'High Risk' | 'Critical Tail Risk';
  currentMetricValue?: number; // Live asset metric value for comparison
  // RSI Technical Momentum Fields
  rsiThreshold?: number;       // e.g. 30 or 70
  rsiCondition?: 'oversold_30' | 'overbought_70' | 'cross_below' | 'cross_above' | 'custom';
  rsiPeriod?: number;          // Default 14
  currentRsiValue?: number;    // Live 14-period RSI
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
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
  available?: boolean;
  reason?: string;
  dataSource?: 'live' | 'synthetic' | 'mixed' | 'none';
  currency?: string;
  priceAccuracyPct: number;
  naivePriceAccuracyPct?: number;
  mape: number;
  naiveMape?: number;
  maeSkillVsNaive?: number | null;
  rmseSkillVsNaive?: number | null;
  beatNaiveCount?: number;
  beatNaiveLabel?: string;
  evaluatedAssetsCount: number;
  mae: number | null;
  rmse: number | null;
  directionalAccuracyPct: number;
  conformalCoveragePct: number;
  summaryStats?: {
    priceAccuracy: MetricSummaryStats;
    naivePriceAccuracy: MetricSummaryStats;
    mape: MetricSummaryStats;
    naiveMape: MetricSummaryStats;
    maeSkillVsNaive: MetricSummaryStats | null;
    rmseSkillVsNaive: MetricSummaryStats | null;
  };
  benchmark: string;
  evaluatedAt: string;
}

export interface HistoricalEarningsQuarter {
  quarter: string;          // e.g. "Q2 FY27", "Q1 FY27"
  date: string;             // ISO date string e.g. "2026-08-28"
  estimatedEPS: number;     // e.g. 0.64
  actualEPS: number;        // e.g. 0.68
  surprisePct: number;      // e.g. +6.25%
  outcome: 'BEAT' | 'MISS' | 'INLINE';
  revenueEstimated: string; // formatted e.g. "$28.7B" or "₹64,200 Cr"
  revenueActual: string;    // formatted e.g. "$30.0B" or "₹64,988 Cr"
  postEarningsMovePct: number; // e.g. +2.1%
}

export interface EarningsCalendarItem {
  ticker: string;
  companyName: string;
  sector: string;
  currency: 'INR' | 'USD';
  currSym: string;
  currentPrice: number;
  reportDate: string;           // ISO date string e.g. "2026-11-20"
  reportDateFormatted: string;  // e.g. "Nov 20, 2026"
  daysUntilReport: number;      // e.g. 17
  session: 'BMO' | 'AMC' | 'DURING'; // Before Market Open, After Market Close, During Market
  fiscalPeriod: string;         // e.g. "Q3 FY27"
  isConfirmed: boolean;
  estimatedEPS: number;         // Consensus EPS estimate e.g. 0.75
  estimatedEPSLow: number;      // Low estimate
  estimatedEPSHigh: number;     // High estimate
  yoyEPSGrowthPct: number;      // e.g. +87.5%
  estimatedRevenue: string;     // e.g. "$33.15B"
  yoyRevenueGrowthPct: number;  // e.g. +83.0%
  analystCount: number;         // e.g. 38
  impliedStraddleMovePct: number; // Options implied 1-day move e.g. 7.8%
  historicalQuarters: HistoricalEarningsQuarter[];
  beatRatePct: number;          // e.g. 100%
  averageSurprisePct: number;   // e.g. +10.9%
  consecutiveBeats: number;     // e.g. 4
  keyFocusThemes: string[];     // e.g. ["Blackwell Architecture Ramp"]
  inWatchlist?: boolean;
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

export interface TradePnLPoint {
  timestamp: string;
  pnl: number;
  pnlPct: number;
  price: number;
}

export interface BrokerTrade {
  id: string;
  orderId: string;
  ticker: string;
  companyName: string;
  side: 'BUY' | 'SELL';
  qty: number;
  entryPrice: number;
  exitPrice: number; // For closed trades: realized exit price; for open trades: current market price
  entryDate: string;
  exitDate?: string;
  status: 'OPEN' | 'CLOSED' | 'PENDING';
  realizedPnL?: number;
  realizedPnLPercent?: number;
  unrealizedPnL?: number;
  unrealizedPnLPercent?: number;
  currentPrice?: number;
  orderType: 'MARKET' | 'LIMIT';
  routingVenue: string;
  commission: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  notes?: string;
  pnlTrajectory?: TradePnLPoint[];
  sector?: string;
  assetClass?: string;
  currency?: string;
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
  isTodaySession?: boolean;
  sessionType?: 'active' | 'completed';
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
  currency?: 'INR' | 'USD';
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

export interface VolatilitySurfacePoint {
  strike: number;
  moneyness: number; // K / S
  daysToExpiry: number;
  expiryLabel: string;
  expiryDate: string;
  callIV: number;
  putIV: number;
  midIV: number;
  deltaCall?: number;
  deltaPut?: number;
  gamma?: number;
  vega?: number;
  theta?: number;
  callPrice?: number;
  putPrice?: number;
  isATM?: boolean;
}

export interface VolatilitySurfaceData {
  ticker: string;
  spotPrice: number;
  atmIV: number;
  expirations: Array<{
    days: number;
    label: string;
    date: string;
    atmIV: number;
    expMove: number;
  }>;
  strikes: number[];
  points: VolatilitySurfacePoint[];
  skew25Delta: number;
  termStructureSlope: 'Contango' | 'Backwardation' | 'Flat';
  ivMin: number;
  ivMax: number;
  generatedAt: string;
}

export interface MonthlySeasonalityData {
  monthIndex: number;
  monthName: string;
  averageReturnPct: number;
  medianReturnPct: number;
  winRatePct: number;
  positiveYears: number;
  totalYears: number;
  maxReturnPct: number;
  minReturnPct: number;
  stdDevPct: number;
  isCurrentMonth: boolean;
}

export interface YearMonthReturn {
  year: number;
  returns: { [month: number]: number | null };
  annualReturnPct: number;
}

export interface SeasonalOutperformer {
  ticker: string;
  name: string;
  sector: string;
  exchange: string;
  currency: string;
  seasonAverageReturnPct: number;
  seasonWinRatePct: number;
  seasonAlphaPct: number;
  historicalConsistencyScore: number;
  isCurrentStock?: boolean;
}

export interface SeasonalityReport {
  ticker: string;
  name?: string;
  sector?: string;
  currency?: string;
  yearsAnalyzed: number;
  availableYears: number[];
  monthlyStats: MonthlySeasonalityData[];
  quarterlyStats: {
    quarter: string;
    label: string;
    averageReturnPct: number;
    winRatePct: number;
    isCurrentQuarter: boolean;
  }[];
  yearlyHeatmap: YearMonthReturn[];
  currentMonthAnalysis: {
    monthIndex: number;
    monthName: string;
    averageReturnPct: number;
    winRatePct: number;
    rankInYear: number;
    tendency: 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';
    notablePattern: string;
  };
  seasonalOutperformers: SeasonalOutperformer[];
  bestMonth: { monthName: string; avgReturn: number; winRate: number };
  worstMonth: { monthName: string; avgReturn: number; winRate: number };
}



