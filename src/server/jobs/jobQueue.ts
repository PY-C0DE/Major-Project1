/**
 * Durable Background Job Queue (BullMQ + Redis & Dev In-Process Fallback)
 *
 * - Production / `JOB_QUEUE_BACKEND=bullmq`: backed by BullMQ + Redis (`REDIS_URL`),
 *   persisting jobs across restarts with exponential retries and failed-job inspection/retry.
 * - Development fallback (`NODE_ENV !== 'production'` when BullMQ/Redis is not active):
 *   executes asynchronously in-process with retries and failed-job retention while emitting
 *   an explicit warning. Fails closed in `NODE_ENV=production` if Redis is not configured
 *   (unless `ALLOW_IN_PROCESS_JOB_QUEUE=true` is explicitly set).
 */

import crypto from 'node:crypto';
import { Queue, Worker, type Job as BullJob } from 'bullmq';
import Redis from 'ioredis';
import {
  BackgroundJobQueueStats,
  BackgroundJobRecord,
  BackgroundJobStatus,
  BackgroundJobType
} from '../../types';
import { TICKER_CATALOG } from '../../shared/tickerCatalog';
import {
  runAggregateModelEvaluation,
  buildModelAuditPayload,
  clearEvaluationCaches,
  runModelEvaluation,
  isModelEvaluationAvailable
} from '../math/evaluation';
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
          .map((t) => ({
            ticker: t,
            name: t,
            exchange: 'UNKNOWN',
            currency: 'USD',
            basePrice: 100,
            pe: 20,
            marketCap: 0,
            sector: 'Equity',
            aliases: []
          }))
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
  const targets =
    Array.isArray(payload.tickers) && payload.tickers.length > 0
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
  const targets =
    Array.isArray(payload.tickers) && payload.tickers.length > 0
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
        results.push({
          ticker,
          available: false,
          reason: fetched.source === 'synthetic' ? 'synthetic_data' : 'insufficient_history'
        });
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
  maxAttempts?: number;
  retryDelayMs?: number;
  handlers?: Partial<Record<BackgroundJobType, JobHandlerFn>>;
  warnOnFallback?: boolean;
}

export interface JobQueueDriver {
  readonly backend: 'bullmq' | 'in-memory';
  enqueueAsync(
    type: BackgroundJobType,
    payload?: Record<string, unknown>,
    requestedBy?: string
  ): Promise<BackgroundJobRecord>;
  getJobAsync(id: string): Promise<BackgroundJobRecord | null>;
  listJobsAsync(filter?: { status?: BackgroundJobStatus; type?: BackgroundJobType }): Promise<BackgroundJobRecord[]>;
  getFailedJobsAsync(type?: BackgroundJobType): Promise<BackgroundJobRecord[]>;
  retryJobAsync(id: string): Promise<BackgroundJobRecord | null>;
  getStatsAsync(): Promise<BackgroundJobQueueStats>;
  ping(): Promise<{ ok: boolean; backend: 'bullmq' | 'in-memory'; warning?: string }>;
  close(): Promise<void>;
}

export class BackgroundJobQueue implements JobQueueDriver {
  readonly backend = 'in-memory' as const;
  private readonly jobs = new Map<string, BackgroundJobRecord>();
  private readonly pendingIds: string[] = [];
  private readonly retryTimers = new Set<ReturnType<typeof setTimeout>>();
  private activeCount = 0;
  private readonly concurrency: number;
  private readonly maxHistory: number;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly handlers: Record<BackgroundJobType, JobHandlerFn>;

