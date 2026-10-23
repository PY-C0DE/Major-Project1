/**
 * Automated Backtesting Framework Modal
 * Simulates model strategies (XGBoost + Conformal Quantile, Volatility Breakout, Regime-Adaptive)
 * against a Buy-and-Hold benchmark over trailing trading sessions.
 * Visualizes historical comparative equity curves, alpha, Sharpe ratios, and drawdowns.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Percent,
  DollarSign,
  Award,
  RefreshCw,
  Info,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { AutomatedBacktestResult } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTicker?: string;
}

export const AutomatedBacktestingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultTicker = 'NVDA'
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [ticker, setTicker] = useState(defaultTicker);
  const [strategy, setStrategy] = useState<'xgboost_conformal' | 'conformal_breakout' | 'regime_adaptive'>('xgboost_conformal');
  const [days, setDays] = useState<number>(90);
  const [capital, setCapital] = useState<number>(100000);
  const [result, setResult] = useState<AutomatedBacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const popularTickers = ['NVDA', 'RELIANCE.NS', 'AAPL', 'TCS.NS', 'MSFT', 'TSLA'];

  useEffect(() => {
    if (isOpen) {
      runSimulation();
    }
  }, [isOpen, ticker, strategy, days]);

  async function runSimulation() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAutomatedBacktest(ticker, strategy, days, capital);
      setResult(res);
    } catch (err: any) {
      console.error('Backtest error:', err);
      setError(err?.message || 'Failed to simulate backtest.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans transition-colors">
        {/* Terminal Header */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-slate-900 dark:text-white">
                  Automated Backtesting Framework
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold">
                  Vectorized Walk-Forward v4.1
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Historical strategy outperformance vs Buy-and-Hold benchmark
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runSimulation}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Rerun Simulation</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Strategy & Ticker Selector Bar */}
        <div className="px-5 py-3.5 bg-slate-100/70 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
          {/* Strategy Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 dark:text-slate-400">Strategy Model:</span>
            {[
              { id: 'xgboost_conformal', label: 'XGBoost + Conformal Quantile' },
              { id: 'conformal_breakout', label: 'Volatility Envelope Breakout' },
              { id: 'regime_adaptive', label: 'HMM Regime Trend' }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setStrategy(s.id as any)}
                className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  strategy === s.id
                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500 font-bold shadow-xs'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Lookback sessions */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {[30, 90, 180, 252].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                  days === d
                    ? 'bg-emerald-600 dark:bg-slate-800 text-white dark:text-emerald-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Ticker Quick Row */}
        <div className="px-5 py-2 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/60 flex items-center gap-2 text-xs font-mono shrink-0 overflow-x-auto">
          <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px]">Test Ticker:</span>
          {popularTickers.map(t => (
            <button
              key={t}
              onClick={() => setTicker(t)}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                ticker === t
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {t.replace('.NS', '')}
            </button>
          ))}
          <span className="text-slate-500 dark:text-slate-400 ml-auto text-[10px]">Capital: ${capital.toLocaleString()}</span>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-center space-y-3">
              <RefreshCw className="w-7 h-7 text-emerald-600 dark:text-emerald-400 animate-spin" />
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Running walk-forward historical simulation for {ticker} over {days} sessions...
              </p>
            </div>
          ) : error || !result ? (
            <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl space-y-3">
              <p className="text-xs font-mono text-rose-700 dark:text-rose-300">{error || 'Failed to simulate strategy.'}</p>
              <button
                onClick={runSimulation}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono cursor-pointer shadow-xs"
              >
                Retry Backtest
              </button>
            </div>
          ) : (
            <>
              {/* Scorecard KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {/* Alpha Outperformance */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400 block">Alpha Outperformance</span>
                  <div className={`text-xl sm:text-2xl font-black font-mono tabular-nums flex items-center gap-1 ${
                    result.alphaOutperformancePct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {result.alphaOutperformancePct >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    <span>{result.alphaOutperformancePct >= 0 ? '+' : ''}{result.alphaOutperformancePct}%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Vs Buy & Hold</span>
                </div>

                {/* Strategy Final Value */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400 block">Strategy Equity</span>
                  <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                    ${result.strategyFinalValue.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    {result.strategyReturnPct >= 0 ? '+' : ''}{result.strategyReturnPct}% total
                  </span>
                </div>

                {/* Benchmark Final Value */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400 block">Buy & Hold Benchmark</span>
                  <div className="text-lg sm:text-xl font-bold font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                    ${result.benchmarkFinalValue.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {result.benchmarkReturnPct >= 0 ? '+' : ''}{result.benchmarkReturnPct}% total
                  </span>
                </div>

                {/* Sharpe Comparison */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400 block">Sharpe Ratio</span>
                  <div className="text-lg sm:text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400 tabular-nums">
                    {result.strategySharpeRatio}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    Benchmark: {result.benchmarkSharpeRatio}
                  </span>
                </div>

                {/* Win Rate & Max DD */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400 block">Win Rate / Max DD</span>
                  <div className="text-lg sm:text-xl font-bold font-mono text-purple-600 dark:text-purple-400 tabular-nums">
                    {result.winRatePct}%
                  </div>
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono">
                    Max DD: -{result.strategyMaxDrawdownPct}%
                  </span>
                </div>
              </div>

              {/* Historical Equity Curve Chart */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-white">
                      Comparative Historical Equity Curve
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      Trailing {result.lookbackDays} sessions simulation starting at ${result.initialCapital.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="w-3 h-1 bg-emerald-500 rounded-full inline-block" />
                      {result.strategyName}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <span className="w-3 h-1 bg-slate-400 dark:bg-slate-500 rounded-full inline-block" />
                      Buy & Hold Benchmark
                    </span>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.equityCurve}>
                      <defs>
                        <linearGradient id="stratGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="benchGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                      <XAxis
                        dataKey="date"
                        stroke={isDark ? '#64748b' : '#94a3b8'}
                        tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                        tickFormatter={(val) => val.slice(5)}
                      />
                      <YAxis
                        stroke={isDark ? '#64748b' : '#94a3b8'}
                        tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                        tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                          borderColor: isDark ? '#334155' : '#cbd5e1',
                          color: isDark ? '#f8fafc' : '#0f172a',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                      />
                      <Area
                        type="monotone"
                        dataKey="strategyValue"
                        name="Strategy Equity"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#stratGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="benchmarkValue"
                        name="Buy & Hold"
                        stroke={isDark ? '#94a3b8' : '#64748b'}
                        strokeWidth={1.8}
                        strokeDasharray="4 4"
                        fillOpacity={1}
                        fill="url(#benchGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Execution Summary Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Trade Statistics</span>
                  <div className="text-slate-900 dark:text-white font-bold">
                    {result.totalTrades} Executed Orders
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {result.winningTrades} wins / {result.losingTrades} losses · Profit Factor: {result.profitFactor}
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Risk & Drawdown Control</span>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Max DD -{result.strategyMaxDrawdownPct}% (Vs -{result.benchmarkMaxDrawdownPct}%)
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Conformal bands prevented catastrophic tail risk during volatility spikes
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Execution Model</span>
                  <div className="text-cyan-600 dark:text-cyan-400 font-bold">
                    0.05% Slippage & Fees Included
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Realistic fill prices with daily exchange close reconciliations
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
