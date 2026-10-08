/**
 * In-Memory & Persistent Storage Engine
 * Manages user accounts, portfolios, watchlists, alerts, and prediction history.
 */

import { PortfolioHolding, WatchlistItem, AlertRule, UserProfile } from '../../types';

export interface UserAccount extends UserProfile {
  passwordHash: string;
}

export interface StoredPrediction {
  id: string;
  userId: string;
  ticker: string;
  predictedPrice: number;
  currentPrice: number;
  lowerBound: number;
  upperBound: number;
  confidenceLevel: number;
  marketRegime: string;
  sentimentScore: number;
  timestamp: string;
}

// Initial default user for seamless instant evaluation & demo mode
const DEFAULT_USER_ID = 'user-alphaquant-demo-1';
const defaultUser: UserAccount = {
  id: DEFAULT_USER_ID,
  name: 'Alex Morgan, CFA',
  email: 'alex.morgan@alphaquant.ai',
  createdAt: '2026-01-15T09:00:00.000Z',
  passwordHash: '$2a$10$demoHashedPasswordPlaceholderForAlphaQuantSecurity1',
  isDemoUser: true
};

const users = new Map<string, UserAccount>([[defaultUser.email, defaultUser]]);

// Seed portfolio holdings
const portfolios = new Map<string, PortfolioHolding[]>([
  [
    DEFAULT_USER_ID,
    [
      {
        id: 'hold-1',
        ticker: 'RELIANCE.NS',
        companyName: 'Reliance Industries Ltd.',
        quantity: 50,
        avgBuyPrice: 2820.00,
        currentPrice: 2980.50,
        totalInvested: 141000.00,
        currentValue: 149025.00,
        pnl: 8025.00,
        pnlPercent: 5.69,
        purchaseDate: '2026-04-12',
        notes: 'Core Indian conglomerate holding'
      },
      {
        id: 'hold-2',
        ticker: 'NVDA',
        companyName: 'NVIDIA Corporation',
        quantity: 120,
        avgBuyPrice: 108.50,
        currentPrice: 128.40,
        totalInvested: 13020.00,
        currentValue: 15408.00,
        pnl: 2388.00,
        pnlPercent: 18.34,
        purchaseDate: '2026-03-20',
        notes: 'AI infrastructure semiconductor leader'
      },
      {
        id: 'hold-3',
        ticker: 'TCS.NS',
        companyName: 'Tata Consultancy Services',
        quantity: 25,
        avgBuyPrice: 4050.00,
        currentPrice: 4210.75,
        totalInvested: 101250.00,
        currentValue: 105268.75,
        pnl: 4018.75,
        pnlPercent: 3.97,
        purchaseDate: '2026-05-18',
        notes: 'IT services defensive yield'
      },
      {
        id: 'hold-4',
        ticker: 'MSFT',
        companyName: 'Microsoft Corporation',
        quantity: 30,
        avgBuyPrice: 425.00,
        currentPrice: 442.10,
        totalInvested: 12750.00,
        currentValue: 13263.00,
        pnl: 513.00,
        pnlPercent: 4.02,
        purchaseDate: '2026-06-01',
        notes: 'Enterprise cloud & generative AI exposure'
      }
    ]
  ]
]);

// Seed watchlist
const watchlists = new Map<string, string[]>([
  [DEFAULT_USER_ID, ['RELIANCE.NS', 'TCS.NS', 'NVDA', 'AAPL', 'INFY.NS', 'HDFCBANK.NS', 'TSLA']]
]);

// Seed alerts
const alerts = new Map<string, AlertRule[]>([
  [
    DEFAULT_USER_ID,
    [
      {
        id: 'alert-1',
        ticker: 'RELIANCE.NS',
        type: 'price_above',
        threshold: 3050.0,
        label: 'Breakout above ₹3,050 resistance',
        enabled: true,
        createdAt: '2026-08-10T10:00:00.000Z'
      },
      {
        id: 'alert-2',
        ticker: 'NVDA',
        type: 'regime_shift',
        label: 'Alert on High-Volatility Bearish regime transition',
        enabled: true,
        createdAt: '2026-08-12T14:30:00.000Z'
      },
      {
        id: 'alert-3',
        ticker: 'TCS.NS',
        type: 'drift_detected',
        label: 'Model Safety: Alert when feature drift is detected',
        enabled: true,
        createdAt: '2026-08-14T09:15:00.000Z'
      }
    ]
  ]
]);

