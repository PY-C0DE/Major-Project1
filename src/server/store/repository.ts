import fs from 'fs';
import path from 'path';
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import {
  AlertRule,
  DailySentimentRecord,
  PortfolioHolding,
  TickerMasterItem,
  TickerSearchResponse,
  UserProfile
} from '../../types';
import { getDb, AlphaQuantDrizzleDb } from '../../db/index.ts';
import {
  alerts as alertsTable,
  authTokens as authTokensTable,
  dailySentiment as dailySentimentTable,
  portfolios as portfoliosTable,
  predictionHistory as predictionHistoryTable,
  tickerMaster as tickerMasterTable,
  users as usersTable,
  watchlists as watchlistsTable
} from '../../db/schema.ts';
import { getSeededCatalogTickers } from '../../shared/tickerMetadata';
import { inferCurrencyFromTicker } from '../../utils/currency';

export type AuthTokenPurpose = 'email_verification' | 'password_reset';

export interface AuthTokenRecord {
  id: string;
  userId: string;
  purpose: AuthTokenPurpose;
  tokenHash: string;
  expiresAt: string;
  usedAt?: string | null;
}

export interface ExportedAuthTokenMetadata {
  id: string;
  purpose: AuthTokenPurpose;
  expiresAt: string;
  usedAt?: string | null;
}

export interface UserDataExport {
  exportedAt: string;
  user: UserProfile;
  portfolio: PortfolioHolding[];
  watchlist: string[];
  alerts: AlertRule[];
  predictionHistory: StoredPrediction[];
  authTokens: ExportedAuthTokenMetadata[];
}

export interface UserAccount extends UserProfile {
  passwordHash: string;
  uid?: string | null;
}

export interface StoredPrediction {
  id: string;
  userId: string;
  ticker: string;
  currency?: string;
  predictedPrice: number;
  currentPrice: number;
  lowerBound: number;
  upperBound: number;
  confidenceLevel: number;
  marketRegime: string;
  sentimentScore: number;
  timestamp: string;
}

export interface DailySentimentUpsertSummary {
  inserted: number;
  updatedToday: number;
  skippedExistingPast: number;
  skippedInvalid: number;
}

export interface TickerSearchParams {
  q?: string;
  country?: string;
  exchange?: string;
  page?: number;
  limit?: number;
  activeOnly?: boolean;
}

export interface LegacyJsonSnapshot {
  users?: [string, UserAccount][];
  portfolios?: [string, PortfolioHolding[]][];
  watchlists?: [string, string[]][];
  alerts?: [string, AlertRule[]][];
  predictionHistory?: StoredPrediction[];
  dailySentiment?: [string, DailySentimentRecord][];
}

export interface DatabaseRepository {
  // Users
  getUserByEmail(email: string): Promise<UserAccount | undefined>;
  getUserById(id: string): Promise<UserAccount | undefined>;
  getUserByFirebaseUid(uid: string): Promise<UserAccount | undefined>;
  getOrCreateFirebaseUser(profile: {
    uid: string;
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
  }): Promise<UserAccount>;
  createUser(user: UserAccount): Promise<UserAccount>;
  updateUser(userId: string, updates: Partial<UserAccount>): Promise<UserAccount | null>;
  deleteUser(userId: string): Promise<boolean>;
  exportUserData(userId: string): Promise<UserDataExport | null>;

  // Auth Tokens (Email Verification & Password Reset)
  createAuthToken(token: {
    id: string;
    userId: string;
    purpose: AuthTokenPurpose;
    tokenHash: string;
    expiresAt: string;
  }): Promise<AuthTokenRecord>;
  consumeAuthToken(purpose: AuthTokenPurpose, tokenHash: string, nowIso?: string): Promise<AuthTokenRecord | null>;
  markEmailVerified(userId: string): Promise<UserAccount | null>;
  updateUserPassword(userId: string, passwordHash: string): Promise<UserAccount | null>;

  // Portfolios
  getPortfolio(userId: string): Promise<PortfolioHolding[]>;
  savePortfolio(userId: string, holdings: PortfolioHolding[]): Promise<PortfolioHolding[]>;
  addHolding(userId: string, holding: PortfolioHolding): Promise<PortfolioHolding>;
  updateHolding(userId: string, id: string, updates: Partial<PortfolioHolding>): Promise<PortfolioHolding | null>;
  deleteHolding(userId: string, id: string): Promise<boolean>;

  // Watchlists
  getWatchlist(userId: string): Promise<string[]>;
  addToWatchlist(userId: string, ticker: string): Promise<string[]>;
  removeFromWatchlist(userId: string, ticker: string): Promise<string[]>;

  // Alerts
  getAlerts(userId: string): Promise<AlertRule[]>;
  createAlert(userId: string, alert: AlertRule): Promise<AlertRule>;
  toggleAlert(userId: string, alertId: string, enabled: boolean): Promise<AlertRule | undefined>;
  deleteAlert(userId: string, alertId: string): Promise<boolean>;

  // Prediction History
  addPrediction(pred: StoredPrediction): Promise<StoredPrediction>;
  getPredictionHistory(userId?: string, ticker?: string): Promise<StoredPrediction[]>;

  // Daily Sentiment
  upsertDailySentiment(
    records: DailySentimentRecord[],
    options?: { todayDate?: string; persist?: boolean }
  ): Promise<DailySentimentUpsertSummary>;
  getDailySentimentForTicker(ticker: string): Promise<DailySentimentRecord[]>;
  getAllDailySentiment(): Promise<DailySentimentRecord[]>;
  getDailySentimentCountsByTicker(): Promise<Record<string, number>>;

  // Global Ticker Master
  searchTickers(params: TickerSearchParams): Promise<TickerSearchResponse>;
  getTickerBySymbol(symbol: string): Promise<TickerMasterItem | undefined>;
  resolveTickerSymbol(query: string): Promise<TickerMasterItem | undefined>;
  upsertTickers(items: TickerMasterItem[]): Promise<{ upserted: number }>;
  getAllTickers(activeOnly?: boolean): Promise<TickerMasterItem[]>;

  // Snapshot & Test Lifecycle
  importSnapshot(snapshot: LegacyJsonSnapshot): Promise<{
    users: number;
    portfolios: number;
    watchlists: number;
    alerts: number;
    predictions: number;
    dailySentiment: number;
  }>;
  flushToDisk(): Promise<void>;
  reloadStoreFromDisk(customPath?: string): Promise<void>;
  getStoreFilePath(): string;
}

export const DEFAULT_USER_ID = 'user-alphaquant-demo-1';

export const defaultUser: UserAccount = {
  id: DEFAULT_USER_ID,
  uid: null,
  name: 'Alex Morgan, CFA',
  email: 'alex.morgan@alphaquant.ai',
  emailVerified: true,
  tokenVersion: 1,
  createdAt: '2026-01-15T09:00:00.000Z',
  passwordHash: '$2b$10$6RaciIhx/9S4Iq8gYWq5A.1T6UV2ZAU.bCwvO/UBx06i1PzpM91kq', // bcrypt hash for 'demo1234'
  isDemoUser: true,
  title: 'Lead Quantitative Strategist',
  organization: 'Morgan Capital Alpha Desk',
  phone: '+91 98765 43210',
  timezone: 'Asia/Kolkata (IST)',
  bio: 'Institutional quantitative portfolio manager focusing on tail-risk mitigation and conformal forecast envelopes.',
  currencyPreference: 'INR',
  defaultExchange: 'NSE',
  confidenceLevel: 90,
  twoFactorEnabled: true,
  notifications: {
    emailAlerts: true,
    regimeShifts: true,
    driftWarnings: true,
    marketOpenSummary: false
  }
};

export const defaultPortfolios: [string, PortfolioHolding[]][] = [
  [
    DEFAULT_USER_ID,
    [
      {
        id: 'hold-1',
        ticker: 'RELIANCE.NS',
        companyName: 'Reliance Industries Ltd.',
        quantity: 50,
        avgBuyPrice: 2820.0,
        currentPrice: 2980.5,
        totalInvested: 141000.0,
        currentValue: 149025.0,
        pnl: 8025.0,
        pnlPercent: 5.69,
        purchaseDate: '2026-04-12',
        currency: 'INR',
        notes: 'Core Indian conglomerate holding'
      },
      {
        id: 'hold-2',
        ticker: 'NVDA',
        companyName: 'NVIDIA Corporation',
        quantity: 120,
        avgBuyPrice: 108.5,
        currentPrice: 128.4,
        totalInvested: 13020.0,
        currentValue: 15408.0,
        pnl: 2388.0,
        pnlPercent: 18.34,
        purchaseDate: '2026-03-20',
        currency: 'USD',
        notes: 'AI infrastructure semiconductor leader'
      },
      {
        id: 'hold-3',
        ticker: 'TCS.NS',
        companyName: 'Tata Consultancy Services',
        quantity: 25,
        avgBuyPrice: 4050.0,
        currentPrice: 4210.75,
        totalInvested: 101250.0,
        currentValue: 105268.75,
        pnl: 4018.75,
        pnlPercent: 3.97,
        purchaseDate: '2026-05-18',
        currency: 'INR',
        notes: 'IT services defensive yield'
      },
      {
        id: 'hold-4',
        ticker: 'MSFT',
        companyName: 'Microsoft Corporation',
        quantity: 30,
        avgBuyPrice: 425.0,
        currentPrice: 442.1,
        totalInvested: 12750.0,
        currentValue: 13263.0,
        pnl: 513.0,
        pnlPercent: 4.02,
        purchaseDate: '2026-06-01',
        currency: 'USD',
        notes: 'Enterprise cloud & generative AI exposure'
      }
    ]
  ]
];

export const defaultWatchlists: [string, string[]][] = [
  [DEFAULT_USER_ID, ['RELIANCE.NS', 'TCS.NS', 'NVDA', 'AAPL', 'INFY.NS', 'HDFCBANK.NS', 'TSLA']]
];

