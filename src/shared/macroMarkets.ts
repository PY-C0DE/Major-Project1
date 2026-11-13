/**
 * Shared Global Macro Market Indices Catalog & Location Detection
 * Shared between frontend (Dashboard Macro Tape selector) and backend (/api/markets/indices).
 */

export type MacroMarketId = 'IN' | 'US' | 'JP' | 'KR' | 'EU' | 'CN' | 'APAC' | 'CA';

export interface MacroMarketGroup {
  id: MacroMarketId;
  label: string;
  shortLabel: string;
  description: string;
}

export interface MacroIndexConfig {
  name: string;
  symbol: string;
  region: string;
  marketId: MacroMarketId;
  fallbackPrice: number;
  fallbackChange: number;
  fallbackPct: number;
}

export const MACRO_MARKET_GROUPS: MacroMarketGroup[] = [
  { id: 'IN', label: 'India (NSE / BSE)', shortLabel: 'IND', description: 'NIFTY 50, SENSEX, India VIX' },
  { id: 'US', label: 'United States', shortLabel: 'US', description: 'S&P 500, NASDAQ 100, DOW 30, VIX' },
  { id: 'JP', label: 'Japan (Tokyo)', shortLabel: 'JPN', description: 'Nikkei 225' },
  { id: 'KR', label: 'South Korea', shortLabel: 'KOR', description: 'KOSPI Composite' },
  { id: 'EU', label: 'Europe & UK', shortLabel: 'EUR', description: 'FTSE 100, DAX 40, CAC 40' },
  { id: 'CN', label: 'Hong Kong & China', shortLabel: 'HK/CN', description: 'Hang Seng, SSE Composite' },
  { id: 'APAC', label: 'Australia & Singapore', shortLabel: 'AU/SG', description: 'ASX 200, STI Index' },
  { id: 'CA', label: 'Canada', shortLabel: 'CAN', description: 'S&P/TSX Composite' },
];

export const MACRO_INDEX_CATALOG: MacroIndexConfig[] = [
  // India
  { name: 'NIFTY 50', symbol: '^NSEI', region: 'NSE · IND', marketId: 'IN', fallbackPrice: 24850.30, fallbackChange: 142.15, fallbackPct: 0.58 },
  { name: 'SENSEX', symbol: '^BSESN', region: 'BSE · IND', marketId: 'IN', fallbackPrice: 81420.10, fallbackChange: 415.80, fallbackPct: 0.51 },
  { name: 'INDIA VIX', symbol: '^INDIAVIX', region: 'VOLATILITY', marketId: 'IN', fallbackPrice: 12.45, fallbackChange: -0.35, fallbackPct: -2.73 },

  // United States
  { name: 'S&P 500', symbol: '^GSPC', region: 'NYSE · US', marketId: 'US', fallbackPrice: 5780.20, fallbackChange: 32.40, fallbackPct: 0.56 },
  { name: 'NASDAQ 100', symbol: '^NDX', region: 'NDQ · US', marketId: 'US', fallbackPrice: 20110.85, fallbackChange: 164.20, fallbackPct: 0.82 },
  { name: 'DOW 30', symbol: '^DJI', region: 'NYSE · US', marketId: 'US', fallbackPrice: 43850.10, fallbackChange: 210.45, fallbackPct: 0.48 },
  { name: 'CBOE VIX', symbol: '^VIX', region: 'US VOL', marketId: 'US', fallbackPrice: 16.40, fallbackChange: -0.45, fallbackPct: -2.67 },

  // Japan
  { name: 'NIKKEI 225', symbol: '^N225', region: 'TSE · JPN', marketId: 'JP', fallbackPrice: 39480.25, fallbackChange: 245.10, fallbackPct: 0.62 },

  // South Korea
  { name: 'KOSPI', symbol: '^KS11', region: 'KRX · KOR', marketId: 'KR', fallbackPrice: 2540.60, fallbackChange: 14.80, fallbackPct: 0.59 },

  // Europe & UK
  { name: 'FTSE 100', symbol: '^FTSE', region: 'LSE · UK', marketId: 'EU', fallbackPrice: 8290.40, fallbackChange: 28.50, fallbackPct: 0.34 },
  { name: 'DAX 40', symbol: '^GDAXI', region: 'XETRA · DE', marketId: 'EU', fallbackPrice: 19450.70, fallbackChange: 95.30, fallbackPct: 0.49 },
  { name: 'CAC 40', symbol: '^FCHI', region: 'PAR · FR', marketId: 'EU', fallbackPrice: 7490.20, fallbackChange: 21.15, fallbackPct: 0.28 },

  // Hong Kong & China
  { name: 'HANG SENG', symbol: '^HSI', region: 'HKEX · HK', marketId: 'CN', fallbackPrice: 20420.80, fallbackChange: 155.40, fallbackPct: 0.77 },
  { name: 'SSE COMP.', symbol: '000001.SS', region: 'SSE · CN', marketId: 'CN', fallbackPrice: 3380.15, fallbackChange: 18.25, fallbackPct: 0.54 },

  // Australia & Singapore
  { name: 'ASX 200', symbol: '^AXJO', region: 'ASX · AU', marketId: 'APAC', fallbackPrice: 8295.30, fallbackChange: 31.20, fallbackPct: 0.38 },
  { name: 'STI INDEX', symbol: '^STI', region: 'SGX · SG', marketId: 'APAC', fallbackPrice: 3740.50, fallbackChange: 12.60, fallbackPct: 0.34 },

  // Canada
  { name: 'S&P/TSX', symbol: '^GSPTSE', region: 'TSX · CA', marketId: 'CA', fallbackPrice: 24890.40, fallbackChange: 98.50, fallbackPct: 0.40 },
];

