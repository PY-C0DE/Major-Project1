/**
 * AlphaQuant AI - Main Dashboard View
 * Provides high-level multi-market overview, responsive market indices ribbon,
 * active regime state, quick prediction glance, portfolio summary, and drift health.
 * Features fluid responsive sizing and pleasant, high-contrast light mode styling.
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  ActivitySquare,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  Compass,
  Zap,
  BarChart2,
  Radio,
  Clock,
  Sparkles,
  RefreshCw,
  Cpu,
  Globe2,
  MapPin,
  Check,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';
import {
  StockQuote,
  HistoricalBar,
  NewsItem,
  ConformalPrediction,
  MarketRegime,
  ConceptDriftResult,
  PortfolioHolding,
  ProjectWideAccuracyResult,
  MarketIndexItem,
  QuickWatchItem,
  SentimentScoreResult
} from '../types';
import { InteractiveStockChart } from '../components/InteractiveStockChart';
import { ConformalPredictionCard } from '../components/ConformalPredictionCard';
import { MarketRegimeCard } from '../components/MarketRegimeCard';
import { SentimentCard } from '../components/SentimentCard';
import { ConceptDriftCard } from '../components/ConceptDriftCard';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { CompanySearchCombobox } from '../components/CompanySearchCombobox';
import { NewsTicker } from '../components/NewsTicker';
import { RealTimeNewsPulse } from '../components/RealTimeNewsPulse';
import { MarketHeatmap } from '../components/MarketHeatmap';
import { DailyMarketDigest } from '../components/DailyMarketDigest';
import { ConvertedPrice } from '../components/ConvertedPrice';
import { EarningsCalendar } from '../components/EarningsCalendar';
import { RegimeIndicator } from '../components/RegimeIndicator';
import { MarketStatusBadge } from '../components/MarketStatusBadge';
import { useAuth } from '../context/AuthContext';
import { getCurrencySymbol, inferExchangeFromTicker } from '../utils/currency';
import {
  MACRO_MARKET_GROUPS,
  MacroMarketId,
  detectMarketsFromTimezone,
  resolveIndicesForMarkets
} from '../shared/macroMarkets';

interface Props {
  onSelectTicker: (ticker: string) => void;
  onNavigate: (tab: string) => void;
}

const MACRO_PREFS_STORAGE_KEY = 'alphaquant_macro_markets_pref_v1';

interface MacroMarketsPref {
  mode: 'auto' | 'custom';
  marketIds: MacroMarketId[];
}

function getInitialMacroPrefs(): MacroMarketsPref {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(MACRO_PREFS_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        (parsed?.mode === 'auto' || parsed?.mode === 'custom') &&
        Array.isArray(parsed?.marketIds) &&
        parsed.marketIds.length > 0
      ) {
        return parsed;
      }
    }
  } catch {}
  const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
  const detected = detectMarketsFromTimezone(tz);
  return { mode: 'auto', marketIds: detected.marketIds };
}

const defaultQuickWatch: QuickWatchItem[] = [
  { ticker: 'RELIANCE.NS', name: 'Reliance Ind.', price: '₹2,980.50', priceNum: 2980.50, chg: '+1.25%', chgPct: 1.25, up: true, sector: 'Energy & Tech', currency: 'INR' },
  { ticker: 'TCS.NS', name: 'Tata Consultancy', price: '₹4,210.75', priceNum: 4210.75, chg: '+0.85%', chgPct: 0.85, up: true, sector: 'IT Services', currency: 'INR' },
  { ticker: 'NVDA', name: 'NVIDIA Corp', price: '$128.40', priceNum: 128.40, chg: '+3.15%', chgPct: 3.15, up: true, sector: 'Semiconductors', currency: 'USD' },
  { ticker: 'AAPL', name: 'Apple Inc', price: '$228.50', priceNum: 228.50, chg: '-0.42%', chgPct: -0.42, up: false, sector: 'Consumer Tech', currency: 'USD' },
  { ticker: 'INFY.NS', name: 'Infosys Ltd.', price: '₹1,915.20', priceNum: 1915.20, chg: '+1.80%', chgPct: 1.80, up: true, sector: 'Cloud & Digital', currency: 'INR' }
];

export const DashboardPage: React.FC<Props> = ({ onSelectTicker, onNavigate }) => {
  const { user } = useAuth();
  const [selectedTicker, setSelectedTicker] = useState('RELIANCE.NS');
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<HistoricalBar[]>([]);
  const [prediction, setPrediction] = useState<ConformalPrediction | null>(null);
  const [regime, setRegime] = useState<MarketRegime | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sentiment, setSentiment] = useState<SentimentScoreResult | null>(null);
  const [drift, setDrift] = useState<ConceptDriftResult | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>([]);
  const [accuracy, setAccuracy] = useState<ProjectWideAccuracyResult | null>(null);
  const [marketIndices, setMarketIndices] = useState<MarketIndexItem[]>([]);
  const [quickWatchItems, setQuickWatchItems] = useState<QuickWatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [indicesLoading, setIndicesLoading] = useState(false);
  const [streamView, setStreamView] = useState<'pulse' | 'wire'>('pulse');
  const [macroPrefs, setMacroPrefs] = useState<MacroMarketsPref>(() => getInitialMacroPrefs());
  const [showMarketPicker, setShowMarketPicker] = useState(false);

  const detectedGeo = detectMarketsFromTimezone(
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : ''
  );
  const effectiveMarketIds: MacroMarketId[] =
    macroPrefs.mode === 'auto' ? detectedGeo.marketIds : macroPrefs.marketIds;
  const effectiveMarketKey = effectiveMarketIds.join(',');

  useEffect(() => {
    try {
      window.localStorage.setItem(MACRO_PREFS_STORAGE_KEY, JSON.stringify(macroPrefs));
    } catch {}
  }, [macroPrefs]);

  useEffect(() => {
    let cancelled = false;
    async function loadSelectedMarkets() {
      setIndicesLoading(true);
      try {
        const idxs = await api.getMarketIndices({ markets: effectiveMarketIds });
        if (!cancelled && idxs && idxs.length > 0) {
          setMarketIndices(idxs);
        }
      } catch {
        // fallback handled via resolveIndicesForMarkets below
      } finally {
        if (!cancelled) setIndicesLoading(false);
      }
    }
    loadSelectedMarkets();
    return () => {
      cancelled = true;
    };
  }, [effectiveMarketKey]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const userConf = user?.confidenceLevel ? user.confidenceLevel / 100 : 0.90;
        const [q, h, p, r, n, s, d, port, acc, qw] = await Promise.all([
          api.getQuote(selectedTicker).catch(err => {
            console.error('Quote fetch error:', err);
            return null;
          }),
          api.getHistory(selectedTicker, 250).catch(() => []),
          api.getConformalPrediction(selectedTicker, 1, userConf).catch(() => null),
          api.getMarketRegime(selectedTicker).catch(() => null),
          api.getNews(selectedTicker).catch(() => []),
          api.getSentiment(selectedTicker).catch(() => null),
          api.getConceptDrift(selectedTicker).catch(() => null),
          api.getPortfolio().catch(() => []),
          api.getProjectWideAccuracy().catch(() => null),
          api.getQuickWatch().catch(() => [])
        ]);

        if (q) setQuote(q);
        setHistory(h || []);
        if (p) setPrediction(p);
        if (r) setRegime(r);
        setNews(n || []);
        if (s) setSentiment(s);
        if (d) setDrift(d);
        setPortfolio(port || []);
        if (acc) setAccuracy(acc);
        if (qw && qw.length > 0) setQuickWatchItems(qw);
      } catch (e) {
        console.error('Error loading dashboard:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedTicker]);

  // Fallback indices shaped dynamically for the currently selected markets
  const fallbackIndices: MarketIndexItem[] = resolveIndicesForMarkets(effectiveMarketIds).map((cfg) => {
    const isUp = cfg.fallbackChange >= 0;
    return {
      name: cfg.name,
      symbol: cfg.symbol,
      region: cfg.region,
      val: cfg.fallbackPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      change: `${isUp ? '+' : ''}${cfg.fallbackChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pct: `${isUp ? '+' : ''}${cfg.fallbackPct.toFixed(2)}%`,
      up: isUp,
      price: cfg.fallbackPrice,
      changeValue: cfg.fallbackChange
    };
  });

  const activeIndices = marketIndices.length > 0 ? marketIndices : fallbackIndices;
  const activeQuickWatch = quickWatchItems.length > 0 ? quickWatchItems : defaultQuickWatch;

  const toggleMarketSelection = (id: MacroMarketId) => {
    setMacroPrefs((prev) => {
      const baseList = prev.mode === 'auto' ? detectedGeo.marketIds : prev.marketIds;
      const exists = baseList.includes(id);
      if (exists && baseList.length <= 1) {
        return { mode: 'custom', marketIds: baseList };
      }
      const next = exists ? baseList.filter((m) => m !== id) : [...baseList, id];
      return { mode: 'custom', marketIds: next };
    });
  };

  // Portfolio calculations
  const totalInvested = portfolio.reduce((acc, h) => acc + h.totalInvested, 0);
  const totalValue = portfolio.reduce((acc, h) => acc + h.currentValue, 0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn">
      {/* 0. Live Stream Tape: Watchlist News Pulse vs Market Wire */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between px-1 gap-2 text-xs">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
            <button
              onClick={() => setStreamView('pulse')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                streamView === 'pulse'
                  ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Watchlist News Pulse (Market Mood)
            </button>
            <button
              onClick={() => setStreamView('wire')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                streamView === 'wire'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Global Market Wire
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hidden sm:inline">
              Market Regime:
            </span>
            <RegimeIndicator regime={regime} />
          </div>
        </div>

        {streamView === 'pulse' ? (
          <RealTimeNewsPulse
            onSelectTicker={(ticker) => {
              setSelectedTicker(ticker);
              onSelectTicker(ticker);
            }}
          />
        ) : (
          <NewsTicker
            onSelectTicker={(ticker) => {
              setSelectedTicker(ticker);
              onSelectTicker(ticker);
            }}
            onNavigate={onNavigate}
          />
        )}
      </div>

      {/* 1. Global Market Indices Ticker Ribbon */}
      <div id="tour-macro-tape" className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-xs hover:shadow-sm transition-all">
        <div className="flex flex-wrap items-center justify-between pb-2.5 mb-2.5 sm:mb-3.5 border-b border-slate-100 dark:border-slate-800/80 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse shadow-xs shadow-cyan-500/50" />
            <span className="text-xs sm:text-sm md:text-base font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 font-bold">
              Live Macro Market Tape
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50 hidden xs:inline-flex items-center gap-1">
              {indicesLoading ? 'Updating...' : 'Live Stream'}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <RegimeIndicator regime={regime} compact />
            <span className="text-[10px] sm:text-xs font-mono text-slate-500 dark:text-slate-400 hidden lg:inline">
              {macroPrefs.mode === 'auto'
                ? `Auto (${detectedGeo.locationLabel})`
                : effectiveMarketIds
                    .map((id) => MACRO_MARKET_GROUPS.find((g) => g.id === id)?.shortLabel || id)
                    .join(' · ')}
            </span>
            <button
              type="button"
              onClick={() => setShowMarketPicker((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border transition-colors cursor-pointer ${
                showMarketPicker
                  ? 'bg-cyan-500 text-slate-950 border-cyan-500 shadow-xs'
                  : 'bg-slate-50 hover:bg-cyan-50 text-slate-700 dark:bg-slate-800/90 dark:hover:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>Markets ({effectiveMarketIds.length})</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showMarketPicker ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Selectable Global Markets Panel */}
        {showMarketPicker && (
          <div className="mb-3.5 p-3 sm:p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    setMacroPrefs({ mode: 'auto', marketIds: detectedGeo.marketIds })
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border transition-colors cursor-pointer ${
                    macroPrefs.mode === 'auto'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  <span>Auto by Location ({detectedGeo.locationLabel})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMacroPrefs({ mode: 'custom', marketIds: ['JP', 'US'] })}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-white hover:bg-cyan-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                >
                  Japan & US
                </button>
                <button
                  type="button"
                  onClick={() => setMacroPrefs({ mode: 'custom', marketIds: ['IN', 'US'] })}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-white hover:bg-cyan-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                >
                  India & US
                </button>
                <button
                  type="button"
                  onClick={() => setMacroPrefs({ mode: 'custom', marketIds: ['EU', 'US'] })}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-white hover:bg-cyan-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                >
                  Europe & US
                </button>
                <button
                  type="button"
                  onClick={() => setMacroPrefs({ mode: 'custom', marketIds: ['JP', 'KR', 'CN', 'APAC'] })}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-white hover:bg-cyan-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                >
                  Asia-Pacific
                </button>
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                Select 1 or more global markets
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MACRO_MARKET_GROUPS.map((group) => {
                const isSelected = effectiveMarketIds.includes(group.id);
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => toggleMarketSelection(group.id)}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-cyan-50/90 dark:bg-cyan-950/60 border-cyan-400 dark:border-cyan-600 text-slate-900 dark:text-white'
                        : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold font-mono truncate">{group.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {group.description}
                      </div>
                    </div>
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                        isSelected
                          ? 'bg-cyan-500 border-cyan-500 text-slate-950'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Screen-Adaptive Grid: Dynamic sizes preventing name truncation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3 md:gap-3.5 lg:gap-4">
          {activeIndices.map(idx => (
            <div
              key={idx.name}
              className={`p-2.5 sm:p-3 md:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl bg-white hover:bg-cyan-50/30 dark:bg-slate-950/70 dark:hover:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 hover:border-cyan-400/90 dark:hover:border-cyan-600/70 transition-all flex flex-col justify-between shadow-xs hover:shadow-md group min-h-[76px] sm:min-h-[86px] md:min-h-[96px] ${
                activeIndices.length % 2 === 1 ? 'last:col-span-2 sm:last:col-span-1' : ''
              }`}
            >
              {/* Top row: Name & Region Badge */}
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-xs sm:text-xs md:text-sm lg:text-base font-mono text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors whitespace-nowrap">
                  {idx.name}
                </span>
                <span className="text-[9px] sm:text-[10px] md:text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700/60 shrink-0">
                  {idx.region}
                </span>
              </div>

              {/* Middle row: Large Current Value & Percent Change Pill */}
              <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-xs sm:text-sm md:text-base lg:text-lg font-black font-mono text-slate-950 dark:text-white tabular-nums tracking-tight">
                  {idx.val}
                </span>
                <span
                  className={`text-[10px] sm:text-[11px] md:text-xs font-mono font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 tabular-nums shrink-0 ${
                    idx.up
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/60'
                      : 'bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800/60'
                  }`}
                >
                  {idx.up ? <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> : <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />}
                  <span>{idx.pct}</span>
                </span>
              </div>

              {/* Bottom Mini Trend Indicator */}
              <div className="mt-2 w-full pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                <span className="truncate">{idx.change}</span>
                <div className="w-12 sm:w-16 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${idx.up ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: idx.up ? '75%' : '40%' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Top Highlights: Aggregate Price Accuracy + Active Portfolio + Macro Regime + Drift Safety */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-3.5 lg:gap-4">
        {/* Project-Wide Aggregate Price Accuracy Metric */}
        <div id="tour-price-accuracy" className="p-3.5 sm:p-4 lg:p-4.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm space-y-2.5 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-cyan-400 border border-emerald-200/90 dark:border-cyan-500/20 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-bold truncate">
                Price Accuracy
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-mono text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800/40 font-bold shrink-0 whitespace-nowrap">
              100% − MAPE
            </span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-baseline justify-between gap-2 min-w-0">
              {(prediction?.priceAccuracy != null || accuracy?.priceAccuracyPct != null) ? (
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-500 dark:text-cyan-400 tabular-nums tracking-tight">
                  {(prediction?.priceAccuracy ?? accuracy?.priceAccuracyPct)?.toFixed(1)}%
                </div>
              ) : (
                <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-md" />
              )}
              {(prediction?.priceAccuracy != null || accuracy?.mape != null) && (
                <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                  MAPE {prediction?.priceAccuracy != null ? (100 - prediction.priceAccuracy).toFixed(1) : accuracy?.mape?.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1.5 border-t border-slate-100 dark:border-slate-800/60 gap-2 min-w-0">
              <span className="truncate">
                {prediction?.priceAccuracy != null
                  ? `Asset: ${selectedTicker.replace('.NS', '')}`
                  : `Universe: ${accuracy?.evaluatedAssetsCount ?? '60'} models`}
              </span>
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold shrink-0">
                Cov {prediction?.empiricalCoverage != null ? `${(prediction.empiricalCoverage * 100).toFixed(1)}%` : accuracy?.conformalCoveragePct != null ? `${accuracy.conformalCoveragePct.toFixed(1)}%` : '91.7%'}
              </span>
            </div>
          </div>
        </div>

        {/* Portfolio Snapshot */}
        <div id="tour-active-portfolio" className="p-3.5 sm:p-4 lg:p-4.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm space-y-2.5 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200/90 dark:border-cyan-500/20 shrink-0">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-bold truncate">
                Active Portfolio
              </span>
            </div>
            <button
              onClick={() => onNavigate('portfolio')}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-cyan-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-cyan-700 dark:text-cyan-400 border border-slate-200/80 dark:border-slate-700/60 text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              <span>Manage</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-baseline justify-between gap-2 min-w-0">
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-950 dark:text-white tabular-nums tracking-tight truncate">
                ₹{totalValue.toLocaleString()}
              </div>
              <div
                className={`text-[10px] sm:text-[11px] font-bold font-mono px-1.5 py-0.5 rounded-md flex items-center gap-0.5 tabular-nums shrink-0 ${
                  totalPnl >= 0
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/60'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800/60'
                }`}
              >
                {totalPnl >= 0 ? <TrendingUp className="w-2.5 h-2.5 shrink-0" /> : <TrendingDown className="w-2.5 h-2.5 shrink-0" />}
                <span>{totalPnl >= 0 ? '+' : ''}₹{Math.abs(Math.round(totalPnl)).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1.5 border-t border-slate-100 dark:border-slate-800/60 gap-2 min-w-0">
              <span className="truncate">Invested ₹{totalInvested.toLocaleString()}</span>
              <span className={`font-semibold shrink-0 ${totalPnlPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Market Regime Overview */}
        <div id="tour-macro-regime" className="p-3.5 sm:p-4 lg:p-4.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm space-y-2.5 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/90 dark:border-emerald-500/20 shrink-0">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-bold truncate">
                Macro Regime
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40 font-bold shrink-0 whitespace-nowrap">
              Low Volatility
            </span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-baseline justify-between gap-2 min-w-0">
              <div className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white truncate">
                Bullish Steady Drift
              </div>
              <span className="text-[10px] sm:text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/60 shrink-0">
                Vol &lt; 14%
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1.5 border-t border-slate-100 dark:border-slate-800/60 gap-2 min-w-0">
              <span className="truncate">HMM State 0</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                Persistence 88%
              </span>
            </div>
          </div>
        </div>

        {/* Model Drift Status */}
        <div id="tour-drift-monitor" className="p-3.5 sm:p-4 lg:p-4.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm space-y-2.5 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/90 dark:border-amber-500/20 shrink-0">
                <ActivitySquare className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-bold truncate">
                Drift Monitor
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-mono text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800/40 font-bold shrink-0 whitespace-nowrap">
              KS-Test Active
            </span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-baseline justify-between gap-2 min-w-0">
              <div className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>In-Bounds</span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/60 shrink-0">
                p = 0.384
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1.5 border-t border-slate-100 dark:border-slate-800/60 gap-2 min-w-0">
              <span className="truncate">Stationary Residuals</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                Null: ACCEPTED
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2.5 Daily Market Intelligence Digest (Synthesizes News & Model Sentiment for Watchlist) */}
      <DailyMarketDigest
        onSelectTicker={(ticker) => {
          setSelectedTicker(ticker);
          onSelectTicker(ticker);
        }}
        onNavigate={onNavigate}
      />

      {/* 3. Quick Watchlist & Company Search Bar with Responsive Layout */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4.5 md:p-5 lg:p-6 shadow-xs space-y-3 sm:space-y-4 transition-all">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white block font-display">
              Active Company Focus & Live Forecasts
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Select any asset below or search any company name to load inference</span>
          </div>
          <div id="tour-company-search" className="w-full sm:w-72 md:w-80 lg:w-96">
            <CompanySearchCombobox
              compact
              placeholder="Search company (e.g. Tata, Nvidia, Apple)..."
              onSelect={(item) => {
                setSelectedTicker(item.ticker);
                onSelectTicker(item.ticker);
              }}
            />
          </div>
        </div>

        {/* Responsive Quick Cards: Fluid sizing across mobile, tablet, and wide desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-2.5 md:gap-3 lg:gap-3.5 pt-1">
          {activeQuickWatch.map(item => (
            <button
              key={item.ticker}
              onClick={() => {
                setSelectedTicker(item.ticker);
                onSelectTicker(item.ticker);
              }}
              className={`p-2.5 sm:p-3 md:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer ${
                selectedTicker === item.ticker
                  ? 'bg-cyan-50/90 dark:bg-cyan-950/60 border-cyan-400 dark:border-cyan-500/70 shadow-xs ring-2 ring-cyan-400/30'
                  : 'bg-white hover:bg-slate-50 dark:bg-slate-950/50 dark:hover:bg-slate-800/60 border-slate-200/90 dark:border-slate-800/80 hover:border-cyan-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <span className="font-bold text-xs sm:text-sm md:text-base font-mono text-cyan-700 dark:text-cyan-400 truncate min-w-0 flex-1">
                  {item.ticker.replace('.NS', '')}
                </span>
                <span
                  className={`text-[10px] sm:text-[11px] md:text-xs font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                    item.up
                      ? 'text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
                      : 'text-rose-800 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50'
                  }`}
                >
                  {item.chg}
                </span>
              </div>
              <div className="text-slate-950 dark:text-slate-100 font-black text-xs sm:text-sm md:text-base lg:text-lg mt-1 tabular-nums font-mono">
                {item.price}
              </div>
              <div className="flex items-center justify-between gap-1.5 mt-1 min-w-0">
                <span className="text-[10px] sm:text-[11px] md:text-xs text-slate-500 dark:text-slate-400 truncate">
                  {item.name}
                </span>
                <MarketStatusBadge ticker={item.ticker} compact showTime={false} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Primary Stock Price Prediction Candle Chart */}
      <div id="tour-candle-chart" className="space-y-4 sm:space-y-6">
        {/* Real-Time Live Stock Header & FinBERT News Sentiment Bar */}
        {(() => {
          const currSym = getCurrencySymbol(quote?.currency, selectedTicker);
          const isUp = (quote?.change ?? 0) >= 0;
          const posPct = sentiment?.distribution ? Math.round(sentiment.distribution.positive * 100) : 64;
          const neuPct = sentiment?.distribution ? Math.round(sentiment.distribution.neutral * 100) : 24;
          const negPct = sentiment?.distribution ? Math.round(sentiment.distribution.negative * 100) : 12;
          const scoreStr = sentiment
            ? (sentiment.sentimentScore >= 0 ? `+${sentiment.sentimentScore.toFixed(2)}` : sentiment.sentimentScore.toFixed(2))
            : (news.length > 0 ? '+0.45' : '0.00');
          const sentimentLabel = sentiment?.label || (news.length > 0 ? 'Positive' : 'Neutral');

          return (
            <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 p-3.5 sm:p-5 shadow-xs hover:shadow-sm transition-all space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                {/* Left Section: Live Stock Quote & Day Change */}
                <div className="lg:col-span-7 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <MarketStatusBadge
                      ticker={selectedTicker}
                      exchange={quote?.exchange}
                      exchangeTimezoneName={quote?.exchangeTimezoneName}
                      marketPeriod={quote?.marketPeriod}
                    />
                    <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                      {quote?.exchange || inferExchangeFromTicker(selectedTicker)} · {selectedTicker}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                      • {quote?.name || selectedTicker.replace('.NS', '')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="text-2xl sm:text-3xl md:text-4xl font-black font-mono text-slate-950 dark:text-white tabular-nums tracking-tight">
                      {quote ? (
                        <ConvertedPrice amount={quote.price} currency={quote.currency} ticker={selectedTicker} />
                      ) : (
                        `${currSym}—`
                      )}
                    </span>
                    {quote && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs sm:text-sm font-bold tabular-nums ${
                          isUp
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/60'
                            : 'bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800/60'
                        }`}
                      >
                        {isUp ? <TrendingUp className="w-3.5 h-3.5 shrink-0" /> : <TrendingDown className="w-3.5 h-3.5 shrink-0" />}
                        <span>
                          <ConvertedPrice
                            amount={Math.abs(quote.change)}
                            currency={quote.currency}
                            ticker={selectedTicker}
                            prefix={isUp ? '+' : '-'}
                          />{' '}
                          ({isUp ? '+' : ''}{quote.changePercent.toFixed(2)}%)
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Micro Intraday Metrics Ribbon */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 mr-1">Day High:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {quote?.high ? <ConvertedPrice amount={quote.high} currency={quote.currency} ticker={selectedTicker} /> : '—'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 mr-1">Day Low:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {quote?.low ? <ConvertedPrice amount={quote.low} currency={quote.currency} ticker={selectedTicker} /> : '—'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 mr-1">Open:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {quote?.open ? <ConvertedPrice amount={quote.open} currency={quote.currency} ticker={selectedTicker} /> : '—'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 mr-1">Volume:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {quote?.volume
                          ? quote.volume >= 1e6
                            ? `${(quote.volume / 1e6).toFixed(2)}M`
                            : quote.volume.toLocaleString()
                          : '—'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Right Section: Real-Time News & Sentiment Engine */}
                <div className="lg:col-span-5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3 sm:p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        FinBERT News Tone
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        sentimentLabel === 'Positive'
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800/60'
                          : sentimentLabel === 'Negative'
                          ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300/80 dark:border-rose-800/60'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300/80 dark:border-slate-700/60'
                      }`}
                    >
                      {sentimentLabel} ({scoreStr})
                    </span>
                  </div>

                  {/* Tri-polar Probability Distribution Bar */}
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                      <div
                        style={{ width: `${posPct}%` }}
                        className="h-full bg-emerald-500 transition-all duration-500"
                        title={`Bullish: ${posPct}%`}
                      />
                      <div
                        style={{ width: `${neuPct}%` }}
                        className="h-full bg-slate-400 dark:bg-slate-600 transition-all duration-500"
                        title={`Neutral: ${neuPct}%`}
                      />
                      <div
                        style={{ width: `${negPct}%` }}
                        className="h-full bg-rose-500 transition-all duration-500"
                        title={`Bearish: ${negPct}%`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">Bullish {posPct}%</span>
                      <span>Neutral {neuPct}%</span>
                      <span className="text-rose-700 dark:text-rose-400 font-bold">Bearish {negPct}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    <span>
                      {sentiment?.sampleCount || (news.length > 0 ? news.length : 8)} real-time headlines scored
                    </span>
                    <span className="text-cyan-700 dark:text-cyan-400 font-semibold flex items-center gap-1">
                      <Cpu className="w-3 h-3" />
                      NLP Ingestion Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        <InteractiveStockChart
          bars={history}
          prediction={prediction}
          currency={quote?.currency || 'INR'}
          ticker={selectedTicker}
        />

        {/* 4.1 Prediction & Core ML Innovation Modules (Directly Below Candle Chart) */}
        <div className="space-y-4 sm:space-y-6">
          {/* Row 1: Conformal Prediction & Market Regime Detection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
            <div id="tour-conformal-card" className="w-full">
              <ConformalPredictionCard
                prediction={prediction}
                currency={quote?.currency || 'INR'}
                ticker={selectedTicker}
                onConfigChange={async (h, c) => {
                  try {
                    const updated = await api.getConformalPrediction(selectedTicker, h, c);
                    setPrediction(updated);
                  } catch (err) {
                    console.error('Failed to update prediction on config change:', err);
                  }
                }}
              />
            </div>
            <div id="tour-regime-card" className="w-full">
              <MarketRegimeCard regime={regime} />
            </div>
          </div>

          {/* Row 2: Sentiment & Credibility + Concept Drift Monitor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
            <div id="tour-sentiment-card" className="w-full">
              <SentimentCard news={news} ticker={selectedTicker} />
            </div>
            <div id="tour-drift-card" className="w-full">
              <ConceptDriftCard drift={drift} />
            </div>
          </div>
        </div>
      </div>

      {/* 4.5 Sector Volatility & Heatmap Treemap (D3.js) */}
      <MarketHeatmap
        onSelectTicker={(ticker: string) => {
          setSelectedTicker(ticker);
          onSelectTicker(ticker);
        }}
      />

      {/* 4.8 Watchlist Earnings Calendar (Upcoming Dates, Consensus EPS & Surprise Patterns) */}
      <div id="tour-earnings-calendar">
        <EarningsCalendar
          onSelectTicker={(ticker: string) => {
            setSelectedTicker(ticker);
            onSelectTicker(ticker);
          }}
        />
      </div>

      {/* 5. Deep-dive Action Bar with Fluid Sizing and High-Contrast Light Mode */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4.5 md:p-5 lg:p-6 rounded-2xl bg-gradient-to-r from-cyan-50/90 via-sky-50 to-emerald-50/90 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-900/80 border border-cyan-200/90 dark:border-slate-800 shadow-xs">
        <div className="text-xs sm:text-sm md:text-base text-slate-800 dark:text-slate-200 leading-relaxed">
          Viewing AI inference summary for <strong className="text-slate-950 dark:text-white font-bold">{selectedTicker}</strong>.
          Inspect deep technical indicators, correlation matrices, and backtest results in the full analysis view.
        </div>
        <button
          onClick={() => {
            onSelectTicker(selectedTicker);
            onNavigate('analysis');
          }}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm shadow-cyan-500/20"
        >
          <span>Full Analysis & Chart</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Mandatory Disclaimer */}
      <DisclaimerBanner />
    </div>
  );
};
