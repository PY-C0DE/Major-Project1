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
  Layers
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
import { PriceAlertModal } from '../components/PriceAlertModal';
import { StockDecisionAndHistoryCard } from '../components/StockDecisionAndHistoryCard';
import { OptionsAnalyticsModal } from '../components/OptionsAnalyticsModal';
import { OptionsVolatilitySurface } from '../components/OptionsVolatilitySurface';
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
  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [watchlistSuccess, setWatchlistSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">{ticker}</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              {quote?.exchange || 'NSE'} · {quote?.currency || 'INR'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">{quote?.name}</span>
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
              <button
                onClick={() => setShowPriceAlertModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-xs cursor-pointer hover:scale-105 transition-transform animate-pulse"
              >
                <Bell className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-500/20" />
                <span>Threshold Met: {metAlerts[0].type === 'price_above' ? '≥' : '≤'} {currSym}{metAlerts[0].threshold}</span>
              </button>
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
            {/* Price Alert Action Button */}
            <button
              onClick={() => setShowPriceAlertModal(true)}
              title="Set Target Price Alert"
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                metAlerts.length > 0
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950/80 dark:hover:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700 font-bold shadow-xs'
                  : activeAlerts.length > 0
                  ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:hover:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-700'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Bell className={`w-4 h-4 ${metAlerts.length > 0 ? 'text-emerald-600 dark:text-emerald-400 animate-bounce' : activeAlerts.length > 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500'}`} />
              <span>{metAlerts.length > 0 ? 'Alert Met!' : 'Price Alert'}</span>
              {activeAlerts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-white dark:bg-slate-900 border border-current">
                  {activeAlerts.length}
                </span>
              )}
            </button>

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
              onClick={() => setShowOptionsModal(true)}
              className="px-3.5 py-2 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="View Implied Volatility Surface & Smile"
            >
              <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Options & Vol Surface</span>
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

      {/* 2. Key Valuation & 52-Week Statistics Tape */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: '52-Week High', value: `${currSym}${quote?.high52?.toLocaleString() || '---'}` },
          { label: '52-Week Low', value: `${currSym}${quote?.low52?.toLocaleString() || '---'}` },
          { label: 'Day Range', value: `${currSym}${quote?.low?.toFixed(1)} - ${currSym}${quote?.high?.toFixed(1)}` },
          { label: 'Volume (Shares)', value: quote?.volume ? (quote.volume / 1000000).toFixed(2) + 'M' : '---' },
          { label: 'P/E Ratio', value: quote?.pe ? `${quote.pe.toFixed(1)}x` : '---' },
          { label: 'Market Cap', value: quote?.marketCap ? `${(quote.marketCap / 1e9).toFixed(1)}B` : '---' }
        ].map(stat => (
          <div key={stat.label} className="p-3 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 block">{stat.label}</span>
            <span className="text-xs font-bold font-mono text-slate-900 dark:text-white mt-0.5 block tabular-nums">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* 2.5 Algorithmic Decision Support, Previous Day Stats Audit & Classified Financial Events */}
      <StockDecisionAndHistoryCard
        prediction={prediction}
        currency={quote?.currency || 'INR'}
        ticker={ticker}
      />

      {/* 3. Interactive OHLCV Multi-Indicator Chart */}
      <InteractiveStockChart
        bars={history}
        prediction={prediction}
        currency={quote?.currency || 'INR'}
        ticker={ticker}
      />

      {/* 3.5 D3 Implied Volatility Surface & Smile Engine */}
      <OptionsVolatilitySurface
        ticker={ticker}
        spotPrice={quote?.price}
      />

      {/* 4. Core Innovation Cards (USPs 1 & 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConformalPredictionCard
          prediction={prediction}
          currency={quote?.currency || 'INR'}
          onConfigChange={handleConfigChange}
        />
        <MarketRegimeCard regime={regime} />
      </div>

      {/* 5. Core Innovation Cards (USPs 3 & 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SentimentCard news={news} ticker={ticker} />
        <ConceptDriftCard drift={drift} />
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
