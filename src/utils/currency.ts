/**
 * Universal Global Currency Formatting Engine
 * Correctly identifies and maps global currencies and exchange suffixes
 * (e.g., South Korean Won ₩ for KRW / .KS / .KQ, Indian Rupee ₹ for INR / .NS,
 * US Dollar $ for USD, Euro € for EUR, British Pound £ for GBP, Japanese Yen ¥ for JPY / .T).
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  KRW: '₩',
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  RMB: '¥',
  HKD: 'HK$',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  CHF: 'CHF ',
  TWD: 'NT$',
  BRL: 'R$'
};

/**
 * Infers the ISO currency code from a Yahoo Finance ticker suffix.
 */
export function inferCurrencyFromTicker(ticker?: string): string {
  if (!ticker) return 'USD';
  const t = ticker.toUpperCase().trim();
  if (t.endsWith('.KS') || t.endsWith('.KQ')) return 'KRW';
  if (t.endsWith('.NS') || t.endsWith('.BO')) return 'INR';
  if (t.endsWith('.T')) return 'JPY';
  if (t.endsWith('.SS') || t.endsWith('.SZ')) return 'CNY';
  if (t.endsWith('.HK')) return 'HKD';
  if (t.endsWith('.TW') || t.endsWith('.TWO')) return 'TWD';
  if (t.endsWith('.L')) return 'GBP';
  if (t.endsWith('.DE') || t.endsWith('.PA') || t.endsWith('.AS') || t.endsWith('.MC') || t.endsWith('.MI') || t.endsWith('.F')) return 'EUR';
  if (t.endsWith('.SW')) return 'CHF';
  if (t.endsWith('.AX')) return 'AUD';
  if (t.endsWith('.TO') || t.endsWith('.V')) return 'CAD';
  if (t.endsWith('.SI')) return 'SGD';
  if (t.endsWith('.SA')) return 'BRL';
  return 'USD';
}

/**
 * Infers the exchange name from a Yahoo Finance ticker suffix.
 */
export function inferExchangeFromTicker(ticker?: string): string {
  if (!ticker) return 'NASDAQ';
  const t = ticker.toUpperCase().trim();
  if (t.endsWith('.NS')) return 'NSE';
  if (t.endsWith('.BO')) return 'BSE';
  if (t.endsWith('.KS')) return 'KRX';
  if (t.endsWith('.KQ')) return 'KOSDAQ';
  if (t.endsWith('.T')) return 'TSE';
  if (t.endsWith('.L')) return 'LSE';
  if (t.endsWith('.DE') || t.endsWith('.F')) return 'XETRA';
  if (t.endsWith('.PA')) return 'EURONEXT';
  if (t.endsWith('.HK')) return 'HKEX';
  if (t.endsWith('.TW') || t.endsWith('.TWO')) return 'TWSE';
  if (t.endsWith('.SS')) return 'SSE';
  if (t.endsWith('.SZ')) return 'SZSE';
  if (t.endsWith('.TO') || t.endsWith('.V')) return 'TSX';
  if (t.endsWith('.AX')) return 'ASX';
  if (t.endsWith('.SI')) return 'SGX';
  return 'NASDAQ';
}

/**
 * Resolves the appropriate currency symbol based on ISO currency code or ticker suffix.
 */
export function getCurrencySymbol(currency?: string, ticker?: string): string {
  // Check if ticker unambiguously belongs to a non-USD domestic exchange
  const inferredCurr = ticker ? inferCurrencyFromTicker(ticker) : 'USD';
  if (ticker && inferredCurr !== 'USD' && (!currency || currency.toUpperCase().trim() === 'USD')) {
    return CURRENCY_SYMBOLS[inferredCurr] || '$';
  }

  if (currency) {
    const upper = currency.toUpperCase().trim();
    if (CURRENCY_SYMBOLS[upper]) {
      return CURRENCY_SYMBOLS[upper];
    }
  }

  if (ticker && CURRENCY_SYMBOLS[inferredCurr]) {
    return CURRENCY_SYMBOLS[inferredCurr];
  }

  return currency === 'INR' ? '₹' : '$';
}

/**
 * Formats a currency amount with the appropriate symbol and localized number formatting.
 * Note: Currencies like KRW (Won) and JPY (Yen) do not use fractional cent decimals in equity trading.
 */
export function formatCurrencyAmount(
  amount: number | null | undefined,
  currency?: string,
  ticker?: string,
  decimals?: number
): string {
  if (amount == null || isNaN(amount)) return '---';
  const sym = getCurrencySymbol(currency, ticker);
  const upperCurr = (currency || '').toUpperCase();

  // Zero decimal currencies (e.g. KRW, JPY) typically display integers for market quotes
  const isZeroDecimal = upperCurr === 'KRW' || upperCurr === 'JPY' || sym === '₩' || sym === '¥';
  const defaultDecimals = isZeroDecimal ? 0 : 2;
  const numDecimals = decimals !== undefined ? decimals : defaultDecimals;

  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: numDecimals,
    maximumFractionDigits: numDecimals
  });

  return `${sym}${formatted}`;
}
