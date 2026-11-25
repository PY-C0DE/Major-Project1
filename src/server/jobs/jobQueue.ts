/**
 * Asynchronous Background Job Queue (Step 6)
 *
 * Schedules and executes long-running operational workloads (`audit`, `backfill`, `refit`)
 * asynchronously outside HTTP request latency, tracking lifecycle status (`queued` -> `running`
 * -> `completed` | `failed`) and per-step progress metrics.
 */

import crypto from 'node:crypto';
import { BackgroundJobRecord, BackgroundJobStatus, BackgroundJobType } from '../../types';
import { TICKER_CATALOG } from '../../shared/tickerCatalog';
import { runAggregateModelEvaluation, buildModelAuditPayload, clearEvaluationCaches, runModelEvaluation, isModelEvaluationAvailable } from '../math/evaluation';
import { collectAndPersistLiveSentimentForTicker } from '../math/nlpEngine';
import { getHistoricalDataWithSource } from '../services/stockService';
import { db } from '../store/db';
import { emitStructuredLog } from '../middleware/logger';

export interface JobExecutionContext {
  updateProgress: (completed: number, total: number, message?: string) => void;
}

export type JobHandlerFn = (
  payload: Record<string, unknown>,
  ctx: JobExecutionContext
) => Promise<unknown>;

async function defaultAuditHandler(payload: Record<string, unknown>, ctx: JobExecutionContext): Promise<unknown> {
  clearEvaluationCaches();
  const requestedTickers = Array.isArray(payload.tickers)
    ? payload.tickers.map((t) => String(t).trim().toUpperCase()).filter(Boolean)
    : typeof payload.ticker === 'string' && payload.ticker.trim() && payload.ticker.trim().toUpperCase() !== 'ALL'
      ? [payload.ticker.trim().toUpperCase()]
      : null;

  const catalog = requestedTickers
    ? TICKER_CATALOG.filter((c) => requestedTickers.includes(c.ticker.toUpperCase())).concat(
        requestedTickers
          .filter((t) => !TICKER_CATALOG.some((c) => c.ticker.toUpperCase() === t))
          .map((t) => ({ ticker: t, name: t, exchange: 'UNKNOWN', currency: 'USD', basePrice: 100, pe: 20, marketCap: 0, sector: 'Equity', aliases: [] }))
      )
    : TICKER_CATALOG;

  ctx.updateProgress(0, catalog.length, `Starting model audit across ${catalog.length} asset(s)`);

  const allSentiment = await db.getAllDailySentiment();
  const sentimentByTicker = new Map<string, typeof allSentiment>();
  for (const rec of allSentiment) {
    const key = rec.ticker.toUpperCase();
    const list = sentimentByTicker.get(key) || [];
    list.push(rec);
    sentimentByTicker.set(key, list);
  }

  const evaluation = await runAggregateModelEvaluation(getHistoricalDataWithSource, catalog, { sentimentByTicker });
  const audit = buildModelAuditPayload(evaluation);
  ctx.updateProgress(
    catalog.length,
    catalog.length,
    audit.available ? `Completed audit (${audit.evaluatedAssetsCount} evaluated)` : `Audit unavailable: ${audit.reason}`
  );
  return audit;
}

async function defaultBackfillHandler(payload: Record<string, unknown>, ctx: JobExecutionContext): Promise<unknown> {
  const maxArticles = typeof payload.maxArticles === 'number' ? payload.maxArticles : 20;
  const targets = Array.isArray(payload.tickers) && payload.tickers.length > 0
    ? payload.tickers.map((t) => String(t).trim().toUpperCase())
    : typeof payload.ticker === 'string' && payload.ticker.trim()
      ? [payload.ticker.trim().toUpperCase()]
      : TICKER_CATALOG.slice(0, 12).map((c) => c.ticker);

  let inserted = 0;
  let updatedToday = 0;
  let processed = 0;

  for (const ticker of targets) {
    const meta = TICKER_CATALOG.find((c) => c.ticker.toUpperCase() === ticker);
    const stats = await collectAndPersistLiveSentimentForTicker(ticker, meta?.name || ticker, {
      bypassCache: true,
      maxArticles,
      persistToDisk: true
    });
    inserted += stats.upsertStats.inserted;
    updatedToday += stats.upsertStats.updatedToday;
    processed++;
    ctx.updateProgress(processed, targets.length, `Processed ${ticker} (${processed}/${targets.length})`);
  }

  return {
    processedTickers: processed,
    inserted,
    updatedToday
  };
}

async function defaultRefitHandler(payload: Record<string, unknown>, ctx: JobExecutionContext): Promise<unknown> {
  clearEvaluationCaches();
  const targets = Array.isArray(payload.tickers) && payload.tickers.length > 0
    ? payload.tickers.map((t) => String(t).trim().toUpperCase())
    : typeof payload.ticker === 'string' && payload.ticker.trim()
      ? [payload.ticker.trim().toUpperCase()]
      : ['RELIANCE.NS', 'TCS.NS', 'AAPL', 'NVDA', 'MSFT'];

  const results: Array<{ ticker: string; available: boolean; directionalAccuracy?: number; reason?: string }> = [];
  let done = 0;

  for (const ticker of targets) {
    try {
      const fetched = await getHistoricalDataWithSource(ticker, 730);
      if (fetched.source === 'synthetic' || fetched.bars.length < 40) {
        results.push({ ticker, available: false, reason: fetched.source === 'synthetic' ? 'synthetic_data' : 'insufficient_history' });
      } else {
        const evalRes = runModelEvaluation(fetched.bars, ticker, fetched.source);
        results.push({
          ticker,
          available: isModelEvaluationAvailable(evalRes),
          directionalAccuracy: evalRes.directionalAccuracy
        });
      }
    } catch (err: any) {
      results.push({ ticker, available: false, reason: err?.message || 'refit_failed' });
    }
    done++;
    ctx.updateProgress(done, targets.length, `Refitted walk-forward ensemble for ${ticker}`);
  }

  return {
    refittedCount: results.filter((r) => r.available).length,
    totalRequested: targets.length,
    results
  };
}

