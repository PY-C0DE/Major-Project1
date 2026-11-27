/**
 * Global Exchange Calendars, Time Zone & DST Alignment Engine (Step 4 & Item 4)
 *
 * Driven strictly by the checked-in exported dataset `scripts/seeds/exchange_calendars.json`
 * (generated deterministically by `scripts/syncExchangeCalendars.ts` from
 * `gerrymanoim/exchange_calendars@4.13.3` [Apache-2.0], `rsheftel/pandas_market_calendars@5.7.0` [MIT],
 * and `date-holidays@3.39.2` [ISC] where 2027 Asian circulars are pending).
 *
 * Features:
 *   - IANA timezone & DST conversion via Intl.DateTimeFormat
 *   - Regular open/close hours AND exchange-specific half-day early closes (`earlyCloses`)
 *   - Explicit `"calendar_unknown"` state & `MissingExchangeHolidayDataError` when an
 *     exchange or year lacks verified holiday data (never silent weekdays-only fallback)
 *   - Causal exchange-local trading date alignment for news headlines & sentiment records
 */

import rawCalendarDataset from '../../../scripts/seeds/exchange_calendars.json';
import { DailySentimentRecord } from '../../types';
import { EXCHANGE_MIC_MAP, tryResolveExchangeMicInfo } from '../../shared/tickerMetadata';

export interface EarlyCloseSpec {
  closeMinutes: number;
  label: string;
}

export interface ExchangeCalendarDatasetRecord {
  mic: string;
  code: string;
  timezone: string;
  openMinutes: number;
  closeMinutes: number;
  minYear: number;
  maxYear: number;
  source: string;
  retrievedAt: string;
  tentative2027ViaDateHolidays?: boolean;
  holidays: Record<string, string[]>;
  earlyCloses: Record<string, EarlyCloseSpec>;
}

interface RawCalendarDatasetFile {
  metadata: {
    source: string;
    exchangeCalendarsVersion: string;
    pandasMarketCalendarsVersion: string;
    dateHolidaysVersion: string;
    retrievedAt: string;
    minYear: number;
    maxYear: number;
    exchangeCount: number;
    notes: string;
  };
  exchanges: Record<string, ExchangeCalendarDatasetRecord>;
}

const CALENDAR_DATASET = rawCalendarDataset as RawCalendarDatasetFile;

export const CALENDAR_SOURCE_METADATA = CALENDAR_DATASET.metadata;
export const HOLIDAY_DATA_RETRIEVED_AT = CALENDAR_DATASET.metadata.retrievedAt;

export interface ExchangeCalendarSpec {
  mic: string;
  code: string;
  timezone: string;
  openMinutes: number;
  closeMinutes: number;
}

export interface ExchangeHolidayCoverageSpec {
  minYear: number;
  maxYear: number;
  source: string;
  retrievedAt: string;
  tentative2027ViaDateHolidays?: boolean;
}

export class MissingExchangeHolidayDataError extends Error {
  readonly mic: string;
  readonly year: number;
  readonly supportedRange?: { minYear: number; maxYear: number };

  constructor(mic: string, year: number, supportedRange?: { minYear: number; maxYear: number }) {
    const rangeMsg = supportedRange
      ? ` (verified holiday coverage: ${supportedRange.minYear}–${supportedRange.maxYear})`
      : ' (calendar unknown — unsupported exchange MIC)';
    super(`No verified exchange holiday calendar data for ${mic} in year ${year}${rangeMsg}.`);
    this.name = 'MissingExchangeHolidayDataError';
    this.mic = mic;
    this.year = year;
    this.supportedRange = supportedRange;
  }
}

export const EXCHANGE_HOLIDAY_COVERAGE: Record<string, ExchangeHolidayCoverageSpec> = Object.fromEntries(
  Object.entries(CALENDAR_DATASET.exchanges).map(([mic, rec]) => [
    mic,
    {
      minYear: rec.minYear,
      maxYear: rec.maxYear,
      source: rec.source,
      retrievedAt: rec.retrievedAt,
      ...(rec.tentative2027ViaDateHolidays ? { tentative2027ViaDateHolidays: true } : {})
    }
  ])
);

const formatterCache = new Map<string, Intl.DateTimeFormat>();
const holidaySetCache = new Map<string, Set<string>>();

function getDateTimeFormatter(timezone: string): Intl.DateTimeFormat {
  let fmt = formatterCache.get(timezone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    formatterCache.set(timezone, fmt);
  }
  return fmt;
}

