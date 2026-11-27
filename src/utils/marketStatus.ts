/**
 * Exchange Market Hours & Real-Time Open/Closed Status Utility
 * Driven by checked-in `scripts/seeds/exchange_calendars.json` (`gerrymanoim/exchange_calendars@4.13.3`)
 * so holidays, half-day early closes, and DST transitions match server calendars.
 * Falls back explicitly to `calendar_unknown` when an exchange or year lacks calendar coverage.
 */

import rawCalendarDataset from '../../scripts/seeds/exchange_calendars.json';
import { StockQuote } from '../types';
import { inferExchangeFromTicker } from './currency';

interface CalendarEarlyClose {
  closeMinutes: number;
  label: string;
}

interface CalendarExchangeEntry {
  mic: string;
  code: string;
  timezone: string;
  openMinutes: number;
  closeMinutes: number;
  minYear: number;
  maxYear: number;
  holidays: Record<string, string[]>;
  earlyCloses: Record<string, CalendarEarlyClose>;
}

const CALENDAR_EXCHANGES = (rawCalendarDataset as { exchanges: Record<string, CalendarExchangeEntry> }).exchanges;

export interface ExchangeSchedule {
  mic: string;
  exchangeLabel: string;
  timezone: string;
  tzAbbr: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
  lunchStartHour?: number;
  lunchStartMinute?: number;
  lunchEndHour?: number;
  lunchEndMinute?: number;
  preOpenHour?: number;
  preOpenMinute?: number;
  postCloseHour?: number;
  postCloseMinute?: number;
}

