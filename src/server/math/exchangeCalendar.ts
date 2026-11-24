/**
 * Global Exchange Calendars, Time Zone & DST Alignment Engine (Step 4)
 *
 * Maps global tickers & ISO 10383 MIC exchange codes to:
 *   - IANA timezones (full DST transition handling via Intl.DateTimeFormat)
 *   - Regular market session open/close hours
 *   - Exchange holiday calendars (fixed, Easter/Good Friday computus, weekday-rule, & lunar dates)
 *   - Causal exchange-local trading date alignment for news articles & daily sentiment records
 */

import { DailySentimentRecord } from '../../types';
import { resolveExchangeMicInfo } from '../../shared/tickerMetadata';

export interface ExchangeCalendarSpec {
  mic: string;
  code: string;
  timezone: string;
  openMinutes: number;
  closeMinutes: number;
}

const MIC_CALENDAR_SPECS: Record<string, ExchangeCalendarSpec> = {
  XNSE: { mic: 'XNSE', code: 'NSE', timezone: 'Asia/Kolkata', openMinutes: 9 * 60 + 15, closeMinutes: 15 * 60 + 30 },
  XBOM: { mic: 'XBOM', code: 'BSE', timezone: 'Asia/Kolkata', openMinutes: 9 * 60 + 15, closeMinutes: 15 * 60 + 30 },
  XNYS: { mic: 'XNYS', code: 'NYSE', timezone: 'America/New_York', openMinutes: 9 * 60 + 30, closeMinutes: 16 * 60 },
  XNAS: { mic: 'XNAS', code: 'NASDAQ', timezone: 'America/New_York', openMinutes: 9 * 60 + 30, closeMinutes: 16 * 60 },
  XKRX: { mic: 'XKRX', code: 'KRX', timezone: 'Asia/Seoul', openMinutes: 9 * 60, closeMinutes: 15 * 60 + 30 },
  XKOS: { mic: 'XKOS', code: 'KOSDAQ', timezone: 'Asia/Seoul', openMinutes: 9 * 60, closeMinutes: 15 * 60 + 30 },
  XETR: { mic: 'XETR', code: 'XETRA', timezone: 'Europe/Berlin', openMinutes: 9 * 60, closeMinutes: 17 * 60 + 30 },
  XLON: { mic: 'XLON', code: 'LSE', timezone: 'Europe/London', openMinutes: 8 * 60, closeMinutes: 16 * 60 + 30 },
  XPAR: { mic: 'XPAR', code: 'EURONEXT', timezone: 'Europe/Paris', openMinutes: 9 * 60, closeMinutes: 17 * 60 + 30 },
  XAMS: { mic: 'XAMS', code: 'EURONEXT', timezone: 'Europe/Amsterdam', openMinutes: 9 * 60, closeMinutes: 17 * 60 + 30 },
  XBRU: { mic: 'XBRU', code: 'EURONEXT', timezone: 'Europe/Brussels', openMinutes: 9 * 60, closeMinutes: 17 * 60 + 30 },
  XSWX: { mic: 'XSWX', code: 'SIX', timezone: 'Europe/Zurich', openMinutes: 9 * 60, closeMinutes: 17 * 60 + 30 },
  XMAD: { mic: 'XMAD', code: 'BME', timezone: 'Europe/Madrid', openMinutes: 9 * 60, closeMinutes: 17 * 60 + 30 },
  XMIL: { mic: 'XMIL', code: 'MIL', timezone: 'Europe/Rome', openMinutes: 9 * 60, closeMinutes: 17 * 60 + 30 },
  XCSE: { mic: 'XCSE', code: 'NASDAQ NORDIC', timezone: 'Europe/Copenhagen', openMinutes: 9 * 60, closeMinutes: 17 * 60 },
  XSTO: { mic: 'XSTO', code: 'NASDAQ NORDIC', timezone: 'Europe/Stockholm', openMinutes: 9 * 60, closeMinutes: 17 * 60 + 30 },
  XHEL: { mic: 'XHEL', code: 'NASDAQ NORDIC', timezone: 'Europe/Helsinki', openMinutes: 10 * 60, closeMinutes: 18 * 60 + 30 },
  XOSL: { mic: 'XOSL', code: 'OSLO', timezone: 'Europe/Oslo', openMinutes: 9 * 60, closeMinutes: 16 * 60 + 20 },
  XTKS: { mic: 'XTKS', code: 'TSE', timezone: 'Asia/Tokyo', openMinutes: 9 * 60, closeMinutes: 15 * 60 + 30 },
  XHKG: { mic: 'XHKG', code: 'HKEX', timezone: 'Asia/Hong_Kong', openMinutes: 9 * 60 + 30, closeMinutes: 16 * 60 },
  XSHG: { mic: 'XSHG', code: 'SSE', timezone: 'Asia/Shanghai', openMinutes: 9 * 60 + 30, closeMinutes: 15 * 60 },
  XSHE: { mic: 'XSHE', code: 'SZSE', timezone: 'Asia/Shanghai', openMinutes: 9 * 60 + 30, closeMinutes: 15 * 60 },
  XTAI: { mic: 'XTAI', code: 'TWSE', timezone: 'Asia/Taipei', openMinutes: 9 * 60, closeMinutes: 13 * 60 + 30 },
  XTSE: { mic: 'XTSE', code: 'TSX', timezone: 'America/Toronto', openMinutes: 9 * 60 + 30, closeMinutes: 16 * 60 },
  XASX: { mic: 'XASX', code: 'ASX', timezone: 'Australia/Sydney', openMinutes: 10 * 60, closeMinutes: 16 * 60 },
  XSES: { mic: 'XSES', code: 'SGX', timezone: 'Asia/Singapore', openMinutes: 9 * 60, closeMinutes: 17 * 60 },
  BVMF: { mic: 'BVMF', code: 'B3', timezone: 'America/Sao_Paulo', openMinutes: 10 * 60, closeMinutes: 17 * 60 },
  XJSE: { mic: 'XJSE', code: 'JSE', timezone: 'Africa/Johannesburg', openMinutes: 9 * 60, closeMinutes: 17 * 60 },
  XMEX: { mic: 'XMEX', code: 'BMV', timezone: 'America/Mexico_City', openMinutes: 8 * 60 + 30, closeMinutes: 15 * 60 },
  XIDX: { mic: 'XIDX', code: 'IDX', timezone: 'Asia/Jakarta', openMinutes: 9 * 60, closeMinutes: 16 * 60 }
};

