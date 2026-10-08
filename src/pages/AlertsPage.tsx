/**
 * AlphaQuant AI - Alert Manager Page
 * Set proactive automated rules on price limits, regime shifts,
 * concept drift detections, and widening conformal uncertainty bounds.
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
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Alert Manager & Trigger Engine
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time triggers for price breakouts, volatility regime shifts, and distribution drift alarms.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Alert Rule</span>
        </button>
      </div>

      {/* Active Simulation Toast Banner */}
      {simulatedAlertToast && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-emerald-500/20 border border-amber-500/40 text-xs flex items-center justify-between gap-3 text-white animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="font-mono font-bold text-amber-300">[{simulatedAlertToast.ticker}]</span>
            <span>{simulatedAlertToast.message}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Live Simulation Active</span>
        </div>
      )}

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {alerts.map(a => (
          <div
            key={a.id}
            className={`p-4 rounded-xl border transition-all ${
              a.enabled
                ? 'bg-slate-900/70 border-slate-800'
                : 'bg-slate-950/40 border-slate-900 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-white">{a.ticker}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {a.type.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSimulateTrigger(a)}
                  title="Simulate / Test Fire Alert"
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Play className="w-2.5 h-2.5" />
                  <span>Test</span>
                </button>
                <input
                  type="checkbox"
                  checked={a.enabled}
                  onChange={() => handleToggle(a.id, a.enabled)}
                  className="rounded bg-slate-950 border-slate-700 text-cyan-400 focus:ring-0 cursor-pointer"
                />
                <button
                  onClick={() => handleDelete(a.id)}
                  title="Delete alert rule"
                  className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 mt-2 font-medium leading-relaxed">{a.label}</p>

            {a.threshold && (
              <div className="mt-2 text-xs font-mono text-cyan-400 tabular-nums">
                Trigger Threshold: ₹{a.threshold.toLocaleString()}
              </div>
            )}

            <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>Status: {a.enabled ? 'Active Monitoring' : 'Disabled'}</span>
              <span>Created {new Date(a.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* New Alert Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-display">Create Quantitative Alert</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Target Symbol</label>
                <input
                  type="text"
                  required
                  value={ticker}
                  onChange={e => setTicker(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Trigger Condition</label>
                <select
                  value={alertType}
                  onChange={e => setAlertType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="price_above">Price Crosses Above Threshold</option>
                  <option value="price_below">Price Drops Below Threshold</option>
                  <option value="regime_shift">Market Regime Transition Detected (HMM)</option>
                  <option value="drift_detected">Statistical Feature Drift Detected (KS-Test)</option>
                  <option value="interval_widening">Conformal Prediction Interval Widens &gt; 10%</option>
                  <option value="sentiment_shift">FinBERT Sentiment Flips Negative</option>
                </select>
              </div>

              {(alertType === 'price_above' || alertType === 'price_below') && (
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Price Level Threshold</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 3050.00"
                    value={threshold}
                    onChange={e => setThreshold(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-mono mb-1">Alert Description / Note</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alert me on breakout above resistance"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold transition-colors cursor-pointer"
                >
                  Create Rule
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
