/**
 * Structured JSON Request & Event Logger Middleware (Step 6)
 *
 * Emits newline-delimited structured JSON records with requestId, method, path,
 * HTTP status code, latencyMs, and user/provider context without logging secrets.
 */

import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export type LogLevel = 'info' | 'warn' | 'error';

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  latencyMs?: number;
  ip?: string;
  userAgent?: string;
  userId?: string;
  meta?: Record<string, unknown>;
}

export type StructuredLogSink = (entry: StructuredLogEntry) => void;

let customLogSink: StructuredLogSink | null = null;

export function setStructuredLogSink(sink: StructuredLogSink | null): void {
  customLogSink = sink;
}

export function emitStructuredLog(
  level: LogLevel,
  event: string,
  fields: Omit<StructuredLogEntry, 'timestamp' | 'level' | 'event'> = {}
): StructuredLogEntry {
  const entry: StructuredLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields
  };

  if (customLogSink) {
    customLogSink(entry);
    return entry;
  }

  if (process.env.NODE_ENV === 'test') {
    return entry;
  }

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
  return entry;
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers['x-request-id'];
  const requestId =
    typeof incomingId === 'string' && incomingId.trim().length > 0 && incomingId.trim().length <= 64
      ? incomingId.trim()
      : crypto.randomUUID();

  res.setHeader('X-Request-Id', requestId);
  const startNs = process.hrtime.bigint();

  res.on('finish', () => {
    if (!req.path.startsWith('/api') && req.path !== '/healthz' && req.path !== '/readyz') {
      return;
    }
    const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
    const statusCode = res.statusCode;
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const userId = (req as Request & { user?: { id?: string } }).user?.id;

    emitStructuredLog(level, 'http_request', {
      requestId,
      method: req.method,
      path: req.originalUrl?.split('?')[0] || req.path,
      statusCode,
      latencyMs: Number(elapsedMs.toFixed(2)),
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 120) : undefined,
      ...(userId ? { userId } : {})
    });
  });

  next();
}