const KNOWN_EXCHANGE_KEYS = new Set([
  ...Object.keys(MIC_CALENDAR_SPECS),
  'NSE',
  'BSE',
  'NYSE',
  'NASDAQ',
  'KRX',
  'KOSDAQ',
  'XETRA',
  'LSE',
  'EURONEXT',
  'SIX',
  'BME',
  'MIL',
  'NASDAQ NORDIC',
  'OSLO',
  'TSE',
  'HKEX',
  'SSE',
  'SZSE',
  'TWSE',
  'TSX',
  'ASX',
  'SGX',
  'B3',
  'JSE',
  'BMV',
  'IDX'
]);

const formatterCache = new Map<string, Intl.DateTimeFormat>();

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

export function resolveExchangeCalendar(tickerOrExchange?: string, exchangeHint?: string): ExchangeCalendarSpec {
  const clean = (tickerOrExchange || '').trim();
  const upper = clean.toUpperCase();

  if (MIC_CALENDAR_SPECS[upper]) {
    return MIC_CALENDAR_SPECS[upper];
  }

  if (KNOWN_EXCHANGE_KEYS.has(upper) && !upper.includes('.')) {
    const info = resolveExchangeMicInfo(upper, upper);
    return MIC_CALENDAR_SPECS[info.mic] || MIC_CALENDAR_SPECS.XNAS;
  }

  const info = resolveExchangeMicInfo(clean || 'AAPL', exchangeHint);
  return MIC_CALENDAR_SPECS[info.mic] || MIC_CALENDAR_SPECS.XNAS;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatIsoDateUtc(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
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

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): string {
  const firstDow = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0, 0)).getUTCDay();
  const offset = (weekday - firstDow + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  return formatIsoDateUtc(year, month, day);
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): string {
  const lastDate = new Date(Date.UTC(year, month, 0, 12, 0, 0, 0));
  const lastDay = lastDate.getUTCDate();
  const lastDow = lastDate.getUTCDay();
  const back = (lastDow - weekday + 7) % 7;
  return formatIsoDateUtc(year, month, lastDay - back);
}

