/**
 * Global Exchange Calendars, Time Zone & DST Alignment Engine (Step 4)
 *
 * Maps global tickers & ISO 10383 MIC exchange codes to:
 *   - IANA timezones (full DST transition handling via Intl.DateTimeFormat)
 *   - Regular market session open/close hours
 *   - Exchange holiday calendars powered by `date-holidays` + verified official exchange
 *     trading closure schedules (NSE, BSE, NYSE, NASDAQ, KRX, XETRA, LSE, TSE, HKEX, etc.)
 *   - Explicit coverage checks (`MissingExchangeHolidayDataError`) when a requested year
 *     falls outside the verified calendar window
 *   - Causal exchange-local trading date alignment for news articles & daily sentiment records
 */

import Holidays from 'date-holidays';
import { DailySentimentRecord } from '../../types';
import { resolveExchangeMicInfo } from '../../shared/tickerMetadata';

export const HOLIDAY_DATA_RETRIEVED_AT = '2026-11-24';

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
  countryCode: string;
  subdivisionCode?: string;
  source: string;
  retrievedAt: string;
}

export class MissingExchangeHolidayDataError extends Error {
  readonly mic: string;
  readonly year: number;
  readonly supportedRange?: { minYear: number; maxYear: number };

  constructor(mic: string, year: number, supportedRange?: { minYear: number; maxYear: number }) {
    const rangeMsg = supportedRange
      ? ` (verified holiday coverage: ${supportedRange.minYear}–${supportedRange.maxYear})`
      : ' (unsupported exchange MIC)';
    super(`No verified exchange holiday calendar data for ${mic} in year ${year}${rangeMsg}.`);
    this.name = 'MissingExchangeHolidayDataError';
    this.mic = mic;
    this.year = year;
    this.supportedRange = supportedRange;
  }
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

export const EXCHANGE_HOLIDAY_COVERAGE: Record<string, ExchangeHolidayCoverageSpec> = {
  XNSE: {
    minYear: 2024,
    maxYear: 2026,
    countryCode: 'IN',
    subdivisionCode: 'MH',
    source: 'date-holidays (IN-MH) + NSE India Capital Market Trading Holiday Circulars (2024-2026)',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XBOM: {
    minYear: 2024,
    maxYear: 2026,
    countryCode: 'IN',
    subdivisionCode: 'MH',
    source: 'date-holidays (IN-MH) + BSE India Equity Segment Trading Holiday Circulars (2024-2026)',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XNYS: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'US',
    source: 'date-holidays (US) filtered by NYSE Rule 7.2 / Intercontinental Exchange Market Holidays',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XNAS: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'US',
    source: 'date-holidays (US) filtered by Nasdaq US Equities Holiday Schedule (NYSE Rule 7.2 aligned)',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XKRX: {
    minYear: 2024,
    maxYear: 2026,
    countryCode: 'KR',
    source: 'date-holidays (KR) + Korea Exchange (KRX) Official Market Closure & Circular Additions (2024-2026)',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XKOS: {
    minYear: 2024,
    maxYear: 2026,
    countryCode: 'KR',
    source: 'date-holidays (KR) + Korea Exchange (KOSDAQ) Official Market Closure & Circular Additions (2024-2026)',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XETR: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'DE',
    source: 'date-holidays (DE) aligned to Deutsche Börse Xetra Trading Calendar',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XLON: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'GB',
    subdivisionCode: 'ENG',
    source: 'date-holidays (GB-ENG) aligned to London Stock Exchange Business Days Calendar',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XPAR: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'FR',
    source: 'date-holidays (FR) aligned to Euronext Cash Markets Trading Calendar',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XAMS: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'NL',
    source: 'date-holidays (NL) aligned to Euronext Amsterdam Trading Calendar',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XBRU: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'BE',
    source: 'date-holidays (BE) aligned to Euronext Brussels Trading Calendar',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XSWX: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'CH',
    source: 'date-holidays (CH) aligned to SIX Swiss Exchange Trading Calendar',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XMAD: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'ES',
    source: 'date-holidays (ES) aligned to Bolsas y Mercados Españoles (BME) Calendar',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XMIL: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'IT',
    source: 'date-holidays (IT) aligned to Borsa Italiana Euronext Milan Calendar',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XCSE: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'DK',
    source: 'date-holidays (DK) aligned to Nasdaq Copenhagen Trading Calendar',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XSTO: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'SE',
    source: 'date-holidays (SE) aligned to Nasdaq Stockholm Trading Calendar',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XHEL: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'FI',
    source: 'date-holidays (FI) aligned to Nasdaq Helsinki Trading Calendar',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XOSL: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'NO',
    source: 'date-holidays (NO) aligned to Euronext Oslo Børs Trading Calendar',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XTKS: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'JP',
    source: 'date-holidays (JP) + JPX Tokyo Stock Exchange Statutory Closures (Jan 2-3, Dec 31)',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XHKG: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'HK',
    source: 'date-holidays (HK) General Holidays aligned to HKEX Securities Market Calendar',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XSHG: {
    minYear: 2024,
    maxYear: 2026,
    countryCode: 'CN',
    source: 'date-holidays (CN) aligned to Shanghai Stock Exchange Statutory Holidays (2024-2026)',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XSHE: {
    minYear: 2024,
    maxYear: 2026,
    countryCode: 'CN',
    source: 'date-holidays (CN) aligned to Shenzhen Stock Exchange Statutory Holidays (2024-2026)',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XTAI: {
    minYear: 2024,
    maxYear: 2026,
    countryCode: 'TW',
    source: 'date-holidays (TW) aligned to Taiwan Stock Exchange (TWSE) Non-Trading Days (2024-2026)',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XTSE: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'CA',
    subdivisionCode: 'ON',
    source: 'date-holidays (CA-ON) aligned to Toronto Stock Exchange (TMX) Holidays',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XASX: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'AU',
    subdivisionCode: 'NSW',
    source: 'date-holidays (AU-NSW) aligned to ASX National Trading Holidays',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XSES: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'SG',
    source: 'date-holidays (SG) aligned to Singapore Exchange (SGX) Securities Holidays',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  BVMF: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'BR',
    source: 'date-holidays (BR) aligned to B3 Brasil Bolsa Balcão Trading Calendar',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XJSE: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'ZA',
    source: 'date-holidays (ZA) aligned to Johannesburg Stock Exchange (JSE) Holidays',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XMEX: {
    minYear: 2020,
    maxYear: 2026,
    countryCode: 'MX',
    source: 'date-holidays (MX) aligned to Bolsa Mexicana de Valores (BMV) Holidays',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  },
  XIDX: {
    minYear: 2024,
    maxYear: 2026,
    countryCode: 'ID',
    source: 'date-holidays (ID) aligned to Indonesia Stock Exchange (IDX) Holidays (2024-2026)',
    retrievedAt: HOLIDAY_DATA_RETRIEVED_AT
  }
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
const holidayClientCache = new Map<string, Holidays>();

function getDateHolidaysClient(countryCode: string, subdivisionCode?: string): Holidays {
  const key = subdivisionCode ? `${countryCode}:${subdivisionCode}` : countryCode;
  let hd = holidayClientCache.get(key);
  if (!hd) {
    hd = subdivisionCode ? new Holidays(countryCode, subdivisionCode) : new Holidays(countryCode);
    holidayClientCache.set(key, hd);
  }
  return hd;
}

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

/**
 * NSE / BSE circulars for lunar and special non-trading days not covered by static IN-MH civil holidays
 * (retrieved from NSE India / BSE India circulars up to 2026-11-24; years outside 2024-2026 fail loudly).
 */
const NSE_BSE_EXCHANGE_CIRCULAR_HOLIDAYS: Record<number, string[]> = {
  2024: [
    '2024-01-22', // Special Market Holiday (Ram Mandir)
    '2024-03-08', // Mahashivratri
    '2024-03-25', // Holi
    '2024-04-11', // Id-Ul-Fitr (Ramzan Id)
    '2024-04-17', // Ram Navami
    '2024-05-20', // General Elections (Mumbai Phase 5)
    '2024-06-17', // Bakri Id
    '2024-07-17', // Muharram
    '2024-11-01', // Diwali Laxmi Pujan
    '2024-11-15'  // Gurunanak Jayanti
  ],
  2025: [
    '2025-02-26', // Mahashivratri
    '2025-03-14', // Holi
    '2025-03-31', // Id-Ul-Fitr
    '2025-04-10', // Mahavir Jayanti
    '2025-08-27', // Ganesh Chaturthi
    '2025-10-02', // Mahatma Gandhi Jayanti / Dussehra
    '2025-10-21', // Diwali Laxmi Pujan
    '2025-10-22', // Diwali Balipratipada
    '2025-11-05'  // Prakash Gurpurb Sri Guru Nanak Dev
  ],
  2026: [
    '2026-03-03', // Holi
    '2026-03-20', // Id-Ul-Fitr
    '2026-03-26', // Ram Navami
    '2026-03-31', // Mahavir Jayanti
    '2026-05-28', // Bakri Id
    '2026-06-26', // Muharram
    '2026-09-14', // Ganesh Chaturthi
    '2026-10-20', // Dussehra
    '2026-11-10', // Diwali Balipratipada
    '2026-11-24'  // Gurunanak Jayanti
  ]
};

/**
 * Korea Exchange (KRX/KOSDAQ) circular additions beyond single-day lunar triggers returned by `date-holidays`:
 * 3-day Seollal/Chuseok multi-day windows, May 1 Labor Day, Dec 31 year-end closure, and statutory/election closures.
 */
const KRX_EXCHANGE_CIRCULAR_ADDITIONS: Record<number, string[]> = {
  2024: ['2024-02-09', '2024-02-12', '2024-04-10', '2024-05-01', '2024-09-16', '2024-09-17', '2024-09-18', '2024-10-01', '2024-12-31'],
  2025: ['2025-01-27', '2025-01-28', '2025-01-29', '2025-01-30', '2025-05-01', '2025-06-03', '2025-10-06', '2025-10-07', '2025-12-31'],
  2026: ['2026-02-16', '2026-02-17', '2026-02-18', '2026-05-01', '2026-06-03', '2026-09-24', '2026-09-25', '2026-12-31']
};

const holidaySetCache = new Map<string, Set<string>>();

export function getExchangeHolidayMetadata(mic: string): ExchangeHolidayCoverageSpec | undefined {
  const upper = mic.trim().toUpperCase();
  return EXCHANGE_HOLIDAY_COVERAGE[upper];
}

export function hasExchangeHolidayCoverage(mic: string, year: number): boolean {
  const cov = getExchangeHolidayMetadata(mic);
  if (!cov) return false;
  return Number.isInteger(year) && year >= cov.minYear && year <= cov.maxYear;
}

export function getExchangeHolidaysForYear(mic: string, year: number): Set<string> {
  const upperMic = mic.trim().toUpperCase();
  const coverage = EXCHANGE_HOLIDAY_COVERAGE[upperMic];
  if (!coverage || !Number.isInteger(year) || year < coverage.minYear || year > coverage.maxYear) {
    throw new MissingExchangeHolidayDataError(
      upperMic,
      year,
      coverage ? { minYear: coverage.minYear, maxYear: coverage.maxYear } : undefined
    );
  }

  const key = `${upperMic}:${year}`;
  const cached = holidaySetCache.get(key);
  if (cached) return cached;

  const hd = getDateHolidaysClient(coverage.countryCode, coverage.subdivisionCode);
  const rawPublic = hd.getHolidays(year).filter((h) => h.type === 'public');
  const holidays = new Set<string>();

  if (upperMic === 'XNYS' || upperMic === 'XNAS') {
    // NYSE Rule 7.2: Federal Columbus Day & Veterans Day are open equity sessions; apply NYSE weekend observation rules
    for (const h of rawPublic) {
      const mmdd = h.date.slice(5, 10);
      const lowerName = (h.name || '').toLowerCase();
      if (lowerName.includes('columbus') || lowerName.includes('veterans')) continue;
      // If New Year's Day falls on Saturday, NYSE does not close on Dec 31 of the preceding year
      if (mmdd === '01-01' && getIsoDateWeekday(`${year}-01-01`) === 6) continue;
      holidays.add(h.date.slice(0, 10));
    }
    const easter = computeEasterSunday(year);
    holidays.add(addCalendarDays(easter, -2)); // Good Friday
    // Check Sat-to-Fri or Sun-to-Mon fixed holidays per Rule 7.2
    for (const [month, day] of [[6, 19], [7, 4], [12, 25]] as const) {
      if (month === 6 && year < 2022) continue;
      const base = formatIsoDateUtc(year, month, day);
      const dow = getIsoDateWeekday(base);
      if (dow === 6) holidays.add(addCalendarDays(base, -1));
      else if (dow === 0) holidays.add(addCalendarDays(base, 1));
    }
    if (getIsoDateWeekday(formatIsoDateUtc(year, 1, 1)) === 0) {
      holidays.add(formatIsoDateUtc(year, 1, 2));
    }
    if (year === 2025) holidays.add('2025-01-09'); // National Day of Mourning (Jimmy Carter)
  } else if (upperMic === 'XNSE' || upperMic === 'XBOM') {
    for (const h of rawPublic) {
      holidays.add(h.date.slice(0, 10));
    }
    for (const d of NSE_BSE_EXCHANGE_CIRCULAR_HOLIDAYS[year] || []) {
      holidays.add(d);
    }
  } else if (upperMic === 'XKRX' || upperMic === 'XKOS') {
    for (const h of rawPublic) {
      const dateStr = h.date.slice(0, 10);
      // KRX remained open on July 17 Constitution Day under statutory trading schedule
      if (dateStr.endsWith('-07-17')) continue;
      holidays.add(dateStr);
    }
    for (const d of KRX_EXCHANGE_CIRCULAR_ADDITIONS[year] || []) {
      holidays.add(d);
    }
  } else if (upperMic === 'XETR') {
    // Deutsche Börse Xetra: New Year's Day, Good Friday, Easter Monday, May 1, Dec 24, Dec 25, Dec 26, Dec 31
    for (const h of rawPublic) {
      const mmdd = h.date.slice(5, 10);
      if (mmdd === '01-01' || mmdd === '05-01' || mmdd === '12-25' || mmdd === '12-26') {
        holidays.add(h.date.slice(0, 10));
      }
    }
    const easter = computeEasterSunday(year);
    holidays.add(addCalendarDays(easter, -2)); // Good Friday
    holidays.add(addCalendarDays(easter, 1));  // Easter Monday
    holidays.add(formatIsoDateUtc(year, 12, 24));
    holidays.add(formatIsoDateUtc(year, 12, 31));
  } else if (upperMic === 'XPAR' || upperMic === 'XAMS' || upperMic === 'XBRU' || upperMic === 'XMAD' || upperMic === 'XMIL' || upperMic === 'XSWX' || upperMic === 'XCSE' || upperMic === 'XSTO' || upperMic === 'XHEL' || upperMic === 'XOSL') {
    // Pan-European cash exchanges: universal Good Friday, Easter Monday, Jan 1, Dec 25 + country-specific market closures
    const easter = computeEasterSunday(year);
    const goodFriday = addCalendarDays(easter, -2);
    const easterMonday = addCalendarDays(easter, 1);
    holidays.add(formatIsoDateUtc(year, 1, 1));
    holidays.add(goodFriday);
    holidays.add(easterMonday);
    if (upperMic !== 'XCSE') {
      holidays.add(formatIsoDateUtc(year, 5, 1));
    }
    holidays.add(formatIsoDateUtc(year, 12, 25));
    if (upperMic !== 'XPAR' && upperMic !== 'XAMS') {
      holidays.add(formatIsoDateUtc(year, 12, 26));
    }
    if (upperMic === 'XCSE' || upperMic === 'XSTO' || upperMic === 'XHEL' || upperMic === 'XOSL' || upperMic === 'XSWX') {
      // Nordic / Swiss public holidays from date-holidays (Ascension, Constitution/National Day, Midsummer/Christmas Eve)
      for (const h of rawPublic) {
        const lowerName = (h.name || '').toLowerCase();
        if (lowerName.includes('ascension') || lowerName.includes('kristi') || lowerName.includes('auffahrt') || lowerName.includes('helatorstai') || lowerName.includes('whit') || lowerName.includes('pfingst') || lowerName.includes('national') || lowerName.includes('constitution') || lowerName.includes('grunnlov')) {
          holidays.add(h.date.slice(0, 10));
        }
      }
      if (upperMic === 'XSTO' || upperMic === 'XHEL' || upperMic === 'XOSL' || upperMic === 'XCSE') {
        holidays.add(formatIsoDateUtc(year, 12, 24));
        holidays.add(formatIsoDateUtc(year, 12, 31));
      }
    }
  } else if (upperMic === 'XTKS') {
    // Tokyo Stock Exchange: all Japanese national public holidays (`date-holidays('JP')`) + Jan 2, Jan 3, Dec 31
    for (const h of rawPublic) {
      holidays.add(h.date.slice(0, 10));
    }
    holidays.add(formatIsoDateUtc(year, 1, 2));
    holidays.add(formatIsoDateUtc(year, 1, 3));
    holidays.add(formatIsoDateUtc(year, 12, 31));
  } else if (upperMic === 'XTSE') {
    // TSX is open on Easter Monday and Boxing Day uses substitute Mon when weekend
    for (const h of rawPublic) {
      const lowerName = (h.name || '').toLowerCase();
      if (lowerName.includes('easter monday')) continue;
      holidays.add(h.date.slice(0, 10));
    }
    for (const [m, d] of [[1, 1], [7, 1], [12, 25], [12, 26]] as const) {
      const dt = formatIsoDateUtc(year, m, d);
      const dow = getIsoDateWeekday(dt);
      if (dow === 6) holidays.add(addCalendarDays(dt, 2));
      else if (dow === 0) holidays.add(addCalendarDays(dt, m === 12 && d === 25 ? 2 : 1));
    }
  } else if (upperMic === 'XASX') {
    for (const h of rawPublic) {
      const lowerName = (h.name || '').toLowerCase();
      // ASX stays open on state Labour Day in NSW (October)
      if (lowerName.includes('labour')) continue;
      holidays.add(h.date.slice(0, 10));
    }
  } else {
    // XHKG, XLON, XSES, BVMF, XJSE, XMEX, XIDX, XSHG, XSHE, XTAI: direct date-holidays public schedule
    for (const h of rawPublic) {
      holidays.add(h.date.slice(0, 10));
    }
    if (upperMic === 'XJSE' || upperMic === 'XSES') {
      const easter = computeEasterSunday(year);
      holidays.add(addCalendarDays(easter, -2));
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
  const year = Number(cleanDate.slice(0, 4));
  if (Number.isFinite(year)) {
    const spec = resolveExchangeCalendar(tickerOrExchange, exchangeHint);
    const holidays = getExchangeHolidaysForYear(spec.mic, year);
    if (dow === 0 || dow === 6) return false;
    return !holidays.has(cleanDate);
  }
  return dow !== 0 && dow !== 6;
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
    {
      ticker: string;
      weightedSum: number;
      totalArticles: number;
      sources: Set<string>;
      languages: Set<string>;
      modelIds: Set<string>;
      updatedAt: string;
    }
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
      if (rec.language) existing.languages.add(rec.language);
      if (rec.modelId) existing.modelIds.add(rec.modelId);
      if (rec.updatedAt > existing.updatedAt) existing.updatedAt = rec.updatedAt;
    } else {
      grouped.set(tradingDate, {
        ticker: rec.ticker,
        weightedSum: rec.credibilityWeightedNetScore * rec.articleCount,
        totalArticles: rec.articleCount,
        sources: new Set([rec.sentimentSource]),
        languages: new Set(rec.language ? [rec.language] : ['en']),
        modelIds: new Set(rec.modelId ? [rec.modelId] : []),
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
            : src === 'multilingual-lexicon'
              ? 'multilingual-lexicon-v1'
              : 'keyword-lexicon-fallback';
    out.push({
      ticker: agg.ticker,
      date,
      credibilityWeightedNetScore: Number(Math.max(-1, Math.min(1, agg.weightedSum / agg.totalArticles)).toFixed(4)),
      articleCount: agg.totalArticles,
      sentimentSource: src,
      language,
      modelId,
      updatedAt: agg.updatedAt
    });
  }

  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}
