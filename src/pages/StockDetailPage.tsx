/**
 * AlphaQuant AI - Deep-Dive Stock Analysis Page
 * Features Price Overview, Interactive Technical Chart, Conformal Interval Card,
 * Market Regime Card, News Sentiment, and KS Drift Monitor.
 * Supports Dark and Light themes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BookmarkPlus,
  Briefcase,
  History,
  Download,
  FileSpreadsheet,
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Zap,
  SlidersHorizontal,
  Sparkles,
  BarChart2,
  Newspaper,
  Activity,
  Calendar,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { StockQuote, HistoricalBar, ConformalPrediction, MarketRegime, NewsItem, ConceptDriftResult, AlertRule } from '../types';
import { InteractiveStockChart } from '../components/InteractiveStockChart';
import { ConformalPredictionCard } from '../components/ConformalPredictionCard';
import { MarketRegimeCard } from '../components/MarketRegimeCard';
import { SentimentCard } from '../components/SentimentCard';
import { ConceptDriftCard } from '../components/ConceptDriftCard';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { CompanySearchCombobox } from '../components/CompanySearchCombobox';
import { QuickAlertPopover } from '../components/QuickAlertPopover';
import { StockDecisionAndHistoryCard } from '../components/StockDecisionAndHistoryCard';
import { OptionsAnalyticsModal } from '../components/OptionsAnalyticsModal';
import { OptionsVolatilitySurface } from '../components/OptionsVolatilitySurface';
import { RegimeIndicator } from '../components/RegimeIndicator';
import { HMMRegimeGraphicalIndicator } from '../components/HMMRegimeGraphicalIndicator';
import { SeasonalityAnalysis } from '../components/SeasonalityAnalysis';
import { useAuth } from '../context/AuthContext';

interface Props {
  ticker: string;
  onOpenAddHolding?: (ticker: string) => void;
  onSelectTicker?: (ticker: string) => void;
}

export const StockDetailPage: React.FC<Props> = ({ ticker, onOpenAddHolding, onSelectTicker }) => {
  const { user } = useAuth();
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<HistoricalBar[]>([]);
  const [prediction, setPrediction] = useState<ConformalPrediction | null>(null);
  const [regime, setRegime] = useState<MarketRegime | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [drift, setDrift] = useState<ConceptDriftResult | null>(null);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [watchlistSuccess, setWatchlistSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Optional Deep-Dive Analysis Modules (Hidden by default; only visible if user clicks on option)
  const [activeOptions, setActiveOptions] = useState<{
    valuationStats: boolean;
    regime: boolean;
    decisionSupport: boolean;
    sentiment: boolean;
    drift: boolean;
    volSurface: boolean;
    seasonality: boolean;
  }>({
    valuationStats: false,
    regime: false,
    decisionSupport: false,
    sentiment: false,
    drift: false,
    volSurface: false,
    seasonality: false
  });

  const toggleOption = (key: keyof typeof activeOptions) => {
    setActiveOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSelectAllOptions = () => {
    setActiveOptions({
      valuationStats: true,
      regime: true,
      decisionSupport: true,
      sentiment: true,
      drift: true,
      volSurface: true,
      seasonality: true
    });
  };

  const handleHideAllOptions = () => {
    setActiveOptions({
      valuationStats: false,
      regime: false,
      decisionSupport: false,
      sentiment: false,
      drift: false,
      volSurface: false,
      seasonality: false
    });
  };

  const activeOptionsCount = Object.values(activeOptions).filter(Boolean).length;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDateTime(
        now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const allAlerts = await api.getAlerts();
      setAlerts(allAlerts.filter(a => a.ticker.toUpperCase() === ticker.toUpperCase()));
    } catch (e) {
      console.error('Failed to load alerts in StockDetailPage:', e);
    }
  }, [ticker]);

  useEffect(() => {
    async function loadStock() {
      setLoading(true);
      try {
        const userConf = user?.confidenceLevel ? user.confidenceLevel / 100 : 0.90;
        const [q, h, p, r, n, d] = await Promise.all([
          api.getQuote(ticker),
          api.getHistory(ticker, 250),
          api.getConformalPrediction(ticker, 1, userConf),
          api.getMarketRegime(ticker),
          api.getNews(ticker),
          api.getConceptDrift(ticker)
        ]);
        setQuote(q);
        setHistory(h);
        setPrediction(p);
        setRegime(r);
        setNews(n);
        setDrift(d);
      } catch (err) {
        console.error('Error fetching stock detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStock();
  }, [ticker]);

  const handleConfigChange = async (horizon: number, confidence: number) => {
    try {
      const updated = await api.getConformalPrediction(ticker, horizon, confidence);
      setPrediction(updated);
    } catch (err) {
      console.error('Failed to update prediction for horizon/confidence:', err);
    }
  };

  const handleExportFactsheet = () => {
    setIsExporting(true);
    try {
      const factsheet = {
        ticker,
        companyName: quote?.name,
        exchange: quote?.exchange,
        currency: quote?.currency,
        currentPrice: quote?.price,
        dailyChangePercent: quote?.changePercent,
        generatedAt: new Date().toISOString(),
        conformalPrediction: {
          predictedPrice: prediction?.predictedPrice,
          expectedChangePct: prediction?.predictionChangePercent,
          lowerBound: prediction?.lowerBound,
          upperBound: prediction?.upperBound,
          confidenceLevel: prediction?.confidenceLevel,
          empiricalCoverage: prediction?.empiricalCoverage ?? prediction?.confidenceLevel ?? null,
          directionalAccuracy: prediction?.directionalAccuracy ?? null,
          priceAccuracy: prediction?.priceAccuracy ?? null,
          topFeatures: prediction?.topFeatures
        },
        marketRegime: {
          currentRegime: regime?.currentRegime,
          probability: regime?.regimeProbability,
          stabilityScore: regime?.stabilityScore,
          transitionMatrix: regime?.transitionMatrix
        },
        sentiment: {
          newsCount: news.length,
          avgScore: news.reduce((a, b) => a + b.sentimentScore, 0) / (news.length || 1),
          sampleArticles: news.slice(0, 3).map(n => ({ headline: n.headline, tone: n.sentiment }))
        },
        conceptDrift: {
          driftDetected: drift?.driftDetected,
          overallScore: drift?.overallDriftScore,
          warning: drift?.safetyWarning
        }
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(factsheet, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `AlphaQuant_Factsheet_${ticker}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  };

  const handleSavePrediction = async () => {
    try {
      await api.recordPrediction(ticker);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToWatchlist = async () => {
    try {
      await api.addToWatchlist(ticker);
      setWatchlistSuccess(true);
      setTimeout(() => setWatchlistSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleJumpToVolSurface = () => {
    setActiveOptions(prev => ({ ...prev, volSurface: true }));
    setTimeout(() => {
      const el = document.getElementById('stock-vol-surface');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-cyan-500', 'shadow-xl', 'shadow-cyan-500/20');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-cyan-500', 'shadow-xl', 'shadow-cyan-500/20');
        }, 2200);
      } else {
        setShowOptionsModal(true);
      }
    }, 120);
  };

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const currSym = quote?.currency === 'INR' ? '₹' : '$';
  const isUp = (quote?.change ?? 0) >= 0;

  const activeAlerts = alerts.filter(a => a.enabled);
  const metAlerts = alerts.filter(a => {
    if (!a.enabled || !quote) return false;
    const thresh = a.threshold || 0;
    return (a.type === 'price_above' && quote.price >= thresh) ||
           (a.type === 'price_below' && quote.price <= thresh);
  });

  return (
    <div className="space-y-6">
      {/* 1. Stock Header & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">{ticker}</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              {quote?.exchange || 'NSE'} · {quote?.currency || 'INR'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">{quote?.name}</span>
            <RegimeIndicator
              regime={regime}
              onToggleOption={() => toggleOption('regime')}
              isOptionActive={activeOptions.regime}
            />
          </div>

          {/* Price Overview Metrics Bar */}
          <div className="flex flex-wrap items-baseline gap-4 mt-2">
            <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
              {currSym}{quote?.price?.toLocaleString() || '---'}
            </span>
            <span
              className={`text-sm font-bold font-mono flex items-center gap-1 tabular-nums ${
                isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isUp ? '+' : ''}{quote?.change?.toFixed(2)} ({isUp ? '+' : ''}{quote?.changePercent?.toFixed(2)}%)
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">Today</span>

            {/* Live Date and Time in the Analysis (Requirement 13) */}
            {currentDateTime && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
                <span>{currentDateTime}</span>
              </div>
            )}

            {/* Threshold Met Indicator Badge */}
            {metAlerts.length > 0 && (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-xs animate-pulse"
              >
                <Bell className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-500/20" />
                <span>Threshold Met: {metAlerts[0].type === 'price_above' ? '≥' : metAlerts[0].type === 'price_below' ? '≤' : 'Δ'} {currSym}{metAlerts[0].threshold}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons & Company Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {onSelectTicker && (
            <div className="w-56 sm:w-64">
              <CompanySearchCombobox
                compact
                placeholder="Switch company (e.g. Tata, Nvidia)..."
                onSelect={(item) => onSelectTicker(item.ticker)}
              />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Alert Toggle Popover */}
            <QuickAlertPopover
              ticker={ticker}
              quote={quote}
              prediction={prediction}
              alerts={alerts}
              onAlertsChanged={loadAlerts}
            />

            <button
              onClick={handleAddToWatchlist}
              className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <BookmarkPlus className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>{watchlistSuccess ? 'Added!' : 'Watchlist'}</span>
            </button>

          {onOpenAddHolding && (
            <button
              onClick={() => onOpenAddHolding(ticker)}
              className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Add to Portfolio</span>
            </button>
          )}

            <button
              onClick={handleExportFactsheet}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Download className="w-4 h-4 text-amber-500" />
              <span>{isExporting ? 'Exporting...' : 'Export Factsheet'}</span>
            </button>

            <button
              onClick={handleJumpToVolSurface}
              className="px-3.5 py-2 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Jump directly to Implied Volatility Surface card on this page"
            >
              <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Vol Surface</span>
            </button>

            <button
              onClick={() => setShowOptionsModal(true)}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Open full Derivatives Terminal (Greeks, Strike Matrix & Mispricing)"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Options Terminal</span>
            </button>

            <button
              onClick={handleSavePrediction}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <History className="w-4 h-4" />
              <span>{savedSuccess ? 'Forecast Logged!' : 'Log Forecast'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Valuation & 52-Week Statistics Tape (Optional Module: Only visible if clicked) */}
      {activeOptions.valuationStats && (
        <div className="space-y-2 animate-fadeIn p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-mono">
              <BarChart2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Valuation & 52-Week Trading Range Statistics
            </span>
            <button
              onClick={() => toggleOption('valuationStats')}
              className="text-[11px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <X className="w-3 h-3" /> Hide Option
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: '52-Week High', value: `${currSym}${quote?.high52?.toLocaleString() || '---'}` },
              { label: '52-Week Low', value: `${currSym}${quote?.low52?.toLocaleString() || '---'}` },
              { label: 'Day Range', value: `${currSym}${quote?.low?.toFixed(1)} - ${currSym}${quote?.high?.toFixed(1)}` },
              { label: 'Volume (Shares)', value: quote?.volume ? (quote.volume / 1000000).toFixed(2) + 'M' : '---' },
              { label: 'P/E Ratio', value: quote?.pe ? `${quote.pe.toFixed(1)}x` : '---' },
              { label: 'Market Cap', value: quote?.marketCap ? `${(quote.marketCap / 1e9).toFixed(1)}B` : '---' }
            ].map(stat => (
              <div key={stat.label} className="p-3 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 block">{stat.label}</span>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white mt-0.5 block tabular-nums">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Interactive OHLCV Multi-Indicator Daily Candle Chart (ALWAYS VISIBLE CORE) */}
      <InteractiveStockChart
        bars={history}
        prediction={prediction}
        currency={quote?.currency || 'INR'}
        ticker={ticker}
      />

      {/* 4. Conformal Prediction Card (ALWAYS VISIBLE CORE) */}
      <div className="w-full">
        <ConformalPredictionCard
          prediction={prediction}
          currency={quote?.currency || 'INR'}
          onConfigChange={handleConfigChange}
        />
      </div>

      {/* 5. Deep-Dive Analytical Options Control Bar ("Make Everything an Option") */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Additional Analytical Modules (Optional Deep Dive)
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {activeOptionsCount} of 7 visible
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Only the daily candle chart and prediction are visible by default. Click any module below to inspect deeper quantitative factors.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllOptions}
              className="text-xs font-mono font-medium px-2.5 py-1 rounded-md text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Show All
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              onClick={handleHideAllOptions}
              disabled={activeOptionsCount === 0}
              className={`text-xs font-mono font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                activeOptionsCount === 0
                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Hide All
            </button>
          </div>
        </div>

        {/* Option Toggle Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
          {/* Option: HMM Market Regime */}
          <button
            onClick={() => toggleOption('regime')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeOptions.regime
                ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 dark:border-cyan-600 ring-1 ring-cyan-400 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`p-1.5 rounded-lg ${activeOptions.regime ? 'bg-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <Layers className="w-3.5 h-3.5" />
              </span>
              <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${activeOptions.regime ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-400'}`}>
                {activeOptions.regime ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {activeOptions.regime ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                HMM Market Regime
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {regime?.currentRegime || '2-State Latent Model'}
              </div>
            </div>
          </button>

          {/* Option: Decision Support & Signals */}
          <button
            onClick={() => toggleOption('decisionSupport')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeOptions.decisionSupport
                ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 dark:border-cyan-600 ring-1 ring-cyan-400 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`p-1.5 rounded-lg ${activeOptions.decisionSupport ? 'bg-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${activeOptions.decisionSupport ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-400'}`}>
                {activeOptions.decisionSupport ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {activeOptions.decisionSupport ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Decision Support & Signals
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Target, Stop Loss & Prev Day Audit
              </div>
            </div>
          </button>

          {/* Option: Key Valuation Stats */}
          <button
            onClick={() => toggleOption('valuationStats')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeOptions.valuationStats
                ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 dark:border-cyan-600 ring-1 ring-cyan-400 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`p-1.5 rounded-lg ${activeOptions.valuationStats ? 'bg-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <BarChart2 className="w-3.5 h-3.5" />
              </span>
              <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${activeOptions.valuationStats ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-400'}`}>
                {activeOptions.valuationStats ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {activeOptions.valuationStats ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Valuation & 52W Stats
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                52W Range, P/E, Cap, Vol
              </div>
            </div>
          </button>

          {/* Option: News & FinBERT Sentiment */}
          <button
            onClick={() => toggleOption('sentiment')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeOptions.sentiment
                ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 dark:border-cyan-600 ring-1 ring-cyan-400 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`p-1.5 rounded-lg ${activeOptions.sentiment ? 'bg-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <Newspaper className="w-3.5 h-3.5" />
              </span>
              <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${activeOptions.sentiment ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-400'}`}>
                {activeOptions.sentiment ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {activeOptions.sentiment ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                News & Sentiment
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {news.length} Sources · FinBERT NLP
              </div>
            </div>
          </button>

          {/* Option: Concept Drift Monitor */}
          <button
            onClick={() => toggleOption('drift')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeOptions.drift
                ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 dark:border-cyan-600 ring-1 ring-cyan-400 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`p-1.5 rounded-lg ${activeOptions.drift ? 'bg-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <Activity className="w-3.5 h-3.5" />
              </span>
              <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${activeOptions.drift ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-400'}`}>
                {activeOptions.drift ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {activeOptions.drift ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Concept Drift Monitor
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                KS 2-Sample Non-Stationarity
              </div>
            </div>
          </button>

          {/* Option: Options Volatility Surface */}
          <button
            onClick={() => toggleOption('volSurface')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeOptions.volSurface
                ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 dark:border-cyan-600 ring-1 ring-cyan-400 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`p-1.5 rounded-lg ${activeOptions.volSurface ? 'bg-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <Zap className="w-3.5 h-3.5" />
              </span>
              <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${activeOptions.volSurface ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-400'}`}>
                {activeOptions.volSurface ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {activeOptions.volSurface ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                3D Vol Surface & Smile
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                D3 Implied Volatility & Smile
              </div>
            </div>
          </button>

          {/* Option: Seasonality & Calendar Alpha */}
          <button
            onClick={() => toggleOption('seasonality')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeOptions.seasonality
                ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 dark:border-cyan-600 ring-1 ring-cyan-400 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`p-1.5 rounded-lg ${activeOptions.seasonality ? 'bg-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <Calendar className="w-3.5 h-3.5" />
              </span>
              <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${activeOptions.seasonality ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-400'}`}>
                {activeOptions.seasonality ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {activeOptions.seasonality ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Seasonality Alpha
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Monthly Return Heatmap
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 6. Revealed Optional Modules (Rendered only when active) */}
      <div className="space-y-6">
        {/* Module: HMM Market Regime (Graphical Indicator + Regime Card) */}
        {activeOptions.regime && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between px-1">
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-mono">
                <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                HMM Market Regime Detection & Latent State Dynamics
              </span>
              <button
                onClick={() => toggleOption('regime')}
                className="text-[11px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <X className="w-3 h-3" /> Hide Option
              </button>
            </div>
            <HMMRegimeGraphicalIndicator regime={regime} ticker={ticker} />
            <MarketRegimeCard regime={regime} />
          </div>
        )}

        {/* Module: Algorithmic Decision Support */}
        {activeOptions.decisionSupport && (
          <div className="space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between px-1">
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Algorithmic Decision Support & Previous Day Audit
              </span>
              <button
                onClick={() => toggleOption('decisionSupport')}
                className="text-[11px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <X className="w-3 h-3" /> Hide Option
              </button>
            </div>
            <StockDecisionAndHistoryCard
              prediction={prediction}
              currency={quote?.currency || 'INR'}
              ticker={ticker}
            />
          </div>
        )}

        {/* Modules: Sentiment & Drift (Grid if both active) */}
        {(activeOptions.sentiment || activeOptions.drift) && (
          <div className="space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between px-1">
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-mono">
                <Newspaper className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                News Sentiment & Concept Drift Monitoring
              </span>
            </div>
            <div className={`grid grid-cols-1 ${activeOptions.sentiment && activeOptions.drift ? 'lg:grid-cols-2' : ''} gap-6`}>
              {activeOptions.sentiment && (
                <div className="space-y-1.5">
                  <div className="flex justify-end">
                    <button
                      onClick={() => toggleOption('sentiment')}
                      className="text-[11px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <X className="w-3 h-3" /> Hide Sentiment
                    </button>
                  </div>
                  <SentimentCard news={news} ticker={ticker} />
                </div>
              )}
              {activeOptions.drift && (
                <div className="space-y-1.5">
                  <div className="flex justify-end">
                    <button
                      onClick={() => toggleOption('drift')}
                      className="text-[11px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <X className="w-3 h-3" /> Hide Drift
                    </button>
                  </div>
                  <ConceptDriftCard drift={drift} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Module: Options Volatility Surface */}
        {activeOptions.volSurface && (
          <div id="stock-vol-surface" className="transition-all duration-500 rounded-2xl space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between px-1">
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-mono">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                D3 Implied Volatility Surface & Volatility Smile Engine
              </span>
              <button
                onClick={() => toggleOption('volSurface')}
                className="text-[11px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <X className="w-3 h-3" /> Hide Option
              </button>
            </div>
            <OptionsVolatilitySurface
              ticker={ticker}
              spotPrice={quote?.price}
              onExpandModal={() => setShowOptionsModal(true)}
            />
          </div>
        )}

        {/* Module: Seasonality Analysis */}
        {activeOptions.seasonality && (
          <div id="tour-seasonality" className="space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between px-1">
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Seasonality & Calendar Alpha Analysis
              </span>
              <button
                onClick={() => toggleOption('seasonality')}
                className="text-[11px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <X className="w-3 h-3" /> Hide Option
              </button>
            </div>
            <SeasonalityAnalysis
              ticker={ticker}
              bars={history}
              onSelectTicker={onSelectTicker}
            />
          </div>
        )}
      </div>

      {/* Regulatory & Methodology Disclaimer */}
      <DisclaimerBanner />

      {/* Options Chains & D3 Volatility Surface Modal */}
      <OptionsAnalyticsModal
        isOpen={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        initialTicker={ticker}
      />
    </div>
  );
};
