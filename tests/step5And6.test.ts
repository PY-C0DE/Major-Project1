import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../server';
import { resetRepository, createInMemoryRepository } from '../src/server/store/db';
import { detectTextLanguage } from '../src/server/math/languageDetection';
import {
  scoreHeadlinesWithFinbert,
  setFinbertPipelineOverride,
  resetFinbertState,
  FINBERT_MODEL_ID,
  MULTILINGUAL_LEXICON_MODEL_ID
} from '../src/server/math/finbertSentiment';
import { buildDailySentimentRecordsFromLiveArticles } from '../src/server/math/nlpEngine';
import { setStructuredLogSink, StructuredLogEntry } from '../src/server/middleware/logger';
import { BackgroundJobQueue } from '../src/server/jobs/jobQueue';
import { NewsItem } from '../src/types';

describe('Step 5 — Multilingual Language Detection, FinBERT English-Only Guard & Sentiment Persistence', () => {
  afterEach(() => {
    resetFinbertState();
  });

  it('detects languages accurately across Korean, Japanese, Chinese, Hindi, European, and English headlines', () => {
    const ko = detectTextLanguage('삼성전자 분기 실적 호실적 기록하며 주가 급등');
    assert.equal(ko.language, 'ko');
    assert.equal(ko.isEnglish, false);

    const ja = detectTextLanguage('トヨタ自動車が営業利益を上方修正し株価上昇');
    assert.equal(ja.language, 'ja');
    assert.equal(ja.isEnglish, false);

    const zh = detectTextLanguage('腾讯控股季度盈利增长创纪录并宣布分红');
    assert.equal(zh.language, 'zh');
    assert.equal(zh.isEnglish, false);

    const hi = detectTextLanguage('रिलायंस इंडस्ट्रीज का मुनाफा रिकॉर्ड स्तर पर पहुंचा');
    assert.equal(hi.language, 'hi');
    assert.equal(hi.isEnglish, false);

    const de = detectTextLanguage('SAP steigert Gewinn im Quartal und hebt Prognose für das Wachstum an');
    assert.equal(de.language, 'de');
    assert.equal(de.isEnglish, false);

    const fr = detectTextLanguage('TotalEnergies annonce une hausse record du bénéfice pour le trimestre');
    assert.equal(fr.language, 'fr');
    assert.equal(fr.isEnglish, false);

    const es = detectTextLanguage('Banco Santander sube tras publicar beneficio récord y fuerte crecimiento');
    assert.equal(es.language, 'es');
    assert.equal(es.isEnglish, false);

    const en = detectTextLanguage('Apple reports strong quarterly earnings growth and raises revenue guidance');
    assert.equal(en.language, 'en');
    assert.equal(en.isEnglish, true);
  });

  it('NEVER passes non-English text to English FinBERT and routes mixed batches cleanly', async () => {
    const finbertInputsSeen: string[] = [];

    setFinbertPipelineOverride(async () => {
      return async (texts: string | string[]) => {
        const list = Array.isArray(texts) ? texts : [texts];
        for (const t of list) {
          finbertInputsSeen.push(t);
        }
        return list.map(() => [
          { label: 'positive', score: 0.88 },
          { label: 'neutral', score: 0.09 },
          { label: 'negative', score: 0.03 }
        ]);
      };
    });

    // Purely non-English batch must NOT invoke FinBERT loader or pipeline at all
    const nonEnglishResults = await scoreHeadlinesWithFinbert([
      { headline: '삼성전자 호실적 발표로 주가 상승 및 배당 확대', publisher: 'Yonhap' },
      { headline: 'SAP steigert Gewinn und hebt Prognose deutlich an', publisher: 'Handelsblatt' }
    ]);
    assert.equal(finbertInputsSeen.length, 0, 'FinBERT must NEVER be called for non-English headlines');
    assert.equal(nonEnglishResults[0].sentimentSource, 'multilingual-lexicon');
    assert.equal(nonEnglishResults[0].language, 'ko');
    assert.equal(nonEnglishResults[0].modelId, MULTILINGUAL_LEXICON_MODEL_ID);
    assert.ok(nonEnglishResults[0].sentimentScore > 0);
    assert.equal(nonEnglishResults[1].sentimentSource, 'multilingual-lexicon');
    assert.equal(nonEnglishResults[1].language, 'de');
    assert.ok(nonEnglishResults[1].sentimentScore > 0);

    // Mixed batch: only the English headline hits FinBERT; Japanese negative headline uses multilingual lexicon
    const mixedResults = await scoreHeadlinesWithFinbert([
      { headline: 'NVIDIA beats revenue expectations on strong data center growth', publisher: 'Reuters' },
      { headline: 'ソニーが下方修正と減益を発表し株価急落', publisher: 'Nikkei' }
    ]);
    assert.equal(finbertInputsSeen.length, 1);
    assert.match(finbertInputsSeen[0], /NVIDIA beats revenue expectations/);

    assert.equal(mixedResults[0].sentimentSource, 'finbert');
    assert.equal(mixedResults[0].language, 'en');
    assert.equal(mixedResults[0].modelId, FINBERT_MODEL_ID);
    assert.ok(mixedResults[0].sentimentScore > 0.7);

    assert.equal(mixedResults[1].sentimentSource, 'multilingual-lexicon');
    assert.equal(mixedResults[1].language, 'ja');
    assert.equal(mixedResults[1].modelId, MULTILINGUAL_LEXICON_MODEL_ID);
    assert.ok(mixedResults[1].sentimentScore < 0);
  });

  it('persists language and modelId per daily sentiment record through repository storage', async () => {
    const repo = createInMemoryRepository();
    const articles: NewsItem[] = [
      {
        id: 'ko-1',
        ticker: '005930.KS',
        headline: '삼성전자 호실적 발표로 주가 상승',
        summary: '견조한 반도체 성장',
        source: 'Reuters',
        url: 'https://example.com/ko-1',
        publishedAt: '2026-03-04T04:00:00Z', // 13:00 KST -> open session 2026-03-04
        sentiment: 'positive',
        sentimentScore: 0.62,
        probabilities: { positive: 0.75, neutral: 0.15, negative: 0.1 },
        confidence: 0.75,
        factCheckStatus: 'Verified',
        verificationScore: 0.96,
        sourceCredibility: 0.96,
        isLive: true,
        dataSource: 'live',
        sentimentSource: 'multilingual-lexicon',
        language: 'ko',
        modelId: MULTILINGUAL_LEXICON_MODEL_ID
      }
    ];

    const daily = buildDailySentimentRecordsFromLiveArticles('005930.KS', articles);
    assert.equal(daily.length, 1);
    assert.equal(daily[0].language, 'ko');
    assert.equal(daily[0].modelId, MULTILINGUAL_LEXICON_MODEL_ID);
    assert.equal(daily[0].sentimentSource, 'multilingual-lexicon');

    const upsert = await repo.upsertDailySentiment(daily, { persist: false });
    assert.equal(upsert.inserted, 1);

    const stored = await repo.getDailySentimentForTicker('005930.KS');
    assert.equal(stored.length, 1);
    assert.equal(stored[0].language, 'ko');
    assert.equal(stored[0].modelId, MULTILINGUAL_LEXICON_MODEL_ID);
    assert.equal(stored[0].sentimentSource, 'multilingual-lexicon');
  });
});

