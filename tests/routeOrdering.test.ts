import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../server';

describe('Real Express app route ordering', () => {
  it('registers /api/predictions/history before /api/predictions/:ticker and enforces auth', async () => {
    const prevAllowDemo = process.env.ALLOW_DEMO_MODE;
    delete process.env.ALLOW_DEMO_MODE;

    try {
      const app = createApp({ jwtSecret: 'test-jwt-secret-key-at-least-32-characters-long' });

      // 1. Without a token, /api/predictions/history must return 401 (not 200 ticker lookup)
      const unauthRes = await request(app).get('/api/predictions/history');
      assert.equal(unauthRes.status, 401, 'Unauthenticated /api/predictions/history must return 401');

      // 2. Obtain a real JWT by logging in as demo user
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alex.morgan@alphaquant.ai', password: 'demo1234' });
      assert.equal(loginRes.status, 200);
      assert.ok(loginRes.body.token, 'Expected JWT token from login');

      // 3. With a valid JWT, /api/predictions/history must return history array, NOT a ticker prediction object
      const historyRes = await request(app)
        .get('/api/predictions/history')
        .set('Authorization', `Bearer ${loginRes.body.token}`);

      assert.equal(historyRes.status, 200);
      assert.ok(Array.isArray(historyRes.body), 'Expected /api/predictions/history to return an array');
      assert.equal((historyRes.body as any).ticker, undefined, 'Response must not be shaped like a ticker prediction');
      assert.equal((historyRes.body as any).predictedPrice, undefined, 'Response must not contain predictedPrice');
    } finally {
      if (prevAllowDemo === undefined) {
        delete process.env.ALLOW_DEMO_MODE;
      } else {
        process.env.ALLOW_DEMO_MODE = prevAllowDemo;
      }
    }
  });

  it('always returns JSON errors (never HTML) for /api and malformed JSON payloads', async () => {
    const app = createApp({ jwtSecret: 'test-jwt-secret-key-at-least-32-characters-long', allowDemoMode: false });

    const bareApiRes = await request(app).get('/api');
    assert.equal(bareApiRes.status, 404);
    assert.match(bareApiRes.headers['content-type'] || '', /application\/json/);
    assert.equal(typeof bareApiRes.body.error, 'string');

    const badJsonRes = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{bad-json');
    assert.equal(badJsonRes.status, 400);
    assert.match(badJsonRes.headers['content-type'] || '', /application\/json/);
    assert.equal(typeof badJsonRes.body.error, 'string');
  });

  it('registers /api/sentiment/lag-analysis and /api/sentiment/daily-stats before /api/sentiment/:ticker', async () => {
    const app = createApp({ jwtSecret: 'test-jwt-secret-key-at-least-32-characters-long', allowDemoMode: false });

    const lagRes = await request(app).get('/api/sentiment/lag-analysis');
    assert.equal(lagRes.status, 200);
    assert.equal(lagRes.body.scope, 'pooled');
    assert.equal(lagRes.body.ticker, 'ALL');
    assert.equal(typeof lagRes.body.available, 'boolean');

    const statsRes = await request(app).get('/api/sentiment/daily-stats');
    assert.equal(statsRes.status, 200);
    assert.equal(typeof statsRes.body.totalRecords, 'number');
    assert.equal(typeof statsRes.body.tickersWithData, 'number');

    const prevDisable = process.env.DISABLE_FINBERT;
    process.env.DISABLE_FINBERT = 'true';
    try {
      const tickerRes = await request(app).get('/api/sentiment/RELIANCE.NS');
      assert.equal(tickerRes.status, 200);
      assert.ok(
        ['finbert', 'lexicon', 'multilingual-transformer', 'multilingual-lexicon', 'unsupported_language', 'mixed'].includes(
          tickerRes.body.sentimentSource
        )
      );
    } finally {
      if (prevDisable === undefined) delete process.env.DISABLE_FINBERT;
      else process.env.DISABLE_FINBERT = prevDisable;
    }
  });
});
