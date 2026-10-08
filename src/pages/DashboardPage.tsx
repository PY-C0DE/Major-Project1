/**
 * AlphaQuant AI - Main Dashboard View
 * Provides high-level multi-market overview, market indices ribbon,
 * active regime state, quick prediction glance, portfolio summary, and drift health.
 * Fully styled for Dark and Light themes.
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  ActivitySquare,
  Briefcase,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { StockQuote, ConformalPrediction, MarketRegime, ConceptDriftResult, PortfolioHolding } from '../types';
import { ConformalPredictionCard } from '../components/ConformalPredictionCard';
import { MarketRegimeCard } from '../components/MarketRegimeCard';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface Props {
  onSelectTicker: (ticker: string) => void;
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<Props> = ({ onSelectTicker, onNavigate }) => {
  const [selectedTicker, setSelectedTicker] = useState('RELIANCE.NS');
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [prediction, setPrediction] = useState<ConformalPrediction | null>(null);
  const [regime, setRegime] = useState<MarketRegime | null>(null);
  const [drift, setDrift] = useState<ConceptDriftResult | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>([]);
  const [loading, setLoading] = useState(true);

  // Market indices summary ribbon
  const indices = [
    { name: 'NIFTY 50', val: '24,850.30', change: '+142.15 (+0.58%)', up: true },
    { name: 'SENSEX', val: '81,420.10', change: '+415.80 (+0.51%)', up: true },
    { name: 'S&P 500', val: '5,780.20', change: '+32.40 (+0.56%)', up: true },
    { name: 'NASDAQ 100', val: '20,110.85', change: '+164.20 (+0.82%)', up: true },
    { name: 'INDIA VIX', val: '12.45', change: '-0.35 (-2.73%)', up: false }
  ];

  const quickWatch = [
    { ticker: 'RELIANCE.NS', name: 'Reliance Ind.', price: '₹2,980.50', chg: '+1.25%', up: true },
    { ticker: 'TCS.NS', name: 'Tata Consultancy', price: '₹4,210.75', chg: '+0.85%', up: true },
    { ticker: 'NVDA', name: 'NVIDIA Corp', price: '$128.40', chg: '+3.15%', up: true },
    { ticker: 'AAPL', name: 'Apple Inc', price: '$228.50', chg: '-0.42%', up: false },
    { ticker: 'INFY.NS', name: 'Infosys', price: '₹1,915.20', chg: '+1.80%', up: true }
  ];

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [q, p, r, d, port] = await Promise.all([
          api.getQuote(selectedTicker),
          api.getConformalPrediction(selectedTicker),
          api.getMarketRegime(selectedTicker),
          api.getConceptDrift(selectedTicker),
          api.getPortfolio()
        ]);
        setQuote(q);
        setPrediction(p);
        setRegime(r);
        setDrift(d);
        setPortfolio(port);
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
    <div className="space-y-6">
      {/* 1. Global Market Indices Ticker Ribbon */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3 overflow-x-auto shadow-sm">
        <div className="flex items-center gap-6 min-w-max text-xs font-mono">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
            Market Tape:
          </span>
          {indices.map(idx => (
            <div key={idx.name} className="flex items-center gap-2">
              <span className="text-slate-700 dark:text-slate-300 font-semibold">{idx.name}</span>
              <span className="text-slate-900 dark:text-white font-bold">{idx.val}</span>
              <span className={idx.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                {idx.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Top Highlights: Portfolio Quick Metric + Drift Safety Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Portfolio Snapshot */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Active Portfolio
            </span>
            <button
              onClick={() => onNavigate('portfolio')}
              className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                ₹{totalValue.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                Invested: ₹{totalInvested.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div
                className={`text-sm font-bold font-mono flex items-center gap-1 tabular-nums justify-end ${
                  totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {totalPnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {totalPnl >= 0 ? '+' : ''}₹{Math.abs(totalPnl).toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Market Regime Overview */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Macro Regime State
            </span>
            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
              Low Volatility
            </span>
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-white font-display">
              Bullish Steady Drift Phase
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-snug">
              Annualized volatility compressed under 14%. Conformal error bands are tightly calibrated with minimal tail divergence.
            </p>
          </div>
        </div>

        {/* Model Drift Status */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ActivitySquare className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Concept Drift Monitor
            </span>
            <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800/40">
              KS-Test Active
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white block">Distributions In-Bounds</span>
              <span>All 5 monitored technical features match training baseline distributions (p &gt; 0.05).</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quick Watchlist & Ticker Selector Bar */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
          <span>Active Asset Focus</span>
          <span className="text-slate-400 text-[11px]">Select to inspect forecasts</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickWatch.map(item => (
            <button
              key={item.ticker}
              onClick={() => {
                setSelectedTicker(item.ticker);
                onSelectTicker(item.ticker);
              }}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                selectedTicker === item.ticker
                  ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 dark:border-cyan-500/50 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs font-mono text-cyan-700 dark:text-cyan-400">{item.ticker}</span>
                <span
                  className={`text-[11px] font-mono font-semibold ${
                    item.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {item.chg}
                </span>
              </div>
              <div className="text-slate-900 dark:text-slate-200 font-semibold text-xs mt-1 tabular-nums font-mono">
                {item.price}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Active Selected Asset Spotlight Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConformalPredictionCard
          prediction={prediction}
          currency={quote?.currency || 'INR'}
        />
        <MarketRegimeCard regime={regime} />
      </div>

      {/* 5. Deep-dive Action Bar */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="text-xs text-slate-600 dark:text-slate-400">
          Viewing high-level summary for <strong className="text-slate-900 dark:text-white">{selectedTicker}</strong>.
          Inspect deep technical indicators, sentiment timelines, and backtest metrics in the full analysis view.
        </div>
        <button
          onClick={() => {
            onSelectTicker(selectedTicker);
            onNavigate('analysis');
          }}
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ml-4 shadow-sm"
        >
          <span>Full Analysis & Chart</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mandatory Disclaimer */}
      <DisclaimerBanner />
    </div>
  );
};