  constructor(options: BackgroundJobQueueOptions = {}) {
    this.concurrency = Math.max(1, options.concurrency ?? 2);
    this.maxHistory = Math.max(20, options.maxHistory ?? 200);
    this.maxAttempts = Math.max(
      1,
      options.maxAttempts ?? (Number(process.env.JOB_MAX_ATTEMPTS || '3') || 3)
    );
    this.retryDelayMs = Math.max(
      0,
      options.retryDelayMs ?? (Number(process.env.JOB_RETRY_DELAY_MS || '150') || 150)
    );
    this.handlers = {
      audit: options.handlers?.audit ?? defaultAuditHandler,
      backfill: options.handlers?.backfill ?? defaultBackfillHandler,
      refit: options.handlers?.refit ?? defaultRefitHandler
    };

    if (options.warnOnFallback) {
      const msg =
        '[AlphaQuant Queue] WARNING: Using in-process BackgroundJobQueue fallback (development only). Configure JOB_QUEUE_BACKEND=bullmq and REDIS_URL for durable execution.';
      console.warn(msg);
      emitStructuredLog('warn', 'job_queue_in_process_fallback', {
        meta: { backend: 'in-memory', env: process.env.NODE_ENV || 'development' }
      });
    }
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
      createdAt: new Date().toISOString(),
      attemptsMade: 0,
      maxAttempts: this.maxAttempts,
      backend: 'in-memory'
    };

    if (this.jobs.size >= this.maxHistory) {
      const oldest = Array.from(this.jobs.values()).find(
        (j) => j.status === 'completed' || j.status === 'failed'
      );
      if (oldest) this.jobs.delete(oldest.id);
    }

    this.jobs.set(id, record);
    this.pendingIds.push(id);
    emitStructuredLog('info', 'job_enqueued', {
      meta: { jobId: id, type, requestedBy, backend: 'in-memory' }
    });

    queueMicrotask(() => {
      this.pump();
    });

    return { ...record, progress: { ...record.progress } };
  }

  async enqueueAsync(
    type: BackgroundJobType,
    payload: Record<string, unknown> = {},
    requestedBy?: string
  ): Promise<BackgroundJobRecord> {
    return this.enqueue(type, payload, requestedBy);
  }

  getJob(id: string): BackgroundJobRecord | null {
    const job = this.jobs.get(id);
    return job ? { ...job, progress: { ...job.progress } } : null;
  }

  async getJobAsync(id: string): Promise<BackgroundJobRecord | null> {
    return this.getJob(id);
  }

  listJobs(filter?: { status?: BackgroundJobStatus; type?: BackgroundJobType }): BackgroundJobRecord[] {
    let items = Array.from(this.jobs.values());
    if (filter?.status) items = items.filter((j) => j.status === filter.status);
    if (filter?.type) items = items.filter((j) => j.type === filter.type);
    return items
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((j) => ({ ...j, progress: { ...j.progress } }));
  }

  async listJobsAsync(filter?: {
    status?: BackgroundJobStatus;
    type?: BackgroundJobType;
  }): Promise<BackgroundJobRecord[]> {
    return this.listJobs(filter);
  }

  getFailedJobs(type?: BackgroundJobType): BackgroundJobRecord[] {
    return this.listJobs({ status: 'failed', type });
  }

  async getFailedJobsAsync(type?: BackgroundJobType): Promise<BackgroundJobRecord[]> {
    return this.getFailedJobs(type);
  }

  retryJob(id: string): BackgroundJobRecord | null {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'failed') {
      return null;
    }
    job.status = 'queued';
    job.error = undefined;
    job.failedReason = undefined;
    job.failedAt = undefined;
    job.finishedAt = undefined;
    job.attemptsMade = 0;
    job.progress = {
      completed: 0,
      total: Math.max(1, job.progress.total),
      message: 'Re-queued manually after failure'
    };
    this.pendingIds.push(job.id);
    emitStructuredLog('info', 'job_retried_manually', {
      meta: { jobId: job.id, type: job.type, backend: 'in-memory' }
    });
    queueMicrotask(() => {
      this.pump();
    });
    return { ...job, progress: { ...job.progress } };
  }

  async retryJobAsync(id: string): Promise<BackgroundJobRecord | null> {
    return this.retryJob(id);
  }

  getStats(): BackgroundJobQueueStats {
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
      concurrency: this.concurrency,
      backend: 'in-memory'
    };
  }

  async getStatsAsync(): Promise<BackgroundJobQueueStats> {
    return this.getStats();
  }

  async ping(): Promise<{ ok: boolean; backend: 'in-memory'; warning?: string }> {
    return {
      ok: true,
      backend: 'in-memory',
      warning: 'In-process job queue fallback is active (non-durable dev mode).'
    };
  }

  async close(): Promise<void> {
    for (const timer of this.retryTimers) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();
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
    job.startedAt = job.startedAt ?? new Date().toISOString();
    job.attemptsMade = (job.attemptsMade ?? 0) + 1;
    job.progress.message = `Running ${job.type} job (attempt ${job.attemptsMade}/${this.maxAttempts})`;
    emitStructuredLog('info', 'job_started', {
      meta: { jobId: job.id, type: job.type, attempt: job.attemptsMade, maxAttempts: this.maxAttempts }
    });

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
      job.error = undefined;
      job.failedReason = undefined;
      if (job.progress.completed < job.progress.total) {
        job.progress.completed = job.progress.total;
      }
      emitStructuredLog('info', 'job_completed', {
        meta: {
          jobId: job.id,
          type: job.type,
          attemptsMade: job.attemptsMade,
          durationMs: Date.parse(job.finishedAt) - Date.parse(job.startedAt)
        }
      });
    } catch (err: any) {
      const errMsg = err?.message || 'Background job execution failed.';
      if ((job.attemptsMade ?? 1) < this.maxAttempts) {
        job.status = 'queued';
        job.error = errMsg;
        job.progress.message = `Attempt ${job.attemptsMade}/${this.maxAttempts} failed (${errMsg}); scheduling retry`;
        emitStructuredLog('warn', 'job_retry_scheduled', {
          meta: {
            jobId: job.id,
            type: job.type,
            attempt: job.attemptsMade,
            maxAttempts: this.maxAttempts,
            error: errMsg
          }
        });
        const delayMs = this.retryDelayMs * Math.pow(2, (job.attemptsMade ?? 1) - 1);
        const timer = setTimeout(() => {
          this.retryTimers.delete(timer);
          this.pendingIds.push(job.id);
          this.pump();
        }, delayMs);
        this.retryTimers.add(timer);
        return;
      }

      const failedAt = new Date().toISOString();
      job.status = 'failed';
      job.finishedAt = failedAt;
      job.failedAt = failedAt;
      job.error = errMsg;
      job.failedReason = errMsg;
      job.progress.message = errMsg;
      emitStructuredLog('error', 'job_failed', {
        meta: {
          jobId: job.id,
          type: job.type,
          attemptsMade: job.attemptsMade,
          error: errMsg
        }
      });
    }
  }
}