export const defaultAlerts: [string, AlertRule[]][] = [
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
        type: 'var_exceeded',
        threshold: 3.8,
        varConfidenceLevel: 95,
        varHorizonDays: 1,
        varThresholdPct: 3.8,
        varThresholdDollar: 650.0,
        varMetric: 'parametric',
        riskCategory: 'Value-at-Risk (VaR)',
        riskSeverity: 'Critical Tail Risk',
        currentMetricValue: 3.42,
        label: 'Tail Risk Trigger: 1-Day 95% VaR exceeds 3.80% capital threshold',
        enabled: true,
        createdAt: '2026-08-12T14:30:00.000Z'
      },
      {
        id: 'alert-3',
        ticker: 'TSLA',
        type: 'volatility_spike',
        threshold: 40.0,
        volatilityThresholdPct: 40.0,
        volatilityLookbackDays: 30,
        volatilityMetric: 'annualized',
        riskCategory: 'Volatility Surge',
        riskSeverity: 'High Risk',
        currentMetricValue: 37.8,
        label: 'Volatility Alert: 30-Day Annualized Volatility surges above 40.0%',
        enabled: true,
        createdAt: '2026-08-13T11:20:00.000Z'
      },
      {
        id: 'alert-4',
        ticker: 'AAPL',
        type: 'rsi_cross',
        threshold: 30.0,
        rsiThreshold: 30.0,
        rsiCondition: 'oversold_30',
        rsiPeriod: 14,
        currentRsiValue: 33.4,
        direction: 'below',
        riskCategory: 'RSI Momentum',
        riskSeverity: 'Warning',
        label: 'RSI Oversold Alert: AAPL 14-Period RSI crosses below 30 (Dip Buy Signal)',
        pushEnabled: true,
        emailEnabled: true,
        channels: ['push', 'email'],
        enabled: true,
        createdAt: '2026-08-14T08:30:00.000Z'
      },
      {
        id: 'alert-5',
        ticker: 'NVDA',
        type: 'rsi_cross',
        threshold: 70.0,
        rsiThreshold: 70.0,
        rsiCondition: 'overbought_70',
        rsiPeriod: 14,
        currentRsiValue: 68.2,
        direction: 'above',
        riskCategory: 'RSI Momentum',
        riskSeverity: 'Warning',
        label: 'RSI Overbought Alert: NVDA 14-Period RSI crosses above 70 (Take-Profit Signal)',
        pushEnabled: true,
        emailEnabled: true,
        channels: ['push', 'email'],
        enabled: true,
        createdAt: '2026-08-14T10:15:00.000Z'
      },
      {
        id: 'alert-6',
        ticker: 'TCS.NS',
        type: 'drift_detected',
        label: 'Model Safety: Alert when feature drift is detected',
        enabled: true,
        createdAt: '2026-08-14T11:00:00.000Z'
      }
    ]
  ]
];

export const defaultPredictions: StoredPrediction[] = [
  {
    id: 'pred-1',
    userId: DEFAULT_USER_ID,
    ticker: 'RELIANCE.NS',
    currency: 'INR',
    currentPrice: 2980.5,
    predictedPrice: 3025.8,
    lowerBound: 2915.2,
    upperBound: 3136.4,
    confidenceLevel: 0.9,
    marketRegime: 'Low Volatility / Bullish',
    sentimentScore: 0.72,
    timestamp: '2026-10-05T15:30:00.000Z'
  },
  {
    id: 'pred-2',
    userId: DEFAULT_USER_ID,
    ticker: 'NVDA',
    currency: 'USD',
    currentPrice: 128.4,
    predictedPrice: 132.8,
    lowerBound: 122.6,
    upperBound: 143.0,
    confidenceLevel: 0.9,
    marketRegime: 'Low Volatility / Bullish',
    sentimentScore: 0.81,
    timestamp: '2026-10-05T20:00:00.000Z'
  }
];

function dailySentimentKey(ticker: string, date: string): string {
  return `${ticker.trim().toUpperCase()}::${date.trim()}`;
}

export function isValidIsoDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

/**
 * Deterministic ranked ticker search across symbol, name, aliases, and sector.
 * Higher scores appear first: exact symbol > exact name/alias > symbol prefix > name/alias prefix > substring.
 */
export function rankTickerItem(item: TickerMasterItem, rawQuery: string): number {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return 1;

  const sym = item.symbol.toLowerCase();
  const baseSym = sym.split('.')[0];
  const name = item.name.toLowerCase();
  const aliases = (item.aliases || []).map((a) => a.toLowerCase());
  const sector = (item.sector || '').toLowerCase();

  if (sym === q || baseSym === q) return 1000;
  if (name === q || aliases.includes(q)) return 900;
  if (sym.startsWith(q) || baseSym.startsWith(q)) return 800;
  if (name.startsWith(q) || aliases.some((a) => a.startsWith(q))) return 700;
  if (sym.includes(q)) return 600;
  if (name.includes(q) || aliases.some((a) => a.includes(q))) return 500;
  if (sector.includes(q)) return 350;
  return 0;
}

export function buildSearchResponseFromItems(
  allItems: TickerMasterItem[],
  params: TickerSearchParams
): TickerSearchResponse {
  const activeOnly = params.activeOnly !== false;
  const activePool = allItems.filter((item) => (!activeOnly ? true : item.active));

  const countrySet = new Set<string>();
  const exchangeMap = new Map<string, { mic: string; code: string; country: string }>();
  for (const item of activePool) {
    if (item.country) countrySet.add(item.country);
    if (item.exchange) {
      const key = `${item.exchange}::${item.country}`;
      if (!exchangeMap.has(key)) {
        exchangeMap.set(key, {
          mic: item.exchange,
          code: item.exchangeCode || item.exchange,
          country: item.country
        });
      }
    }
  }

  const countryFilter = params.country?.trim().toUpperCase();
  const exchangeFilter = params.exchange?.trim().toUpperCase();
  const q = params.q?.trim() || '';

  let filtered = activePool;
  if (countryFilter && countryFilter !== 'ALL') {
    filtered = filtered.filter((item) => item.country.toUpperCase() === countryFilter);
  }
  if (exchangeFilter && exchangeFilter !== 'ALL') {
    filtered = filtered.filter(
      (item) =>
        item.exchange.toUpperCase() === exchangeFilter ||
        item.exchangeCode.toUpperCase() === exchangeFilter
    );
  }

  const scored: Array<{ item: TickerMasterItem; score: number }> = [];
  for (const item of filtered) {
    const score = rankTickerItem(item, q);
    if (score > 0) {
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.item.symbol.localeCompare(b.item.symbol);
  });

  const limit = Math.min(200, Math.max(1, Number(params.limit) || 24));
  const total = scored.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(totalPages, Math.max(1, Number(params.page) || 1));
  const start = (page - 1) * limit;
  const items = scored.slice(start, start + limit).map((s) => s.item);

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    filters: {
      countries: Array.from(countrySet).sort(),
      exchanges: Array.from(exchangeMap.values()).sort((a, b) => a.code.localeCompare(b.code))
    }
  };
}

function ensureParentDir(filePath: string) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    console.warn('Could not create data directory for in-memory store:', e);
  }
}

export class InMemoryRepository implements DatabaseRepository {
  private users = new Map<string, UserAccount>();
  private portfolios = new Map<string, PortfolioHolding[]>();
  private watchlists = new Map<string, string[]>();
  private alerts = new Map<string, AlertRule[]>();
  private predictionHistory: StoredPrediction[] = [];
  private dailySentiment = new Map<string, DailySentimentRecord>();
  private tickerMaster = new Map<string, TickerMasterItem>();
  private authTokens = new Map<string, AuthTokenRecord>();
  private activeStoreFile: string | null;
  private saveMutex = Promise.resolve();

  constructor(options?: { filePath?: string | null }) {
    this.activeStoreFile = options?.filePath ? path.resolve(process.cwd(), options.filePath) : null;
    this.seedDefaults();
    if (this.activeStoreFile) {
      this.loadFile(this.activeStoreFile);
    }
  }

  private seedDefaults() {
    this.users = new Map([[defaultUser.email.toLowerCase(), { ...defaultUser, notifications: { ...defaultUser.notifications! } }]]);
    this.portfolios = new Map(defaultPortfolios.map(([k, v]) => [k, v.map((h) => ({ ...h }))]));
    this.watchlists = new Map(defaultWatchlists.map(([k, v]) => [k, [...v]]));
    this.alerts = new Map(defaultAlerts.map(([k, v]) => [k, v.map((a) => ({ ...a }))]));
    this.predictionHistory = defaultPredictions.map((p) => ({ ...p }));
    this.dailySentiment = new Map();
    this.authTokens = new Map();
    this.tickerMaster = new Map();
    for (const item of getSeededCatalogTickers()) {
      this.tickerMaster.set(item.symbol, item);
    }
  }