// Seed prediction history
const predictionHistory: StoredPrediction[] = [
  {
    id: 'pred-1',
    userId: DEFAULT_USER_ID,
    ticker: 'RELIANCE.NS',
    currentPrice: 2980.50,
    predictedPrice: 3025.80,
    lowerBound: 2915.20,
    upperBound: 3136.40,
    confidenceLevel: 0.90,
    marketRegime: 'Low Volatility / Bullish',
    sentimentScore: 0.72,
    timestamp: '2026-10-05T15:30:00.000Z'
  },
  {
    id: 'pred-2',
    userId: DEFAULT_USER_ID,
    ticker: 'NVDA',
    currentPrice: 128.40,
    predictedPrice: 132.80,
    lowerBound: 122.60,
    upperBound: 143.00,
    confidenceLevel: 0.90,
    marketRegime: 'Low Volatility / Bullish',
    sentimentScore: 0.81,
    timestamp: '2026-10-05T20:00:00.000Z'
  }
];

export const db = {
  // Users
  getUserByEmail: (email: string) => users.get(email),
  getUserById: (id: string) => Array.from(users.values()).find(u => u.id === id),
  createUser: (user: UserAccount) => {
    users.set(user.email, user);
    portfolios.set(user.id, []);
    watchlists.set(user.id, ['RELIANCE.NS', 'NVDA', 'AAPL']);
    alerts.set(user.id, []);
    return user;
  },

  // Portfolios
  getPortfolio: (userId: string): PortfolioHolding[] => portfolios.get(userId) || [],
  addHolding: (userId: string, holding: PortfolioHolding) => {
    const list = portfolios.get(userId) || [];
    list.push(holding);
    portfolios.set(userId, list);
    return holding;
  },
  updateHolding: (userId: string, id: string, updates: Partial<PortfolioHolding>) => {
    const list = portfolios.get(userId) || [];
    const idx = list.findIndex(h => h.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      portfolios.set(userId, list);
      return list[idx];
    }
    return null;
  },
  deleteHolding: (userId: string, id: string) => {
    const list = portfolios.get(userId) || [];
    const filtered = list.filter(h => h.id !== id);
    portfolios.set(userId, filtered);
    return true;
  },

  // Watchlists
  getWatchlist: (userId: string): string[] => watchlists.get(userId) || [],
  addToWatchlist: (userId: string, ticker: string) => {
    const list = watchlists.get(userId) || [];
    if (!list.includes(ticker)) {
      list.push(ticker);
      watchlists.set(userId, list);
    }
    return list;
  },
  removeFromWatchlist: (userId: string, ticker: string) => {
    const list = watchlists.get(userId) || [];
    const filtered = list.filter(t => t !== ticker);
    watchlists.set(userId, filtered);
    return filtered;
  },

  // Alerts
  getAlerts: (userId: string): AlertRule[] => alerts.get(userId) || [],
  createAlert: (userId: string, alert: AlertRule) => {
    const list = alerts.get(userId) || [];
    list.push(alert);
    alerts.set(userId, list);
    return alert;
  },
  toggleAlert: (userId: string, alertId: string, enabled: boolean) => {
    const list = alerts.get(userId) || [];
    const target = list.find(a => a.id === alertId);
    if (target) {
      target.enabled = enabled;
    }
    return target;
  },
  deleteAlert: (userId: string, alertId: string) => {
    const list = alerts.get(userId) || [];
    alerts.set(userId, list.filter(a => a.id !== alertId));
    return true;
  },

  // Prediction History
  addPrediction: (pred: StoredPrediction) => {
    predictionHistory.unshift(pred);
    if (predictionHistory.length > 100) predictionHistory.pop();
    return pred;
  },
  getPredictionHistory: (userId?: string, ticker?: string) => {
    let res = predictionHistory;
    if (userId) res = res.filter(p => p.userId === userId);
    if (ticker) res = res.filter(p => p.ticker === ticker);
    return res;
  }
};
