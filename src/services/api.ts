/**
 * Frontend API Service
 * Connects to the full-stack REST API endpoints with authentication tokens.
 */

import {
  StockQuote,
  HistoricalBar,
  ConformalPrediction,
  ConformalPredictionResponse,
  UnavailableConformalPrediction,
  MarketRegime,
  NewsItem,
  ConceptDriftResult,
  ModelEvaluation,
  PortfolioHolding,
  WatchlistItem,
  WatchlistPulseResponse,
  AlertRule,
  UserProfile,
  StrategyPerformanceMetrics,
  CorrelationMatrixData,
  PortfolioOptimizationResult,
  RebalanceSuggestion,
  ProjectWideAccuracyResult,
  OptionsChainResponse,
  VolatilitySurfaceData,
  AutomatedBacktestResult,
  BrokerOrder,
  BrokerTrade,
  BrokerAccount,
  SocialDiscussion,
  VerifiedTrader,
  StockSearchResult,
  EarningsCalendarItem,
  SeasonalityReport,
  MarketIndexItem,
  QuickWatchItem,
  SentimentScoreResult,
  ModelAuditResponse,
  LagAnalysisResult,
  TickerSearchResponse,
  ComplianceConfig
} from '../types';
import { generateSupportFallback } from '../utils/supportKnowledge';
import {
  DEFAULT_CONFORMAL_CONFIDENCE,
  DEFAULT_BACKTEST_STRATEGY,
  AutomatedBacktestStrategyId
} from '../shared/modelConfig';

const API_BASE = '/api';

function isLikelyHtmlPayload(text: string, contentType: string): boolean {
  const trimmed = text.trimStart().toLowerCase();
  return (
    contentType.includes('text/html') ||
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<')
  );
}

async function parseJsonTextSafe<T>(res: Response): Promise<{ ok: true; data: T } | { ok: false; isHtml: boolean; rawText: string }> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const text = await res.text();
  if (!text || !text.trim()) {
    return { ok: false, isHtml: false, rawText: '' };
  }
  if (isLikelyHtmlPayload(text, contentType)) {
    return { ok: false, isHtml: true, rawText: text };
  }
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, isHtml: false, rawText: text };
  }
}

async function parseApiResponse<T>(res: Response, fallbackError: string): Promise<T> {
  const parsed = await parseJsonTextSafe<T & { error?: string }>(res);
  if (!res.ok) {
    if (parsed.ok && parsed.data && typeof parsed.data === 'object' && typeof parsed.data.error === 'string' && parsed.data.error) {
      throw new Error(parsed.data.error);
    }
    if (!parsed.ok && parsed.isHtml) {
      throw new Error(`${fallbackError} (server returned HTML status ${res.status})`);
    }
    throw new Error(fallbackError);
  }
  if (!parsed.ok) {
    if (parsed.isHtml) {
      throw new Error(`${fallbackError} (server is warming up or returned HTML instead of JSON)`);
    }
    throw new Error(`${fallbackError} (invalid JSON response)`);
  }
  return parsed.data;
}

async function safeParseJson<T>(res: Response, fallbackValue: T): Promise<T> {
  try {
    const parsed = await parseJsonTextSafe<T>(res);
    if (parsed.ok) {
      return parsed.data;
    }
  } catch {
    // ignore parse error and use fallback
  }
  return fallbackValue;
}

// Firebase ID tokens live in JS memory only (never localStorage)
let memoryFirebaseIdToken: string | null = null;

export function setMemoryAuthToken(token: string | null): void {
  memoryFirebaseIdToken = token;
}