/**
 * Anonymous Gregorian Computus for Easter Sunday (year >= 1583).
 */
export function computeEasterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return formatIsoDateUtc(year, month, day);
}

function observeWeekendUsNyse(dateStr: string, observeSaturdayOnFriday: boolean): string {
  const dow = getIsoDateWeekday(dateStr);
  if (dow === 6 && observeSaturdayOnFriday) return addCalendarDays(dateStr, -1);
  if (dow === 0) return addCalendarDays(dateStr, 1);
  return dateStr;
}

function observeSundayToMonday(dateStr: string): string {
  const dow = getIsoDateWeekday(dateStr);
  if (dow === 0) return addCalendarDays(dateStr, 1);
  return dateStr;
}

function observeSubstituteMondayIfWeekend(dateStr: string): string {
  const dow = getIsoDateWeekday(dateStr);
  if (dow === 6) return addCalendarDays(dateStr, 2);
  if (dow === 0) return addCalendarDays(dateStr, 1);
  return dateStr;
}

const NSE_YEAR_SPECIFIC_HOLIDAYS: Record<number, string[]> = {
  2024: ['2024-01-22', '2024-03-08', '2024-03-25', '2024-04-11', '2024-04-17', '2024-05-20', '2024-06-17', '2024-07-17', '2024-11-01', '2024-11-15'],
  2025: ['2025-02-26', '2025-03-14', '2025-03-31', '2025-04-10', '2025-04-14', '2025-08-27', '2025-10-21', '2025-10-22', '2025-11-05'],
  2026: ['2026-03-03', '2026-03-20', '2026-03-26', '2026-03-31', '2026-04-14', '2026-05-28', '2026-06-26', '2026-09-14', '2026-10-20', '2026-11-10', '2026-11-24'],
  2027: ['2027-03-22', '2027-04-14', '2027-10-29']
};

const KRX_YEAR_SPECIFIC_HOLIDAYS: Record<number, string[]> = {
  2024: ['2024-02-09', '2024-02-12', '2024-04-10', '2024-05-15', '2024-09-16', '2024-09-17', '2024-09-18', '2024-10-01'],
  2025: ['2025-01-27', '2025-01-28', '2025-01-29', '2025-01-30', '2025-05-06', '2025-06-03', '2025-10-06', '2025-10-07', '2025-10-08'],
  2026: ['2026-02-16', '2026-02-17', '2026-02-18', '2026-05-25', '2026-06-03', '2026-09-24', '2026-09-25'],
  2027: ['2027-02-08', '2027-02-09', '2027-05-13', '2027-09-14', '2027-09-15', '2027-09-16']
};

const holidaySetCache = new Map<string, Set<string>>();