  private loadFile(filePath: string) {
    ensureParentDir(filePath);
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        if (raw && raw.trim().length > 0) {
          const parsed: LegacyJsonSnapshot = JSON.parse(raw);
          if (Array.isArray(parsed.users)) {
            this.users = new Map(parsed.users);
            if (!this.users.has(defaultUser.email.toLowerCase())) {
              this.users.set(defaultUser.email.toLowerCase(), { ...defaultUser });
            }
          }
          if (Array.isArray(parsed.portfolios)) {
            this.portfolios = new Map(parsed.portfolios);
          }
          if (Array.isArray(parsed.watchlists)) {
            this.watchlists = new Map(parsed.watchlists);
          }
          if (Array.isArray(parsed.alerts)) {
            this.alerts = new Map(parsed.alerts);
          }
          if (Array.isArray(parsed.predictionHistory)) {
            this.predictionHistory = parsed.predictionHistory;
          }
          if (Array.isArray(parsed.dailySentiment)) {
            for (const [k, rec] of parsed.dailySentiment) {
              if (
                rec &&
                rec.articleCount > 0 &&
                isValidIsoDate(rec.date) &&
                Number.isFinite(rec.credibilityWeightedNetScore)
              ) {
                this.dailySentiment.set(k, rec);
              }
            }
          }
          return;
        }
      }
      this.writeInitialFile(filePath);
    } catch (err) {
      console.warn('Failed to load store file, continuing with seeded in-memory state:', err);
    }
  }

  private writeInitialFile(filePath: string) {
    const initialState: LegacyJsonSnapshot = {
      users: Array.from(this.users.entries()),
      portfolios: Array.from(this.portfolios.entries()),
      watchlists: Array.from(this.watchlists.entries()),
      alerts: Array.from(this.alerts.entries()),
      predictionHistory: this.predictionHistory,
      dailySentiment: Array.from(this.dailySentiment.entries())
    };
    const tempFile = `${filePath}.init.${Date.now()}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(initialState, null, 2), 'utf8');
    fs.renameSync(tempFile, filePath);
  }

  private saveToDisk() {
    if (!this.activeStoreFile) return;
    const targetFile = this.activeStoreFile;
    this.saveMutex = this.saveMutex.then(async () => {
      try {
        ensureParentDir(targetFile);
        const state: LegacyJsonSnapshot = {
          users: Array.from(this.users.entries()),
          portfolios: Array.from(this.portfolios.entries()),
          watchlists: Array.from(this.watchlists.entries()),
          alerts: Array.from(this.alerts.entries()),
          predictionHistory: this.predictionHistory,
          dailySentiment: Array.from(this.dailySentiment.entries())
        };
        const tempFile = `${targetFile}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
        await fs.promises.writeFile(tempFile, JSON.stringify(state, null, 2), 'utf8');
        await fs.promises.rename(tempFile, targetFile);
      } catch (err) {
        console.error('Failed to save in-memory store snapshot:', err);
      }
    });
  }

  async getUserByEmail(email: string): Promise<UserAccount | undefined> {
    return this.users.get(email.toLowerCase());
  }

  async getUserById(id: string): Promise<UserAccount | undefined> {
    return Array.from(this.users.values()).find((u) => u.id === id);
  }

  async getUserByFirebaseUid(uid: string): Promise<UserAccount | undefined> {
    return Array.from(this.users.values()).find((u) => u.uid === uid);
  }

  async getOrCreateFirebaseUser(profile: {
    uid: string;
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
  }): Promise<UserAccount> {
    const existingByUid = await this.getUserByFirebaseUid(profile.uid);
    if (existingByUid) {
      const updated = await this.updateUser(existingByUid.id, {
        name: profile.name || existingByUid.name,
        avatarUrl: profile.avatarUrl ?? existingByUid.avatarUrl
      });
      return updated || existingByUid;
    }

    const normalizedEmail = profile.email.trim().toLowerCase();
    const existingByEmail = await this.getUserByEmail(normalizedEmail);
    if (existingByEmail) {
      const updated = await this.updateUser(existingByEmail.id, {
        uid: profile.uid,
        name: profile.name || existingByEmail.name,
        avatarUrl: profile.avatarUrl ?? existingByEmail.avatarUrl
      });
      return updated || existingByEmail;
    }

    const newUser: UserAccount = {
      id: `user-fb-${profile.uid}`,
      uid: profile.uid,
      email: normalizedEmail,
      name: profile.name || normalizedEmail.split('@')[0],
      passwordHash: '',
      createdAt: new Date().toISOString(),
      isDemoUser: false,
      avatarUrl: profile.avatarUrl || undefined,
      currencyPreference: 'USD',
      defaultExchange: 'NASDAQ',
      confidenceLevel: 90,
      twoFactorEnabled: false,
      notifications: {
        emailAlerts: true,
        regimeShifts: true,
        driftWarnings: true,
        marketOpenSummary: false
      }
    };
    return this.createUser(newUser);
  }

  async createUser(user: UserAccount): Promise<UserAccount> {
    this.users.set(user.email.toLowerCase(), user);
    if (!this.portfolios.has(user.id)) this.portfolios.set(user.id, []);
    if (!this.watchlists.has(user.id)) this.watchlists.set(user.id, ['RELIANCE.NS', 'NVDA', 'AAPL', 'TCS.NS']);
    if (!this.alerts.has(user.id)) this.alerts.set(user.id, []);
    this.saveToDisk();
    return user;
  }

  async updateUser(userId: string, updates: Partial<UserAccount>): Promise<UserAccount | null> {
    const existing = await this.getUserById(userId);
    if (!existing) return null;

    const updatedUser: UserAccount = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt
    };

    if (updates.email && updates.email.toLowerCase() !== existing.email.toLowerCase()) {
      this.users.delete(existing.email.toLowerCase());
    }

    this.users.set(updatedUser.email.toLowerCase(), updatedUser);
    this.saveToDisk();
    return updatedUser;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const existing = await this.getUserById(userId);
    if (!existing) return false;

    this.users.delete(existing.email.toLowerCase());
    this.portfolios.delete(userId);
    this.watchlists.delete(userId);
    this.alerts.delete(userId);
    this.predictionHistory = this.predictionHistory.filter((p) => p.userId !== userId);
    for (const [hash, token] of this.authTokens.entries()) {
      if (token.userId === userId) {
        this.authTokens.delete(hash);
      }
    }
    this.saveToDisk();
    return true;
  }

  async exportUserData(userId: string): Promise<UserDataExport | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;
    const { passwordHash: _pw, uid: _uid, ...safeProfile } = user;
    const authTokens: ExportedAuthTokenMetadata[] = [];
    for (const token of this.authTokens.values()) {
      if (token.userId === userId) {
        authTokens.push({
          id: token.id,
          purpose: token.purpose,
          expiresAt: token.expiresAt,
          usedAt: token.usedAt ?? null
        });
      }
    }
    return {
      exportedAt: new Date().toISOString(),
      user: safeProfile,
      portfolio: (await this.getPortfolio(userId)).map((h) => ({ ...h })),
      watchlist: [...(await this.getWatchlist(userId))],
      alerts: (await this.getAlerts(userId)).map((a) => ({ ...a })),
      predictionHistory: (await this.getPredictionHistory(userId)).map((p) => ({ ...p })),
      authTokens
    };
  }

  async createAuthToken(input: {
    id: string;
    userId: string;
    purpose: AuthTokenPurpose;
    tokenHash: string;
    expiresAt: string;
  }): Promise<AuthTokenRecord> {
    const rec: AuthTokenRecord = {
      id: input.id,
      userId: input.userId,
      purpose: input.purpose,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      usedAt: null
    };
    this.authTokens.set(input.tokenHash, rec);
    return { ...rec };
  }

  async consumeAuthToken(
    purpose: AuthTokenPurpose,
    tokenHash: string,
    nowIso = new Date().toISOString()
  ): Promise<AuthTokenRecord | null> {
    const rec = this.authTokens.get(tokenHash);
    if (!rec || rec.purpose !== purpose || rec.usedAt) {
      return null;
    }
    if (Date.parse(rec.expiresAt) <= Date.parse(nowIso)) {
      return null;
    }
    rec.usedAt = nowIso;
    this.authTokens.set(tokenHash, rec);
    return { ...rec };
  }

  async markEmailVerified(userId: string): Promise<UserAccount | null> {
    return this.updateUser(userId, { emailVerified: true });
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<UserAccount | null> {
    const existing = await this.getUserById(userId);
    if (!existing) return null;
    return this.updateUser(userId, {
      passwordHash,
      tokenVersion: (existing.tokenVersion ?? 1) + 1
    });
  }

  async getPortfolio(userId: string): Promise<PortfolioHolding[]> {
    return this.portfolios.get(userId) || [];
  }

  async savePortfolio(userId: string, holdings: PortfolioHolding[]): Promise<PortfolioHolding[]> {
    this.portfolios.set(userId, holdings);
    this.saveToDisk();
    return holdings;
  }

  async addHolding(userId: string, holding: PortfolioHolding): Promise<PortfolioHolding> {
    const list = this.portfolios.get(userId) || [];
    list.push(holding);
    this.portfolios.set(userId, list);
    this.saveToDisk();
    return holding;
  }

  async updateHolding(userId: string, id: string, updates: Partial<PortfolioHolding>): Promise<PortfolioHolding | null> {
    const list = this.portfolios.get(userId) || [];
    const idx = list.findIndex((h) => h.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      this.portfolios.set(userId, list);
      this.saveToDisk();
      return list[idx];
    }
    return null;
  }

  async deleteHolding(userId: string, id: string): Promise<boolean> {
    const list = this.portfolios.get(userId) || [];
    this.portfolios.set(
      userId,
      list.filter((h) => h.id !== id)
    );
    this.saveToDisk();
    return true;
  }

  async getWatchlist(userId: string): Promise<string[]> {
    return this.watchlists.get(userId) || [];
  }

  async addToWatchlist(userId: string, ticker: string): Promise<string[]> {
    const list = this.watchlists.get(userId) || [];
    if (!list.includes(ticker)) {
      list.push(ticker);
      this.watchlists.set(userId, list);
      this.saveToDisk();
    }
    return list;
  }

  async removeFromWatchlist(userId: string, ticker: string): Promise<string[]> {
    const list = this.watchlists.get(userId) || [];
    const filtered = list.filter((t) => t !== ticker);
    this.watchlists.set(userId, filtered);
    this.saveToDisk();
    return filtered;
  }

  async getAlerts(userId: string): Promise<AlertRule[]> {
    return this.alerts.get(userId) || [];
  }

  async createAlert(userId: string, alert: AlertRule): Promise<AlertRule> {
    const list = this.alerts.get(userId) || [];
    list.push(alert);
    this.alerts.set(userId, list);
    this.saveToDisk();
    return alert;
  }

  async toggleAlert(userId: string, alertId: string, enabled: boolean): Promise<AlertRule | undefined> {
    const list = this.alerts.get(userId) || [];
    const target = list.find((a) => a.id === alertId);
    if (target) {
      target.enabled = enabled;
      this.saveToDisk();
    }
    return target;
  }

  async deleteAlert(userId: string, alertId: string): Promise<boolean> {
    const list = this.alerts.get(userId) || [];
    this.alerts.set(
      userId,
      list.filter((a) => a.id !== alertId)
    );
    this.saveToDisk();
    return true;
  }

  async addPrediction(pred: StoredPrediction): Promise<StoredPrediction> {
    const enriched: StoredPrediction = {
      ...pred,
      currency: pred.currency || inferCurrencyFromTicker(pred.ticker)
    };
    this.predictionHistory.unshift(enriched);
    if (this.predictionHistory.length > 200) this.predictionHistory.pop();
    this.saveToDisk();
    return enriched;
  }

  async getPredictionHistory(userId?: string, ticker?: string): Promise<StoredPrediction[]> {
    let res = this.predictionHistory;
    if (userId) res = res.filter((p) => p.userId === userId);
    if (ticker) res = res.filter((p) => p.ticker === ticker);
    return res;
  }

  async upsertDailySentiment(
    records: DailySentimentRecord[],
    options?: { todayDate?: string; persist?: boolean }
  ): Promise<DailySentimentUpsertSummary> {
    const todayDate = options?.todayDate || new Date().toISOString().slice(0, 10);
    let inserted = 0;
    let updatedToday = 0;
    let skippedExistingPast = 0;
    let skippedInvalid = 0;
    let changed = false;

    for (const rawRec of records) {
      if (
        !rawRec ||
        !rawRec.ticker ||
        !isValidIsoDate(rawRec.date) ||
        !Number.isFinite(rawRec.credibilityWeightedNetScore) ||
        !Number.isFinite(rawRec.articleCount) ||
        rawRec.articleCount <= 0 ||
        rawRec.sentimentSource === 'unsupported_language'
      ) {
        skippedInvalid++;
        continue;
      }

      const tickerUpper = rawRec.ticker.trim().toUpperCase();
      const key = dailySentimentKey(tickerUpper, rawRec.date);
      const existing = this.dailySentiment.get(key);
      const normalizedScore = Number(Math.max(-1, Math.min(1, rawRec.credibilityWeightedNetScore)).toFixed(4));

      const normalizedLang = (rawRec.language || 'en').trim().toLowerCase();
      const defaultModelForSrc =
        rawRec.sentimentSource === 'finbert'
          ? 'Xenova/finbert'
          : rawRec.sentimentSource === 'multilingual-transformer'
            ? 'Xenova/distilbert-base-multilingual-cased-sentiments-student'
            : rawRec.sentimentSource === 'multilingual-lexicon'
              ? 'multilingual-lexicon-v1'
              : 'keyword-lexicon-fallback';
      const defaultVerForSrc =
        rawRec.sentimentSource === 'finbert'
          ? 'onnx-prosusai-finbert-v1'
          : rawRec.sentimentSource === 'multilingual-transformer'
            ? 'onnx-lxyuan-mbert-v1'
            : 'v1';
      const normalizedModelId = (rawRec.modelId || defaultModelForSrc).trim();
      const normalizedModelVersion = (rawRec.modelVersion || defaultVerForSrc).trim();

      if (existing) {
        if (rawRec.date < todayDate) {
          skippedExistingPast++;
          continue;
        }
        if (
          existing.articleCount === rawRec.articleCount &&
          Math.abs(existing.credibilityWeightedNetScore - normalizedScore) < 1e-6 &&
          existing.sentimentSource === rawRec.sentimentSource &&
          (existing.language || 'en') === normalizedLang &&
          (existing.modelId || defaultModelForSrc) === normalizedModelId &&
          (existing.modelVersion || defaultVerForSrc) === normalizedModelVersion
        ) {
          continue;
        }
        this.dailySentiment.set(key, {
          ...rawRec,
          ticker: tickerUpper,
          credibilityWeightedNetScore: normalizedScore,
          language: normalizedLang,
          modelId: normalizedModelId,
          modelVersion: normalizedModelVersion
        });
        updatedToday++;
        changed = true;
      } else {
        this.dailySentiment.set(key, {
          ...rawRec,
          ticker: tickerUpper,
          credibilityWeightedNetScore: normalizedScore,
          language: normalizedLang,
          modelId: normalizedModelId,
          modelVersion: normalizedModelVersion
        });
        inserted++;
        changed = true;
      }
    }

    if (changed && options?.persist !== false) {
      this.saveToDisk();
    }

    return { inserted, updatedToday, skippedExistingPast, skippedInvalid };
  }

  async getDailySentimentForTicker(ticker: string): Promise<DailySentimentRecord[]> {
    const target = ticker.trim().toUpperCase();
    const out: DailySentimentRecord[] = [];
    for (const rec of this.dailySentiment.values()) {
      if (rec.ticker === target && rec.articleCount > 0) out.push(rec);
    }
    out.sort((a, b) => a.date.localeCompare(b.date));
    return out;
  }

  async getAllDailySentiment(): Promise<DailySentimentRecord[]> {
    const out = Array.from(this.dailySentiment.values()).filter((r) => r.articleCount > 0);
    out.sort((a, b) => a.date.localeCompare(b.date) || a.ticker.localeCompare(b.ticker));
    return out;
  }

  async getDailySentimentCountsByTicker(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const rec of this.dailySentiment.values()) {
      if (rec.articleCount > 0) {
        counts[rec.ticker] = (counts[rec.ticker] || 0) + 1;
      }
    }
    return counts;
  }

  async searchTickers(params: TickerSearchParams): Promise<TickerSearchResponse> {
    return buildSearchResponseFromItems(Array.from(this.tickerMaster.values()), params);
  }

  async getTickerBySymbol(symbol: string): Promise<TickerMasterItem | undefined> {
    return this.tickerMaster.get(symbol.trim().toUpperCase());
  }

  async resolveTickerSymbol(query: string): Promise<TickerMasterItem | undefined> {
    const q = query.trim().toUpperCase();
    if (!q) return undefined;
    const direct = this.tickerMaster.get(q);
    if (direct) return direct;
    const nseDirect = this.tickerMaster.get(`${q}.NS`);
    if (nseDirect) return nseDirect;
    const qLower = query.trim().toLowerCase();
    let best: { item: TickerMasterItem; score: number } | null = null;
    for (const item of this.tickerMaster.values()) {
      const score = rankTickerItem(item, qLower);
      if (score > 0 && (!best || score > best.score)) {
        best = { item, score };
      }
    }
    return best?.item;
  }

  async upsertTickers(items: TickerMasterItem[]): Promise<{ upserted: number }> {
    let count = 0;
    for (const item of items) {
      if (!item.symbol) continue;
      this.tickerMaster.set(item.symbol.trim().toUpperCase(), {
        ...item,
        symbol: item.symbol.trim().toUpperCase()
      });
      count++;
    }
    return { upserted: count };
  }

  async getAllTickers(activeOnly = true): Promise<TickerMasterItem[]> {
    return Array.from(this.tickerMaster.values())
      .filter((t) => (!activeOnly ? true : t.active))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  async importSnapshot(snapshot: LegacyJsonSnapshot) {
    let usersCount = 0;
    let portfoliosCount = 0;
    let watchlistsCount = 0;
    let alertsCount = 0;
    let predictionsCount = 0;
    let dailySentimentCount = 0;

    if (Array.isArray(snapshot.users)) {
      for (const [, user] of snapshot.users) {
        if (!user?.id || !user?.email) continue;
        this.users.set(user.email.toLowerCase(), user);
        usersCount++;
      }
    }
    if (Array.isArray(snapshot.portfolios)) {
      for (const [userId, holdings] of snapshot.portfolios) {
        this.portfolios.set(userId, holdings);
        portfoliosCount += holdings.length;
      }
    }
    if (Array.isArray(snapshot.watchlists)) {
      for (const [userId, tickers] of snapshot.watchlists) {
        this.watchlists.set(userId, tickers);
        watchlistsCount += tickers.length;
      }
    }
    if (Array.isArray(snapshot.alerts)) {
      for (const [userId, alertList] of snapshot.alerts) {
        this.alerts.set(userId, alertList);
        alertsCount += alertList.length;
      }
    }
    if (Array.isArray(snapshot.predictionHistory)) {
      const existingIds = new Set(this.predictionHistory.map((p) => p.id));
      for (const pred of snapshot.predictionHistory) {
        if (!existingIds.has(pred.id)) {
          this.predictionHistory.push(pred);
          predictionsCount++;
        }
      }
    }
    if (Array.isArray(snapshot.dailySentiment)) {
      const summary = await this.upsertDailySentiment(
        snapshot.dailySentiment.map(([, rec]) => rec),
        { persist: false }
      );
      dailySentimentCount = summary.inserted + summary.updatedToday;
    }

    this.saveToDisk();
    return {
      users: usersCount,
      portfolios: portfoliosCount,
      watchlists: watchlistsCount,
      alerts: alertsCount,
      predictions: predictionsCount,
      dailySentiment: dailySentimentCount
    };
  }

  async flushToDisk(): Promise<void> {
    await this.saveMutex;
  }

  async reloadStoreFromDisk(customPath?: string): Promise<void> {
    await this.saveMutex;
    const nextPath = customPath ? path.resolve(process.cwd(), customPath) : this.activeStoreFile;
    this.activeStoreFile = nextPath;
    this.seedDefaults();
    if (this.activeStoreFile) {
      this.loadFile(this.activeStoreFile);
    }
  }

  getStoreFilePath(): string {
    return this.activeStoreFile || ':memory:';
  }
}