function getAuthHeaders(): HeadersInit {
  const token = memoryFirebaseIdToken || localStorage.getItem('alphaquant_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Authentication
  async register(name: string, email: string, password: string): Promise<{ user: UserProfile; token: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    return parseApiResponse<{ user: UserProfile; token: string }>(res, 'Failed to register');
  },

  async login(email: string, password: string): Promise<{ user: UserProfile; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return parseApiResponse<{ user: UserProfile; token: string }>(res, 'Invalid email or password');
  },

  async syncFirebaseAuth(idToken?: string): Promise<{ user: UserProfile }> {
    const token = idToken || memoryFirebaseIdToken;
    const res = await fetch(`${API_BASE}/auth/firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({})
    });
    return parseApiResponse<{ user: UserProfile }>(res, 'Failed to verify Google/Firebase session');
  },

  async getCurrentUser(): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    return parseApiResponse<UserProfile>(res, 'Unauthenticated');
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    return parseApiResponse<UserProfile>(res, 'Failed to update profile');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    return parseApiResponse<{ success: boolean; message: string }>(res, 'Failed to change password');
  },

  async requestEmailVerification(email?: string): Promise<{
    sent: boolean;
    alreadyVerified?: boolean;
    provider?: string;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/auth/verify-email/request`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(email ? { email } : {})
    });
    return parseApiResponse(res, 'Failed to request email verification');
  },

  async confirmEmailVerification(token: string): Promise<{
    verified: boolean;
    user: UserProfile;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/auth/verify-email/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    return parseApiResponse(res, 'Failed to confirm email verification');
  },

  async forgotPassword(email: string): Promise<{
    sent: boolean;
    provider?: string;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return parseApiResponse(res, 'Failed to send password reset instructions');
  },

  async resetPassword(token: string, newPassword: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    return parseApiResponse(res, 'Failed to reset password');
  },

  async getComplianceConfig(): Promise<ComplianceConfig> {
    const res = await fetch(`${API_BASE}/compliance/config`);
    return parseApiResponse<ComplianceConfig>(res, 'Failed to load compliance configuration');
  },

  async exportAccountData(): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/account/export`, {
      headers: getAuthHeaders()
    });
    return parseApiResponse<Record<string, unknown>>(res, 'Failed to export account data');
  },

  async deleteAccount(confirmText: 'DELETE MY ACCOUNT'): Promise<{
    success: boolean;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/account`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ confirmText })
    });
    return parseApiResponse<{ success: boolean; message: string }>(res, 'Failed to delete user account');
  },

  // Stocks & History
  async searchTickersMaster(params: {
    q?: string;
    country?: string;
    exchange?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<TickerSearchResponse> {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.country) qs.set('country', params.country);
    if (params.exchange) qs.set('exchange', params.exchange);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const res = await fetch(`${API_BASE}/tickers/search?${qs.toString()}`);
    return parseApiResponse<TickerSearchResponse>(res, 'Failed to search global tickers');
  },

  async searchStocks(query: string): Promise<StockSearchResult[]> {
    try {
      const res = await fetch(`${API_BASE}/stocks/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const parsed = await parseJsonTextSafe<StockSearchResult[]>(res);
        if (parsed.ok && Array.isArray(parsed.data)) {
          return parsed.data;
        }
      }
    } catch {
      // Network error
    }
    return [];
  },

  async getQuote(ticker: string): Promise<StockQuote> {
    const res = await fetch(`${API_BASE}/stocks/${encodeURIComponent(ticker)}`);
    return parseApiResponse<StockQuote>(res, `Failed to fetch quote for ${ticker}`);
  },

  async getHistory(ticker: string, days = 250): Promise<HistoricalBar[]> {
    const res = await fetch(`${API_BASE}/stocks/${encodeURIComponent(ticker)}/history?days=${days}`);
    return parseApiResponse<HistoricalBar[]>(res, `Failed to fetch history for ${ticker}`);
  },

  async getSeasonality(ticker: string, days = 1250, month?: number): Promise<SeasonalityReport> {
    const query = new URLSearchParams({ days: days.toString() });
    if (month !== undefined) query.set('month', month.toString());
    const res = await fetch(`${API_BASE}/stocks/${encodeURIComponent(ticker)}/seasonality?${query.toString()}`);
    return parseApiResponse<SeasonalityReport>(res, `Failed to fetch seasonality report for ${ticker}`);
  },

  async getFxRates(): Promise<{
    base: 'USD';
    rates: Record<string, number>;
    timestamp: string;
    isLive: boolean;
    source: string;
  }> {
    const res = await fetch(`${API_BASE}/fx/rates`);
    return parseApiResponse(res, 'Failed to fetch live FX rates');
  },

  // Core USPs
  async getConformalPrediction(ticker: string, horizon = 1, confidence = DEFAULT_CONFORMAL_CONFIDENCE): Promise<ConformalPredictionResponse> {
    const res = await fetch(`${API_BASE}/predictions/${encodeURIComponent(ticker)}?horizon=${horizon}&confidence=${confidence}`);
    const parsed = await parseJsonTextSafe<ConformalPredictionResponse & { error?: string }>(res);
    if (!parsed.ok) {
      if (parsed.isHtml || res.status === 422 || res.status === 503) {
        return {
          available: false,
          reason: 'Live prediction service temporarily unavailable or warming up',
          ticker
        };
      }
      throw new Error('Failed to compute conformal prediction');
    }
    if ((res.status === 422 || res.status === 503) && parsed.data && (parsed.data as any).available === false) {
      return parsed.data as UnavailableConformalPrediction;
    }
    if (!res.ok) {
      throw new Error((parsed.data as any)?.error || 'Failed to compute conformal prediction');
    }
    return parsed.data;
  },

  async recordPrediction(ticker: string): Promise<ConformalPredictionResponse> {
    const res = await fetch(`${API_BASE}/predictions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ticker })
    });
    const parsed = await parseJsonTextSafe<ConformalPredictionResponse & { error?: string }>(res);
    if (!parsed.ok) {
      if (parsed.isHtml && (res.status === 502 || res.status === 503 || res.status === 504)) {
        return {
          available: false,
          reason: 'Live prediction service temporarily unavailable',
          ticker
        };
      }
      throw new Error('Failed to record prediction');
    }
    if ((res.status === 422 || res.status === 503) && parsed.data && (parsed.data as any).available === false) {
      return parsed.data as UnavailableConformalPrediction;
    }
    if (!res.ok) {
      throw new Error((parsed.data as any)?.error || 'Failed to record prediction');
    }
    return parsed.data;
  },

  async getStrategyBacktest(ticker = 'RELIANCE.NS', strategy = 'sentiment_multimodal'): Promise<StrategyPerformanceMetrics> {
    const res = await fetch(`${API_BASE}/strategy/backtest?ticker=${encodeURIComponent(ticker)}&strategy=${encodeURIComponent(strategy)}`);
    return parseApiResponse<StrategyPerformanceMetrics>(res, 'Failed to run strategy backtest');
  },

  async getMarketCorrelation(): Promise<CorrelationMatrixData> {
    const res = await fetch(`${API_BASE}/markets/correlation`);
    return parseApiResponse<CorrelationMatrixData>(res, 'Failed to load market correlation matrix');
  },

  async getPredictionHistory(ticker?: string): Promise<any[]> {
    const url = ticker ? `${API_BASE}/predictions/history?ticker=${encodeURIComponent(ticker)}` : `${API_BASE}/predictions/history`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    return parseApiResponse<any[]>(res, 'Failed to get prediction history');
  },

  async getMarketRegime(ticker: string): Promise<MarketRegime> {
    const res = await fetch(`${API_BASE}/regime/${encodeURIComponent(ticker)}`);
    return parseApiResponse<MarketRegime>(res, 'Failed to compute market regime');
  },

  async getConceptDrift(ticker: string): Promise<ConceptDriftResult> {
    const res = await fetch(`${API_BASE}/drift/${encodeURIComponent(ticker)}`);
    return parseApiResponse<ConceptDriftResult>(res, 'Failed to run drift detection');
  },

  async getMarketHeadlines(): Promise<NewsItem[]> {
    const res = await fetch(`${API_BASE}/news`);
    return parseApiResponse<NewsItem[]>(res, 'Failed to fetch market headlines');
  },

  async getMarketIndices(options?: { markets?: string[]; symbols?: string[] }): Promise<MarketIndexItem[]> {
    const params = new URLSearchParams();
    if (options?.markets && options.markets.length > 0) {
      params.set('markets', options.markets.join(','));
    }
    if (options?.symbols && options.symbols.length > 0) {
      params.set('symbols', options.symbols.join(','));
    }
    const qs = params.toString();
    const res = await fetch(`${API_BASE}/markets/indices${qs ? `?${qs}` : ''}`);
    return parseApiResponse<MarketIndexItem[]>(res, 'Failed to fetch market indices');
  },

  async getQuickWatch(): Promise<QuickWatchItem[]> {
    const res = await fetch(`${API_BASE}/stocks/quick-watch`);
    return parseApiResponse<QuickWatchItem[]>(res, 'Failed to fetch quick watch stocks');
  },

  async getNews(ticker: string): Promise<NewsItem[]> {
    const res = await fetch(`${API_BASE}/news/${encodeURIComponent(ticker)}`);
    return parseApiResponse<NewsItem[]>(res, 'Failed to fetch news');
  },

  async getSentiment(ticker: string): Promise<SentimentScoreResult> {
    const res = await fetch(`${API_BASE}/sentiment/${encodeURIComponent(ticker)}`);
    return parseApiResponse<SentimentScoreResult>(res, 'Failed to compute sentiment');
  },

  async getModelMetrics(ticker = 'RELIANCE.NS'): Promise<ModelEvaluation> {
    const res = await fetch(`${API_BASE}/model/metrics?ticker=${encodeURIComponent(ticker)}`);
    const parsed = await parseJsonTextSafe<ModelEvaluation & { reason?: string; dataSource?: string; error?: string }>(res);
    if (!parsed.ok) {
      if (parsed.isHtml || res.status === 503 || res.status === 504 || res.status === 502) {
        return {
          available: false,
          reason: 'Evaluation service warming up or no live market data available',
          dataSource: 'none',
          evaluatedAssetsCount: 0
        } as ModelEvaluation;
      }
      throw new Error('Failed to fetch model metrics');
    }
    if (res.status === 503) {
      const errBody = parsed.data || {};
      return {
        available: false,
        reason: errBody.reason || 'No live market data',
        dataSource: errBody.dataSource || 'none',
        evaluatedAssetsCount: 0
      } as ModelEvaluation;
    }
    if (!res.ok) throw new Error(parsed.data?.error || 'Failed to fetch model metrics');
    return parsed.data;
  },

  async getModelAudit(ticker = 'ALL'): Promise<ModelAuditResponse> {
    const res = await fetch(`${API_BASE}/model/audit?ticker=${encodeURIComponent(ticker)}`);
    const parsed = await parseJsonTextSafe<ModelAuditResponse & { reason?: string; dataSource?: string; error?: string }>(res);
    if (!parsed.ok) {
      if (parsed.isHtml || res.status === 503 || res.status === 504 || res.status === 502) {
        return {
          available: false,
          reason: 'Evaluation service warming up or no live market data available',
          dataSource: 'none',
          evaluatedAssetsCount: 0
        };
      }
      throw new Error('Failed to fetch model audit');
    }
    if (res.status === 503) {
      const errBody = parsed.data || {};
      return {
        available: false,
        reason: errBody.reason || 'No live market data',
        dataSource: errBody.dataSource || 'none',
        evaluatedAssetsCount: 0
      };
    }
    if (!res.ok) throw new Error(parsed.data?.error || 'Failed to fetch model audit');
    return parsed.data;
  },

  async getModelHealth() {
    const res = await fetch(`${API_BASE}/model/health`);
    return parseApiResponse(res, 'Failed to fetch model health');
  },

  // Portfolio CRUD
  async getPortfolio(): Promise<PortfolioHolding[]> {
    const res = await fetch(`${API_BASE}/portfolio`, { headers: getAuthHeaders() });
    return parseApiResponse<PortfolioHolding[]>(res, 'Failed to get portfolio');
  },

  async addHolding(data: { ticker: string; quantity: number; avgBuyPrice: number; purchaseDate?: string; notes?: string }): Promise<PortfolioHolding> {
    const res = await fetch(`${API_BASE}/portfolio`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return parseApiResponse<PortfolioHolding>(res, 'Failed to add holding');
  },

  async importPortfolioBatch(payload: Array<{ ticker: string; quantity: number; avgBuyPrice: number; purchaseDate?: string; notes?: string }> | { holdings: any[]; mode?: string }): Promise<{ success: boolean; importedCount: number; holdings: PortfolioHolding[] }> {
    const bodyData = Array.isArray(payload) ? { holdings: payload } : payload;
    const res = await fetch(`${API_BASE}/portfolio/batch`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bodyData)
    });
    return parseApiResponse<{ success: boolean; importedCount: number; holdings: PortfolioHolding[] }>(res, 'Failed to import portfolio batch');
  },

  async deleteHolding(id: string) {
    const res = await fetch(`${API_BASE}/portfolio/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return parseApiResponse(res, 'Failed to delete holding');
  },

  async optimizePortfolio(
    objective: 'max_sharpe' | 'min_volatility' | 'equal_weight' = 'max_sharpe',
    holdings?: PortfolioHolding[],
    options?: { riskFreeRate?: number; maxWeightCap?: number; minWeightFloor?: number }
  ): Promise<PortfolioOptimizationResult> {
    const res = await fetch(`${API_BASE}/portfolio/optimize`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        objective,
        holdings,
        riskFreeRate: options?.riskFreeRate,
        maxWeightCap: options?.maxWeightCap,
        minWeightFloor: options?.minWeightFloor
      })
    });
    return parseApiResponse<PortfolioOptimizationResult>(res, 'Failed to compute portfolio optimization');
  },

  async getPortfolioCorrelation(
    holdings?: PortfolioHolding[],
    lookbackDays = 90
  ): Promise<CorrelationMatrixData & { weights?: Record<string, number> }> {
    const res = await fetch(`${API_BASE}/portfolio/correlation`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ holdings, lookbackDays })
    });
    return parseApiResponse(res, 'Failed to compute portfolio correlation matrix');
  },

  async applyRebalance(suggestions: RebalanceSuggestion[]): Promise<{ success: boolean; message: string; holdings: PortfolioHolding[] }> {
    const res = await fetch(`${API_BASE}/portfolio/rebalance/apply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ suggestions })
    });
    return parseApiResponse<{ success: boolean; message: string; holdings: PortfolioHolding[] }>(res, 'Failed to apply portfolio rebalancing');
  },

  // Watchlist CRUD
  async getWatchlist(): Promise<WatchlistItem[]> {
    const res = await fetch(`${API_BASE}/watchlist`, { headers: getAuthHeaders() });
    return parseApiResponse<WatchlistItem[]>(res, 'Failed to get watchlist');
  },

  async getWatchlistPulse(): Promise<WatchlistPulseResponse> {
    const res = await fetch(`${API_BASE}/watchlist/pulse`, { headers: getAuthHeaders() });
    return parseApiResponse<WatchlistPulseResponse>(res, 'Failed to get watchlist pulse');
  },

  async addToWatchlist(ticker: string) {
    const res = await fetch(`${API_BASE}/watchlist`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ticker })
    });
    return parseApiResponse(res, 'Failed to add to watchlist');
  },

  async removeFromWatchlist(ticker: string) {
    const res = await fetch(`${API_BASE}/watchlist/${encodeURIComponent(ticker)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return parseApiResponse(res, 'Failed to remove from watchlist');
  },

  // Earnings Calendar & Surprise Patterns
  async getEarningsCalendar(watchlistOnly = false): Promise<EarningsCalendarItem[]> {
    const res = await fetch(`${API_BASE}/earnings/calendar?watchlistOnly=${watchlistOnly}`, {
      headers: getAuthHeaders()
    });
    return parseApiResponse<EarningsCalendarItem[]>(res, 'Failed to fetch earnings calendar data');
  },

  // Alerts CRUD
  async getAlerts(): Promise<AlertRule[]> {
    const res = await fetch(`${API_BASE}/alerts`, { headers: getAuthHeaders() });
    return parseApiResponse<AlertRule[]>(res, 'Failed to get alerts');
  },

  async createAlert(data: Partial<AlertRule> & {
    ticker: string;
    type: string;
    label: string;
  }): Promise<AlertRule> {
    const res = await fetch(`${API_BASE}/alerts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return parseApiResponse<AlertRule>(res, 'Failed to create alert');
  },

  async toggleAlert(id: string, enabled: boolean): Promise<AlertRule> {
    const res = await fetch(`${API_BASE}/alerts/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ enabled })
    });
    return parseApiResponse<AlertRule>(res, 'Failed to update alert');
  },

  async deleteAlert(id: string) {
    const res = await fetch(`${API_BASE}/alerts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return parseApiResponse(res, 'Failed to delete alert');
  },

  // Customer Support Chatbot
  async sendSupportChat(messages: Array<{ role: 'user' | 'model'; content: string }>): Promise<{
    reply: string;
    suggestedActions?: Array<{ label: string; action: string }>;
  }> {
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const localFallback = {
      reply: generateSupportFallback(lastUserMsg),
      suggestedActions: [
        { label: '📊 Open Dashboard', action: 'nav:dashboard' },
        { label: '📑 View Watchlist', action: 'nav:watchlist' },
        { label: '💼 Track Portfolio', action: 'nav:portfolio' }
      ]
    };

    try {
      const res = await fetch(`${API_BASE}/support/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });

      if (!res.ok) {
        return localFallback;
      }

      const data = await safeParseJson<{ reply?: string; suggestedActions?: Array<{ label: string; action: string }> } | null>(res, null);
      if (!data || typeof data.reply !== 'string') {
        return localFallback;
      }

      return { reply: data.reply, suggestedActions: data.suggestedActions };
    } catch {
      // Return instant local domain knowledge response if network fails
      return localFallback;
    }
  },

  async getLagAnalysis(ticker?: string): Promise<LagAnalysisResult> {
    const clean = ticker?.trim();
    const url =
      !clean || clean.toUpperCase() === 'ALL'
        ? `${API_BASE}/sentiment/lag-analysis`
        : `${API_BASE}/sentiment/lag-analysis/${encodeURIComponent(clean)}`;
    const res = await fetch(url);
    return parseApiResponse<LagAnalysisResult>(res, 'Failed to load sentiment-price lag analysis');
  },

  // Project-Wide Price Accuracy Metric obtained by analyzing model predictions
  async getProjectWideAccuracy(): Promise<ProjectWideAccuracyResult> {
    const res = await fetch(`${API_BASE}/metrics/accuracy`);
    const parsed = await parseJsonTextSafe<ProjectWideAccuracyResult & { reason?: string; dataSource?: string; error?: string }>(res);
    if (!parsed.ok) {
      if (parsed.isHtml || res.status === 503 || res.status === 504 || res.status === 502) {
        return {
          available: false,
          reason: 'Evaluation service warming up or temporarily unavailable',
          dataSource: 'none',
          evaluatedAssetsCount: 0,
          priceAccuracyPct: 0,
          mape: 0,
          mae: 0,
          rmse: 0,
          directionalAccuracyPct: 0,
          conformalCoveragePct: 0,
          benchmark: '',
          evaluatedAt: new Date().toISOString()
        };
      }
      throw new Error('Failed to load project-wide accuracy metrics');
    }
    if (res.status === 503) {
      const errBody = parsed.data || {};
      return {
        available: false,
        reason: errBody.reason || 'No live market data',
        dataSource: errBody.dataSource || 'none',
        evaluatedAssetsCount: 0,
        priceAccuracyPct: 0,
        mape: 0,
        mae: 0,
        rmse: 0,
        directionalAccuracyPct: 0,
        conformalCoveragePct: 0,
        benchmark: '',
        evaluatedAt: new Date().toISOString()
      };
    }
    if (!res.ok) throw new Error(parsed.data?.error || 'Failed to load project-wide accuracy metrics');
    return parsed.data;
  },

  // Options Chains & Greeks Analytics
  async getOptionsChain(ticker: string, days = 30): Promise<OptionsChainResponse> {
    const res = await fetch(`${API_BASE}/options/${encodeURIComponent(ticker)}?days=${days}`);
    return parseApiResponse<OptionsChainResponse>(res, `Failed to load options analytics for ${ticker}`);
  },

  async getOptionsSurface(ticker: string): Promise<VolatilitySurfaceData> {
    const res = await fetch(`${API_BASE}/options/${encodeURIComponent(ticker)}/surface`);
    return parseApiResponse<VolatilitySurfaceData>(res, `Failed to load volatility surface for ${ticker}`);
  },


  // Automated Backtesting Framework
  async getAutomatedBacktest(
    ticker = 'NVDA',
    strategy: AutomatedBacktestStrategyId = DEFAULT_BACKTEST_STRATEGY,
    days = 90,
    capital = 100000
  ): Promise<AutomatedBacktestResult> {
    const res = await fetch(
      `${API_BASE}/backtest/automated?ticker=${encodeURIComponent(ticker)}&strategy=${strategy}&days=${days}&capital=${capital}`
    );
    return parseApiResponse<AutomatedBacktestResult>(res, `Failed to run automated backtest for ${ticker}`);
  },

  // Direct Broker Router (Alpaca Paper Gateway)
  async getBrokerAccount(): Promise<BrokerAccount> {
    const res = await fetch(`${API_BASE}/broker/account`, {
      headers: getAuthHeaders()
    });
    return parseApiResponse<BrokerAccount>(res, 'Failed to fetch broker account.');
  },

  async getBrokerOrders(): Promise<BrokerOrder[]> {
    const res = await fetch(`${API_BASE}/broker/orders`, {
      headers: getAuthHeaders()
    });
    return parseApiResponse<BrokerOrder[]>(res, 'Failed to fetch broker orders.');
  },

  async getBrokerTrades(): Promise<BrokerTrade[]> {
    const res = await fetch(`${API_BASE}/broker/trades`, {
      headers: getAuthHeaders()
    });
    return parseApiResponse<BrokerTrade[]>(res, 'Failed to fetch broker trades.');
  },

  async placeBrokerOrder(orderParams: {
    ticker: string;
    side: 'BUY' | 'SELL';
    qty: number;
    type: 'MARKET' | 'LIMIT';
    limitPrice?: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;
    timeInForce?: 'DAY' | 'GTC';
  }): Promise<BrokerOrder> {
    const res = await fetch(`${API_BASE}/broker/order`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(orderParams)
    });
    return parseApiResponse<BrokerOrder>(res, 'Failed to execute broker order.');
  },

  async cancelBrokerOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/broker/order/${orderId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return parseApiResponse<{ success: boolean; message: string }>(res, 'Failed to cancel order.');
  },

  // Social Sentiment & Copy-Trade Feeds
  async getSocialFeed(ticker?: string): Promise<SocialDiscussion[]> {
    const url = ticker ? `${API_BASE}/social/feed?ticker=${encodeURIComponent(ticker)}` : `${API_BASE}/social/feed`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return safeParseJson<SocialDiscussion[]>(res, []);
  },

  async getVerifiedTraders(): Promise<VerifiedTrader[]> {
    const res = await fetch(`${API_BASE}/social/traders`);
    if (!res.ok) return [];
    return safeParseJson<VerifiedTrader[]>(res, []);
  },

  async copyTraderPortfolio(traderId: string): Promise<{ success: boolean; message: string; trader: VerifiedTrader }> {
    const res = await fetch(`${API_BASE}/social/copy-trade`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ traderId })
    });
    return parseApiResponse<{ success: boolean; message: string; trader: VerifiedTrader }>(res, 'Failed to copy trader portfolio.');
  },

  // Floating AlphaBot Copilot
  async sendCopilotChat(message: string, contextTicker?: string): Promise<{ reply: string }> {
    try {
      const res = await fetch(`${API_BASE}/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, contextTicker })
      });
      if (!res.ok) {
        return { reply: 'Unable to reach AlphaBot Copilot service right now.' };
      }
      const parsed = await parseJsonTextSafe<{ reply?: string }>(res);
      if (!parsed.ok || typeof parsed.data?.reply !== 'string') {
        return { reply: 'Unable to reach AlphaBot Copilot service right now.' };
      }
      return { reply: parsed.data.reply };
    } catch {
      return { reply: 'AlphaBot Copilot offline. Please verify network connection.' };
    }
  }
};
