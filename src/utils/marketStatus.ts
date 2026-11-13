/**
 * Exchange Market Hours & Real-Time Open/Closed Status Utility
 * Accurately determines whether an equity's respective exchange is currently
 * Open or Closed using real exchange timezones, trading schedules, and
 * Yahoo Finance currentTradingPeriod timestamps when available.
 */

import { StockQuote } from '../types';
import { inferExchangeFromTicker } from './currency';

export interface ExchangeSchedule {
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
  NSE: {
    exchangeLabel: 'NSE',
    timezone: 'Asia/Kolkata',
    tzAbbr: 'IST',
    openHour: 9,
    openMinute: 15,
    closeHour: 15,
    closeMinute: 30,
    preOpenHour: 9,
    preOpenMinute: 0,
  },
  BSE: {
    exchangeLabel: 'BSE',
    timezone: 'Asia/Kolkata',
    tzAbbr: 'IST',
    openHour: 9,
    openMinute: 15,
    closeHour: 15,
    closeMinute: 30,
    preOpenHour: 9,
    preOpenMinute: 0,
  },
  NASDAQ: {
    exchangeLabel: 'NASDAQ',
    timezone: 'America/New_York',
    tzAbbr: 'ET',
    openHour: 9,
    openMinute: 30,
    closeHour: 16,
    closeMinute: 0,
    preOpenHour: 4,
    preOpenMinute: 0,
    postCloseHour: 20,
    postCloseMinute: 0,
  },
  NYSE: {
    exchangeLabel: 'NYSE',
    timezone: 'America/New_York',
    tzAbbr: 'ET',
    openHour: 9,
    openMinute: 30,
    closeHour: 16,
    closeMinute: 0,
    preOpenHour: 4,
    preOpenMinute: 0,
    postCloseHour: 20,
    postCloseMinute: 0,
  },
  KRX: {
    exchangeLabel: 'KRX',
    timezone: 'Asia/Seoul',
    tzAbbr: 'KST',
    openHour: 9,
    openMinute: 0,
    closeHour: 15,
    closeMinute: 30,
  },
  KOSDAQ: {
    exchangeLabel: 'KOSDAQ',
    timezone: 'Asia/Seoul',
    tzAbbr: 'KST',
    openHour: 9,
    openMinute: 0,
    closeHour: 15,
    closeMinute: 30,
  },
  TSE: {
    exchangeLabel: 'TSE',
    timezone: 'Asia/Tokyo',
    tzAbbr: 'JST',
    openHour: 9,
    openMinute: 0,
    closeHour: 15,
    closeMinute: 30,
    lunchStartHour: 11,
    lunchStartMinute: 30,
    lunchEndHour: 12,
    lunchEndMinute: 30,
  },
  LSE: {
    exchangeLabel: 'LSE',
    timezone: 'Europe/London',
    tzAbbr: 'UK',
    openHour: 8,
    openMinute: 0,
    closeHour: 16,
    closeMinute: 30,
  },
  XETRA: {
    exchangeLabel: 'XETRA',
    timezone: 'Europe/Berlin',
    tzAbbr: 'CET',
    openHour: 9,
    openMinute: 0,
    closeHour: 17,
    closeMinute: 30,
  },
  EURONEXT: {
    exchangeLabel: 'EURONEXT',
    timezone: 'Europe/Paris',
    tzAbbr: 'CET',
    openHour: 9,
    openMinute: 0,
    closeHour: 17,
    closeMinute: 30,
  },
  HKEX: {
    exchangeLabel: 'HKEX',
    timezone: 'Asia/Hong_Kong',
    tzAbbr: 'HKT',
    openHour: 9,
    openMinute: 30,
    closeHour: 16,
    closeMinute: 0,
    lunchStartHour: 12,
    lunchStartMinute: 0,
    lunchEndHour: 13,
    lunchEndMinute: 0,
  },
  TWSE: {
    exchangeLabel: 'TWSE',
    timezone: 'Asia/Taipei',
    tzAbbr: 'TST',
    openHour: 9,
    openMinute: 0,
    closeHour: 13,
    closeMinute: 30,
  },
  SSE: {
    exchangeLabel: 'SSE',
    timezone: 'Asia/Shanghai',
    tzAbbr: 'CST',
    openHour: 9,
    openMinute: 30,
    closeHour: 15,
    closeMinute: 0,
    lunchStartHour: 11,
    lunchStartMinute: 30,
    lunchEndHour: 13,
    lunchEndMinute: 0,
  },
  SZSE: {
    exchangeLabel: 'SZSE',
    timezone: 'Asia/Shanghai',
    tzAbbr: 'CST',
    openHour: 9,
    openMinute: 30,
    closeHour: 15,
    closeMinute: 0,
    lunchStartHour: 11,
    lunchStartMinute: 30,
    lunchEndHour: 13,
    lunchEndMinute: 0,
  },
  TSX: {
    exchangeLabel: 'TSX',
    timezone: 'America/Toronto',
    tzAbbr: 'ET',
    openHour: 9,
    openMinute: 30,
    closeHour: 16,
    closeMinute: 0,
  },
  ASX: {
    exchangeLabel: 'ASX',
    timezone: 'Australia/Sydney',
    tzAbbr: 'AET',
    openHour: 10,
    openMinute: 0,
    closeHour: 16,
    closeMinute: 0,
  },
  SGX: {
    exchangeLabel: 'SGX',
    timezone: 'Asia/Singapore',
    tzAbbr: 'SGT',
    openHour: 9,
    openMinute: 0,
    closeHour: 17,
    closeMinute: 0,
  },
  SIX: {
    exchangeLabel: 'SIX',
    timezone: 'Europe/Zurich',
    tzAbbr: 'CET',
    openHour: 9,
    openMinute: 0,
    closeHour: 17,
    closeMinute: 30,
  },
  B3: {
    exchangeLabel: 'B3',
    timezone: 'America/Sao_Paulo',
    tzAbbr: 'BRT',
    openHour: 10,
    openMinute: 0,
    closeHour: 17,
    closeMinute: 0,
  },
};