export class PostgresRepository implements DatabaseRepository {
  private seededPromise: Promise<void> | null = null;
  private ormProvider: () => AlphaQuantDrizzleDb;

  constructor(ormProvider: () => AlphaQuantDrizzleDb = getDb) {
    this.ormProvider = ormProvider;
  }

  private get db(): AlphaQuantDrizzleDb {
    return this.ormProvider();
  }

  private async ensureSeeded(): Promise<void> {
    if (!this.seededPromise) {
      this.seededPromise = (async () => {
        try {
          const orm = this.db;
          const insertedDemo = await orm
            .insert(usersTable)
            .values({
              id: defaultUser.id,
              uid: defaultUser.uid || null,
              email: defaultUser.email.toLowerCase(),
              emailVerified: Boolean(defaultUser.emailVerified ?? true),
              name: defaultUser.name,
              passwordHash: defaultUser.passwordHash,
              createdAt: defaultUser.createdAt,
              isDemoUser: Boolean(defaultUser.isDemoUser),
              avatarUrl: defaultUser.avatarUrl || null,
              title: defaultUser.title || null,
              organization: defaultUser.organization || null,
              phone: defaultUser.phone || null,
              bio: defaultUser.bio || null,
              timezone: defaultUser.timezone || null,
              currencyPreference: defaultUser.currencyPreference || 'INR',
              defaultExchange: defaultUser.defaultExchange || 'NSE',
              confidenceLevel: defaultUser.confidenceLevel ?? 90,
              twoFactorEnabled: Boolean(defaultUser.twoFactorEnabled),
              notifications: defaultUser.notifications || null
            })
            .onConflictDoNothing()
            .returning({ id: usersTable.id });

          if (insertedDemo.length > 0) {
            const demoHoldings = defaultPortfolios[0][1];
            if (demoHoldings.length > 0) {
              await orm
                .insert(portfoliosTable)
                .values(
                  demoHoldings.map((h) => ({
                    id: h.id,
                    userId: DEFAULT_USER_ID,
                    ticker: h.ticker,
                    companyName: h.companyName,
                    quantity: h.quantity,
                    avgBuyPrice: h.avgBuyPrice,
                    currentPrice: h.currentPrice,
                    totalInvested: h.totalInvested,
                    currentValue: h.currentValue,
                    pnl: h.pnl,
                    pnlPercent: h.pnlPercent,
                    purchaseDate: h.purchaseDate,
                    sector: h.sector || null,
                    currency: h.currency || inferCurrencyFromTicker(h.ticker),
                    notes: h.notes || null
                  }))
                )
                .onConflictDoNothing();
            }

            const demoWatchlist = defaultWatchlists[0][1];
            if (demoWatchlist.length > 0) {
              await orm
                .insert(watchlistsTable)
                .values(
                  demoWatchlist.map((ticker) => ({
                    userId: DEFAULT_USER_ID,
                    ticker
                  }))
                )
                .onConflictDoNothing();
            }

            const demoAlerts = defaultAlerts[0][1];
            if (demoAlerts.length > 0) {
              await orm
                .insert(alertsTable)
                .values(demoAlerts.map((a) => this.serializeAlertRow(DEFAULT_USER_ID, a)))
                .onConflictDoNothing();
            }

            if (defaultPredictions.length > 0) {
              await orm
                .insert(predictionHistoryTable)
                .values(
                  defaultPredictions.map((p) => ({
                    id: p.id,
                    userId: p.userId,
                    ticker: p.ticker,
                    currency: p.currency || inferCurrencyFromTicker(p.ticker),
                    predictedPrice: p.predictedPrice,
                    currentPrice: p.currentPrice,
                    lowerBound: p.lowerBound,
                    upperBound: p.upperBound,
                    confidenceLevel: p.confidenceLevel,
                    marketRegime: p.marketRegime,
                    sentimentScore: p.sentimentScore,
                    timestamp: p.timestamp
                  }))
                )
                .onConflictDoNothing();
            }
          }

          // Seed core ticker catalog idempotently so ticker_master is always populated
          const catalogTickers = getSeededCatalogTickers();
          if (catalogTickers.length > 0) {
            await orm
              .insert(tickerMasterTable)
              .values(
                catalogTickers.map((t) => ({
                  symbol: t.symbol,
                  name: t.name,
                  exchange: t.exchange,
                  exchangeCode: t.exchangeCode,
                  country: t.country,
                  currency: t.currency,
                  timezone: t.timezone,
                  assetType: t.assetType,
                  sector: t.sector,
                  pe: t.pe ?? null,
                  marketCap: t.marketCap ?? null,
                  basePrice: t.basePrice ?? null,
                  aliases: t.aliases,
                  active: t.active
                }))
              )
              .onConflictDoNothing();
          }
        } catch (err) {
          this.seededPromise = null;
          throw new Error('Failed to seed PostgreSQL initial catalog/demo data', { cause: err });
        }
      })();
    }
    return this.seededPromise;
  }

