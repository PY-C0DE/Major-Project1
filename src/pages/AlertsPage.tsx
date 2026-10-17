/**
 * AlphaQuant AI - Alert Manager Page
 * Set proactive automated rules on price limits, regime shifts,
 * concept drift detections, and widening conformal uncertainty bounds.
 * Fully styled for pleasant light mode and dark mode.
 */

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ActivitySquare,
  Target,
  X,
  Play
} from 'lucide-react';
import { api } from '../services/api';
import { AlertRule } from '../types';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { CompanySearchCombobox } from '../components/CompanySearchCombobox';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [simulatedAlertToast, setSimulatedAlertToast] = useState<{ ticker: string; message: string } | null>(null);

  // Form State
  const [ticker, setTicker] = useState('RELIANCE.NS');
  const [alertType, setAlertType] = useState<AlertRule['type']>('price_above');
  const [threshold, setThreshold] = useState('');
  const [label, setLabel] = useState('');

  const handleSimulateTrigger = (alert: AlertRule) => {
    setSimulatedAlertToast({
      ticker: alert.ticker,
      message: `Trigger Activated: ${alert.label} (${alert.type.replace('_', ' ').toUpperCase()})`
    });
    setTimeout(() => setSimulatedAlertToast(null), 4500);
  };

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleToggle = async (id: string, curr: boolean) => {
    try {
      await api.toggleAlert(id, !curr);
      loadAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAlert(id);
      loadAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !label) return;

    try {
      await api.createAlert({
        ticker: ticker.toUpperCase(),
        type: alertType,
        threshold: threshold ? parseFloat(threshold) : undefined,
        label
      });
      setShowAddModal(false);
      setLabel('');
      setThreshold('');
      loadAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md transition-colors">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            Alert Manager & Trigger Engine
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time triggers for price breakouts, volatility regime shifts, and distribution drift alarms.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Alert Rule</span>
        </button>
      </div>

      {/* Active Simulation Toast Banner */}
      {simulatedAlertToast && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-emerald-500/20 border border-amber-500/40 text-xs flex items-center justify-between gap-3 text-slate-900 dark:text-white animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span className="font-mono font-bold text-amber-700 dark:text-amber-300">[{simulatedAlertToast.ticker}]</span>
            <span className="font-medium">{simulatedAlertToast.message}</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-semibold">Live Simulation Active</span>
        </div>
      )}

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {alerts.map(a => (
          <div
            key={a.id}
            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              a.enabled
                ? 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 shadow-xs hover:border-cyan-300 dark:hover:border-cyan-700'
                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-900 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{a.ticker}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {a.type.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSimulateTrigger(a)}
                  title="Simulate / Test Fire Alert"
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Play className="w-2.5 h-2.5" />
                  <span>Test</span>
                </button>
                <input
                  type="checkbox"
                  checked={a.enabled}
                  onChange={() => handleToggle(a.id, a.enabled)}
                  className="rounded bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <button
                  onClick={() => handleDelete(a.id)}
                  title="Delete alert rule"
                  className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 font-medium leading-relaxed">{a.label}</p>

            {a.threshold && (
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500 dark:text-slate-400">Trigger Threshold:</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">₹{a.threshold.toLocaleString()}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Alert Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>Create New Quant Alert</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-mono mb-1">Company / Ticker:</label>
                <CompanySearchCombobox
                  compact
                  placeholder="Select company (e.g. Reliance, Apple)..."
                  onSelect={(item) => setTicker(item.ticker)}
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-mono mb-1">Condition Trigger Type:</label>
                <select
                  value={alertType}
                  onChange={e => setAlertType(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="price_above">Price Rises Above Target</option>
                  <option value="price_below">Price Drops Below Limit</option>
                  <option value="regime_shift">Market Regime Transition</option>
                  <option value="drift_detected">Statistical Feature Drift Detected</option>
                  <option value="interval_widening">Uncertainty Envelope Widening</option>
                </select>
              </div>

              {(alertType === 'price_above' || alertType === 'price_below' || alertType === 'interval_widening') && (
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-mono mb-1">Threshold Price Value:</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 3050.00"
                    value={threshold}
                    onChange={e => setThreshold(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-mono mb-1">Alert Label / Description:</label>
                <input
                  type="text"
                  placeholder="e.g. Breakout above ₹3,050 resistance"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer transition-colors shadow-sm"
                >
                  Save Alert Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DisclaimerBanner />
    </div>
  );
};
