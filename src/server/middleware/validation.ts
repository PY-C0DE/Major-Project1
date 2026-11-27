/**
 * Zod Request Validation Schemas & Express Middlewares (Step 6)
 */

import { z, ZodError, ZodType } from 'zod';
import type { Request, Response, NextFunction } from 'express';

function formatZodIssues(err: ZodError): Array<{ path: string; message: string; code: string }> {
  return err.issues.map((issue) => ({
    path: issue.path.join('.') || 'body',
    message: issue.message,
    code: issue.code
  }));
}

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const issues = formatZodIssues(parsed.error);
      return res.status(400).json({
        error: issues[0]?.message || 'Invalid request payload.',
        issues
      });
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query ?? {});
    if (!parsed.success) {
      const issues = formatZodIssues(parsed.error);
      return res.status(400).json({
        error: issues[0]?.message || 'Invalid query parameters.',
        issues
      });
    }
    (req as Request & { validatedQuery?: T }).validatedQuery = parsed.data;
    next();
  };
}

export const registerSchema = z.object({
  name: z.string({ message: 'Name, email, and password are required.' }).trim().min(1, 'A valid name is required.').max(120),
  email: z.string({ message: 'Name, email, and password are required.' }).trim().email('A valid email address format is required.'),
  password: z.string({ message: 'Name, email, and password are required.' }).min(8, 'Password must be at least 8 characters long.').max(128)
});

export const loginSchema = z.object({
  email: z.string({ message: 'Email and password are required.' }).trim().email('A valid email address format is required.'),
  password: z.string({ message: 'Email and password are required.' }).min(1, 'Email and password are required.').max(128)
});

export const firebaseAuthSchema = z.object({
  idToken: z.string().min(10).optional()
});

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    title: z.string().trim().max(120).nullable().optional(),
    organization: z.string().trim().max(120).nullable().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    timezone: z.string().trim().max(80).nullable().optional(),
    bio: z.string().trim().max(1000).nullable().optional(),
    avatarUrl: z.string().trim().max(2000).nullable().optional(),
    currencyPreference: z.string().trim().min(3).max(8).optional(),
    defaultExchange: z.string().trim().min(2).max(20).optional(),
    confidenceLevel: z.coerce.number().min(50).max(99).optional(),
    twoFactorEnabled: z.boolean().optional(),
    notifications: z
      .object({
        emailAlerts: z.boolean().optional(),
        regimeShifts: z.boolean().optional(),
        driftWarnings: z.boolean().optional(),
        marketOpenSummary: z.boolean().optional()
      })
      .optional()
  })
  .strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password and new password are required.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long.').max(128)
});

export const tickerSearchQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
  country: z.string().trim().max(8).optional(),
  exchange: z.string().trim().max(16).optional(),
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(24)
});

export const createPredictionSchema = z.object({
  ticker: z.string({ message: 'Ticker symbol is required.' }).trim().min(1, 'Ticker symbol is required.').max(40)
});

export const addPortfolioHoldingSchema = z.object({
  ticker: z.string({ message: 'Ticker, quantity, and avgBuyPrice are required.' }).trim().min(1, 'Ticker symbol is required.').max(40),
  quantity: z.coerce.number().positive('Quantity must be a positive number.'),
  avgBuyPrice: z.coerce.number().positive('Average buy price must be positive.'),
  purchaseDate: z.string().trim().max(32).optional(),
  notes: z.string().trim().max(500).optional()
});

export const batchPortfolioSchema = z.object({
  holdings: z
    .array(
      z.object({
        ticker: z.string().trim().min(1).max(40),
        quantity: z.coerce.number().positive(),
        avgBuyPrice: z.coerce.number().positive(),
        purchaseDate: z.string().trim().max(32).optional(),
        notes: z.string().trim().max(500).optional()
      })
    )
    .min(1, 'Holdings array is required.')
    .max(500)
});

export const optimizePortfolioSchema = z.object({
  objective: z.enum(['max_sharpe', 'min_volatility', 'equal_weight']).optional().default('max_sharpe'),
  holdings: z.array(z.record(z.string(), z.unknown())).optional(),
  riskFreeRate: z.coerce.number().min(0).max(0.25).optional(),
  maxWeightCap: z.coerce.number().min(0.05).max(1).optional(),
  minWeightFloor: z.coerce.number().min(0).max(0.5).optional()
});

export const correlationPortfolioSchema = z.object({
  holdings: z.array(z.record(z.string(), z.unknown())).optional(),
  lookbackDays: z.coerce.number().int().min(20).max(730).optional().default(90)
});

export const watchlistAddSchema = z.object({
  ticker: z.string({ message: 'Ticker symbol is required.' }).trim().min(1, 'Ticker symbol is required.').max(40)
});

export const createAlertSchema = z
  .object({
    ticker: z.string({ message: 'Ticker, type, and label are required.' }).trim().min(1, 'Ticker is required.').max(40),
    type: z.enum([
      'price_above',
      'price_below',
      'percentage_change',
      'regime_shift',
      'drift_detected',
      'interval_widening',
      'sentiment_shift',
      'var_exceeded',
      'volatility_spike',
      'rsi_cross'
    ]),
    label: z.string({ message: 'Ticker, type, and label are required.' }).trim().min(1, 'Label is required.').max(200)
  })
  .passthrough();

export const toggleAlertSchema = z.object({
  enabled: z.boolean()
});

export const brokerOrderSchema = z.object({
  ticker: z.string().trim().min(1).max(40),
  side: z.enum(['BUY', 'SELL']),
  qty: z.coerce.number().positive().max(1_000_000),
  type: z.enum(['MARKET', 'LIMIT']),
  limitPrice: z.coerce.number().positive().optional(),
  stopLossPrice: z.coerce.number().positive().optional(),
  takeProfitPrice: z.coerce.number().positive().optional(),
  timeInForce: z.enum(['DAY', 'GTC']).optional().default('DAY')
});

export const createBackgroundJobSchema = z.object({
  type: z.enum(['audit', 'backfill', 'refit', 'ticker_refresh']),
  ticker: z.string().trim().min(1).max(40).optional(),
  tickers: z.array(z.string().trim().min(1).max(40)).max(100).optional(),
  maxArticles: z.coerce.number().int().min(1).max(50).optional()
});

export const verifyEmailRequestSchema = z.object({
  email: z.string().trim().email('A valid email address format is required.').optional()
});

export const verifyEmailConfirmSchema = z.object({
  token: z
    .string({ message: 'Verification token is required.' })
    .trim()
    .min(16, 'Invalid or malformed verification token.')
    .max(256)
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ message: 'A valid email address is required.' })
    .trim()
    .email('A valid email address format is required.')
});

export const resetPasswordSchema = z.object({
  token: z
    .string({ message: 'Reset token is required.' })
    .trim()
    .min(16, 'Invalid or malformed password reset token.')
    .max(256),
  newPassword: z
    .string({ message: 'New password is required.' })
    .min(8, 'New password must be at least 8 characters long.')
    .max(128)
});

export const deleteAccountSchema = z.object({
  confirmText: z.literal('DELETE MY ACCOUNT', {
    message: 'Type "DELETE MY ACCOUNT" exactly to confirm permanent deletion.'
  }),
  currentPassword: z.string().min(1).max(128).optional(),
  firebaseIdToken: z.string().min(10).optional()
});
