import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import request from 'supertest';
import { createApp } from '../server';
import { db, resetRepository } from '../src/server/store/db';
import {
  MailProvider,
  SendMailInput,
  setMailProviderOverride,
  resetMailProvider
} from '../src/server/services/mailService';
import {
  BackgroundJobQueue,
  createJobQueueFromEnv
} from '../src/server/jobs/jobQueue';
import { computeAllIndicators, ComputedBar, PriceBar } from '../src/server/math/indicators';
import {
  clearEvaluationCaches,
  runAggregateModelEvaluation,
  buildModelAuditPayload,
  computeBreakdownStatsForEvaluations,
  isModelEvaluationAvailable,
  UniverseTickerMeta
} from '../src/server/math/evaluation';
import { buildAuditCsv } from '../src/shared/auditExport';
import { DailySentimentRecord, ModelEvaluation } from '../src/types';

function makeLiveTradingSeries(days = 220, startIso = '2025-10-01', seedOffset = 1, basePrice = 120): ComputedBar[] {
  const raw: PriceBar[] = [];
  let cur = startIso;
  let price = basePrice;
  for (let i = 0; i < days; i++) {
    const dow = new Date(`${cur}T12:00:00Z`).getUTCDay();
    if (dow !== 0 && dow !== 6) {
      const wave = Math.sin((i + seedOffset * 3) * 0.21) * 0.009 + 0.0004;
      const open = Number(price.toFixed(2));
      price = Math.max(10, price * (1 + wave));
      const close = Number(price.toFixed(2));
      raw.push({
        date: cur,
        open,
        high: Number((Math.max(open, close) * 1.007).toFixed(2)),
        low: Number((Math.min(open, close) * 0.993).toFixed(2)),
        close,
        volume: 1_200_000 + (i % 7) * 95_000,
        source: 'live'
      });
    }
    const nextDt = new Date(Date.parse(`${cur}T12:00:00Z`) + 86_400_000);
    cur = nextDt.toISOString().slice(0, 10);
  }
  return computeAllIndicators(raw);
}

