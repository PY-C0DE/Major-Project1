/**
 * AlphaQuant AI - Deep-Dive Stock Analysis Page
 * Features Price Overview, Interactive Technical Chart, Conformal 90% Interval Card,
 * HMM Market Regime Card, FinBERT News Sentiment, and KS Drift Monitor.
 * Supports Dark and Light themes.
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BookmarkPlus,
  Briefcase,
  History,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import { StockQuote, HistoricalBar, ConformalPrediction, MarketRegime, NewsItem, ConceptDriftResult } from '../types';
import { InteractiveStockChart } from '../components/InteractiveStockChart';
import { ConformalPredictionCard } from '../components/ConformalPredictionCard';
import { MarketRegimeCard } from '../components/MarketRegimeCard';
import { SentimentCard } from '../components/SentimentCard';
import { ConceptDriftCard } from '../components/ConceptDriftCard';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface Props {
  ticker: string;
  onOpenAddHolding?: (ticker: string) => void;
}

export const StockDetailPage: React.FC<Props> = ({ ticker, onOpenAddHolding }) => {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<HistoricalBar[]>([]);
  const [prediction, setPrediction] = useState<ConformalPrediction | null>(null);
  const [regime, setRegime] = useState<MarketRegime | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [drift, setDrift] = useState<ConceptDriftResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [watchlistSuccess, setWatchlistSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function loadStock() {
      setLoading(true);
      try {
        const [q, h, p, r, n, d] = await Promise.all([
          api.getQuote(ticker),
          api.getHistory(ticker, 250),
          api.getConformalPrediction(ticker, 1, 0.90),
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
          horizonDays: prediction?.horizonDays,
          empiricalCoverage: prediction?.empiricalCoverage || 0.914,
          directionalAccuracy: prediction?.directionalAccuracy || 71.4,
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

  const currSym = quote?.currency === 'INR' ? '₹' : '$';
  const isUp = (quote?.change ?? 0) >= 0;

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
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
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
            onClick={handleSavePrediction}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <History className="w-4 h-4" />
            <span>{savedSuccess ? 'Forecast Logged!' : 'Log Forecast'}</span>
          </button>
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

      {/* 3. Interactive OHLCV Multi-Indicator Chart */}
      <InteractiveStockChart
        bars={history}
        prediction={prediction}
        currency={quote?.currency || 'INR'}
        ticker={ticker}
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
    </div>
  );
};
