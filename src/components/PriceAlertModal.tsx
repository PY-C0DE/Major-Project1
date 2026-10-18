/**
 * PriceAlertModal
 * Allows users to set target price points (price above / price below) for any stock,
 * view active alerts for that stock, toggle or delete them, and see when thresholds are met.
 */

import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { AlertRule, ConformalPrediction, StockQuote } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  quote: StockQuote | null;
  prediction?: ConformalPrediction | null;
  onAlertUpdated?: () => void;
}

export const PriceAlertModal: React.FC<Props> = ({
  isOpen,
  onClose,
  ticker,
  quote,
  prediction,
  onAlertUpdated
}) => {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [alertType, setAlertType] = useState<'price_above' | 'price_below'>('price_above');
  const [targetPrice, setTargetPrice] = useState('');
  const [label, setLabel] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentPrice = quote?.price || 0;
  const currSym = quote?.currency === 'INR' ? '₹' : '$';

  // Load existing alerts for this ticker
  const loadAlerts = async () => {
    setLoading(true);
    try {
      const allAlerts = await api.getAlerts();
      const filtered = allAlerts.filter(
        a => a.ticker.toUpperCase() === ticker.toUpperCase()
      );
      setAlerts(filtered);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
      setSuccessMsg(null);
      setErrorMsg(null);
      // Pre-fill default target price based on current price (+5%)
      if (currentPrice > 0 && !targetPrice) {
        setTargetPrice((currentPrice * 1.05).toFixed(2));
      }
    }
  }, [isOpen, ticker, currentPrice]);

  if (!isOpen) return null;

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(targetPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg('Please enter a valid target price greater than 0.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const conditionText = alertType === 'price_above' ? '≥' : '≤';
    const alertLabel = label.trim() || `Target ${conditionText} ${currSym}${priceNum.toLocaleString()}`;

    try {
      await api.createAlert({
        ticker,
        type: alertType,
        threshold: priceNum,
        label: alertLabel
      });

      setSuccessMsg(`Price alert created for ${ticker} at ${conditionText} ${currSym}${priceNum.toLocaleString()}!`);
      setLabel('');
      await loadAlerts();
      onAlertUpdated?.();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to create alert:', err);
      setErrorMsg('Could not save price alert. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await api.toggleAlert(id, !currentStatus);
      await loadAlerts();
      onAlertUpdated?.();
    } catch (err) {
      console.error('Failed to toggle alert:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAlert(id);
      await loadAlerts();
      onAlertUpdated?.();
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

  // Quick preset chips
  const applyPreset = (price: number, type: 'price_above' | 'price_below', presetLabel: string) => {
    setTargetPrice(price.toFixed(2));
    setAlertType(type);
    setLabel(presetLabel);
  };

  // Calculate percentage difference from current price
  const targetNum = parseFloat(targetPrice);
  const pctDiff = currentPrice > 0 && !isNaN(targetNum)
    ? (((targetNum - currentPrice) / currentPrice) * 100).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display flex items-center gap-2">
                <span>Set Price Alert</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60">
                  {ticker}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Trigger visual notifications when target price thresholds are met.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Current Stock Price Snapshot */}
          <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Current Market Price</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {currSym}{currentPrice.toLocaleString()}
              </span>
            </div>
            {quote && (
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase">Day's Change</span>
                <span className={`font-semibold flex items-center gap-1 ${quote.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.change >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>

          {/* Quick Quant Preset Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-500" />
              Quick Price Targets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {currentPrice > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => applyPreset(currentPrice * 1.05, 'price_above', '+5% Breakout Target')}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700/80 transition-colors cursor-pointer"
                  >
                    +5% ({currSym}{(currentPrice * 1.05).toFixed(1)})
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(currentPrice * 1.10, 'price_above', '+10% High Resistance Target')}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700/80 transition-colors cursor-pointer"
                  >
                    +10% ({currSym}{(currentPrice * 1.10).toFixed(1)})
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(currentPrice * 0.95, 'price_below', '-5% Support Level')}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-700 dark:text-slate-300 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700/80 transition-colors cursor-pointer"
                  >
                    -5% Support ({currSym}{(currentPrice * 0.95).toFixed(1)})
                  </button>
                </>
              )}

              {/* Conformal Bounds Presets if available */}
              {prediction && (
                <>
                  <button
                    type="button"
                    onClick={() => applyPreset(prediction.upperBound, 'price_above', '90% Conformal Upper Bound')}
                    className="px-2.5 py-1 text-xs rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 hover:bg-cyan-100 transition-colors cursor-pointer"
                  >
                    Conformal Upper ({currSym}{prediction.upperBound.toFixed(1)})
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(prediction.lowerBound, 'price_below', '90% Conformal Lower Bound')}
                    className="px-2.5 py-1 text-xs rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 hover:bg-cyan-100 transition-colors cursor-pointer"
                  >
                    Conformal Lower ({currSym}{prediction.lowerBound.toFixed(1)})
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Alert Creation Form */}
          <form onSubmit={handleCreateAlert} className="space-y-4 pt-1">
            {/* Condition: Price Above vs Price Below */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Alert Trigger Condition
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAlertType('price_above')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    alertType === 'price_above'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Price Rises To or Above (≥)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAlertType('price_below')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    alertType === 'price_below'
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-300 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  <span>Price Drops To or Below (≤)</span>
                </button>
              </div>
            </div>

            {/* Target Price Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Price ({currSym})
                </label>
                {pctDiff !== null && (
                  <span className={`text-[11px] font-mono font-medium ${parseFloat(pctDiff) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {parseFloat(pctDiff) >= 0 ? '+' : ''}{pctDiff}% from current price
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-slate-400">
                  {currSym}
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 3150.00"
                  value={targetPrice}
                  onChange={e => setTargetPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Alert Label / Custom Note */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Alert Description / Note <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Target profit level / Conformal band breakout"
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? 'Setting Alert...' : 'Save Price Alert'}</span>
            </button>
          </form>

          {/* Active Alerts List for this Stock */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Active Alerts for {ticker} ({alerts.length})
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Synced with Watchlist
              </span>
            </div>

            {alerts.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500 font-sans">
                No active price alerts set for {ticker}.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {alerts.map(a => {
                  const threshold = a.threshold || 0;
                  const isMet = a.enabled && (
                    (a.type === 'price_above' && currentPrice >= threshold) ||
                    (a.type === 'price_below' && currentPrice <= threshold)
                  );

                  return (
                    <div
                      key={a.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                        isMet
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80'
                          : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {a.type === 'price_above' ? '≥' : '≤'} {currSym}{threshold.toLocaleString()}
                          </span>
                          
                          {/* Visual Indicator Status Badge */}
                          {isMet ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 animate-pulse">
                              <Bell className="w-3 h-3 text-emerald-600 dark:text-emerald-400 fill-emerald-500/20" />
                              <span>Threshold Met!</span>
                            </span>
                          ) : a.enabled ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              Paused
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {a.label}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Toggle switch button */}
                        <button
                          type="button"
                          onClick={() => handleToggle(a.id, a.enabled)}
                          className={`text-[10px] font-mono px-2 py-1 rounded-md transition-colors cursor-pointer ${
                            a.enabled
                              ? 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                              : 'bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400'
                          }`}
                        >
                          {a.enabled ? 'Pause' : 'Enable'}
                        </button>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