  private mapUserRow(row: typeof usersTable.$inferSelect): UserAccount {
    return {
      id: row.id,
      uid: row.uid ?? null,
      email: row.email,
      emailVerified: Boolean(row.emailVerified),
      tokenVersion: row.tokenVersion ?? 1,
      name: row.name,
      passwordHash: row.passwordHash,
      createdAt: row.createdAt,
      isDemoUser: row.isDemoUser,
      avatarUrl: row.avatarUrl ?? undefined,
      title: row.title ?? undefined,
      organization: row.organization ?? undefined,
      phone: row.phone ?? undefined,
      bio: row.bio ?? undefined,
      timezone: row.timezone ?? undefined,
      currencyPreference: (row.currencyPreference as 'INR' | 'USD' | undefined) ?? 'INR',
      defaultExchange: (row.defaultExchange as 'NSE' | 'NASDAQ' | undefined) ?? 'NSE',
      confidenceLevel: row.confidenceLevel ?? 90,
      twoFactorEnabled: row.twoFactorEnabled ?? false,
      notifications: row.notifications ?? {
        emailAlerts: true,
        regimeShifts: true,
        driftWarnings: true,
        marketOpenSummary: false
      }
    };
  }

  private mapHoldingRow(row: typeof portfoliosTable.$inferSelect): PortfolioHolding {
    return {
      id: row.id,
      ticker: row.ticker,
      companyName: row.companyName,
      quantity: row.quantity,
      avgBuyPrice: row.avgBuyPrice,
      currentPrice: row.currentPrice,
      totalInvested: row.totalInvested,
      currentValue: row.currentValue,
      pnl: row.pnl,
      pnlPercent: row.pnlPercent,
      purchaseDate: row.purchaseDate,
      sector: row.sector ?? undefined,
      currency: row.currency ?? inferCurrencyFromTicker(row.ticker),
      notes: row.notes ?? undefined
    };
  }

  private serializeAlertRow(userId: string, alert: AlertRule) {
    const { id, ticker, type, threshold, label, enabled, createdAt, ...rest } = alert;
    return {
      id,
      userId,
      ticker,
      type,
      threshold: threshold ?? null,
      label,
      enabled,
      createdAt,
      metadata: rest as Record<string, unknown>
    };
  }

  private mapAlertRow(row: typeof alertsTable.$inferSelect): AlertRule {
    const meta = (row.metadata || {}) as Partial<AlertRule>;
    return {
      ...meta,
      id: row.id,
      ticker: row.ticker,
      type: row.type as AlertRule['type'],
      threshold: row.threshold ?? undefined,
      label: row.label,
      enabled: row.enabled,
      createdAt: row.createdAt
    };
  }

  private mapTickerRow(row: typeof tickerMasterTable.$inferSelect): TickerMasterItem {
    return {
      symbol: row.symbol,
      name: row.name,
      exchange: row.exchange,
      exchangeCode: row.exchangeCode,
      country: row.country,
      currency: row.currency,
      timezone: row.timezone,
      assetType: row.assetType,
      sector: row.sector,
      pe: row.pe,
      marketCap: row.marketCap,
      basePrice: row.basePrice,
      aliases: Array.isArray(row.aliases) ? row.aliases : [],
      active: row.active
    };
  }

