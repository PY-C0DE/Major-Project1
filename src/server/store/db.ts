/**
 * In-Memory & File-Persistent Storage Engine
 * Manages user accounts, portfolios, watchlists, alerts, and prediction history
 * with automated JSON file persistence on disk to preserve user state across logouts and server reloads.
 */

import fs from 'fs';
import path from 'path';
import { PortfolioHolding, AlertRule, UserProfile } from '../../types';

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

interface PersistedState {
  users: [string, UserAccount][];
  portfolios: [string, PortfolioHolding[]][];
  watchlists: [string, string[]][];
  alerts: [string, AlertRule[]][];
  predictionHistory: StoredPrediction[];
}

// Storage file location
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'alphaquant_store.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create data directory, falling back to memory-only storage:', e);
}

// Initial default user for seamless instant evaluation & demo mode
const DEFAULT_USER_ID = 'user-alphaquant-demo-1';
const defaultUser: UserAccount = {
  id: DEFAULT_USER_ID,
  name: 'Alex Morgan, CFA',
  email: 'alex.morgan@alphaquant.ai',
  createdAt: '2026-01-15T09:00:00.000Z',
  passwordHash: '$2a$10$demoHashedPasswordPlaceholderForAlphaQuantSecurity1',
  isDemoUser: true,
  title: 'Lead Quantitative Strategist',
  organization: 'Morgan Capital Alpha Desk',
  phone: '+91 98765 43210',
  timezone: 'Asia/Kolkata (IST)',
  bio: 'Institutional quantitative portfolio manager focusing on tail-risk mitigation and conformal forecast envelopes.',
  currencyPreference: 'INR',
  defaultExchange: 'NSE',
  confidenceLevel: 95,
  twoFactorEnabled: true,
  notifications: {
    emailAlerts: true,
    regimeShifts: true,
    driftWarnings: true,
    marketOpenSummary: false
  }
};

const defaultPortfolios: [string, PortfolioHolding[]][] = [
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
];

const defaultWatchlists: [string, string[]][] = [
  [DEFAULT_USER_ID, ['RELIANCE.NS', 'TCS.NS', 'NVDA', 'AAPL', 'INFY.NS', 'HDFCBANK.NS', 'TSLA']]
];

const defaultAlerts: [string, AlertRule[]][] = [
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
];

const defaultPredictions: StoredPrediction[] = [
  {
    id: 'pred-1',
    userId: DEFAULT_USER_ID,
    ticker: 'RELIANCE.NS',
    currentPrice: 2980.50,
    predictedPrice: 3025.80,
    lowerBound: 2915.20,
    upperBound: 3136.40,
    confidenceLevel: 0.95,
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
    confidenceLevel: 0.95,
    marketRegime: 'Low Volatility / Bullish',
    sentimentScore: 0.81,
    timestamp: '2026-10-05T20:00:00.000Z'
  }
];

let users = new Map<string, UserAccount>([[defaultUser.email.toLowerCase(), defaultUser]]);
let portfolios = new Map<string, PortfolioHolding[]>(defaultPortfolios);
let watchlists = new Map<string, string[]>(defaultWatchlists);
let alerts = new Map<string, AlertRule[]>(defaultAlerts);
let predictionHistory: StoredPrediction[] = [...defaultPredictions];

// Function to save state to disk
function saveToDisk() {
  try {
    const state: PersistedState = {
      users: Array.from(users.entries()),
      portfolios: Array.from(portfolios.entries()),
      watchlists: Array.from(watchlists.entries()),
      alerts: Array.from(alerts.entries()),
      predictionHistory
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save AlphaQuant store to disk:', err);
  }
}

// Function to load state from disk
function loadFromDisk() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      if (raw && raw.trim().length > 0) {
        const parsed: PersistedState = JSON.parse(raw);
        if (parsed.users && Array.isArray(parsed.users)) {
          users = new Map(parsed.users);
          // Ensure default user exists if not already
          if (!users.has(defaultUser.email.toLowerCase())) {
            users.set(defaultUser.email.toLowerCase(), defaultUser);
          }
        }
        if (parsed.portfolios && Array.isArray(parsed.portfolios)) {
          portfolios = new Map(parsed.portfolios);
        }
        if (parsed.watchlists && Array.isArray(parsed.watchlists)) {
          watchlists = new Map(parsed.watchlists);
        }
        if (parsed.alerts && Array.isArray(parsed.alerts)) {
          alerts = new Map(parsed.alerts);
        }
        if (parsed.predictionHistory && Array.isArray(parsed.predictionHistory)) {
          predictionHistory = parsed.predictionHistory;
        }
        console.log(`[Storage] Loaded persistent database with ${users.size} users, ${portfolios.size} portfolios from disk.`);
        return;
      }
    }
    // If file doesn't exist, save default state to disk
    saveToDisk();
  } catch (err) {
    console.warn('Failed to load AlphaQuant store from disk, running with defaults:', err);
  }
}