const EXCHANGE_SCHEDULES: Record<string, ExchangeSchedule> = {
  NSE: { mic: 'XNSE', exchangeLabel: 'NSE', timezone: 'Asia/Kolkata', tzAbbr: 'IST', openHour: 9, openMinute: 15, closeHour: 15, closeMinute: 30, preOpenHour: 9, preOpenMinute: 0 },
  BSE: { mic: 'XBOM', exchangeLabel: 'BSE', timezone: 'Asia/Kolkata', tzAbbr: 'IST', openHour: 9, openMinute: 15, closeHour: 15, closeMinute: 30, preOpenHour: 9, preOpenMinute: 0 },
  NASDAQ: { mic: 'XNAS', exchangeLabel: 'NASDAQ', timezone: 'America/New_York', tzAbbr: 'ET', openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0, preOpenHour: 4, preOpenMinute: 0, postCloseHour: 20, postCloseMinute: 0 },
  NYSE: { mic: 'XNYS', exchangeLabel: 'NYSE', timezone: 'America/New_York', tzAbbr: 'ET', openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0, preOpenHour: 4, preOpenMinute: 0, postCloseHour: 20, postCloseMinute: 0 },
  KRX: { mic: 'XKRX', exchangeLabel: 'KRX', timezone: 'Asia/Seoul', tzAbbr: 'KST', openHour: 9, openMinute: 0, closeHour: 15, closeMinute: 30 },
  KOSDAQ: { mic: 'XKOS', exchangeLabel: 'KOSDAQ', timezone: 'Asia/Seoul', tzAbbr: 'KST', openHour: 9, openMinute: 0, closeHour: 15, closeMinute: 30 },
  TSE: { mic: 'XTKS', exchangeLabel: 'TSE', timezone: 'Asia/Tokyo', tzAbbr: 'JST', openHour: 9, openMinute: 0, closeHour: 15, closeMinute: 30, lunchStartHour: 11, lunchStartMinute: 30, lunchEndHour: 12, lunchEndMinute: 30 },
  LSE: { mic: 'XLON', exchangeLabel: 'LSE', timezone: 'Europe/London', tzAbbr: 'UK', openHour: 8, openMinute: 0, closeHour: 16, closeMinute: 30 },
  XETRA: { mic: 'XETR', exchangeLabel: 'XETRA', timezone: 'Europe/Berlin', tzAbbr: 'CET', openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },
  EURONEXT: { mic: 'XPAR', exchangeLabel: 'EURONEXT', timezone: 'Europe/Paris', tzAbbr: 'CET', openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },
  HKEX: { mic: 'XHKG', exchangeLabel: 'HKEX', timezone: 'Asia/Hong_Kong', tzAbbr: 'HKT', openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0, lunchStartHour: 12, lunchStartMinute: 0, lunchEndHour: 13, lunchEndMinute: 0 },
  TWSE: { mic: 'XTAI', exchangeLabel: 'TWSE', timezone: 'Asia/Taipei', tzAbbr: 'TST', openHour: 9, openMinute: 0, closeHour: 13, closeMinute: 30 },
  SSE: { mic: 'XSHG', exchangeLabel: 'SSE', timezone: 'Asia/Shanghai', tzAbbr: 'CST', openHour: 9, openMinute: 30, closeHour: 15, closeMinute: 0, lunchStartHour: 11, lunchStartMinute: 30, lunchEndHour: 13, lunchEndMinute: 0 },
  SZSE: { mic: 'XSHE', exchangeLabel: 'SZSE', timezone: 'Asia/Shanghai', tzAbbr: 'CST', openHour: 9, openMinute: 30, closeHour: 15, closeMinute: 0, lunchStartHour: 11, lunchStartMinute: 30, lunchEndHour: 13, lunchEndMinute: 0 },
  TSX: { mic: 'XTSE', exchangeLabel: 'TSX', timezone: 'America/Toronto', tzAbbr: 'ET', openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0 },
  ASX: { mic: 'XASX', exchangeLabel: 'ASX', timezone: 'Australia/Sydney', tzAbbr: 'AET', openHour: 10, openMinute: 0, closeHour: 16, closeMinute: 0 },
  SGX: { mic: 'XSES', exchangeLabel: 'SGX', timezone: 'Asia/Singapore', tzAbbr: 'SGT', openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 0 },
  SIX: { mic: 'XSWX', exchangeLabel: 'SIX', timezone: 'Europe/Zurich', tzAbbr: 'CET', openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },
  B3: { mic: 'BVMF', exchangeLabel: 'B3', timezone: 'America/Sao_Paulo', tzAbbr: 'BRT', openHour: 10, openMinute: 0, closeHour: 17, closeMinute: 0 },
  BME: { mic: 'XMAD', exchangeLabel: 'BME', timezone: 'Europe/Madrid', tzAbbr: 'CET', openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },
  MIL: { mic: 'XMIL', exchangeLabel: 'MIL', timezone: 'Europe/Rome', tzAbbr: 'CET', openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },
  'NASDAQ NORDIC': { mic: 'XSTO', exchangeLabel: 'NASDAQ NORDIC', timezone: 'Europe/Stockholm', tzAbbr: 'CET', openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },
  OSLO: { mic: 'XOSL', exchangeLabel: 'OSLO', timezone: 'Europe/Oslo', tzAbbr: 'CET', openHour: 9, openMinute: 0, closeHour: 16, closeMinute: 20 },
  JSE: { mic: 'XJSE', exchangeLabel: 'JSE', timezone: 'Africa/Johannesburg', tzAbbr: 'SAST', openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 0 },
  BMV: { mic: 'XMEX', exchangeLabel: 'BMV', timezone: 'America/Mexico_City', tzAbbr: 'CST', openHour: 8, openMinute: 30, closeHour: 15, closeMinute: 0 },
  IDX: { mic: 'XIDX', exchangeLabel: 'IDX', timezone: 'Asia/Jakarta', tzAbbr: 'WIB', openHour: 9, openMinute: 0, closeHour: 16, closeMinute: 0, lunchStartHour: 12, lunchStartMinute: 0, lunchEndHour: 13, lunchEndMinute: 30 },
  WSE: { mic: 'XWAR', exchangeLabel: 'WSE', timezone: 'Europe/Warsaw', tzAbbr: 'CET', openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 0 },
  VIE: { mic: 'XWBO', exchangeLabel: 'VIE', timezone: 'Europe/Vienna', tzAbbr: 'CET', openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },
  BIST: { mic: 'XIST', exchangeLabel: 'BIST', timezone: 'Europe/Istanbul', tzAbbr: 'TRT', openHour: 10, openMinute: 0, closeHour: 18, closeMinute: 0 },
  NZX: { mic: 'XNZE', exchangeLabel: 'NZX', timezone: 'Pacific/Auckland', tzAbbr: 'NZT', openHour: 10, openMinute: 0, closeHour: 16, closeMinute: 45 },
  MYX: { mic: 'XKLS', exchangeLabel: 'MYX', timezone: 'Asia/Kuala_Lumpur', tzAbbr: 'MYT', openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 0 },
  SET: { mic: 'XBKK', exchangeLabel: 'SET', timezone: 'Asia/Bangkok', tzAbbr: 'ICT', openHour: 10, openMinute: 0, closeHour: 16, closeMinute: 30 }
};

