/**
 * AlphaQuant AI - Markets Screener & Cross-Asset Correlation Heatmap
 * Multi-exchange stock screener covering Indian (NSE) and US markets
 * with valuation multiples, regime classifications, and an institutional Cross-Asset Correlation Matrix.
 * Fully optimized for pleasant light mode and dark mode.
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
import { TICKER_CATALOG } from '../shared/tickerCatalog';
import { StockQuote, CorrelationMatrixData } from '../types';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { useTheme } from '../context/ThemeContext';

interface Props {
  onSelectTicker: (ticker: string) => void;
}

export const MarketsPage: React.FC<Props> = ({ onSelectTicker }) => {
  const { theme } = useTheme();
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
      const initialBatch = TICKER_CATALOG.slice(0, 16);
      
      await Promise.all(
        initialBatch.map(async t => {
          try {
            const q = await api.getQuote(t.ticker);
            map[t.ticker] = q;
          } catch {}
        })
      );
      setQuotes({ ...map });
      setLoading(false);

      // Load remaining in chunks
      const remaining = TICKER_CATALOG.slice(16);
      for (let i = 0; i < remaining.length; i += 6) {
        const chunk = remaining.slice(i, i + 6);
        await Promise.all(
          chunk.map(async t => {
            try {
              const q = await api.getQuote(t.ticker);
              map[t.ticker] = q;
            } catch {}
          })
        );
        setQuotes(prev => ({ ...prev, ...map }));
      }
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
      return (
        t.ticker.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        (t.aliases && t.aliases.some((a: string) => a.toLowerCase().includes(q))) ||
        (t.sector && t.sector.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getCorrColor = (val: number) => {
    if (val >= 0.7) return 'bg-cyan-500 text-slate-950 font-bold';
    if (val >= 0.4) return 'bg-cyan-100 text-cyan-900 dark:bg-cyan-500/40 dark:text-cyan-200 font-semibold';
    if (val >= 0.1) return 'bg-cyan-50 text-cyan-800 dark:bg-cyan-500/20 dark:text-slate-300';
    if (val >= -0.1) return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    if (val >= -0.4) return 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200';
    return 'bg-rose-100 text-rose-900 dark:bg-rose-500/40 dark:text-rose-200 font-bold';
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md transition-colors">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Global Markets Screener & Cross-Asset Matrix
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Institutional screener spanning Indian Equities (NSE) and US Equities with macroeconomic correlation.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('screener')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'screener'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Stock Screener</span>
          </button>
          <button
            onClick={() => setActiveTab('correlation')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'correlation'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            {/* Search Input */}
            <div className="flex items-center bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs flex-1 max-w-md shadow-xs">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Filter by ticker or company (e.g. Reliance, Nvidia, Infosys)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Exchange Filter Segmented Control */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
              {(['ALL', 'NSE', 'US'] as const).map(ex => (
                <button
                  key={ex}
                  onClick={() => setExchangeFilter(ex)}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    exchangeFilter === ex
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {ex === 'ALL' ? 'All Exchanges' : ex === 'NSE' ? 'Indian (NSE)' : 'US Equities'}
                </button>
              ))}
            </div>
          </div>

          {/* Screener Table */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                    <th className="py-3 px-4 font-medium font-sans">Ticker & Name</th>
                    <th className="py-3 px-4 font-medium font-sans">Exchange</th>
                    <th className="py-3 px-4 font-medium text-right">Price</th>
                    <th className="py-3 px-4 font-medium text-right">Daily Change</th>
                    <th className="py-3 px-4 font-medium text-right">P/E Ratio</th>
                    <th className="py-3 px-4 font-medium text-right">Market Cap</th>
                    <th className="py-3 px-4 font-medium text-center font-sans">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filtered.map(t => {
                    const quote = quotes[t.ticker];
                    const price = quote?.price || t.basePrice;
                    const change = quote?.change || (t.basePrice * 0.012);
                    const changePercent = quote?.changePercent || 1.2;
                    const isUp = change >= 0;
                    const currSym = t.currency === 'INR' ? '₹' : '$';

                    return (
                      <tr key={t.ticker} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => onSelectTicker(t.ticker)}
                            className="font-sans font-bold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer text-left block"
                          >
                            {t.ticker}
                          </button>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans block truncate max-w-[160px]">
                            {t.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-sans text-xs">
                          {t.exchange}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-bold tabular-nums">
                          {currSym}{price.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          <span className={`font-semibold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePercent.toFixed(2)}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                          {t.pe.toFixed(1)}x
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                          {currSym}{(t.marketCap / 1e9).toFixed(1)}B
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => onSelectTicker(t.ticker)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-cyan-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-400 text-xs font-sans font-semibold flex items-center gap-1 mx-auto transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
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
              <div key={a.ticker} className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 transition-colors">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white block">{a.ticker.replace('.NS', '')}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">{a.name}</span>
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800/60 space-y-0.5 text-[10px] font-mono">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Beta:</span>
                    <span className="text-cyan-700 dark:text-cyan-300 font-semibold">{a.beta}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Vol:</span>
                    <span className="text-slate-800 dark:text-white font-semibold">{a.volatility}%</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Regime:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{a.regime.includes('Bullish') ? 'Bullish' : 'Bearish'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Matrix Table */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  60-Day Rolling Pearson Cross-Asset Return Correlation (R_ij)
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Pairwise log-return co-movements (-1.0 to +1.0)
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-slate-950 border border-cyan-200 dark:border-slate-800 text-cyan-800 dark:text-cyan-400 font-mono font-medium">
                Multi-Exchange Aligned
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-950/60">
                    <th className="py-2.5 px-3 text-left font-sans">Asset</th>
                    {correlationData?.tickers.map(t => (
                      <th key={t} className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {t.replace('.NS', '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {correlationData?.tickers.map((rowTicker, rowIdx) => (
                    <tr key={rowTicker} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-left font-bold text-slate-900 dark:text-white font-sans">
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

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-cyan-500 inline-block" /> Strong Positive (&gt; +0.70)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-800 inline-block" /> Uncorrelated (±0.10)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-200 dark:bg-rose-500/40 inline-block" /> Negative/Hedging (&lt; -0.20)
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}

      <DisclaimerBanner />
    </div>
  );
};
