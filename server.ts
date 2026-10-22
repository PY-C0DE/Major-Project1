/**
 * AlphaQuant AI - Full-Stack Express Server
 * Serves the React frontend via Vite middlewares on port 3000
 * and exposes real production REST endpoints for ML inference,
 * Split-Conformal Intervals, Market Regimes, KS Drift, News Sentiment, and Portfolios.
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

import {
  getStockQuote,
  getHistoricalData,
  searchStocks,
  TICKER_CATALOG,
  resolveTickerOrName
} from './src/server/services/stockService';
import { detectMarketRegime } from './src/server/math/hmmRegime';
import { runConformalPrediction } from './src/server/math/conformal';
import { detectConceptDrift } from './src/server/math/driftDetector';
import { getNewsForTicker, analyzeFinBERTTone } from './src/server/math/nlpEngine';
import { runModelEvaluation, computeProjectWideAccuracy } from './src/server/math/evaluation';
import { runStrategyBacktest } from './src/server/math/strategySimulator';
import { runAutomatedBacktest } from './src/server/math/automatedBacktest';
import { generateOptionsChain } from './src/server/math/optionsAnalytics';
import { computeCorrelationMatrix } from './src/server/math/correlation';
import { optimizePortfolioHoldings } from './src/server/math/portfolioOptimizer';
import { brokerService } from './src/server/services/brokerService';
import { getSocialFeed, getVerifiedTraders } from './src/server/services/socialService';
import { generateQuantCopilotAnswer } from './src/server/services/copilotKnowledge';
import { db, StoredPrediction } from './src/server/store/db';
import { generateSupportFallback } from './src/utils/supportKnowledge';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is required when NODE_ENV=production.');
  }
  const devSecret = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️ [SECURITY WARNING] JWT_SECRET is unset. Using an ephemeral random secret for development. Sessions will invalidate on server restart.');
  return devSecret;
}

const JWT_SECRET = getJwtSecret();

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

app.use(express.json({ limit: '100kb' }));

// Basic in-memory rate limiting for authentication endpoints
const authRateLimitMap = new Map<string, { count: number; resetTime: number }>();
function authRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = 15; // 15 attempts per minute per IP

  const record = authRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    authRateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (record.count >= maxAttempts) {
    return res.status(429).json({ error: 'Too many authentication attempts. Please try again after 1 minute.' });
  }

  record.count++;
  next();
}

app.use('/api/auth', authRateLimiter);

// Request logger for API calls
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

const ALLOW_DEMO_MODE = process.env.ALLOW_DEMO_MODE === 'true';

// Authentication Middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    if (ALLOW_DEMO_MODE) {
      req.user = {
        id: 'user-alphaquant-demo-1',
        email: 'alex.morgan@alphaquant.ai',
        name: 'Alex Morgan, CFA'
      };
      return next();
    }
    return res.status(401).json({ error: 'Authentication required. Missing token.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      if (ALLOW_DEMO_MODE) {
        req.user = {
          id: 'user-alphaquant-demo-1',
          email: 'alex.morgan@alphaquant.ai',
          name: 'Alex Morgan, CFA'
        };
        return next();
      }
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }
    req.user = decoded;
    next();
  });
}

function sanitizeUser(user: any) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

// -------------------------------------------------------------
// 1. AUTHENTICATION ENDPOINTS
// -------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'A valid name is required.' });
    }

    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address format is required.' });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.getUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      createdAt: new Date().toISOString(),
      passwordHash,
      isDemoUser: false,
      title: 'Quantitative Strategist',
      organization: 'Alpha Desk',
      currencyPreference: 'INR' as const,
      defaultExchange: 'NSE' as const,
      confidenceLevel: 90,
      twoFactorEnabled: false,
      timezone: 'Asia/Kolkata (IST)',
      bio: 'Quantitative market participant tracking high-probability conformal prediction envelopes.',
      notifications: {
        emailAlerts: true,
        regimeShifts: true,
        driftWarnings: true,
        marketOpenSummary: false
      }
    };

    db.createUser(newUser);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      user: sanitizeUser(newUser),
      token
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address format is required.' });
    }

    const user = db.getUserByEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      user: sanitizeUser(user),
      token
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = db.getUserById(req.user?.id || 'user-alphaquant-demo-1');
  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }
  return res.json(sanitizeUser(user));
});

app.put('/api/auth/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-alphaquant-demo-1';
    const {
      name,
      title,
      organization,
      phone,
      timezone,
      bio,
      avatarUrl,
      currencyPreference,
      defaultExchange,
      confidenceLevel,
      twoFactorEnabled,
      notifications
    } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (title !== undefined) updates.title = title;
    if (organization !== undefined) updates.organization = organization;
    if (phone !== undefined) updates.phone = phone;
    if (timezone !== undefined) updates.timezone = timezone;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (currencyPreference !== undefined) updates.currencyPreference = currencyPreference;
    if (defaultExchange !== undefined) updates.defaultExchange = defaultExchange;
    if (confidenceLevel !== undefined) updates.confidenceLevel = confidenceLevel;
    if (twoFactorEnabled !== undefined) updates.twoFactorEnabled = twoFactorEnabled;
    if (notifications !== undefined) updates.notifications = notifications;

    const updated = db.updateUser(userId, updates);
    if (!updated) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json(sanitizeUser(updated));
  } catch (err: any) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ error: 'Failed to update user profile.' });
  }
});

app.put('/api/auth/change-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-alphaquant-demo-1';
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    db.updateUser(userId, { passwordHash });

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('Error changing password:', err);
    return res.status(500).json({ error: 'Failed to update password.' });
  }
});

// -------------------------------------------------------------
// 2. STOCK MARKET & HISTORICAL DATA ENDPOINTS
// -------------------------------------------------------------

app.get('/api/stocks/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const results = await searchStocks(q);
    return res.json(results);
  } catch (error: any) {
    console.error('Error searching stocks:', error);
    return res.status(500).json({ error: 'Failed to search stocks.' });
  }
});

app.get('/api/stocks/:ticker', async (req: Request, res: Response) => {
  try {
    const ticker = await resolveTickerOrName(req.params.ticker);
    const quote = await getStockQuote(ticker);
    return res.json(quote);
  } catch (error: any) {
    console.error(`Error fetching quote for ${req.params.ticker}:`, error);
    return res.status(500).json({ error: 'Failed to retrieve stock quote.' });
  }
});

app.get('/api/stocks/:ticker/history', async (req: Request, res: Response) => {
  try {
    const ticker = await resolveTickerOrName(req.params.ticker);
    const days = parseInt((req.query.days as string) || '250', 10);
    const history = await getHistoricalData(ticker, days);
    return res.json(history);
  } catch (error: any) {
    console.error(`Error fetching history for ${req.params.ticker}:`, error);
    return res.status(500).json({ error: 'Failed to retrieve historical data.' });
  }
});

// -------------------------------------------------------------
// 3. NEWS & KEYWORD SENTIMENT ENDPOINTS (USP 3)
// -------------------------------------------------------------

app.get('/api/news/:ticker', async (req: Request, res: Response) => {
  try {
    const ticker = await resolveTickerOrName(req.params.ticker);
    const quote = await getStockQuote(ticker);
    const news = getNewsForTicker(ticker, quote.name);
    return res.json(news);
  } catch (error: any) {
    console.error(`Error fetching news for ${req.params.ticker}:`, error);
    return res.status(500).json({ error: 'Failed to retrieve financial news.' });
  }
});

app.get('/api/sentiment/:ticker', async (req: Request, res: Response) => {
  try {
    const ticker = await resolveTickerOrName(req.params.ticker);
    const quote = await getStockQuote(ticker);
    const news = getNewsForTicker(ticker, quote.name);

    let posSum = 0;
    let neuSum = 0;
    let negSum = 0;
    let totalScore = 0;

    news.forEach(n => {
      posSum += n.probabilities.positive;
      neuSum += n.probabilities.neutral;
      negSum += n.probabilities.negative;
      totalScore += n.sentimentScore;
    });

    const count = news.length || 1;
    const avgScore = Number((totalScore / count).toFixed(3));
    const posPct = Number(((posSum / count) * 100).toFixed(1));
    const neuPct = Number(((neuSum / count) * 100).toFixed(1));
    const negPct = Number(((negSum / count) * 100).toFixed(1));

    return res.json({
      ticker,
      sentimentScore: avgScore,
      label: avgScore > 0.15 ? 'Positive' : avgScore < -0.15 ? 'Negative' : 'Neutral',
      distribution: {
        positive: posPct,
        neutral: neuPct,
        negative: negPct
      },
      sampleCount: count,
      modelUsed: 'Keyword sentiment lexicon & rule-based credibility scoring',
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(`Error computing sentiment for ${req.params.ticker}:`, error);
    return res.status(500).json({ error: 'Failed to compute sentiment analysis.' });
  }
});

// -------------------------------------------------------------
// 4. MARKET REGIME DETECTION (USP 2)
// -------------------------------------------------------------

app.get('/api/regime/:ticker', async (req: Request, res: Response) => {
  try {
    const ticker = await resolveTickerOrName(req.params.ticker);
    const history = await getHistoricalData(ticker, 250);
    const regime = detectMarketRegime(history, ticker);
    return res.json(regime);
  } catch (error: any) {
    console.error(`Error detecting regime for ${req.params.ticker}:`, error);
    return res.status(500).json({ error: 'Failed to compute market regime.' });
  }
});

// -------------------------------------------------------------
// 5. CONFORMAL PREDICTION (USP 1)
// -------------------------------------------------------------

// Specific sub-paths registered before parameterized route /:ticker to avoid route shadowing
app.get('/api/predictions/history', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const ticker = req.query.ticker as string;
  const history = db.getPredictionHistory(req.user?.id, ticker);
  return res.json(history);
});

app.get('/api/predictions/:ticker', async (req: Request, res: Response) => {
  try {
    const ticker = await resolveTickerOrName(req.params.ticker);
    const horizon = parseInt((req.query.horizon as string) || '1', 10);
    const confidence = parseFloat((req.query.confidence as string) || '0.90');
    const history = await getHistoricalData(ticker, 250);
    const regime = detectMarketRegime(history, ticker);
    const quote = await getStockQuote(ticker);
    const news = getNewsForTicker(ticker, quote.name);
    const avgSentiment = news.reduce((acc, n) => acc + n.sentimentScore, 0) / (news.length || 1);

    const prediction = runConformalPrediction(
      history,
      ticker,
      avgSentiment,
      regime.regimeId,
      confidence,
      horizon
    );

    return res.json(prediction);
  } catch (error: any) {
    console.error(`Error computing conformal prediction for ${req.params.ticker}:`, error);
    return res.status(500).json({ error: 'Failed to generate conformal prediction.' });
  }
});

app.post('/api/predictions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ticker } = req.body;
    if (!ticker) return res.status(400).json({ error: 'Ticker symbol is required.' });

    const sym = await resolveTickerOrName(ticker);
    const history = await getHistoricalData(sym, 250);
    const regime = detectMarketRegime(history, sym);
    const news = getNewsForTicker(sym, sym);
    const avgSentiment = news.reduce((acc, n) => acc + n.sentimentScore, 0) / (news.length || 1);
    const fullUser = req.user?.id ? db.getUserById(req.user.id) : null;
    const userConf = (fullUser?.confidenceLevel ? fullUser.confidenceLevel / 100 : 0.90);
    const pred = runConformalPrediction(history, sym, avgSentiment, regime.regimeId, userConf);

    const stored: StoredPrediction = {
      id: `pred-${Date.now()}`,
      userId: req.user?.id || 'user-alphaquant-demo-1',
      ticker: sym,
      currentPrice: pred.currentPrice,
      predictedPrice: pred.predictedPrice,
      lowerBound: pred.lowerBound,
      upperBound: pred.upperBound,
      confidenceLevel: pred.confidenceLevel,
      marketRegime: regime.currentRegime,
      sentimentScore: avgSentiment,
      timestamp: pred.predictionTimestamp
    };

    db.addPrediction(stored);
    return res.json(pred);
  } catch (error: any) {
    console.error('Error saving prediction:', error);
    return res.status(500).json({ error: 'Failed to record prediction.' });
  }
});

// -------------------------------------------------------------
// 6. CONCEPT DRIFT MONITORING (USP 4)
// -------------------------------------------------------------

app.get('/api/drift/:ticker', async (req: Request, res: Response) => {
  try {
    const ticker = await resolveTickerOrName(req.params.ticker);
    const history = await getHistoricalData(ticker, 250);
    const drift = detectConceptDrift(history, ticker);
    return res.json(drift);
  } catch (error: any) {
    console.error(`Error running drift detection for ${req.params.ticker}:`, error);
    return res.status(500).json({ error: 'Failed to compute drift metrics.' });
  }
});

// -------------------------------------------------------------
// 7. MODEL EVALUATION & HEALTH ENDPOINTS
// -------------------------------------------------------------

app.get('/api/model/metrics', async (req: Request, res: Response) => {
  try {
    const rawTicker = (req.query.ticker as string) || 'RELIANCE.NS';
    const ticker = await resolveTickerOrName(rawTicker);
    const history = await getHistoricalData(ticker, 250);
    const evaluation = runModelEvaluation(history, ticker);
    return res.json(evaluation);
  } catch (error: any) {
    console.error('Error computing evaluation metrics:', error);
    return res.status(500).json({ error: 'Failed to evaluate model performance.' });
  }
});

// Dynamic Project-Wide Price Accuracy Metric (100% - MAPE across catalog assets)
app.get('/api/metrics/accuracy', async (req: Request, res: Response) => {
  try {
    const tickers = TICKER_CATALOG.map(t => t.ticker);
    const result = await computeProjectWideAccuracy(getHistoricalData, tickers);
    return res.json(result);
  } catch (error: any) {
    console.error('Error computing project-wide accuracy metric:', error);
    return res.status(500).json({ error: 'Failed to compute aggregate accuracy metric.' });
  }
});

app.get('/api/model/health', async (req: Request, res: Response) => {
  try {
    const sampleTickers = ['RELIANCE.NS', 'TCS.NS', 'NVDA', 'AAPL'];
    let driftingCount = 0;

    for (const t of sampleTickers) {
      const history = await getHistoricalData(t, 180);
      const drift = detectConceptDrift(history, t);
      if (drift.driftDetected) driftingCount++;
    }

    const isSystemHealthy = driftingCount === 0;

    // Evaluate real accuracy metrics dynamically from active benchmark asset
    const evalData = await getHistoricalData('RELIANCE.NS', 180);
    const evalMetrics = runModelEvaluation(evalData, 'RELIANCE.NS');

    return res.json({
      status: isSystemHealthy ? 'Optimal' : 'Caution - Distribution Drift',
      healthy: isSystemHealthy,
      activeModelsCount: 4,
      conformalCoverageTarget: 0.90,
      empiricalCoverageObserved: evalMetrics.backtestSeries.length > 0
        ? Number((evalMetrics.backtestSeries.filter(b => b.actual >= b.lower && b.actual <= b.upper).length / evalMetrics.backtestSeries.length).toFixed(3))
        : Number(((evalMetrics.conformalCoverage ?? 0) / 100).toFixed(3)),
      directionalAccuracy: evalMetrics.directionalAccuracy,
      lastAuditTimestamp: new Date().toISOString(),
      regimeModel: 'Rule-Based Regime Classifier (Trend & Volatility States)',
      predictionEngine: 'AlphaQuant Ridge Regression (8 Technical Features) with Split-Conformal Intervals',
      driftDetector: 'Two-Sample Kolmogorov-Smirnov (p-threshold: 0.05)'
    });
  } catch (error: any) {
    console.error('Error in model health check:', error);
    return res.status(500).json({ error: 'Failed to get system health.' });
  }
});

// -------------------------------------------------------------
// 7B. QUANTITATIVE STRATEGY SIMULATOR & CROSS-ASSET CORRELATION
// -------------------------------------------------------------

app.get('/api/strategy/backtest', async (req: Request, res: Response) => {
  try {
    const rawTicker = (req.query.ticker as string) || 'RELIANCE.NS';
    const ticker = await resolveTickerOrName(rawTicker);
    const strategy = (req.query.strategy as any) || 'conformal_reversion';
    const history = await getHistoricalData(ticker, 250);
    const backtestResult = runStrategyBacktest(history, ticker, strategy);
    return res.json(backtestResult);
  } catch (error: any) {
    console.error('Error running strategy backtest:', error);
    return res.status(500).json({ error: 'Failed to simulate quantitative strategy.' });
  }
});

app.get('/api/markets/correlation', async (req: Request, res: Response) => {
  try {
    const tickers = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'NVDA', 'AAPL', 'MSFT'];
    const histMap: Record<string, any> = {};
    const regimeMap: Record<string, string> = {};

    await Promise.all(
      tickers.map(async t => {
        try {
          const h = await getHistoricalData(t, 90);
          const r = detectMarketRegime(h, t);
          histMap[t] = h;
          regimeMap[t] = r.currentRegime;
        } catch {}
      })
    );

    const correlation = computeCorrelationMatrix(tickers, histMap, regimeMap);
    return res.json(correlation);
  } catch (error: any) {
    console.error('Error computing cross-asset correlation:', error);
    return res.status(500).json({ error: 'Failed to compute market correlation matrix.' });
  }
});

// -------------------------------------------------------------
// 7C. OPTIONS CHAINS & BLACK-SCHOLES GREEKS ANALYTICS
// -------------------------------------------------------------

app.get('/api/options/:ticker', async (req: Request, res: Response) => {
  try {
    const sym = await resolveTickerOrName(req.params.ticker);
    const quote = await getStockQuote(sym);
    const days = parseInt((req.query.days as string) || '30', 10);
    const chain = generateOptionsChain(sym, quote.price, 0.25, days);
    return res.json(chain);
  } catch (error: any) {
    console.error(`Error generating options chain for ${req.params.ticker}:`, error);
    return res.status(500).json({ error: 'Failed to generate options analytics.' });
  }
});

// -------------------------------------------------------------
// 7D. AUTOMATED BACKTESTING FRAMEWORK (STRATEGY VS BENCHMARK)
// -------------------------------------------------------------

app.get('/api/backtest/automated', async (req: Request, res: Response) => {
  try {
    const ticker = await resolveTickerOrName((req.query.ticker as string) || 'NVDA');
    const strategy = (req.query.strategy as any) || 'xgboost_conformal';
    const days = parseInt((req.query.days as string) || '90', 10);
    const capital = parseFloat((req.query.capital as string) || '100000');
    const history = await getHistoricalData(ticker, Math.max(120, days + 20));
    const result = runAutomatedBacktest(history, ticker, strategy, capital, days);
    return res.json(result);
  } catch (error: any) {
    console.error('Error running automated backtest:', error);
    return res.status(500).json({ error: 'Failed to execute automated backtest.' });
  }
});

// -------------------------------------------------------------
// 7E. DIRECT BROKER ROUTER & ALPACA PAPER TRADING GATEWAY
// -------------------------------------------------------------

app.get('/api/broker/account', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  return res.json(brokerService.getAccount());
});

app.get('/api/broker/orders', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  return res.json(brokerService.getOrders());
});

app.post('/api/broker/order', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ticker, side, qty, type, limitPrice, stopLossPrice, takeProfitPrice, timeInForce } = req.body;
    if (!ticker || !side || !qty || !type) {
      return res.status(400).json({ error: 'Ticker, side, qty, and type are required.' });
    }
    const sym = await resolveTickerOrName(ticker);
    const quote = await getStockQuote(sym);
    const order = brokerService.placeOrder({
      ticker: sym,
      side,
      qty: Number(qty),
      type,
      limitPrice: limitPrice ? Number(limitPrice) : undefined,
      stopLossPrice: stopLossPrice ? Number(stopLossPrice) : undefined,
      takeProfitPrice: takeProfitPrice ? Number(takeProfitPrice) : undefined,
      timeInForce,
      currentMarketPrice: quote.price
    });
    return res.status(201).json(order);
  } catch (error: any) {
    console.error('Broker order error:', error);
    return res.status(400).json({ error: error.message || 'Failed to execute order.' });
  }
});

app.delete('/api/broker/order/:orderId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const success = brokerService.cancelOrder(req.params.orderId);
  if (!success) {
    return res.status(404).json({ error: 'Order not found or cannot be canceled.' });
  }
  return res.json({ success: true, message: 'Order canceled successfully.' });
});

// -------------------------------------------------------------
// 7F. SOCIAL TRADING & COPY-TRADE FEEDS
// -------------------------------------------------------------

app.get('/api/social/feed', (req: Request, res: Response) => {
  const ticker = req.query.ticker as string | undefined;
  return res.json(getSocialFeed(ticker));
});

app.get('/api/social/traders', (_req: Request, res: Response) => {
  return res.json(getVerifiedTraders());
});

app.post('/api/social/copy-trade', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { traderId } = req.body;
    const traders = getVerifiedTraders();
    const trader = traders.find(t => t.id === traderId);
    if (!trader) {
      return res.status(404).json({ error: 'Verified trader not found.' });
    }
    if (req.user?.id) {
      const holdings = await Promise.all(
        trader.holdings.map(async (h) => {
          const q = await getStockQuote(h.ticker);
          const allocatedVal = 50000 * (h.weightPct / 100);
          const qty = Math.max(1, Math.floor(allocatedVal / q.price));
          return {
            id: `hold-${Date.now()}-${h.ticker}`,
            ticker: h.ticker,
            companyName: q.name,
            quantity: qty,
            avgBuyPrice: q.price,
            averageBuyPrice: q.price,
            currentPrice: q.price,
            totalInvested: qty * q.price,
            currentValue: qty * q.price,
            pnl: 0,
            unrealizedPnl: 0,
            pnlPercent: 0,
            unrealizedPnlPercent: 0,
            sector: 'Diversified',
            currency: q.currency,
            purchaseDate: new Date().toISOString().split('T')[0],
            addedAt: new Date().toISOString()
          };
        })
      );
      const userId = req.user?.id || 'user-alphaquant-demo-1';
      db.savePortfolio(userId, holdings);
    }
    return res.json({
      success: true,
      message: `Successfully mirrored portfolio of ${trader.name}. Holdings synchronized.`,
      trader
    });
  } catch (error: any) {
    console.error('Error copying trader portfolio:', error);
    return res.status(500).json({ error: 'Failed to synchronize copy trade.' });
  }
});

// -------------------------------------------------------------
// 8. USER PORTFOLIO ENDPOINTS
// -------------------------------------------------------------

app.get('/api/portfolio', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-alphaquant-demo-1';
    const holdings = db.getPortfolio(userId);

    // Refresh current prices
    const updated = await Promise.all(
      holdings.map(async h => {
        try {
          const q = await getStockQuote(h.ticker);
          const currentPrice = q.price;
          const currentValue = Number((currentPrice * h.quantity).toFixed(2));
          const pnl = Number((currentValue - h.totalInvested).toFixed(2));
          const pnlPercent = Number(((pnl / h.totalInvested) * 100).toFixed(2));
          return {
            ...h,
            currentPrice,
            currentValue,
            pnl,
            pnlPercent
          };
        } catch {
          return h;
        }
      })
    );

    return res.json(updated);
  } catch (error: any) {
    console.error('Error retrieving portfolio:', error);
    return res.status(500).json({ error: 'Failed to retrieve portfolio holdings.' });
  }
});

app.post('/api/portfolio', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-alphaquant-demo-1';
    const { ticker, quantity, avgBuyPrice, purchaseDate, notes } = req.body;

    if (!ticker || !quantity || !avgBuyPrice) {
      return res.status(400).json({ error: 'Ticker, quantity, and avgBuyPrice are required.' });
    }

    const sym = await resolveTickerOrName(ticker);
    const quote = await getStockQuote(sym);
    const qty = parseFloat(quantity);
    const buyPrice = parseFloat(avgBuyPrice);
    const totalInvested = Number((qty * buyPrice).toFixed(2));
    const currentValue = Number((qty * quote.price).toFixed(2));
    const pnl = Number((currentValue - totalInvested).toFixed(2));
    const pnlPercent = Number(((pnl / totalInvested) * 100).toFixed(2));

    const holding = {
      id: `hold-${Date.now()}`,
      ticker: sym,
      companyName: quote.name,
      quantity: qty,
      avgBuyPrice: buyPrice,
      currentPrice: quote.price,
      totalInvested,
      currentValue,
      pnl,
      pnlPercent,
      purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
      notes: notes || ''
    };

    db.addHolding(userId, holding);
    return res.status(201).json(holding);
  } catch (error: any) {
    console.error('Error adding holding:', error);
    return res.status(500).json({ error: 'Failed to add holding.' });
  }
});

app.put('/api/portfolio/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'user-alphaquant-demo-1';
  const updated = db.updateHolding(userId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Holding not found.' });
  return res.json(updated);
});

app.delete('/api/portfolio/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'user-alphaquant-demo-1';
  db.deleteHolding(userId, req.params.id);
  return res.json({ success: true, message: 'Holding removed successfully.' });
});

// Mean-Variance Optimization & Rebalance Suggester
app.post('/api/portfolio/optimize', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-alphaquant-demo-1';
    const objective = (req.body?.objective as any) || 'max_sharpe';
    let holdings: any[] = req.body?.holdings;

    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      holdings = db.getPortfolio(userId);
    }

    if (holdings.length === 0) {
      return res.status(400).json({ error: 'Cannot optimize an empty portfolio. Add positions first.' });
    }

    // Refresh quotes and values
    const refreshedHoldings = await Promise.all(
      holdings.map(async h => {
        try {
          const q = await getStockQuote(h.ticker);
          const currentPrice = q.price;
          const currentValue = Number((currentPrice * h.quantity).toFixed(2));
          return {
            ...h,
            currentPrice,
            currentValue,
            companyName: h.companyName || q.name
          };
        } catch {
          return h;
        }
      })
    );

    // Fetch historical data for all assets in portfolio
    const historicalMap: Record<string, any> = {};
    await Promise.all(
      refreshedHoldings.map(async h => {
        try {
          const hist = await getHistoricalData(h.ticker, 120);
          historicalMap[h.ticker] = hist;
        } catch {
          historicalMap[h.ticker] = [];
        }
      })
    );

    const riskFreeRate = req.body?.riskFreeRate !== undefined ? parseFloat(req.body.riskFreeRate) : 0.05;
    const maxWeightCap = req.body?.maxWeightCap !== undefined ? parseFloat(req.body.maxWeightCap) : 0.55;
    const minWeightFloor = req.body?.minWeightFloor !== undefined ? parseFloat(req.body.minWeightFloor) : 0.04;

    const result = optimizePortfolioHoldings(
      refreshedHoldings,
      historicalMap,
      objective,
      riskFreeRate,
      maxWeightCap,
      minWeightFloor
    );
    return res.json(result);
  } catch (error: any) {
    console.error('Portfolio optimization error:', error);
    return res.status(500).json({ error: 'Failed to optimize portfolio allocations.' });
  }
});

app.post('/api/portfolio/rebalance/apply', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-alphaquant-demo-1';
    const { suggestions } = req.body;

    if (!suggestions || !Array.isArray(suggestions)) {
      return res.status(400).json({ error: 'Rebalance suggestions array is required.' });
    }

    const currentHoldings = db.getPortfolio(userId);

    for (const sug of suggestions) {
      const match = currentHoldings.find(h => h.id === sug.holdingId || h.ticker === sug.ticker);
      if (match) {
        const newQty = sug.targetQuantity;
        const newTotalInvested = Number((newQty * match.avgBuyPrice).toFixed(2));
        const newCurrentValue = Number((newQty * match.currentPrice).toFixed(2));
        const newPnl = Number((newCurrentValue - newTotalInvested).toFixed(2));
        const newPnlPercent = newTotalInvested > 0 ? Number(((newPnl / newTotalInvested) * 100).toFixed(2)) : 0;

        db.updateHolding(userId, match.id, {
          quantity: newQty,
          totalInvested: newTotalInvested,
          currentValue: newCurrentValue,
          pnl: newPnl,
          pnlPercent: newPnlPercent,
          notes: `${match.notes || ''} [MVO Rebalanced to ${sug.optimalWeightPct}%]`.trim()
        });
      }
    }

    const updated = db.getPortfolio(userId);
    return res.json({ success: true, message: 'Portfolio successfully rebalanced to optimal weights.', holdings: updated });
  } catch (error: any) {
    console.error('Rebalance execution error:', error);
    return res.status(500).json({ error: 'Failed to apply rebalancing.' });
  }
});

// -------------------------------------------------------------
// 9. WATCHLIST ENDPOINTS
// -------------------------------------------------------------

app.get('/api/watchlist', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-alphaquant-demo-1';
    const tickers = db.getWatchlist(userId);

    const items = await Promise.all(
      tickers.map(async (ticker, idx) => {
        try {
          const quote = await getStockQuote(ticker);
          const history = await getHistoricalData(ticker, 90);
          const regime = detectMarketRegime(history, ticker);
          const drift = detectConceptDrift(history, ticker);
          const news = getNewsForTicker(ticker, quote.name);
          const avgSent = news.reduce((acc, n) => acc + n.sentimentScore, 0) / (news.length || 1);
          const pred = runConformalPrediction(history, ticker, avgSent, regime.regimeId, 0.90);

          return {
            id: `watch-${idx}-${ticker}`,
            ticker,
            companyName: quote.name,
            currentPrice: quote.price,
            dailyChange: quote.change,
            dailyChangePercent: quote.changePercent,
            predictedPrice: pred.predictedPrice,
            lowerBound: pred.lowerBound,
            upperBound: pred.upperBound,
            regime: regime.currentRegime,
            sentiment: avgSent > 0.15 ? 'positive' : avgSent < -0.15 ? 'negative' : 'neutral',
            driftStatus: drift.driftDetected ? 'Drift Detected' : 'Healthy'
          };
        } catch {
          return null;
        }
      })
    );

    return res.json(items.filter(Boolean));
  } catch (error: any) {
    console.error('Error fetching watchlist:', error);
    return res.status(500).json({ error: 'Failed to retrieve watchlist.' });
  }
});

app.post('/api/watchlist', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'user-alphaquant-demo-1';
  const { ticker } = req.body;
  if (!ticker) return res.status(400).json({ error: 'Ticker symbol is required.' });
  const sym = await resolveTickerOrName(ticker);
  const updated = db.addToWatchlist(userId, sym);
  return res.json({ success: true, watchlist: updated });
});

app.delete('/api/watchlist/:ticker', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'user-alphaquant-demo-1';
  const sym = await resolveTickerOrName(req.params.ticker);
  const updated = db.removeFromWatchlist(userId, sym);
  return res.json({ success: true, watchlist: updated });
});

// -------------------------------------------------------------
// 10. ALERTS ENDPOINTS
// -------------------------------------------------------------

app.get('/api/alerts', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'user-alphaquant-demo-1';
  const alerts = db.getAlerts(userId);
  return res.json(alerts);
});

app.post('/api/alerts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'user-alphaquant-demo-1';
  const { ticker, type, threshold, label } = req.body;
  if (!ticker || !type || !label) {
    return res.status(400).json({ error: 'Ticker, type, and label are required.' });
  }
  const sym = await resolveTickerOrName(ticker);
  const newAlert = {
    id: `alert-${Date.now()}`,
    ticker: sym,
    type,
    threshold: threshold ? parseFloat(threshold) : undefined,
    label,
    enabled: true,
    createdAt: new Date().toISOString()
  };
  db.createAlert(userId, newAlert);
  return res.status(201).json(newAlert);
});

app.put('/api/alerts/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'user-alphaquant-demo-1';
  const { enabled } = req.body;
  const updated = db.toggleAlert(userId, req.params.id, Boolean(enabled));
  if (!updated) return res.status(404).json({ error: 'Alert not found.' });
  return res.json(updated);
});

app.delete('/api/alerts/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'user-alphaquant-demo-1';
  db.deleteAlert(userId, req.params.id);
  return res.json({ success: true, message: 'Alert removed.' });
});

// -------------------------------------------------------------
// 11. CUSTOMER SUPPORT & QUANT ASSISTANT CHATBOT (GEMINI API)
// -------------------------------------------------------------

app.post(['/api/support/chat', '/api/support/chat/'], async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const lastMessage = messages[messages.length - 1];
    const userPrompt = lastMessage.content || '';
    const lowerPrompt = userPrompt.toLowerCase();

    // Determine relevant action suggestions based on user query
    const suggestedActions: Array<{ label: string; action: string }> = [];

    if (
      lowerPrompt.includes('sign up') ||
      lowerPrompt.includes('register') ||
      lowerPrompt.includes('account') ||
      lowerPrompt.includes('join') ||
      lowerPrompt.includes('start')
    ) {
      suggestedActions.push({ label: '🚀 Create Free Account', action: 'auth:register' });
      suggestedActions.push({ label: '🔐 Client Login', action: 'auth:login' });
    } else if (lowerPrompt.includes('login') || lowerPrompt.includes('sign in')) {
      suggestedActions.push({ label: '🔐 Client Login', action: 'auth:login' });
    }

    if (
      lowerPrompt.includes('dashboard') ||
      lowerPrompt.includes('market') ||
      lowerPrompt.includes('nifty') ||
      lowerPrompt.includes('tape')
    ) {
      suggestedActions.push({ label: '📊 Open Dashboard', action: 'nav:dashboard' });
    }

    if (
      lowerPrompt.includes('watchlist') ||
      lowerPrompt.includes('wishlist') ||
      lowerPrompt.includes('track') ||
      lowerPrompt.includes('favorite')
    ) {
      suggestedActions.push({ label: '📑 View Watchlist', action: 'nav:watchlist' });
    }

    if (
      lowerPrompt.includes('portfolio') ||
      lowerPrompt.includes('holding') ||
      lowerPrompt.includes('p&l') ||
      lowerPrompt.includes('profit')
    ) {
      suggestedActions.push({ label: '💼 Open Portfolio', action: 'nav:portfolio' });
    }

    if (
      lowerPrompt.includes('analysis') ||
      lowerPrompt.includes('chart') ||
      lowerPrompt.includes('reliance') ||
      lowerPrompt.includes('nvda')
    ) {
      suggestedActions.push({ label: '🔍 Deep Stock Analysis', action: 'nav:analysis' });
    }

    if (
      lowerPrompt.includes('drift') ||
      lowerPrompt.includes('model') ||
      lowerPrompt.includes('metric') ||
      lowerPrompt.includes('accuracy')
    ) {
      suggestedActions.push({ label: '📈 Model Evaluation', action: 'nav:performance' });
    }

    const systemInstruction = `You are the AlphaQuant AI Customer Support and Quantitative Assistant.
AlphaQuant AI is an institutional-grade, full-stack AI financial stock intelligence platform.
Key product capabilities:
1. Access & Protection: Public Home page features an institutional overview and quantitative preview widget. Gated features like Dashboard, Watchlist, Portfolio, Deep Analysis, Model Metrics, and Alerts require user registration or login.
2. Split-Conformal Prediction: Implements split-conformal prediction intervals calculating mathematically grounded finite-sample coverage [lowerBound, upperBound] at nominal confidence (default 90%), avoiding deceptive deterministic single-point forecasts.
3. Rule-Based Market Regime Detection: Classifies market conditions into Low Volatility / Bullish (State 0) and High Volatility / Bearish (State 1) to identify volatility shifts.
4. News Sentiment & Credibility Scoring: Combines keyword sentiment analysis with domain publisher credibility weighting to filter noise and unverified rumors.
5. Kolmogorov-Smirnov Concept Drift Monitor: Evaluates two-sample KS tests (p < 0.05 alert trigger) comparing training baselines against live 30-day inference windows.
6. Multi-Asset Coverage: Dual-exchange support for Indian NSE equities (RELIANCE.NS, TCS.NS, INFY.NS, etc.) and US NASDAQ/NYSE equities (NVDA, AAPL, MSFT, GOOGL).
7. Profile & Avatars: Users can customize their identity using 20 Google Play Games-inspired vector avatars or uploading custom pictures.
8. Disclaimers: All outputs are for quantitative research, backtesting, and educational purposes. Not financial or investment advice.

Guidelines:
- Provide clear, friendly, and structured answers using bullet points and bold highlights.
- Keep responses concise and focused on helping the customer.
- Always include an appropriate disclaimer when discussing price predictions or trading risks.`;

    // Attempt Gemini call if API client is present with a timeout race
    if (ai) {
      try {
        const formattedContents = messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));

        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
        const generatePromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.7,
          }
        });

        const response: any = await Promise.race([generatePromise, timeoutPromise]);
        const replyText = response?.text;
        if (replyText && replyText.trim()) {
          return res.json({
            reply: replyText.trim(),
            suggestedActions: suggestedActions.slice(0, 3)
          });
        }
      } catch {
        // Transparently fall back to high-fidelity domain knowledge engine
      }
    }

    // High-fidelity fallback knowledge engine
    const fallbackReply = generateSupportFallback(userPrompt);
    return res.json({
      reply: fallbackReply,
      suggestedActions: suggestedActions.slice(0, 3)
    });
  } catch (error: any) {
    console.error('Support chat error:', error?.message || error);
    const fallbackReply = generateSupportFallback('general help');
    return res.json({
      reply: fallbackReply,
      suggestedActions: []
    });
  }
});

// Floating AlphaBot Copilot Assistant Endpoint
app.post('/api/copilot/chat', async (req: Request, res: Response) => {
  try {
    const { message, contextTicker } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    if (ai) {
      try {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
        const generatePromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are AlphaBot, an elite Quantitative Finance & AI Terminal Copilot at AlphaQuant AI.
Provide mathematical rigor, concise explanations, and terminal guidance.
Topics:
- Split-Conformal prediction intervals C(X) = [y_hat - q_{1-alpha}, y_hat + q_{1-alpha}], empirical finite-sample coverage guarantees.
- Black-Scholes Greeks: Delta, Gamma, Theta, Vega, Rho, IV smile/skew, expected moves.
- Kolmogorov-Smirnov 2-sample concept drift test D-statistic & p-values.
- Markowitz MVO & Sharpe Ratio optimization, covariance singularity protection.
- Alpaca Paper Trading Gateway & order execution (Stop Loss, Profit Targets).
- Custom quantitative indicators (CVR, RMO).

Context Ticker: ${contextTicker || 'Global Markets'}.
User Question: "${message}".`
                }
              ]
            }
          ]
        });

        const response: any = await Promise.race([generatePromise, timeoutPromise]);
        const replyText = response?.text;
        if (replyText && replyText.trim()) {
          return res.json({ reply: replyText.trim() });
        }
      } catch (geminiErr) {
        console.warn('Gemini Copilot fallback triggered:', geminiErr);
      }
    }

    const fallbackAnswer = generateQuantCopilotAnswer(message, contextTicker);
    return res.json({ reply: fallbackAnswer });
  } catch (error: any) {
    console.error('Copilot chat error:', error);
    return res.status(500).json({ error: 'Failed to process Copilot request.' });
  }
});

// Ensure any unhandled /api route returns JSON 404, never falling through to Vite HTML
app.all('/api/*', (req: Request, res: Response) => {
  return res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

// -------------------------------------------------------------
// 11. VITE INTEGRATION & SERVER STARTUP
// -------------------------------------------------------------

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production static files
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AlphaQuant AI] Full-Stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
