/**
 * Options Chains & Black-Scholes Greeks Analytics Modal
 * Institutional derivatives terminal view featuring:
 * - Real-time Black-Scholes Greeks (Δ, Γ, Θ, ν, ρ)
 * - Implied Volatility (IV) smile curve
 * - At-The-Money (ATM) IV & Expected Price Moves (1d, 7d, 30d)
 * - Put/Call Ratio (PCR for Volume & Open Interest)
 * - Interactive Call/Put Strike Matrix table
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  TrendingUp,
  TrendingDown,
  Gauge,
  Clock,
  Layers,
  ChevronRight,
  Info,
  RefreshCw,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { api } from '../services/api';
import { OptionsChainResponse } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTicker?: string;
  onTradeOption?: (ticker: string, strike: number, type: 'CALL' | 'PUT') => void;
}

export const OptionsAnalyticsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialTicker = 'NVDA',
  onTradeOption
}) => {
  const [ticker, setTicker] = useState(initialTicker);
  const [daysToExpiry, setDaysToExpiry] = useState<number>(30);
  const [data, setData] = useState<OptionsChainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'matrix' | 'smile'>('matrix');

  const popularTickers = ['NVDA', 'RELIANCE.NS', 'AAPL', 'TCS.NS', 'MSFT', 'TSLA'];

  useEffect(() => {
    if (isOpen) {
      loadOptions();
    }
  }, [isOpen, ticker, daysToExpiry]);

  async function loadOptions() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOptionsChain(ticker, daysToExpiry);
      setData(res);
    } catch (err: any) {
      console.error('Error fetching options chain:', err);
      setError(err?.message || 'Failed to load options analytics.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Terminal Header */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-white">
                  Options Chains & Greeks Analytics
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
                  Black-Scholes Engine v3.2
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Continuous partial derivatives (Δ, Γ, Θ, ν) and Implied Volatility smile
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Ticker selector pills */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {popularTickers.map(t => (
                <button
                  key={t}
                  onClick={() => setTicker(t)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                    ticker === t
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.replace('.NS', '')}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expiry Bar & Controls */}
        <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Expiration Cycle:</span>
            {[
              { days: 7, label: '7 Days (Weekly)' },
              { days: 14, label: '14 Days' },
              { days: 30, label: '30 Days (Monthly)' },
              { days: 60, label: '60 Days' }
            ].map(exp => (
              <button
                key={exp.days}
                onClick={() => setDaysToExpiry(exp.days)}
                className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  daysToExpiry === exp.days
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {exp.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'matrix' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Strike Matrix
            </button>
            <button
              onClick={() => setViewMode('smile')}
              className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'smile' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              IV Smile Curve
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-center space-y-3">
              <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
              <p className="text-xs font-mono text-slate-400">
                Solving Black-Scholes partial differential equations for {ticker}...
              </p>
            </div>
          ) : error || !data ? (
            <div className="p-8 text-center bg-rose-950/20 border border-rose-900/50 rounded-2xl space-y-3">
              <p className="text-xs font-mono text-rose-300">{error || 'Failed to load options analytics.'}</p>
              <button
                onClick={loadOptions}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-mono cursor-pointer"
              >
                Retry Calculation
              </button>
            </div>
          ) : (
            <>
              {/* Top KPI Telemetry Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Spot Price</span>
                  <div className="text-lg sm:text-xl font-bold font-mono text-white tabular-nums">
                    ${data.spotPrice.toLocaleString()}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">Underlying Asset</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">ATM Implied Vol</span>
                  <div className="text-lg sm:text-xl font-bold font-mono text-cyan-400 tabular-nums">
                    {data.atmIV}%
                  </div>
                  <span className="text-[9px] text-cyan-500/80 font-mono">Annualized Vol</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">1-Day Exp. Move</span>
                  <div className="text-lg sm:text-xl font-bold font-mono text-amber-400 tabular-nums">
                    ±${data.expectedMove1Day}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">1σ Statistical Move</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">7-Day Exp. Move</span>
                  <div className="text-lg sm:text-xl font-bold font-mono text-amber-400 tabular-nums">
                    ±${data.expectedMove7Day}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">Expiry Expected Range</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Put/Call Ratio (Vol)</span>
                  <div className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${
                    data.putCallRatioVolume > 1.0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {data.putCallRatioVolume}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {data.putCallRatioVolume > 1.0 ? 'Bearish Sentiment' : 'Bullish Sentiment'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">PCR Open Interest</span>
                  <div className="text-lg sm:text-xl font-bold font-mono text-purple-400 tabular-nums">
                    {data.putCallRatioOI}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">Total Open Contracts</span>
                </div>
              </div>

              {/* View Mode 1: IV Smile Curve Chart */}
              {viewMode === 'smile' && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-mono font-bold uppercase text-slate-200">
                        Implied Volatility Smile & Skew Curve
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Visualizing downside protective put skew and upside call surface
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" /> Call IV
                      </span>
                      <span className="flex items-center gap-1.5 text-purple-400">
                        <span className="w-2.5 h-0.5 bg-purple-400 inline-block" /> Put IV
                      </span>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.ivSmile}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                          dataKey="strike"
                          stroke="#64748b"
                          tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                          tickFormatter={(val) => `$${val}`}
                        />
                        <YAxis
                          stroke="#64748b"
                          tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                          tickFormatter={(val) => `${val}%`}
                          domain={['dataMin - 2', 'dataMax + 2']}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            color: '#f8fafc',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            borderRadius: '8px'
                          }}
                        />
                        <ReferenceLine x={data.spotPrice} stroke="#e2e8f0" strokeDasharray="3 3" label={{ value: 'Spot', fill: '#e2e8f0', fontSize: 10 }} />
                        <Line type="monotone" dataKey="callIV" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 3 }} name="Call IV %" />
                        <Line type="monotone" dataKey="putIV" stroke="#c084fc" strokeWidth={2.5} dot={{ r: 3 }} name="Put IV %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* View Mode 2: Interactive Call/Put Strike Matrix Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-inner">
                <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-emerald-400 font-bold uppercase tracking-wider">Calls (Left)</span>
                  </div>
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                    Strike Price Matrix ({data.expiryDate})
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-400 font-bold uppercase tracking-wider">Puts (Right)</span>
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] font-mono text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                        {/* Call columns */}
                        <th className="py-2 px-2 text-left text-slate-500">Action</th>
                        <th className="py-2 px-2">IV%</th>
                        <th className="py-2 px-2">Delta (Δ)</th>
                        <th className="py-2 px-2">Gamma (Γ)</th>
                        <th className="py-2 px-2">Theta (Θ)</th>
                        <th className="py-2 px-2">Vega (ν)</th>
                        <th className="py-2 px-2 text-emerald-400 font-bold">Call Bid</th>
                        <th className="py-2 px-2 text-emerald-400 font-bold">Call Ask</th>
                        {/* Middle strike */}
                        <th className="py-2 px-3 text-center bg-slate-950 text-cyan-300 font-bold border-x border-slate-800">
                          STRIKE
                        </th>
                        {/* Put columns */}
                        <th className="py-2 px-2 text-rose-400 font-bold">Put Bid</th>
                        <th className="py-2 px-2 text-rose-400 font-bold">Put Ask</th>
                        <th className="py-2 px-2">Vega (ν)</th>
                        <th className="py-2 px-2">Theta (Θ)</th>
                        <th className="py-2 px-2">Gamma (Γ)</th>
                        <th className="py-2 px-2">Delta (Δ)</th>
                        <th className="py-2 px-2">IV%</th>
                        <th className="py-2 px-2 text-right text-slate-500">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {data.strikes.map((s) => {
                        const isATM = Math.abs(s.strike - data.spotPrice) < (s.strike * 0.02);
                        return (
                          <tr
                            key={s.strike}
                            className={`hover:bg-slate-800/50 transition-colors ${
                              isATM ? 'bg-cyan-950/20' : ''
                            }`}
                          >
                            {/* Call trade action */}
                            <td className="py-1.5 px-2 text-left">
                              <button
                                onClick={() => onTradeOption?.(ticker, s.strike, 'CALL')}
                                className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-800 text-[10px] cursor-pointer"
                              >
                                Buy C
                              </button>
                            </td>
                            <td className="py-1.5 px-2 text-slate-400">{s.call.iv}%</td>
                            <td className={`py-1.5 px-2 ${s.call.inTheMoney ? 'text-emerald-400 font-semibold' : 'text-slate-300'}`}>
                              {s.call.delta}
                            </td>
                            <td className="py-1.5 px-2 text-slate-400">{s.call.gamma}</td>
                            <td className="py-1.5 px-2 text-rose-400">{s.call.theta}</td>
                            <td className="py-1.5 px-2 text-cyan-400">{s.call.vega}</td>
                            <td className="py-1.5 px-2 text-slate-200">${s.call.bid}</td>
                            <td className="py-1.5 px-2 text-emerald-400 font-bold">${s.call.ask}</td>

                            {/* Middle Strike Price */}
                            <td className={`py-1.5 px-3 text-center font-bold font-mono border-x border-slate-800 ${
                              isATM
                                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                                : 'bg-slate-950 text-slate-200'
                            }`}>
                              ${s.strike}
                            </td>

                            {/* Put Columns */}
                            <td className="py-1.5 px-2 text-slate-200">${s.put.bid}</td>
                            <td className="py-1.5 px-2 text-rose-400 font-bold">${s.put.ask}</td>
                            <td className="py-1.5 px-2 text-cyan-400">{s.put.vega}</td>
                            <td className="py-1.5 px-2 text-rose-400">{s.put.theta}</td>
                            <td className="py-1.5 px-2 text-slate-400">{s.put.gamma}</td>
                            <td className={`py-1.5 px-2 ${s.put.inTheMoney ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                              {s.put.delta}
                            </td>
                            <td className="py-1.5 px-2 text-slate-400">{s.put.iv}%</td>
                            {/* Put trade action */}
                            <td className="py-1.5 px-2 text-right">
                              <button
                                onClick={() => onTradeOption?.(ticker, s.strike, 'PUT')}
                                className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 hover:bg-rose-900 border border-rose-800 text-[10px] cursor-pointer"
                              >
                                Buy P
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Explanatory Footnote */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono flex items-start gap-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  Greeks are continuously refreshed via closed-form Black-Scholes partial derivatives. Implied Volatilities reflect local volatility smile calibrated against market-maker order books. Not investment advice.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
