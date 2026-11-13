/**
 * AlphaQuant AI - Quick Alert Popover Component
 * Allows users to instantly set price-based or percentage-change notifications
 * for the currently viewed ticker directly in the analysis view without navigating away.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  X,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Trash2,
  Zap,
  Target,
  Percent,
  Layers,
  ChevronRight,
  ShieldCheck,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { api } from '../services/api';
import { AlertRule, StockQuote, ConformalPrediction } from '../types';
import { getCurrencySymbol } from '../utils/currency';

interface Props {
  ticker: string;
  quote: StockQuote | null;
  prediction?: ConformalPrediction | null;
  alerts: AlertRule[];
  onAlertsChanged: () => void;
}

export const QuickAlertPopover: React.FC<Props> = ({
  ticker,
  quote,
  prediction,
  alerts,
  onAlertsChanged
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'price' | 'percent'>('price');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [targetValue, setTargetValue] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  const popoverRef = useRef<HTMLDivElement>(null);

  const currentPrice = quote?.price || 0;
  const currSym = getCurrencySymbol(quote?.currency, ticker);

  // Filter alerts for the active ticker
  const tickerAlerts = alerts.filter(
    a => a.ticker.toUpperCase() === ticker.toUpperCase()
  );
  const activeAlertsCount = tickerAlerts.filter(a => a.enabled).length;

  // Check if any alert threshold is met right now
  const metAlerts = tickerAlerts.filter(a => {
    if (!a.enabled || !a.threshold || currentPrice <= 0) return false;
    if (a.type === 'price_above' || a.direction === 'above') return currentPrice >= a.threshold;
    if (a.type === 'price_below' || a.direction === 'below') return currentPrice <= a.threshold;
    return false;
  });

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Set default target value based on current price when opening
  useEffect(() => {
    if (isOpen && currentPrice > 0 && !targetValue) {
      if (mode === 'price') {
        const defaultVal = direction === 'above' ? currentPrice * 1.03 : currentPrice * 0.97;
        setTargetValue(defaultVal.toFixed(2));
      } else {
        setTargetValue('3.0');
      }
    }
  }, [isOpen, mode, direction, currentPrice]);

  // Handle Preset Clicks
  const handleApplyPreset = (presetPercent: number, dir: 'above' | 'below') => {
    setDirection(dir);
    if (mode === 'price') {
      const computedPrice = currentPrice * (1 + (dir === 'above' ? presetPercent : -presetPercent) / 100);
      setTargetValue(computedPrice.toFixed(2));
    } else {
      setTargetValue(presetPercent.toFixed(1));
    }
  };

  const handleApplyConformal = (targetPriceVal: number, dir: 'above' | 'below') => {
    setMode('price');
    setDirection(dir);
    setTargetValue(targetPriceVal.toFixed(2));
  };

  // Submit Quick Alert
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(targetValue);
    if (isNaN(num) || num <= 0) {
      setErrorMsg('Please enter a valid positive number.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let finalThreshold = num;
      let finalPercent: number | undefined = undefined;
      let alertType: AlertRule['type'] = direction === 'above' ? 'price_above' : 'price_below';
      let alertLabel = '';

      if (mode === 'percent') {
        finalPercent = num;
        finalThreshold = direction === 'above'
          ? currentPrice * (1 + num / 100)
          : currentPrice * (1 - num / 100);
        finalThreshold = Number(finalThreshold.toFixed(2));
        alertType = 'percentage_change';
        alertLabel = `${ticker.replace('.NS', '')} ${direction === 'above' ? 'Surge' : 'Drop'} ≥ ${num}% (Target: ${currSym}${finalThreshold.toLocaleString()})`;
      } else {
        const pctDiff = currentPrice > 0 ? ((num - currentPrice) / currentPrice) * 100 : 0;
        finalPercent = Number(Math.abs(pctDiff).toFixed(2));
        alertLabel = `${ticker.replace('.NS', '')} ${direction === 'above' ? '≥' : '≤'} ${currSym}${num.toLocaleString()} (${pctDiff >= 0 ? '+' : ''}${pctDiff.toFixed(1)}%)`;
      }

      await api.createAlert({
        ticker,
        type: alertType,
        threshold: finalThreshold,
        percentChangeThreshold: finalPercent,
        direction,
        basePrice: currentPrice,
        label: alertLabel,
        pushEnabled,
        emailEnabled
      });

      setSuccessMsg(`✓ Quick Alert set: ${alertLabel}`);
      onAlertsChanged();
      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err: any) {
      console.error('Failed to create quick alert:', err);
      setErrorMsg('Failed to save alert. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAlert = async (alertId: string, currentStatus: boolean) => {
    try {
      await api.toggleAlert(alertId, !currentStatus);
      onAlertsChanged();
    } catch (err) {
      console.error('Failed to toggle alert:', err);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await api.deleteAlert(alertId);
      onAlertsChanged();
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

  // Calculate dynamic preview impact
  const computedPricePreview = () => {
    const val = parseFloat(targetValue);
    if (isNaN(val) || val <= 0 || currentPrice <= 0) return null;

    if (mode === 'percent') {
      const calculatedPrice = direction === 'above'
        ? currentPrice * (1 + val / 100)
        : currentPrice * (1 - val / 100);
      const deltaAmount = Math.abs(calculatedPrice - currentPrice);
      return {
        price: calculatedPrice,
        delta: deltaAmount,
        percent: val
      };
    } else {
      const diffPct = ((val - currentPrice) / currentPrice) * 100;
      const deltaAmount = Math.abs(val - currentPrice);
      return {
        price: val,
        delta: deltaAmount,
        percent: diffPct
      };
    }
  };

  const preview = computedPricePreview();

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* 1. Quick Alert Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
          isOpen
            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
            : metAlerts.length > 0
            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950/80 dark:hover:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700 font-bold'
            : activeAlertsCount > 0
            ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:hover:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-700'
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
        }`}
        title="Set quick price-based or percentage-change notification for this stock"
        aria-expanded={isOpen}
      >
        <Bell className={`w-4 h-4 ${
          metAlerts.length > 0
            ? 'text-emerald-600 dark:text-emerald-400 animate-bounce'
            : isOpen
            ? 'text-slate-950'
            : activeAlertsCount > 0
            ? 'text-cyan-600 dark:text-cyan-400'
            : 'text-slate-500'
        }`} />
        <span>Quick Alert</span>
        {activeAlertsCount > 0 && (
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
            isOpen
              ? 'bg-slate-950 text-cyan-300'
              : 'bg-cyan-200 text-cyan-900 dark:bg-cyan-900 dark:text-cyan-200'
          }`}>
            {activeAlertsCount}
          </span>
        )}
      </button>

      {/* 2. Quick Alert Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 z-50 text-slate-900 dark:text-white animate-fadeIn space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-2.5">
            <div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white">
                  Quick Alert: {ticker.replace('.NS', '')}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Spot: {currSym}{currentPrice.toLocaleString()} · Instant notification
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher: Price Target vs Percentage Move */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setMode('price');
                if (currentPrice > 0) {
                  const defaultVal = direction === 'above' ? currentPrice * 1.03 : currentPrice * 0.97;
                  setTargetValue(defaultVal.toFixed(2));
                }
              }}
              className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'price'
                  ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Target Price ({currSym})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('percent');
                setTargetValue('3.0');
              }}
              className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'percent'
                  ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>% Move Shift</span>
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 block">
              1-Click Smart Presets
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleApplyPreset(2, 'above')}
                className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
              >
                +2% Surge
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(5, 'above')}
                className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
              >
                +5% Breakout
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(2, 'below')}
                className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
              >
                -2% Dip
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(5, 'below')}
                className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
              >
                -5% Stop
              </button>

              {/* Conformal Bounds Presets if available */}
              {prediction?.upperBound && (
                <button
                  type="button"
                  onClick={() => handleApplyConformal(prediction.upperBound, 'above')}
                  className="px-2 py-1 rounded bg-cyan-50 hover:bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:hover:bg-cyan-950 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-[10px] font-mono font-semibold transition-colors cursor-pointer flex items-center gap-0.5"
                  title="Conformal 90% Upper Bound"
                >
                  <Layers className="w-2.5 h-2.5" />
                  <span>Upper {currSym}{prediction.upperBound}</span>
                </button>
              )}
              {prediction?.lowerBound && (
                <button
                  type="button"
                  onClick={() => handleApplyConformal(prediction.lowerBound, 'below')}
                  className="px-2 py-1 rounded bg-cyan-50 hover:bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:hover:bg-cyan-950 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-[10px] font-mono font-semibold transition-colors cursor-pointer flex items-center gap-0.5"
                  title="Conformal 90% Lower Bound"
                >
                  <Layers className="w-2.5 h-2.5" />
                  <span>Lower {currSym}{prediction.lowerBound}</span>
                </button>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleCreateAlert} className="space-y-3">
            {/* Direction Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 w-16">Condition:</span>
              <div className="flex-1 grid grid-cols-2 gap-1.5 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setDirection('above')}
                  className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                    direction === 'above'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{mode === 'price' ? 'Above (≥)' : 'Gain (≥)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDirection('below')}
                  className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                    direction === 'below'
                      ? 'bg-rose-50 text-rose-800 border-rose-400 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-700'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>{mode === 'price' ? 'Below (≤)' : 'Drop (≤)'}</span>
                </button>
              </div>
            </div>

            {/* Threshold Input */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 w-16">
                {mode === 'price' ? 'Target:' : 'Shift %:'}
              </span>
              <div className="flex-1 relative">
                <span className="absolute left-2.5 top-2 text-xs font-mono text-slate-400 font-bold">
                  {mode === 'price' ? currSym : '%'}
                </span>
                <input
                  type="number"
                  step={mode === 'price' ? '0.05' : '0.1'}
                  min="0"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder={mode === 'price' ? 'e.g. 420.50' : 'e.g. 3.5'}
                  required
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Live Calculation Feedback */}
            {preview && (
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>Triggers at:</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">
                  {currSym}{preview.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({direction === 'above' ? '+' : '-'}{Math.abs(preview.percent).toFixed(2)}%)
                </span>
              </div>
            )}

            {/* Channel Options */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pushEnabled}
                  onChange={(e) => setPushEnabled(e.target.checked)}
                  className="rounded text-cyan-600 focus:ring-cyan-500"
                />
                <span>In-App Push</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="rounded text-cyan-600 focus:ring-cyan-500"
                />
                <span>Email Alert</span>
              </label>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{submitting ? 'Setting Alert...' : 'Set Quick Notification'}</span>
            </button>
          </form>

          {/* Feedback messages */}
          {successMsg && (
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-medium flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-mono font-medium animate-fadeIn">
              {errorMsg}
            </div>
          )}

          {/* 3. Existing Alerts for this Ticker */}
          {tickerAlerts.length > 0 && (
            <div className="pt-2 border-t border-slate-150 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 block">
                Active Rules for {ticker.replace('.NS', '')} ({tickerAlerts.length})
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
                {tickerAlerts.map(alt => {
                  const isMet = alt.enabled && alt.threshold && (
                    (alt.type === 'price_above' && currentPrice >= alt.threshold) ||
                    (alt.type === 'price_below' && currentPrice <= alt.threshold)
                  );

                  return (
                    <div
                      key={alt.id}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs font-mono"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isMet ? 'bg-emerald-500 animate-ping' : alt.enabled ? 'bg-cyan-500' : 'bg-slate-400'
                        }`} />
                        <span className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-200">
                          {alt.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isMet && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                            MET
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleAlert(alt.id, alt.enabled)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          title={alt.enabled ? 'Disable alert' : 'Enable alert'}
                        >
                          {alt.enabled ? (
                            <ToggleRight className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAlert(alt.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                          title="Remove alert"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
