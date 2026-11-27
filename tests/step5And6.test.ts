import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../server';
import { resetRepository, createInMemoryRepository } from '../src/server/store/db';
import { detectTextLanguage } from '../src/server/math/languageDetection';
import {
  scoreHeadlinesWithFinbert,
  setFinbertPipelineOverride,
  setMultilingualPipelineOverride,
  resetFinbertState,
  FINBERT_MODEL_ID,
  FINBERT_MODEL_VERSION,
  MULTILINGUAL_MODEL_ID,
  MULTILINGUAL_MODEL_VERSION,
  MULTILINGUAL_LEXICON_MODEL_ID,
  UNSUPPORTED_LANGUAGE_MODEL_ID
} from '../src/server/math/finbertSentiment';
import { buildDailySentimentRecordsFromLiveArticles } from '../src/server/math/nlpEngine';
import { setStructuredLogSink, StructuredLogEntry } from '../src/server/middleware/logger';
import { BackgroundJobQueue } from '../src/server/jobs/jobQueue';
import { NewsItem } from '../src/types';

describe('Step 5 — franc-min Language Detection, Multilingual Transformer, FinBERT English-Only Guard & Sentiment Persistence', () => {
  afterEach(() => {
    resetFinbertState();
  });

  it('detects languages across short headlines, mixed-language text, non-Latin scripts, and European/English headlines', () => {
    const ko = detectTextLanguage('삼성전자 분기 실적 호실적 기록하며 주가 급등');
    assert.equal(ko.language, 'ko');
    assert.equal(ko.isEnglish, false);
    assert.equal(ko.detector, 'franc-min');

    const jaMixed = detectTextLanguage('NVIDIA (NVDA) 決算は予想を上回る大幅増益で株価急上昇');
    assert.equal(jaMixed.language, 'ja');
    assert.equal(jaMixed.isEnglish, false);

    const zh = detectTextLanguage('腾讯控股季度盈利增长创纪录并宣布分红');
    assert.equal(zh.language, 'zh');
    assert.equal(zh.isEnglish, false);

    const hi = detectTextLanguage('रिलायंस इंडस्ट्रीज का मुनाफा रिकॉर्ड स्तर पर पहुंचा और लाभांश बढ़ाया');
    assert.equal(hi.language, 'hi');
    assert.equal(hi.isEnglish, false);

    const de = detectTextLanguage('SAP steigert Gewinn im Quartal und hebt Prognose für das Wachstum an');
    assert.equal(de.language, 'de');
    assert.equal(de.isEnglish, false);
    assert.equal(de.detector, 'franc-min');

    const fr = detectTextLanguage('TotalEnergies annonce une hausse record du bénéfice pour le trimestre');
    assert.equal(fr.language, 'fr');
    assert.equal(fr.isEnglish, false);
    assert.equal(fr.detector, 'franc-min');

    const es = detectTextLanguage('Banco Santander sube tras publicar beneficio récord y fuerte crecimiento');
    assert.equal(es.language, 'es');
    assert.equal(es.isEnglish, false);
    assert.equal(es.detector, 'franc-min');

    const en = detectTextLanguage('Apple reports strong quarterly earnings growth and raises revenue guidance');
    assert.equal(en.language, 'en');
    assert.equal(en.isEnglish, true);
    assert.equal(en.detector, 'franc-min');

    // Very short headline falls back gracefully without falsely calling non-English text English
    const shortDe = detectTextLanguage('SAP Gewinn steigt');
    assert.equal(shortDe.language, 'de');
    assert.equal(shortDe.isEnglish, false);
    assert.equal(shortDe.detector, 'heuristic-fallback');

    const shortEn = detectTextLanguage('NVDA beats Q3');
    assert.equal(shortEn.language, 'en');
    assert.equal(shortEn.isEnglish, true);
    assert.equal(shortEn.detector, 'heuristic-fallback');
  });

  it('routes English to FinBERT, supported non-English to multilingual transformer (with lexicon fallback), and marks unsupported languages explicitly', async () => {
    const finbertInputsSeen: string[] = [];
    const multiInputsSeen: string[] = [];

    setFinbertPipelineOverride(async () => {
      return async (texts: string | string[]) => {
        const list = Array.isArray(texts) ? texts : [texts];
        for (const t of list) finbertInputsSeen.push(t);
        return list.map(() => [
          { label: 'positive', score: 0.88 },
          { label: 'neutral', score: 0.09 },
          { label: 'negative', score: 0.03 }
        ]);
      };
    });

    setMultilingualPipelineOverride(async () => {
      return async (texts: string | string[]) => {
        const list = Array.isArray(texts) ? texts : [texts];
        for (const t of list) multiInputsSeen.push(t);
        return list.map((t) =>
          t.includes('下方修正')
            ? [
                { label: 'negative', score: 0.84 },
                { label: 'neutral', score: 0.11 },
                { label: 'positive', score: 0.05 }
              ]
            : [
                { label: 'positive', score: 0.81 },
                { label: 'neutral', score: 0.14 },
                { label: 'negative', score: 0.05 }
              ]
        );
      };
    });

    // 1. Supported non-English (de) uses multilingual-transformer; unsupported (ko) is flagged unsupported_language; NEVER touches FinBERT
    const nonEnglishResults = await scoreHeadlinesWithFinbert([
      { headline: '삼성전자 호실적 발표로 주가 상승 및 배당 확대', publisher: 'Yonhap' },
      { headline: 'SAP steigert Gewinn und hebt Prognose deutlich an', publisher: 'Handelsblatt' }
    ]);
    assert.equal(finbertInputsSeen.length, 0, 'FinBERT must NEVER be called for non-English headlines');
    assert.equal(multiInputsSeen.length, 1);

    assert.equal(nonEnglishResults[0].sentimentSource, 'unsupported_language');
    assert.equal(nonEnglishResults[0].language, 'ko');
    assert.equal(nonEnglishResults[0].modelId, UNSUPPORTED_LANGUAGE_MODEL_ID);
    assert.equal(nonEnglishResults[0].sentimentScore, 0);

    assert.equal(nonEnglishResults[1].sentimentSource, 'multilingual-transformer');
    assert.equal(nonEnglishResults[1].language, 'de');
    assert.equal(nonEnglishResults[1].modelId, MULTILINGUAL_MODEL_ID);
    assert.equal(nonEnglishResults[1].modelVersion, MULTILINGUAL_MODEL_VERSION);
    assert.ok(nonEnglishResults[1].sentimentScore > 0.7);

    // 2. Mixed batch: English hits FinBERT, Japanese hits multilingual transformer
    const mixedResults = await scoreHeadlinesWithFinbert([
      { headline: 'NVIDIA beats revenue expectations on strong data center growth', publisher: 'Reuters' },
      { headline: 'ソニーが下方修正と減益を発表し株価急落', publisher: 'Nikkei' }
    ]);
    assert.equal(finbertInputsSeen.length, 1);
    assert.match(finbertInputsSeen[0], /NVIDIA beats revenue expectations/);

    assert.equal(mixedResults[0].sentimentSource, 'finbert');
    assert.equal(mixedResults[0].language, 'en');
    assert.equal(mixedResults[0].modelId, FINBERT_MODEL_ID);
    assert.equal(mixedResults[0].modelVersion, FINBERT_MODEL_VERSION);

    assert.equal(mixedResults[1].sentimentSource, 'multilingual-transformer');
    assert.equal(mixedResults[1].language, 'ja');
    assert.equal(mixedResults[1].modelId, MULTILINGUAL_MODEL_ID);
    assert.ok(mixedResults[1].sentimentScore < -0.5);

    // 3. Fallback when multilingual transformer fails
    resetFinbertState();
    setMultilingualPipelineOverride(async () => {
      throw new Error('Multilingual ONNX load error');
    });
    const fallbackRes = await scoreHeadlinesWithFinbert([
      { headline: 'SAP steigert Gewinn und hebt Prognose deutlich an', publisher: 'Handelsblatt' }
    ]);
    assert.equal(fallbackRes[0].sentimentSource, 'multilingual-lexicon');
    assert.equal(fallbackRes[0].modelId, MULTILINGUAL_LEXICON_MODEL_ID);
    assert.equal(fallbackRes[0].modelVersion, 'v1');
    assert.ok(fallbackRes[0].sentimentScore > 0);
  });

  it('persists language, modelId, and modelVersion and excludes unsupported_language from daily sentiment aggregates', async () => {
    const repo = createInMemoryRepository();
    const articles: NewsItem[] = [
      {
        id: 'de-1',
        ticker: 'SAP.DE',
        headline: 'SAP steigert Gewinn und hebt Prognose an',
        summary: 'Starkes Cloud-Wachstum',
        source: 'Reuters',
        url: 'https://example.com/de-1',
        publishedAt: '2026-03-04T11:00:00Z', // 12:00 CET -> open XETR session
        sentiment: 'positive',
        sentimentScore: 0.76,
        probabilities: { positive: 0.82, neutral: 0.12, negative: 0.06 },
        confidence: 0.82,
        factCheckStatus: 'Verified',
        verificationScore: 0.96,
        sourceCredibility: 0.96,
        isLive: true,
        dataSource: 'live',
        sentimentSource: 'multilingual-transformer',
        language: 'de',
        modelId: MULTILINGUAL_MODEL_ID,
        modelVersion: MULTILINGUAL_MODEL_VERSION
      },
      {
        id: 'ru-unsupported',
        ticker: 'SAP.DE',
        headline: 'Неподдерживаемый язык финансовой новости для теста',
        summary: 'Тест исключения',
        source: 'Reuters',
        url: 'https://example.com/ru-1',
        publishedAt: '2026-03-05T11:00:00Z',
        sentiment: 'neutral',
        sentimentScore: 0,
        probabilities: { positive: 0, neutral: 1, negative: 0 },
        confidence: 0,
        factCheckStatus: 'Verified',
        verificationScore: 0.96,
        sourceCredibility: 0.96,
        isLive: true,
        dataSource: 'live',
        sentimentSource: 'unsupported_language',
        language: 'ru',
        modelId: UNSUPPORTED_LANGUAGE_MODEL_ID,
        modelVersion: 'n/a'
      }
    ];

    const daily = buildDailySentimentRecordsFromLiveArticles('SAP.DE', articles);
    // Only the supported German article aggregates; unsupported_language day (2026-03-05) is excluded
    assert.equal(daily.length, 1);
    assert.equal(daily[0].date, '2026-03-04');
    assert.equal(daily[0].language, 'de');
    assert.equal(daily[0].modelId, MULTILINGUAL_MODEL_ID);
    assert.equal(daily[0].modelVersion, MULTILINGUAL_MODEL_VERSION);
    assert.equal(daily[0].sentimentSource, 'multilingual-transformer');

    const upsert = await repo.upsertDailySentiment(daily, { persist: false });
    assert.equal(upsert.inserted, 1);

    const stored = await repo.getDailySentimentForTicker('SAP.DE');
    assert.equal(stored.length, 1);
    assert.equal(stored[0].language, 'de');
    assert.equal(stored[0].modelId, MULTILINGUAL_MODEL_ID);
    assert.equal(stored[0].modelVersion, MULTILINGUAL_MODEL_VERSION);
    assert.equal(stored[0].sentimentSource, 'multilingual-transformer');
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

  it('executes built-in ticker_refresh job and excludes delisted (active=false) entries from ranked search', async () => {
    resetRepository();
    const queue = new BackgroundJobQueue({ concurrency: 1 });
    const app = createApp({
      jwtSecret: 'step6-refresh-secret-with-at-least-32-chars',
      jobQueue: queue
    });

    const reg = await request(app).post('/api/auth/register').send({
      name: 'Universe Operator',
      email: 'universe-op@example.com',
      password: 'StrongPassword!2026'
    });
    assert.equal(reg.status, 201);
    const token = reg.body.token as string;

    // Seed an explicitly delisted symbol alongside active entries
    const jobRes = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'ticker_refresh' });
    assert.equal(jobRes.status, 202);
    assert.equal(jobRes.body.job.type, 'ticker_refresh');

    let finalJob: any = null;
    for (let i = 0; i < 40; i++) {
      const check = await request(app)
        .get(`/api/jobs/${jobRes.body.job.id}`)
        .set('Authorization', `Bearer ${token}`);
      if (check.body.job.status === 'completed' || check.body.job.status === 'failed') {
        finalJob = check.body.job;
        break;
      }
      await new Promise((r) => setTimeout(r, 25));
    }

    assert.equal(finalJob?.status, 'completed');
    assert.equal(finalJob?.result?.csvLoaded, true);
    assert.ok(finalJob?.result?.activeTickers >= 1000, `Expected >= 1000 active tickers, got ${finalJob?.result?.activeTickers}`);
    assert.ok(finalJob?.result?.inactiveTickers >= 1, 'Expected at least 1 delisted/inactive ticker');

    // Verify GET /api/tickers/search covers >= 25 exchanges and excludes delisted inactive rows
    const page1 = await request(app).get('/api/tickers/search?limit=50&page=1');
    assert.equal(page1.status, 200);
    assert.ok(page1.body.total >= 1000);
    assert.ok(page1.body.filters.exchanges.length >= 25, `Expected >= 25 exchanges, got ${page1.body.filters.exchanges.length}`);

    const { db } = await import('../src/server/store/db');
    const allRows = await db.getAllTickers(false);
    const delistedSample = allRows.find((t) => !t.active);
    assert.ok(delistedSample, 'Should include at least one inactive/delisted sample row');
    const delistedSearch = await request(app).get(`/api/tickers/search?q=${encodeURIComponent(delistedSample.symbol)}`);
    assert.equal(delistedSearch.status, 200);
    assert.equal(
      delistedSearch.body.items.some((i: any) => i.symbol === delistedSample.symbol),
      false,
      'Delisted (active=false) ticker must not appear in active search results'
    );

    await queue.close();
  });
});
