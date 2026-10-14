/**
 * AlphaQuant AI - Concept & Feature Drift Monitoring Page
 * Evaluates feature non-stationarity via Kolmogorov-Smirnov Two-Sample testing (ks_2samp)
 * to safeguard machine learning inference from distribution collapse.
 * Fully optimized for pleasant light mode and dark mode.
 */

import React, { useState, useEffect } from 'react';
import {
  ActivitySquare,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Info,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { api } from '../services/api';
import { ConceptDriftResult } from '../types';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

export const DriftMonitorPage: React.FC = () => {
  const [ticker, setTicker] = useState('RELIANCE.NS');
  const [drift, setDrift] = useState<ConceptDriftResult | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDrift = async () => {
    setLoading(true);
    try {
      const data = await api.getConceptDrift(ticker);
      setDrift(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrift();
  }, [ticker]);

  const isHealthy = !drift?.driftDetected;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md transition-colors">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <ActivitySquare className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            Statistical Concept Drift Monitoring
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Two-Sample Kolmogorov-Smirnov distribution testing (<code>scipy.stats.ks_2samp</code>) across financial factor matrices.
          </p>
        </div>

        {/* Ticker Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono">
          <span className="text-slate-400 dark:text-slate-500 uppercase font-semibold text-[10px]">Audit Target:</span>
          {['RELIANCE.NS', 'TCS.NS', 'NVDA', 'AAPL', 'INFY.NS'].map(t => (
            <button
              key={t}
              onClick={() => setTicker(t)}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                ticker === t
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.replace('.NS', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Model Health Status Banner */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center justify-between transition-colors ${
          isHealthy
            ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300'
            : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isHealthy ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'}`}>
            {isHealthy ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
              System Model Health Status
            </div>
            <div className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white">
              {isHealthy ? 'Nominal Operation: No Statistical Drift Detected' : 'Caution: Feature Distribution Drift Detected'}
            </div>
          </div>
        </div>

        <div className="text-right font-mono">
          <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold">Drift Score</div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {drift?.overallDriftScore ? `${(drift.overallDriftScore * 100).toFixed(0)}%` : '0%'}
          </div>
        </div>
      </div>

      {/* Explanation Box */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs text-xs space-y-2 transition-colors">
        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-sm">
          <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>How Kolmogorov-Smirnov Drift Monitoring Works</span>
        </div>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs">
          Financial time series are subject to structural shifts. AlphaQuant computes empirical cumulative distribution functions
          (ECDFs) for the historical training partition (180+ trading days) and tests them against the live inference window (past 30 days).
          If the supremum distance $D$ yields an asymptotic $p$-value &lt; 0.05, the null hypothesis of distribution equivalence is rejected,
          and conformal prediction intervals are automatically expanded to prevent undercoverage.
        </p>
      </div>

      {/* Detailed Feature Drift Matrix Table */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Feature Factor Drift Analysis Table</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {drift?.features.length || 0} Tested Indicators
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                <th className="py-3 px-4 font-medium font-sans">Feature Factor</th>
                <th className="py-3 px-4 font-medium text-right">KS Statistic (D)</th>
                <th className="py-3 px-4 font-medium text-right">p-value</th>
                <th className="py-3 px-4 font-medium text-right">Training Mean</th>
                <th className="py-3 px-4 font-medium text-right">Live Window Mean</th>
                <th className="py-3 px-4 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {drift?.features.map(f => (
                <tr key={f.feature} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-white">
                    {f.feature}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                    {f.ksStatistic.toFixed(3)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums font-semibold">
                    {f.pValue.toFixed(4)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                    {f.trainingMean.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                    {f.inferenceMean.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {f.driftDetected ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center justify-center gap-1 w-24 mx-auto">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        DRIFT
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1 w-24 mx-auto">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        IN-BOUNDS
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DisclaimerBanner />
    </div>
  );
};
