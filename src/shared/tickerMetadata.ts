/**
 * Global Ticker Metadata & ISO 10383 MIC Mappings
 * Maps catalog tickers and arbitrary global symbols to canonical exchange MIC codes,
 * ISO-2 countries, currencies, and IANA timezones.
 */

import { TickerMasterItem } from '../types';
import { TICKER_CATALOG, TickerMeta } from './tickerCatalog';
import { inferCurrencyFromTicker, inferExchangeFromTicker } from '../utils/currency';

export interface ExchangeMicInfo {
  mic: string;
  code: string;
  country: string;
  currency: string;
  timezone: string;
}

export const EXCHANGE_MIC_MAP: Record<string, ExchangeMicInfo> = {
  NSE: { mic: 'XNSE', code: 'NSE', country: 'IN', currency: 'INR', timezone: 'Asia/Kolkata' },
  XNSE: { mic: 'XNSE', code: 'NSE', country: 'IN', currency: 'INR', timezone: 'Asia/Kolkata' },
  BSE: { mic: 'XBOM', code: 'BSE', country: 'IN', currency: 'INR', timezone: 'Asia/Kolkata' },
  XBOM: { mic: 'XBOM', code: 'BSE', country: 'IN', currency: 'INR', timezone: 'Asia/Kolkata' },
  NASDAQ: { mic: 'XNAS', code: 'NASDAQ', country: 'US', currency: 'USD', timezone: 'America/New_York' },
  XNAS: { mic: 'XNAS', code: 'NASDAQ', country: 'US', currency: 'USD', timezone: 'America/New_York' },
  NYSE: { mic: 'XNYS', code: 'NYSE', country: 'US', currency: 'USD', timezone: 'America/New_York' },
  XNYS: { mic: 'XNYS', code: 'NYSE', country: 'US', currency: 'USD', timezone: 'America/New_York' },
  LSE: { mic: 'XLON', code: 'LSE', country: 'GB', currency: 'GBP', timezone: 'Europe/London' },
  XLON: { mic: 'XLON', code: 'LSE', country: 'GB', currency: 'GBP', timezone: 'Europe/London' },
  XETRA: { mic: 'XETR', code: 'XETRA', country: 'DE', currency: 'EUR', timezone: 'Europe/Berlin' },
  XETR: { mic: 'XETR', code: 'XETRA', country: 'DE', currency: 'EUR', timezone: 'Europe/Berlin' },
  EURONEXT: { mic: 'XPAR', code: 'EURONEXT', country: 'FR', currency: 'EUR', timezone: 'Europe/Paris' },
  XPAR: { mic: 'XPAR', code: 'EURONEXT', country: 'FR', currency: 'EUR', timezone: 'Europe/Paris' },
  XAMS: { mic: 'XAMS', code: 'EURONEXT', country: 'NL', currency: 'EUR', timezone: 'Europe/Amsterdam' },
  SIX: { mic: 'XSWX', code: 'SIX', country: 'CH', currency: 'CHF', timezone: 'Europe/Zurich' },
  XSWX: { mic: 'XSWX', code: 'SIX', country: 'CH', currency: 'CHF', timezone: 'Europe/Zurich' },
  TSE: { mic: 'XTKS', code: 'TSE', country: 'JP', currency: 'JPY', timezone: 'Asia/Tokyo' },
  XTKS: { mic: 'XTKS', code: 'TSE', country: 'JP', currency: 'JPY', timezone: 'Asia/Tokyo' },
  HKEX: { mic: 'XHKG', code: 'HKEX', country: 'HK', currency: 'HKD', timezone: 'Asia/Hong_Kong' },
  XHKG: { mic: 'XHKG', code: 'HKEX', country: 'HK', currency: 'HKD', timezone: 'Asia/Hong_Kong' },
  KRX: { mic: 'XKRX', code: 'KRX', country: 'KR', currency: 'KRW', timezone: 'Asia/Seoul' },
  XKRX: { mic: 'XKRX', code: 'KRX', country: 'KR', currency: 'KRW', timezone: 'Asia/Seoul' },
  KOSDAQ: { mic: 'XKOS', code: 'KOSDAQ', country: 'KR', currency: 'KRW', timezone: 'Asia/Seoul' },
  XKOS: { mic: 'XKOS', code: 'KOSDAQ', country: 'KR', currency: 'KRW', timezone: 'Asia/Seoul' },
  TWSE: { mic: 'XTAI', code: 'TWSE', country: 'TW', currency: 'TWD', timezone: 'Asia/Taipei' },
  XTAI: { mic: 'XTAI', code: 'TWSE', country: 'TW', currency: 'TWD', timezone: 'Asia/Taipei' },
  TSX: { mic: 'XTSE', code: 'TSX', country: 'CA', currency: 'CAD', timezone: 'America/Toronto' },
  XTSE: { mic: 'XTSE', code: 'TSX', country: 'CA', currency: 'CAD', timezone: 'America/Toronto' },
  ASX: { mic: 'XASX', code: 'ASX', country: 'AU', currency: 'AUD', timezone: 'Australia/Sydney' },
  XASX: { mic: 'XASX', code: 'ASX', country: 'AU', currency: 'AUD', timezone: 'Australia/Sydney' },
  SGX: { mic: 'XSES', code: 'SGX', country: 'SG', currency: 'SGD', timezone: 'Asia/Singapore' },
  XSES: { mic: 'XSES', code: 'SGX', country: 'SG', currency: 'SGD', timezone: 'Asia/Singapore' },
  B3: { mic: 'BVMF', code: 'B3', country: 'BR', currency: 'BRL', timezone: 'America/Sao_Paulo' },
  BVMF: { mic: 'BVMF', code: 'B3', country: 'BR', currency: 'BRL', timezone: 'America/Sao_Paulo' },
  BME: { mic: 'XMAD', code: 'BME', country: 'ES', currency: 'EUR', timezone: 'Europe/Madrid' },
  XMAD: { mic: 'XMAD', code: 'BME', country: 'ES', currency: 'EUR', timezone: 'Europe/Madrid' },
  MIL: { mic: 'XMIL', code: 'MIL', country: 'IT', currency: 'EUR', timezone: 'Europe/Rome' },
  XMIL: { mic: 'XMIL', code: 'MIL', country: 'IT', currency: 'EUR', timezone: 'Europe/Rome' },
  SSE: { mic: 'XSHG', code: 'SSE', country: 'CN', currency: 'CNY', timezone: 'Asia/Shanghai' },
  XSHG: { mic: 'XSHG', code: 'SSE', country: 'CN', currency: 'CNY', timezone: 'Asia/Shanghai' },
  SZSE: { mic: 'XSHE', code: 'SZSE', country: 'CN', currency: 'CNY', timezone: 'Asia/Shanghai' },
  XSHE: { mic: 'XSHE', code: 'SZSE', country: 'CN', currency: 'CNY', timezone: 'Asia/Shanghai' },
  'NASDAQ NORDIC': { mic: 'XSTO', code: 'NASDAQ NORDIC', country: 'SE', currency: 'SEK', timezone: 'Europe/Stockholm' },
  XSTO: { mic: 'XSTO', code: 'NASDAQ NORDIC', country: 'SE', currency: 'SEK', timezone: 'Europe/Stockholm' },
  XCSE: { mic: 'XCSE', code: 'NASDAQ NORDIC', country: 'DK', currency: 'DKK', timezone: 'Europe/Copenhagen' },
  XHEL: { mic: 'XHEL', code: 'NASDAQ NORDIC', country: 'FI', currency: 'EUR', timezone: 'Europe/Helsinki' },
  OSLO: { mic: 'XOSL', code: 'OSLO', country: 'NO', currency: 'NOK', timezone: 'Europe/Oslo' },
  XOSL: { mic: 'XOSL', code: 'OSLO', country: 'NO', currency: 'NOK', timezone: 'Europe/Oslo' },
  XBRU: { mic: 'XBRU', code: 'EURONEXT', country: 'BE', currency: 'EUR', timezone: 'Europe/Brussels' },
  JSE: { mic: 'XJSE', code: 'JSE', country: 'ZA', currency: 'ZAR', timezone: 'Africa/Johannesburg' },
  XJSE: { mic: 'XJSE', code: 'JSE', country: 'ZA', currency: 'ZAR', timezone: 'Africa/Johannesburg' },
  BMV: { mic: 'XMEX', code: 'BMV', country: 'MX', currency: 'MXN', timezone: 'America/Mexico_City' },
  XMEX: { mic: 'XMEX', code: 'BMV', country: 'MX', currency: 'MXN', timezone: 'America/Mexico_City' },
  IDX: { mic: 'XIDX', code: 'IDX', country: 'ID', currency: 'IDR', timezone: 'Asia/Jakarta' },
  XIDX: { mic: 'XIDX', code: 'IDX', country: 'ID', currency: 'IDR', timezone: 'Asia/Jakarta' },
  WSE: { mic: 'XWAR', code: 'WSE', country: 'PL', currency: 'PLN', timezone: 'Europe/Warsaw' },
  XWAR: { mic: 'XWAR', code: 'WSE', country: 'PL', currency: 'PLN', timezone: 'Europe/Warsaw' },
  XLIS: { mic: 'XLIS', code: 'EURONEXT', country: 'PT', currency: 'EUR', timezone: 'Europe/Lisbon' },
  XDUB: { mic: 'XDUB', code: 'EURONEXT', country: 'IE', currency: 'EUR', timezone: 'Europe/Dublin' },
  VIE: { mic: 'XWBO', code: 'VIE', country: 'AT', currency: 'EUR', timezone: 'Europe/Vienna' },
  XWBO: { mic: 'XWBO', code: 'VIE', country: 'AT', currency: 'EUR', timezone: 'Europe/Vienna' },
  BIST: { mic: 'XIST', code: 'BIST', country: 'TR', currency: 'TRY', timezone: 'Europe/Istanbul' },
  XIST: { mic: 'XIST', code: 'BIST', country: 'TR', currency: 'TRY', timezone: 'Europe/Istanbul' },
  NZX: { mic: 'XNZE', code: 'NZX', country: 'NZ', currency: 'NZD', timezone: 'Pacific/Auckland' },
  XNZE: { mic: 'XNZE', code: 'NZX', country: 'NZ', currency: 'NZD', timezone: 'Pacific/Auckland' },
  MYX: { mic: 'XKLS', code: 'MYX', country: 'MY', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' },
  XKLS: { mic: 'XKLS', code: 'MYX', country: 'MY', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' },
  SET: { mic: 'XBKK', code: 'SET', country: 'TH', currency: 'THB', timezone: 'Asia/Bangkok' },
  XBKK: { mic: 'XBKK', code: 'SET', country: 'TH', currency: 'THB', timezone: 'Asia/Bangkok' }
};

const SUFFIX_TO_MIC: Record<string, string> = {
  '.NS': 'XNSE',
  '.BO': 'XBOM',
  '.L': 'XLON',
  '.DE': 'XETR',
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
  '.SS': 'XSHG',
  '.SZ': 'XSHE',
  '.TO': 'XTSE',
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

const YAHOO_EXCHANGE_CODE_TO_MIC: Record<string, string> = {
  NMS: 'XNAS',
  NGM: 'XNAS',
  NCM: 'XNAS',
  NAS: 'XNAS',
  NYQ: 'XNYS',
  ASE: 'XNYS',
  PCX: 'XNYS',
  AMEX: 'XNYS',
  ARCA: 'XNYS',
  NSI: 'XNSE',
  BOM: 'XBOM',
  LON: 'XLON',
  GER: 'XETR',
  FRA: 'XETR',
  PAR: 'XPAR',
  AMS: 'XAMS',
  BRU: 'XBRU',
  LIS: 'XLIS',
  ISE: 'XDUB',
  VIE: 'XWBO',
  WSE: 'XWAR',
  EBS: 'XSWX',
  JPX: 'XTKS',
  TYO: 'XTKS',
  HKG: 'XHKG',
  KSC: 'XKRX',
  KOE: 'XKOS',
  TAI: 'XTAI',
  TWO: 'XTAI',
  SHH: 'XSHG',
  SHZ: 'XSHE',
  TOR: 'XTSE',
  ASX: 'XASX',
  SES: 'XSES',
  SAO: 'BVMF',
  MCE: 'XMAD',
  MIL: 'XMIL',
  CPH: 'XCSE',
  STO: 'XSTO',
  HEL: 'XHEL',
  OSL: 'XOSL',
  JNB: 'XJSE',
  MEX: 'XMEX',
  JKT: 'XIDX',
  IST: 'XIST',
  NZE: 'XNZE',
  KLS: 'XKLS',
  SET: 'XBKK'
};

export function tryResolveExchangeMicInfo(
  symbol: string,
  exchangeHint?: string,
  currencyHint?: string
): ExchangeMicInfo | null {
  const upperSymbol = symbol.trim().toUpperCase();
  const dotIdx = upperSymbol.lastIndexOf('.');
  if (dotIdx > 0) {
    const suffix = upperSymbol.slice(dotIdx);
    const mappedMic = SUFFIX_TO_MIC[suffix];
    if (mappedMic && EXCHANGE_MIC_MAP[mappedMic]) {
      const info = EXCHANGE_MIC_MAP[mappedMic];
      return currencyHint?.trim() ? { ...info, currency: currencyHint.trim().toUpperCase() } : info;
    }
    // Unrecognized exchange suffix (e.g., FOO.ZZ) — do NOT silently fall back to XNAS
    if (!exchangeHint) {
      return null;
    }
  }

  const hintKey = exchangeHint?.trim().toUpperCase();
  if (hintKey) {
    const resolvedKey = YAHOO_EXCHANGE_CODE_TO_MIC[hintKey] || hintKey;
    if (EXCHANGE_MIC_MAP[resolvedKey]) {
      const info = EXCHANGE_MIC_MAP[resolvedKey];
      return currencyHint?.trim() ? { ...info, currency: currencyHint.trim().toUpperCase() } : info;
    }
    // Explicit unknown exchange hint must not silently fall back to XNAS
    return null;
  }

  const symbolKey = YAHOO_EXCHANGE_CODE_TO_MIC[upperSymbol] || upperSymbol;
  if (EXCHANGE_MIC_MAP[symbolKey]) {
    const info = EXCHANGE_MIC_MAP[symbolKey];
    return currencyHint?.trim() ? { ...info, currency: currencyHint.trim().toUpperCase() } : info;
  }

  // If caller passed a 4-char MIC code starting with X or B that isn't recognized, do not guess XNAS
  if (/^[XB][A-Z]{3}$/.test(upperSymbol) && !TICKER_CATALOG.some((t) => t.ticker.toUpperCase() === upperSymbol)) {
    return null;
  }

  // Known catalog or clean US equity ticker (no dot suffix, no unrecognized exchange hint)
  const inferredCode = inferExchangeFromTicker(upperSymbol).toUpperCase();
  const baseInfo = EXCHANGE_MIC_MAP[inferredCode];
  if (!baseInfo) return null;
  return {
    ...baseInfo,
    currency: currencyHint?.trim().toUpperCase() || inferCurrencyFromTicker(upperSymbol) || baseInfo.currency
  };
}

export function resolveExchangeMicInfo(symbol: string, exchangeHint?: string, currencyHint?: string): ExchangeMicInfo {
  const known = tryResolveExchangeMicInfo(symbol, exchangeHint, currencyHint);
  if (known) return known;

  const upperSymbol = symbol.trim().toUpperCase();
  const baseInfo = EXCHANGE_MIC_MAP.XNAS;
  return {
    ...baseInfo,
    currency: currencyHint?.trim().toUpperCase() || inferCurrencyFromTicker(upperSymbol) || baseInfo.currency
  };
}

export function catalogMetaToTickerMaster(meta: TickerMeta): TickerMasterItem {
  const micInfo = resolveExchangeMicInfo(meta.ticker, meta.exchange, meta.currency);
  return {
    symbol: meta.ticker.toUpperCase(),
    name: meta.name,
    exchange: micInfo.mic,
    exchangeCode: micInfo.code,
    country: micInfo.country,
    currency: meta.currency || micInfo.currency,
    timezone: micInfo.timezone,
    assetType: 'EQUITY',
    sector: meta.sector,
    pe: meta.pe,
    marketCap: meta.marketCap,
    basePrice: meta.basePrice,
    aliases: Array.isArray(meta.aliases) ? meta.aliases : [],
    active: true
  };
}

export function getSeededCatalogTickers(): TickerMasterItem[] {
  return TICKER_CATALOG.map(catalogMetaToTickerMaster);
}

export function inferTickerMetadata(symbol: string, exchangeHint?: string, currencyHint?: string): TickerMasterItem {
  const normalized = symbol.trim().toUpperCase();
  const catalogEntry = TICKER_CATALOG.find((t) => t.ticker.toUpperCase() === normalized);
  if (catalogEntry) {
    return catalogMetaToTickerMaster(catalogEntry);
  }
  const micInfo = resolveExchangeMicInfo(normalized, exchangeHint, currencyHint);
  return {
    symbol: normalized,
    name: normalized,
    exchange: micInfo.mic,
    exchangeCode: micInfo.code,
    country: micInfo.country,
    currency: micInfo.currency,
    timezone: micInfo.timezone,
    assetType: normalized.startsWith('^') ? 'INDEX' : 'EQUITY',
    sector: 'Global Equities',
    pe: null,
    marketCap: null,
    basePrice: null,
    aliases: [],
    active: true
  };
}

export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseTickerMasterCsv(csvContent: string): TickerMasterItem[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (lines.length <= 1) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const colIndex = new Map<string, number>();
  header.forEach((col, idx) => colIndex.set(col, idx));

  const items: TickerMasterItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const get = (key: string) => {
      const idx = colIndex.get(key);
      return idx !== undefined ? (cols[idx] || '').trim() : '';
    };

    const symbol = get('symbol').toUpperCase();
    const name = get('name');
    if (!symbol || !name) continue;

    const aliasesRaw = get('aliases');
    const aliases = aliasesRaw
      ? aliasesRaw
          .split('|')
          .map((a) => a.trim())
          .filter(Boolean)
      : [];

    const micFallback = resolveExchangeMicInfo(symbol, get('exchange') || undefined, get('currency') || undefined);
    items.push({
      symbol,
      name,
      exchange: get('exchange') || micFallback.mic,
      exchangeCode: get('exchangeCode') || micFallback.code,
      country: get('country') || micFallback.country,
      currency: get('currency') || micFallback.currency,
      timezone: get('timezone') || micFallback.timezone,
      assetType: get('assetType') || 'EQUITY',
      sector: get('sector') || 'Global Equities',
      pe: null,
      marketCap: null,
      basePrice: null,
      aliases,
      active: get('active').toLowerCase() !== 'false'
    });
  }

  return items;
}

