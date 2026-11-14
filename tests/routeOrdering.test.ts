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
});