const EXCHANGE_ALIASES: Record<string, string> = {
  NSI: 'NSE',
  NSE: 'NSE',
  BOM: 'BSE',
  BSE: 'BSE',
  NMS: 'NASDAQ',
  NGM: 'NASDAQ',
  NCM: 'NASDAQ',
  NAS: 'NASDAQ',
  NASDAQ: 'NASDAQ',
  NYQ: 'NYSE',
  NYSE: 'NYSE',
  ASE: 'NYSE',
  PCX: 'NYSE',
  AMEX: 'NYSE',
  ARCA: 'NYSE',
  KSC: 'KRX',
  KRX: 'KRX',
  KOE: 'KOSDAQ',
  KOSDAQ: 'KOSDAQ',
  JPX: 'TSE',
  TYO: 'TSE',
  TSE: 'TSE',
  LSE: 'LSE',
  LON: 'LSE',
  GER: 'XETRA',
  FRA: 'XETRA',
  XETRA: 'XETRA',
  PAR: 'EURONEXT',
  AMS: 'EURONEXT',
  EURONEXT: 'EURONEXT',
  HKG: 'HKEX',
  HKEX: 'HKEX',
  TAI: 'TWSE',
  TWO: 'TWSE',
  TWSE: 'TWSE',
  SHH: 'SSE',
  SSE: 'SSE',
  SHZ: 'SZSE',
  SZSE: 'SZSE',
  TOR: 'TSX',
  TSX: 'TSX',
  ASX: 'ASX',
  SES: 'SGX',
  SGX: 'SGX',
  EBS: 'SIX',
  SIX: 'SIX',
  SAO: 'B3',
  B3: 'B3',
};