function getRecordByMic(mic: string): ExchangeCalendarDatasetRecord | null {
  return CALENDAR_DATASET.exchanges[mic.trim().toUpperCase()] ?? null;
}

/**
 * Resolves an exchange calendar ONLY when the ticker or exchange hint identifies a supported exchange.
 * Returns `null` (calendar unknown) when unknown — never silently defaults to weekdays-only or NASDAQ.
 */
export function resolveKnownExchangeCalendar(
  tickerOrExchange?: string,
  exchangeHint?: string
): ExchangeCalendarSpec | null {
  const clean = (tickerOrExchange || '').trim();
  const upper = clean.toUpperCase();

  if (CALENDAR_DATASET.exchanges[upper]) {
    const r = CALENDAR_DATASET.exchanges[upper];
    return {
      mic: r.mic,
      code: r.code,
      timezone: r.timezone,
      openMinutes: r.openMinutes,
      closeMinutes: r.closeMinutes
    };
  }

  if (!clean && !exchangeHint?.trim()) return null;

  const micInfo = tryResolveExchangeMicInfo(clean || (exchangeHint ?? ''), exchangeHint);
  if (!micInfo) return null;
  const rec = CALENDAR_DATASET.exchanges[micInfo.mic];
  if (!rec) return null;
  return {
    mic: rec.mic,
    code: rec.code,
    timezone: rec.timezone,
    openMinutes: rec.openMinutes,
    closeMinutes: rec.closeMinutes
  };
}

/**
 * Resolves exchange calendar spec or throws MissingExchangeHolidayDataError when unknown.
 */
export function resolveExchangeCalendar(tickerOrExchange?: string, exchangeHint?: string): ExchangeCalendarSpec {
  const known = resolveKnownExchangeCalendar(tickerOrExchange, exchangeHint);
  if (!known) {
    const label = (exchangeHint || tickerOrExchange || 'UNKNOWN').trim().toUpperCase();
    throw new MissingExchangeHolidayDataError(label, new Date().getUTCFullYear());
  }
  return known;
}

export interface ExchangeCalendarStatusInfo {
  calendarKnown: boolean;
  status: 'known' | 'calendar_unknown';
  mic: string | null;
  code: string | null;
  timezone: string | null;
  tentative2027ViaDateHolidays?: boolean;
  reason?: string;
}

export function getExchangeCalendarStatus(
  tickerOrExchange?: string,
  exchangeHint?: string,
  year?: number
): ExchangeCalendarStatusInfo {
  const spec = resolveKnownExchangeCalendar(tickerOrExchange, exchangeHint);
  if (!spec) {
    const requested = (exchangeHint || tickerOrExchange || 'UNKNOWN').trim();
    return {
      calendarKnown: false,
      status: 'calendar_unknown',
      mic: null,
      code: null,
      timezone: null,
      reason: `No verified exchange holiday calendar for "${requested}" (calendar unknown).`
    };
  }

  const targetYear = year ?? new Date().getUTCFullYear();
  if (!hasExchangeHolidayCoverage(spec.mic, targetYear)) {
    const cov = EXCHANGE_HOLIDAY_COVERAGE[spec.mic];
    return {
      calendarKnown: false,
      status: 'calendar_unknown',
      mic: spec.mic,
      code: spec.code,
      timezone: spec.timezone,
      reason: `Exchange ${spec.mic} lacks holiday data for ${targetYear} (verified range: ${cov?.minYear ?? '?'}–${cov?.maxYear ?? '?'}).`
    };
  }

  const cov = EXCHANGE_HOLIDAY_COVERAGE[spec.mic];
  return {
    calendarKnown: true,
    status: 'known',
    mic: spec.mic,
    code: spec.code,
    timezone: spec.timezone,
    ...(cov?.tentative2027ViaDateHolidays ? { tentative2027ViaDateHolidays: true } : {})
  };
}

function addCalendarDays(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0, 0));
  return dt.toISOString().slice(0, 10);
}

function getIsoDateWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0)).getUTCDay(); // 0=Sun..6=Sat
}

export function getExchangeHolidayMetadata(mic: string): ExchangeHolidayCoverageSpec | undefined {
  const upper = mic.trim().toUpperCase();
  return EXCHANGE_HOLIDAY_COVERAGE[upper];
}

export function hasExchangeHolidayCoverage(mic: string, year: number): boolean {
  const rec = getRecordByMic(mic);
  if (!rec) return false;
  if (!Number.isInteger(year) || year < rec.minYear || year > rec.maxYear) return false;
  const list = rec.holidays[String(year)];
  return Array.isArray(list) && list.length > 0;
}

