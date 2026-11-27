/**
 * Exchange Calendar Exporter (Item 4)
 *
 * Reads maintained upstream exchange calendar definitions from:
 *   1. `gerrymanoim/exchange_calendars@4.13.3` (Apache-2.0 License)
 *   2. `rsheftel/pandas_market_calendars@v5.7.0` (MIT License)
 *   3. `date-holidays@3.39.2` (ISC License, used strictly for 2027 statutory closures on
 *      Asian lunar exchanges whose official 2027 annual circulars have not yet been published
 *      in `exchange_calendars@4.13.3`: XBOM/XNSE, XTAI, XIDX, XSES)
 *
 * Exports verified holiday dates and half-day early-close sessions (2024–2027) for every
 * exchange MIC present in `ticker_master` into `scripts/seeds/exchange_calendars.json`.
 *
 * Usage: npx tsx scripts/syncExchangeCalendars.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import Holidays from 'date-holidays';

const EC_VERSION = '4.13.3';
const PMC_VERSION = '5.7.0';
const DATE_HOLIDAYS_VERSION = '3.39.2';
const RETRIEVED_AT = '2026-11-26';
const MIN_YEAR = 2024;
const MAX_YEAR = 2027;
const YEARS = [2024, 2025, 2026, 2027] as const;

const CACHE_DIR = path.resolve(process.cwd(), '.cache/datasets');
const EC_TARBALL_URL = `https://github.com/gerrymanoim/exchange_calendars/archive/refs/tags/${EC_VERSION}.tar.gz`;
const PMC_TARBALL_URL = `https://github.com/rsheftel/pandas_market_calendars/archive/refs/tags/v${PMC_VERSION}.tar.gz`;

export interface EarlyCloseEntry {
  closeMinutes: number;
  label: string;
}

export interface ExportedExchangeCalendar {
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
  earlyCloses: Record<string, EarlyCloseEntry>;
}

export interface ExchangeCalendarDatasetFile {
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
  exchanges: Record<string, ExportedExchangeCalendar>;
}

async function ensureTarballExtracted(url: string, archiveName: string, folderName: string): Promise<string> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const targetDir = path.join(CACHE_DIR, folderName);
  if (fs.existsSync(targetDir)) {
    return targetDir;
  }

  // Reuse /tmp cache if available in the container
  const tmpAlt =
    folderName.startsWith('exchange_calendars-')
      ? path.join('/tmp/ec', folderName)
      : path.join('/tmp/pmc', folderName);
  if (fs.existsSync(tmpAlt)) {
    return tmpAlt;
  }

  const tarPath = path.join(CACHE_DIR, archiveName);
  if (!fs.existsSync(tarPath)) {
    console.log(`[SyncCalendars] Downloading ${url}...`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(tarPath, buf);
  }
  execFileSync('tar', ['-xzf', tarPath, '-C', CACHE_DIR], { stdio: 'inherit' });
  return targetDir;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function addDays(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0, 0)).toISOString().slice(0, 10);
}

function dowUtc(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0)).getUTCDay(); // 0=Sun..6=Sat
}

function isWeekday(dateStr: string): boolean {
  const d = dowUtc(dateStr);
  return d !== 0 && d !== 6;
}

function easterSunday(year: number): string {
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
  return isoDate(year, month, day);
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): string {
  // weekday: 0=Sun..6=Sat, n >= 1
  const firstDow = dowUtc(isoDate(year, month, 1));
  const offset = (weekday - firstDow + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return isoDate(year, month, day);
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): string {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDow = dowUtc(isoDate(year, month, daysInMonth));
  const back = (lastDow - weekday + 7) % 7;
  return isoDate(year, month, daysInMonth - back);
}

function nearestWorkday(dateStr: string): string {
  const d = dowUtc(dateStr);
  if (d === 6) return addDays(dateStr, -1);
  if (d === 0) return addDays(dateStr, 1);
  return dateStr;
}

function sundayToMonday(dateStr: string): string {
  return dowUtc(dateStr) === 0 ? addDays(dateStr, 1) : dateStr;
}

function weekendToMonday(dateStr: string): string {
  const d = dowUtc(dateStr);
  if (d === 6) return addDays(dateStr, 2);
  if (d === 0) return addDays(dateStr, 1);
  return dateStr;
}

function previousWorkday(dateStr: string): string {
  let cur = dateStr;
  while (!isWeekday(cur)) {
    cur = addDays(cur, -1);
  }
  return cur;
}

function extractIsoDatesInSection(sourceText: string, anchorStart?: string, anchorEnd?: string): string[] {
  let slice = sourceText;
  if (anchorStart) {
    const idx = slice.indexOf(anchorStart);
    if (idx < 0) throw new Error(`Missing anchor "${anchorStart}" in upstream calendar source.`);
    slice = slice.slice(idx);
  }
  if (anchorEnd) {
    const endIdx = slice.indexOf(anchorEnd);
    if (endIdx >= 0) slice = slice.slice(0, endIdx);
  }
  const matches = slice.match(/\b20\d{2}-\d{2}-\d{2}\b/g) || [];
  return Array.from(new Set(matches)).filter((d) => {
    const yr = Number(d.slice(0, 4));
    return yr >= MIN_YEAR && yr <= MAX_YEAR;
  });
}

function groupByYear(dates: Iterable<string>): Record<string, string[]> {
  const out: Record<string, string[]> = { '2024': [], '2025': [], '2026': [], '2027': [] };
  for (const d of dates) {
    const clean = d.slice(0, 10);
    const yr = clean.slice(0, 4);
    if (out[yr] && !out[yr].includes(clean) && isWeekday(clean)) {
      out[yr].push(clean);
    }
  }
  for (const yr of Object.keys(out)) {
    out[yr].sort();
  }
  return out;
}

async function main() {
  const ecRoot = await ensureTarballExtracted(
    EC_TARBALL_URL,
    `exchange_calendars-${EC_VERSION}.tar.gz`,
    `exchange_calendars-${EC_VERSION}`
  );
  await ensureTarballExtracted(
    PMC_TARBALL_URL,
    `pandas_market_calendars-${PMC_VERSION}.tar.gz`,
    `pandas_market_calendars-${PMC_VERSION}`
  );

  const ecMod = path.join(ecRoot, 'exchange_calendars');
  const readEc = (name: string) => fs.readFileSync(path.join(ecMod, name), 'utf8');

  const lunisolarSrc = readEc('lunisolar_holidays.py');
  const commonHolidaysSrc = readEc('common_holidays.py');
  const xbomSrc = readEc('exchange_calendar_xbom.py');
  const xshgSrc = readEc('exchange_calendar_xshg.py');
  const xtaiSrc = readEc('exchange_calendar_xtai.py');
  const xidxSrc = readEc('exchange_calendar_xidx.py');
  const xsesSrc = readEc('exchange_calendar_xses.py');
  const xkrxSrc = readEc('xkrx_holidays.py');
  const xtksSrc = readEc('xtks_holidays.py');
  const xklsSrc = readEc('xkls_holidays.py');
  const xbkkSrc = readEc('xbkk_holidays.py');
  const xnzeSrc = readEc('exchange_calendar_xnze.py');

  // Extracted upstream date arrays
  const cnyDates = extractIsoDatesInSection(lunisolarSrc, 'chinese_lunar_new_year_dates =', 'qingming_festival_dates =');
  const qingmingDates = extractIsoDatesInSection(lunisolarSrc, 'qingming_festival_dates =', 'chinese_buddhas_birthday_dates =');
  const buddhaDates = extractIsoDatesInSection(lunisolarSrc, 'chinese_buddhas_birthday_dates =', 'dragon_boat_festival_dates =');
  const dragonBoatDates = extractIsoDatesInSection(lunisolarSrc, 'dragon_boat_festival_dates =', 'mid_autumn_festival_dates =');
  const midAutumnDates = extractIsoDatesInSection(lunisolarSrc, 'mid_autumn_festival_dates =', 'double_ninth_festival_dates =');
  const doubleNinthDates = extractIsoDatesInSection(lunisolarSrc, 'double_ninth_festival_dates =');

  const eidAlFitrFirst = extractIsoDatesInSection(commonHolidaysSrc, 'eid_al_fitr_first_day =', 'eid_al_adha_first_day =');
  const eidAlAdhaFirst = extractIsoDatesInSection(commonHolidaysSrc, 'eid_al_adha_first_day =');

  const bsePrecomputed = extractIsoDatesInSection(xbomSrc, 'precomputed_bse_holidays =', 'class XBOMExchangeCalendar');
  const shgPrecomputed = extractIsoDatesInSection(xshgSrc, 'precomputed_shanghai_holidays =', 'class XSHGExchangeCalendar');
  const taiPrecomputed = extractIsoDatesInSection(xtaiSrc, 'adhoc_holidays');
  const idxAdhoc = extractIsoDatesInSection(xidxSrc, 'adhoc_holidays');
  const sesPrecomputed = extractIsoDatesInSection(xsesSrc, 'precomputed_ses_holidays =', 'class XSESExchangeCalendar');
  const nzeMatariki = extractIsoDatesInSection(xnzeSrc, 'MatarikiDayDates =', 'Matariki =');

  const ecSource = `gerrymanoim/exchange_calendars@${EC_VERSION} (Apache-2.0)`;
  const ecWithLibrary2027Source = `${ecSource} [2024-2026 official circulars]; date-holidays@${DATE_HOLIDAYS_VERSION} [2027 statutory fallback pending exchange circular]`;

  const exchanges: Record<string, ExportedExchangeCalendar> = {};

  function addCalendar(spec: {
    mic: string;
    code: string;
    timezone: string;
    openMinutes: number;
    closeMinutes: number;
    source: string;
    tentative2027ViaDateHolidays?: boolean;
    computeYear: (year: number) => { holidays: string[]; earlyCloses?: Record<string, EarlyCloseEntry> };
  }) {
    const holidayDates: string[] = [];
    const earlyCloses: Record<string, EarlyCloseEntry> = {};
    for (const yr of YEARS) {
      const res = spec.computeYear(yr);
      for (const h of res.holidays) {
        if (isWeekday(h)) holidayDates.push(h);
      }
      if (res.earlyCloses) {
        for (const [d, ec] of Object.entries(res.earlyCloses)) {
          if (isWeekday(d) && !res.holidays.includes(d)) {
            earlyCloses[d] = ec;
          }
        }
      }
    }
    exchanges[spec.mic] = {
      mic: spec.mic,
      code: spec.code,
      timezone: spec.timezone,
      openMinutes: spec.openMinutes,
      closeMinutes: spec.closeMinutes,
      minYear: MIN_YEAR,
      maxYear: MAX_YEAR,
      source: spec.source,
      retrievedAt: RETRIEVED_AT,
      ...(spec.tentative2027ViaDateHolidays ? { tentative2027ViaDateHolidays: true } : {}),
      holidays: groupByYear(holidayDates),
      earlyCloses
    };
  }

  // 1. XNYS & XNAS (NYSE / NASDAQ — exchange_calendar_xnys.py)
  const buildUsEquitiesYear = (year: number) => {
    const easter = easterSunday(year);
    const holidays = new Set<string>([
      // USNewYearsDay (if Sat, does NOT close Dec 31 prior year per NYSE Rule 7.2)
      ...(dowUtc(isoDate(year, 1, 1)) === 6 ? [] : [sundayToMonday(isoDate(year, 1, 1))]),
      nthWeekdayOfMonth(year, 1, 1, 3), // MLK Jr Day
      nthWeekdayOfMonth(year, 2, 1, 3), // Presidents Day
      addDays(easter, -2), // Good Friday
      lastWeekdayOfMonth(year, 5, 1), // Memorial Day
      nearestWorkday(isoDate(year, 6, 19)), // Juneteenth
      nearestWorkday(isoDate(year, 7, 4)), // Independence Day
      nthWeekdayOfMonth(year, 9, 1, 1), // Labor Day
      nthWeekdayOfMonth(year, 11, 4, 4), // Thanksgiving
      nearestWorkday(isoDate(year, 12, 25)) // Christmas
    ]);
    if (year === 2025) holidays.add('2025-01-09'); // Carter National Day of Mourning

    const earlyCloses: Record<string, EarlyCloseEntry> = {};
    // July 3 if Mon, Tue, Wed, Thu
    const july3 = isoDate(year, 7, 3);
    const july3Dow = dowUtc(july3);
    if (july3Dow >= 1 && july3Dow <= 4 && !holidays.has(july3)) {
      earlyCloses[july3] = { closeMinutes: 13 * 60, label: 'Day Before Independence Day (13:00 ET)' };
    }
    // Black Friday (day after 4th Thursday of Nov)
    const thanksgiving = nthWeekdayOfMonth(year, 11, 4, 4);
    const blackFriday = addDays(thanksgiving, 1);
    earlyCloses[blackFriday] = { closeMinutes: 13 * 60, label: 'Day After Thanksgiving (13:00 ET)' };
    // Christmas Eve
    const xmasEve = isoDate(year, 12, 24);
    if (isWeekday(xmasEve) && !holidays.has(xmasEve)) {
      earlyCloses[xmasEve] = { closeMinutes: 13 * 60, label: 'Christmas Eve (13:00 ET)' };
    }
    return { holidays: Array.from(holidays), earlyCloses };
  };
  addCalendar({
    mic: 'XNYS',
    code: 'NYSE',
    timezone: 'America/New_York',
    openMinutes: 9 * 60 + 30,
    closeMinutes: 16 * 60,
    source: ecSource,
    computeYear: buildUsEquitiesYear
  });
  addCalendar({
    mic: 'XNAS',
    code: 'NASDAQ',
    timezone: 'America/New_York',
    openMinutes: 9 * 60 + 30,
    closeMinutes: 16 * 60,
    source: ecSource,
    computeYear: buildUsEquitiesYear
  });

  // 2. XBOM & XNSE (BSE / NSE India — exchange_calendar_xbom.py through 2026 + date-holidays IN-MH statutory for 2027)
  const hdIn = new Holidays('IN', 'MH');
  const buildIndiaYear = (year: number) => {
    if (year <= 2026) {
      return { holidays: bsePrecomputed.filter((d) => d.startsWith(`${year}-`)) };
    }
    const pub = hdIn
      .getHolidays(year)
      .filter((h) => h.type === 'public')
      .map((h) => h.date.slice(0, 10));
    return { holidays: pub };
  };
  addCalendar({
    mic: 'XNSE',
    code: 'NSE',
    timezone: 'Asia/Kolkata',
    openMinutes: 9 * 60 + 15,
    closeMinutes: 15 * 60 + 30,
    source: ecWithLibrary2027Source,
    tentative2027ViaDateHolidays: true,
    computeYear: buildIndiaYear
  });
  addCalendar({
    mic: 'XBOM',
    code: 'BSE',
    timezone: 'Asia/Kolkata',
    openMinutes: 9 * 60 + 15,
    closeMinutes: 15 * 60 + 30,
    source: ecWithLibrary2027Source,
    tentative2027ViaDateHolidays: true,
    computeYear: buildIndiaYear
  });

  // 3. XLON (London Stock Exchange — exchange_calendar_xlon.py)
  addCalendar({
    mic: 'XLON',
    code: 'LSE',
    timezone: 'Europe/London',
    openMinutes: 8 * 60,
    closeMinutes: 16 * 60 + 30,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      const xmas = isoDate(year, 12, 25);
      const boxing = isoDate(year, 12, 26);
      const holidays = new Set<string>([
        weekendToMonday(isoDate(year, 1, 1)),
        addDays(easter, -2),
        addDays(easter, 1),
        nthWeekdayOfMonth(year, 5, 1, 1), // Early May Bank Holiday
        lastWeekdayOfMonth(year, 5, 1), // Spring Bank Holiday (post-2022 rule)
        lastWeekdayOfMonth(year, 8, 1), // Summer Bank Holiday
        ...(isWeekday(xmas) ? [xmas] : [addDays(xmas, dowUtc(xmas) === 6 ? 2 : 2)]),
        ...(isWeekday(boxing) ? [boxing] : [addDays(boxing, 2)])
      ]);
      const earlyCloses: Record<string, EarlyCloseEntry> = {};
      for (const [m, d, lbl] of [
        [12, 24, 'Christmas Eve (12:30 London)'],
        [12, 31, "New Year's Eve (12:30 London)"]
      ] as const) {
        const dt = isoDate(year, m, d);
        if (isWeekday(dt) && !holidays.has(dt)) {
          earlyCloses[dt] = { closeMinutes: 12 * 60 + 30, label: lbl };
        }
      }
      return { holidays: Array.from(holidays), earlyCloses };
    }
  });

  // 4. XETR (Deutsche Börse Xetra — exchange_calendar_xetr.py)
  addCalendar({
    mic: 'XETR',
    code: 'XETRA',
    timezone: 'Europe/Berlin',
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60 + 30,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      const holidays = [
        isoDate(year, 1, 1),
        addDays(easter, -2),
        addDays(easter, 1),
        isoDate(year, 5, 1),
        isoDate(year, 12, 24),
        isoDate(year, 12, 25),
        isoDate(year, 12, 26),
        isoDate(year, 12, 31)
      ];
      // LastWorkingDay before Dec 31 (weekday on/before Dec 30 because Dec 31 is closed)
      const lastWorkingDay = previousWorkday(isoDate(year, 12, 30));
      return {
        holidays,
        earlyCloses: {
          [lastWorkingDay]: { closeMinutes: 14 * 60, label: 'Year-End Early Close (14:00 CET)' }
        }
      };
    }
  });

  // 5. Euronext XPAR / XAMS / XBRU (14:05 CET early close Dec 24 & Dec 31)
  for (const [mic, tz] of [
    ['XPAR', 'Europe/Paris'],
    ['XAMS', 'Europe/Amsterdam'],
    ['XBRU', 'Europe/Brussels']
  ] as const) {
    addCalendar({
      mic,
      code: 'EURONEXT',
      timezone: tz,
      openMinutes: 9 * 60,
      closeMinutes: 17 * 60 + 30,
      source: ecSource,
      computeYear: (year) => {
        const easter = easterSunday(year);
        const holidays = [
          isoDate(year, 1, 1),
          addDays(easter, -2),
          addDays(easter, 1),
          isoDate(year, 5, 1),
          isoDate(year, 12, 25),
          isoDate(year, 12, 26)
        ];
        const earlyCloses: Record<string, EarlyCloseEntry> = {};
        for (const [m, d, lbl] of [
          [12, 24, 'Christmas Eve (14:05 CET)'],
          [12, 31, "New Year's Eve (14:05 CET)"]
        ] as const) {
          const dt = isoDate(year, m, d);
          if (isWeekday(dt) && !holidays.includes(dt)) {
            earlyCloses[dt] = { closeMinutes: 14 * 60 + 5, label: lbl };
          }
        }
        return { holidays, earlyCloses };
      }
    });
  }

  // 6. XLIS (Euronext Lisbon — exchange_calendar_xlis.py)
  addCalendar({
    mic: 'XLIS',
    code: 'EURONEXT',
    timezone: 'Europe/Lisbon',
    openMinutes: 8 * 60,
    closeMinutes: 16 * 60 + 30,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      const holidays = [
        isoDate(year, 1, 1),
        addDays(easter, -2),
        addDays(easter, 1),
        isoDate(year, 5, 1),
        isoDate(year, 12, 25),
        isoDate(year, 12, 26)
      ];
      const earlyCloses: Record<string, EarlyCloseEntry> = {};
      for (const [m, d, lbl] of [
        [12, 24, 'Christmas Eve (13:05 WET)'],
        [12, 31, "New Year's Eve (13:05 WET)"]
      ] as const) {
        const dt = isoDate(year, m, d);
        if (isWeekday(dt) && !holidays.includes(dt)) {
          earlyCloses[dt] = { closeMinutes: 13 * 60 + 5, label: lbl };
        }
      }
      return { holidays, earlyCloses };
    }
  });

  // 7. XDUB (Euronext Dublin — exchange_calendar_xdub.py)
  addCalendar({
    mic: 'XDUB',
    code: 'EURONEXT',
    timezone: 'Europe/Dublin',
    openMinutes: 8 * 60,
    closeMinutes: 16 * 60 + 28,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      const xmas = isoDate(year, 12, 25);
      const boxing = isoDate(year, 12, 26);
      const holidays = [
        weekendToMonday(isoDate(year, 1, 1)),
        addDays(easter, -2),
        addDays(easter, 1),
        isoDate(year, 5, 1),
        ...(isWeekday(xmas) ? [xmas] : [addDays(xmas, 2)]),
        ...(isWeekday(boxing) ? [boxing] : [addDays(boxing, 2)])
      ];
      const earlyCloses: Record<string, EarlyCloseEntry> = {};
      for (const [m, d, lbl] of [
        [12, 24, 'Christmas Eve (12:28 IST)'],
        [12, 31, "New Year's Eve (12:28 IST)"]
      ] as const) {
        const dt = isoDate(year, m, d);
        if (isWeekday(dt) && !holidays.includes(dt)) {
          earlyCloses[dt] = { closeMinutes: 12 * 60 + 28, label: lbl };
        }
      }
      return { holidays, earlyCloses };
    }
  });

  // 8. XSWX (SIX Swiss — exchange_calendar_xswx.py)
  addCalendar({
    mic: 'XSWX',
    code: 'SIX',
    timezone: 'Europe/Zurich',
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60 + 30,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      return {
        holidays: [
          isoDate(year, 1, 1),
          isoDate(year, 1, 2),
          addDays(easter, -2),
          addDays(easter, 1),
          isoDate(year, 5, 1),
          addDays(easter, 39), // Ascension
          addDays(easter, 50), // Whit Monday
          isoDate(year, 8, 1),
          isoDate(year, 12, 24),
          isoDate(year, 12, 25),
          isoDate(year, 12, 26),
          isoDate(year, 12, 31)
        ]
      };
    }
  });

  // 9. XMAD (BME Madrid — exchange_calendar_xmad.py)
  addCalendar({
    mic: 'XMAD',
    code: 'BME',
    timezone: 'Europe/Madrid',
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60 + 30,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      const holidays = [
        isoDate(year, 1, 1),
        addDays(easter, -2),
        addDays(easter, 1),
        isoDate(year, 5, 1),
        isoDate(year, 12, 25),
        isoDate(year, 12, 26)
      ];
      const earlyCloses: Record<string, EarlyCloseEntry> = {};
      for (const [m, d, lbl] of [
        [12, 24, 'Christmas Eve (14:00 CET)'],
        [12, 31, "New Year's Eve (14:00 CET)"]
      ] as const) {
        const dt = isoDate(year, m, d);
        if (isWeekday(dt) && !holidays.includes(dt)) {
          earlyCloses[dt] = { closeMinutes: 14 * 60, label: lbl };
        }
      }
      return { holidays, earlyCloses };
    }
  });

  // 10. XMIL (Euronext Milan — exchange_calendar_xmil.py)
  addCalendar({
    mic: 'XMIL',
    code: 'MIL',
    timezone: 'Europe/Rome',
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60 + 30,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      return {
        holidays: [
          isoDate(year, 1, 1),
          addDays(easter, -2),
          addDays(easter, 1),
          isoDate(year, 5, 1),
          isoDate(year, 8, 15),
          isoDate(year, 12, 24),
          isoDate(year, 12, 25),
          isoDate(year, 12, 26),
          isoDate(year, 12, 31)
        ]
      };
    }
  });

  // 11. Nordics (XCSE, XSTO, XHEL, XOSL)
  addCalendar({
    mic: 'XCSE',
    code: 'NASDAQ NORDIC',
    timezone: 'Europe/Copenhagen',
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      return {
        holidays: [
          isoDate(year, 1, 1),
          addDays(easter, -3), // Maundy Thursday
          addDays(easter, -2),
          addDays(easter, 1),
          addDays(easter, 39), // Ascension
          addDays(easter, 40), // Day after Ascension (Bank Holiday)
          addDays(easter, 50), // Whit Monday
          isoDate(year, 6, 5), // Constitution Day
          isoDate(year, 12, 24),
          isoDate(year, 12, 25),
          isoDate(year, 12, 26),
          isoDate(year, 12, 31)
        ]
      };
    }
  });
  addCalendar({
    mic: 'XSTO',
    code: 'NASDAQ NORDIC',
    timezone: 'Europe/Stockholm',
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60 + 30,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      // Midsummer Eve: Friday between June 19 and June 25
      let midsummerEve = isoDate(year, 6, 19);
      for (let d = 19; d <= 25; d++) {
        const cand = isoDate(year, 6, d);
        if (dowUtc(cand) === 5) {
          midsummerEve = cand;
          break;
        }
      }
      // All Saints' Eve: Friday before All Saints' Day (Sat between Oct 31 and Nov 6) -> Friday between Oct 30 and Nov 5
      let allSaintsEve = isoDate(year, 10, 31);
      for (let d = 0; d <= 6; d++) {
        const cand = addDays(isoDate(year, 10, 30), d);
        if (dowUtc(cand) === 5) {
          allSaintsEve = cand;
          break;
        }
      }
      const holidays = [
        isoDate(year, 1, 1),
        isoDate(year, 1, 6), // Epiphany
        addDays(easter, -2),
        addDays(easter, 1),
        isoDate(year, 5, 1),
        addDays(easter, 39), // Ascension
        isoDate(year, 6, 6), // National Day
        midsummerEve,
        isoDate(year, 12, 24),
        isoDate(year, 12, 25),
        isoDate(year, 12, 26),
        isoDate(year, 12, 31)
      ];
      const earlyCloses: Record<string, EarlyCloseEntry> = {};
      const ecCandidates: Array<[string, string]> = [
        [isoDate(year, 1, 5), 'Day Before Epiphany (13:00 CET)'],
        [addDays(easter, -3), 'Maundy Thursday (13:00 CET)'],
        [isoDate(year, 4, 30), 'Walpurgis Night / Day Before Labour Day (13:00 CET)'],
        [addDays(easter, 38), 'Day Before Ascension Day (13:00 CET)'],
        [allSaintsEve, "All Saints' Eve (13:00 CET)"]
      ];
      for (const [d, lbl] of ecCandidates) {
        if (isWeekday(d) && !holidays.includes(d)) {
          earlyCloses[d] = { closeMinutes: 13 * 60, label: lbl };
        }
      }
      return { holidays, earlyCloses };
    }
  });
  addCalendar({
    mic: 'XHEL',
    code: 'NASDAQ NORDIC',
    timezone: 'Europe/Helsinki',
    openMinutes: 10 * 60,
    closeMinutes: 18 * 60 + 30,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      let midsummerEve = isoDate(year, 6, 19);
      for (let d = 19; d <= 25; d++) {
        const cand = isoDate(year, 6, d);
        if (dowUtc(cand) === 5) {
          midsummerEve = cand;
          break;
        }
      }
      return {
        holidays: [
          isoDate(year, 1, 1),
          isoDate(year, 1, 6),
          addDays(easter, -2),
          addDays(easter, 1),
          isoDate(year, 5, 1),
          addDays(easter, 39),
          midsummerEve,
          isoDate(year, 12, 6), // Independence Day
          isoDate(year, 12, 24),
          isoDate(year, 12, 25),
          isoDate(year, 12, 26),
          isoDate(year, 12, 31)
        ]
      };
    }
  });
  addCalendar({
    mic: 'XOSL',
    code: 'OSLO',
    timezone: 'Europe/Oslo',
    openMinutes: 9 * 60,
    closeMinutes: 16 * 60 + 20,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      const holidays = [
        isoDate(year, 1, 1),
        addDays(easter, -3), // Maundy Thursday
        addDays(easter, -2),
        addDays(easter, 1),
        isoDate(year, 5, 1),
        isoDate(year, 5, 17), // Constitution Day
        addDays(easter, 39),
        addDays(easter, 50),
        isoDate(year, 12, 24),
        isoDate(year, 12, 25),
        isoDate(year, 12, 26),
        isoDate(year, 12, 31)
      ];
      const holyWed = addDays(easter, -4);
      return {
        holidays,
        earlyCloses: isWeekday(holyWed)
          ? { [holyWed]: { closeMinutes: 13 * 60, label: 'Holy Wednesday (13:00 CET)' } }
          : {}
      };
    }
  });

  // 12. XWAR (Warsaw — exchange_calendar_xwar.py) & XWBO (Vienna — exchange_calendar_xwbo.py)
  addCalendar({
    mic: 'XWAR',
    code: 'WSE',
    timezone: 'Europe/Warsaw',
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      return {
        holidays: [
          isoDate(year, 1, 1),
          isoDate(year, 1, 6),
          addDays(easter, -2),
          addDays(easter, 1),
          isoDate(year, 5, 1),
          isoDate(year, 5, 3),
          addDays(easter, 60), // Corpus Christi
          isoDate(year, 8, 15),
          isoDate(year, 11, 1),
          isoDate(year, 11, 11),
          isoDate(year, 12, 24),
          isoDate(year, 12, 25),
          isoDate(year, 12, 26),
          isoDate(year, 12, 31)
        ]
      };
    }
  });
  addCalendar({
    mic: 'XWBO',
    code: 'VIE',
    timezone: 'Europe/Vienna',
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60 + 30,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      const holidays = [
        isoDate(year, 1, 1),
        isoDate(year, 1, 6),
        addDays(easter, -2),
        addDays(easter, 1),
        isoDate(year, 5, 1),
        addDays(easter, 39),
        addDays(easter, 50),
        addDays(easter, 60),
        isoDate(year, 8, 15),
        isoDate(year, 10, 26),
        isoDate(year, 11, 1),
        isoDate(year, 12, 8),
        isoDate(year, 12, 24),
        isoDate(year, 12, 25),
        isoDate(year, 12, 26),
        isoDate(year, 12, 31)
      ];
      const lastWorking = previousWorkday(isoDate(year, 12, 30));
      return {
        holidays,
        earlyCloses: {
          [lastWorking]: { closeMinutes: 14 * 60 + 15, label: 'Year-End Early Close (14:15 CET)' }
        }
      };
    }
  });

  // 13. XIST (Borsa Istanbul — exchange_calendar_xist.py + common_holidays.py Eid)
  addCalendar({
    mic: 'XIST',
    code: 'BIST',
    timezone: 'Europe/Istanbul',
    openMinutes: 10 * 60,
    closeMinutes: 18 * 60,
    source: ecSource,
    computeYear: (year) => {
      const holidays: string[] = [
        isoDate(year, 1, 1),
        isoDate(year, 4, 23),
        isoDate(year, 5, 1),
        isoDate(year, 5, 19),
        isoDate(year, 7, 15),
        isoDate(year, 8, 30),
        isoDate(year, 10, 29)
      ];
      const earlyCloses: Record<string, EarlyCloseEntry> = {};
      for (const f of eidAlFitrFirst.filter((d) => d.startsWith(`${year}-`))) {
        holidays.push(f, addDays(f, 1), addDays(f, 2));
        const eve = addDays(f, -1);
        if (isWeekday(eve)) earlyCloses[eve] = { closeMinutes: 12 * 60 + 30, label: 'Eid al-Fitr Eve (12:30 TRT)' };
      }
      for (const f of eidAlAdhaFirst.filter((d) => d.startsWith(`${year}-`))) {
        holidays.push(f, addDays(f, 1), addDays(f, 2), addDays(f, 3));
        const eve = addDays(f, -1);
        if (isWeekday(eve)) earlyCloses[eve] = { closeMinutes: 12 * 60 + 30, label: 'Eid al-Adha Eve (12:30 TRT)' };
      }
      const repEve = isoDate(year, 10, 28);
      if (isWeekday(repEve) && !holidays.includes(repEve)) {
        earlyCloses[repEve] = { closeMinutes: 12 * 60 + 30, label: 'Republic Day Eve (12:30 TRT)' };
      }
      return { holidays, earlyCloses };
    }
  });

  // 14. XTKS (Tokyo Stock Exchange — exchange_calendar_xtks.py + xtks_holidays.py)
  const xtksVernal = extractIsoDatesInSection(xtksSrc, 'VernalEquinoxes =', 'ChildrensDay =');
  const xtksAutumnal = extractIsoDatesInSection(xtksSrc, 'AutumnalEquinoxes =', 'CitizensHolidaySilverWeek =');
  const xtksCitizens = extractIsoDatesInSection(xtksSrc, 'CitizensHolidaySilverWeek =', 'RespectForTheAgedDayThrough2002 =');
  const xtksEquinoxes = [...xtksVernal, ...xtksAutumnal, ...xtksCitizens];
  const hdJp = new Holidays('JP');
  addCalendar({
    mic: 'XTKS',
    code: 'TSE',
    timezone: 'Asia/Tokyo',
    openMinutes: 9 * 60,
    closeMinutes: 15 * 60 + 30,
    source: ecSource,
    computeYear: (year) => {
      const jpPublic = hdJp
        .getHolidays(year)
        .filter((h) => h.type === 'public')
        .map((h) => h.date.slice(0, 10));
      const eq = xtksEquinoxes.filter((d) => d.startsWith(`${year}-`));
      return {
        holidays: Array.from(
          new Set([
            ...jpPublic,
            ...eq,
            isoDate(year, 1, 1),
            isoDate(year, 1, 2),
            isoDate(year, 1, 3),
            isoDate(year, 12, 31)
          ])
        )
      };
    }
  });

  // 15. XHKG (HKEX — exchange_calendar_xhkg.py + lunisolar_holidays.py + date-holidays HK statutory rules)
  const hdHk = new Holidays('HK');
  addCalendar({
    mic: 'XHKG',
    code: 'HKEX',
    timezone: 'Asia/Hong_Kong',
    openMinutes: 9 * 60 + 30,
    closeMinutes: 16 * 60,
    source: ecSource,
    computeYear: (year) => {
      const hkPublic = hdHk
        .getHolidays(year)
        .filter((h) => h.type === 'public')
        .map((h) => h.date.slice(0, 10));
      const cnyYear = cnyDates.find((d) => d.startsWith(`${year}-`));
      const qm = qingmingDates.find((d) => d.startsWith(`${year}-`));
      const db = dragonBoatDates.find((d) => d.startsWith(`${year}-`));
      const mid = midAutumnDates.find((d) => d.startsWith(`${year}-`));
      const dn = doubleNinthDates.find((d) => d.startsWith(`${year}-`));
      const bd = buddhaDates.find((d) => d.startsWith(`${year}-`));
      const holidays = new Set<string>([
        ...hkPublic,
        ...(qm ? [sundayToMonday(qm)] : []),
        ...(bd ? [sundayToMonday(bd)] : []),
        ...(db ? [sundayToMonday(db)] : []),
        ...(mid ? [sundayToMonday(addDays(mid, 1))] : []),
        ...(dn ? [sundayToMonday(dn)] : [])
      ]);
      const earlyCloses: Record<string, EarlyCloseEntry> = {};
      if (cnyYear) {
        const cnyEve = addDays(cnyYear, -1);
        if (isWeekday(cnyEve) && !holidays.has(cnyEve)) {
          earlyCloses[cnyEve] = { closeMinutes: 12 * 60, label: "Lunar New Year's Eve (12:00 HKT)" };
        }
      }
      for (const [m, d, lbl] of [
        [12, 24, 'Christmas Eve (12:00 HKT)'],
        [12, 31, "New Year's Eve (12:00 HKT)"]
      ] as const) {
        const dt = isoDate(year, m, d);
        if (isWeekday(dt) && !holidays.has(dt)) {
          earlyCloses[dt] = { closeMinutes: 12 * 60, label: lbl };
        }
      }
      return { holidays: Array.from(holidays), earlyCloses };
    }
  });

  // 16. XKRX & XKOS (KRX / KOSDAQ — xkrx_holidays.py + date-holidays KR lunar anchors)
  const krxAdhoc = extractIsoDatesInSection(xkrxSrc, 'manually_added_holidays =', 'precomputed_krx_holidays =');
  const hdKr = new Holidays('KR');
  const buildKrxYear = (year: number) => {
    const krPublic = hdKr
      .getHolidays(year)
      .filter((h) => h.type === 'public')
      .map((h) => h.date.slice(0, 10))
      .filter((d) => !d.endsWith('-07-17')); // KRX remains open on July 17 Constitution Day
    const holidays = new Set<string>([
      ...krPublic,
      ...krxAdhoc.filter((d) => d.startsWith(`${year}-`)),
      isoDate(year, 5, 1), // KRX Labor Day closure
      isoDate(year, 12, 31) // KRX Year-end market closure
    ]);
    // 3-day Seollal & Chuseok windows from date-holidays anchors
    for (const h of hdKr.getHolidays(year)) {
      const nm = (h.name || '').toLowerCase();
      const baseDate = h.date.slice(0, 10);
      if (nm.includes('설날') && !nm.includes('대체')) {
        holidays.add(addDays(baseDate, -1));
        holidays.add(baseDate);
        holidays.add(addDays(baseDate, 1));
      } else if (nm.includes('추석') && !nm.includes('대체')) {
        holidays.add(addDays(baseDate, -1));
        holidays.add(baseDate);
        holidays.add(addDays(baseDate, 1));
      }
    }
    return { holidays: Array.from(holidays) };
  };
  addCalendar({
    mic: 'XKRX',
    code: 'KRX',
    timezone: 'Asia/Seoul',
    openMinutes: 9 * 60,
    closeMinutes: 15 * 60 + 30,
    source: ecSource,
    computeYear: buildKrxYear
  });
  addCalendar({
    mic: 'XKOS',
    code: 'KOSDAQ',
    timezone: 'Asia/Seoul',
    openMinutes: 9 * 60,
    closeMinutes: 15 * 60 + 30,
    source: ecSource,
    computeYear: buildKrxYear
  });

  // 17. XSHG & XSHE (SSE / SZSE — exchange_calendar_xshg.py 2024-2026 + date-holidays CN 2027)
  const hdCn = new Holidays('CN');
  const buildChinaYear = (year: number) => {
    if (year <= 2026) {
      return { holidays: shgPrecomputed.filter((d) => d.startsWith(`${year}-`)) };
    }
    const cny27 = cnyDates.find((d) => d.startsWith(`${year}-`));
    const qm27 = qingmingDates.find((d) => d.startsWith(`${year}-`));
    const db27 = dragonBoatDates.find((d) => d.startsWith(`${year}-`));
    const mid27 = midAutumnDates.find((d) => d.startsWith(`${year}-`));
    const cnPub = hdCn
      .getHolidays(year)
      .filter((h) => h.type === 'public')
      .map((h) => h.date.slice(0, 10));
    const holidays = new Set<string>([
      ...cnPub,
      ...(cny27 ? [cny27, addDays(cny27, 1), addDays(cny27, 2)] : []),
      ...(qm27 ? [qm27] : []),
      ...(db27 ? [db27] : []),
      ...(mid27 ? [mid27] : []),
      isoDate(year, 1, 1),
      isoDate(year, 5, 1),
      isoDate(year, 10, 1),
      isoDate(year, 10, 2),
      isoDate(year, 10, 3),
      isoDate(year, 10, 4),
      isoDate(year, 10, 5)
    ]);
    return { holidays: Array.from(holidays) };
  };
  addCalendar({
    mic: 'XSHG',
    code: 'SSE',
    timezone: 'Asia/Shanghai',
    openMinutes: 9 * 60 + 30,
    closeMinutes: 15 * 60,
    source: `${ecSource} [2024-2026 official announcements]; pandas_market_calendars@${PMC_VERSION} + date-holidays@${DATE_HOLIDAYS_VERSION} [2027 statutory]`,
    computeYear: buildChinaYear
  });
  addCalendar({
    mic: 'XSHE',
    code: 'SZSE',
    timezone: 'Asia/Shanghai',
    openMinutes: 9 * 60 + 30,
    closeMinutes: 15 * 60,
    source: `${ecSource} [2024-2026 official announcements]; pandas_market_calendars@${PMC_VERSION} + date-holidays@${DATE_HOLIDAYS_VERSION} [2027 statutory]`,
    computeYear: buildChinaYear
  });

  // 18. XTAI (TWSE — exchange_calendar_xtai.py + date-holidays TW)
  const hdTw = new Holidays('TW');
  addCalendar({
    mic: 'XTAI',
    code: 'TWSE',
    timezone: 'Asia/Taipei',
    openMinutes: 9 * 60,
    closeMinutes: 13 * 60 + 30,
    source: ecWithLibrary2027Source,
    tentative2027ViaDateHolidays: true,
    computeYear: (year) => {
      const twPub = hdTw
        .getHolidays(year)
        .filter((h) => h.type === 'public')
        .map((h) => h.date.slice(0, 10));
      const adhoc = taiPrecomputed.filter((d) => d.startsWith(`${year}-`));
      return { holidays: Array.from(new Set([...twPub, ...adhoc])) };
    }
  });

  // 19. XTSE (TSX Canada — exchange_calendar_xtse.py)
  addCalendar({
    mic: 'XTSE',
    code: 'TSX',
    timezone: 'America/Toronto',
    openMinutes: 9 * 60 + 30,
    closeMinutes: 16 * 60,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      // Victoria Day: last Monday strictly before May 25
      let victoria = isoDate(year, 5, 24);
      while (dowUtc(victoria) !== 1) victoria = addDays(victoria, -1);
      const xmas = isoDate(year, 12, 25);
      const boxing = isoDate(year, 12, 26);
      const holidays = [
        weekendToMonday(isoDate(year, 1, 1)), // New Year's Day
        nthWeekdayOfMonth(year, 2, 1, 3), // Family Day (ON)
        addDays(easter, -2), // Good Friday
        victoria,
        weekendToMonday(isoDate(year, 7, 1)), // Canada Day
        nthWeekdayOfMonth(year, 8, 1, 1), // Civic Holiday
        nthWeekdayOfMonth(year, 9, 1, 1), // Labour Day
        nthWeekdayOfMonth(year, 10, 1, 2), // Thanksgiving
        ...(isWeekday(xmas) ? [xmas] : [addDays(xmas, dowUtc(xmas) === 6 ? 2 : 2)]),
        ...(isWeekday(boxing) ? [boxing] : [addDays(boxing, 2)])
      ];
      const earlyCloses: Record<string, EarlyCloseEntry> = {};
      const dec24 = isoDate(year, 12, 24);
      if (isWeekday(dec24) && !holidays.includes(dec24)) {
        earlyCloses[dec24] = { closeMinutes: 13 * 60, label: 'Christmas Eve (13:00 ET)' };
      }
      return { holidays, earlyCloses };
    }
  });

  // 20. XASX (ASX Australia — exchange_calendar_xasx.py)
  addCalendar({
    mic: 'XASX',
    code: 'ASX',
    timezone: 'Australia/Sydney',
    openMinutes: 10 * 60,
    closeMinutes: 16 * 60,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      const xmas = isoDate(year, 12, 25);
      const boxing = isoDate(year, 12, 26);
      const holidays = [
        weekendToMonday(isoDate(year, 1, 1)),
        weekendToMonday(isoDate(year, 1, 26)), // Australia Day
        addDays(easter, -2),
        addDays(easter, 1),
        isoDate(year, 4, 25), // Anzac Day
        nthWeekdayOfMonth(year, 6, 1, 2), // King's Birthday (NSW)
        ...(isWeekday(xmas) ? [xmas] : [addDays(xmas, 2)]),
        ...(isWeekday(boxing) ? [boxing] : [addDays(boxing, 2)])
      ];
      const beforeXmas = previousWorkday(isoDate(year, 12, 24));
      const beforeNye = previousWorkday(isoDate(year, 12, 31));
      const earlyCloses: Record<string, EarlyCloseEntry> = {
        [beforeXmas]: { closeMinutes: 14 * 60 + 10, label: 'Last Trading Day Before Christmas (14:10 AET)' },
        [beforeNye]: { closeMinutes: 14 * 60 + 10, label: 'Last Trading Day of Year (14:10 AET)' }
      };
      return { holidays, earlyCloses };
    }
  });

  // 21. XNZE (NZX New Zealand — exchange_calendar_xnze.py)
  addCalendar({
    mic: 'XNZE',
    code: 'NZX',
    timezone: 'Pacific/Auckland',
    openMinutes: 10 * 60,
    closeMinutes: 16 * 60 + 45,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      const xmas = isoDate(year, 12, 25);
      const boxing = isoDate(year, 12, 26);
      const matariki = nzeMatariki.filter((d) => d.startsWith(`${year}-`));
      const holidays = [
        weekendToMonday(isoDate(year, 1, 1)),
        weekendToMonday(isoDate(year, 1, 2)),
        weekendToMonday(isoDate(year, 2, 6)), // Waitangi Day
        addDays(easter, -2),
        addDays(easter, 1),
        weekendToMonday(isoDate(year, 4, 25)), // Anzac Day
        nthWeekdayOfMonth(year, 6, 1, 1), // King's Birthday
        ...matariki,
        nthWeekdayOfMonth(year, 10, 1, 4), // Labour Day
        ...(isWeekday(xmas) ? [xmas] : [addDays(xmas, 2)]),
        ...(isWeekday(boxing) ? [boxing] : [addDays(boxing, 2)])
      ];
      const earlyCloses: Record<string, EarlyCloseEntry> = {};
      for (const [m, d, lbl] of [
        [12, 24, 'Christmas Eve (12:45 NZT)'],
        [12, 31, "New Year's Eve (12:45 NZT)"]
      ] as const) {
        const dt = isoDate(year, m, d);
        if (isWeekday(dt) && !holidays.includes(dt)) {
          earlyCloses[dt] = { closeMinutes: 12 * 60 + 45, label: lbl };
        }
      }
      return { holidays, earlyCloses };
    }
  });

  // 22. XSES (SGX — exchange_calendar_xses.py through 2026 + date-holidays SG 2027)
  const hdSg = new Holidays('SG');
  addCalendar({
    mic: 'XSES',
    code: 'SGX',
    timezone: 'Asia/Singapore',
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60,
    source: ecWithLibrary2027Source,
    tentative2027ViaDateHolidays: true,
    computeYear: (year) => {
      if (year <= 2026) {
        return { holidays: sesPrecomputed.filter((d) => d.startsWith(`${year}-`)) };
      }
      const sgPub = hdSg
        .getHolidays(year)
        .filter((h) => h.type === 'public')
        .map((h) => h.date.slice(0, 10));
      return { holidays: sgPub };
    }
  });

  // 23. XKLS (Bursa Malaysia — exchange_calendar_xkls.py + xkls_holidays.py)
  const klsAllDates = extractIsoDatesInSection(xklsSrc);
  const klsCnyEves = extractIsoDatesInSection(xklsSrc, 'ChineseNewYearsHalfDay =', 'EidAlFitrHalfDay =');
  const klsEidEves = extractIsoDatesInSection(xklsSrc, 'EidAlFitrHalfDay =');
  const hdMy = new Holidays('MY');
  addCalendar({
    mic: 'XKLS',
    code: 'MYX',
    timezone: 'Asia/Kuala_Lumpur',
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60,
    source: ecSource,
    computeYear: (year) => {
      const myPub = hdMy
        .getHolidays(year)
        .filter((h) => h.type === 'public')
        .map((h) => h.date.slice(0, 10));
      const cnyYear = cnyDates.find((d) => d.startsWith(`${year}-`));
      const holidays = Array.from(
        new Set([
          ...myPub,
          ...klsAllDates.filter((d) => d.startsWith(`${year}-`)),
          ...(cnyYear ? [sundayToMonday(cnyYear), sundayToMonday(addDays(cnyYear, 1))] : []),
          isoDate(year, 1, 1),
          isoDate(year, 5, 1),
          isoDate(year, 8, 31),
          isoDate(year, 9, 16),
          isoDate(year, 12, 25)
        ])
      );
      const earlyCloses: Record<string, EarlyCloseEntry> = {};
      for (const eve of [...klsCnyEves, ...klsEidEves]) {
        if (eve.startsWith(`${year}-`) && isWeekday(eve) && !holidays.includes(eve)) {
          earlyCloses[eve] = { closeMinutes: 12 * 60 + 30, label: 'Eve Early Close (12:30 MYT)' };
        }
      }
      return { holidays, earlyCloses };
    }
  });

  // 24. XBKK (Stock Exchange of Thailand — exchange_calendar_xbkk.py + xbkk_holidays.py)
  const bkkAllDates = extractIsoDatesInSection(xbkkSrc);
  const hdTh = new Holidays('TH');
  addCalendar({
    mic: 'XBKK',
    code: 'SET',
    timezone: 'Asia/Bangkok',
    openMinutes: 10 * 60,
    closeMinutes: 16 * 60 + 30,
    source: ecSource,
    computeYear: (year) => {
      const thPub = hdTh
        .getHolidays(year)
        .filter((h) => h.type === 'public')
        .map((h) => h.date.slice(0, 10));
      return {
        holidays: Array.from(new Set([...thPub, ...bkkAllDates.filter((d) => d.startsWith(`${year}-`))]))
      };
    }
  });

  // 25. BVMF (Brazil B3), XJSE (South Africa JSE), XMEX (Mexico BMV), XIDX (Indonesia IDX)
  addCalendar({
    mic: 'BVMF',
    code: 'B3',
    timezone: 'America/Sao_Paulo',
    openMinutes: 10 * 60,
    closeMinutes: 17 * 60,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      return {
        holidays: [
          isoDate(year, 1, 1),
          addDays(easter, -48), // Carnaval Mon
          addDays(easter, -47), // Carnaval Tue
          addDays(easter, -2),  // Good Friday
          isoDate(year, 4, 21), // Tiradentes
          isoDate(year, 5, 1),  // Labour Day
          addDays(easter, 60),  // Corpus Christi
          isoDate(year, 9, 7),  // Independence Day
          isoDate(year, 10, 12), // Nossa Senhora Aparecida
          isoDate(year, 11, 2), // Finados
          isoDate(year, 11, 15), // Proclamacao da Republica
          isoDate(year, 11, 20), // Consciencia Negra (national from 2024)
          isoDate(year, 12, 24),
          isoDate(year, 12, 25),
          isoDate(year, 12, 31)
        ]
      };
    }
  });

  const hdZa = new Holidays('ZA');
  addCalendar({
    mic: 'XJSE',
    code: 'JSE',
    timezone: 'Africa/Johannesburg',
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      const zaPub = hdZa
        .getHolidays(year)
        .filter((h) => h.type === 'public')
        .map((h) => h.date.slice(0, 10));
      return {
        holidays: Array.from(new Set([...zaPub, addDays(easter, -2), addDays(easter, 1)]))
      };
    }
  });

  addCalendar({
    mic: 'XMEX',
    code: 'BMV',
    timezone: 'America/Mexico_City',
    openMinutes: 8 * 60 + 30,
    closeMinutes: 15 * 60,
    source: ecSource,
    computeYear: (year) => {
      const easter = easterSunday(year);
      return {
        holidays: [
          isoDate(year, 1, 1),
          nthWeekdayOfMonth(year, 2, 1, 1), // Constitution Day observed
          nthWeekdayOfMonth(year, 3, 1, 3), // Benito Juarez observed
          addDays(easter, -3), // Maundy Thursday
          addDays(easter, -2), // Good Friday
          isoDate(year, 5, 1),
          isoDate(year, 9, 16), // Independence Day
          isoDate(year, 11, 2), // All Souls
          nthWeekdayOfMonth(year, 11, 1, 3), // Revolution Day observed
          isoDate(year, 12, 12), // Banking Holiday
          isoDate(year, 12, 25)
        ]
      };
    }
  });

  const hdId = new Holidays('ID');
  addCalendar({
    mic: 'XIDX',
    code: 'IDX',
    timezone: 'Asia/Jakarta',
    openMinutes: 9 * 60,
    closeMinutes: 16 * 60,
    source: ecWithLibrary2027Source,
    tentative2027ViaDateHolidays: true,
    computeYear: (year) => {
      const idPub = hdId
        .getHolidays(year)
        .filter((h) => h.type === 'public')
        .map((h) => h.date.slice(0, 10));
      const ecAdhoc = idxAdhoc.filter((d) => d.startsWith(`${year}-`));
      return { holidays: Array.from(new Set([...idPub, ...ecAdhoc])) };
    }
  });

  const payload: ExchangeCalendarDatasetFile = {
    metadata: {
      source: `gerrymanoim/exchange_calendars@${EC_VERSION} (Apache-2.0) + rsheftel/pandas_market_calendars@${PMC_VERSION} (MIT) + date-holidays@${DATE_HOLIDAYS_VERSION} (ISC)`,
      exchangeCalendarsVersion: EC_VERSION,
      pandasMarketCalendarsVersion: PMC_VERSION,
      dateHolidaysVersion: DATE_HOLIDAYS_VERSION,
      retrievedAt: RETRIEVED_AT,
      minYear: MIN_YEAR,
      maxYear: MAX_YEAR,
      exchangeCount: Object.keys(exchanges).length,
      notes:
        'Generated deterministically from upstream exchange_calendars rules/precomputed schedules. For Asian lunar exchanges whose 2027 annual circulars are not yet published in exchange_calendars 4.13.3 (XBOM/XNSE, XTAI, XIDX, XSES), 2027 public holidays use date-holidays 3.39.2 and are flagged tentative2027ViaDateHolidays=true.'
    },
    exchanges
  };

  const outPath = path.resolve(process.cwd(), 'scripts/seeds/exchange_calendars.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`[SyncCalendars] Exported ${Object.keys(exchanges).length} exchanges (2024–2027) to ${outPath}`);
}

const isEntrypoint = process.argv[1] && process.argv[1].includes('syncExchangeCalendars');
if (isEntrypoint) {
  main().catch((err) => {
    console.error('[SyncCalendars] Failed:', err);
    process.exit(1);
  });
}
