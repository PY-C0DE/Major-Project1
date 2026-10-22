/**
 * AI Portfolio Optimizer & Sync Modal
 * Computes Markowitz Mean-Variance optimal target weight distributions across multi-asset baskets.
 * Provides 1-click automated rebalancing action to synchronize user portfolio allocations.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  PieChart,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Sliders,
  DollarSign,
  ArrowRight,
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { PortfolioOptimizationResult, PortfolioHolding } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const AIPortfolioOptimizerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSyncComplete
}) => {
  const [objective, setObjective] = useState<'max_sharpe' | 'min_volatility' | 'equal_weight'>('max_sharpe');
  const [basket, setBasket] = useState<string[]>([
    'NVDA',
    'AAPL',
    'MSFT',
    'GOOGL',
    'RELIANCE.NS',
    'TCS.NS'
  ]);
  const [newTickerInput, setNewTickerInput] = useState('');
  const [result, setResult] = useState<PortfolioOptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      runOptimization();
    }
  }, [isOpen, objective, basket]);

  async function runOptimization() {
    setLoading(true);
    setErrorMessage(null);
    try {
      // Build mock holdings for the basket if not currently held
      const quotes = await Promise.all(
        basket.map(async t => {
          try {
            return await api.getQuote(t);
          } catch {
            return { ticker: t, name: t, price: 150 };
          }
        })
      );

      const simulatedHoldings: PortfolioHolding[] = quotes.map((q, idx) => ({
        id: `opt-${q.ticker}`,
        ticker: q.ticker,
        companyName: q.name,
        quantity: 20,
        avgBuyPrice: q.price,
        currentPrice: q.price,
        totalInvested: 20 * q.price,
        currentValue: 20 * q.price,
        pnl: 0,
        pnlPercent: 0,
        purchaseDate: new Date().toISOString()
      }));

      const opt = await api.optimizePortfolio(objective, simulatedHoldings);
      setResult(opt);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to compute portfolio optimization.');
    } finally {
      setLoading(false);
    }
  }

  const handleAddTicker = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTickerInput.trim().toUpperCase();
    if (clean && !basket.includes(clean)) {
      setBasket([...basket, clean]);
      setNewTickerInput('');
    }
  };

  const handleRemoveTicker = (sym: string) => {
    if (basket.length <= 2) {
      alert('Portfolio basket requires at least 2 assets for optimization.');
      return;
    }
    setBasket(basket.filter(t => t !== sym));
  };

  const handleExecuteSync = async () => {
    if (!result || !result.suggestions) return;
    setSyncing(true);
    setSuccessMessage(null);
    try {
      await api.applyRebalance(result.suggestions);
      setSuccessMessage('Portfolio synchronized successfully with AI optimal target weights.');
      onSyncComplete?.();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to apply portfolio synchronization.');
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Terminal Header */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-white">
                  AI Portfolio Optimizer & Sync
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
                  Markowitz MVO Simplex
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Optimal target weight distribution across multi-asset baskets with 1-click execution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExecuteSync}
              disabled={syncing || !result}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{syncing ? 'Synchronizing...' : 'Execute Automated Sync'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Objective & Asset Basket Bar */}
        <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Target Objective:</span>
            {[
              { id: 'max_sharpe', label: 'Maximum Sharpe Ratio' },
              { id: 'min_volatility', label: 'Minimum Volatility (Tail-Hedged)' },
              { id: 'equal_weight', label: 'Equal-Weight (1/N)' }
            ].map(obj => (
              <button
                key={obj.id}
                onClick={() => setObjective(obj.id as any)}
                className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  objective === obj.id
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {obj.label}
              </button>
            ))}
          </div>

          {/* Add custom ticker form */}
          <form onSubmit={handleAddTicker} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="+ Add Ticker (e.g. BTCUSD)"
              value={newTickerInput}
              onChange={(e) => setNewTickerInput(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {successMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-center gap-2 text-xs font-mono text-emerald-300 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl flex items-center gap-2 text-xs font-mono text-rose-300 animate-fadeIn">
              <X className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Active Asset Basket Chips */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            <span className="text-slate-500 text-[10px] uppercase">Active Basket:</span>
            {basket.map(sym => (
              <span
                key={sym}
                className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 flex items-center gap-1.5"
              >
                <span>{sym}</span>
                <button
                  onClick={() => handleRemoveTicker(sym)}
                  className="text-slate-500 hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-center space-y-3">
              <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
              <p className="text-xs font-mono text-slate-400">
                Solving Markowitz quadratic programming & covariance simplex...
              </p>
            </div>
          ) : result ? (
            <>
              {/* Metrics Scorecard */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Expected Annual Return</span>
                  <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                    {result.optimalMetrics.expectedReturnAnnualPct}%
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Current: {result.currentMetrics.expectedReturnAnnualPct}%
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Annualized Volatility</span>
                  <div className="text-xl font-bold font-mono text-cyan-400 tabular-nums">
                    {result.optimalMetrics.volatilityAnnualPct}%
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Reduction: {result.optimalMetrics.volatilityReductionPct}%
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Optimal Sharpe Ratio</span>
                  <div className="text-xl font-bold font-mono text-purple-400 tabular-nums">
                    {result.optimalMetrics.sharpeRatio}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Sharpe Gain: +{result.optimalMetrics.sharpeGainPct}%
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Diversification Ratio</span>
                  <div className="text-xl font-bold font-mono text-amber-400 tabular-nums">
                    {result.currentMetrics.diversificationRatio}x
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Tail-Risk Dampening</span>
                </div>
              </div>

              {/* Target Weight Distribution Matrix Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden">
                <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white uppercase tracking-wider">
                    Target Allocation & Rebalance Roadmap
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Floor: 4% · Cap: 55%
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] font-mono text-left border-collapse">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800">
                        <th className="py-2.5 px-3">Asset</th>
                        <th className="py-2.5 px-3">Current Weight</th>
                        <th className="py-2.5 px-3 text-cyan-400">AI Target Weight</th>
                        <th className="py-2.5 px-3">Allocation Shift</th>
                        <th className="py-2.5 px-3">Execution Signal</th>
                        <th className="py-2.5 px-3 text-right">Rationale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {result.suggestions.map((sug) => (
                        <tr key={sug.ticker} className="hover:bg-slate-900/60">
                          <td className="py-2.5 px-3 font-bold text-white">
                            {sug.ticker}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {sug.currentWeightPct}%
                          </td>
                          <td className="py-2.5 px-3 text-cyan-400 font-bold">
                            {sug.targetWeightPct}%
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`font-bold ${
                              sug.weightDeltaPct > 0 ? 'text-emerald-400' : sug.weightDeltaPct < 0 ? 'text-rose-400' : 'text-slate-500'
                            }`}>
                              {sug.weightDeltaPct > 0 ? '+' : ''}{sug.weightDeltaPct}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sug.action === 'BUY'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : sug.action === 'SELL'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-slate-900 text-slate-400'
                            }`}>
                              {sug.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400 text-[10px]">
                            {sug.rationale}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