export interface MarketStatusInfo {
  isOpen: boolean;
  session: 'regular' | 'pre' | 'post' | 'closed';
  exchangeLabel: string;
  timezone: string;
  tzAbbr: string;
  localTimeFormatted: string;
  scheduleText: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function resolveExchangeKey(ticker?: string, exchange?: string, exchangeTimezoneName?: string): string {
  if (exchange) {
    const upper = exchange.toUpperCase().trim();
    if (EXCHANGE_ALIASES[upper]) return EXCHANGE_ALIASES[upper];
  }
  if (ticker) {
    const inferred = inferExchangeFromTicker(ticker);
    if (EXCHANGE_SCHEDULES[inferred]) return inferred;
  }
  if (exchangeTimezoneName) {
    const match = Object.entries(EXCHANGE_SCHEDULES).find(([, s]) => s.timezone === exchangeTimezoneName);
    if (match) return match[0];
  }
  return 'NASDAQ';
}

function getLocalClockInTimezone(date: Date, timezone: string): {
  isWeekday: boolean;
  weekdayShort: string;
  hour: number;
  minute: number;
  minutesSinceMidnight: number;
} {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const weekdayShort = parts.find((p) => p.type === 'weekday')?.value || 'Mon';
    let hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    if (hour === 24) hour = 0;
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    const isWeekday = weekdayShort !== 'Sat' && weekdayShort !== 'Sun';

    return {
      isWeekday,
      weekdayShort,
      hour,
      minute,
      minutesSinceMidnight: hour * 60 + minute,
    };
  } catch {
    const day = date.getUTCDay();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    return {
      isWeekday: day !== 0 && day !== 6,
      weekdayShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
      hour,
      minute,
      minutesSinceMidnight: hour * 60 + minute,
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
  const key = resolveExchangeKey(ticker, exchange, exchangeTimezoneName);
  const schedule = EXCHANGE_SCHEDULES[key] || EXCHANGE_SCHEDULES.NASDAQ;
  const tz = exchangeTimezoneName || schedule.timezone;
  const tzAbbr = marketPeriod?.tzShort || schedule.tzAbbr;

  const local = getLocalClockInTimezone(now, tz);
  const openMins = schedule.openHour * 60 + schedule.openMinute;
  const closeMins = schedule.closeHour * 60 + schedule.closeMinute;

  const inLunch =
    schedule.lunchStartHour !== undefined &&
    schedule.lunchStartMinute !== undefined &&
    schedule.lunchEndHour !== undefined &&
    schedule.lunchEndMinute !== undefined &&
    local.minutesSinceMidnight >= schedule.lunchStartHour * 60 + schedule.lunchStartMinute &&
    local.minutesSinceMidnight < schedule.lunchEndHour * 60 + schedule.lunchEndMinute;

  const scheduleText = `${pad2(schedule.openHour)}:${pad2(schedule.openMinute)}–${pad2(schedule.closeHour)}:${pad2(schedule.closeMinute)} ${tzAbbr}`;
  const localTimeFormatted = `${pad2(local.hour)}:${pad2(local.minute)} ${tzAbbr}`;

  const nowUnix = Math.floor(now.getTime() / 1000);
  const hasFreshYahooPeriod =
    marketPeriod?.regularStart !== undefined &&
    marketPeriod?.regularEnd !== undefined &&
    nowUnix >= marketPeriod.regularStart - 20 * 3600 &&
    nowUnix <= marketPeriod.regularEnd + 20 * 3600;

  let isOpen = false;
  let session: MarketStatusInfo['session'] = 'closed';

  if (hasFreshYahooPeriod && marketPeriod?.regularStart && marketPeriod?.regularEnd) {
    if (nowUnix >= marketPeriod.regularStart && nowUnix < marketPeriod.regularEnd && !inLunch) {
      isOpen = true;
      session = 'regular';
    } else if (marketPeriod.preStart && marketPeriod.preEnd && nowUnix >= marketPeriod.preStart && nowUnix < marketPeriod.preEnd) {
      session = 'pre';
    } else if (marketPeriod.postStart && marketPeriod.postEnd && nowUnix >= marketPeriod.postStart && nowUnix < marketPeriod.postEnd) {
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
    session,
    exchangeLabel: schedule.exchangeLabel,
    timezone: tz,
    tzAbbr,
    localTimeFormatted,
    scheduleText,
  };
}