const MIC_SCHEDULES: Record<string, ExchangeSchedule> = {
  XNSE: EXCHANGE_SCHEDULES.NSE,
  XBOM: EXCHANGE_SCHEDULES.BSE,
  XNAS: EXCHANGE_SCHEDULES.NASDAQ,
  XNYS: EXCHANGE_SCHEDULES.NYSE,
  XKRX: EXCHANGE_SCHEDULES.KRX,
  XKOS: EXCHANGE_SCHEDULES.KOSDAQ,
  XTKS: EXCHANGE_SCHEDULES.TSE,
  XLON: EXCHANGE_SCHEDULES.LSE,
  XETR: EXCHANGE_SCHEDULES.XETRA,
  XPAR: EXCHANGE_SCHEDULES.EURONEXT,
  XAMS: { ...EXCHANGE_SCHEDULES.EURONEXT, mic: 'XAMS', timezone: 'Europe/Amsterdam' },
  XBRU: { ...EXCHANGE_SCHEDULES.EURONEXT, mic: 'XBRU', timezone: 'Europe/Brussels' },
  XLIS: { mic: 'XLIS', exchangeLabel: 'EURONEXT', timezone: 'Europe/Lisbon', tzAbbr: 'WET', openHour: 8, openMinute: 0, closeHour: 16, closeMinute: 30 },
  XDUB: { mic: 'XDUB', exchangeLabel: 'EURONEXT', timezone: 'Europe/Dublin', tzAbbr: 'IST', openHour: 8, openMinute: 0, closeHour: 16, closeMinute: 28 },
  XHKG: EXCHANGE_SCHEDULES.HKEX,
  XTAI: EXCHANGE_SCHEDULES.TWSE,
  XSHG: EXCHANGE_SCHEDULES.SSE,
  XSHE: EXCHANGE_SCHEDULES.SZSE,
  XTSE: EXCHANGE_SCHEDULES.TSX,
  XASX: EXCHANGE_SCHEDULES.ASX,
  XSES: EXCHANGE_SCHEDULES.SGX,
  XSWX: EXCHANGE_SCHEDULES.SIX,
  BVMF: EXCHANGE_SCHEDULES.B3,
  XMAD: EXCHANGE_SCHEDULES.BME,
  XMIL: EXCHANGE_SCHEDULES.MIL,
  XSTO: EXCHANGE_SCHEDULES['NASDAQ NORDIC'],
  XCSE: { mic: 'XCSE', exchangeLabel: 'NASDAQ NORDIC', timezone: 'Europe/Copenhagen', tzAbbr: 'CET', openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 0 },
  XHEL: { mic: 'XHEL', exchangeLabel: 'NASDAQ NORDIC', timezone: 'Europe/Helsinki', tzAbbr: 'EET', openHour: 10, openMinute: 0, closeHour: 18, closeMinute: 30 },
  XOSL: EXCHANGE_SCHEDULES.OSLO,
  XJSE: EXCHANGE_SCHEDULES.JSE,
  XMEX: EXCHANGE_SCHEDULES.BMV,
  XIDX: EXCHANGE_SCHEDULES.IDX,
  XWAR: EXCHANGE_SCHEDULES.WSE,
  XWBO: EXCHANGE_SCHEDULES.VIE,
  XIST: EXCHANGE_SCHEDULES.BIST,
  XNZE: EXCHANGE_SCHEDULES.NZX,
  XKLS: EXCHANGE_SCHEDULES.MYX,
  XBKK: EXCHANGE_SCHEDULES.SET
};