describe('Step 6 — Security Hardening, Validation, Probes, Structured Logging & Background Job Queue', () => {
  afterEach(() => {
    setStructuredLogSink(null);
  });

  it('applies Helmet security headers, enforces CORS allowlist with 403 JSON rejection, and emits structured JSON logs with X-Request-Id', async () => {
    resetRepository();
    const loggedEntries: StructuredLogEntry[] = [];
    setStructuredLogSink((entry) => loggedEntries.push(entry));

    const app = createApp({
      jwtSecret: 'step6-test-secret-with-at-least-32-characters',
      allowedOrigins: ['https://allowed.alphaquant.example']
    });

    // Allowed origin + Helmet headers + X-Request-Id propagation
    const okRes = await request(app)
      .get('/healthz')
      .set('Origin', 'https://allowed.alphaquant.example')
      .set('X-Request-Id', 'req-step6-trace-1');

    assert.equal(okRes.status, 200);
    assert.equal(okRes.body.status, 'ok');
    assert.equal(okRes.headers['access-control-allow-origin'], 'https://allowed.alphaquant.example');
    assert.equal(okRes.headers['x-content-type-options'], 'nosniff');
    assert.equal(okRes.headers['x-powered-by'], undefined);
    assert.equal(okRes.headers['x-request-id'], 'req-step6-trace-1');

    // Disallowed Origin returns 403 JSON (never wildcards or HTML stack trace)
    const blockedRes = await request(app)
      .get('/healthz')
      .set('Origin', 'https://evil-untrusted.example');

    assert.equal(blockedRes.status, 403);
    assert.match(blockedRes.body.error || '', /Origin not allowed by CORS policy/i);

    assert.ok(
      loggedEntries.some((e) => e.event === 'http_request' && e.requestId === 'req-step6-trace-1' && e.statusCode === 200)
    );
  });

  it('exposes /healthz and /readyz probes (returning 503 when database check fails) and enforces rate limits', async () => {
    resetRepository();
    const healthyApp = createApp({
      jwtSecret: 'step6-probes-secret-with-at-least-32-chars',
      apiRateLimitMax: 2
    });

    const readyOk = await request(healthyApp).get('/readyz');
    assert.equal(readyOk.status, 200);
    assert.equal(readyOk.body.status, 'ready');
    assert.equal(readyOk.body.checks.database, 'ok');
    assert.ok(readyOk.body.checks.queue);

    // Rate limit enforcement (max 2 requests per minute -> 3rd request hits 429)
    const r1 = await request(healthyApp).get('/api/fx/rates');
    const r2 = await request(healthyApp).get('/api/fx/rates');
    const r3 = await request(healthyApp).get('/api/fx/rates');
    assert.notEqual(r1.status, 429);
    assert.notEqual(r2.status, 429);
    assert.equal(r3.status, 429);
    assert.match(r3.body.error, /rate limit exceeded/i);

    // /healthz stays exempt from /api rate limits
    const healthRes = await request(healthyApp).get('/healthz');
    assert.equal(healthRes.status, 200);

    // Unhealthy /readyz check returns 503
    const unhealthyApp = createApp({
      jwtSecret: 'step6-probes-secret-with-at-least-32-chars',
      readinessCheck: async () => false
    });
    const readyFail = await request(unhealthyApp).get('/readyz');
    assert.equal(readyFail.status, 503);
    assert.equal(readyFail.body.status, 'not_ready');
  });

  it('validates payloads and queries with Zod schemas returning structured 400 issues', async () => {
    resetRepository();
    const app = createApp({ jwtSecret: 'step6-zod-secret-with-at-least-32-characters' });

    const regRes = await request(app).post('/api/auth/register').send({
      name: '',
      email: 'not-an-email',
      password: '123'
    });
    assert.equal(regRes.status, 400);
    assert.ok(Array.isArray(regRes.body.issues) && regRes.body.issues.length >= 1);

    const searchRes = await request(app).get('/api/tickers/search?limit=9999');
    assert.equal(searchRes.status, 400);
    assert.ok(Array.isArray(searchRes.body.issues));

    const validReg = await request(app).post('/api/auth/register').send({
      name: 'Step 6 Tester',
      email: 'step6-zod@example.com',
      password: 'StrongPassword!2026'
    });
    assert.equal(validReg.status, 201);
    const token = validReg.body.token as string;

    const badPortfolio = await request(app)
      .post('/api/portfolio')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticker: 'AAPL', quantity: -5, avgBuyPrice: 0 });
    assert.equal(badPortfolio.status, 400);
    assert.ok(Array.isArray(badPortfolio.body.issues) && badPortfolio.body.issues.length >= 1);

    const badJob = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'invalid-job-kind' });
    assert.equal(badJob.status, 400);
    assert.ok(Array.isArray(badJob.body.issues));
  });

  it('queues and executes audit, backfill, and refit jobs asynchronously via POST /api/jobs, GET /api/jobs, and GET /api/jobs/:id', async () => {
    resetRepository();
    const seenTypes: string[] = [];

    const testQueue = new BackgroundJobQueue({
      concurrency: 2,
      handlers: {
        audit: async (payload, ctx) => {
          seenTypes.push('audit');
          ctx.updateProgress(1, 1, 'Completed mocked audit');
          return { available: true, evaluatedAssetsCount: 1, scope: payload.ticker || 'ALL' };
        },
        backfill: async (payload, ctx) => {
          seenTypes.push('backfill');
          ctx.updateProgress(2, 2, 'Backfilled sentiment');
          return { inserted: 2, updatedToday: 1, ticker: payload.ticker || 'ALL' };
        },
        refit: async (payload, ctx) => {
          seenTypes.push('refit');
          ctx.updateProgress(1, 1, 'Refitted model');
          return { refittedCount: 1, ticker: payload.ticker || 'ALL' };
        }
      }
    });

    const app = createApp({
      jwtSecret: 'step6-jobs-secret-with-at-least-32-characters',
      jobQueue: testQueue
    });

    // Unauthenticated access denied
    const unauth = await request(app).post('/api/jobs').send({ type: 'audit' });
    assert.equal(unauth.status, 401);

    const reg = await request(app).post('/api/auth/register').send({
      name: 'Job Operator',
      email: 'job-operator@example.com',
      password: 'StrongPassword!2026'
    });
    assert.equal(reg.status, 201);
    const token = reg.body.token as string;

    const auditEnq = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'audit', ticker: 'AAPL' });
    assert.equal(auditEnq.status, 202);
    assert.equal(auditEnq.body.job.type, 'audit');

    const backfillEnq = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'backfill', ticker: 'RELIANCE.NS', maxArticles: 10 });
    assert.equal(backfillEnq.status, 202);

    const refitEnq = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'refit', ticker: 'MSFT' });
    assert.equal(refitEnq.status, 202);

    // Wait briefly for microtask queue to run all three handlers
    for (let i = 0; i < 20; i++) {
      const check = await request(app)
        .get(`/api/jobs/${refitEnq.body.job.id}`)
        .set('Authorization', `Bearer ${token}`);
      if (check.body.job.status === 'completed') break;
      await new Promise((r) => setTimeout(r, 15));
    }

    const auditStatus = await request(app)
      .get(`/api/jobs/${auditEnq.body.job.id}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(auditStatus.status, 200);
    assert.equal(auditStatus.body.job.status, 'completed');
    assert.equal(auditStatus.body.job.result.evaluatedAssetsCount, 1);

    const listRes = await request(app)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.jobs.length, 3);
    assert.equal(listRes.body.stats.completed, 3);
    assert.deepEqual(seenTypes.sort(), ['audit', 'backfill', 'refit']);

    const missingJob = await request(app)
      .get('/api/jobs/non-existent-id')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(missingJob.status, 404);
  });
});
