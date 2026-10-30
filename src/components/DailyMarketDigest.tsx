/**
 * AlphaQuant AI - Daily Market Intelligence Digest Component
 * Synthesizes top market-moving news and model sentiment updates
 * specifically for the user's watchlist assets.
 * Features:
 * - Executive Market Synthesis Briefing with net sentiment barometer
 * - Watchlist Catalyst Cards (Top Bullish Momentum vs Risk Drivers)
 * - Integrated FinBERT NLP tone distribution across watchlist
 * - Filterable Watchlist Intelligence News Feed
 * - Native Browser Speech Audio Digest ("Listen to 60s Briefing")
 * - Direct navigation to ticker analysis and full news hub
 * - Fully styled for Light and Dark themes
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Newspaper,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Share2,
  Copy,
  Check,
  BookmarkCheck,
  Flame,
  Layers,
  ArrowUpRight,
  Building2,
  Compass
} from 'lucide-react';
import { api } from '../services/api';
import { WatchlistItem, NewsItem } from '../types';

interface Props {
  onSelectTicker: (ticker: string) => void;
  onNavigate?: (tab: string) => void;
}

export const DailyMarketDigest: React.FC<Props> = ({ onSelectTicker, onNavigate }) => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'bullish' | 'bearish' | 'macro'>('all');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load watchlist and market headlines
  const loadDigestData = async (showSpin = false) => {
    if (showSpin) setIsRefreshing(true);
    try {
      const [wlData, newsData] = await Promise.all([
        api.getWatchlist().catch(() => []),
        api.getMarketHeadlines().catch(() => [])
      ]);
      setWatchlist(wlData);
      setNews(newsData);
    } catch (err) {
      console.warn('Failed to load daily digest data:', err);
    } finally {
      setLoading(false);
      if (showSpin) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  };

  useEffect(() => {
    loadDigestData(false);
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Set of watchlist ticker symbols for fast lookup
  const watchlistTickerSet = useMemo(() => {
    const s = new Set<string>();
    watchlist.forEach(w => {
      s.add(w.ticker);
      s.add(w.ticker.replace('.NS', ''));
    });
    return s;
  }, [watchlist]);

  // Headlines relevant to user's watchlist or macro central bank events
  const relevantHeadlines = useMemo(() => {
    if (news.length === 0) return [];
    return news.filter(item => {
      const clean = item.ticker.replace('.NS', '');
      return (
        watchlistTickerSet.has(item.ticker) ||
        watchlistTickerSet.has(clean) ||
        item.ticker === 'FED' ||
        item.ticker === 'RBI' ||
        item.ticker === 'MACRO'
      );
    });
  }, [news, watchlistTickerSet]);

  // Aggregate Watchlist Sentiment & Momentum Analytics
  const analytics = useMemo<{
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    bullishPct: number;
    topGainer: WatchlistItem | null;
    topLoser: WatchlistItem | null;
    driftCount: number;
    avgChangePct: number;
  }>(() => {
    if (watchlist.length === 0) {
      return {
        bullishCount: 0,
        bearishCount: 0,
        neutralCount: 0,
        bullishPct: 50,
        topGainer: null,
        topLoser: null,
        driftCount: 0,
        avgChangePct: 0
      };
    }

    let bullish = 0;
    let bearish = 0;
    let neutral = 0;
    let totalChange = 0;
    let driftAlerts = 0;

    let bestAsset: WatchlistItem | null = null;
    let worstAsset: WatchlistItem | null = null;

    watchlist.forEach(item => {
      totalChange += item.dailyChangePercent;

      if (item.sentiment === 'positive' || item.dailyChangePercent > 0.5) {
        bullish++;
      } else if (item.sentiment === 'negative' || item.dailyChangePercent < -0.5) {
        bearish++;
      } else {
        neutral++;
      }

      if (item.driftStatus && item.driftStatus.toLowerCase().includes('drift')) {
        driftAlerts++;
      }

      if (!bestAsset || item.dailyChangePercent > bestAsset.dailyChangePercent) {
        bestAsset = item;
      }
      if (!worstAsset || item.dailyChangePercent < worstAsset.dailyChangePercent) {
        worstAsset = item;
      }
    });

    const total = watchlist.length;
    const bullishPct = Math.round((bullish / total) * 100);
    const avgChange = total > 0 ? totalChange / total : 0;

    return {
      bullishCount: bullish,
      bearishCount: bearish,
      neutralCount: neutral,
      bullishPct,
      topGainer: bestAsset,
      topLoser: worstAsset,
      driftCount: driftAlerts,
      avgChangePct: avgChange
    };
  }, [watchlist]);

  // Synthesized text for reading aloud and clipboard
  const synthesizedNarrative = useMemo(() => {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    let sentimentBias = 'balanced';
    if (analytics.bullishPct >= 60) sentimentBias = 'moderately bullish';
    if (analytics.bullishPct >= 75) sentimentBias = 'strongly bullish';
    if (analytics.bullishPct <= 40) sentimentBias = 'bearish and cautious';

    const gainerNote = analytics.topGainer
      ? `${analytics.topGainer.ticker.replace('.NS', '')} leads momentum at ${analytics.topGainer.dailyChangePercent >= 0 ? '+' : ''}${analytics.topGainer.dailyChangePercent.toFixed(1)}%.`
      : '';
    const loserNote = analytics.topLoser && analytics.topLoser.dailyChangePercent < 0
      ? `${analytics.topLoser.ticker.replace('.NS', '')} faces selling pressure, down ${analytics.topLoser.dailyChangePercent.toFixed(1)}%.`
      : '';

    const driftNote = analytics.driftCount > 0
      ? `Model concept drift was detected on ${analytics.driftCount} watchlist assets, warranting tighter conformal interval tracking.`
      : 'Model inference signals remain calibrated within safe bounds.';

    return `AlphaQuant Daily Watchlist Digest for ${today}. Overall watchlist tone is ${sentimentBias} with ${analytics.bullishPct}% positive sentiment across ${watchlist.length} tracked assets. ${gainerNote} ${loserNote} ${driftNote}`;
  }, [analytics, watchlist]);

  // Web Speech API synthesis handler
  const handleToggleAudio = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported by your browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(synthesizedNarrative);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Copy narrative to clipboard
  const handleCopySummary = () => {
    navigator.clipboard.writeText(synthesizedNarrative).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    });
  };

  // Filter headlines by active tab
  const displayHeadlines = useMemo(() => {
    return relevantHeadlines.filter(item => {
      if (filterType === 'all') return true;
      if (filterType === 'bullish') return item.sentiment === 'positive';
      if (filterType === 'bearish') return item.sentiment === 'negative';
      if (filterType === 'macro') {
        return ['FED', 'RBI', 'MACRO'].includes(item.ticker) ||
          item.headline.toLowerCase().includes('rate') ||
          item.headline.toLowerCase().includes('inflation') ||
          item.headline.toLowerCase().includes('policy');
      }
      return true;
    });
  }, [relevantHeadlines, filterType]);

  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all overflow-hidden">
      {/* 1. Digest Master Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 via-cyan-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-600 dark:text-cyan-400">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white font-display">
                Daily Watchlist Intelligence Digest
              </h2>
              <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                {currentDateFormatted}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
              AI news synthesis, FinBERT sentiment barometer, and conformal momentum updates for your saved assets
            </p>
          </div>
        </div>

        {/* Action Controls Ribbon: Audio Briefing, Refresh, Copy, Collapse */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Audio Digest Button */}
          <button
            onClick={handleToggleAudio}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isSpeaking
                ? 'bg-rose-500 text-white animate-pulse shadow-sm shadow-rose-500/30'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            }`}
            title={isSpeaking ? 'Stop Audio Briefing' : 'Listen to 60-Second Audio Briefing'}
          >
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-500" />}
            <span className="hidden xs:inline">{isSpeaking ? 'Mute' : 'Listen'}</span>
          </button>

          {/* Copy Summary */}
          <button
            onClick={handleCopySummary}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Copy Digest Narrative to Clipboard"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedSummary ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={() => loadDigestData(true)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Refresh Watchlist Digest"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-500' : ''}`} />
          </button>

          {/* Collapse / Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title={isCollapsed ? 'Expand Daily Digest' : 'Collapse Daily Digest'}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 animate-fadeIn">
          {/* 2. Executive Synthesis Card & Sentiment Barometer */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 dark:from-slate-950/70 dark:via-indigo-950/20 dark:to-slate-950/70 border border-slate-200/90 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Watchlist Sentiment Barometer ({watchlist.length} Assets Tracked)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {analytics.bullishCount} Bullish
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {analytics.neutralCount} Neutral
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  {analytics.bearishCount} Bearish
                </span>
              </div>
            </div>

            {/* Tri-Color Sentiment Spectrum Bar */}
            <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800">
              <div
                style={{ width: `${(analytics.bullishCount / Math.max(1, watchlist.length)) * 100}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`Bullish: ${analytics.bullishCount}`}
              />
              <div
                style={{ width: `${(analytics.neutralCount / Math.max(1, watchlist.length)) * 100}%` }}
                className="bg-slate-400 dark:bg-slate-600 h-full transition-all duration-500"
                title={`Neutral: ${analytics.neutralCount}`}
              />
              <div
                style={{ width: `${(analytics.bearishCount / Math.max(1, watchlist.length)) * 100}%` }}
                className="bg-rose-500 h-full transition-all duration-500"
                title={`Bearish: ${analytics.bearishCount}`}
              />
            </div>

            {/* Synthesized Briefing Narrative */}
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans pt-1">
              {synthesizedNarrative}
            </p>
          </div>

          {/* 3. Top Watchlist Catalyst Spotlights (Bullish Mover vs Risk Mover) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Catalyst A: Top Positive Momentum Leader */}
            {analytics.topGainer ? (
              <div
                onClick={() => onSelectTicker(analytics.topGainer!.ticker)}
                className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/60 transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                        Top Bullish Catalyst
                      </span>
                      <span className="font-bold font-mono text-sm text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        {analytics.topGainer.ticker.replace('.NS', '')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                      +{analytics.topGainer.dailyChangePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">
                  {analytics.topGainer.companyName} trades at ₹{analytics.topGainer.currentPrice.toLocaleString()} with {analytics.topGainer.regime}.
                  Conformal target: ₹{analytics.topGainer.predictedPrice.toFixed(2)}.
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    Sentiment: {analytics.topGainer.sentiment.toUpperCase()}
                  </span>
                  <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform font-bold">
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ) : null}

            {/* Catalyst B: Top Risk / Volatility Driver */}
            {analytics.topLoser ? (
              <div
                onClick={() => onSelectTicker(analytics.topLoser!.ticker)}
                className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500/60 transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
                      <TrendingDown className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                        Watchlist Risk Spotlight
                      </span>
                      <span className="font-bold font-mono text-sm text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                        {analytics.topLoser.ticker.replace('.NS', '')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800/60">
                      {analytics.topLoser.dailyChangePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">
                  {analytics.topLoser.companyName} trades at ₹{analytics.topLoser.currentPrice.toLocaleString()}.
                  {analytics.topLoser.driftStatus ? ` Status: ${analytics.topLoser.driftStatus}.` : ''}
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                    <AlertTriangle className="w-3 h-3" />
                    Risk Level: {analytics.topLoser.regime.includes('High') ? 'Elevated' : 'Moderate'}
                  </span>
                  <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform font-bold">
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* 4. Watchlist Intelligence News Synthesized Feed */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <div className="flex items-center gap-1.5">
                <Newspaper className="w-4 h-4 text-cyan-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono">
                  Synthesized Headlines for Your Watchlist ({displayHeadlines.length})
                </h3>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 text-xs font-mono">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer text-[11px] ${
                    filterType === 'all'
                      ? 'bg-slate-900 text-white dark:bg-cyan-500/20 dark:text-cyan-300 font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('bullish')}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer text-[11px] ${
                    filterType === 'bullish'
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Bullish
                </button>
                <button
                  onClick={() => setFilterType('bearish')}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer text-[11px] ${
                    filterType === 'bearish'
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold border border-rose-500/30'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Bearish
                </button>
                <button
                  onClick={() => setFilterType('macro')}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer text-[11px] ${
                    filterType === 'macro'
                      ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-500/30'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Macro
                </button>
              </div>
            </div>

            {displayHeadlines.length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-mono text-xs">
                No recent headlines found matching this filter for your watchlist.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {displayHeadlines.slice(0, 4).map((item, idx) => {
                  const isPos = item.sentiment === 'positive';
                  const isNeg = item.sentiment === 'negative';
                  const cleanTicker = item.ticker.replace('.NS', '');

                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => onSelectTicker(item.ticker)}
                      className="p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-950/50 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-cyan-400 dark:hover:border-cyan-600 transition-all cursor-pointer group flex flex-col justify-between shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                              {cleanTicker}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono ${
                                isPos
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400'
                                  : isNeg
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {item.sentiment.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {item.source}
                          </span>
                        </div>

                        <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2 leading-snug">
                          {item.headline}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 font-sans">
                          {item.summary}
                        </p>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Confidence: {Math.round((item.confidence || 0.9) * 100)}%</span>
                        <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform font-bold">
                          <span>Model Forecast</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Digest Footer Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              <BookmarkCheck className="w-3.5 h-3.5 text-cyan-500" />
              <span>Monitoring {watchlist.length} assets with Conformal intervals & FinBERT NLP</span>
            </div>

            <div className="flex items-center gap-3">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('watchlist')}
                  className="font-bold font-mono text-xs text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>Edit Watchlist Assets</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