export function getExchangeHolidaysForYear(mic: string, year: number): Set<string> {
  const upperMic = mic.trim().toUpperCase();
  const rec = getRecordByMic(upperMic);
  if (!rec || !Number.isInteger(year) || year < rec.minYear || year > rec.maxYear) {
    throw new MissingExchangeHolidayDataError(
      upperMic,
      year,
      rec ? { minYear: rec.minYear, maxYear: rec.maxYear } : undefined
    );
  }

  const list = rec.holidays[String(year)];
  if (!Array.isArray(list) || list.length === 0) {
    throw new MissingExchangeHolidayDataError(upperMic, year, { minYear: rec.minYear, maxYear: rec.maxYear });
  }

  const key = `${upperMic}:${year}`;
  const cached = holidaySetCache.get(key);
  if (cached) return cached;

  const set = new Set<string>(list);
  holidaySetCache.set(key, set);
  return set;
}

export function getExchangeEarlyCloseForDate(
  dateStr: string,
  tickerOrExchange?: string,
  exchangeHint?: string
): EarlyCloseSpec | null {
  const cleanDate = dateStr.slice(0, 10);
  const spec = resolveKnownExchangeCalendar(tickerOrExchange, exchangeHint);
  if (!spec) return null;
  const rec = getRecordByMic(spec.mic);
  return rec?.earlyCloses?.[cleanDate] ?? null;
}

export function getExchangeSessionCloseMinutes(
  dateStr: string,
  tickerOrExchange?: string,
  exchangeHint?: string
): { closeMinutes: number; isEarlyClose: boolean; earlyCloseLabel?: string } {
  const spec = resolveExchangeCalendar(tickerOrExchange, exchangeHint);
  const early = getExchangeEarlyCloseForDate(dateStr, spec.mic);
  if (early) {
    return {
      closeMinutes: early.closeMinutes,
      isEarlyClose: true,
      earlyCloseLabel: early.label
    };
  }
  return {
    closeMinutes: spec.closeMinutes,
    isEarlyClose: false
  };
}

export function isExchangeHoliday(dateStr: string, tickerOrExchange?: string, exchangeHint?: string): boolean {
  const cleanDate = dateStr.slice(0, 10);
  const year = Number(cleanDate.slice(0, 4));
  if (!Number.isFinite(year)) return false;
  const spec = resolveExchangeCalendar(tickerOrExchange, exchangeHint);
  return getExchangeHolidaysForYear(spec.mic, year).has(cleanDate);
}

export function isExchangeTradingDay(dateStr: string, tickerOrExchange?: string, exchangeHint?: string): boolean {
  const cleanDate = dateStr.slice(0, 10);
  const dow = getIsoDateWeekday(cleanDate);
  const year = Number(cleanDate.slice(0, 4));
  const spec = resolveExchangeCalendar(tickerOrExchange, exchangeHint);
  const holidays = getExchangeHolidaysForYear(spec.mic, year);
  if (dow === 0 || dow === 6) return false;
  return !holidays.has(cleanDate);
}

export function getNextTradingDay(dateStr: string, tickerOrExchange?: string, exchangeHint?: string): string {
  const spec = resolveExchangeCalendar(tickerOrExchange, exchangeHint);
  let candidate = addCalendarDays(dateStr.slice(0, 10), 1);
  for (let i = 0; i < 30; i++) {
    if (isExchangeTradingDay(candidate, spec.mic)) {
      return candidate;
    }
    candidate = addCalendarDays(candidate, 1);
  }
  return candidate;
}

export function getPreviousTradingDay(dateStr: string, tickerOrExchange?: string, exchangeHint?: string): string {
  const spec = resolveExchangeCalendar(tickerOrExchange, exchangeHint);
  let candidate = addCalendarDays(dateStr.slice(0, 10), -1);
  for (let i = 0; i < 30; i++) {
    if (isExchangeTradingDay(candidate, spec.mic)) {
      return candidate;
    }
    candidate = addCalendarDays(candidate, -1);
  }
  return candidate;
}

export interface ExchangeLocalDateTime {
  dateStr: string;
  weekday: string;
  isWeekend: boolean;
  hour: number;
  minute: number;
  minutesSinceMidnight: number;
  timezone: string;
  mic: string;
}

/**
 * Converts a UTC Date / ISO timestamp / epoch ms into local date & clock time in the exchange's IANA timezone.
 * Properly tracks Daylight Saving Time (EST<->EDT, CET<->CEST, GMT<->BST, etc.).
 */