  async getUserByEmail(email: string): Promise<UserAccount | undefined> {
    await this.ensureSeeded();
    try {
      const [row] = await this.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email.trim().toLowerCase()))
        .limit(1);
      return row ? this.mapUserRow(row) : undefined;
    } catch (err) {
      throw new Error(`Database error looking up user by email`, { cause: err });
    }
  }

  async getUserById(id: string): Promise<UserAccount | undefined> {
    await this.ensureSeeded();
    try {
      const [row] = await this.db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
      return row ? this.mapUserRow(row) : undefined;
    } catch (err) {
      throw new Error(`Database error looking up user by id ${id}`, { cause: err });
    }
  }

  async getUserByFirebaseUid(uid: string): Promise<UserAccount | undefined> {
    await this.ensureSeeded();
    try {
      const [row] = await this.db.select().from(usersTable).where(eq(usersTable.uid, uid)).limit(1);
      return row ? this.mapUserRow(row) : undefined;
    } catch (err) {
      throw new Error(`Database error looking up user by Firebase UID`, { cause: err });
    }
  }

  async getOrCreateFirebaseUser(profile: {
    uid: string;
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
  }): Promise<UserAccount> {
    await this.ensureSeeded();
    const normalizedEmail = profile.email.trim().toLowerCase();
    try {
      const existingByEmail = await this.getUserByEmail(normalizedEmail);
      if (existingByEmail) {
        const [updated] = await this.db
          .update(usersTable)
          .set({
            uid: profile.uid,
            name: profile.name || existingByEmail.name,
            avatarUrl: profile.avatarUrl ?? existingByEmail.avatarUrl ?? null
          })
          .where(eq(usersTable.id, existingByEmail.id))
          .returning();
        return this.mapUserRow(updated);
      }

      const newId = `user-fb-${profile.uid}`;
      const [upserted] = await this.db
        .insert(usersTable)
        .values({
          id: newId,
          uid: profile.uid,
          email: normalizedEmail,
          emailVerified: true,
          name: profile.name || normalizedEmail.split('@')[0],
          passwordHash: '',
          createdAt: new Date().toISOString(),
          isDemoUser: false,
          avatarUrl: profile.avatarUrl ?? null,
          currencyPreference: 'USD',
          defaultExchange: 'NASDAQ',
          confidenceLevel: 90,
          twoFactorEnabled: false,
          notifications: {
            emailAlerts: true,
            regimeShifts: true,
            driftWarnings: true,
            marketOpenSummary: false
          }
        })
        .onConflictDoUpdate({
          target: usersTable.uid,
          set: {
            email: normalizedEmail,
            name: profile.name || normalizedEmail.split('@')[0],
            avatarUrl: profile.avatarUrl ?? null
          }
        })
        .returning();

      const watchlistRows = await this.db
        .select({ ticker: watchlistsTable.ticker })
        .from(watchlistsTable)
        .where(eq(watchlistsTable.userId, upserted.id))
        .limit(1);
      if (watchlistRows.length === 0) {
        await this.db
          .insert(watchlistsTable)
          .values(
            ['RELIANCE.NS', 'NVDA', 'AAPL', 'TCS.NS'].map((ticker) => ({
              userId: upserted.id,
              ticker
            }))
          )
          .onConflictDoNothing();
      }
      return this.mapUserRow(upserted);
    } catch (err) {
      throw new Error('Database error syncing Firebase user', { cause: err });
    }
  }

  async createUser(user: UserAccount): Promise<UserAccount> {
    await this.ensureSeeded();
    try {
      const [inserted] = await this.db
        .insert(usersTable)
        .values({
          id: user.id,
          uid: user.uid ?? null,
          email: user.email.trim().toLowerCase(),
          emailVerified: Boolean(user.emailVerified),
          tokenVersion: user.tokenVersion ?? 1,
          name: user.name,
          passwordHash: user.passwordHash,
          createdAt: user.createdAt,
          isDemoUser: Boolean(user.isDemoUser),
          avatarUrl: user.avatarUrl ?? null,
          title: user.title ?? null,
          organization: user.organization ?? null,
          phone: user.phone ?? null,
          bio: user.bio ?? null,
          timezone: user.timezone ?? null,
          currencyPreference: user.currencyPreference ?? 'INR',
          defaultExchange: user.defaultExchange ?? 'NSE',
          confidenceLevel: user.confidenceLevel ?? 90,
          twoFactorEnabled: Boolean(user.twoFactorEnabled),
          notifications: user.notifications ?? null
        })
        .returning();

      await this.db
        .insert(watchlistsTable)
        .values(
          ['RELIANCE.NS', 'NVDA', 'AAPL', 'TCS.NS'].map((ticker) => ({
            userId: inserted.id,
            ticker
          }))
        )
        .onConflictDoNothing();

      return this.mapUserRow(inserted);
    } catch (err) {
      throw new Error('Database error creating user', { cause: err });
    }
  }

  async updateUser(userId: string, updates: Partial<UserAccount>): Promise<UserAccount | null> {
    await this.ensureSeeded();
    try {
      const updatePatch: Partial<typeof usersTable.$inferInsert> = {};
      if (updates.name !== undefined) updatePatch.name = updates.name;
      if (updates.email !== undefined) updatePatch.email = updates.email.trim().toLowerCase();
      if (updates.emailVerified !== undefined) updatePatch.emailVerified = updates.emailVerified;
      if (updates.tokenVersion !== undefined) updatePatch.tokenVersion = updates.tokenVersion;
      if (updates.uid !== undefined) updatePatch.uid = updates.uid;
      if (updates.passwordHash !== undefined) updatePatch.passwordHash = updates.passwordHash;
      if (updates.avatarUrl !== undefined) updatePatch.avatarUrl = updates.avatarUrl;
      if (updates.title !== undefined) updatePatch.title = updates.title;
      if (updates.organization !== undefined) updatePatch.organization = updates.organization;
      if (updates.phone !== undefined) updatePatch.phone = updates.phone;
      if (updates.bio !== undefined) updatePatch.bio = updates.bio;
      if (updates.timezone !== undefined) updatePatch.timezone = updates.timezone;
      if (updates.currencyPreference !== undefined) updatePatch.currencyPreference = updates.currencyPreference;
      if (updates.defaultExchange !== undefined) updatePatch.defaultExchange = updates.defaultExchange;
      if (updates.confidenceLevel !== undefined) updatePatch.confidenceLevel = updates.confidenceLevel;
      if (updates.twoFactorEnabled !== undefined) updatePatch.twoFactorEnabled = updates.twoFactorEnabled;
      if (updates.notifications !== undefined) updatePatch.notifications = updates.notifications;

      const [updated] = await this.db
        .update(usersTable)
        .set(updatePatch)
        .where(eq(usersTable.id, userId))
        .returning();

      return updated ? this.mapUserRow(updated) : null;
    } catch (err) {
      throw new Error(`Database error updating user ${userId}`, { cause: err });
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    await this.ensureSeeded();
    try {
      const deletedCount = await this.db.transaction(async (tx) => {
        await tx.delete(authTokensTable).where(eq(authTokensTable.userId, userId));
        await tx.delete(portfoliosTable).where(eq(portfoliosTable.userId, userId));
        await tx.delete(watchlistsTable).where(eq(watchlistsTable.userId, userId));
        await tx.delete(alertsTable).where(eq(alertsTable.userId, userId));
        await tx.delete(predictionHistoryTable).where(eq(predictionHistoryTable.userId, userId));
        const deleted = await tx
          .delete(usersTable)
          .where(eq(usersTable.id, userId))
          .returning({ id: usersTable.id });
        return deleted.length;
      });
      return deletedCount > 0;
    } catch (err) {
      throw new Error(`Database error deleting user ${userId}`, { cause: err });
    }
  }

  async exportUserData(userId: string): Promise<UserDataExport | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;
    const [portfolio, watchlist, alerts, predictionHistory, tokenRows] = await Promise.all([
      this.getPortfolio(userId),
      this.getWatchlist(userId),
      this.getAlerts(userId),
      this.getPredictionHistory(userId),
      this.db
        .select({
          id: authTokensTable.id,
          purpose: authTokensTable.purpose,
          expiresAt: authTokensTable.expiresAt,
          usedAt: authTokensTable.usedAt
        })
        .from(authTokensTable)
        .where(eq(authTokensTable.userId, userId))
    ]);
    const { passwordHash: _pw, uid: _uid, ...safeProfile } = user;
    return {
      exportedAt: new Date().toISOString(),
      user: safeProfile,
      portfolio,
      watchlist,
      alerts,
      predictionHistory,
      authTokens: tokenRows.map((t) => ({
        id: t.id,
        purpose: t.purpose as AuthTokenPurpose,
        expiresAt: t.expiresAt,
        usedAt: t.usedAt ?? null
      }))
    };
  }

  async createAuthToken(input: {
    id: string;
    userId: string;
    purpose: AuthTokenPurpose;
    tokenHash: string;
    expiresAt: string;
  }): Promise<AuthTokenRecord> {
    await this.ensureSeeded();
    try {
      const [inserted] = await this.db
        .insert(authTokensTable)
        .values({
          id: input.id,
          userId: input.userId,
          purpose: input.purpose,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          usedAt: null
        })
        .returning();
      return {
        id: inserted.id,
        userId: inserted.userId,
        purpose: inserted.purpose as AuthTokenPurpose,
        tokenHash: inserted.tokenHash,
        expiresAt: inserted.expiresAt,
        usedAt: inserted.usedAt
      };
    } catch (err) {
      throw new Error('Database error creating auth token', { cause: err });
    }
  }

  async consumeAuthToken(
    purpose: AuthTokenPurpose,
    tokenHash: string,
    nowIso = new Date().toISOString()
  ): Promise<AuthTokenRecord | null> {
    await this.ensureSeeded();
    try {
      const [existing] = await this.db
        .select()
        .from(authTokensTable)
        .where(
          and(
            eq(authTokensTable.tokenHash, tokenHash),
            eq(authTokensTable.purpose, purpose),
            isNull(authTokensTable.usedAt)
          )
        )
        .limit(1);

      if (!existing || Date.parse(existing.expiresAt) <= Date.parse(nowIso)) {
        return null;
      }

      const [updated] = await this.db
        .update(authTokensTable)
        .set({ usedAt: nowIso })
        .where(and(eq(authTokensTable.id, existing.id), isNull(authTokensTable.usedAt)))
        .returning();

      if (!updated) return null;
      return {
        id: updated.id,
        userId: updated.userId,
        purpose: updated.purpose as AuthTokenPurpose,
        tokenHash: updated.tokenHash,
        expiresAt: updated.expiresAt,
        usedAt: updated.usedAt
      };
    } catch (err) {
      throw new Error('Database error consuming auth token', { cause: err });
    }
  }

  async markEmailVerified(userId: string): Promise<UserAccount | null> {
    return this.updateUser(userId, { emailVerified: true });
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<UserAccount | null> {
    const existing = await this.getUserById(userId);
    if (!existing) return null;
    return this.updateUser(userId, {
      passwordHash,
      tokenVersion: (existing.tokenVersion ?? 1) + 1
    });
  }

  async getPortfolio(userId: string): Promise<PortfolioHolding[]> {
    await this.ensureSeeded();
    try {
      const rows = await this.db
        .select()
        .from(portfoliosTable)
        .where(eq(portfoliosTable.userId, userId))
        .orderBy(asc(portfoliosTable.createdAt), asc(portfoliosTable.id));
      return rows.map((r) => this.mapHoldingRow(r));
    } catch (err) {
      throw new Error(`Database error reading portfolio for ${userId}`, { cause: err });
    }
  }

  async savePortfolio(userId: string, holdings: PortfolioHolding[]): Promise<PortfolioHolding[]> {
    await this.ensureSeeded();
    try {
      await this.db.transaction(async (tx) => {
        await tx.delete(portfoliosTable).where(eq(portfoliosTable.userId, userId));
        if (holdings.length > 0) {
          await tx.insert(portfoliosTable).values(
            holdings.map((h) => ({
              id: h.id,
              userId,
              ticker: h.ticker,
              companyName: h.companyName,
              quantity: h.quantity,
              avgBuyPrice: h.avgBuyPrice,
              currentPrice: h.currentPrice,
              totalInvested: h.totalInvested,
              currentValue: h.currentValue,
              pnl: h.pnl,
              pnlPercent: h.pnlPercent,
              purchaseDate: h.purchaseDate,
              sector: h.sector ?? null,
              currency: h.currency ?? inferCurrencyFromTicker(h.ticker),
              notes: h.notes ?? null
            }))
          );
        }
      });
      return holdings;
    } catch (err) {
      throw new Error(`Database error saving portfolio for ${userId}`, { cause: err });
    }
  }

  async addHolding(userId: string, holding: PortfolioHolding): Promise<PortfolioHolding> {
    await this.ensureSeeded();
    try {
      const [inserted] = await this.db
        .insert(portfoliosTable)
        .values({
          id: holding.id,
          userId,
          ticker: holding.ticker,
          companyName: holding.companyName,
          quantity: holding.quantity,
          avgBuyPrice: holding.avgBuyPrice,
          currentPrice: holding.currentPrice,
          totalInvested: holding.totalInvested,
          currentValue: holding.currentValue,
          pnl: holding.pnl,
          pnlPercent: holding.pnlPercent,
          purchaseDate: holding.purchaseDate,
          sector: holding.sector ?? null,
          currency: holding.currency ?? inferCurrencyFromTicker(holding.ticker),
          notes: holding.notes ?? null
        })
        .returning();
      return this.mapHoldingRow(inserted);
    } catch (err) {
      throw new Error(`Database error adding holding for ${userId}`, { cause: err });
    }
  }

  async updateHolding(userId: string, id: string, updates: Partial<PortfolioHolding>): Promise<PortfolioHolding | null> {
    await this.ensureSeeded();
    try {
      const patch: Partial<typeof portfoliosTable.$inferInsert> = {};
      if (updates.quantity !== undefined) patch.quantity = updates.quantity;
      if (updates.avgBuyPrice !== undefined) patch.avgBuyPrice = updates.avgBuyPrice;
      if (updates.currentPrice !== undefined) patch.currentPrice = updates.currentPrice;
      if (updates.totalInvested !== undefined) patch.totalInvested = updates.totalInvested;
      if (updates.currentValue !== undefined) patch.currentValue = updates.currentValue;
      if (updates.pnl !== undefined) patch.pnl = updates.pnl;
      if (updates.pnlPercent !== undefined) patch.pnlPercent = updates.pnlPercent;
      if (updates.sector !== undefined) patch.sector = updates.sector;
      if (updates.currency !== undefined) patch.currency = updates.currency;
      if (updates.notes !== undefined) patch.notes = updates.notes;

      const [updated] = await this.db
        .update(portfoliosTable)
        .set(patch)
        .where(and(eq(portfoliosTable.userId, userId), eq(portfoliosTable.id, id)))
        .returning();
      return updated ? this.mapHoldingRow(updated) : null;
    } catch (err) {
      throw new Error(`Database error updating holding ${id}`, { cause: err });
    }
  }

  async deleteHolding(userId: string, id: string): Promise<boolean> {
    await this.ensureSeeded();
    try {
      await this.db
        .delete(portfoliosTable)
        .where(and(eq(portfoliosTable.userId, userId), eq(portfoliosTable.id, id)));
      return true;
    } catch (err) {
      throw new Error(`Database error deleting holding ${id}`, { cause: err });
    }
  }

  async getWatchlist(userId: string): Promise<string[]> {
    await this.ensureSeeded();
    try {
      const rows = await this.db
        .select({ ticker: watchlistsTable.ticker })
        .from(watchlistsTable)
        .where(eq(watchlistsTable.userId, userId))
        .orderBy(asc(watchlistsTable.id));
      return rows.map((r) => r.ticker);
    } catch (err) {
      throw new Error(`Database error fetching watchlist for ${userId}`, { cause: err });
    }
  }

  async addToWatchlist(userId: string, ticker: string): Promise<string[]> {
    await this.ensureSeeded();
    try {
      await this.db
        .insert(watchlistsTable)
        .values({ userId, ticker })
        .onConflictDoNothing();
      return this.getWatchlist(userId);
    } catch (err) {
      throw new Error(`Database error adding ${ticker} to watchlist`, { cause: err });
    }
  }

  async removeFromWatchlist(userId: string, ticker: string): Promise<string[]> {
    await this.ensureSeeded();
    try {
      await this.db
        .delete(watchlistsTable)
        .where(and(eq(watchlistsTable.userId, userId), eq(watchlistsTable.ticker, ticker)));
      return this.getWatchlist(userId);
    } catch (err) {
      throw new Error(`Database error removing ${ticker} from watchlist`, { cause: err });
    }
  }

  async getAlerts(userId: string): Promise<AlertRule[]> {
    await this.ensureSeeded();
    try {
      const rows = await this.db
        .select()
        .from(alertsTable)
        .where(eq(alertsTable.userId, userId))
        .orderBy(asc(alertsTable.createdAt));
      return rows.map((r) => this.mapAlertRow(r));
    } catch (err) {
      throw new Error(`Database error fetching alerts for ${userId}`, { cause: err });
    }
  }

  async createAlert(userId: string, alert: AlertRule): Promise<AlertRule> {
    await this.ensureSeeded();
    try {
      const [inserted] = await this.db
        .insert(alertsTable)
        .values(this.serializeAlertRow(userId, alert))
        .returning();
      return this.mapAlertRow(inserted);
    } catch (err) {
      throw new Error(`Database error creating alert ${alert.id}`, { cause: err });
    }
  }

  async toggleAlert(userId: string, alertId: string, enabled: boolean): Promise<AlertRule | undefined> {
    await this.ensureSeeded();
    try {
      const [updated] = await this.db
        .update(alertsTable)
        .set({ enabled })
        .where(and(eq(alertsTable.userId, userId), eq(alertsTable.id, alertId)))
        .returning();
      return updated ? this.mapAlertRow(updated) : undefined;
    } catch (err) {
      throw new Error(`Database error toggling alert ${alertId}`, { cause: err });
    }
  }

  async deleteAlert(userId: string, alertId: string): Promise<boolean> {
    await this.ensureSeeded();
    try {
      await this.db
        .delete(alertsTable)
        .where(and(eq(alertsTable.userId, userId), eq(alertsTable.id, alertId)));
      return true;
    } catch (err) {
      throw new Error(`Database error deleting alert ${alertId}`, { cause: err });
    }
  }

  async addPrediction(pred: StoredPrediction): Promise<StoredPrediction> {
    await this.ensureSeeded();
    const currency = pred.currency || inferCurrencyFromTicker(pred.ticker);
    try {
      await this.db.insert(predictionHistoryTable).values({
        id: pred.id,
        userId: pred.userId,
        ticker: pred.ticker,
        currency,
        predictedPrice: pred.predictedPrice,
        currentPrice: pred.currentPrice,
        lowerBound: pred.lowerBound,
        upperBound: pred.upperBound,
        confidenceLevel: pred.confidenceLevel,
        marketRegime: pred.marketRegime,
        sentimentScore: pred.sentimentScore,
        timestamp: pred.timestamp
      });
      return { ...pred, currency };
    } catch (err) {
      throw new Error('Database error recording prediction history', { cause: err });
    }
  }

  async getPredictionHistory(userId?: string, ticker?: string): Promise<StoredPrediction[]> {
    await this.ensureSeeded();
    try {
      const conditions = [];
      if (userId) conditions.push(eq(predictionHistoryTable.userId, userId));
      if (ticker) conditions.push(eq(predictionHistoryTable.ticker, ticker));

      const rows = await this.db
        .select()
        .from(predictionHistoryTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(predictionHistoryTable.timestamp))
        .limit(200);

      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        ticker: r.ticker,
        currency: r.currency,
        predictedPrice: r.predictedPrice,
        currentPrice: r.currentPrice,
        lowerBound: r.lowerBound,
        upperBound: r.upperBound,
        confidenceLevel: r.confidenceLevel,
        marketRegime: r.marketRegime,
        sentimentScore: r.sentimentScore,
        timestamp: r.timestamp
      }));
    } catch (err) {
      throw new Error('Database error fetching prediction history', { cause: err });
    }
  }

  async upsertDailySentiment(
    records: DailySentimentRecord[],
    options?: { todayDate?: string; persist?: boolean }
  ): Promise<DailySentimentUpsertSummary> {
    await this.ensureSeeded();
    const todayDate = options?.todayDate || new Date().toISOString().slice(0, 10);
    let inserted = 0;
    let updatedToday = 0;
    let skippedExistingPast = 0;
    let skippedInvalid = 0;

    const validRecords: DailySentimentRecord[] = [];
    for (const rawRec of records) {
      if (
        !rawRec ||
        !rawRec.ticker ||
        !isValidIsoDate(rawRec.date) ||
        !Number.isFinite(rawRec.credibilityWeightedNetScore) ||
        !Number.isFinite(rawRec.articleCount) ||
        rawRec.articleCount <= 0 ||
        rawRec.sentimentSource === 'unsupported_language'
      ) {
        skippedInvalid++;
        continue;
      }
      validRecords.push({
        ...rawRec,
        ticker: rawRec.ticker.trim().toUpperCase(),
        credibilityWeightedNetScore: Number(
          Math.max(-1, Math.min(1, rawRec.credibilityWeightedNetScore)).toFixed(4)
        )
      });
    }

    if (validRecords.length === 0) {
      return { inserted, updatedToday, skippedExistingPast, skippedInvalid };
    }

    try {
      const tickers = Array.from(new Set(validRecords.map((r) => r.ticker)));
      const existingRows = await this.db
        .select()
        .from(dailySentimentTable)
        .where(inArray(dailySentimentTable.ticker, tickers));

      const existingMap = new Map<string, typeof dailySentimentTable.$inferSelect>();
      for (const row of existingRows) {
        existingMap.set(dailySentimentKey(row.ticker, row.date), row);
      }

      for (const rec of validRecords) {
        const key = dailySentimentKey(rec.ticker, rec.date);
        const existing = existingMap.get(key);
        const normalizedLang = (rec.language || 'en').trim().toLowerCase();
        const defaultModelForSrc =
          rec.sentimentSource === 'finbert'
            ? 'Xenova/finbert'
            : rec.sentimentSource === 'multilingual-transformer'
              ? 'Xenova/distilbert-base-multilingual-cased-sentiments-student'
              : rec.sentimentSource === 'multilingual-lexicon'
                ? 'multilingual-lexicon-v1'
                : 'keyword-lexicon-fallback';
        const defaultVerForSrc =
          rec.sentimentSource === 'finbert'
            ? 'onnx-prosusai-finbert-v1'
            : rec.sentimentSource === 'multilingual-transformer'
              ? 'onnx-lxyuan-mbert-v1'
              : 'v1';
        const normalizedModelId = (rec.modelId || defaultModelForSrc).trim();
        const normalizedModelVersion = (rec.modelVersion || defaultVerForSrc).trim();

        if (existing) {
          if (rec.date < todayDate) {
            skippedExistingPast++;
            continue;
          }
          if (
            existing.articleCount === rec.articleCount &&
            Math.abs(existing.credibilityWeightedNetScore - rec.credibilityWeightedNetScore) < 1e-6 &&
            existing.sentimentSource === rec.sentimentSource &&
            existing.language === normalizedLang &&
            existing.modelId === normalizedModelId &&
            existing.modelVersion === normalizedModelVersion
          ) {
            continue;
          }
          await this.db
            .insert(dailySentimentTable)
            .values({
              ticker: rec.ticker,
              date: rec.date,
              credibilityWeightedNetScore: rec.credibilityWeightedNetScore,
              articleCount: rec.articleCount,
              sentimentSource: rec.sentimentSource,
              language: normalizedLang,
              modelId: normalizedModelId,
              modelVersion: normalizedModelVersion,
              updatedAt: rec.updatedAt
            })
            .onConflictDoUpdate({
              target: [dailySentimentTable.ticker, dailySentimentTable.date],
              set: {
                credibilityWeightedNetScore: rec.credibilityWeightedNetScore,
                articleCount: rec.articleCount,
                sentimentSource: rec.sentimentSource,
                language: normalizedLang,
                modelId: normalizedModelId,
                modelVersion: normalizedModelVersion,
                updatedAt: rec.updatedAt
              }
            });
          existingMap.set(key, {
            ...existing,
            credibilityWeightedNetScore: rec.credibilityWeightedNetScore,
            articleCount: rec.articleCount,
            sentimentSource: rec.sentimentSource,
            language: normalizedLang,
            modelId: normalizedModelId,
            modelVersion: normalizedModelVersion,
            updatedAt: rec.updatedAt
          });
          updatedToday++;
        } else {
          await this.db
            .insert(dailySentimentTable)
            .values({
              ticker: rec.ticker,
              date: rec.date,
              credibilityWeightedNetScore: rec.credibilityWeightedNetScore,
              articleCount: rec.articleCount,
              sentimentSource: rec.sentimentSource,
              language: normalizedLang,
              modelId: normalizedModelId,
              modelVersion: normalizedModelVersion,
              updatedAt: rec.updatedAt
            })
            .onConflictDoNothing();
          existingMap.set(key, {
            id: 0,
            ticker: rec.ticker,
            date: rec.date,
            credibilityWeightedNetScore: rec.credibilityWeightedNetScore,
            articleCount: rec.articleCount,
            sentimentSource: rec.sentimentSource,
            language: normalizedLang,
            modelId: normalizedModelId,
            modelVersion: normalizedModelVersion,
            updatedAt: rec.updatedAt
          });
          inserted++;
        }
      }

      return { inserted, updatedToday, skippedExistingPast, skippedInvalid };
    } catch (err) {
      throw new Error('Database error upserting daily sentiment', { cause: err });
    }
  }

  async getDailySentimentForTicker(ticker: string): Promise<DailySentimentRecord[]> {
    await this.ensureSeeded();
    const target = ticker.trim().toUpperCase();
    try {
      const rows = await this.db
        .select()
        .from(dailySentimentTable)
        .where(eq(dailySentimentTable.ticker, target))
        .orderBy(asc(dailySentimentTable.date));
      return rows
        .filter((r) => r.articleCount > 0 && r.sentimentSource !== 'unsupported_language')
        .map((r) => ({
          ticker: r.ticker,
          date: r.date,
          credibilityWeightedNetScore: r.credibilityWeightedNetScore,
          articleCount: r.articleCount,
          sentimentSource: r.sentimentSource as DailySentimentRecord['sentimentSource'],
          language: r.language,
          modelId: r.modelId,
          modelVersion: r.modelVersion,
          updatedAt: r.updatedAt
        }));
    } catch (err) {
      throw new Error(`Database error loading daily sentiment for ${target}`, { cause: err });
    }
  }

  async getAllDailySentiment(): Promise<DailySentimentRecord[]> {
    await this.ensureSeeded();
    try {
      const rows = await this.db
        .select()
        .from(dailySentimentTable)
        .orderBy(asc(dailySentimentTable.date), asc(dailySentimentTable.ticker));
      return rows
        .filter((r) => r.articleCount > 0 && r.sentimentSource !== 'unsupported_language')
        .map((r) => ({
          ticker: r.ticker,
          date: r.date,
          credibilityWeightedNetScore: r.credibilityWeightedNetScore,
          articleCount: r.articleCount,
          sentimentSource: r.sentimentSource as DailySentimentRecord['sentimentSource'],
          language: r.language,
          modelId: r.modelId,
          modelVersion: r.modelVersion,
          updatedAt: r.updatedAt
        }));
    } catch (err) {
      throw new Error('Database error loading all daily sentiment records', { cause: err });
    }
  }

  async getDailySentimentCountsByTicker(): Promise<Record<string, number>> {
    const rows = await this.getAllDailySentiment();
    const counts: Record<string, number> = {};
    for (const r of rows) {
      counts[r.ticker] = (counts[r.ticker] || 0) + 1;
    }
    return counts;
  }

  async searchTickers(params: TickerSearchParams): Promise<TickerSearchResponse> {
    await this.ensureSeeded();
    try {
      const activeOnly = params.activeOnly !== false;
      const countryFilter = params.country?.trim().toUpperCase();
      const exchangeFilter = params.exchange?.trim().toUpperCase();
      const qRaw = params.q?.trim() || '';
      const qUpper = qRaw.toUpperCase();

      const baseWhere = activeOnly ? eq(tickerMasterTable.active, true) : undefined;
      const facetRows = await this.db
        .selectDistinct({
          country: tickerMasterTable.country,
          exchange: tickerMasterTable.exchange,
          exchangeCode: tickerMasterTable.exchangeCode
        })
        .from(tickerMasterTable)
        .where(baseWhere);

      const countrySet = new Set<string>();
      const exchangeMap = new Map<string, { mic: string; code: string; country: string }>();
      for (const f of facetRows) {
        if (f.country) countrySet.add(f.country);
        if (f.exchange) {
          const key = `${f.exchange}::${f.country}`;
          if (!exchangeMap.has(key)) {
            exchangeMap.set(key, {
              mic: f.exchange,
              code: f.exchangeCode || f.exchange,
              country: f.country
            });
          }
        }
      }

      const conditions = [];
      if (activeOnly) conditions.push(eq(tickerMasterTable.active, true));
      if (countryFilter && countryFilter !== 'ALL') {
        conditions.push(eq(sql`upper(${tickerMasterTable.country})`, countryFilter));
      }
      if (exchangeFilter && exchangeFilter !== 'ALL') {
        conditions.push(
          or(
            eq(sql`upper(${tickerMasterTable.exchange})`, exchangeFilter),
            eq(sql`upper(${tickerMasterTable.exchangeCode})`, exchangeFilter)
          )!
        );
      }
      if (qRaw) {
        const subPattern = `%${qRaw}%`;
        conditions.push(
          or(
            ilike(tickerMasterTable.symbol, subPattern),
            ilike(tickerMasterTable.name, subPattern),
            sql`${tickerMasterTable.aliases}::text ILIKE ${subPattern}`
          )!
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [{ count }] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(tickerMasterTable)
        .where(whereClause);

      const total = Number(count || 0);
      const limit = Math.min(200, Math.max(1, Number(params.limit) || 24));
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const page = Math.min(totalPages, Math.max(1, Number(params.page) || 1));
      const offset = (page - 1) * limit;

      let rows;
      if (qRaw) {
        const prefixPattern = `${qUpper}%`;
        const subPattern = `%${qUpper}%`;
        const scoreExpr = sql<number>`(
          CASE
            WHEN upper(${tickerMasterTable.symbol}) = ${qUpper} THEN 1000
            WHEN upper(split_part(${tickerMasterTable.symbol}, '.', 1)) = ${qUpper} THEN 920
            WHEN upper(${tickerMasterTable.symbol}) LIKE ${prefixPattern} THEN 850
            WHEN upper(${tickerMasterTable.name}) LIKE ${prefixPattern} THEN 750
            WHEN upper(${tickerMasterTable.symbol}) LIKE ${subPattern} THEN 600
            WHEN upper(${tickerMasterTable.name}) LIKE ${subPattern} THEN 450
            ELSE 300
          END
        )`;
        rows = await this.db
          .select()
          .from(tickerMasterTable)
          .where(whereClause)
          .orderBy(desc(scoreExpr), asc(tickerMasterTable.symbol))
          .limit(limit)
          .offset(offset);
      } else {
        rows = await this.db
          .select()
          .from(tickerMasterTable)
          .where(whereClause)
          .orderBy(asc(tickerMasterTable.symbol))
          .limit(limit)
          .offset(offset);
      }

      return {
        items: rows.map((r) => this.mapTickerRow(r)),
        total,
        page,
        limit,
        totalPages,
        filters: {
          countries: Array.from(countrySet).sort(),
          exchanges: Array.from(exchangeMap.values()).sort((a, b) =>
            a.mic === b.mic ? a.country.localeCompare(b.country) : a.mic.localeCompare(b.mic)
          )
        }
      };
    } catch (err) {
      throw new Error('Database error searching ticker_master', { cause: err });
    }
  }

  async getTickerBySymbol(symbol: string): Promise<TickerMasterItem | undefined> {
    await this.ensureSeeded();
    try {
      const [row] = await this.db
        .select()
        .from(tickerMasterTable)
        .where(eq(tickerMasterTable.symbol, symbol.trim().toUpperCase()))
        .limit(1);
      return row ? this.mapTickerRow(row) : undefined;
    } catch (err) {
      throw new Error(`Database error fetching ticker ${symbol}`, { cause: err });
    }
  }

  async resolveTickerSymbol(query: string): Promise<TickerMasterItem | undefined> {
    const q = query.trim().toUpperCase();
    if (!q) return undefined;
    const direct = await this.getTickerBySymbol(q);
    if (direct) return direct;
    const nseDirect = await this.getTickerBySymbol(`${q}.NS`);
    if (nseDirect) return nseDirect;

    const candidates = await this.searchTickers({ q: query.trim(), limit: 25, page: 1, activeOnly: true });
    const qLower = query.trim().toLowerCase();
    let best: { item: TickerMasterItem; score: number } | null = null;
    for (const item of candidates.items) {
      const score = rankTickerItem(item, qLower);
      if (score > 0 && (!best || score > best.score)) {
        best = { item, score };
      }
    }
    return best?.item;
  }

  async upsertTickers(items: TickerMasterItem[]): Promise<{ upserted: number }> {
    await this.ensureSeeded();
    const cleaned = new Map<string, TickerMasterItem>();
    for (const item of items) {
      if (!item?.symbol) continue;
      const symbol = item.symbol.trim().toUpperCase();
      cleaned.set(symbol, { ...item, symbol });
    }
    const entries = Array.from(cleaned.values());
    if (entries.length === 0) return { upserted: 0 };
    try {
      const BATCH_SIZE = 200;
      const now = new Date();
      await this.db.transaction(async (tx) => {
        for (let i = 0; i < entries.length; i += BATCH_SIZE) {
          const chunk = entries.slice(i, i + BATCH_SIZE);
          await tx
            .insert(tickerMasterTable)
            .values(
              chunk.map((item) => ({
                symbol: item.symbol,
                name: item.name,
                exchange: item.exchange,
                exchangeCode: item.exchangeCode,
                country: item.country,
                currency: item.currency,
                timezone: item.timezone,
                assetType: item.assetType || 'EQUITY',
                sector: item.sector || 'Global Equities',
                pe: item.pe ?? null,
                marketCap: item.marketCap ?? null,
                basePrice: item.basePrice ?? null,
                aliases: item.aliases || [],
                active: item.active !== false,
                updatedAt: now
              }))
            )
            .onConflictDoUpdate({
              target: tickerMasterTable.symbol,
              set: {
                name: sql`excluded.name`,
                exchange: sql`excluded.exchange`,
                exchangeCode: sql`excluded.exchange_code`,
                country: sql`excluded.country`,
                currency: sql`excluded.currency`,
                timezone: sql`excluded.timezone`,
                assetType: sql`excluded.asset_type`,
                sector: sql`excluded.sector`,
                pe: sql`COALESCE(excluded.pe, ${tickerMasterTable.pe})`,
                marketCap: sql`COALESCE(excluded.market_cap, ${tickerMasterTable.marketCap})`,
                basePrice: sql`COALESCE(excluded.base_price, ${tickerMasterTable.basePrice})`,
                aliases: sql`excluded.aliases`,
                active: sql`excluded.active`,
                updatedAt: sql`excluded.updated_at`
              }
            });
        }
      });
      return { upserted: entries.length };
    } catch (err) {
      throw new Error('Database error upserting ticker_master entries', { cause: err });
    }
  }

  async getAllTickers(activeOnly = true): Promise<TickerMasterItem[]> {
    await this.ensureSeeded();
    try {
      const rows = await this.db
        .select()
        .from(tickerMasterTable)
        .where(activeOnly ? eq(tickerMasterTable.active, true) : undefined)
        .orderBy(asc(tickerMasterTable.symbol));
      return rows.map((r) => this.mapTickerRow(r));
    } catch (err) {
      throw new Error('Database error loading ticker_master list', { cause: err });
    }
  }

  async importSnapshot(snapshot: LegacyJsonSnapshot) {
    await this.ensureSeeded();
    let usersCount = 0;
    let portfoliosCount = 0;
    let watchlistsCount = 0;
    let alertsCount = 0;
    let predictionsCount = 0;
    let dailySentimentCount = 0;

    if (Array.isArray(snapshot.users)) {
      for (const [, user] of snapshot.users) {
        if (!user?.id || !user?.email) continue;
        await this.db
          .insert(usersTable)
          .values({
            id: user.id,
            uid: user.uid ?? null,
            email: user.email.trim().toLowerCase(),
            emailVerified: Boolean(user.emailVerified),
            name: user.name,
            passwordHash: user.passwordHash,
            createdAt: user.createdAt,
            isDemoUser: Boolean(user.isDemoUser),
            avatarUrl: user.avatarUrl ?? null,
            title: user.title ?? null,
            organization: user.organization ?? null,
            phone: user.phone ?? null,
            bio: user.bio ?? null,
            timezone: user.timezone ?? null,
            currencyPreference: user.currencyPreference ?? 'INR',
            defaultExchange: user.defaultExchange ?? 'NSE',
            confidenceLevel: user.confidenceLevel ?? 90,
            twoFactorEnabled: Boolean(user.twoFactorEnabled),
            notifications: user.notifications ?? null
          })
          .onConflictDoNothing();
        usersCount++;
      }
    }

    if (Array.isArray(snapshot.portfolios)) {
      for (const [userId, holdings] of snapshot.portfolios) {
        for (const h of holdings) {
          await this.db
            .insert(portfoliosTable)
            .values({
              id: h.id,
              userId,
              ticker: h.ticker,
              companyName: h.companyName,
              quantity: h.quantity,
              avgBuyPrice: h.avgBuyPrice,
              currentPrice: h.currentPrice,
              totalInvested: h.totalInvested,
              currentValue: h.currentValue,
              pnl: h.pnl,
              pnlPercent: h.pnlPercent,
              purchaseDate: h.purchaseDate,
              sector: h.sector ?? null,
              currency: h.currency ?? inferCurrencyFromTicker(h.ticker),
              notes: h.notes ?? null
            })
            .onConflictDoNothing();
          portfoliosCount++;
        }
      }
    }

    if (Array.isArray(snapshot.watchlists)) {
      for (const [userId, tickers] of snapshot.watchlists) {
        for (const ticker of tickers) {
          await this.db
            .insert(watchlistsTable)
            .values({ userId, ticker })
            .onConflictDoNothing();
          watchlistsCount++;
        }
      }
    }

    if (Array.isArray(snapshot.alerts)) {
      for (const [userId, alertList] of snapshot.alerts) {
        for (const alert of alertList) {
          await this.db
            .insert(alertsTable)
            .values(this.serializeAlertRow(userId, alert))
            .onConflictDoNothing();
          alertsCount++;
        }
      }
    }

    if (Array.isArray(snapshot.predictionHistory)) {
      for (const pred of snapshot.predictionHistory) {
        await this.db
          .insert(predictionHistoryTable)
          .values({
            id: pred.id,
            userId: pred.userId,
            ticker: pred.ticker,
            currency: pred.currency || inferCurrencyFromTicker(pred.ticker),
            predictedPrice: pred.predictedPrice,
            currentPrice: pred.currentPrice,
            lowerBound: pred.lowerBound,
            upperBound: pred.upperBound,
            confidenceLevel: pred.confidenceLevel,
            marketRegime: pred.marketRegime,
            sentimentScore: pred.sentimentScore,
            timestamp: pred.timestamp
          })
          .onConflictDoNothing();
        predictionsCount++;
      }
    }

    if (Array.isArray(snapshot.dailySentiment)) {
      const summary = await this.upsertDailySentiment(
        snapshot.dailySentiment.map(([, rec]) => rec),
        { persist: true }
      );
      dailySentimentCount = summary.inserted + summary.updatedToday;
    }

    return {
      users: usersCount,
      portfolios: portfoliosCount,
      watchlists: watchlistsCount,
      alerts: alertsCount,
      predictions: predictionsCount,
      dailySentiment: dailySentimentCount
    };
  }

  async flushToDisk(): Promise<void> {
    // PostgreSQL writes are immediately committed.
  }

  async reloadStoreFromDisk(): Promise<void> {
    // PostgreSQL repository reads directly from Postgres.
  }

  getStoreFilePath(): string {
    return 'postgresql://cloudsql';
  }
}