export interface BullMQJobQueueOptions {
  redisUrl: string;
  queueName?: string;
  concurrency?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
  handlers?: Partial<Record<BackgroundJobType, JobHandlerFn>>;
}

interface BullMQEnvelope {
  type: BackgroundJobType;
  payload: Record<string, unknown>;
  requestedBy?: string;
}

export class BullMQJobQueue implements JobQueueDriver {
  readonly backend = 'bullmq' as const;
  private readonly queueName: string;
  private readonly queueConnection: Redis;
  private readonly workerConnection: Redis;
  private readonly queue: Queue<BullMQEnvelope>;
  private readonly worker: Worker<BullMQEnvelope>;
  private readonly concurrency: number;
  private readonly maxAttempts: number;
  private readonly handlers: Record<BackgroundJobType, JobHandlerFn>;

  constructor(options: BullMQJobQueueOptions) {
    if (!options.redisUrl) {
      throw new Error('REDIS_URL is required to initialize BullMQJobQueue.');
    }
    this.queueName = options.queueName || 'alphaquant-jobs';
    this.concurrency = Math.max(1, options.concurrency ?? 2);
    this.maxAttempts = Math.max(
      1,
      options.maxAttempts ?? (Number(process.env.JOB_MAX_ATTEMPTS || '3') || 3)
    );
    const retryDelayMs = Math.max(
      100,
      options.retryDelayMs ?? (Number(process.env.JOB_RETRY_DELAY_MS || '1000') || 1000)
    );
    this.handlers = {
      audit: options.handlers?.audit ?? defaultAuditHandler,
      backfill: options.handlers?.backfill ?? defaultBackfillHandler,
      refit: options.handlers?.refit ?? defaultRefitHandler
    };

    this.queueConnection = new Redis(options.redisUrl, { maxRetriesPerRequest: null });
    this.workerConnection = new Redis(options.redisUrl, { maxRetriesPerRequest: null });

    this.queue = new Queue<BullMQEnvelope>(this.queueName, {
      connection: this.queueConnection as any,
      defaultJobOptions: {
        attempts: this.maxAttempts,
        backoff: { type: 'exponential', delay: retryDelayMs },
        removeOnComplete: { count: 200 },
        removeOnFail: false
      }
    });

    this.worker = new Worker<BullMQEnvelope>(
      this.queueName,
      async (bullJob) => {
        const jobType = (bullJob.data?.type || (bullJob.name as BackgroundJobType));
        const handler = this.handlers[jobType];
        if (!handler) {
          throw new Error(`No handler registered for job type "${jobType}"`);
        }
        return handler(bullJob.data?.payload || {}, {
          updateProgress: (completed, total, message) => {
            void bullJob.updateProgress({
              completed,
              total: Math.max(1, total),
              ...(message ? { message } : {})
            });
          }
        });
      },
      {
        connection: this.workerConnection as any,
        concurrency: this.concurrency
      }
    );

    this.worker.on('failed', (bullJob, err) => {
      emitStructuredLog('error', 'bullmq_job_failed', {
        meta: {
          jobId: bullJob?.id,
          type: bullJob?.name,
          attemptsMade: bullJob?.attemptsMade,
          error: err?.message
        }
      });
    });

    emitStructuredLog('info', 'job_queue_bullmq_initialized', {
      meta: { queueName: this.queueName, concurrency: this.concurrency, maxAttempts: this.maxAttempts }
    });
  }