// Initialize on boot
loadFromDisk();

export const db = {
  // Users
  getUserByEmail: (email: string) => users.get(email.toLowerCase()),
  getUserById: (id: string) => Array.from(users.values()).find(u => u.id === id),
  createUser: (user: UserAccount) => {
    users.set(user.email.toLowerCase(), user);
    if (!portfolios.has(user.id)) {
      portfolios.set(user.id, []);
    }
    if (!watchlists.has(user.id)) {
      watchlists.set(user.id, ['RELIANCE.NS', 'NVDA', 'AAPL', 'TCS.NS']);
    }
    if (!alerts.has(user.id)) {
      alerts.set(user.id, []);
    }
    saveToDisk();
    return user;
  },
  updateUser: (userId: string, updates: Partial<UserAccount>) => {
    const existing = Array.from(users.values()).find(u => u.id === userId);
    if (!existing) return null;

    const updatedUser: UserAccount = {
      ...existing,
      ...updates,
      // Prevent id and createdAt from being altered
      id: existing.id,
      createdAt: existing.createdAt
    };

    // If email changed, delete old key
    if (updates.email && updates.email.toLowerCase() !== existing.email.toLowerCase()) {
      users.delete(existing.email.toLowerCase());
    }

    users.set(updatedUser.email.toLowerCase(), updatedUser);
    saveToDisk();
    return updatedUser;
  },

  // Portfolios
  getPortfolio: (userId: string): PortfolioHolding[] => portfolios.get(userId) || [],
  addHolding: (userId: string, holding: PortfolioHolding) => {
    const list = portfolios.get(userId) || [];
    list.push(holding);
    portfolios.set(userId, list);
    saveToDisk();
    return holding;
  },
  updateHolding: (userId: string, id: string, updates: Partial<PortfolioHolding>) => {
    const list = portfolios.get(userId) || [];
    const idx = list.findIndex(h => h.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      portfolios.set(userId, list);
      saveToDisk();
      return list[idx];
    }
    return null;
  },
  deleteHolding: (userId: string, id: string) => {
    const list = portfolios.get(userId) || [];
    const filtered = list.filter(h => h.id !== id);
    portfolios.set(userId, filtered);
    saveToDisk();
    return true;
  },

  // Watchlists
  getWatchlist: (userId: string): string[] => watchlists.get(userId) || [],
  addToWatchlist: (userId: string, ticker: string) => {
    const list = watchlists.get(userId) || [];
    if (!list.includes(ticker)) {
      list.push(ticker);
      watchlists.set(userId, list);
      saveToDisk();
    }
    return list;
  },
  removeFromWatchlist: (userId: string, ticker: string) => {
    const list = watchlists.get(userId) || [];
    const filtered = list.filter(t => t !== ticker);
    watchlists.set(userId, filtered);
    saveToDisk();
    return filtered;
  },

  // Alerts
  getAlerts: (userId: string): AlertRule[] => alerts.get(userId) || [],
  createAlert: (userId: string, alert: AlertRule) => {
    const list = alerts.get(userId) || [];
    list.push(alert);
    alerts.set(userId, list);
    saveToDisk();
    return alert;
  },
  toggleAlert: (userId: string, alertId: string, enabled: boolean) => {
    const list = alerts.get(userId) || [];
    const target = list.find(a => a.id === alertId);
    if (target) {
      target.enabled = enabled;
      saveToDisk();
    }
    return target;
  },
  deleteAlert: (userId: string, alertId: string) => {
    const list = alerts.get(userId) || [];
    alerts.set(userId, list.filter(a => a.id !== alertId));
    saveToDisk();
    return true;
  },

  // Prediction History
  addPrediction: (pred: StoredPrediction) => {
    predictionHistory.unshift(pred);
    if (predictionHistory.length > 200) predictionHistory.pop();
    saveToDisk();
    return pred;
  },
  getPredictionHistory: (userId?: string, ticker?: string) => {
    let res = predictionHistory;
    if (userId) res = res.filter(p => p.userId === userId);
    if (ticker) res = res.filter(p => p.ticker === ticker);
    return res;
  }
};