export function getExchangeHolidaysForYear(mic: string, year: number): Set<string> {
  const key = `${mic}:${year}`;
  const cached = holidaySetCache.get(key);
  if (cached) return cached;

  const holidays = new Set<string>();
  const easter = computeEasterSunday(year);
  const goodFriday = addCalendarDays(easter, -2);
  const easterMonday = addCalendarDays(easter, 1);

  if (mic === 'XNYS' || mic === 'XNAS') {
    // NYSE Rule 7.2: Sun holidays observed Mon; Sat holidays generally observed Fri EXCEPT Jan 1 when Sat
    holidays.add(observeWeekendUsNyse(formatIsoDateUtc(year, 1, 1), false)); // New Year's Day
    holidays.add(nthWeekdayOfMonth(year, 1, 1, 3)); // MLK Jr. Day
    holidays.add(nthWeekdayOfMonth(year, 2, 1, 3)); // Presidents' Day
    holidays.add(goodFriday);
    holidays.add(lastWeekdayOfMonth(year, 5, 1)); // Memorial Day
    if (year >= 2022) {
      holidays.add(observeWeekendUsNyse(formatIsoDateUtc(year, 6, 19), true)); // Juneteenth
    }
    holidays.add(observeWeekendUsNyse(formatIsoDateUtc(year, 7, 4), true)); // Independence Day
    holidays.add(nthWeekdayOfMonth(year, 9, 1, 1)); // Labor Day
    holidays.add(nthWeekdayOfMonth(year, 11, 4, 4)); // Thanksgiving
    holidays.add(observeWeekendUsNyse(formatIsoDateUtc(year, 12, 25), true)); // Christmas
    if (year === 2025) holidays.add('2025-01-09');
  } else if (mic === 'XNSE' || mic === 'XBOM') {
    holidays.add(formatIsoDateUtc(year, 1, 26)); // Republic Day
    holidays.add(goodFriday);
    holidays.add(formatIsoDateUtc(year, 5, 1)); // Maharashtra Day
    holidays.add(formatIsoDateUtc(year, 8, 15)); // Independence Day
    holidays.add(formatIsoDateUtc(year, 10, 2)); // Gandhi Jayanti
    holidays.add(formatIsoDateUtc(year, 12, 25)); // Christmas
    for (const d of NSE_YEAR_SPECIFIC_HOLIDAYS[year] || []) {
      holidays.add(d);
    }
  } else if (mic === 'XKRX' || mic === 'XKOS') {
    holidays.add(formatIsoDateUtc(year, 1, 1)); // New Year's Day
    holidays.add(observeSubstituteMondayIfWeekend(formatIsoDateUtc(year, 3, 1))); // Independence Movement Day
    holidays.add(observeSubstituteMondayIfWeekend(formatIsoDateUtc(year, 5, 5))); // Children's Day
    holidays.add(formatIsoDateUtc(year, 6, 6)); // Memorial Day
    holidays.add(observeSubstituteMondayIfWeekend(formatIsoDateUtc(year, 8, 15))); // Liberation Day
    holidays.add(observeSubstituteMondayIfWeekend(formatIsoDateUtc(year, 10, 3))); // National Foundation Day
    holidays.add(observeSubstituteMondayIfWeekend(formatIsoDateUtc(year, 10, 9))); // Hangul Day
    holidays.add(formatIsoDateUtc(year, 12, 25)); // Christmas Day
    holidays.add(formatIsoDateUtc(year, 12, 31)); // KRX Year-End Market Closure
    for (const d of KRX_YEAR_SPECIFIC_HOLIDAYS[year] || []) {
      holidays.add(d);
    }
  } else if (mic === 'XLON') {
    holidays.add(observeSubstituteMondayIfWeekend(formatIsoDateUtc(year, 1, 1)));
    holidays.add(goodFriday);
    holidays.add(easterMonday);
    holidays.add(nthWeekdayOfMonth(year, 5, 1, 1)); // Early May Bank Holiday
    holidays.add(lastWeekdayOfMonth(year, 5, 1)); // Spring Bank Holiday
    holidays.add(lastWeekdayOfMonth(year, 8, 1)); // Summer Bank Holiday
    const xmas = formatIsoDateUtc(year, 12, 25);
    const boxing = formatIsoDateUtc(year, 12, 26);
    const xmasDow = getIsoDateWeekday(xmas);
    if (xmasDow === 5) {
      holidays.add(xmas);
      holidays.add(addCalendarDays(boxing, 2)); // Mon Dec 28
    } else if (xmasDow === 6) {
      holidays.add(addCalendarDays(xmas, 2)); // Mon Dec 27
      holidays.add(addCalendarDays(xmas, 3)); // Tue Dec 28
    } else if (xmasDow === 0) {
      holidays.add(addCalendarDays(xmas, 1)); // Mon Dec 26
      holidays.add(addCalendarDays(xmas, 2)); // Tue Dec 27
    } else {
      holidays.add(xmas);
      holidays.add(boxing);
    }
  } else if (mic === 'XETR') {
    holidays.add(formatIsoDateUtc(year, 1, 1));
    holidays.add(goodFriday);
    holidays.add(easterMonday);
    holidays.add(formatIsoDateUtc(year, 5, 1)); // Labour Day
    holidays.add(formatIsoDateUtc(year, 12, 24)); // Christmas Eve
    holidays.add(formatIsoDateUtc(year, 12, 25)); // Christmas Day
    holidays.add(formatIsoDateUtc(year, 12, 26)); // St. Stephen's Day
    holidays.add(formatIsoDateUtc(year, 12, 31)); // New Year's Eve
  } else if (
    mic === 'XPAR' ||
    mic === 'XAMS' ||
    mic === 'XBRU' ||
    mic === 'XSWX' ||
    mic === 'XMAD' ||
    mic === 'XMIL' ||
    mic === 'XCSE' ||
    mic === 'XSTO' ||
    mic === 'XOSL' ||
    mic === 'XHEL'
  ) {
    holidays.add(formatIsoDateUtc(year, 1, 1));
    holidays.add(goodFriday);
    holidays.add(easterMonday);
    if (mic !== 'XCSE') {
      holidays.add(formatIsoDateUtc(year, 5, 1));
    }
    holidays.add(formatIsoDateUtc(year, 12, 25));
    if (mic !== 'XPAR' && mic !== 'XAMS') {
      holidays.add(formatIsoDateUtc(year, 12, 26));
    }
  } else if (mic === 'XTKS') {
    holidays.add(formatIsoDateUtc(year, 1, 1));
    holidays.add(formatIsoDateUtc(year, 1, 2));
    holidays.add(formatIsoDateUtc(year, 1, 3));
    holidays.add(nthWeekdayOfMonth(year, 1, 1, 2)); // Coming of Age Day
    holidays.add(observeSundayToMonday(formatIsoDateUtc(year, 2, 11)));
    holidays.add(observeSundayToMonday(formatIsoDateUtc(year, 2, 23)));
    holidays.add(observeSundayToMonday(formatIsoDateUtc(year, 4, 29)));
    holidays.add(observeSundayToMonday(formatIsoDateUtc(year, 5, 3)));
    holidays.add(observeSundayToMonday(formatIsoDateUtc(year, 5, 4)));
    holidays.add(observeSundayToMonday(formatIsoDateUtc(year, 5, 5)));
    holidays.add(nthWeekdayOfMonth(year, 7, 1, 3));
    holidays.add(observeSundayToMonday(formatIsoDateUtc(year, 8, 11)));
    holidays.add(nthWeekdayOfMonth(year, 9, 1, 3));
    holidays.add(nthWeekdayOfMonth(year, 10, 1, 2));
    holidays.add(observeSundayToMonday(formatIsoDateUtc(year, 11, 3)));
    holidays.add(observeSundayToMonday(formatIsoDateUtc(year, 11, 23)));
    holidays.add(formatIsoDateUtc(year, 12, 31));
  } else if (mic === 'XTSE') {
    holidays.add(observeSubstituteMondayIfWeekend(formatIsoDateUtc(year, 1, 1)));
    holidays.add(nthWeekdayOfMonth(year, 2, 1, 3)); // Family Day
    holidays.add(goodFriday);
    holidays.add(formatIsoDateUtc(year, 7, 1)); // Canada Day
    holidays.add(nthWeekdayOfMonth(year, 9, 1, 1)); // Labour Day
    holidays.add(nthWeekdayOfMonth(year, 10, 1, 2)); // Canadian Thanksgiving
    holidays.add(observeSubstituteMondayIfWeekend(formatIsoDateUtc(year, 12, 25)));
    holidays.add(observeSubstituteMondayIfWeekend(formatIsoDateUtc(year, 12, 26)));
  } else if (mic === 'XHKG' || mic === 'XSES' || mic === 'XASX' || mic === 'XJSE' || mic === 'BVMF' || mic === 'XMEX' || mic === 'XIDX' || mic === 'XSHG' || mic === 'XSHE' || mic === 'XTAI') {
    holidays.add(formatIsoDateUtc(year, 1, 1));
    if (mic === 'XASX' || mic === 'XJSE' || mic === 'BVMF' || mic === 'XSES' || mic === 'XHKG') {
      holidays.add(goodFriday);
    }
    if (mic === 'XASX' || mic === 'XHKG' || mic === 'XJSE') {
      holidays.add(easterMonday);
    }
    if (mic === 'XHKG' || mic === 'XSES' || mic === 'XASX' || mic === 'XJSE' || mic === 'BVMF' || mic === 'XMEX' || mic === 'XIDX') {
      holidays.add(formatIsoDateUtc(year, 12, 25));
    }
    if (mic === 'XASX' || mic === 'XHKG' || mic === 'XJSE') {
      holidays.add(formatIsoDateUtc(year, 12, 26));
    }
  }

  holidaySetCache.set(key, holidays);
  return holidays;
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
  if (dow === 0 || dow === 6) return false;
  return !isExchangeHoliday(cleanDate, tickerOrExchange, exchangeHint);
}