  private async mapBullJob(job: BullJob<BullMQEnvelope>): Promise<BackgroundJobRecord> {
    const state = await job.getState();
    const status: BackgroundJobStatus =
      state === 'completed'
        ? 'completed'
        : state === 'failed'
          ? 'failed'
          : state === 'active'
            ? 'running'
            : 'queued';

    const rawProg = job.progress;
    const progress =
      rawProg && typeof rawProg === 'object'
        ? {
            completed: Number((rawProg as any).completed ?? (status === 'completed' ? 1 : 0)),
            total: Math.max(1, Number((rawProg as any).total ?? 1)),
            message: typeof (rawProg as any).message === 'string' ? (rawProg as any).message : undefined
          }
        : {
            completed: status === 'completed' ? 1 : 0,
            total: 1,
            message: status === 'failed' ? job.failedReason || 'Failed' : undefined
          };

    return {
      id: String(job.id),
      type: (job.data?.type || job.name) as BackgroundJobType,
      status,
      requestedBy: job.data?.requestedBy,
      payload: job.data?.payload || {},
      progress,
      createdAt: new Date(job.timestamp || Date.now()).toISOString(),
      startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : undefined,
      result: status === 'completed' ? job.returnvalue : undefined,
      error: status === 'failed' ? job.failedReason || 'Job failed' : undefined,
      failedReason: status === 'failed' ? job.failedReason || 'Job failed' : undefined,
      failedAt: status === 'failed' && job.finishedOn ? new Date(job.finishedOn).toISOString() : undefined,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts?.attempts ?? this.maxAttempts,
      backend: 'bullmq'
    };
  }

  async enqueueAsync(
    type: BackgroundJobType,
    payload: Record<string, unknown> = {},
    requestedBy?: string
  ): Promise<BackgroundJobRecord> {
    const id = `job-${type}-${crypto.randomUUID().slice(0, 12)}`;
    const job = await this.queue.add(
      type,
      { type, payload, requestedBy },
      { jobId: id }
    );
    return this.mapBullJob(job);
  }

  async getJobAsync(id: string): Promise<BackgroundJobRecord | null> {
    const job = await this.queue.getJob(id);
    if (!job) return null;
    return this.mapBullJob(job);
  }