export function getExchangeLocalDateTime(
  timestamp: Date | string | number,
  tickerOrExchange?: string,
  exchangeHint?: string
): ExchangeLocalDateTime {
  const spec = resolveExchangeCalendar(tickerOrExchange, exchangeHint);
  const dt = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(dt.getTime())) {
    throw new Error(`Invalid timestamp supplied to getExchangeLocalDateTime: ${String(timestamp)}`);
  }

  const fmt = getDateTimeFormatter(spec.timezone);
  const parts = fmt.formatToParts(dt);
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value || '';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const weekday = getPart('weekday') || 'Mon';
  let hour = Number(getPart('hour') || '0');
  if (hour === 24) hour = 0;
  const minute = Number(getPart('minute') || '0');

  const dateStr = `${year}-${month}-${day}`;
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';

  return {
    dateStr,
    weekday,
    isWeekend,
    hour,
    minute,
    minutesSinceMidnight: hour * 60 + minute,
    timezone: spec.timezone,
    mic: spec.mic
  };
}

/**
 * Formats a timestamp (epoch ms or ISO string or Date) as YYYY-MM-DD in the exchange's native IANA timezone.
 */
export function formatTimestampInExchangeTimezone(
  timestamp: Date | string | number,
  tickerOrExchange?: string,
  exchangeHint?: string
): string {
  return getExchangeLocalDateTime(timestamp, tickerOrExchange, exchangeHint).dateStr;
}

export interface AlignedArticleTradingDate {
  mic: string;
  timezone: string;
  exchangeLocalDate: string;
  exchangeLocalHour: number;
  exchangeLocalMinute: number;
  tradingDate: string;
  rolledForward: boolean;
  isEarlyClose?: boolean;
  effectiveCloseMinutes?: number;
  rollReason?: 'weekend' | 'holiday' | 'after_close' | 'early_close';
}

/**
 * Aligns an article publication timestamp (`publishedAt`) onto an exchange-local trading date:
 * - Converts UTC timestamp to exchange-local wall time (DST-aware).
 * - If local date is a weekend or exchange holiday, advances to the next open trading session.
 * - If `respectMarketClose` (default true) and local time >= effective session close (including half-day
 *   early close schedules), advances to the next open trading session to avoid same-day lookahead.
 */
export function alignTimestampToTradingDate(
  publishedAt: Date | string | number,
  tickerOrExchange?: string,
  options?: { exchangeHint?: string; respectMarketClose?: boolean }
): AlignedArticleTradingDate {
  const spec = resolveExchangeCalendar(tickerOrExchange, options?.exchangeHint);
  const local = getExchangeLocalDateTime(publishedAt, spec.mic);
  const respectClose = options?.respectMarketClose !== false;
  const sessionClose = getExchangeSessionCloseMinutes(local.dateStr, spec.mic);

  if (local.isWeekend) {
    return {
      mic: spec.mic,
      timezone: spec.timezone,
      exchangeLocalDate: local.dateStr,
      exchangeLocalHour: local.hour,
      exchangeLocalMinute: local.minute,
      tradingDate: getNextTradingDay(local.dateStr, spec.mic),
      rolledForward: true,
      rollReason: 'weekend'
    };
  }

  if (isExchangeHoliday(local.dateStr, spec.mic)) {
    return {
      mic: spec.mic,
      timezone: spec.timezone,
      exchangeLocalDate: local.dateStr,
      exchangeLocalHour: local.hour,
      exchangeLocalMinute: local.minute,
      tradingDate: getNextTradingDay(local.dateStr, spec.mic),
      rolledForward: true,
      rollReason: 'holiday'
    };
  }

  if (respectClose && local.minutesSinceMidnight >= sessionClose.closeMinutes) {
    return {
      mic: spec.mic,
      timezone: spec.timezone,
      exchangeLocalDate: local.dateStr,
      exchangeLocalHour: local.hour,
      exchangeLocalMinute: local.minute,
      tradingDate: getNextTradingDay(local.dateStr, spec.mic),
      rolledForward: true,
      isEarlyClose: sessionClose.isEarlyClose,
      effectiveCloseMinutes: sessionClose.closeMinutes,
      rollReason: sessionClose.isEarlyClose ? 'early_close' : 'after_close'
    };
  }

  return {
    mic: spec.mic,
    timezone: spec.timezone,
    exchangeLocalDate: local.dateStr,
    exchangeLocalHour: local.hour,
    exchangeLocalMinute: local.minute,
    tradingDate: local.dateStr,
    rolledForward: false,
    isEarlyClose: sessionClose.isEarlyClose,
    effectiveCloseMinutes: sessionClose.closeMinutes
  };
}

