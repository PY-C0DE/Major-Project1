/**
 * Frontend API Service
 * Connects to the full-stack REST API endpoints with authentication tokens.
 */

import {
  StockQuote,
  HistoricalBar,
  ConformalPrediction,
  MarketRegime,
  NewsItem,
  ConceptDriftResult,
  ModelEvaluation,
  PortfolioHolding,
  WatchlistItem,
  AlertRule,
  UserProfile,
  StrategyPerformanceMetrics,
  CorrelationMatrixData,
  PortfolioOptimizationResult,
  RebalanceSuggestion
} from '../types';
import { generateSupportFallback } from '../utils/supportKnowledge';

const API_BASE = '/api';

async function safeParseJson<T>(res: Response, fallbackValue: T): Promise<T> {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
  } catch {
    // ignore parse error and use fallback
  }
  return fallbackValue;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('alphaquant_token');
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
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to register');
    }
    return res.json();
  },

  async login(email: string, password: string): Promise<{ user: UserProfile; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Invalid email or password');
    }
    return res.json();
  },

  async getCurrentUser(): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Unauthenticated');
    return res.json();
  },

  // Stocks & History
  async searchStocks(query: string) {
    const res = await fetch(`${API_BASE}/stocks/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search stocks');
    return res.json();
  },

  async getQuote(ticker: string): Promise<StockQuote> {
    const res = await fetch(`${API_BASE}/stocks/${encodeURIComponent(ticker)}`);
    if (!res.ok) throw new Error(`Failed to fetch quote for ${ticker}`);
    return res.json();
  },

  async getHistory(ticker: string, days = 250): Promise<HistoricalBar[]> {
    const res = await fetch(`${API_BASE}/stocks/${encodeURIComponent(ticker)}/history?days=${days}`);
    if (!res.ok) throw new Error(`Failed to fetch history for ${ticker}`);
    return res.json();
  },

  // Core USPs
  async getConformalPrediction(ticker: string, horizon = 1, confidence = 0.90): Promise<ConformalPrediction> {
    const res = await fetch(`${API_BASE}/predictions/${encodeURIComponent(ticker)}?horizon=${horizon}&confidence=${confidence}`);
    if (!res.ok) throw new Error('Failed to compute conformal prediction');
    return res.json();
  },

  async recordPrediction(ticker: string): Promise<ConformalPrediction> {
    const res = await fetch(`${API_BASE}/predictions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ticker })
    });
    if (!res.ok) throw new Error('Failed to record prediction');
    return res.json();
  },

  async getStrategyBacktest(ticker = 'RELIANCE.NS', strategy = 'conformal_reversion'): Promise<StrategyPerformanceMetrics> {
    const res = await fetch(`${API_BASE}/strategy/backtest?ticker=${encodeURIComponent(ticker)}&strategy=${encodeURIComponent(strategy)}`);
    if (!res.ok) throw new Error('Failed to run strategy backtest');
    return res.json();
  },

  async getMarketCorrelation(): Promise<CorrelationMatrixData> {
    const res = await fetch(`${API_BASE}/markets/correlation`);
    if (!res.ok) throw new Error('Failed to load market correlation matrix');
    return res.json();
  },

  async getPredictionHistory(ticker?: string) {
    const url = ticker ? `${API_BASE}/predictions/history?ticker=${encodeURIComponent(ticker)}` : `${API_BASE}/predictions/history`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to get prediction history');
    return res.json();
  },

  async getMarketRegime(ticker: string): Promise<MarketRegime> {
    const res = await fetch(`${API_BASE}/regime/${encodeURIComponent(ticker)}`);
    if (!res.ok) throw new Error('Failed to compute market regime');
    return res.json();
  },

  async getConceptDrift(ticker: string): Promise<ConceptDriftResult> {
    const res = await fetch(`${API_BASE}/drift/${encodeURIComponent(ticker)}`);
    if (!res.ok) throw new Error('Failed to run drift detection');
    return res.json();
  },

  async getNews(ticker: string): Promise<NewsItem[]> {
    const res = await fetch(`${API_BASE}/news/${encodeURIComponent(ticker)}`);
    if (!res.ok) throw new Error('Failed to fetch news');
    return res.json();
  },

  async getSentiment(ticker: string) {
    const res = await fetch(`${API_BASE}/sentiment/${encodeURIComponent(ticker)}`);
    if (!res.ok) throw new Error('Failed to compute sentiment');
    return res.json();
  },

  async getModelMetrics(ticker = 'RELIANCE.NS'): Promise<ModelEvaluation> {
    const res = await fetch(`${API_BASE}/model/metrics?ticker=${encodeURIComponent(ticker)}`);
    if (!res.ok) throw new Error('Failed to fetch model metrics');
    return res.json();
  },

  async getModelHealth() {
    const res = await fetch(`${API_BASE}/model/health`);
    if (!res.ok) throw new Error('Failed to fetch model health');
    return res.json();
  },

  // Portfolio CRUD
  async getPortfolio(): Promise<PortfolioHolding[]> {
    const res = await fetch(`${API_BASE}/portfolio`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to get portfolio');
    return res.json();
  },

  async addHolding(data: { ticker: string; quantity: number; avgBuyPrice: number; purchaseDate?: string; notes?: string }): Promise<PortfolioHolding> {
    const res = await fetch(`${API_BASE}/portfolio`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to add holding');
    return res.json();
  },

  async deleteHolding(id: string) {
    const res = await fetch(`${API_BASE}/portfolio/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete holding');
    return res.json();
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
    if (!res.ok) throw new Error('Failed to compute portfolio optimization');
    return res.json();
  },

  async applyRebalance(suggestions: RebalanceSuggestion[]): Promise<{ success: boolean; message: string; holdings: PortfolioHolding[] }> {
    const res = await fetch(`${API_BASE}/portfolio/rebalance/apply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ suggestions })
    });
    if (!res.ok) throw new Error('Failed to apply portfolio rebalancing');
    return res.json();
  },

  // Watchlist CRUD
  async getWatchlist(): Promise<WatchlistItem[]> {
    const res = await fetch(`${API_BASE}/watchlist`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to get watchlist');
    return res.json();
  },

  async addToWatchlist(ticker: string) {
    const res = await fetch(`${API_BASE}/watchlist`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ticker })
    });
    if (!res.ok) throw new Error('Failed to add to watchlist');
    return res.json();
  },

  async removeFromWatchlist(ticker: string) {
    const res = await fetch(`${API_BASE}/watchlist/${encodeURIComponent(ticker)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to remove from watchlist');
    return res.json();
  },

  // Alerts CRUD
  async getAlerts(): Promise<AlertRule[]> {
    const res = await fetch(`${API_BASE}/alerts`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to get alerts');
    return res.json();
  },

  async createAlert(data: { ticker: string; type: string; threshold?: number; label: string }): Promise<AlertRule> {
    const res = await fetch(`${API_BASE}/alerts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create alert');
    return res.json();
  },

  async toggleAlert(id: string, enabled: boolean): Promise<AlertRule> {
    const res = await fetch(`${API_BASE}/alerts/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ enabled })
    });
    if (!res.ok) throw new Error('Failed to update alert');
    return res.json();
  },

  async deleteAlert(id: string) {
    const res = await fetch(`${API_BASE}/alerts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete alert');
    return res.json();
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

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return localFallback;
      }

      const data = await res.json();
      if (!data || typeof data.reply !== 'string') {
        return localFallback;
      }

      return data;
    } catch {
      // Return instant local domain knowledge response if network fails
      return localFallback;
    }
  }
};
