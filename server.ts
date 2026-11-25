/**
 * AlphaQuant AI - Full-Stack Express Server
 * Serves the React frontend via Vite middlewares on port 3000
 * and exposes real production REST endpoints for ML inference,
 * Split-Conformal Intervals, Market Regimes, KS Drift, News Sentiment, and Portfolios.
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  requestLoggerMiddleware,
  emitStructuredLog
} from './src/server/middleware/logger';
import {
  validateBody,
  validateQuery,
  registerSchema,
  loginSchema,
  firebaseAuthSchema,
  profileUpdateSchema,
  changePasswordSchema,
  tickerSearchQuerySchema,
  createPredictionSchema,
  addPortfolioHoldingSchema,
  batchPortfolioSchema,
  optimizePortfolioSchema,
  correlationPortfolioSchema,
  watchlistAddSchema,
  createAlertSchema,
  toggleAlertSchema,
  brokerOrderSchema,
  createBackgroundJobSchema,
  verifyEmailRequestSchema,
  verifyEmailConfirmSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  deleteAccountSchema
} from './src/server/middleware/validation';
import { getBackgroundJobQueue, JobQueueDriver } from './src/server/jobs/jobQueue';
import { getMarketDataProvider } from './src/server/providers/marketDataProvider';
import {
  getMailProvider,
  buildAppBaseUrl,
  escapeHtml
} from './src/server/services/mailService';

import {
  getStockQuote,
  getHistoricalData,
  getHistoricalDataWithSource,
  HistoricalDataResult,
  searchStocks,
  searchTickersMaster,
  TICKER_CATALOG,
  resolveTickerOrName,
  getMarketIndices,
  getQuickWatchQuotes
} from './src/server/services/stockService';
import { detectMarketRegime } from './src/server/math/hmmRegime';
import { runConformalPrediction, MIN_CONFORMAL_BARS } from './src/server/math/conformal';
import { detectConceptDrift } from './src/server/math/driftDetector';
import { getNewsForTicker, getHybridNewsForTicker, analyzeKeywordSentiment, getAllMarketHeadlines, getAllMarketHeadlinesAsync } from './src/server/math/nlpEngine';
import { DEFAULT_CONFORMAL_CONFIDENCE, DEFAULT_BACKTEST_STRATEGY } from './src/shared/modelConfig';
import { isConformalPredictionAvailable, DailySentimentRecord, ComplianceConfig } from './src/types';
import { computeTickerLagAnalysis, computePooledLagAnalysis } from './src/server/math/lagAnalysis';
import {
  runModelEvaluation,
  computeProjectWideAccuracy,
  runAggregateModelEvaluation,
  isModelEvaluationAvailable,
  buildModelAuditPayload,
  UniverseTickerMeta
} from './src/server/math/evaluation';
import { runStrategyBacktest } from './src/server/math/strategySimulator';
import { runAutomatedBacktest } from './src/server/math/automatedBacktest';
import { generateOptionsChain, generateVolatilitySurface } from './src/server/math/optionsAnalytics';
import { computeCorrelationMatrix } from './src/server/math/correlation';
import { optimizePortfolioHoldings } from './src/server/math/portfolioOptimizer';
import { brokerService } from './src/server/services/brokerService';
import { getSocialFeed, getVerifiedTraders } from './src/server/services/socialService';
import { generateQuantCopilotAnswer } from './src/server/services/copilotKnowledge';
import { getEarningsCalendarData } from './src/server/services/earningsService';
import { computeSeasonality } from './src/server/math/seasonality';
import { getFxRates } from './src/server/services/fxService';
import { db, StoredPrediction } from './src/server/store/db';
import { adminAuth } from './src/lib/firebase-admin';
import { inferCurrencyFromTicker } from './src/utils/currency';
import { generateSupportFallback } from './src/utils/supportKnowledge';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const KNOWN_PLACEHOLDER_JWT_SECRET = 'super_secret_jwt_alphaquant_key_replace_in_production_32char_min';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (process.env.NODE_ENV === 'production') {
    if (!secret) {
      throw new Error('FATAL: JWT_SECRET environment variable is required when NODE_ENV=production.');
    }
    if (secret.length < 32) {
      throw new Error('FATAL: JWT_SECRET must be at least 32 characters long when NODE_ENV=production.');
    }
    if (secret === KNOWN_PLACEHOLDER_JWT_SECRET) {
      throw new Error('FATAL: JWT_SECRET must not use the old public placeholder value when NODE_ENV=production.');
    }
    return secret;
  }
  if (secret) {
    return secret;
  }
  const devSecret = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️ [SECURITY WARNING] JWT_SECRET is unset. Using an ephemeral random secret for development. Sessions will invalidate on server restart.');
  return devSecret;
}

async function buildSentimentMapFromDb(): Promise<Map<string, DailySentimentRecord[]>> {
  const map = new Map<string, DailySentimentRecord[]>();
  for (const rec of await db.getAllDailySentiment()) {
    const key = rec.ticker.toUpperCase();
    const list = map.get(key) || [];
    list.push(rec);
    map.set(key, list);
  }
  return map;
}

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

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface CreateAppOptions {
  allowDemoMode?: boolean;
  jwtSecret?: string;
  fetchHistoryWithSource?: (ticker: string, days: number) => Promise<HistoricalDataResult>;
  allowedOrigins?: string[];
  apiRateLimitMax?: number;
  authRateLimitMax?: number;
  heavyRateLimitMax?: number;
  jobQueue?: JobQueueDriver;
  readinessCheck?: () => Promise<boolean>;
}

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://aistudio.google.com'
];

export function resolveCorsOriginAllowed(
  origin: string | undefined,
  explicitAllowlist?: string[]
): boolean {
  // Same-origin / server-to-server / curl without Origin header
  if (!origin) return true;

  if (explicitAllowlist && explicitAllowlist.length > 0) {
    return explicitAllowlist.includes(origin);
  }

  const envOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const configured = new Set<string>([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...envOrigins,
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim()] : []),
    ...(process.env.BACKEND_URL ? [process.env.BACKEND_URL.trim()] : [])
  ]);

  if (configured.has(origin)) return true;

  try {
    const parsed = new URL(origin);
    if (
      parsed.protocol === 'https:' &&
      (parsed.hostname.endsWith('.run.app') ||
        parsed.hostname.endsWith('.googleusercontent.com') ||
        parsed.hostname.endsWith('.web.app'))
    ) {
      return true;
    }
    if (
      process.env.NODE_ENV !== 'production' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

class CorsOriginError extends Error {
  status = 403;
  constructor(origin: string) {
    super(`Origin not allowed by CORS policy: ${origin}`);
    this.name = 'CorsOriginError';
  }
}

export function createApp(options: CreateAppOptions = {}): express.Express {
  const app = express();
  const JWT_SECRET = options.jwtSecret ?? getJwtSecret();
  const fetchHistoryWithSource = options.fetchHistoryWithSource ?? getHistoricalDataWithSource;
  const ALLOW_DEMO_MODE = options.allowDemoMode ?? (process.env.ALLOW_DEMO_MODE === 'true');
  const jobQueue = options.jobQueue ?? getBackgroundJobQueue();

  app.disable('x-powered-by');
  app.use(
    helmet({
      // Preview renders in AI Studio iframe and bundles scripts via Vite
      frameguard: false,
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (resolveCorsOriginAllowed(origin, options.allowedOrigins)) {
          callback(null, true);
        } else {
          callback(new CorsOriginError(origin || 'unknown'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
    })
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(requestLoggerMiddleware);

  // Operational health & readiness probes (registered outside rate limiters)
  app.get('/healthz', (_req: Request, res: Response) => {
    return res.status(200).json({
      status: 'ok',
      service: 'alphaquant-api',
      uptimeSec: Number(process.uptime().toFixed(2)),
      timestamp: new Date().toISOString()
    });
  });

  app.get('/readyz', async (_req: Request, res: Response) => {
    try {
      const dbOk = options.readinessCheck
        ? await options.readinessCheck()
        : (await db.searchTickers({ limit: 1, page: 1 }), true);
      const queuePing = await jobQueue.ping();
      const queueStats = await jobQueue.getStatsAsync();

      if (!dbOk || !queuePing.ok) {
        return res.status(503).json({
          status: 'not_ready',
          checks: {
            database: dbOk ? 'ok' : 'unavailable',
            queue: queuePing.ok ? 'ok' : 'unavailable',
            queueBackend: queuePing.backend
          },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        status: 'ready',
        checks: {
          database: 'ok',
          provider: getMarketDataProvider().name,
          queue: queueStats
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      emitStructuredLog('error', 'readiness_probe_failed', {
        meta: { error: err?.message || 'database check failed' }
      });
      return res.status(503).json({
        status: 'not_ready',
        checks: { database: 'error' },
        error: 'Database readiness check failed.',
        timestamp: new Date().toISOString()
      });
    }
  });

  // General API rate limiter (protects all /api/* endpoints)
  const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: options.apiRateLimitMax ?? 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: false,
    skip: (req) => req.path.startsWith('/auth/'),
    handler: (_req, res) =>
      res.status(429).json({ error: 'API rate limit exceeded. Please try again after 1 minute.' })
  });
  app.use('/api', apiRateLimiter);

  // Stricter rate limiters for authentication endpoints & heavy compute jobs
  const authCredentialLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: options.authRateLimitMax ?? 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: false,
    handler: (_req, res) =>
      res.status(429).json({ error: 'Too many authentication attempts. Please try again after 1 minute.' })
  });

  const authReadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: false,
    handler: (_req, res) =>
      res.status(429).json({ error: 'Too many authentication attempts. Please try again after 1 minute.' })
  });

  const heavyJobRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: options.heavyRateLimitMax ?? 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: false,
    handler: (_req, res) =>
      res.status(429).json({ error: 'Rate limit exceeded for heavy audit/backfill operations.' })
  });

  app.use('/api/auth', (req: Request, res: Response, next: NextFunction) => {
    if (
      req.path === '/login' ||
      req.path === '/register' ||
      req.path === '/forgot-password' ||
      req.path === '/reset-password' ||
      req.path === '/verify-email/request' ||
      req.path === '/verify-email/confirm'
    ) {
      return authCredentialLimiter(req, res, next);
    }
    return authReadLimiter(req, res, next);
  });

  async function resolveTokenUser(token: string): Promise<{ id: string; email: string; name: string } | null> {
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (decoded?.id && decoded?.email) {
        return { id: decoded.id, email: decoded.email, name: decoded.name || decoded.email };
      }
    } catch {
      // Not a valid local JWT; try Firebase Admin verification
    }

    try {
      const firebaseDecoded = await adminAuth.verifyIdToken(token);
      if (firebaseDecoded?.uid && firebaseDecoded?.email) {
        const user = await db.getOrCreateFirebaseUser({
          uid: firebaseDecoded.uid,
          email: firebaseDecoded.email,
          name: (firebaseDecoded.name as string | undefined) || null,
          avatarUrl: (firebaseDecoded.picture as string | undefined) || null
        });
        return { id: user.id, email: user.email, name: user.name };
      }
    } catch {
      // Invalid Firebase token or project mismatch
    }
    return null;
  }

  async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

    const resolved = await resolveTokenUser(token);
    if (!resolved) {
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

    req.user = resolved;
    next();
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

app.post('/api/auth/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.getUserByEmail(cleanEmail);
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
      emailVerified: false,
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

    await db.createUser(newUser);

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

app.post('/api/auth/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await db.getUserByEmail(email.trim().toLowerCase());
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

app.post('/api/auth/firebase', validateBody(firebaseAuthSchema), async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    const token = headerToken || (typeof req.body?.idToken === 'string' ? req.body.idToken : '');
    if (!token) {
      return res.status(401).json({ error: 'Firebase ID token is required.' });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded?.uid || !decoded?.email) {
      return res.status(401).json({ error: 'Firebase account must include a verified email address.' });
    }

    const user = await db.getOrCreateFirebaseUser({
      uid: decoded.uid,
      email: decoded.email,
      name: (decoded.name as string | undefined) || null,
      avatarUrl: (decoded.picture as string | undefined) || null
    });

    return res.json({ user: sanitizeUser(user) });
  } catch (error: any) {
    console.error('Firebase auth error:', error?.message || error);
    return res.status(401).json({ error: 'Invalid or expired Firebase authentication token.' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = await db.getUserById(req.user?.id || 'user-alphaquant-demo-1');
  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }
  return res.json(sanitizeUser(user));
});

app.put('/api/auth/profile', authenticateToken, validateBody(profileUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
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

    const updated = await db.updateUser(userId, updates);
    if (!updated) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json(sanitizeUser(updated));
  } catch (err: any) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ error: 'Failed to update user profile.' });
  }
});

app.put('/api/auth/change-password', authenticateToken, validateBody(changePasswordSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-alphaquant-demo-1';
    const { currentPassword, newPassword } = req.body;

    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await db.updateUser(userId, { passwordHash });

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('Error changing password:', err);
    return res.status(500).json({ error: 'Failed to update password.' });
  }
});

// Email Verification & Password Reset Flows
app.post('/api/auth/verify-email/request', validateBody(verifyEmailRequestSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const mailProvider = getMailProvider();
    if (!mailProvider.isConfigured()) {
      return res.status(503).json({
        error: 'Email delivery provider is not configured on this server. Configure SMTP_* or RESEND_API_KEY and MAIL_FROM.'
      });
    }

    const authHeader = req.headers['authorization'];
    const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    const tokenUser = bearer ? await resolveTokenUser(bearer) : null;
    const bodyEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (!tokenUser && !bodyEmail) {
      return res.status(401).json({ error: 'Authentication or email address is required to request verification.' });
    }

    const user = tokenUser
      ? await db.getUserById(tokenUser.id)
      : await db.getUserByEmail(bodyEmail);

    if (!user) {
      if (tokenUser) {
        return res.status(404).json({ error: 'User not found.' });
      }
      return res.status(200).json({
        sent: true,
        message: 'If an account matches that email address, a verification email has been dispatched.'
      });
    }

    if (user.emailVerified) {
      return res.status(200).json({
        sent: false,
        alreadyVerified: true,
        message: 'Email address is already verified.'
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db.createAuthToken({
      id: `tok-${crypto.randomUUID()}`,
      userId: user.id,
      purpose: 'email_verification',
      tokenHash,
      expiresAt
    });

    const verifyUrl = `${buildAppBaseUrl()}/?verifyToken=${encodeURIComponent(rawToken)}`;
    const sent = await mailProvider.sendMail({
      to: user.email,
      subject: 'Verify your AlphaQuant AI email address',
      text: `Hello ${user.name},\n\nConfirm your email address by visiting:\n${verifyUrl}\n\nOr paste this verification token in your Account Settings: ${rawToken}\n\nThis link expires in 24 hours.`,
      html: `<p>Hello ${escapeHtml(user.name)},</p><p>Confirm your email address by clicking below:</p><p><a href="${escapeHtml(verifyUrl)}">Verify Email Address</a></p><p>Or paste this verification token in Account Settings: <code>${escapeHtml(rawToken)}</code></p><p>This link expires in 24 hours.</p>`
    });

    return res.status(200).json({
      sent: true,
      provider: sent.provider,
      message: 'Verification email dispatched.'
    });
  } catch (err: any) {
    console.error('Error requesting email verification:', err);
    return res.status(500).json({ error: 'Failed to send verification email.' });
  }
});

async function handleVerifyEmailConfirm(rawToken: string, res: Response) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const consumed = await db.consumeAuthToken('email_verification', tokenHash);
  if (!consumed) {
    return res.status(400).json({ error: 'Invalid, expired, or already used verification token.' });
  }
  const updated = await db.markEmailVerified(consumed.userId);
  if (!updated) {
    return res.status(404).json({ error: 'User account not found.' });
  }
  return res.status(200).json({
    verified: true,
    user: sanitizeUser(updated),
    message: 'Email address verified successfully.'
  });
}

app.post('/api/auth/verify-email/confirm', validateBody(verifyEmailConfirmSchema), async (req: Request, res: Response) => {
  try {
    return await handleVerifyEmailConfirm(req.body.token, res);
  } catch (err: any) {
    console.error('Error confirming email verification:', err);
    return res.status(500).json({ error: 'Failed to verify email address.' });
  }
});

app.get('/api/auth/verify-email', async (req: Request, res: Response) => {
  try {
    const rawToken = typeof req.query.token === 'string' ? req.query.token.trim() : '';
    if (rawToken.length < 16) {
      return res.status(400).json({ error: 'Valid verification token query parameter is required.' });
    }
    return await handleVerifyEmailConfirm(rawToken, res);
  } catch (err: any) {
    console.error('Error verifying email via GET:', err);
    return res.status(500).json({ error: 'Failed to verify email address.' });
  }
});

app.post('/api/auth/forgot-password', validateBody(forgotPasswordSchema), async (req: Request, res: Response) => {
  try {
    const mailProvider = getMailProvider();
    if (!mailProvider.isConfigured()) {
      return res.status(503).json({
        error: 'Email delivery provider is not configured on this server. Configure SMTP_* or RESEND_API_KEY and MAIL_FROM.'
      });
    }

    const cleanEmail = req.body.email.trim().toLowerCase();
    const user = await db.getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(200).json({
        sent: true,
        message: 'If an account exists for that email address, password reset instructions have been sent.'
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await db.createAuthToken({
      id: `tok-${crypto.randomUUID()}`,
      userId: user.id,
      purpose: 'password_reset',
      tokenHash,
      expiresAt
    });

    const resetUrl = `${buildAppBaseUrl()}/?resetToken=${encodeURIComponent(rawToken)}`;
    const sent = await mailProvider.sendMail({
      to: user.email,
      subject: 'Reset your AlphaQuant AI password',
      text: `Hello ${user.name},\n\nReset your password by visiting:\n${resetUrl}\n\nOr enter this single-use reset token in the reset password form: ${rawToken}\n\nThis token expires in 30 minutes.`,
      html: `<p>Hello ${escapeHtml(user.name)},</p><p>Reset your password using the link below:</p><p><a href="${escapeHtml(resetUrl)}">Reset Password</a></p><p>Or enter this single-use token: <code>${escapeHtml(rawToken)}</code></p><p>This token expires in 30 minutes.</p>`
    });

    return res.status(200).json({
      sent: true,
      provider: sent.provider,
      message: 'If an account exists for that email address, password reset instructions have been sent.'
    });
  } catch (err: any) {
    console.error('Error requesting password reset:', err);
    return res.status(500).json({ error: 'Failed to send password reset email.' });
  }
});

app.post('/api/auth/reset-password', validateBody(resetPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const consumed = await db.consumeAuthToken('password_reset', tokenHash);
    if (!consumed) {
      return res.status(400).json({ error: 'Invalid, expired, or already used password reset token.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    const updated = await db.updateUserPassword(consumed.userId, passwordHash);
    if (!updated) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    });
  } catch (err: any) {
    console.error('Error resetting password:', err);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// Compliance Config & Account GDPR Data Export / Deletion Endpoints
function getComplianceConfig(): ComplianceConfig {
  return {
    disclaimerText:
      process.env.COMPLIANCE_DISCLAIMER_TEXT?.trim() ||
      process.env.VITE_DISCLAIMER_TEXT?.trim() ||
      'Quantitative Analytics & Conformal Prediction Simulation — Not Financial Advice. Historical walk-forward accuracy and split-conformal coverage bounds do not guarantee future performance. Consult a licensed financial advisor before executing trades.',
    operatorLegalEntity:
      process.env.COMPLIANCE_OPERATOR_LEGAL_ENTITY?.trim() ||
      process.env.COMPLIANCE_OPERATOR_NAME?.trim() ||
      '[OPERATOR_LEGAL_ENTITY]',
    operatorAddress:
      process.env.COMPLIANCE_OPERATOR_ADDRESS?.trim() || '[OPERATOR_ADDRESS]',
    operatorContactEmail:
      process.env.COMPLIANCE_OPERATOR_CONTACT_EMAIL?.trim() ||
      process.env.COMPLIANCE_CONTACT_EMAIL?.trim() ||
      '[OPERATOR_CONTACT_EMAIL]',
    dpoContact:
      process.env.COMPLIANCE_DPO_EMAIL?.trim() || '[DPO_CONTACT]',
    governingJurisdiction:
      process.env.COMPLIANCE_JURISDICTION?.trim() || '[GOVERNING_JURISDICTION]',
    updatedAt: new Date().toISOString().split('T')[0]
  };
}

app.get('/api/compliance/config', (_req: Request, res: Response) => {
  return res.json(getComplianceConfig());
});

app.get('/api/account/export', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-alphaquant-demo-1';
    const exported = await db.exportUserData(userId);
    if (!exported) {
      return res.status(404).json({ error: 'User account not found.' });
    }
    res.setHeader('Content-Disposition', 'attachment; filename="alphaquant-account-export.json"');
    return res.status(200).json(exported);
  } catch (err: any) {
    console.error('Error exporting user account data:', err);
    return res.status(500).json({ error: 'Failed to export user data.' });
  }
});

app.delete('/api/account', authenticateToken, validateBody(deleteAccountSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-alphaquant-demo-1';
    const deleted = await db.deleteUser(userId);
    if (!deleted) {
      return res.status(404).json({ error: 'User account not found.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Account and associated personal data permanently deleted.'
    });
  } catch (err: any) {
    console.error('Error deleting user account:', err);
    return res.status(500).json({ error: 'Failed to delete user account.' });
  }
});

// -------------------------------------------------------------
// 2. STOCK MARKET & HISTORICAL DATA ENDPOINTS
// -------------------------------------------------------------

app.get('/api/tickers/search', validateQuery(tickerSearchQuerySchema), async (req: Request, res: Response) => {
  try {
    const vq = (req as Request & { validatedQuery?: { q: string; country?: string; exchange?: string; page: number; limit: number } }).validatedQuery;
    const q = vq?.q ?? '';
    const country = vq?.country;
    const exchange = vq?.exchange;
    const page = vq?.page ?? 1;
    const limit = vq?.limit ?? 24;

    const payload = await searchTickersMaster({ q, country, exchange, page, limit });
    return res.json(payload);
  } catch (error: any) {
    console.error('Error searching ticker master:', error);
    return res.status(500).json({ error: 'Failed to search global ticker master.' });
  }
});

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

app.get('/api/markets/indices', async (req: Request, res: Response) => {
  try {
    const rawMarkets = typeof req.query.markets === 'string' && req.query.markets.trim()
      ? req.query.markets.split(',').filter(Boolean)
      : undefined;
    const rawSymbols = typeof req.query.symbols === 'string' && req.query.symbols.trim()
      ? req.query.symbols.split(',').filter(Boolean)
      : undefined;
    const indices = await getMarketIndices({ markets: rawMarkets, symbols: rawSymbols });
    return res.json(indices);
  } catch (error: any) {
    console.error('Error fetching market indices:', error);
    return res.status(500).json({ error: 'Failed to retrieve market indices.' });
  }
});

app.get('/api/stocks/quick-watch', async (_req: Request, res: Response) => {
  try {
    const items = await getQuickWatchQuotes();
    return res.json(items);
  } catch (error: any) {
    console.error('Error fetching quick watch quotes:', error);
    return res.status(500).json({ error: 'Failed to retrieve quick watch quotes.' });
  }
});

app.get('/api/fx/rates', async (_req: Request, res: Response) => {
  try {
    const fx = await getFxRates();
    return res.json(fx);
  } catch (error: any) {
    console.error('Error fetching FX rates:', error);
    return res.status(500).json({ error: 'Failed to retrieve FX exchange rates.' });
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
    const { bars, source, provider, fetchedAt, fallbackFrom, warning } = await fetchHistoryWithSource(ticker, days);
    res.setHeader('X-Data-Source', source);
    if (provider) res.setHeader('X-Data-Provider', provider);
    if (fetchedAt) res.setHeader('X-Fetched-At', fetchedAt);
    if (fallbackFrom) res.setHeader('X-Data-Fallback-From', fallbackFrom);
    if (warning) res.setHeader('X-Provider-Warning', warning);
    return res.json(bars.map(b => ({ ...b, source })));
  } catch (error: any) {
    console.error(`Error fetching history for ${req.params.ticker}:`, error);
    return res.status(500).json({ error: 'Failed to retrieve historical data.' });
  }
});

app.get('/api/stocks/:ticker/seasonality', async (req: Request, res: Response) => {
  try {
    const ticker = await resolveTickerOrName(req.params.ticker);
    const days = parseInt((req.query.days as string) || '1250', 10);
    const month = req.query.month !== undefined ? parseInt(req.query.month as string, 10) : new Date().getMonth();
    const history = await getHistoricalData(ticker, days);
    const report = computeSeasonality(history, ticker, month);
    return res.json(report);
  } catch (error: any) {
    console.error(`Error computing seasonality for ${req.params.ticker}:`, error);
    return res.status(500).json({ error: 'Failed to compute seasonality analysis.' });
  }
});

// -------------------------------------------------------------
// 3. NEWS, FINBERT SENTIMENT & LAG ANALYSIS ENDPOINTS (USP 3)
// -------------------------------------------------------------

async function computePooledLagResponse() {
  const sentimentMap = await buildSentimentMapFromDb();
  const tickersWithSentiment = Array.from(sentimentMap.keys());
  const inputs: Array<{
    ticker: string;
    bars: Awaited<ReturnType<typeof fetchHistoryWithSource>>['bars'];
    sentimentRecords: DailySentimentRecord[];
  }> = [];

  const batchSize = 5;
  for (let i = 0; i < tickersWithSentiment.length; i += batchSize) {
    const batch = tickersWithSentiment.slice(i, i + batchSize);
    const fetched = await Promise.all(
      batch.map(async (t) => {
        try {
          const { bars, source } = await fetchHistoryWithSource(t, 730);
          return { ticker: t, bars, source };
        } catch {
          return { ticker: t, bars: [], source: 'synthetic' as const };
        }
      })
    );
    for (const item of fetched) {
      if (item.source !== 'synthetic' && item.bars.length > 0) {
        inputs.push({
          ticker: item.ticker,
          bars: item.bars,
          sentimentRecords: sentimentMap.get(item.ticker) || []
        });
      }
    }
  }

  return computePooledLagAnalysis(inputs);
}

app.get('/api/news', async (_req: Request, res: Response) => {
  try {
    const headlines = await getAllMarketHeadlinesAsync();
    return res.json(headlines);
  } catch (error: any) {
    console.error('Error fetching market headlines:', error);
    return res.status(500).json({ error: 'Failed to retrieve market news headlines.' });
  }
});

app.get('/api/news/:ticker', async (req: Request, res: Response) => {
  try {
    const ticker = await resolveTickerOrName(req.params.ticker);
    const quote = await getStockQuote(ticker);
    const hybrid = await getHybridNewsForTicker(ticker, quote.name);
    return res.json(hybrid.news);
  } catch (error: any) {
    console.error(`Error fetching news for ${req.params.ticker}:`, error);
    return res.status(500).json({ error: 'Failed to retrieve financial news.' });
  }
});

// Specific /api/sentiment sub-paths MUST be registered before /api/sentiment/:ticker
app.get('/api/sentiment/daily-stats', async (_req: Request, res: Response) => {
  const byTicker = await db.getDailySentimentCountsByTicker();
  const totalRecords = Object.values(byTicker).reduce((a, b) => a + b, 0);
  return res.json({
    tickersWithData: Object.keys(byTicker).length,
    totalRecords,
    byTicker
  });
});

app.get('/api/sentiment/lag-analysis', async (_req: Request, res: Response) => {
  try {
    const result = await computePooledLagResponse();
    return res.json(result);
  } catch (error: any) {
    console.error('Error computing pooled lag analysis:', error);
    return res.status(500).json({ error: 'Failed to compute pooled sentiment-price lag analysis.' });
  }
});

app.get('/api/sentiment/lag-analysis/:ticker', async (req: Request, res: Response) => {
  try {
    const raw = (req.params.ticker || '').trim();
    if (!raw || raw.toUpperCase() === 'ALL') {
      const pooled = await computePooledLagResponse();
      return res.json(pooled);
    }
    const ticker = await resolveTickerOrName(raw);
    const records = await db.getDailySentimentForTicker(ticker);
    let bars: Awaited<ReturnType<typeof fetchHistoryWithSource>>['bars'] = [];
    let source: 'live' | 'synthetic' = 'live';
    try {
      const fetched = await fetchHistoryWithSource(ticker, 730);
      bars = fetched.bars;
      source = fetched.source;
    } catch {
      bars = [];
    }
    const result = computeTickerLagAnalysis(
      ticker,
      source === 'synthetic' ? [] : bars,
      records
    );
    return res.json(result);
  } catch (error: any) {
    console.error(`Error computing lag analysis for ${req.params.ticker}:`, error);
    return res.status(500).json({ error: 'Failed to compute sentiment-price lag analysis.' });
  }
});

app.get('/api/sentiment/:ticker', async (req: Request, res: Response) => {
  try {
    const ticker = await resolveTickerOrName(req.params.ticker);
    const quote = await getStockQuote(ticker);
    const hybrid = await getHybridNewsForTicker(ticker, quote.name);
    const news = hybrid.news;

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
    const avgScore = hybrid.blendedSentimentScore;
    const posPct = Number(((posSum / count) * 100).toFixed(1));
    const neuPct = Number(((neuSum / count) * 100).toFixed(1));
    const negPct = Number(((negSum / count) * 100).toFixed(1));
    const modelUsed =
      hybrid.sentimentSource === 'finbert'
        ? 'FinBERT Transformer (Xenova/finbert, English, Publisher-Credibility Weighted)'
        : hybrid.sentimentSource === 'multilingual-lexicon'
          ? `Multilingual Financial Lexicon (${hybrid.language || 'multi'}, Non-English FinBERT Guard)`
          : hybrid.sentimentSource === 'mixed'
            ? 'FinBERT Transformer + Multilingual/Keyword Lexicon Hybrid (Publisher-Credibility Weighted)'
            : 'Keyword Financial-Sentiment Lexicon Fallback (Publisher-Credibility Weighted)';

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
      liveCount: hybrid.liveCount,
      baselineCount: hybrid.baselineCount,
      isLive: hybrid.liveCount > 0,
      topLiveHeadline: hybrid.topLiveHeadline,
      topLiveSource: hybrid.topLiveSource,
      sentimentSource: hybrid.sentimentSource,
      language: hybrid.language,
      modelId: hybrid.modelId,
      modelUsed,
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
    const { bars: history, source } = await fetchHistoryWithSource(ticker, 250);
    const regime = detectMarketRegime(history, ticker);
    return res.json({ ...regime, dataSource: source });
  } catch (error: any) {
    console.error(`Error detecting regime for ${req.params.ticker}:`, error);
    return res.status(500).json({ error: 'Failed to compute market regime.' });
  }
});

// -------------------------------------------------------------
// 5. CONFORMAL PREDICTION (USP 1)
// -------------------------------------------------------------

// Specific sub-paths registered before parameterized route /:ticker to avoid route shadowing
app.get('/api/predictions/history', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const ticker = req.query.ticker as string;
  const history = await db.getPredictionHistory(req.user?.id, ticker);
  return res.json(history);
});

app.get('/api/predictions/:ticker', async (req: Request, res: Response) => {
  try {
    const ticker = await resolveTickerOrName(req.params.ticker);
    const horizon = parseInt((req.query.horizon as string) || '1', 10);
    const confidence = parseFloat((req.query.confidence as string) || String(DEFAULT_CONFORMAL_CONFIDENCE));
    const { bars: history, source: historySource } = await fetchHistoryWithSource(ticker, 250);
    const regime = detectMarketRegime(history, ticker);
    const quote = await getStockQuote(ticker);
    const hybrid = await getHybridNewsForTicker(ticker, quote.name);

    const liveNewsMeta = {
      isLive: hybrid.liveCount > 0,
      liveArticlesCount: hybrid.liveCount,
      baselineArticlesCount: hybrid.baselineCount,
      liveSentimentScore: hybrid.liveSentimentScore,
      baselineSentimentScore: hybrid.baselineSentimentScore,
      blendedSentimentScore: hybrid.blendedSentimentScore,
      sentimentSource: hybrid.sentimentSource,
      language: hybrid.language,
      modelId: hybrid.modelId,
      topLiveHeadline: hybrid.topLiveHeadline,
      topLiveSource: hybrid.topLiveSource,
      newsDriftImpactPct: Number((hybrid.blendedSentimentScore * 1.5).toFixed(2)),
      lastLiveFetchTimestamp: new Date().toISOString()
    };

    const prediction = runConformalPrediction(
      history,
      ticker,
      hybrid.blendedSentimentScore,
      regime.regimeId,
      confidence,
      horizon,
      liveNewsMeta,
      hybrid.news
    );

    if (!isConformalPredictionAvailable(prediction)) {
      const status = history.length === 0 ? 503 : 422;
      return res.status(status).json({
        available: false,
        reason: prediction.reason,
        ticker,
        dataSource: historySource
      });
    }

    return res.json({ ...prediction, dataSource: historySource });
  } catch (error: any) {
    console.error(`Error computing conformal prediction for ${req.params.ticker}:`, error);
    return res.status(500).json({ error: 'Failed to generate conformal prediction.' });
  }
});

app.post('/api/predictions', authenticateToken, validateBody(createPredictionSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ticker } = req.body;

    const sym = await resolveTickerOrName(ticker);
    const { bars: history, source: historySource } = await fetchHistoryWithSource(sym, 250);
    const regime = detectMarketRegime(history, sym);
    const quote = await getStockQuote(sym);
    const hybrid = await getHybridNewsForTicker(sym, quote.name);
    const fullUser = req.user?.id ? await db.getUserById(req.user.id) : null;
    const userConf = (fullUser?.confidenceLevel ? fullUser.confidenceLevel / 100 : DEFAULT_CONFORMAL_CONFIDENCE);

    const liveNewsMeta = {
      isLive: hybrid.liveCount > 0,
      liveArticlesCount: hybrid.liveCount,
      baselineArticlesCount: hybrid.baselineCount,
      liveSentimentScore: hybrid.liveSentimentScore,
      baselineSentimentScore: hybrid.baselineSentimentScore,
      blendedSentimentScore: hybrid.blendedSentimentScore,
      sentimentSource: hybrid.sentimentSource,
      language: hybrid.language,
      modelId: hybrid.modelId,
      topLiveHeadline: hybrid.topLiveHeadline,
      topLiveSource: hybrid.topLiveSource,
      newsDriftImpactPct: Number((hybrid.blendedSentimentScore * 1.5).toFixed(2)),
      lastLiveFetchTimestamp: new Date().toISOString()
    };

    const pred = runConformalPrediction(
      history,
      sym,
      hybrid.blendedSentimentScore,
      regime.regimeId,
      userConf,
      1,
      liveNewsMeta,
      hybrid.news
    );

    if (!isConformalPredictionAvailable(pred)) {
      const status = history.length === 0 ? 503 : 422;
      return res.status(status).json({
        available: false,
        reason: pred.reason,
        ticker: sym,
        dataSource: historySource
      });
    }

    const stored: StoredPrediction = {
      id: `pred-${Date.now()}`,
      userId: req.user?.id || 'user-alphaquant-demo-1',
      ticker: sym,
      currency: pred.currency || quote.currency || inferCurrencyFromTicker(sym),
      currentPrice: pred.currentPrice,
      predictedPrice: pred.predictedPrice,
      lowerBound: pred.lowerBound,
      upperBound: pred.upperBound,
      confidenceLevel: pred.confidenceLevel,
      marketRegime: regime.currentRegime,
      sentimentScore: hybrid.blendedSentimentScore,
      timestamp: pred.predictionTimestamp
    };

    await db.addPrediction(stored);
    return res.json({ ...pred, dataSource: historySource });
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
    const { bars: history, source } = await fetchHistoryWithSource(ticker, 250);
    const drift = detectConceptDrift(history, ticker);
    return res.json({ ...drift, dataSource: source });
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
    if (rawTicker.trim().toUpperCase() === 'ALL') {
      const evaluation = await runAggregateModelEvaluation(fetchHistoryWithSource, TICKER_CATALOG, {
        sentimentByTicker: await buildSentimentMapFromDb()
      });
      if (!isModelEvaluationAvailable(evaluation)) {
        return res.status(503).json({
          available: false,
          reason: evaluation.reason || 'No live market data',
          dataSource: evaluation.dataSource || 'none',
          evaluatedAssetsCount: 0
        });
      }
      return res.json(evaluation);
    }
    const ticker = await resolveTickerOrName(rawTicker);
    const { bars, source } = await fetchHistoryWithSource(ticker, 730);
    if (source === 'synthetic') {
      return res.status(503).json({
        available: false,
        reason: 'No live market data',
        dataSource: 'synthetic',
        evaluatedAssetsCount: 0,
        ticker
      });
    }
    const { dailyHits: _dailyHits, ...publicEvaluation } = runModelEvaluation(bars, ticker, source);
    return res.json(publicEvaluation);
  } catch (error: any) {
    console.error('Error computing evaluation metrics:', error);
    return res.status(500).json({ error: 'Failed to evaluate model performance.' });
  }
});

// Full Catalog Model Audit Endpoint (per-asset table, test window dates, data provenance, Wilson CI, p-value, gitCommit, evaluationParams, skippedTickers)
app.get('/api/model/audit', heavyJobRateLimiter, async (req: Request, res: Response) => {
  try {
    const rawTicker = (req.query.ticker as string) || 'ALL';
    if (rawTicker.trim().toUpperCase() !== 'ALL') {
      const ticker = await resolveTickerOrName(rawTicker);
      let bars: Awaited<ReturnType<typeof fetchHistoryWithSource>>['bars'] = [];
      let source: 'live' | 'synthetic' = 'live';
      let providerName: string | undefined;
      let providerLicence: string | undefined;
      let fallbackFrom: string | undefined;
      let providerWarning: string | undefined;
      try {
        const fetched = await fetchHistoryWithSource(ticker, 730);
        bars = fetched.bars;
        source = fetched.source;
        providerName = fetched.provider;
        providerLicence = fetched.providerLicence;
        fallbackFrom = fetched.fallbackFrom;
        providerWarning = fetched.warning;
      } catch {
        return res.status(503).json(
          buildModelAuditPayload({
            available: false,
            reason: 'No live market data',
            dataSource: 'none',
            evaluatedAssetsCount: 0,
            skippedTickers: [{ ticker, reason: 'fetch_error' }],
            ticker
          })
        );
      }
      if (source === 'synthetic') {
        return res.status(503).json(
          buildModelAuditPayload({
            available: false,
            reason: 'No live market data',
            dataSource: 'synthetic',
            dataProvider: providerName,
            dataProviderLicence: providerLicence,
            fallbackFrom,
            providerWarning,
            evaluatedAssetsCount: 0,
            skippedTickers: [{ ticker, reason: 'synthetic_data', barsCount: bars.length }],
            ticker
          })
        );
      }
      if (bars.length < MIN_CONFORMAL_BARS) {
        return res.status(422).json(
          buildModelAuditPayload({
            available: false,
            reason: `Insufficient history (need >= ${MIN_CONFORMAL_BARS} bars)`,
            dataSource: 'live',
            dataProvider: providerName,
            dataProviderLicence: providerLicence,
            fallbackFrom,
            providerWarning,
            evaluatedAssetsCount: 0,
            skippedTickers: [{ ticker, reason: 'insufficient_history', barsCount: bars.length }],
            ticker
          })
        );
      }
      const evaluation = runModelEvaluation(bars, ticker, source);
      if (providerName) evaluation.dataProvider = providerName;
      if (providerLicence) evaluation.dataProviderLicence = providerLicence;
      if (fallbackFrom) evaluation.fallbackFrom = fallbackFrom;
      if (providerWarning) evaluation.providerWarning = providerWarning;
      const meta = TICKER_CATALOG.find(c => c.ticker === ticker) ?? await db.getTickerBySymbol(ticker);
      return res.json(buildModelAuditPayload(evaluation, meta?.name || ticker));
    }

    const universeParam = typeof req.query.universe === 'string' ? req.query.universe.trim().toLowerCase() : '';
    const useUniverse = universeParam === 'ticker_master';

    let targetCatalog: Array<{ ticker: string; name: string }> = TICKER_CATALOG;
    let tickerMetaLookup: Map<string, UniverseTickerMeta> | undefined;
    if (useUniverse) {
      const masterTickers = await db.getAllTickers(true);
      const equities = masterTickers.filter((t) => !t.assetType || t.assetType.toUpperCase() === 'EQUITY');
      targetCatalog = equities.map((t) => ({ ticker: t.symbol, name: t.name }));
      tickerMetaLookup = new Map<string, UniverseTickerMeta>();
      for (const t of equities) {
        tickerMetaLookup.set(t.symbol.toUpperCase(), {
          name: t.name,
          country: t.country,
          exchange: t.exchange,
          exchangeCode: t.exchangeCode || t.exchange
        });
      }
    }

    const evaluation = await runAggregateModelEvaluation(fetchHistoryWithSource, targetCatalog, {
      sentimentByTicker: await buildSentimentMapFromDb(),
      ...(useUniverse
        ? {
            tickerMetaLookup,
            universeMode: 'ticker_master' as const,
            includeBreakdowns: true
          }
        : {})
    });
    const payload = buildModelAuditPayload(evaluation);
    if (!payload.available) {
      return res.status(503).json(payload);
    }

    return res.json(payload);
  } catch (error: any) {
    console.error('Error computing model audit:', error);
    return res.status(500).json({ error: 'Failed to compute model audit.' });
  }
});

// Background Job Queue Endpoints (audit, sentiment backfill, model refits, failed-job inspection & retry)
app.post(
  '/api/jobs',
  authenticateToken,
  heavyJobRateLimiter,
  validateBody(createBackgroundJobSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type, ticker, tickers, maxArticles } = req.body as {
        type: 'audit' | 'backfill' | 'refit';
        ticker?: string;
        tickers?: string[];
        maxArticles?: number;
      };
      const job = await jobQueue.enqueueAsync(
        type,
        {
          ...(ticker ? { ticker } : {}),
          ...(tickers ? { tickers } : {}),
          ...(maxArticles ? { maxArticles } : {})
        },
        req.user?.id
      );
      return res.status(202).json({ job });
    } catch (err: any) {
      console.error('Error enqueuing background job:', err);
      return res.status(500).json({ error: 'Failed to enqueue background job.' });
    }
  }
);

app.get('/api/jobs', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? (req.query.status as any) : undefined;
    const type = typeof req.query.type === 'string' ? (req.query.type as any) : undefined;
    const [stats, jobs] = await Promise.all([
      jobQueue.getStatsAsync(),
      jobQueue.listJobsAsync({ status, type })
    ]);
    return res.json({ stats, jobs });
  } catch (err: any) {
    console.error('Error listing background jobs:', err);
    return res.status(500).json({ error: 'Failed to list background jobs.' });
  }
});

app.get('/api/jobs/failed', authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const failedJobs = await jobQueue.getFailedJobsAsync();
    return res.json({ count: failedJobs.length, jobs: failedJobs });
  } catch (err: any) {
    console.error('Error listing failed background jobs:', err);
    return res.status(500).json({ error: 'Failed to retrieve failed jobs.' });
  }
});

app.post('/api/jobs/:id/retry', authenticateToken, heavyJobRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const retried = await jobQueue.retryJobAsync(req.params.id);
    if (!retried) {
      return res.status(404).json({ error: 'Failed job not found or cannot be retried.' });
    }
    return res.status(202).json({ job: retried });
  } catch (err: any) {
    console.error('Error retrying background job:', err);
    return res.status(500).json({ error: 'Failed to retry background job.' });
  }
});

app.get('/api/jobs/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const job = await jobQueue.getJobAsync(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Background job not found.' });
    }
    return res.json({ job });
  } catch (err: any) {
    console.error('Error retrieving background job:', err);
    return res.status(500).json({ error: 'Failed to retrieve background job.' });
  }
});

// Dynamic Project-Wide Price Accuracy Metric (100% - MAPE across catalog assets)
app.get('/api/metrics/accuracy', async (_req: Request, res: Response) => {
  try {
    const tickers = TICKER_CATALOG.map(t => t.ticker);
    const result = await computeProjectWideAccuracy(fetchHistoryWithSource, tickers);
    if (result.available === false) {
      return res.status(503).json({
        available: false,
        reason: result.reason || 'No live market data',
        dataSource: result.dataSource || 'none',
        evaluatedAssetsCount: 0
      });
    }
    return res.json(result);
  } catch (error: any) {
    console.error('Error computing project-wide accuracy metric:', error);
    return res.status(500).json({ error: 'Failed to compute aggregate accuracy metric.' });
  }
});

app.get('/api/model/health', async (_req: Request, res: Response) => {
  try {
    const sampleTickers = ['RELIANCE.NS', 'TCS.NS', 'NVDA', 'AAPL'];
    let driftingCount = 0;

    for (const t of sampleTickers) {
      const { bars: history } = await fetchHistoryWithSource(t, 180);
      const drift = detectConceptDrift(history, t);
      if (drift.driftDetected) driftingCount++;
    }

    const isSystemHealthy = driftingCount === 0;

    // Evaluate real accuracy metrics dynamically from active benchmark asset (only if live)
    const { bars: evalData, source: evalSource } = await fetchHistoryWithSource('RELIANCE.NS', 180);
    if (evalSource === 'synthetic') {
      return res.status(503).json({
        available: false,
        reason: 'No live market data',
        dataSource: 'synthetic',
        evaluatedAssetsCount: 0
      });
    }
    const evalMetrics = runModelEvaluation(evalData, 'RELIANCE.NS', evalSource);

    return res.json({
      available: true,
      dataSource: 'live',
      status: isSystemHealthy ? 'Optimal' : 'Caution - Distribution Drift',
      healthy: isSystemHealthy,
      activeModelsCount: 4,
      conformalCoverageTarget: DEFAULT_CONFORMAL_CONFIDENCE,
      empiricalCoverageObserved: evalMetrics.backtestSeries.length > 0
        ? Number((evalMetrics.backtestSeries.filter(b => b.actual >= b.lower && b.actual <= b.upper).length / evalMetrics.backtestSeries.length).toFixed(3))
        : Number(((evalMetrics.conformalCoverage ?? 0) / 100).toFixed(3)),
      directionalAccuracy: evalMetrics.directionalAccuracy,
      lastAuditTimestamp: new Date().toISOString(),
      regimeModel: 'Rule-Based Trend/Volatility Regime Classifier',
      predictionEngine: 'AlphaQuant Ensemble (ridge + Huber gradient-boosted trees + Kalman regime filter + KNN stacker)',
      driftDetector: 'Two-sample KS drift test (p-threshold: 0.05)'
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
    const ticker = rawTicker.trim().toUpperCase() === 'ALL' ? 'RELIANCE.NS' : await resolveTickerOrName(rawTicker);
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

app.get('/api/options/:ticker/surface', async (req: Request, res: Response) => {
  try {
    const sym = await resolveTickerOrName(req.params.ticker);
    const quote = await getStockQuote(sym);
    const surface = generateVolatilitySurface(sym, quote.price, 0.25);
    return res.json(surface);
  } catch (error: any) {
    console.error(`Error generating volatility surface for ${req.params.ticker}:`, error);
    return res.status(500).json({ error: 'Failed to generate volatility surface.' });
  }
});


// -------------------------------------------------------------
// 7D. AUTOMATED BACKTESTING FRAMEWORK (STRATEGY VS BENCHMARK)
// -------------------------------------------------------------

app.get('/api/backtest/automated', async (req: Request, res: Response) => {
  try {
    const ticker = await resolveTickerOrName((req.query.ticker as string) || 'NVDA');
    const strategy = (req.query.strategy as any) || DEFAULT_BACKTEST_STRATEGY;
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

app.get('/api/broker/trades', authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const trades = await brokerService.getTradesWithLiveQuotes();
    return res.json(trades);
  } catch (err: any) {
    console.error('Error fetching broker trades:', err);
    return res.status(500).json({ error: 'Failed to fetch broker trades.' });
  }
});

app.post('/api/broker/order', authenticateToken, validateBody(brokerOrderSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ticker, side, qty, type, limitPrice, stopLossPrice, takeProfitPrice, timeInForce } = req.body;
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
      await db.savePortfolio(userId, holdings);
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
    const holdings = await db.getPortfolio(userId);

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
            currency: h.currency || q.currency || inferCurrencyFromTicker(h.ticker),
            currentPrice,
            currentValue,
            pnl,
            pnlPercent
          };
        } catch {
          return {
            ...h,
            currency: h.currency || inferCurrencyFromTicker(h.ticker)
          };
        }
      })
    );

    return res.json(updated);
  } catch (error: any) {
    console.error('Error retrieving portfolio:', error);
    return res.status(500).json({ error: 'Failed to retrieve portfolio holdings.' });
  }
});

app.post('/api/portfolio', authenticateToken, validateBody(addPortfolioHoldingSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-alphaquant-demo-1';
    const { ticker, quantity, avgBuyPrice, purchaseDate, notes } = req.body;

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
      currency: quote.currency || inferCurrencyFromTicker(sym),
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

    await db.addHolding(userId, holding);
    return res.status(201).json(holding);
  } catch (error: any) {
    console.error('Error adding holding:', error);
    return res.status(500).json({ error: 'Failed to add holding.' });
  }
});

app.post('/api/portfolio/batch', authenticateToken, validateBody(batchPortfolioSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-alphaquant-demo-1';
    const { holdings: incomingHoldings } = req.body;

    const createdHoldings = [];
    for (const item of incomingHoldings) {
      if (!item.ticker || !item.quantity || !item.avgBuyPrice) continue;
      try {
        const sym = await resolveTickerOrName(item.ticker);
        const quote = await getStockQuote(sym);
        const qty = parseFloat(item.quantity);
        const buyPrice = parseFloat(item.avgBuyPrice);
        const totalInvested = Number((qty * buyPrice).toFixed(2));
        const currentValue = Number((qty * quote.price).toFixed(2));
        const pnl = Number((currentValue - totalInvested).toFixed(2));
        const pnlPercent = Number(((pnl / totalInvested) * 100).toFixed(2));

        const holding = {
          id: `hold-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ticker: sym,
          companyName: quote.name,
          currency: quote.currency || inferCurrencyFromTicker(sym),
          quantity: qty,
          avgBuyPrice: buyPrice,
          currentPrice: quote.price,
          totalInvested,
          currentValue,
          pnl,
          pnlPercent,
          purchaseDate: item.purchaseDate || new Date().toISOString().split('T')[0],
          notes: item.notes || 'Imported via External CSV/File'
        };
        await db.addHolding(userId, holding);
        createdHoldings.push(holding);
      } catch (err) {
        console.warn(`Failed to resolve imported ticker ${item.ticker}:`, err);
      }
    }

    const currentAll = await db.getPortfolio(userId);
    return res.status(201).json({
      success: true,
      importedCount: createdHoldings.length,
      holdings: currentAll
    });
  } catch (error: any) {
    console.error('Error batch importing portfolio:', error);
    return res.status(500).json({ error: 'Failed to batch import portfolio.' });
  }
});

app.put('/api/portfolio/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'user-alphaquant-demo-1';
  const updated = await db.updateHolding(userId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Holding not found.' });
  return res.json(updated);
});

app.delete('/api/portfolio/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'user-alphaquant-demo-1';
  await db.deleteHolding(userId, req.params.id);
  return res.json({ success: true, message: 'Holding removed successfully.' });
});

// Mean-Variance Optimization & Rebalance Suggester
app.post('/api/portfolio/optimize', authenticateToken, validateBody(optimizePortfolioSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-alphaquant-demo-1';
    const objective = (req.body?.objective as any) || 'max_sharpe';
    let holdings: any[] = req.body?.holdings;

    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      holdings = await db.getPortfolio(userId);
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

// Dedicated Portfolio Cross-Asset Correlation Matrix Endpoint
app.post('/api/portfolio/correlation', authenticateToken, validateBody(correlationPortfolioSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-alphaquant-demo-1';
    let holdings: any[] = req.body?.holdings;
    const lookbackDays = parseInt(req.body?.lookbackDays || '90', 10);

    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      holdings = await db.getPortfolio(userId);
    }

    if (holdings.length === 0) {
      return res.status(400).json({ error: 'Cannot compute correlation on an empty portfolio. Add positions first.' });
    }

    // Filter unique tickers
    const uniqueTickers = Array.from(new Set(holdings.map(h => h.ticker).filter(Boolean)));
    const totalVal = holdings.reduce((sum, h) => sum + (h.currentValue || (h.quantity * (h.currentPrice || h.avgBuyPrice || 1))), 0) || 1;
    const weights: Record<string, number> = {};
    const companyNames: Record<string, string> = {};

    holdings.forEach(h => {
      const val = h.currentValue || (h.quantity * (h.currentPrice || h.avgBuyPrice || 1));
      weights[h.ticker] = Number(((val / totalVal) * 100).toFixed(1));
      if (h.companyName) companyNames[h.ticker] = h.companyName;
    });

    const histMap: Record<string, any> = {};
    const regimeMap: Record<string, string> = {};

    await Promise.all(
      uniqueTickers.map(async t => {
        try {
          const h = await getHistoricalData(t, Math.max(60, lookbackDays));
          const r = detectMarketRegime(h, t);
          histMap[t] = h;
          regimeMap[t] = r.currentRegime;
        } catch {
          histMap[t] = [];
          regimeMap[t] = 'Normal Volatility';
        }
      })
    );

    const correlation = computeCorrelationMatrix(uniqueTickers, histMap, regimeMap);
    // Enrich asset names if present in holdings
    if (correlation.assets) {
      correlation.assets = correlation.assets.map(a => ({
        ...a,
        name: companyNames[a.ticker] || a.name
      }));
    }

    return res.json({
      ...correlation,
      weights
    });
  } catch (error: any) {
    console.error('Error computing portfolio correlation:', error);
    return res.status(500).json({ error: 'Failed to compute portfolio correlation matrix.' });
  }
});

app.post('/api/portfolio/rebalance/apply', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-alphaquant-demo-1';
    const { suggestions } = req.body;

    if (!suggestions || !Array.isArray(suggestions)) {
      return res.status(400).json({ error: 'Rebalance suggestions array is required.' });
    }

    const currentHoldings = await db.getPortfolio(userId);

    for (const sug of suggestions) {
      const match = currentHoldings.find(h => h.id === sug.holdingId || h.ticker === sug.ticker);
      if (match) {
        const newQty = sug.targetQuantity;
        const newTotalInvested = Number((newQty * match.avgBuyPrice).toFixed(2));
        const newCurrentValue = Number((newQty * match.currentPrice).toFixed(2));
        const newPnl = Number((newCurrentValue - newTotalInvested).toFixed(2));
        const newPnlPercent = newTotalInvested > 0 ? Number(((newPnl / newTotalInvested) * 100).toFixed(2)) : 0;

        await db.updateHolding(userId, match.id, {
          quantity: newQty,
          totalInvested: newTotalInvested,
          currentValue: newCurrentValue,
          pnl: newPnl,
          pnlPercent: newPnlPercent,
          notes: `${match.notes || ''} [MVO Rebalanced to ${sug.optimalWeightPct}%]`.trim()
        });
      }
    }

    const updated = await db.getPortfolio(userId);
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
    const tickers = await db.getWatchlist(userId);

    const items = await Promise.all(
      tickers.map(async (ticker, idx) => {
        try {
          const quote = await getStockQuote(ticker);
          const history = await getHistoricalData(ticker, 90);
          const regime = detectMarketRegime(history, ticker);
          const drift = detectConceptDrift(history, ticker);
          const news = getNewsForTicker(ticker, quote.name);
          const avgSent = news.reduce((acc, n) => acc + n.sentimentScore, 0) / (news.length || 1);
          const pred = runConformalPrediction(history, ticker, avgSent, regime.regimeId, DEFAULT_CONFORMAL_CONFIDENCE);
          if (!isConformalPredictionAvailable(pred)) {
            return null;
          }

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

// Real-Time News Pulse for Watchlist Assets
app.get('/api/watchlist/pulse', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-alphaquant-demo-1';
    let tickers = await db.getWatchlist(userId);
    if (!tickers || tickers.length === 0) {
      tickers = ['TATAMOTORS.NS', 'NVDA', 'RELIANCE.NS', 'AAPL', 'TCS.NS'];
    }

    const activeTickers = tickers.slice(0, 8);
    const pulseItems: any[] = [];
    let totalScore = 0;
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    let liveArticlesCount = 0;

    await Promise.all(
      activeTickers.map(async (ticker) => {
        try {
          const resolved = await resolveTickerOrName(ticker);
          const quote = await getStockQuote(resolved);
          const hybrid = await getHybridNewsForTicker(resolved, quote.name);

          totalScore += hybrid.blendedSentimentScore;
          if (hybrid.blendedSentimentScore > 0.15) bullishCount++;
          else if (hybrid.blendedSentimentScore < -0.15) bearishCount++;
          else neutralCount++;

          liveArticlesCount += hybrid.liveCount;

          const topHeadlines = hybrid.news.slice(0, 3);
          topHeadlines.forEach((item) => {
            pulseItems.push({
              id: item.id,
              ticker: resolved,
              companyName: quote.name,
              headline: item.headline,
              summary: item.summary,
              source: item.source,
              url: item.url,
              publishedAt: item.publishedAt,
              sentiment: item.sentiment,
              sentimentScore: item.sentimentScore,
              confidence: item.confidence,
              isLive: !!item.isLive,
              sentimentSource: item.sentimentSource,
              language: item.language,
              modelId: item.modelId,
              price: quote.price,
              changePercent: quote.changePercent
            });
          });
        } catch (err) {
          console.warn(`Watchlist pulse error for ${ticker}:`, err);
        }
      })
    );

    pulseItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const totalAssets = activeTickers.length || 1;
    const avgScore = Number((totalScore / totalAssets).toFixed(3));
    const bullishPct = Math.round((bullishCount / totalAssets) * 100);
    const bearishPct = Math.round((bearishCount / totalAssets) * 100);
    const neutralPct = Math.max(0, 100 - bullishPct - bearishPct);

    let marketMoodLabel: 'Strongly Bullish' | 'Bullish Bias' | 'Neutral Market' | 'Cautious / Bearish' | 'Strong Bearish Pressure' = 'Neutral Market';
    if (avgScore >= 0.35) marketMoodLabel = 'Strongly Bullish';
    else if (avgScore >= 0.12) marketMoodLabel = 'Bullish Bias';
    else if (avgScore <= -0.35) marketMoodLabel = 'Strong Bearish Pressure';
    else if (avgScore <= -0.12) marketMoodLabel = 'Cautious / Bearish';

    return res.json({
      mood: {
        overallScore: avgScore,
        marketMoodLabel,
        bullishPct,
        neutralPct,
        bearishPct,
        totalAssets: activeTickers.length,
        liveArticlesCount,
        lastUpdated: new Date().toISOString()
      },
      items: pulseItems
    });
  } catch (error: any) {
    console.error('Error fetching watchlist pulse:', error);
    return res.status(500).json({ error: 'Failed to retrieve watchlist news pulse.' });
  }
});

app.post('/api/watchlist', authenticateToken, validateBody(watchlistAddSchema), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'user-alphaquant-demo-1';
  const { ticker } = req.body;
  const sym = await resolveTickerOrName(ticker);
  const updated = await db.addToWatchlist(userId, sym);
  return res.json({ success: true, watchlist: updated });
});

app.delete('/api/watchlist/:ticker', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'user-alphaquant-demo-1';
  const sym = await resolveTickerOrName(req.params.ticker);
  const updated = await db.removeFromWatchlist(userId, sym);
  return res.json({ success: true, watchlist: updated });
});

// -------------------------------------------------------------
// 9.5 EARNINGS CALENDAR & HISTORICAL SURPRISE PATTERNS
// -------------------------------------------------------------

app.get('/api/earnings/calendar', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    let userId = 'user-alphaquant-demo-1';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const resolved = await resolveTokenUser(token);
      if (resolved?.id) userId = resolved.id;
    }
    const watchlistOnly = req.query.watchlistOnly === 'true';
    const userWatchlist = await db.getWatchlist(userId);
    const data = await getEarningsCalendarData(userWatchlist, watchlistOnly);
    return res.json(data);
  } catch (error: any) {
    console.error('Error retrieving earnings calendar:', error);
    return res.status(500).json({ error: 'Failed to retrieve earnings calendar data.' });
  }
});

// -------------------------------------------------------------
// 10. ALERTS ENDPOINTS
// -------------------------------------------------------------

app.get('/api/alerts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'user-alphaquant-demo-1';
  const alerts = await db.getAlerts(userId);
  return res.json(alerts);
});

app.post('/api/alerts', authenticateToken, validateBody(createAlertSchema), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'user-alphaquant-demo-1';
  const {
    ticker,
    type,
    threshold,
    percentChangeThreshold,
    direction,
    basePrice,
    label,
    channels,
    email,
    pushEnabled,
    emailEnabled,
    driftThresholdPct,
    varConfidenceLevel,
    varHorizonDays,
    varThresholdPct,
    varThresholdDollar,
    varMetric,
    volatilityThresholdPct,
    volatilityLookbackDays,
    volatilityMetric,
    riskCategory,
    riskSeverity,
    currentMetricValue,
    rsiThreshold,
    rsiCondition,
    rsiPeriod,
    currentRsiValue
  } = req.body;

  const sym = ticker === 'ALL' ? 'ALL' : await resolveTickerOrName(ticker);
  const newAlert = {
    id: `alert-${Date.now()}`,
    ticker: sym,
    type,
    threshold: threshold !== undefined && threshold !== '' ? parseFloat(threshold) : undefined,
    percentChangeThreshold: percentChangeThreshold !== undefined && percentChangeThreshold !== '' ? parseFloat(percentChangeThreshold) : undefined,
    direction: direction || (type === 'price_above' ? 'above' : type === 'price_below' ? 'below' : 'above'),
    basePrice: basePrice ? parseFloat(basePrice) : undefined,
    label,
    channels: channels || ['email', 'push'],
    email: email || req.user?.email || 'user@alphaquant.ai',
    pushEnabled: pushEnabled !== false,
    emailEnabled: emailEnabled !== false,
    driftThresholdPct: driftThresholdPct ? parseFloat(driftThresholdPct) : undefined,
    // Risk-based alert fields
    varConfidenceLevel: varConfidenceLevel ? parseInt(varConfidenceLevel, 10) : undefined,
    varHorizonDays: varHorizonDays ? parseInt(varHorizonDays, 10) : undefined,
    varThresholdPct: varThresholdPct !== undefined && varThresholdPct !== '' ? parseFloat(varThresholdPct) : undefined,
    varThresholdDollar: varThresholdDollar !== undefined && varThresholdDollar !== '' ? parseFloat(varThresholdDollar) : undefined,
    varMetric: varMetric || undefined,
    volatilityThresholdPct: volatilityThresholdPct !== undefined && volatilityThresholdPct !== '' ? parseFloat(volatilityThresholdPct) : undefined,
    volatilityLookbackDays: volatilityLookbackDays ? parseInt(volatilityLookbackDays, 10) : undefined,
    volatilityMetric: volatilityMetric || undefined,
    riskCategory: riskCategory || (type === 'var_exceeded' ? 'Value-at-Risk (VaR)' : type === 'volatility_spike' ? 'Volatility Surge' : type === 'rsi_cross' ? 'RSI Momentum' : undefined),
    riskSeverity: riskSeverity || (type === 'var_exceeded' || type === 'volatility_spike' ? 'High Risk' : undefined),
    currentMetricValue: currentMetricValue !== undefined && currentMetricValue !== '' ? parseFloat(currentMetricValue) : undefined,
    // RSI Technical Momentum Fields
    rsiThreshold: rsiThreshold !== undefined && rsiThreshold !== '' ? parseFloat(rsiThreshold) : undefined,
    rsiCondition: rsiCondition || (type === 'rsi_cross' ? (parseFloat(threshold || '50') <= 30 ? 'oversold_30' : 'overbought_70') : undefined),
    rsiPeriod: rsiPeriod ? parseInt(rsiPeriod, 10) : 14,
    currentRsiValue: currentRsiValue !== undefined && currentRsiValue !== '' ? parseFloat(currentRsiValue) : undefined,
    enabled: true,
    createdAt: new Date().toISOString()
  };
  await db.createAlert(userId, newAlert);
  return res.status(201).json(newAlert);
});

app.put('/api/alerts/:id', authenticateToken, validateBody(toggleAlertSchema), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'user-alphaquant-demo-1';
  const { enabled } = req.body;
  const updated = await db.toggleAlert(userId, req.params.id, Boolean(enabled));
  if (!updated) return res.status(404).json({ error: 'Alert not found.' });
  return res.json(updated);
});

app.delete('/api/alerts/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'user-alphaquant-demo-1';
  await db.deleteAlert(userId, req.params.id);
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
3. Rule-Based Trend/Volatility Regime Classifier: Classifies market conditions into Low Volatility / Bullish (State 0) and High Volatility / Bearish (State 1) to identify volatility shifts.
4. FinBERT Transformer Sentiment & Lexicon Fallback: Scores financial news using Xenova/finbert transformer inference with automatic keyword financial-sentiment lexicon fallback, publisher-credibility weighting, daily persistence, and lag analysis.
5. Two-Sample KS Drift Test: Evaluates two-sample Kolmogorov-Smirnov tests (p < 0.05 alert trigger) comparing training baselines against live 30-day inference windows.
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
  app.all(['/api', '/api/*'], (req: Request, res: Response) => {
    return res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  // Ensure middleware errors (CORS, malformed JSON body, payload limits) return JSON, never Express HTML
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 600
      ? err.status
      : typeof err?.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600
        ? err.statusCode
        : 500;
    const message =
      err?.type === 'entity.parse.failed'
        ? 'Invalid JSON request payload.'
        : err?.type === 'entity.too.large'
          ? 'Request payload too large.'
          : (err?.message || 'Internal server error.');
    emitStructuredLog(status >= 500 ? 'error' : 'warn', 'http_error', {
      method: req.method,
      path: req.originalUrl?.split('?')[0] || req.path,
      statusCode: status,
      meta: { error: message }
    });
    return res.status(status).json({ error: message });
  });

  return app;
}

// -------------------------------------------------------------
// 11. VITE INTEGRATION & SERVER STARTUP
// -------------------------------------------------------------

export async function startServer() {
  const app = createApp();
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
    // Non-blocking background warmup so cold aggregate/accuracy endpoints don't exceed proxy timeouts
    const warmupTimer = setTimeout(() => {
      const tickers = TICKER_CATALOG.map(t => t.ticker);
      computeProjectWideAccuracy(getHistoricalDataWithSource, tickers)
        .then(async () =>
          runAggregateModelEvaluation(getHistoricalDataWithSource, TICKER_CATALOG, {
            sentimentByTicker: await buildSentimentMapFromDb()
          })
        )
        .catch(() => {});
    }, 1500);
    warmupTimer.unref();
  });
}

const isEntryPoint =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isEntryPoint) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
