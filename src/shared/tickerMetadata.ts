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
  XIDX: { mic: 'XIDX', code: 'IDX', country: 'ID', currency: 'IDR', timezone: 'Asia/Jakarta' }
};

export function resolveExchangeMicInfo(symbol: string, exchangeHint?: string, currencyHint?: string): ExchangeMicInfo {
  const upperSymbol = symbol.trim().toUpperCase();

  // Suffix overrides for multi-country Euronext / Nordic / global exchanges
  if (upperSymbol.endsWith('.AS')) {
    return EXCHANGE_MIC_MAP.XAMS;
  }
  if (upperSymbol.endsWith('.BR')) {
    return EXCHANGE_MIC_MAP.XBRU;
  }
  if (upperSymbol.endsWith('.CO')) {
    return EXCHANGE_MIC_MAP.XCSE;
  }
  if (upperSymbol.endsWith('.HE')) {
    return EXCHANGE_MIC_MAP.XHEL;
  }

  const hintKey = exchangeHint?.trim().toUpperCase();
  if (hintKey && EXCHANGE_MIC_MAP[hintKey]) {
    const info = EXCHANGE_MIC_MAP[hintKey];
    if (currencyHint && currencyHint.trim()) {
      return { ...info, currency: currencyHint.trim().toUpperCase() };
    }
    return info;
  }

  const inferredCode = inferExchangeFromTicker(upperSymbol).toUpperCase();
  const baseInfo = EXCHANGE_MIC_MAP[inferredCode] || EXCHANGE_MIC_MAP.XNAS;
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