const EXCHANGE_ALIASES: Record<string, string> = {
  NSI: 'XNSE',
  NSE: 'XNSE',
  XNSE: 'XNSE',
  BOM: 'XBOM',
  BSE: 'XBOM',
  XBOM: 'XBOM',
  NMS: 'XNAS',
  NGM: 'XNAS',
  NCM: 'XNAS',
  NAS: 'XNAS',
  NASDAQ: 'XNAS',
  XNAS: 'XNAS',
  NYQ: 'XNYS',
  NYSE: 'XNYS',
  XNYS: 'XNYS',
  ASE: 'XNYS',
  PCX: 'XNYS',
  AMEX: 'XNYS',
  ARCA: 'XNYS',
  KSC: 'XKRX',
  KRX: 'XKRX',
  XKRX: 'XKRX',
  KOE: 'XKOS',
  KOSDAQ: 'XKOS',
  XKOS: 'XKOS',
  JPX: 'XTKS',
  TYO: 'XTKS',
  TSE: 'XTKS',
  XTKS: 'XTKS',
  LSE: 'XLON',
  LON: 'XLON',
  XLON: 'XLON',
  GER: 'XETR',
  FRA: 'XETR',
  XETRA: 'XETR',
  XETR: 'XETR',
  PAR: 'XPAR',
  XPAR: 'XPAR',
  AMS: 'XAMS',
  XAMS: 'XAMS',
  BRU: 'XBRU',
  XBRU: 'XBRU',
  LIS: 'XLIS',
  XLIS: 'XLIS',
  ISE: 'XDUB',
  XDUB: 'XDUB',
  EURONEXT: 'XPAR',
  MCE: 'XMAD',
  BME: 'XMAD',
  XMAD: 'XMAD',
  MIL: 'XMIL',
  XMIL: 'XMIL',
  STO: 'XSTO',
  XSTO: 'XSTO',
  CPH: 'XCSE',
  XCSE: 'XCSE',
  HEL: 'XHEL',
  XHEL: 'XHEL',
  'NASDAQ NORDIC': 'XSTO',
  OSL: 'XOSL',
  OSLO: 'XOSL',
  XOSL: 'XOSL',
  JNB: 'XJSE',
  JSE: 'XJSE',
  XJSE: 'XJSE',
  MEX: 'XMEX',
  BMV: 'XMEX',
  XMEX: 'XMEX',
  JKT: 'XIDX',
  IDX: 'XIDX',
  XIDX: 'XIDX',
  HKG: 'XHKG',
  HKEX: 'XHKG',
  XHKG: 'XHKG',
  TAI: 'XTAI',
  TWO: 'XTAI',
  TWSE: 'XTAI',
  XTAI: 'XTAI',
  SHH: 'XSHG',
  SSE: 'XSHG',
  XSHG: 'XSHG',
  SHZ: 'XSHE',
  SZSE: 'XSHE',
  XSHE: 'XSHE',
  TOR: 'XTSE',
  TSX: 'XTSE',
  XTSE: 'XTSE',
  ASX: 'XASX',
  XASX: 'XASX',
  SES: 'XSES',
  SGX: 'XSES',
  XSES: 'XSES',
  EBS: 'XSWX',
  SIX: 'XSWX',
  XSWX: 'XSWX',
  SAO: 'BVMF',
  B3: 'BVMF',
  BVMF: 'BVMF',
  WSE: 'XWAR',
  XWAR: 'XWAR',
  VIE: 'XWBO',
  XWBO: 'XWBO',
  IST: 'XIST',
  BIST: 'XIST',
  XIST: 'XIST',
  NZE: 'XNZE',
  NZX: 'XNZE',
  XNZE: 'XNZE',
  KLS: 'XKLS',
  MYX: 'XKLS',
  XKLS: 'XKLS',
  SET: 'XBKK',
  XBKK: 'XBKK'
};

