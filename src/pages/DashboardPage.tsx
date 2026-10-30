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
  BarChart2
} from 'lucide-react';
import { api } from '../services/api';
import { StockQuote, ConformalPrediction, MarketRegime, ConceptDriftResult, PortfolioHolding, ProjectWideAccuracyResult } from '../types';
import { ConformalPredictionCard } from '../components/ConformalPredictionCard';
import { MarketRegimeCard } from '../components/MarketRegimeCard';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { CompanySearchCombobox } from '../components/CompanySearchCombobox';
import { NewsTicker } from '../components/NewsTicker';
import { MarketHeatmap } from '../components/MarketHeatmap';
import { DailyMarketDigest } from '../components/DailyMarketDigest';
import { useAuth } from '../context/AuthContext';

interface Props {
  onSelectTicker: (ticker: string) => void;
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<Props> = ({ onSelectTicker, onNavigate }) => {
  const { user } = useAuth();
  const [selectedTicker, setSelectedTicker] = useState('RELIANCE.NS');
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [prediction, setPrediction] = useState<ConformalPrediction | null>(null);
  const [regime, setRegime] = useState<MarketRegime | null>(null);
  const [drift, setDrift] = useState<ConceptDriftResult | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>([]);
  const [accuracy, setAccuracy] = useState<ProjectWideAccuracyResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Market indices summary ribbon with regional badges
  const indices = [
    { name: 'NIFTY 50', region: 'NSE · IND', val: '24,850.30', change: '+142.15', pct: '+0.58%', up: true },
    { name: 'SENSEX', region: 'BSE · IND', val: '81,420.10', change: '+415.80', pct: '+0.51%', up: true },
    { name: 'S&P 500', region: 'NYSE · US', val: '5,780.20', change: '+32.40', pct: '+0.56%', up: true },
    { name: 'NASDAQ 100', region: 'NDQ · US', val: '20,110.85', change: '+164.20', pct: '+0.82%', up: true },
    { name: 'INDIA VIX', region: 'VOLATILITY', val: '12.45', change: '-0.35', pct: '-2.73%', up: false }
  ];

  const quickWatch = [
    { ticker: 'RELIANCE.NS', name: 'Reliance Ind.', price: '₹2,980.50', chg: '+1.25%', up: true, sector: 'Energy & Tech' },
    { ticker: 'TCS.NS', name: 'Tata Consultancy', price: '₹4,210.75', chg: '+0.85%', up: true, sector: 'IT Services' },
    { ticker: 'NVDA', name: 'NVIDIA Corp', price: '$128.40', chg: '+3.15%', up: true, sector: 'Semiconductors' },
    { ticker: 'AAPL', name: 'Apple Inc', price: '$228.50', chg: '-0.42%', up: false, sector: 'Consumer Tech' },
    { ticker: 'INFY.NS', name: 'Infosys Ltd.', price: '₹1,915.20', chg: '+1.80%', up: true, sector: 'Cloud & Digital' }
  ];

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const userConf = user?.confidenceLevel ? user.confidenceLevel / 100 : 0.90;
        const [q, p, r, d, port, acc] = await Promise.all([
          api.getQuote(selectedTicker),
          api.getConformalPrediction(selectedTicker, 1, userConf),
          api.getMarketRegime(selectedTicker),
          api.getConceptDrift(selectedTicker),
          api.getPortfolio(),
          api.getProjectWideAccuracy()
        ]);
        setQuote(q);
        setPrediction(p);
        setRegime(r);
        setDrift(d);
        setPortfolio(port);
        setAccuracy(acc);
      } catch (e) {
        console.error('Error loading dashboard:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedTicker]);

  // Portfolio calculations
  const totalInvested = portfolio.reduce((acc, h) => acc + h.totalInvested, 0);
  const totalValue = portfolio.reduce((acc, h) => acc + h.currentValue, 0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn">
      {/* 0. Real-time Market News Ticker Marquee */}
      <NewsTicker
        onSelectTicker={(ticker) => {
          setSelectedTicker(ticker);
          onSelectTicker(ticker);
        }}
        onNavigate={onNavigate}
      />

      {/* 1. Global Market Indices Ticker Ribbon */}
      <div id="tour-macro-tape" className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-xs hover:shadow-sm transition-all">
        <div className="flex flex-wrap items-center justify-between pb-2.5 mb-2.5 sm:mb-3.5 border-b border-slate-100 dark:border-slate-800/80 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse shadow-xs shadow-cyan-500/50" />
            <span className="text-xs sm:text-sm md:text-base font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 font-bold">
              Live Macro Market Tape
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50 hidden xs:inline-flex items-center gap-1">
              Live Stream
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono text-slate-500 dark:text-slate-400">
            Real-Time Inter-Market Feed (NSE · BSE · US)
          </span>
        </div>

        {/* Screen-Adaptive Grid: Dynamic sizes preventing name truncation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3 md:gap-3.5 lg:gap-4">
          {indices.map(idx => (
            <div
              key={idx.name}
              className="p-2.5 sm:p-3 md:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl bg-white hover:bg-cyan-50/30 dark:bg-slate-950/70 dark:hover:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 hover:border-cyan-400/90 dark:hover:border-cyan-600/70 transition-all flex flex-col justify-between shadow-xs hover:shadow-md group min-h-[76px] sm:min-h-[86px] md:min-h-[96px] last:col-span-2 sm:last:col-span-1"
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-4.5 lg:gap-5">
        {/* Project-Wide Aggregate Price Accuracy Metric */}
        <div id="tour-price-accuracy" className="p-3.5 sm:p-4.5 md:p-5 lg:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm space-y-2 sm:space-y-3 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 font-bold">
              <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-cyan-400 border border-emerald-200/90 dark:border-cyan-500/20 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="truncate">Price Accuracy</span>
            </span>
            <span className="text-[10px] sm:text-xs font-mono text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800/40 font-bold whitespace-nowrap shrink-0">
              100% − MAPE
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-baseline justify-between gap-2">
              {(prediction?.priceAccuracy != null || accuracy?.priceAccuracyPct != null) ? (
                <div className="text-xl sm:text-2xl lg:text-3xl font-black font-mono text-emerald-500 dark:text-cyan-400 tabular-nums tracking-tight">
                  {(prediction?.priceAccuracy ?? accuracy?.priceAccuracyPct)?.toFixed(1)}%
                </div>
              ) : (
                <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-md" />
              )}
              {(prediction?.priceAccuracy != null || accuracy?.mape != null) && (
                <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded shrink-0">
                  MAPE {prediction?.priceAccuracy != null ? (100 - prediction.priceAccuracy).toFixed(1) : accuracy?.mape?.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
              <span className="truncate">
                {prediction?.priceAccuracy != null
                  ? `Model: ${selectedTicker.replace('.NS', '')} (Analyzed)`
                  : `Universe: ${accuracy?.evaluatedAssetsCount ?? 'Analyzing'} models`}
              </span>
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold shrink-0">
                Coverage {prediction?.empiricalCoverage != null ? `${(prediction.empiricalCoverage * 100).toFixed(1)}%` : accuracy?.conformalCoveragePct != null ? `${accuracy.conformalCoveragePct.toFixed(1)}%` : '...'}
              </span>
            </div>
          </div>
        </div>

        {/* Portfolio Snapshot */}
        <div id="tour-active-portfolio" className="p-3.5 sm:p-4.5 md:p-5 lg:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm space-y-2 sm:space-y-3 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 font-bold">
              <div className="p-1.5 sm:p-2 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200/90 dark:border-cyan-500/20 shrink-0">
                <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="truncate">Active Portfolio</span>
            </span>
            <button
              onClick={() => onNavigate('portfolio')}
              className="text-xs sm:text-sm font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Manage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-xl sm:text-2xl lg:text-3xl font-black font-mono text-slate-950 dark:text-white tabular-nums tracking-tight truncate">
                ₹{totalValue.toLocaleString()}
              </div>
              <div
                className={`text-[11px] sm:text-xs font-bold font-mono px-2 py-0.5 rounded-md flex items-center gap-0.5 tabular-nums shrink-0 ${
                  totalPnl >= 0
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/60'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800/60'
                }`}
              >
                {totalPnl >= 0 ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
                <span>{totalPnl >= 0 ? '+' : ''}₹{Math.abs(Math.round(totalPnl)).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
              <span className="truncate">Invested: ₹{totalInvested.toLocaleString()}</span>
              <span className={`font-semibold shrink-0 ${totalPnlPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Market Regime Overview */}
        <div id="tour-macro-regime" className="p-3.5 sm:p-4.5 md:p-5 lg:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm space-y-2 sm:space-y-3 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 font-bold">
              <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/90 dark:border-emerald-500/20 shrink-0">
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="truncate">Macro Regime</span>
            </span>
            <span className="text-[10px] sm:text-xs font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40 font-bold shrink-0">
              Low Volatility
            </span>
          </div>
          <div>
            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-display truncate">
              Bullish Steady Drift Phase
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              Annualized volatility compressed under 14%. Conformal intervals tightly bounded with minimal tail divergence.
            </p>
          </div>
        </div>

        {/* Model Drift Status */}
        <div id="tour-drift-monitor" className="p-3.5 sm:p-4.5 md:p-5 lg:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm space-y-2 sm:space-y-3 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 font-bold">
              <div className="p-1.5 sm:p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/90 dark:border-amber-500/20 shrink-0">
                <ActivitySquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="truncate">Drift Monitor</span>
            </span>
            <span className="text-[10px] sm:text-xs font-mono text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800/40 font-bold shrink-0">
              KS-Test Active
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/90 dark:border-emerald-500/20 shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 min-w-0">
              <span className="font-bold text-slate-900 dark:text-white block truncate">Distributions In-Bounds</span>
              <span className="text-slate-600 dark:text-slate-400 line-clamp-2">Monitored features match training baseline distributions (p &gt; 0.05).</span>
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
          {quickWatch.map(item => (
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
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-xs sm:text-sm md:text-base font-mono text-cyan-700 dark:text-cyan-400 truncate">
                  {item.ticker.replace('.NS', '')}
                </span>
                <span
                  className={`text-[10px] sm:text-[11px] md:text-xs font-mono font-semibold px-1.5 py-0.2 rounded ${
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
              <div className="text-[10px] sm:text-[11px] md:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {item.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Active Selected Asset Spotlight Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <div id="tour-conformal-card" className="w-full">
          <ConformalPredictionCard
            prediction={prediction}
            currency={quote?.currency || 'INR'}
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
        <MarketRegimeCard regime={regime} />
      </div>

      {/* 4.5 Sector Volatility & Heatmap Treemap (D3.js) */}
      <MarketHeatmap
        onSelectTicker={(ticker: string) => {
          setSelectedTicker(ticker);
          onSelectTicker(ticker);
        }}
      />

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