describe('Step 7A — Email Verification & Password Reset Flows', () => {
  const savedEnv = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    MAIL_FROM: process.env.MAIL_FROM,
    RESEND_API_KEY: process.env.RESEND_API_KEY
  };

  afterEach(() => {
    resetMailProvider();
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('returns HTTP 503 for verification and password reset emails when no mail provider is configured', async () => {
    resetRepository();
    resetMailProvider();
    delete process.env.SMTP_HOST;
    delete process.env.MAIL_FROM;
    delete process.env.RESEND_API_KEY;

    const app = createApp({ jwtSecret: 'step7-mail-unconfigured-secret-32chars' });

    const verifyReq = await request(app)
      .post('/api/auth/verify-email/request')
      .send({ email: 'alice@example.com' });
    assert.equal(verifyReq.status, 503);
    assert.match(verifyReq.body.error || '', /not configured/i);

    const forgotReq = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'alice@example.com' });
    assert.equal(forgotReq.status, 503);
    assert.match(forgotReq.body.error || '', /not configured/i);
  });

  it('verifies email with single-use hashed tokens, rejects reuse/expired tokens, and resets password end-to-end', async () => {
    resetRepository();
    const sentMessages: SendMailInput[] = [];
    const mockProvider: MailProvider = {
      providerName: 'mock-smtp',
      isConfigured: () => true,
      async sendMail(input) {
        sentMessages.push(input);
        return { provider: 'mock-smtp', messageId: `msg-${sentMessages.length}` };
      }
    };
    setMailProviderOverride(mockProvider);

    const app = createApp({
      jwtSecret: 'step7-mail-flow-secret-32characters',
      authRateLimitMax: 50
    });

    // 1. Register user (starts unverified)
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Alice Quant',
      email: 'alice.quant@example.com',
      password: 'OldPassword!2026'
    });
    assert.equal(reg.status, 201);
    assert.equal(reg.body.user.emailVerified, false);
    const jwtToken = reg.body.token as string;
    const userId = reg.body.user.id as string;

    // 2. Request email verification
    const reqVerify = await request(app)
      .post('/api/auth/verify-email/request')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({});
    assert.equal(reqVerify.status, 200);
    assert.equal(reqVerify.body.sent, true);
    assert.equal(sentMessages.length, 1);

    const verifyMatch = sentMessages[0].text.match(/verifyToken=([a-f0-9]+)/i);
    assert.ok(verifyMatch && verifyMatch[1], 'Verification email must include verifyToken query param');
    const rawVerifyToken = verifyMatch[1];

    // 3. Confirm verification succeeds and flips emailVerified -> true
    const confirmRes = await request(app).get(`/api/auth/verify-email?token=${rawVerifyToken}`);
    assert.equal(confirmRes.status, 200);
    assert.equal(confirmRes.body.verified, true);
    assert.equal(confirmRes.body.user.emailVerified, true);

    // 4. Single-use token cannot be reused
    const reuseRes = await request(app)
      .post('/api/auth/verify-email/confirm')
      .send({ token: rawVerifyToken });
    assert.equal(reuseRes.status, 400);

    // 5. Expired token is rejected
    const expiredRaw = 'a'.repeat(40);
    const expiredHash = crypto.createHash('sha256').update(expiredRaw).digest('hex');
    await db.createAuthToken({
      id: 'tok-expired-1',
      userId,
      purpose: 'email_verification',
      tokenHash: expiredHash,
      expiresAt: '2020-01-01T00:00:00.000Z'
    });
    const expiredRes = await request(app)
      .post('/api/auth/verify-email/confirm')
      .send({ token: expiredRaw });
    assert.equal(expiredRes.status, 400);

    // 6. Unknown email on forgot-password does not leak account existence or send mail
    const unknownForgot = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });
    assert.equal(unknownForgot.status, 200);
    assert.equal(sentMessages.length, 1);

    // 7. Known email triggers password reset email
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'alice.quant@example.com' });
    assert.equal(forgotRes.status, 200);
    assert.equal(sentMessages.length, 2);

    const resetMatch = sentMessages[1].text.match(/resetToken=([a-f0-9]+)/i);
    assert.ok(resetMatch && resetMatch[1], 'Reset email must include resetToken query param');
    const rawResetToken = resetMatch[1];

    // 8. Complete password reset
    const resetRes = await request(app).post('/api/auth/reset-password').send({
      token: rawResetToken,
      newPassword: 'NewStrongPassword!2027'
    });
    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.success, true);

    // Reuse fails
    const resetReuse = await request(app).post('/api/auth/reset-password').send({
      token: rawResetToken,
      newPassword: 'AnotherPassword!2028'
    });
    assert.equal(resetReuse.status, 400);

    // Old password rejected, new password accepted
    const oldLogin = await request(app).post('/api/auth/login').send({
      email: 'alice.quant@example.com',
      password: 'OldPassword!2026'
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await request(app).post('/api/auth/login').send({
      email: 'alice.quant@example.com',
      password: 'NewStrongPassword!2027'
    });
    assert.equal(newLogin.status, 200);
    assert.ok(newLogin.body.token);
  });
});