export function getNextTradingDay(dateStr: string, tickerOrExchange?: string, exchangeHint?: string): string {
  let candidate = addCalendarDays(dateStr.slice(0, 10), 1);
  for (let i = 0; i < 30; i++) {
    if (isExchangeTradingDay(candidate, tickerOrExchange, exchangeHint)) {
      return candidate;
    }
    candidate = addCalendarDays(candidate, 1);
  }
  return candidate;
}

export function getPreviousTradingDay(dateStr: string, tickerOrExchange?: string, exchangeHint?: string): string {
  let candidate = addCalendarDays(dateStr.slice(0, 10), -1);
  for (let i = 0; i < 30; i++) {
    if (isExchangeTradingDay(candidate, tickerOrExchange, exchangeHint)) {
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
  rollReason?: 'weekend' | 'holiday' | 'after_close';
}

/**
 * Aligns an article publication timestamp (`publishedAt`) onto an exchange-local trading date:
 * - Converts UTC timestamp to exchange-local wall time (DST-aware).
 * - If local date is a weekend or exchange holiday, advances to the next open trading session.
 * - If `respectMarketClose` (default true) and local time >= regular session close, advances to
 *   the next open trading session so after-hours news never causes same-day return lookahead.
 */
export function alignTimestampToTradingDate(
  publishedAt: Date | string | number,
  tickerOrExchange?: string,
  options?: { exchangeHint?: string; respectMarketClose?: boolean }
): AlignedArticleTradingDate {
  const spec = resolveExchangeCalendar(tickerOrExchange, options?.exchangeHint);
  const local = getExchangeLocalDateTime(publishedAt, spec.mic);
  const respectClose = options?.respectMarketClose !== false;

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

  if (respectClose && local.minutesSinceMidnight >= spec.closeMinutes) {
    return {
      mic: spec.mic,
      timezone: spec.timezone,
      exchangeLocalDate: local.dateStr,
      exchangeLocalHour: local.hour,
      exchangeLocalMinute: local.minute,
      tradingDate: getNextTradingDay(local.dateStr, spec.mic),
      rolledForward: true,
      rollReason: 'after_close'
    };
  }

  return {
    mic: spec.mic,
    timezone: spec.timezone,
    exchangeLocalDate: local.dateStr,
    exchangeLocalHour: local.hour,
    exchangeLocalMinute: local.minute,
    tradingDate: local.dateStr,
    rolledForward: false
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
    { ticker: string; weightedSum: number; totalArticles: number; sources: Set<string>; updatedAt: string }
  >();

  for (const rec of sentimentRecords) {
    if (!rec || rec.articleCount <= 0 || !Number.isFinite(rec.credibilityWeightedNetScore)) continue;
    const rawDate = rec.date.slice(0, 10);
    const tradingDate = isExchangeTradingDay(rawDate, spec.mic)
      ? rawDate
      : getNextTradingDay(rawDate, spec.mic);

    const existing = grouped.get(tradingDate);
    if (existing) {
      existing.weightedSum += rec.credibilityWeightedNetScore * rec.articleCount;
      existing.totalArticles += rec.articleCount;
      existing.sources.add(rec.sentimentSource);
      if (rec.updatedAt > existing.updatedAt) existing.updatedAt = rec.updatedAt;
    } else {
      grouped.set(tradingDate, {
        ticker: rec.ticker,
        weightedSum: rec.credibilityWeightedNetScore * rec.articleCount,
        totalArticles: rec.articleCount,
        sources: new Set([rec.sentimentSource]),
        updatedAt: rec.updatedAt
      });
    }
  }

  const out: DailySentimentRecord[] = [];
  for (const [date, agg] of grouped.entries()) {
    const src =
      agg.sources.size > 1 || agg.sources.has('mixed')
        ? 'mixed'
        : agg.sources.has('finbert')
          ? 'finbert'
          : 'lexicon';
    out.push({
      ticker: agg.ticker,
      date,
      credibilityWeightedNetScore: Number(Math.max(-1, Math.min(1, agg.weightedSum / agg.totalArticles)).toFixed(4)),
      articleCount: agg.totalArticles,
      sentimentSource: src,
      updatedAt: agg.updatedAt
    });
  }

  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}
