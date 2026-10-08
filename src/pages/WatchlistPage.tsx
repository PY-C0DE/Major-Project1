/**
 * AlphaQuant AI - Watchlist Intelligence Page
 * Monitor watchlist assets with live quotes, conformal forecast envelopes,
 * HMM regimes, FinBERT sentiment labels, and concept drift status.
 * Supports Dark and Light themes.
 */

import React, { useState, useEffect } from 'react';
import {
  BookmarkCheck,
  Search,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { WatchlistItem } from '../types';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface Props {
  onSelectTicker: (ticker: string) => void;
}

export const WatchlistPage: React.FC<Props> = ({ onSelectTicker }) => {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [newTickerInput, setNewTickerInput] = useState('');

  const loadWatchlist = async () => {
    setLoading(true);
    try {
      const data = await api.getWatchlist();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const handleAddTicker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTickerInput) return;
    try {
      await api.addToWatchlist(newTickerInput.toUpperCase());
      setNewTickerInput('');
      loadWatchlist();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveTicker = async (ticker: string) => {
    try {
      await api.removeFromWatchlist(ticker);
      loadWatchlist();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = items.filter(
    i =>
      i.ticker.toLowerCase().includes(searchFilter.toLowerCase()) ||
      i.companyName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <BookmarkCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Watchlist Quantitative Monitor
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-asset monitoring matrix with Conformal 90% envelopes, HMM regimes, and FinBERT tone.
          </p>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleAddTicker} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add Ticker (e.g. INFY.NS)"
            value={newTickerInput}
            onChange={e => setNewTickerInput(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-cyan-500 w-44"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 w-64 text-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Filter watchlist..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
        </div>
        <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
          Showing {filtered.length} of {items.length} assets
        </span>
      </div>

      {/* Watchlist Table */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm dark:shadow-lg transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                <th className="py-3 px-4 font-medium">Ticker & Company</th>
                <th className="py-3 px-4 font-medium text-right">Current Price</th>
                <th className="py-3 px-4 font-medium text-right">Day Chg</th>
                <th className="py-3 px-4 font-medium text-right">Point Forecast</th>
                <th className="py-3 px-4 font-medium text-center">90% Prediction Interval</th>
                <th className="py-3 px-4 font-medium text-center">Market Regime</th>
                <th className="py-3 px-4 font-medium text-center">FinBERT Tone</th>
                <th className="py-3 px-4 font-medium text-center">Drift Health</th>
                <th className="py-3 px-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                    No watchlist assets found.
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const isUp = item.dailyChange >= 0;
                  const isHealthy = item.driftStatus === 'Healthy';
                  const isINR = item.ticker.endsWith('.NS');
                  const currSym = isINR ? '₹' : '$';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/70 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onSelectTicker(item.ticker)}
                          className="text-left font-sans font-bold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer block"
                        >
                          {item.ticker}
                        </button>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans block truncate max-w-[140px]">
                          {item.companyName}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-bold tabular-nums">
                        {currSym}{item.currentPrice.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-right tabular-nums">
                        <span
                          className={`font-semibold ${
                            isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isUp ? '+' : ''}{item.dailyChange.toFixed(2)} ({isUp ? '+' : ''}{item.dailyChangePercent.toFixed(2)}%)
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-cyan-700 dark:text-cyan-300 font-semibold tabular-nums">
                        {currSym}{item.predictedPrice.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-center tabular-nums text-slate-700 dark:text-slate-300">
                        {currSym}{item.lowerBound.toLocaleString()} ─ {currSym}{item.upperBound.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                          {item.regime.split('/')[0].trim()}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            item.sentiment === 'positive'
                              ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
                              : item.sentiment === 'negative'
                              ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60'
                              : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900'
                          }`}
                        >
                          {item.sentiment.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isHealthy ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 font-sans font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" /> Normal
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 font-sans font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" /> Drift
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleRemoveTicker(item.ticker)}
                          title="Remove from watchlist"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DisclaimerBanner />
    </div>
  );
};