export const DEFAULT_MARKET_IDS: MacroMarketId[] = ['IN', 'US'];

/**
 * Infers primary market regions from a user's IANA timezone (browser location proxy).
 */
export function detectMarketsFromTimezone(timeZone?: string): {
  marketIds: MacroMarketId[];
  locationLabel: string;
} {
  const tz = (timeZone || '').toLowerCase();

  if (tz.includes('tokyo') || tz.includes('osaka') || tz.includes('japan')) {
    return { marketIds: ['JP', 'US', 'KR'], locationLabel: 'Japan (Tokyo)' };
  }
  if (tz.includes('kolkata') || tz.includes('calcutta') || tz.includes('mumbai') || tz.includes('delhi')) {
    return { marketIds: ['IN', 'US'], locationLabel: 'India (IST)' };
  }
  if (tz.includes('seoul') || tz.includes('korea')) {
    return { marketIds: ['KR', 'JP', 'US'], locationLabel: 'South Korea (KST)' };
  }
  if (tz.includes('hong_kong') || tz.includes('shanghai') || tz.includes('beijing') || tz.includes('taipei')) {
    return { marketIds: ['CN', 'JP', 'US'], locationLabel: 'East Asia' };
  }
  if (tz.includes('singapore') || tz.includes('sydney') || tz.includes('melbourne') || tz.includes('auckland')) {
    return { marketIds: ['APAC', 'JP', 'US'], locationLabel: 'Asia-Pacific' };
  }
  if (tz.includes('london') || tz.includes('berlin') || tz.includes('paris') || tz.includes('zurich') || tz.includes('europe/')) {
    return { marketIds: ['EU', 'US'], locationLabel: 'Europe / UK' };
  }
  if (tz.includes('toronto') || tz.includes('vancouver') || tz.includes('montreal') || tz.includes('canada/')) {
    return { marketIds: ['CA', 'US'], locationLabel: 'Canada' };
  }
  if (tz.includes('america/')) {
    return { marketIds: ['US', 'JP'], locationLabel: 'United States / Americas' };
  }
  return { marketIds: ['IN', 'US'], locationLabel: 'Global Default' };
}

/**
 * Resolves the ordered list of MacroIndexConfig items for a set of selected market IDs.
 * Keeps standard concise order when India + US are both selected cleanly.
 */
export function resolveIndicesForMarkets(marketIds: MacroMarketId[]): MacroIndexConfig[] {
  const validIds = marketIds.filter((id) => MACRO_MARKET_GROUPS.some((g) => g.id === id));
  const activeSet = new Set<MacroMarketId>(validIds.length > 0 ? validIds : DEFAULT_MARKET_IDS);

  // Preserve the iconic compact 5-card default when exact ['IN', 'US'] is chosen
  if (activeSet.size === 2 && activeSet.has('IN') && activeSet.has('US')) {
    return MACRO_INDEX_CATALOG.filter((idx) =>
      ['^NSEI', '^BSESN', '^GSPC', '^NDX', '^INDIAVIX'].includes(idx.symbol)
    );
  }

  // Order according to user's selected array order
  const ordered: MacroIndexConfig[] = [];
  for (const mId of validIds) {
    for (const item of MACRO_INDEX_CATALOG) {
      if (item.marketId === mId && !ordered.some((o) => o.symbol === item.symbol)) {
        ordered.push(item);
      }
    }
  }
  return ordered.length > 0 ? ordered : MACRO_INDEX_CATALOG.slice(0, 5);
}