/**
 * Remaps stored daily sentiment records onto the exchange's trading days before
 * strictly causal model feature construction or lag correlation alignment:
 * any record dated on a weekend or exchange holiday is merged onto the next trading day
 * (credibility/count-weighted) so holiday/weekend news takes effect at the next open session.
 */
export function alignSentimentRecordsToExchangeCalendar(
  sentimentRecords: DailySentimentRecord[],
  tickerOrExchange?: string,
  exchangeHint?: string
): DailySentimentRecord[] {
  if (!sentimentRecords || sentimentRecords.length === 0) return [];
  const spec = resolveExchangeCalendar(tickerOrExchange, exchangeHint);
  const grouped = new Map<
    string,
    {
      ticker: string;
      weightedSum: number;
      totalArticles: number;
      sources: Set<string>;
      languages: Set<string>;
      modelIds: Set<string>;
      modelVersions: Set<string>;
      updatedAt: string;
    }
  >();

  for (const rec of sentimentRecords) {
    if (
      !rec ||
      rec.articleCount <= 0 ||
      !Number.isFinite(rec.credibilityWeightedNetScore) ||
      rec.sentimentSource === 'unsupported_language'
    ) {
      continue;
    }
    const rawDate = rec.date.slice(0, 10);
    const tradingDate = isExchangeTradingDay(rawDate, spec.mic)
      ? rawDate
      : getNextTradingDay(rawDate, spec.mic);

    const existing = grouped.get(tradingDate);
    if (existing) {
      existing.weightedSum += rec.credibilityWeightedNetScore * rec.articleCount;
      existing.totalArticles += rec.articleCount;
      existing.sources.add(rec.sentimentSource);
      if (rec.language) existing.languages.add(rec.language);
      if (rec.modelId) existing.modelIds.add(rec.modelId);
      if (rec.modelVersion) existing.modelVersions.add(rec.modelVersion);
      if (rec.updatedAt > existing.updatedAt) existing.updatedAt = rec.updatedAt;
    } else {
      grouped.set(tradingDate, {
        ticker: rec.ticker,
        weightedSum: rec.credibilityWeightedNetScore * rec.articleCount,
        totalArticles: rec.articleCount,
        sources: new Set([rec.sentimentSource]),
        languages: new Set(rec.language ? [rec.language] : ['en']),
        modelIds: new Set(rec.modelId ? [rec.modelId] : []),
        modelVersions: new Set(rec.modelVersion ? [rec.modelVersion] : []),
        updatedAt: rec.updatedAt
      });
    }
  }

  const out: DailySentimentRecord[] = [];
  for (const [date, agg] of grouped.entries()) {
    const src: DailySentimentRecord['sentimentSource'] =
      agg.sources.size > 1 || agg.sources.has('mixed')
        ? 'mixed'
        : agg.sources.has('finbert')
          ? 'finbert'
          : agg.sources.has('multilingual-transformer')
            ? 'multilingual-transformer'
            : agg.sources.has('multilingual-lexicon')
              ? 'multilingual-lexicon'
              : 'lexicon';
    const language =
      agg.languages.size === 1 ? Array.from(agg.languages)[0] : agg.languages.size > 1 ? 'mixed' : 'en';
    const modelId =
      agg.modelIds.size === 1
        ? Array.from(agg.modelIds)[0]
        : agg.modelIds.size > 1
          ? Array.from(agg.modelIds).sort().join('+')
          : src === 'finbert'
            ? 'Xenova/finbert'
            : src === 'multilingual-transformer'
              ? 'Xenova/distilbert-base-multilingual-cased-sentiments-student'
              : src === 'multilingual-lexicon'
                ? 'multilingual-lexicon-v1'
                : 'keyword-lexicon-fallback';
    const modelVersion =
      agg.modelVersions.size === 1
        ? Array.from(agg.modelVersions)[0]
        : agg.modelVersions.size > 1
          ? Array.from(agg.modelVersions).sort().join('+')
          : '1.0.0';
    out.push({
      ticker: agg.ticker,
      date,
      credibilityWeightedNetScore: Number(Math.max(-1, Math.min(1, agg.weightedSum / agg.totalArticles)).toFixed(4)),
      articleCount: agg.totalArticles,
      sentimentSource: src,
      language,
      modelId,
      modelVersion,
      updatedAt: agg.updatedAt
    });
  }

  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}
