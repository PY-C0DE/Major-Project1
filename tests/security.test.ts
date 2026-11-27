import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../server';
import { resetRepository } from '../src/server/store/db';
import { BackgroundJobQueue } from '../src/server/jobs/jobQueue';
import {
  MailProvider,
  SendMailInput,
  setMailProviderOverride,
  resetMailProvider
} from '../src/server/services/mailService';

const TEST_JWT_SECRET = 'security-suite-secret-key-with-at-least-32-chars';

describe('Security Regression Suite — Auth, JWT Expiry/Revocation, CORS, Rate Limits, Zod Validation & Token Replay', () => {
  afterEach(() => {
    resetMailProvider();
  });

  it('blocks unauthenticated and tampered-JWT access across all protected routes (401)', async () => {
    resetRepository();
    const app = createApp({
      jwtSecret: TEST_JWT_SECRET,
      allowDemoMode: false
    });

    const protectedRoutes: Array<{ method: 'get' | 'post' | 'put' | 'delete'; path: string; body?: object }> = [
      { method: 'get', path: '/api/auth/me' },
      { method: 'put', path: '/api/auth/profile', body: { name: 'Attacker' } },
      { method: 'get', path: '/api/account/export' },
      { method: 'delete', path: '/api/account', body: { confirmText: 'DELETE MY ACCOUNT' } },
      { method: 'get', path: '/api/portfolio' },
      { method: 'post', path: '/api/portfolio', body: { ticker: 'AAPL', quantity: 1, avgBuyPrice: 100 } },
      { method: 'get', path: '/api/watchlist' },
      { method: 'get', path: '/api/alerts' },
      { method: 'get', path: '/api/predictions/history' },
      { method: 'post', path: '/api/jobs', body: { type: 'audit', ticker: 'AAPL' } },
      { method: 'get', path: '/api/jobs' },
      { method: 'get', path: '/api/jobs/failed' }
    ];

    for (const ep of protectedRoutes) {
      const resNoAuth = await request(app)[ep.method](ep.path).send(ep.body);
      assert.equal(resNoAuth.status, 401, `Expected 401 without token on ${ep.method.toUpperCase()} ${ep.path}`);

      const resBadSig = await request(app)
        [ep.method](ep.path)
        .set('Authorization', 'Bearer tampered.jwt.signature')
        .send(ep.body);
      assert.equal(resBadSig.status, 401, `Expected 401 for tampered JWT on ${ep.method.toUpperCase()} ${ep.path}`);
    }

    const wrongSecretToken = jwt.sign(
      { id: 'user-alphaquant-demo-1', email: 'alex.morgan@alphaquant.ai', tokenVersion: 1 },
      'wrong-signing-key-with-at-least-32-characters',
      { expiresIn: '1h' }
    );
    const wrongSigRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${wrongSecretToken}`);
    assert.equal(wrongSigRes.status, 401);
  });

  it('rejects expired JWT tokens and tokens revoked after account deletion', async () => {
    resetRepository();
    const app = createApp({
      jwtSecret: TEST_JWT_SECRET,
      allowDemoMode: false
    });

    const reg = await request(app).post('/api/auth/register').send({
      name: 'Session Security User',
      email: 'session-sec@example.com',
      password: 'StrongPassword!2026'
    });
    assert.equal(reg.status, 201);
    const { user, token } = reg.body as { user: { id: string; email: string }; token: string };

    // 1. Expired JWT signed with valid secret must return 401
    const expiredJwt = jwt.sign(
      { id: user.id, email: user.email, tokenVersion: 1 },
      TEST_JWT_SECRET,
      { expiresIn: -10 }
    );
    const expMe = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredJwt}`);
    assert.equal(expMe.status, 401);
    assert.match(expMe.body.error || '', /invalid, revoked, or expired/i);

    const expPortfolio = await request(app)
      .get('/api/portfolio')
      .set('Authorization', `Bearer ${expiredJwt}`);
    assert.equal(expPortfolio.status, 401);

    // 2. Active JWT works before deletion, then becomes immediately invalid after account deletion
    const validMe = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(validMe.status, 200);

    const delRes = await request(app)
      .delete('/api/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmText: 'DELETE MY ACCOUNT', currentPassword: 'StrongPassword!2026' });
    assert.equal(delRes.status, 200);

    const afterDeleteMe = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(afterDeleteMe.status, 401);
  });

  it('enforces tiered rate limiting across auth credentials (429), general API routes (429), and heavy job endpoints (429)', async () => {
    resetRepository();
    const queue = new BackgroundJobQueue({
      concurrency: 1,
      handlers: {
        refit: async () => ({ refittedCount: 1 })
      }
    });

    const app = createApp({
      jwtSecret: TEST_JWT_SECRET,
      authRateLimitMax: 2,
      apiRateLimitMax: 3,
      heavyRateLimitMax: 2,
      jobQueue: queue
    });

    // 1. Auth credential rate limiter (max 2)
    const login1 = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'wrong' });
    const login2 = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'wrong' });
    const login3 = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'wrong' });
    assert.equal(login1.status, 401);
    assert.equal(login2.status, 401);
    assert.equal(login3.status, 429);
    assert.match(login3.body.error || '', /too many authentication attempts/i);

    // 2. General API rate limiter (max 3)
    const s1 = await request(app).get('/api/tickers/search?q=AAPL');
    const s2 = await request(app).get('/api/tickers/search?q=MSFT');
    const s3 = await request(app).get('/api/tickers/search?q=NVDA');
    const s4 = await request(app).get('/api/tickers/search?q=TSLA');
    assert.equal(s1.status, 200);
    assert.equal(s2.status, 200);
    assert.equal(s3.status, 200);
    assert.equal(s4.status, 429);
    assert.match(s4.body.error || '', /rate limit exceeded/i);

    // /healthz stays exempt from /api rate limits
    const health = await request(app).get('/healthz');
    assert.equal(health.status, 200);

    // 3. Heavy jobs rate limiter (using fresh app instance so general counter doesn't mask heavy counter)
    const heavyApp = createApp({
      jwtSecret: TEST_JWT_SECRET,
      apiRateLimitMax: 100,
      heavyRateLimitMax: 2,
      jobQueue: queue
    });
    const reg = await request(heavyApp).post('/api/auth/register').send({
      name: 'Rate User',
      email: 'rate-user@example.com',
      password: 'StrongPassword!2026'
    });
    assert.equal(reg.status, 201);
    const token = reg.body.token as string;

    const j1 = await request(heavyApp)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'refit', ticker: 'AAPL' });
    const j2 = await request(heavyApp)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'refit', ticker: 'MSFT' });
    const j3 = await request(heavyApp)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'refit', ticker: 'NVDA' });

    assert.equal(j1.status, 202);
    assert.equal(j2.status, 202);
    assert.equal(j3.status, 429);
    assert.match(j3.body.error || '', /rate limit exceeded for heavy/i);

    await queue.close();
  });

  it('rejects disallowed CORS origins without wildcard reflection on both GET and OPTIONS preflight', async () => {
    resetRepository();
    const app = createApp({
      jwtSecret: TEST_JWT_SECRET,
      allowedOrigins: ['https://trusted.alphaquant.example']
    });

    const allowed = await request(app)
      .get('/api/compliance/config')
      .set('Origin', 'https://trusted.alphaquant.example');
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers['access-control-allow-origin'], 'https://trusted.alphaquant.example');
    assert.notEqual(allowed.headers['access-control-allow-origin'], '*');

    const disallowedGet = await request(app)
      .get('/api/compliance/config')
      .set('Origin', 'https://malicious-site.example');
    assert.equal(disallowedGet.status, 403);
    assert.equal(disallowedGet.headers['access-control-allow-origin'], undefined);
    assert.match(disallowedGet.body.error || '', /Origin not allowed by CORS policy/i);

    const disallowedPreflight = await request(app)
      .options('/api/portfolio')
      .set('Origin', 'https://malicious-site.example')
      .set('Access-Control-Request-Method', 'POST');
    assert.equal(disallowedPreflight.status, 403);
    assert.equal(disallowedPreflight.headers['access-control-allow-origin'], undefined);
  });

  it('rejects malformed payloads, strict-schema violations, path traversal attempts, and invalid JSON with structured 400 errors', async () => {
    resetRepository();
    const app = createApp({
      jwtSecret: TEST_JWT_SECRET,
      authRateLimitMax: 20
    });

    // 1. Malformed JSON returns JSON 400 rather than HTML stack trace
    const badJson = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "broken"');
    assert.equal(badJson.status, 400);
    assert.match(badJson.body.error || '', /Invalid JSON request payload/i);

    // 2. Register validation failures
    const badReg = await request(app).post('/api/auth/register').send({
      name: 'User',
      email: 'not-valid-email',
      password: 'short'
    });
    assert.equal(badReg.status, 400);
    assert.ok(Array.isArray(badReg.body.issues));

    const reg = await request(app).post('/api/auth/register').send({
      name: 'Zod Tester',
      email: 'zod-sec@example.com',
      password: 'StrongPassword!2026'
    });
    assert.equal(reg.status, 201);
    const token = reg.body.token as string;

    // 3. Strict profile schema rejects unexpected keys / out-of-range confidenceLevel
    const badProfile = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ confidenceLevel: 150, isAdmin: true });
    assert.equal(badProfile.status, 400);

    // 4. Out-of-bounds ticker search query
    const badSearch = await request(app).get('/api/tickers/search?page=-1&limit=5000');
    assert.equal(badSearch.status, 400);

    // 5. Invalid portfolio numbers & SQLi-like ticker string checks
    const badHolding = await request(app)
      .post('/api/portfolio')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticker: 'AAPL', quantity: -10, avgBuyPrice: 0 });
    assert.equal(badHolding.status, 400);

    // 6. Path traversal inside BackgroundJobQueue ticker_refresh handler rejects outside workspace csvPath
    const queue = new BackgroundJobQueue({ concurrency: 1, retryDelayMs: 5, maxAttempts: 1 });
    const traversalJob = queue.enqueue('ticker_refresh', { csvPath: '../../etc/passwd' }, 'tester');
    for (let i = 0; i < 30; i++) {
      const state = queue.getJob(traversalJob.id);
      if (state?.status === 'failed' || state?.status === 'completed') break;
      await new Promise((r) => setTimeout(r, 10));
    }
    const doneTraversal = queue.getJob(traversalJob.id);
    assert.equal(doneTraversal?.status, 'failed');
    assert.match(doneTraversal?.failedReason || '', /inside the workspace directory/i);
    await queue.close();
  });

  it('prevents verification & reset token replay, isolates tenant resources across users, and returns clean 400/404s', async () => {
    resetRepository();
    const sent: SendMailInput[] = [];
    const mockMail: MailProvider = {
      providerName: 'mock',
      isConfigured: () => true,
      async sendMail(msg) {
        sent.push(msg);
        return { provider: 'mock', messageId: `m-${sent.length}` };
      }
    };
    setMailProviderOverride(mockMail);

    const app = createApp({
      jwtSecret: TEST_JWT_SECRET,
      authRateLimitMax: 50
    });

    const userA = await request(app).post('/api/auth/register').send({
      name: 'User A',
      email: 'usera-sec@example.com',
      password: 'PasswordA!2026'
    });
    const userB = await request(app).post('/api/auth/register').send({
      name: 'User B',
      email: 'userb-sec@example.com',
      password: 'PasswordB!2026'
    });
    assert.equal(userA.status, 201);
    assert.equal(userB.status, 201);
    const tokenA = userA.body.token as string;
    const tokenB = userB.body.token as string;

    // Tenant isolation: holding created by User A is invisible and non-modifiable by User B
    const createHolding = await request(app)
      .post('/api/portfolio')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ ticker: 'AAPL', quantity: 5, avgBuyPrice: 190 });
    assert.equal(createHolding.status, 201);
    const holdingId = createHolding.body.id as string;

    const userBList = await request(app)
      .get('/api/portfolio')
      .set('Authorization', `Bearer ${tokenB}`);
    assert.equal(userBList.status, 200);
    assert.equal(userBList.body.some((h: any) => h.id === holdingId), false);

    const userBMutate = await request(app)
      .put(`/api/portfolio/${holdingId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ quantity: 999 });
    assert.equal(userBMutate.status, 404);

    // Single-use token replay: verify email & password reset
    await request(app)
      .post('/api/auth/verify-email/request')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({});
    const verifyTok = sent[0].text.match(/verifyToken=([a-f0-9]+)/i)?.[1];
    assert.ok(verifyTok);

    const firstVerify = await request(app)
      .post('/api/auth/verify-email/confirm')
      .send({ token: verifyTok });
    assert.equal(firstVerify.status, 200);

    const replayVerify = await request(app)
      .post('/api/auth/verify-email/confirm')
      .send({ token: verifyTok });
    assert.equal(replayVerify.status, 400);

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'usera-sec@example.com' });
    const resetTok = sent[1].text.match(/resetToken=([a-f0-9]+)/i)?.[1];
    assert.ok(resetTok);

    const firstReset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetTok, newPassword: 'RotatedPassword!2027' });
    assert.equal(firstReset.status, 200);

    const replayReset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetTok, newPassword: 'SecondAttackPassword!2028' });
    assert.equal(replayReset.status, 400);
  });
});
