/**
 * Sentiment-Price Lag Analysis Dashboard Panel (Task 3)
 * Visualizes lead/lag Spearman & Pearson correlations across k = -5..+5,
 * seeded bootstrap 95% CIs, sample size (n), multiple-testing corrections (BH + Bonferroni),
 * and an explicit plain-language notice when n < 30 or no lag is statistically significant.
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { LagAnalysisResult, LagCorrelationPoint } from '../types';
import { useTheme } from '../context/ThemeContext';

interface Props {
  ticker: string;
}

export const SentimentLagPanel: React.FC<Props> = ({ ticker }) => {
  const { theme } = useTheme();
  const [scope, setScope] = useState<'single' | 'pooled'>('single');
  const [data, setData] = useState<LagAnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadLag = async (targetScope: 'single' | 'pooled', targetTicker: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLagAnalysis(targetScope === 'pooled' ? 'ALL' : targetTicker);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to compute lag analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLag(scope, ticker);
  }, [scope, ticker]);

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const axisColor = isDark ? '#94a3b8' : '#64748b';

  const chartData = (data?.lags || []).map((p) => ({
    ...p,
    lagLabel: p.lag > 0 ? `+${p.lag}` : `${p.lag}`,
    rhoValue: p.spearmanRho ?? 0
  }));

  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 lg:p-6 shadow-xs space-y-4">
      {/* Header & Scope Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200/90 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Sentiment–Return Lead/Lag Analysis (k = -5 to +5)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                BH FDR &amp; Bonferroni Corrected
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Correlates daily sentiment S(t) against return R(t+k); positive k tests whether sentiment leads returns.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setScope('single')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                scope === 'single'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {ticker.replace('.NS', '')}
            </button>
            <button
              type="button"
              onClick={() => setScope('pooled')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                scope === 'pooled'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Pooled Cross-Ticker
            </button>
          </div>

          <button
            type="button"
            onClick={() => loadLag(scope, ticker)}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-cyan-600 cursor-pointer"
            title="Refresh lag profile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      {loading && !data ? (
        <div className="p-6 text-center text-xs font-mono text-slate-500 animate-pulse">
          Computing lead/lag correlations &amp; seeded bootstrap confidence intervals...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : data && !data.available ? (
        <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200 font-mono">
                Insufficient Paired Days for Statistical Lag Test (n = {data.maxPairedDays} &lt; {data.minRequiredPairs} required)
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                {data.reason || data.interpretationNote}
              </p>
              <div className="text-[11px] font-mono text-amber-700/90 dark:text-amber-400/80 flex flex-wrap gap-3 pt-1">
                <span>Stored non-empty sentiment days: <strong>{data.totalStoredSentimentDays}</strong></span>
                <span>·</span>
                <span>Missing days are left missing (never 0-filled)</span>
              </div>
            </div>
          </div>
        </div>
      ) : data && data.available ? (
        <div className="space-y-4">
          {/* Top Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Best Tested Lag</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {data.bestLag ? `k = ${data.bestLag.lag > 0 ? `+${data.bestLag.lag}` : data.bestLag.lag}` : 'n/a'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Best Spearman ρ</span>
              <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
                {data.bestLag?.spearmanRho != null ? data.bestLag.spearmanRho.toFixed(3) : 'n/a'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Max Paired n</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                {data.maxPairedDays} {scope === 'pooled' ? `(${data.evaluatedTickersCount || 0} tickers)` : 'days'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Min BH q-value</span>
              <span className={`text-sm font-bold tabular-nums ${data.hasSignificantLag ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                {data.bestLag?.bhQValue != null ? data.bestLag.bhQValue.toFixed(4) : 'n/a'}
              </span>
            </div>
          </div>

          {/* Plain-Language Significance Notice */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              data.hasSignificantLag
                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {data.hasSignificantLag ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Activity className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <div className="font-semibold">
                {data.hasSignificantLag
                  ? 'Statistically significant correlation detected (survives multiple-testing correction)'
                  : 'No statistically significant lead/lag relationship found'}
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">{data.interpretationNote}</p>
            </div>
          </div>

          {/* Recharts Lag Profile Chart */}
          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="lagLabel"
                  stroke={axisColor}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke={axisColor}
                  fontSize={10}
                  tickLine={false}
                  domain={[-0.6, 0.6]}
                />
                <ReferenceLine y={0} stroke={axisColor} strokeWidth={1} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const pt = payload[0].payload as LagCorrelationPoint & { lagLabel: string };
                    return (
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg text-[11px] font-mono space-y-1">
                        <div className="font-bold text-slate-900 dark:text-white">
                          Lag k = {pt.lagLabel} ({pt.lag > 0 ? 'sentiment leads' : pt.lag < 0 ? 'returns lead' : 'same day'})
                        </div>
                        <div className="text-slate-600 dark:text-slate-300">
                          n = {pt.n} {pt.nDates ? `(${pt.nDates} dates)` : ''}
                        </div>
                        <div className="text-cyan-600 dark:text-cyan-400">
                          Spearman ρ: {pt.spearmanRho != null ? pt.spearmanRho.toFixed(4) : 'n/a'}
                          {pt.spearmanCI95 ? ` [95% CI ${pt.spearmanCI95[0].toFixed(3)}, ${pt.spearmanCI95[1].toFixed(3)}]` : ''}
                        </div>
                        <div className="text-indigo-600 dark:text-indigo-400">
                          Pearson r: {pt.pearsonR != null ? pt.pearsonR.toFixed(4) : 'n/a'}
                          {pt.pearsonCI95 ? ` [95% CI ${pt.pearsonCI95[0].toFixed(3)}, ${pt.pearsonCI95[1].toFixed(3)}]` : ''}
                        </div>
                        <div className="text-slate-500">
                          BH q = {pt.bhQValue != null ? pt.bhQValue.toFixed(4) : 'n/a'} · Bonf p = {pt.bonferroniPValue != null ? pt.bonferroniPValue.toFixed(4) : 'n/a'}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="rhoValue" name="Spearman ρ" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={`lag-${entry.lag}`}
                      fill={
                        entry.significant
                          ? '#10b981'
                          : entry.rhoValue >= 0
                            ? '#06b6d4'
                            : '#f43f5e'
                      }
                      fillOpacity={entry.significant ? 0.95 : 0.65}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bootstrap Footer */}
          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>
              95% CIs via seeded {scope === 'pooled' ? 'date-clustered' : 'date-block'} bootstrap ({data.bootstrapResamples} resamples, seed={data.bootstrapSeed}).
            </span>
            <span>
              Green bars indicate BH q &lt; 0.05 or Bonferroni p &lt; 0.05.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