export interface BackgroundJobQueueOptions {
  concurrency?: number;
  maxHistory?: number;
  handlers?: Partial<Record<BackgroundJobType, JobHandlerFn>>;
}

export class BackgroundJobQueue {
  private readonly jobs = new Map<string, BackgroundJobRecord>();
  private readonly pendingIds: string[] = [];
  private activeCount = 0;
  private readonly concurrency: number;
  private readonly maxHistory: number;
  private readonly handlers: Record<BackgroundJobType, JobHandlerFn>;

  constructor(options: BackgroundJobQueueOptions = {}) {
    this.concurrency = Math.max(1, options.concurrency ?? 2);
    this.maxHistory = Math.max(20, options.maxHistory ?? 200);
    this.handlers = {
      audit: options.handlers?.audit ?? defaultAuditHandler,
      backfill: options.handlers?.backfill ?? defaultBackfillHandler,
      refit: options.handlers?.refit ?? defaultRefitHandler
    };
  }

  enqueue(
    type: BackgroundJobType,
    payload: Record<string, unknown> = {},
    requestedBy?: string
  ): BackgroundJobRecord {
    const id = `job-${type}-${crypto.randomUUID().slice(0, 12)}`;
    const record: BackgroundJobRecord = {
      id,
      type,
      status: 'queued',
      requestedBy,
      payload,
      progress: {
        completed: 0,
        total: 1,
        message: 'Queued for background execution'
      },
      createdAt: new Date().toISOString()
    };

    if (this.jobs.size >= this.maxHistory) {
      const oldest = Array.from(this.jobs.values()).find(
        (j) => j.status === 'completed' || j.status === 'failed'
      );
      if (oldest) this.jobs.delete(oldest.id);
    }

    this.jobs.set(id, record);
    this.pendingIds.push(id);
    emitStructuredLog('info', 'job_enqueued', { meta: { jobId: id, type, requestedBy } });

    queueMicrotask(() => {
      this.pump();
    });

    return { ...record, progress: { ...record.progress } };
  }

  getJob(id: string): BackgroundJobRecord | null {
    const job = this.jobs.get(id);
    return job ? { ...job, progress: { ...job.progress } } : null;
  }

  listJobs(filter?: { status?: BackgroundJobStatus; type?: BackgroundJobType }): BackgroundJobRecord[] {
    let items = Array.from(this.jobs.values());
    if (filter?.status) items = items.filter((j) => j.status === filter.status);
    if (filter?.type) items = items.filter((j) => j.type === filter.type);
    return items
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((j) => ({ ...j, progress: { ...j.progress } }));
  }

  getStats() {
    let queued = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;
    for (const j of this.jobs.values()) {
      if (j.status === 'queued') queued++;
      else if (j.status === 'running') running++;
      else if (j.status === 'completed') completed++;
      else if (j.status === 'failed') failed++;
    }
    return {
      total: this.jobs.size,
      queued,
      running,
      completed,
      failed,
      concurrency: this.concurrency
    };
  }

  private pump(): void {
    while (this.activeCount < this.concurrency && this.pendingIds.length > 0) {
      const nextId = this.pendingIds.shift();
      if (!nextId) break;
      const job = this.jobs.get(nextId);
      if (!job || job.status !== 'queued') continue;
      this.activeCount++;
      void this.executeJob(job).finally(() => {
        this.activeCount--;
        this.pump();
      });
    }
  }

  private async executeJob(job: BackgroundJobRecord): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    job.progress.message = `Running ${job.type} job`;
    emitStructuredLog('info', 'job_started', { meta: { jobId: job.id, type: job.type } });

    const handler = this.handlers[job.type];
    try {
      const result = await handler(job.payload, {
        updateProgress: (completed, total, message) => {
          job.progress = {
            completed,
            total: Math.max(1, total),
            ...(message ? { message } : {})
          };
        }
      });
      job.status = 'completed';
      job.finishedAt = new Date().toISOString();
      job.result = result;
      if (job.progress.completed < job.progress.total) {
        job.progress.completed = job.progress.total;
      }
      emitStructuredLog('info', 'job_completed', {
        meta: { jobId: job.id, type: job.type, durationMs: Date.parse(job.finishedAt) - Date.parse(job.startedAt) }
      });
    } catch (err: any) {
      job.status = 'failed';
      job.finishedAt = new Date().toISOString();
      job.error = err?.message || 'Background job execution failed.';
      job.progress.message = job.error;
      emitStructuredLog('error', 'job_failed', {
        meta: { jobId: job.id, type: job.type, error: job.error }
      });
    }
  }
}

let defaultQueue: BackgroundJobQueue | null = null;

export function getBackgroundJobQueue(): BackgroundJobQueue {
  if (!defaultQueue) {
    defaultQueue = new BackgroundJobQueue();
  }
  return defaultQueue;
}

export function resetBackgroundJobQueue(options?: BackgroundJobQueueOptions): BackgroundJobQueue {
  defaultQueue = new BackgroundJobQueue(options);
  return defaultQueue;
}
