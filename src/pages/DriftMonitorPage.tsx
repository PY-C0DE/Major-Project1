/**
 * AlphaQuant AI - Concept & Feature Drift Monitoring Page
 * Evaluates feature non-stationarity via Kolmogorov-Smirnov Two-Sample testing (ks_2samp)
 * to safeguard machine learning inference from distribution collapse.
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
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <ActivitySquare className="w-5 h-5 text-amber-400" />
            Statistical Concept Drift Monitoring
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Two-Sample Kolmogorov-Smirnov distribution testing (<code>scipy.stats.ks_2samp</code>) across financial factor matrices.
          </p>
        </div>

        {/* Ticker Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-xs font-mono">
          <span className="text-slate-500 uppercase">Audit Target:</span>
          {['RELIANCE.NS', 'TCS.NS', 'NVDA', 'AAPL', 'INFY.NS'].map(t => (
            <button
              key={t}
              onClick={() => setTicker(t)}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                ticker === t
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.replace('.NS', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Model Health Status Banner */}
      <div
        className={`p-5 rounded-xl border flex items-center justify-between ${
          isHealthy
            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
            : 'bg-amber-950/30 border-amber-800/60 text-amber-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-full ${isHealthy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {isHealthy ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              System Model Health Status
            </div>
            <div className="text-lg font-bold font-display text-white">
              {isHealthy ? 'Nominal Operation: No Statistical Drift Detected' : 'Caution: Feature Distribution Drift Detected'}
            </div>
          </div>
        </div>

        <div className="text-right font-mono">
          <div className="text-[10px] uppercase text-slate-400">Drift Score</div>
          <div className="text-lg font-bold text-white tabular-nums">
            {drift?.overallDriftScore ? `${(drift.overallDriftScore * 100).toFixed(0)}%` : '0%'}
          </div>
        </div>
      </div>

      {/* Explanation Box */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>How Kolmogorov-Smirnov Drift Monitoring Works</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          Financial time series are subject to structural shifts. AlphaQuant computes empirical cumulative distribution functions
          (ECDFs) for the historical training partition (180+ trading days) and tests them against the live inference window (past 30 days).
          If the supremum distance $D$ yields an asymptotic $p$-value &lt; 0.05, the null hypothesis of distribution equivalence is rejected,
          and conformal prediction intervals are automatically expanded to prevent undercoverage.
        </p>
      </div>

      {/* Detailed Feature Drift Matrix Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Feature Factor Drift Analysis Table</h2>
          <span className="text-xs text-slate-400 font-mono">
            {drift?.features.length || 0} Tested Indicators
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] text-slate-400 uppercase">
                <th className="py-3 px-4 font-medium font-sans">Feature Factor</th>
                <th className="py-3 px-4 font-medium text-right">KS Statistic (D)</th>
                <th className="py-3 px-4 font-medium text-right">p-value</th>
                <th className="py-3 px-4 font-medium text-right">Training Mean</th>
                <th className="py-3 px-4 font-medium text-right">Live Window Mean</th>
                <th className="py-3 px-4 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {drift?.features.map(f => (
                <tr key={f.feature} className="hover:bg-slate-900/70 transition-colors">
                  <td className="py-3 px-4 font-sans font-medium text-white">
                    {f.feature}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-300 tabular-nums">
                    {f.ksStatistic.toFixed(3)}
                  </td>
                  <td className="py-3 px-4 text-right text-cyan-300 tabular-nums">
                    {f.pValue.toFixed(4)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400 tabular-nums">
                    {f.baselineMean.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-200 tabular-nums">
                    {f.liveMean.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {f.driftDetected ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-sans bg-amber-950 text-amber-400 border border-amber-800 font-semibold">
                        DRIFT DETECTED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-sans bg-emerald-950 text-emerald-400 border border-emerald-800">
                        NOMINAL
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