export interface MarketStatusInfo {
  isOpen: boolean;
  calendarKnown: boolean;
  session: 'regular' | 'pre' | 'post' | 'closed' | 'calendar_unknown';
  exchangeLabel: string;
  timezone: string;
  tzAbbr: string;
  localTimeFormatted: string;
  scheduleText: string;
  isHoliday?: boolean;
  isEarlyClose?: boolean;
  earlyCloseLabel?: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

const SUFFIX_TO_MIC: Record<string, string> = {
  '.NS': 'XNSE',
  '.BO': 'XBOM',
  '.L': 'XLON',
  '.DE': 'XETR',
  '.F': 'XETR',
  '.PA': 'XPAR',
  '.AS': 'XAMS',
  '.BR': 'XBRU',
  '.LS': 'XLIS',
  '.IR': 'XDUB',
  '.VI': 'XWBO',
  '.WA': 'XWAR',
  '.IS': 'XIST',
  '.SW': 'XSWX',
  '.MC': 'XMAD',
  '.MI': 'XMIL',
  '.CO': 'XCSE',
  '.ST': 'XSTO',
  '.HE': 'XHEL',
  '.OL': 'XOSL',
  '.T': 'XTKS',
  '.HK': 'XHKG',
  '.KS': 'XKRX',
  '.KQ': 'XKOS',
  '.TW': 'XTAI',
  '.TWO': 'XTAI',
  '.SS': 'XSHG',
  '.SZ': 'XSHE',
  '.TO': 'XTSE',
  '.V': 'XTSE',
  '.AX': 'XASX',
  '.NZ': 'XNZE',
  '.SI': 'XSES',
  '.KL': 'XKLS',
  '.BK': 'XBKK',
  '.SA': 'BVMF',
  '.JO': 'XJSE',
  '.MX': 'XMEX',
  '.JK': 'XIDX'
};

function resolveScheduleIfKnown(
  ticker?: string,
  exchange?: string,
  exchangeTimezoneName?: string
): ExchangeSchedule | null {
  if (exchange) {
    const upper = exchange.toUpperCase().trim();
    const mic = EXCHANGE_ALIASES[upper];
    if (mic && MIC_SCHEDULES[mic]) return MIC_SCHEDULES[mic];
    return null; // Unknown explicit exchange must NEVER silently default to NASDAQ
  }

  if (ticker) {
    const clean = ticker.trim().toUpperCase();
    const dotIdx = clean.lastIndexOf('.');
    if (dotIdx > 0) {
      const suffix = clean.slice(dotIdx);
      const mic = SUFFIX_TO_MIC[suffix];
      if (mic && MIC_SCHEDULES[mic]) {
        return MIC_SCHEDULES[mic];
      }
      return null; // Unrecognized ticker dot suffix (.ZZ etc.) -> calendar unknown
    }

    if (EXCHANGE_ALIASES[clean] && MIC_SCHEDULES[EXCHANGE_ALIASES[clean]]) {
      return MIC_SCHEDULES[EXCHANGE_ALIASES[clean]];
    }
    if (/^[XB][A-Z]{3}$/.test(clean) && !MIC_SCHEDULES[clean]) {
      return null;
    }
    const inferred = inferExchangeFromTicker(clean);
    const mic = EXCHANGE_ALIASES[inferred];
    if (mic && MIC_SCHEDULES[mic]) return MIC_SCHEDULES[mic];
  }

  if (exchangeTimezoneName) {
    const match = Object.values(MIC_SCHEDULES).find((s) => s.timezone === exchangeTimezoneName);
    if (match) return match;
  }

  return null;
}

function getLocalClockInTimezone(date: Date, timezone: string): {
  dateStr: string;
  year: number;
  isWeekday: boolean;
  weekdayShort: string;
  hour: number;
  minute: number;
  minutesSinceMidnight: number;
} {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date);

