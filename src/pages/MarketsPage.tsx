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
import { StockQuote, CorrelationMatrixData, TickerMasterItem, TickerSearchResponse } from '../types';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { OptionsVolatilitySurface } from '../components/OptionsVolatilitySurface';
import { ConvertedPrice } from '../components/ConvertedPrice';
import { MarketStatusBadge } from '../components/MarketStatusBadge';
import { useTheme } from '../context/ThemeContext';

interface Props {
  onSelectTicker: (ticker: string) => void;
}

export const MarketsPage: React.FC<Props> = ({ onSelectTicker }) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'screener' | 'correlation' | 'vol_surface'>('screener');
  const [selectedVolTicker, setSelectedVolTicker] = useState('NVDA');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const [exchangeFilter, setExchangeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageLimit = 24;

  const [tickers, setTickers] = useState<TickerMasterItem[]>([]);
  const [totalTickers, setTotalTickers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableExchanges, setAvailableExchanges] = useState<Array<{ mic: string; code: string; country: string }>>([]);

  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [correlationData, setCorrelationData] = useState<CorrelationMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [corrLoading, setCorrLoading] = useState(false);

  // Debounce search query and reset page
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 220);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch paginated global ticker universe from DB
  useEffect(() => {
    let cancelled = false;
    async function loadUniverse() {
      setLoading(true);
      try {
        const res: TickerSearchResponse = await api.searchTickersMaster({
          q: debouncedSearch || undefined,
          country: countryFilter === 'ALL' ? undefined : countryFilter,
          exchange: exchangeFilter === 'ALL' ? undefined : exchangeFilter,
          page,
          limit: pageLimit
        });
        if (cancelled) return;
        setTickers(res.items || []);
        setTotalTickers(res.total || 0);
        setTotalPages(res.totalPages || 1);
        setAvailableCountries(res.filters?.countries || []);
        setAvailableExchanges(res.filters?.exchanges || []);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setTickers([]);
          setTotalTickers(0);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadUniverse();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, countryFilter, exchangeFilter, page]);

  // Batch-load live quotes for visible page rows only
  useEffect(() => {
    let cancelled = false;
    const missingSymbols = tickers
      .map((t) => t.symbol)
      .filter((sym) => !quotes[sym]);

    if (missingSymbols.length === 0) return;

    async function loadVisibleQuotes() {
      for (let i = 0; i < missingSymbols.length; i += 8) {
        if (cancelled) break;
        const chunk = missingSymbols.slice(i, i + 8);
        const batchResults: Record<string, StockQuote> = {};
        await Promise.all(
          chunk.map(async (sym) => {
            try {
              const q = await api.getQuote(sym);
              batchResults[sym] = q;
            } catch {
              // ignore individual quote failure
            }
          })
        );
        if (!cancelled && Object.keys(batchResults).length > 0) {
          setQuotes((prev) => ({ ...prev, ...batchResults }));
        }
      }
    }
    loadVisibleQuotes();
    return () => {
      cancelled = true;
    };
  }, [tickers]);

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
            Institutional global ticker master ({totalTickers} matching equities) with ISO 10383 MIC exchange codes, native currency, and cross-asset correlation.
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
          <button
            onClick={() => setActiveTab('vol_surface')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'vol_surface'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Options Vol Surface</span>
          </button>
        </div>
      </div>

      {activeTab === 'screener' ? (
        <>
          {/* Screener Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            {/* Search Input */}
            <div className="flex items-center bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs flex-1 min-w-[240px] max-w-md shadow-xs">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Search symbol, company, or alias (e.g. Reliance, Toyota, ASML, AAPL)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Global Country & MIC Exchange Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <label htmlFor="market-country-filter" className="text-[11px] text-slate-500 dark:text-slate-400">
                  Country:
                </label>
                <select
                  id="market-country-filter"
                  value={countryFilter}
                  onChange={e => {
                    setCountryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent font-mono font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-white dark:bg-slate-900">All Countries</option>
                  {availableCountries.map(c => (
                    <option key={c} value={c} className="bg-white dark:bg-slate-900">{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <label htmlFor="market-exchange-filter" className="text-[11px] text-slate-500 dark:text-slate-400">
                  Exchange (MIC):
                </label>
                <select
                  id="market-exchange-filter"
                  value={exchangeFilter}
                  onChange={e => {
                    setExchangeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent font-mono font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-white dark:bg-slate-900">All Exchanges</option>
                  {availableExchanges.map(ex => (
                    <option key={ex.mic} value={ex.mic} className="bg-white dark:bg-slate-900">
                      {ex.code} ({ex.mic} · {ex.country})
                    </option>
                  ))}
                </select>
              </div>

              {(countryFilter !== 'ALL' || exchangeFilter !== 'ALL' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setCountryFilter('ALL');
                    setExchangeFilter('ALL');
                    setSearchQuery('');
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Screener Table */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                    <th className="py-3 px-4 font-medium font-sans">Ticker & Name</th>
                    <th className="py-3 px-4 font-medium font-sans">Exchange / Country / Currency</th>
                    <th className="py-3 px-4 font-medium text-right">Price</th>
                    <th className="py-3 px-4 font-medium text-right">Daily Change</th>
                    <th className="py-3 px-4 font-medium text-right">P/E Ratio</th>
                    <th className="py-3 px-4 font-medium text-right">Market Cap</th>
                    <th className="py-3 px-4 font-medium text-center font-sans">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loading && tickers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500 dark:text-slate-400 font-sans">
                        Loading global ticker universe...
                      </td>
                    </tr>
                  ) : tickers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500 dark:text-slate-400 font-sans">
                        No global tickers match the current search or exchange/country filters.
                      </td>
                    </tr>
                  ) : (
                    tickers.map(t => {
                      const quote = quotes[t.symbol];
                      const price = quote?.price ?? t.basePrice ?? null;
                      const change = quote?.change ?? null;
                      const changePercent = quote?.changePercent ?? null;
                      const isUp = (change ?? 0) >= 0;
                      const peVal = quote?.pe ?? t.pe ?? null;
                      const mcapVal = quote?.marketCap ?? t.marketCap ?? null;
                      const nativeCurrency = quote?.currency || t.currency;

                      return (
                        <tr key={t.symbol} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4">
                            <button
                              onClick={() => onSelectTicker(t.symbol)}
                              className="font-sans font-bold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer text-left block"
                            >
                              {t.symbol}
                            </button>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans block truncate max-w-[180px]">
                              {t.name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-sans text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                {t.exchangeCode || t.exchange}
                              </span>
                              <span
                                title={`ISO 10383 MIC: ${t.exchange} · Timezone: ${t.timezone}`}
                                className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              >
                                {t.exchange}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                                {t.country}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                {nativeCurrency}
                              </span>
                              <MarketStatusBadge
                                ticker={t.symbol}
                                exchange={quote?.exchange || t.exchangeCode || t.exchange}
                                exchangeTimezoneName={quote?.exchangeTimezoneName || t.timezone}
                                marketPeriod={quote?.marketPeriod}
                                compact
                                showTime={false}
                              />
                              {quote && quote.isLive === false && (
                                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                  Simulated
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-bold tabular-nums">
                            {price != null ? (
                              <ConvertedPrice amount={price} currency={nativeCurrency} ticker={t.symbol} />
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            {change != null && changePercent != null ? (
                              <span className={`font-semibold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePercent.toFixed(2)}%)
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                            {peVal != null && peVal > 0 ? `${peVal.toFixed(1)}x` : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                            {mcapVal != null && mcapVal > 0 ? (
                              <ConvertedPrice amount={mcapVal / 1e9} currency={nativeCurrency} ticker={t.symbol} decimals={1} suffix="B" />
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => onSelectTicker(t.symbol)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-cyan-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-400 text-xs font-sans font-semibold flex items-center gap-1 mx-auto transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                            >
                              <span>Analyze</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-xs font-mono">
              <span className="text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages} · {totalTickers} global assets
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Next
                </button>
              </div>
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

      {/* Options Volatility Surface & Smile Tab */}
      {activeTab === 'vol_surface' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Select Underlier for D3 Volatility Surface & Smile:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {['NVDA', 'RELIANCE.NS', 'AAPL', 'MSFT', 'TSLA', 'TCS.NS'].map(sym => (
                <button
                  key={sym}
                  onClick={() => setSelectedVolTicker(sym)}
                  className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                    selectedVolTicker === sym
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {sym.replace('.NS', '')}
                </button>
              ))}
            </div>
          </div>

          <OptionsVolatilitySurface
            ticker={selectedVolTicker}
            spotPrice={quotes[selectedVolTicker]?.price}
            onSelectStrike={(strike) => {
              onSelectTicker(selectedVolTicker);
            }}
          />
        </div>
      )}

      <DisclaimerBanner />
    </div>
  );
};
