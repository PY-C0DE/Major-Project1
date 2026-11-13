/**
 * Exchange Market Status Indicator
 * Displays whether the market for a given equity is currently Open or Closed
 * per its respective domestic exchange hours & timezone, updating live.
 */

import React, { useEffect, useState } from 'react';
import { StockQuote } from '../types';
import { getExchangeMarketStatus } from '../utils/marketStatus';
import { useLanguage } from '../context/LanguageContext';

interface MarketStatusBadgeProps {
  ticker?: string;
  exchange?: string;
  exchangeTimezoneName?: string;
  marketPeriod?: StockQuote['marketPeriod'];
  compact?: boolean;
  showExchange?: boolean;
  showTime?: boolean;
  className?: string;
}

export const MarketStatusBadge: React.FC<MarketStatusBadgeProps> = ({
  ticker,
  exchange,
  exchangeTimezoneName,
  marketPeriod,
  compact = false,
  showExchange = false,
  showTime = true,
  className = '',
}) => {
  const { t } = useLanguage();
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const status = getExchangeMarketStatus({
    ticker,
    exchange,
    exchangeTimezoneName,
    marketPeriod,
    now,
  });

  const openText = compact ? t('stock.open_short', 'Open') : t('stock.market_open', 'Market Open');
  const closedText = compact ? t('stock.closed_short', 'Closed') : t('stock.market_closed', 'Market Closed');

  const extendedSuffix =
    !status.isOpen && !compact && status.session === 'pre'
      ? ` · ${t('stock.pre_market', 'Pre-Market')}`
      : !status.isOpen && !compact && status.session === 'post'
      ? ` · ${t('stock.after_hours', 'After-Hours')}`
      : '';

  const tooltip = `${status.exchangeLabel}: ${status.isOpen ? openText : closedText}${extendedSuffix} (${status.scheduleText} · ${status.localTimeFormatted})`;

  if (compact) {
    return (
      <span
        title={tooltip}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold shrink-0 border ${
          status.isOpen
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70'
            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700/70'
        } ${className}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            status.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500/80 dark:bg-rose-400/80'
          }`}
        />
        <span>{status.isOpen ? openText : closedText}</span>
      </span>
    );
  }

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold border shrink-0 ${
        status.isOpen
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60'
          : 'bg-rose-50/90 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60'
      } ${className}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {status.isOpen && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            status.isOpen ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        />
      </span>
      <span>
        {showExchange ? `${status.exchangeLabel} · ` : ''}
        {status.isOpen ? openText : closedText}
        {extendedSuffix}
      </span>
      {showTime && (
        <span className="text-[10px] font-medium opacity-75 hidden sm:inline">
          ({status.localTimeFormatted})
        </span>
      )}
    </span>
  );
};