  async listJobsAsync(filter?: {
    status?: BackgroundJobStatus;
    type?: BackgroundJobType;
  }): Promise<BackgroundJobRecord[]> {
    const jobs = await this.queue.getJobs(['waiting', 'active', 'delayed', 'completed', 'failed'], 0, 199);
    const mapped = await Promise.all(jobs.map((j) => this.mapBullJob(j)));
    return mapped
      .filter((j) => (!filter?.status || j.status === filter.status) && (!filter?.type || j.type === filter.type))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getFailedJobsAsync(type?: BackgroundJobType): Promise<BackgroundJobRecord[]> {
    const failed = await this.queue.getFailed(0, 199);
    const mapped = await Promise.all(failed.map((j) => this.mapBullJob(j)));
    return mapped
      .filter((j) => !type || j.type === type)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async retryJobAsync(id: string): Promise<BackgroundJobRecord | null> {
    const job = await this.queue.getJob(id);
    if (!job) return null;
    const state = await job.getState();
    if (state !== 'failed') return null;
    await job.retry();
    return this.mapBullJob(job);
  }

  async getStatsAsync(): Promise<BackgroundJobQueueStats> {
    const counts = await this.queue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');
    const queued = (counts.waiting ?? 0) + (counts.delayed ?? 0);
    const running = counts.active ?? 0;
    const completed = counts.completed ?? 0;
    const failed = counts.failed ?? 0;
    return {
      total: queued + running + completed + failed,
      queued,
      running,
      completed,
      failed,
      concurrency: this.concurrency,
      backend: 'bullmq'
    };
  }

  async ping(): Promise<{ ok: boolean; backend: 'bullmq'; warning?: string }> {
    const pong = await this.queueConnection.ping();
    return {
      ok: pong === 'PONG',
      backend: 'bullmq'
    };
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await Promise.all([
      this.queueConnection.quit().catch(() => {}),
      this.workerConnection.quit().catch(() => {})
    ]);
  }
}

export function createJobQueueFromEnv(options?: BackgroundJobQueueOptions): JobQueueDriver {
  const backendPref = process.env.JOB_QUEUE_BACKEND?.trim().toLowerCase();
  const redisUrl = process.env.REDIS_URL?.trim();
  const isProd = process.env.NODE_ENV === 'production';
  const allowInProcessInProd =
    process.env.ALLOW_IN_PROCESS_JOB_QUEUE?.trim().toLowerCase() === 'true';

  if (backendPref === 'bullmq') {
    if (!redisUrl) {
      throw new Error(
        'JOB_QUEUE_BACKEND=bullmq requires REDIS_URL to be configured.'
      );
    }
    return new BullMQJobQueue({
      redisUrl,
      concurrency: options?.concurrency,
      maxAttempts: options?.maxAttempts,
      retryDelayMs: options?.retryDelayMs,
      handlers: options?.handlers
    });
  }

  if (redisUrl && backendPref !== 'in-memory') {
    return new BullMQJobQueue({
      redisUrl,
      concurrency: options?.concurrency,
      maxAttempts: options?.maxAttempts,
      retryDelayMs: options?.retryDelayMs,
      handlers: options?.handlers
    });
  }

  if (isProd && !allowInProcessInProd) {
    throw new Error(
      'Durable BullMQ + Redis job queue is required in production (set JOB_QUEUE_BACKEND=bullmq and REDIS_URL, or explicitly override with ALLOW_IN_PROCESS_JOB_QUEUE=true).'
    );
  }

  return new BackgroundJobQueue({
    ...options,
    warnOnFallback: options?.warnOnFallback ?? process.env.NODE_ENV !== 'test'
  });
}

let defaultQueue: JobQueueDriver | null = null;

export function getBackgroundJobQueue(): JobQueueDriver {
  if (!defaultQueue) {
    defaultQueue = createJobQueueFromEnv();
  }
  return defaultQueue;
}

export function resetBackgroundJobQueue(options?: BackgroundJobQueueOptions): BackgroundJobQueue {
  if (defaultQueue) {
    void defaultQueue.close().catch(() => {});
  }
  const q = new BackgroundJobQueue(options);
  defaultQueue = q;
  return q;
}
