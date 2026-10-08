/**
 * AlphaQuant AI - Markets Screener & Cross-Asset Correlation Heatmap
 * Multi-exchange stock screener covering Indian (NSE) and US markets
 * with valuation multiples, regime classifications, and an institutional Cross-Asset Correlation Matrix.
 */

import React, { useState, useEffect } from 'react';
import {
  Globe2,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  BookmarkPlus,
  Grid,
  List,
  ShieldCheck,
  Activity,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { TICKER_CATALOG } from '../server/services/stockService';
import { StockQuote, CorrelationMatrixData } from '../types';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface Props {
  onSelectTicker: (ticker: string) => void;
}

export const MarketsPage: React.FC<Props> = ({ onSelectTicker }) => {
  const [activeTab, setActiveTab] = useState<'screener' | 'correlation'>('screener');
  const [exchangeFilter, setExchangeFilter] = useState<'ALL' | 'NSE' | 'NASDAQ' | 'US'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [correlationData, setCorrelationData] = useState<CorrelationMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [corrLoading, setCorrLoading] = useState(false);

  useEffect(() => {
    async function loadAllQuotes() {
      setLoading(true);
      const map: Record<string, StockQuote> = {};
      for (const t of TICKER_CATALOG) {
        try {
          const q = await api.getQuote(t.ticker);
          map[t.ticker] = q;
        } catch {}
      }
      setQuotes(map);
      setLoading(false);
    }
    loadAllQuotes();
  }, []);

  useEffect(() => {
    if (activeTab === 'correlation' && !correlationData) {
      async function loadCorrelation() {
        setCorrLoading(true);
        try {
          const data = await api.getMarketCorrelation();
          setCorrelationData(data);
        } catch (e) {
          console.error(e);
        } finally {
          setCorrLoading(false);
        }
      }
      loadCorrelation();
    }
  }, [activeTab, correlationData]);

  const filtered = TICKER_CATALOG.filter(t => {
    if (exchangeFilter === 'NSE' && !t.ticker.endsWith('.NS')) return false;
    if (exchangeFilter === 'NASDAQ' && t.exchange !== 'NASDAQ') return false;
    if (exchangeFilter === 'US' && t.ticker.endsWith('.NS')) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.ticker.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
    }
    return true;
  });

  const getCorrColor = (val: number) => {
    if (val >= 0.7) return 'bg-cyan-500/80 text-slate-950 font-bold';
    if (val >= 0.4) return 'bg-cyan-500/40 text-cyan-200';
    if (val >= 0.1) return 'bg-cyan-500/20 text-slate-300';
    if (val >= -0.1) return 'bg-slate-800 text-slate-400';
    if (val >= -0.4) return 'bg-amber-500/20 text-amber-200';
    return 'bg-rose-500/40 text-rose-200 font-bold';
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-cyan-400" />
            Global Markets Screener & Cross-Asset Matrix
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Institutional screener spanning Indian Equities (NSE) and US Equities with macroeconomic correlation.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('screener')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'screener'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Stock Screener</span>
          </button>
          <button
            onClick={() => setActiveTab('correlation')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'correlation'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Correlation Heatmap</span>
          </button>
        </div>
      </div>

      {activeTab === 'screener' ? (
        <>
          {/* Screener Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Search Input */}
            <div className="flex items-center bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Filter by ticker symbol or company name (e.g. Reliance, Nvidia, Infosys)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Exchange Filter Segmented Control */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              {(['ALL', 'NSE', 'US'] as const).map(ex => (
                <button
                  key={ex}
                  onClick={() => setExchangeFilter(ex)}
                  className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                    exchangeFilter === ex
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {ex === 'ALL' ? 'All Exchanges' : ex === 'NSE' ? 'Indian (NSE)' : 'US Equities'}
                </button>
              ))}
            </div>
          </div>

          {/* Screener Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] text-slate-400 uppercase">
                    <th className="py-3 px-4 font-medium font-sans">Ticker & Name</th>
                    <th className="py-3 px-4 font-medium font-sans">Exchange</th>
                    <th className="py-3 px-4 font-medium text-right">Price</th>
                    <th className="py-3 px-4 font-medium text-right">Daily Change</th>
                    <th className="py-3 px-4 font-medium text-right">P/E Ratio</th>
                    <th className="py-3 px-4 font-medium text-right">Market Cap</th>
                    <th className="py-3 px-4 font-medium text-center font-sans">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map(t => {
                    const quote = quotes[t.ticker];
                    const price = quote?.price || t.basePrice;
                    const change = quote?.change || (t.basePrice * 0.012);
                    const changePercent = quote?.changePercent || 1.2;
                    const isUp = change >= 0;
                    const currSym = t.currency === 'INR' ? '₹' : '$';

                    return (
                      <tr key={t.ticker} className="hover:bg-slate-900/70 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => onSelectTicker(t.ticker)}
                            className="font-sans font-bold text-white hover:text-cyan-400 transition-colors cursor-pointer text-left block"
                          >
                            {t.ticker}
                          </button>
                          <span className="text-[10px] text-slate-400 font-sans block truncate max-w-[160px]">
                            {t.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-sans text-xs">
                          {t.exchange}
                        </td>
                        <td className="py-3 px-4 text-right text-white font-bold tabular-nums">
                          {currSym}{price.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          <span className={`font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePercent.toFixed(2)}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300 tabular-nums">
                          {t.pe.toFixed(1)}x
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300 tabular-nums">
                          {currSym}{(t.marketCap / 1e9).toFixed(1)}B
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => onSelectTicker(t.ticker)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-sans font-medium flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                          >
                            <span>Analyze</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* CORRELATION MATRIX & REGIME HEATMAP */
        <div className="space-y-6">
          {/* Asset Characteristics Matrix Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {correlationData?.assets.map(a => (
              <div key={a.ticker} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-xs font-mono font-bold text-white block">{a.ticker.replace('.NS', '')}</span>
                <span className="text-[10px] text-slate-400 block truncate">{a.name}</span>
                <div className="pt-1 border-t border-slate-800/60 space-y-0.5 text-[10px] font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Beta:</span>
                    <span className="text-cyan-300 font-semibold">{a.beta}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Vol:</span>
                    <span className="text-white font-semibold">{a.volatility}%</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Regime:</span>
                    <span className="text-emerald-400">{a.regime.includes('Bullish') ? 'Bullish' : 'Bearish'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Matrix Table */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  60-Day Rolling Pearson Cross-Asset Return Correlation (R_ij)
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Pairwise log-return co-movements (-1.0 to +1.0)
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-400 font-mono">
                Multi-Exchange Aligned
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                    <th className="py-2.5 px-3 text-left font-sans">Asset</th>
                    {correlationData?.tickers.map(t => (
                      <th key={t} className="py-2.5 px-3 font-semibold text-white">
                        {t.replace('.NS', '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {correlationData?.tickers.map((rowTicker, rowIdx) => (
                    <tr key={rowTicker} className="hover:bg-slate-900/50">
                      <td className="py-2.5 px-3 text-left font-bold text-white font-sans">
                        {rowTicker.replace('.NS', '')}
                      </td>
                      {correlationData.matrix[rowIdx].map((val, colIdx) => (
                        <td key={colIdx} className="py-2 px-3">
                          <span className={`inline-block w-12 py-1 rounded text-[11px] tabular-nums font-mono ${getCorrColor(val)}`}>
                            {val.toFixed(2)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-cyan-500/80 inline-block" /> Strong Positive (&gt; +0.70)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-slate-800 inline-block" /> Uncorrelated (±0.10)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-500/40 inline-block" /> Negative/Hedging (&lt; -0.20)
                </span>
              </div>
              <span className="text-[11px] text-slate-500">Updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}

      <DisclaimerBanner />
    </div>
  );
};