    const y = parts.find((p) => p.type === 'year')?.value || '1970';
    const m = parts.find((p) => p.type === 'month')?.value || '01';
    const d = parts.find((p) => p.type === 'day')?.value || '01';
    const weekdayShort = parts.find((p) => p.type === 'weekday')?.value || 'Mon';
    let hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    if (hour === 24) hour = 0;
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    const isWeekday = weekdayShort !== 'Sat' && weekdayShort !== 'Sun';

    return {
      dateStr: `${y}-${m}-${d}`,
      year: Number(y),
      isWeekday,
      weekdayShort,
      hour,
      minute,
      minutesSinceMidnight: hour * 60 + minute
    };
  } catch {
    const iso = date.toISOString();
    const day = date.getUTCDay();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    return {
      dateStr: iso.slice(0, 10),
      year: Number(iso.slice(0, 4)),
      isWeekday: day !== 0 && day !== 6,
      weekdayShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
      hour,
      minute,
      minutesSinceMidnight: hour * 60 + minute
    };
  }
}

export function getExchangeMarketStatus(params: {
  ticker?: string;
  exchange?: string;
  exchangeTimezoneName?: string;
  marketPeriod?: StockQuote['marketPeriod'];
  now?: Date;
}): MarketStatusInfo {
  const { ticker, exchange, exchangeTimezoneName, marketPeriod, now = new Date() } = params;
  const schedule = resolveScheduleIfKnown(ticker, exchange, exchangeTimezoneName);

  if (!schedule) {
    const label = (exchange || ticker || 'UNKNOWN').trim().toUpperCase();
    return {
      isOpen: false,
      calendarKnown: false,
      session: 'calendar_unknown',
      exchangeLabel: label,
      timezone: exchangeTimezoneName || 'UTC',
      tzAbbr: 'UTC',
      localTimeFormatted: '--:--',
      scheduleText: 'Calendar Unknown'
    };
  }

  const calEntry = CALENDAR_EXCHANGES[schedule.mic];
  const tz = exchangeTimezoneName || schedule.timezone;
  const tzAbbr = marketPeriod?.tzShort || schedule.tzAbbr;
  const local = getLocalClockInTimezone(now, tz);

  const yearHolidays = calEntry?.holidays?.[String(local.year)];
  const hasCalendarForYear =
    Boolean(calEntry) &&
    local.year >= calEntry.minYear &&
    local.year <= calEntry.maxYear &&
    Array.isArray(yearHolidays) &&
    yearHolidays.length > 0;

  if (!hasCalendarForYear) {
    return {
      isOpen: false,
      calendarKnown: false,
      session: 'calendar_unknown',
      exchangeLabel: schedule.exchangeLabel,
      timezone: tz,
      tzAbbr,
      localTimeFormatted: `${pad2(local.hour)}:${pad2(local.minute)} ${tzAbbr}`,
      scheduleText: 'Calendar Unknown'
    };
  }

  const isHolidayToday = yearHolidays.includes(local.dateStr);
  const earlyClose = calEntry.earlyCloses?.[local.dateStr];
  const openMins = schedule.openHour * 60 + schedule.openMinute;
  const closeMins = earlyClose ? earlyClose.closeMinutes : schedule.closeHour * 60 + schedule.closeMinute;
  const effCloseHour = Math.floor(closeMins / 60);
  const effCloseMinute = closeMins % 60;

  const inLunch =
    schedule.lunchStartHour !== undefined &&
    schedule.lunchStartMinute !== undefined &&
    schedule.lunchEndHour !== undefined &&
    schedule.lunchEndMinute !== undefined &&
    local.minutesSinceMidnight >= schedule.lunchStartHour * 60 + schedule.lunchStartMinute &&
    local.minutesSinceMidnight < schedule.lunchEndHour * 60 + schedule.lunchEndMinute;

  const scheduleText = earlyClose
    ? `${pad2(schedule.openHour)}:${pad2(schedule.openMinute)}–${pad2(effCloseHour)}:${pad2(effCloseMinute)} ${tzAbbr} (Early Close)`
    : `${pad2(schedule.openHour)}:${pad2(schedule.openMinute)}–${pad2(schedule.closeHour)}:${pad2(schedule.closeMinute)} ${tzAbbr}`;
  const localTimeFormatted = `${pad2(local.hour)}:${pad2(local.minute)} ${tzAbbr}`;

  const nowUnix = Math.floor(now.getTime() / 1000);
  const hasFreshYahooPeriod =
    marketPeriod?.regularStart !== undefined &&
    marketPeriod?.regularEnd !== undefined &&
    nowUnix >= marketPeriod.regularStart - 20 * 3600 &&
    nowUnix <= marketPeriod.regularEnd + 20 * 3600;

  let isOpen = false;
  let session: MarketStatusInfo['session'] = 'closed';

  if (isHolidayToday || !local.isWeekday) {
    isOpen = false;
    session = 'closed';
  } else if (hasFreshYahooPeriod && marketPeriod?.regularStart && marketPeriod?.regularEnd) {
    const effectiveEndUnix = earlyClose
      ? Math.min(
          marketPeriod.regularEnd,
          marketPeriod.regularStart + (closeMins - openMins) * 60
        )
      : marketPeriod.regularEnd;
    if (nowUnix >= marketPeriod.regularStart && nowUnix < effectiveEndUnix && !inLunch) {
      isOpen = true;
      session = 'regular';
    } else if (
      marketPeriod.preStart &&
      marketPeriod.preEnd &&
      nowUnix >= marketPeriod.preStart &&
      nowUnix < marketPeriod.preEnd
    ) {
      session = 'pre';
    } else if (
      marketPeriod.postStart &&
      marketPeriod.postEnd &&
      nowUnix >= marketPeriod.postStart &&
      nowUnix < marketPeriod.postEnd
    ) {
      session = 'post';
    } else {
      session = 'closed';
    }
  } else if (local.isWeekday) {
    if (local.minutesSinceMidnight >= openMins && local.minutesSinceMidnight < closeMins && !inLunch) {
      isOpen = true;
      session = 'regular';
    } else if (
      schedule.preOpenHour !== undefined &&
      schedule.preOpenMinute !== undefined &&
      local.minutesSinceMidnight >= schedule.preOpenHour * 60 + schedule.preOpenMinute &&
      local.minutesSinceMidnight < openMins
    ) {
      session = 'pre';
    } else if (
      schedule.postCloseHour !== undefined &&
      schedule.postCloseMinute !== undefined &&
      local.minutesSinceMidnight >= closeMins &&
      local.minutesSinceMidnight < schedule.postCloseHour * 60 + schedule.postCloseMinute
    ) {
      session = 'post';
    }
  }

  return {
    isOpen,
    calendarKnown: true,
    session,
    exchangeLabel: schedule.exchangeLabel,
    timezone: tz,
    tzAbbr,
    localTimeFormatted,
    scheduleText,
    ...(isHolidayToday ? { isHoliday: true } : {}),
    ...(earlyClose ? { isEarlyClose: true, earlyCloseLabel: earlyClose.label } : {})
  };
}