describe('Step 7B — Durable Job Queue, Exponential Retries & Failed-Job Recovery', () => {
  const savedQueueEnv = {
    NODE_ENV: process.env.NODE_ENV,
    JOB_QUEUE_BACKEND: process.env.JOB_QUEUE_BACKEND,
    REDIS_URL: process.env.REDIS_URL,
    ALLOW_IN_PROCESS_JOB_QUEUE: process.env.ALLOW_IN_PROCESS_JOB_QUEUE
  };

  afterEach(() => {
    for (const [k, v] of Object.entries(savedQueueEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('retries transient failures, moves exhausted jobs to failed list, and allows manual HTTP retry', async () => {
    resetRepository();
    let shouldFail = true;
    let attemptsSeen = 0;

    const queue = new BackgroundJobQueue({
      concurrency: 1,
      maxAttempts: 2,
      retryDelayMs: 10,
      handlers: {
        refit: async () => {
          attemptsSeen++;
          if (shouldFail) {
            throw new Error('Upstream transient timeout');
          }
          return { refittedCount: 3 };
        }
      }
    });

    const app = createApp({
      jwtSecret: 'step7-queue-secret-at-least-32-chars',
      jobQueue: queue
    });

    const reg = await request(app).post('/api/auth/register').send({
      name: 'Queue Admin',
      email: 'queue-admin@example.com',
      password: 'StrongPassword!2026'
    });
    assert.equal(reg.status, 201);
    const token = reg.body.token as string;

    const enq = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'refit', ticker: 'AAPL' });
    assert.equal(enq.status, 202);
    const jobId = enq.body.job.id as string;

    // Wait for both attempts to fail
    for (let i = 0; i < 40; i++) {
      const check = await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`);
      if (check.body.job?.status === 'failed') break;
      await new Promise((r) => setTimeout(r, 15));
    }

    assert.equal(attemptsSeen, 2);
    const failedRes = await request(app)
      .get('/api/jobs/failed')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(failedRes.status, 200);
    assert.equal(failedRes.body.count, 1);
    assert.equal(failedRes.body.jobs[0].id, jobId);
    assert.match(failedRes.body.jobs[0].failedReason || '', /Upstream transient timeout/);

    // Clear fault condition and trigger retry endpoint
    shouldFail = false;
    const retryRes = await request(app)
      .post(`/api/jobs/${jobId}/retry`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(retryRes.status, 202);

    for (let i = 0; i < 40; i++) {
      const check = await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`);
      if (check.body.job?.status === 'completed') break;
      await new Promise((r) => setTimeout(r, 15));
    }

    const doneRes = await request(app)
      .get(`/api/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(doneRes.status, 200);
    assert.equal(doneRes.body.job.status, 'completed');
    assert.equal(doneRes.body.job.result.refittedCount, 3);

    const failedAfter = await request(app)
      .get('/api/jobs/failed')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(failedAfter.status, 200);
    assert.equal(failedAfter.body.count, 0);

    await queue.close();
  });

  it('fails closed when BullMQ or production mode lacks REDIS_URL, and uses dev fallback otherwise', async () => {
    process.env.JOB_QUEUE_BACKEND = 'bullmq';
    delete process.env.REDIS_URL;
    assert.throws(() => createJobQueueFromEnv(), /requires REDIS_URL/i);

    delete process.env.JOB_QUEUE_BACKEND;
    process.env.NODE_ENV = 'production';
    delete process.env.REDIS_URL;
    process.env.ALLOW_IN_PROCESS_JOB_QUEUE = 'false';
    assert.throws(() => createJobQueueFromEnv(), /BullMQ \+ Redis job queue is required in production/i);

    process.env.NODE_ENV = 'development';
    const devQueue = createJobQueueFromEnv({ warnOnFallback: false });
    const ping = await devQueue.ping();
    assert.equal(ping.ok, true);
    assert.equal(ping.backend, 'in-memory');
    await devQueue.close();
  });
});

describe('Step 7C — Compliance Config, User Data Export & Account Deletion', () => {
  const savedComplianceEnv = {
    COMPLIANCE_DISCLAIMER_TEXT: process.env.COMPLIANCE_DISCLAIMER_TEXT,
    COMPLIANCE_OPERATOR_LEGAL_ENTITY: process.env.COMPLIANCE_OPERATOR_LEGAL_ENTITY,
    COMPLIANCE_OPERATOR_NAME: process.env.COMPLIANCE_OPERATOR_NAME,
    COMPLIANCE_OPERATOR_ADDRESS: process.env.COMPLIANCE_OPERATOR_ADDRESS,
    COMPLIANCE_OPERATOR_CONTACT_EMAIL: process.env.COMPLIANCE_OPERATOR_CONTACT_EMAIL,
    COMPLIANCE_DPO_EMAIL: process.env.COMPLIANCE_DPO_EMAIL,
    COMPLIANCE_JURISDICTION: process.env.COMPLIANCE_JURISDICTION
  };

  afterEach(() => {
    for (const [k, v] of Object.entries(savedComplianceEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('serves configurable compliance disclaimer & operator placeholders', async () => {
    resetRepository();
    for (const k of Object.keys(savedComplianceEnv)) {
      delete process.env[k];
    }

    const app = createApp({ jwtSecret: 'step7-compliance-secret-32characters' });

    const defaultCfg = await request(app).get('/api/compliance/config');
    assert.equal(defaultCfg.status, 200);
    assert.ok(defaultCfg.body.disclaimerText.length > 20);
    assert.equal(defaultCfg.body.operatorLegalEntity, '[OPERATOR_LEGAL_ENTITY]');
    assert.equal(defaultCfg.body.operatorAddress, '[OPERATOR_ADDRESS]');
    assert.equal(defaultCfg.body.operatorContactEmail, '[OPERATOR_CONTACT_EMAIL]');
    assert.equal(defaultCfg.body.dpoContact, '[DPO_CONTACT]');
    assert.equal(defaultCfg.body.governingJurisdiction, '[GOVERNING_JURISDICTION]');

    process.env.COMPLIANCE_DISCLAIMER_TEXT = 'Custom Institutional Research Notice';
    process.env.COMPLIANCE_OPERATOR_NAME = 'AlphaQuant Research Ltd.';
    process.env.COMPLIANCE_JURISDICTION = 'Delaware, USA';

    const customCfg = await request(app).get('/api/compliance/config');
    assert.equal(customCfg.status, 200);
    assert.equal(customCfg.body.disclaimerText, 'Custom Institutional Research Notice');
    assert.equal(customCfg.body.operatorLegalEntity, 'AlphaQuant Research Ltd.');
    assert.equal(customCfg.body.governingJurisdiction, 'Delaware, USA');
  });

  it('exports full user personal data archive without passwordHash and enforces explicit account deletion confirmation', async () => {
    resetRepository();
    const app = createApp({ jwtSecret: 'step7-gdpr-secret-32-characters-min' });

    const reg = await request(app).post('/api/auth/register').send({
      name: 'GDPR Subject',
      email: 'gdpr-user@example.com',
      password: 'StrongPassword!2026'
    });
    assert.equal(reg.status, 201);
    const token = reg.body.token as string;
    const userId = reg.body.user.id as string;

    await request(app)
      .post('/api/portfolio')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticker: 'AAPL', quantity: 10, avgBuyPrice: 180 });

    await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticker: 'MSFT' });

    await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticker: 'AAPL', type: 'price_above', threshold: 250, label: 'Target 250' });

    await db.addPrediction({
      id: 'pred-gdpr-1',
      userId,
      ticker: 'AAPL',
      currency: 'USD',
      currentPrice: 180,
      predictedPrice: 184,
      lowerBound: 175,
      upperBound: 193,
      confidenceLevel: 0.9,
      marketRegime: 'Low Volatility / Bullish',
      sentimentScore: 0.25,
      timestamp: new Date().toISOString()
    });

    await db.createAuthToken({
      id: 'tok-gdpr-1',
      userId,
      purpose: 'email_verification',
      tokenHash: 'secret-sha256-hash-should-not-leak',
      expiresAt: new Date(Date.now() + 3600_000).toISOString()
    });

    const expRes = await request(app)
      .get('/api/account/export')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(expRes.status, 200);
    assert.match(expRes.headers['content-disposition'] || '', /alphaquant-account-export\.json/);
    assert.equal(expRes.body.user.email, 'gdpr-user@example.com');
    assert.equal(expRes.body.user.passwordHash, undefined);
    assert.equal(expRes.body.portfolio.length, 1);
    assert.ok(expRes.body.watchlist.includes('MSFT'));
    assert.equal(expRes.body.alerts.length, 1);
    assert.equal(expRes.body.predictionHistory.length, 1);
    assert.equal(expRes.body.authTokens.length, 1);
    assert.equal(expRes.body.authTokens[0].purpose, 'email_verification');
    assert.equal(expRes.body.authTokens[0].tokenHash, undefined);

    // Wrong confirmation phrase fails 400
    const badDel = await request(app)
      .delete('/api/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmText: 'delete', currentPassword: 'StrongPassword!2026' });
    assert.equal(badDel.status, 400);

    // Missing or wrong current password fails 401 re-authentication check
    const noPwDel = await request(app)
      .delete('/api/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmText: 'DELETE MY ACCOUNT' });
    assert.equal(noPwDel.status, 401);

    const wrongPwDel = await request(app)
      .delete('/api/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmText: 'DELETE MY ACCOUNT', currentPassword: 'WrongPassword!123' });
    assert.equal(wrongPwDel.status, 401);

    // Exact confirmation + valid current password permanently deletes account
    const delRes = await request(app)
      .delete('/api/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmText: 'DELETE MY ACCOUNT', currentPassword: 'StrongPassword!2026' });
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.success, true);
    assert.equal(delRes.body.revokedSessions, true);

    // Revoked JWT must return 401 on protected routes
    const meAfter = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(meAfter.status, 401);

    // Verify zero leftover rows for deleted user across every table
    assert.equal(await db.getUserById(userId), undefined);
    assert.equal((await db.getPortfolio(userId)).length, 0);
    assert.equal((await db.getWatchlist(userId)).length, 0);
    assert.equal((await db.getAlerts(userId)).length, 0);
    assert.equal((await db.getPredictionHistory(userId)).length, 0);
    assert.equal(await db.exportUserData(userId), null);
  });
});

describe('Step 8 — Global Universe Audit (--universe) Breakdowns, Currency Separation & Skipped Tickers', () => {
  it('computes country/exchange breakdowns, enforces null raw MAE/RMSE for MIXED currencies, and lists skipped tickers with reasons', async () => {
    clearEvaluationCaches();

    const aaplBars = makeLiveTradingSeries(220, '2025-10-01', 1, 185);
    const msftBars = makeLiveTradingSeries(220, '2025-10-01', 2, 410);
    const relianceBars = makeLiveTradingSeries(220, '2025-10-01', 3, 2850);
    const tcsBars = makeLiveTradingSeries(220, '2025-10-01', 4, 3900);
    const hsbaBars = makeLiveTradingSeries(220, '2025-10-01', 5, 680);

    const universeCatalog = [
      { ticker: 'AAPL', name: 'Apple Inc.' },
      { ticker: 'MSFT', name: 'Microsoft Corp.' },
      { ticker: 'RELIANCE.NS', name: 'Reliance Industries' },
      { ticker: 'TCS.NS', name: 'Tata Consultancy Services' },
      { ticker: 'HSBA.L', name: 'HSBC Holdings' },
      { ticker: 'SKIP_SYNTH', name: 'Synthetic Fallback Asset' },
      { ticker: 'SKIP_SHORT', name: 'Short History Asset' },
      { ticker: 'SKIP_ERR', name: 'Errored Feed Asset' }
    ];

    const tickerMetaLookup = new Map<string, UniverseTickerMeta>([
      ['AAPL', { name: 'Apple Inc.', country: 'US', exchange: 'XNAS', exchangeCode: 'NASDAQ' }],
      ['MSFT', { name: 'Microsoft Corp.', country: 'US', exchange: 'XNAS', exchangeCode: 'NASDAQ' }],
      ['RELIANCE.NS', { name: 'Reliance Industries', country: 'IN', exchange: 'XNSE', exchangeCode: 'NSE' }],
      ['TCS.NS', { name: 'Tata Consultancy Services', country: 'IN', exchange: 'XNSE', exchangeCode: 'NSE' }],
      ['HSBA.L', { name: 'HSBC Holdings', country: 'GB', exchange: 'XLON', exchangeCode: 'LSE' }],
      ['SKIP_SYNTH', { name: 'Synthetic Fallback Asset', country: 'US', exchange: 'XNYS', exchangeCode: 'NYSE' }],
      ['SKIP_SHORT', { name: 'Short History Asset', country: 'JP', exchange: 'XTKS', exchangeCode: 'TSE' }],
      ['SKIP_ERR', { name: 'Errored Feed Asset', country: 'DE', exchange: 'XETR', exchangeCode: 'XETRA' }]
    ]);

    const mockFetcher = async (ticker: string) => {
      switch (ticker) {
        case 'AAPL':
          return { bars: aaplBars, source: 'live' as const, provider: 'test-feed' };
        case 'MSFT':
          return { bars: msftBars, source: 'live' as const, provider: 'test-feed' };
        case 'RELIANCE.NS':
          return { bars: relianceBars, source: 'live' as const, provider: 'test-feed' };
        case 'TCS.NS':
          return { bars: tcsBars, source: 'live' as const, provider: 'test-feed' };
        case 'HSBA.L':
          return { bars: hsbaBars, source: 'live' as const, provider: 'test-feed' };
        case 'SKIP_SYNTH':
          return { bars: aaplBars.slice(0, 120), source: 'synthetic' as const, provider: 'test-feed' };
        case 'SKIP_SHORT':
          return { bars: aaplBars.slice(0, 25), source: 'live' as const, provider: 'test-feed' };
        default:
          throw new Error('Upstream HTTP 502');
      }
    };

    const sentimentByTicker = new Map<string, DailySentimentRecord[]>([
      [
        'AAPL',
        aaplBars.slice(60, 180).map((b, idx) => ({
          date: b.date,
          ticker: 'AAPL',
          credibilityWeightedNetScore: Number((Math.sin(idx * 0.3) * 0.45).toFixed(4)),
          articleCount: 3,
          sentimentSource: 'finbert' as const,
          language: 'en',
          modelId: 'Xenova/finbert',
          updatedAt: `${b.date}T20:00:00Z`
        }))
      ],
      [
        'RELIANCE.NS',
        relianceBars.slice(60, 180).map((b, idx) => ({
          date: b.date,
          ticker: 'RELIANCE.NS',
          credibilityWeightedNetScore: Number((Math.cos(idx * 0.25) * 0.35).toFixed(4)),
          articleCount: 2,
          sentimentSource: 'finbert' as const,
          language: 'en',
          modelId: 'Xenova/finbert',
          updatedAt: `${b.date}T10:30:00Z`
        }))
      ]
    ]);

    const evalRes = await runAggregateModelEvaluation(mockFetcher, universeCatalog, {
      sentimentByTicker,
      tickerMetaLookup,
      universeMode: 'ticker_master',
      includeBreakdowns: true
    });

    assert.ok(isModelEvaluationAvailable(evalRes));
    assert.equal(evalRes.universeMode, 'ticker_master');
    assert.equal(evalRes.evaluatedAssetsCount, 5);
    assert.equal(evalRes.currency, 'MIXED');
    assert.equal(evalRes.mae, null, 'Top-level MIXED-currency aggregate MAE must be null');
    assert.equal(evalRes.rmse, null, 'Top-level MIXED-currency aggregate RMSE must be null');
    assert.equal(evalRes.naiveMae, null, 'Top-level MIXED-currency aggregate naive MAE must be null');
    assert.equal(evalRes.naiveRmse, null, 'Top-level MIXED-currency aggregate naive RMSE must be null');

    // Skipped tickers captured with explicit reasons & metadata
    assert.equal(evalRes.skippedTickers?.length, 3);
    const synthSkip = evalRes.skippedTickers?.find((s) => s.ticker === 'SKIP_SYNTH');
    const shortSkip = evalRes.skippedTickers?.find((s) => s.ticker === 'SKIP_SHORT');
    const errSkip = evalRes.skippedTickers?.find((s) => s.ticker === 'SKIP_ERR');
    assert.equal(synthSkip?.reason, 'synthetic_data');
    assert.equal(synthSkip?.country, 'US');
    assert.equal(shortSkip?.reason, 'insufficient_history');
    assert.equal(shortSkip?.country, 'JP');
    assert.equal(errSkip?.reason, 'fetch_error');
    assert.equal(errSkip?.country, 'DE');

    // Country breakdowns preserve single-currency MAE/RMSE cleanly
    assert.ok(evalRes.countryBreakdowns);
    const us = evalRes.countryBreakdowns.US;
    const india = evalRes.countryBreakdowns.IN;
    const uk = evalRes.countryBreakdowns.GB;
    assert.equal(us.assetsCount, 2);
    assert.equal(us.currency, 'USD');
    assert.ok(typeof us.mae === 'number' && Number.isFinite(us.mae));
    assert.ok(typeof us.naiveMae === 'number' && Number.isFinite(us.naiveMae));
    assert.ok(typeof us.directionalStats.directionalEdgeVsAlwaysUpPct === 'number');
    assert.ok(Array.isArray(us.directionalStats.directionalEdgeVsAlwaysUp95CI));

    assert.equal(india.assetsCount, 2);
    assert.equal(india.currency, 'INR');
    assert.ok(typeof india.mae === 'number' && Number.isFinite(india.mae));

    assert.equal(uk.assetsCount, 1);
    assert.equal(uk.currency, 'GBP');
    assert.ok(typeof uk.mae === 'number' && Number.isFinite(uk.mae));

    // Exchange breakdowns
    assert.ok(evalRes.exchangeBreakdowns);
    assert.equal(evalRes.exchangeBreakdowns.NASDAQ.assetsCount, 2);
    assert.equal(evalRes.exchangeBreakdowns.NSE.assetsCount, 2);
    assert.equal(evalRes.exchangeBreakdowns.LSE.assetsCount, 1);

    // Mixed-currency helper check: manually mixing USD + INR evaluations must yield currency='MIXED' and null MAE/RMSE
    const usdItem: ModelEvaluation = {
      available: true,
      ticker: 'AAPL',
      currency: 'USD',
      modelName: 'test',
      horizonDays: 1,
      mae: 2.1,
      rmse: 2.8,
      mape: 1.2,
      r2: 0.9,
      naiveMae: 2.2,
      naiveRmse: 2.9,
      naiveMape: 1.25,
      directionalAccuracy: 52,
      alwaysUpAccuracy: 50,
      conformalCoverage: 90,
      totalBacktestSamples: 50,
      evaluatedAt: '2026-11-25T00:00:00.000Z',
      comparison: [],
      backtestSeries: []
    };
    const inrItem: ModelEvaluation = {
      ...usdItem,
      ticker: 'RELIANCE.NS',
      currency: 'INR',
      mae: 35.0,
      rmse: 48.0,
      naiveMae: 36.0,
      naiveRmse: 49.0
    };
    const mixedStats = computeBreakdownStatsForEvaluations([usdItem, inrItem], 'MIX_GROUP', 'MIX_GROUP');
    assert.equal(mixedStats.currency, 'MIXED');
    assert.equal(mixedStats.mae, null);
    assert.equal(mixedStats.naiveMae, null);
    assert.equal(mixedStats.rmse, null);
    assert.equal(mixedStats.naiveRmse, null);
    assert.ok(Number.isFinite(mixedStats.priceAccuracy));

    // Causal sentiment ablation + audit payload + CSV formatting
    const audit = buildModelAuditPayload(evalRes);
    assert.equal(audit.available, true);
    assert.equal(audit.universeMode, 'ticker_master');
    assert.equal(audit.skippedTickers?.length, 3);
    assert.ok(audit.countryBreakdowns?.US);
    assert.ok(audit.exchangeBreakdowns?.NSE);
    assert.ok(audit.sentimentAblation?.available);
    assert.equal(audit.sentimentAblation?.pairedDiff?.maeDiff, null, 'Mixed-currency sentiment ablation ΔMAE must be null');

    const csv = buildAuditCsv(audit, 'UNIVERSE_TICKER_MASTER');
    assert.match(csv, /# Country Breakdown \[US\]/);
    assert.match(csv, /# Exchange Breakdown \[NASDAQ\]/);
    assert.match(csv, /# skippedTickers: SKIP_SYNTH/);
  });
});
