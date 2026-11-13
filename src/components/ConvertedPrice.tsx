/**
 * ConvertedPrice
 * Renders a stock price in its native trading currency.
 * Whenever the asset's currency differs from the user's preferred home currency
 * (or an explicit targetCurrency), hovering or focusing the price displays a
 * real-time Portal-based tooltip with the live market FX conversion calculation.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRightLeft } from 'lucide-react';
import { useFx } from '../context/FxContext';
import {
  formatCurrencyAmount,
  getCurrencySymbol,
  inferCurrencyFromTicker
} from '../utils/currency';

export interface ConvertedPriceProps {
  amount: number | null | undefined;
  currency?: string;
  ticker?: string;
  decimals?: number;
  targetCurrency?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
}

function resolveIsoCurrency(currency?: string, ticker?: string): string {
  const inferred = inferCurrencyFromTicker(ticker);
  if (currency && currency.trim()) {
    const upper = currency.trim().toUpperCase();
    if (upper === 'USD' && ticker && inferred !== 'USD') {
      return inferred;
    }
    return upper;
  }
  return inferred;
}

function formatFxRate(rate: number): string {
  if (!Number.isFinite(rate)) return '—';
  if (rate >= 100) return rate.toFixed(2);
  if (rate >= 1) return rate.toFixed(4);
  if (rate >= 0.01) return rate.toFixed(5);
  return rate.toFixed(6);
}

export const ConvertedPrice: React.FC<ConvertedPriceProps> = ({
  amount,
  currency,
  ticker,
  decimals,
  targetCurrency,
  prefix = '',
  suffix = '',
  className = ''
}) => {
  const { convert } = useFx();
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
  }>({ top: 0, left: 0, placement: 'top' });

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const tooltipWidth = 316;
    const tooltipEstimatedHeight = 164;
    const margin = 10;

    const showBelow = rect.top < tooltipEstimatedHeight + 16;
    const placement: 'top' | 'bottom' = showBelow ? 'bottom' : 'top';
    const top = showBelow ? rect.bottom + margin : rect.top - margin;

    const rawLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const clampedLeft = Math.max(
      12,
      Math.min(rawLeft, window.innerWidth - tooltipWidth - 12)
    );

    setCoords({ top, left: clampedLeft, placement });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  if (amount == null || Number.isNaN(amount)) {
    return <span className={className}>---</span>;
  }

  const fromCurrency = resolveIsoCurrency(currency, ticker);
  const conversion = convert(amount, fromCurrency, targetCurrency);
  const {
    toCurrency,
    convertedAmount,
    rate,
    inverseRate,
    usdAmount,
    isForeign,
    isLive,
    lastUpdated
  } = conversion;

  const formattedNative = `${prefix}${formatCurrencyAmount(
    amount,
    fromCurrency,
    ticker,
    decimals
  )}${suffix}`;

  if (!isForeign) {
    return <span className={className}>{formattedNative}</span>;
  }

  const isTargetZeroDecimal = toCurrency === 'KRW' || toCurrency === 'JPY';
  const targetDecimals =
    decimals !== undefined ? (isTargetZeroDecimal ? 0 : decimals) : isTargetZeroDecimal ? 0 : 2;
  const formattedTarget = `${prefix}${formatCurrencyAmount(
    convertedAmount,
    toCurrency,
    undefined,
    targetDecimals
  )}${suffix}`;

  const fromSym = getCurrencySymbol(fromCurrency, ticker);
  const toSym = getCurrencySymbol(toCurrency);
  const formattedTime = (() => {
    try {
      return new Date(lastUpdated).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  })();

  const handleOpen = () => {
    updatePosition();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}
        className={`inline-flex items-baseline border-b border-dotted border-slate-400/75 dark:border-slate-500/75 hover:border-cyan-500 dark:hover:border-cyan-400 cursor-help transition-colors ${className}`}
      >
        {formattedNative}
      </span>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            style={{
              top: coords.top,
              left: coords.left,
              transform: coords.placement === 'top' ? 'translateY(-100%)' : 'translateY(0)'
            }}
            className="pointer-events-none fixed z-[9999] w-[316px] rounded-xl bg-white/98 dark:bg-slate-950/98 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-cyan-800/60 shadow-xl shadow-slate-900/10 dark:shadow-2xl p-3 text-left font-sans backdrop-blur-md"
          >
            {/* Header row: Live status, FX Pair, Timestamp */}
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono mb-2">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isLive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isLive
                        ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse'
                        : 'bg-amber-500 dark:bg-amber-400'
                    }`}
                  />
                  {isLive ? 'LIVE FX' : 'REF FX'}
                </span>
                <span className="text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1">
                  {fromCurrency}
                  <ArrowRightLeft className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400" />
                  {toCurrency}
                </span>
              </div>
              {formattedTime && (
                <span className="text-slate-500 dark:text-slate-400 tabular-nums">{formattedTime}</span>
              )}
            </div>

            {/* Converted Hero Amount */}
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <span className="text-base font-extrabold font-mono text-cyan-700 dark:text-cyan-300 tabular-nums tracking-tight">
                ≈ {formattedTarget}
              </span>
              <span className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-400 uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/70">
                {toCurrency} Equivalent
              </span>
            </div>

            {/* Explicit Calculation Formula */}
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/70 px-2.5 py-1.5 mb-2">
              <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                Market Rate Calculation
              </div>
              <div className="text-[11px] font-mono font-semibold text-slate-800 dark:text-slate-100 tabular-nums break-words">
                {formattedNative} × {formatFxRate(rate)} ={' '}
                <span className="text-cyan-700 dark:text-cyan-300 font-bold">{formattedTarget}</span>
              </div>
            </div>

            {/* Unit FX Rates & Optional USD Anchor */}
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              <span>
                1 {fromCurrency} = {toSym}
                {formatFxRate(rate)}
              </span>
              <span>
                1 {toCurrency} = {fromSym}
                {formatFxRate(inverseRate)}
              </span>
            </div>

            {usdAmount !== null && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                <span>USD Reference</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">
                  ≈ {prefix}
                  {formatCurrencyAmount(usdAmount, 'USD', undefined, 2)}
                  {suffix}
                </span>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
export default ConvertedPrice;
