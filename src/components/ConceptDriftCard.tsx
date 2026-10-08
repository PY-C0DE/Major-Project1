/**
 * USP 4: Concept & Distribution Drift Monitoring Card
 * Evaluates two-sample Kolmogorov-Smirnov (KS) statistics and p-values
 * between training baselines and live inference feature windows.
 * Supports dark and light themes.
 */

import React from 'react';
import { ActivitySquare, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ConceptDriftResult } from '../types';

interface Props {
  drift: ConceptDriftResult | null;
}

export const ConceptDriftCard: React.FC<Props> = ({ drift }) => {
  if (!drift) {
    return (
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 animate-pulse min-h-[260px] flex items-center justify-center">
        <span className="text-xs font-mono text-slate-500">Executing Two-Sample Kolmogorov-Smirnov Tests...</span>
      </div>
    );
  }

  const isHealthy = !drift.driftDetected;

  return (
    <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-5 relative overflow-hidden shadow-sm dark:shadow-lg transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
            <ActivitySquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Concept Drift Monitor</h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Two-Sample Kolmogorov-Smirnov Test (ks_2samp)
            </span>
          </div>
        </div>

        <div
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium ${
            isHealthy
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300'
          }`}
        >
          {isHealthy ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          <span>{isHealthy ? 'Model Health: Normal' : 'Drift Warning'}</span>
        </div>
      </div>

      {/* Warning Alert if Drift Detected */}
      {drift.safetyWarning && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold block text-amber-800 dark:text-amber-300 mb-0.5">Automated Model Safety Warning</span>
            {drift.safetyWarning}
          </div>
        </div>
      )}

      {/* KS Statistics Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
              <th className="pb-2 font-medium">Feature</th>
              <th className="pb-2 font-medium text-right">KS Stat (D)</th>
              <th className="pb-2 font-medium text-right">p-value</th>
              <th className="pb-2 font-medium text-right">Drift Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
            {drift.features.map(f => (
              <tr key={f.feature} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <td className="py-2.5 text-slate-800 dark:text-slate-200 font-sans font-medium text-xs">
                  {f.feature}
                </td>
                <td className="py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                  {f.ksStatistic.toFixed(3)}
                </td>
                <td className="py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                  {f.pValue.toFixed(4)}
                </td>
                <td className="py-2.5 text-right">
                  {f.driftDetected ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px] inline-flex items-center gap-1 font-sans">
                      <AlertTriangle className="w-3 h-3" />
                      DRIFT
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 text-[11px] inline-flex items-center gap-1 font-sans font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      IN-BOUNDS
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500">
        <span>Null Hypothesis $H_0$: Live window $\sim$ Training window</span>
        <span>Rejection threshold: $p &lt; 0.05$</span>
      </div>
    </div>
  );
};
