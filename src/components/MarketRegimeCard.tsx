/**
 * USP 2: Market Regime Detection Card
 * Displays active Hidden Markov Model (HMM) state, posterior regime probability,
 * stability score, volatility regime, transition matrix, and regime transition history.
 * Supports dark and light themes.
 */

import React from 'react';
import { Layers, TrendingUp, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { MarketRegime } from '../types';

interface Props {
  regime: MarketRegime | null;
}

export const MarketRegimeCard: React.FC<Props> = ({ regime }) => {
  if (!regime) {
    return (
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 animate-pulse min-h-[260px] flex items-center justify-center">
        <span className="text-xs font-mono text-slate-500">Estimating Gaussian HMM Latent Regimes...</span>
      </div>
    );
  }

  const isBullish = regime.regimeId === 0;

  return (
    <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-5 relative overflow-hidden shadow-sm dark:shadow-lg transition-colors">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Market Regime Detection</h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              2-State Gaussian Hidden Markov Model (HMM)
            </span>
          </div>
        </div>

        <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded px-2 py-0.5">
          {regime.volatilityLevel}
        </span>
      </div>

      {/* Current Regime Main Banner */}
      <div
        className={`p-4 rounded-lg border mb-4 flex items-center justify-between ${
          isBullish
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-300'
        }`}
      >
        <div className="flex items-center gap-3">
          {isBullish ? (
            <div className="p-2 rounded-full bg-emerald-200 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 rounded-full bg-rose-200 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Current Market Regime
            </div>
            <div className="text-base font-bold tracking-tight text-slate-900 dark:text-white font-display">
              {regime.currentRegime}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Probability</div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {(regime.regimeProbability * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Stability and Parameters */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Regime Stability</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white font-mono mt-0.5 flex items-center gap-1.5 tabular-nums">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            {(regime.stabilityScore * 100).toFixed(0)}% Persistent
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Expected dwell: ~{Math.round(1 / (1 - regime.stabilityScore))} days</div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Downstream Impact</div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
            {isBullish ? 'Low Noise / Clean Signal' : 'High Vol / Widened Bounds'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Fed into XGBoost feature matrix</div>
        </div>
      </div>

      {/* HMM Empirical Transition Matrix */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/60 rounded-lg">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
          <span>HMM Transition Probability Matrix (A)</span>
          <span className="text-[10px] text-slate-400">Markov Property</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 text-[10px] block">P(Bull → Bull)</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {(regime.transitionMatrix[0][0] * 100).toFixed(0)}%
            </span>
          </div>
          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 text-[10px] block">P(Bull → Bear)</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
              {(regime.transitionMatrix[0][1] * 100).toFixed(0)}%
            </span>
          </div>
          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 text-[10px] block">P(Bear → Bull)</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
              {(regime.transitionMatrix[1][0] * 100).toFixed(0)}%
            </span>
          </div>
          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 text-[10px] block">P(Bear → Bear)</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {(regime.transitionMatrix[1][1] * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
