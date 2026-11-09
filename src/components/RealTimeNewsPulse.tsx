/**
 * AlphaQuant AI - Real-Time News Pulse Component
 * Displays a live scrolling marquee of latest sentiment scores and headlines
 * specifically affecting assets in the user's watchlist, providing immediate visual feedback on market mood.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Pause,
  Play,
  RefreshCw,
  Clock,
  ShieldCheck,
  ChevronRight,
  X,
  SlidersHorizontal,
  Flame,
  Building2,
  ArrowRight,
  BookmarkCheck,
  Radio,
  Eye,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { WatchlistPulseItem, WatchlistMarketMood } from '../types';

interface Props {
  onSelectTicker?: (ticker: string) => void;
  compact?: boolean;
  refreshTrigger?: number;
}

export const RealTimeNewsPulse: React.FC<Props> = ({
  onSelectTicker,
  compact = false,
  refreshTrigger = 0
}) => {
  const [pulseItems, setPulseItems] = useState<WatchlistPulseItem[]>([]);
  const [mood, setMood] = useState<WatchlistMarketMood | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speed, setSpeed] = useState<'normal' | 'fast' | 'slow'>('normal');
  const [activeFilter, setActiveFilter] = useState<'all' | 'bullish' | 'bearish' | 'live'>('all');
  const [selectedItem, setSelectedItem] = useState<WatchlistPulseItem | null>(null);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchPulseData = async (showLoadingState = true) => {
    if (showLoadingState) {
      setIsRefreshing(true);
    }
    try {
      const data = await api.getWatchlistPulse();
      setMood(data.mood);
      setPulseItems(data.items);
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn('Failed to load real-time watchlist news pulse:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPulseData(true);
    // Auto-refresh pulse every 60 seconds
    const interval = setInterval(() => {
      fetchPulseData(false);
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  useEffect(() => {
    if (selectedItem || showDrawer) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [selectedItem, showDrawer]);

  // Filter headlines based on sentiment or live status
  const filteredItems = useMemo(() => {
    return pulseItems.filter(item => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'bullish') return item.sentiment === 'positive';
      if (activeFilter === 'bearish') return item.sentiment === 'negative';
      if (activeFilter === 'live') return item.isLive;
      return true;
    });
  }, [pulseItems, activeFilter]);

  // Duplicate items for continuous horizontal scrolling marquee
  const displayItems = useMemo(() => {
    if (filteredItems.length === 0) return pulseItems;
    // Repeat at least enough times to prevent empty loops on wide screens
    if (filteredItems.length < 4) {
      return [...filteredItems, ...filteredItems, ...filteredItems, ...filteredItems];
    }
    return [...filteredItems, ...filteredItems];
  }, [filteredItems, pulseItems]);

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    const diffMin = Math.max(1, Math.floor((Date.now() - date.getTime()) / (1000 * 60)));
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return '1d ago';
  };

  const getSpeedDuration = () => {
    if (speed === 'fast') return '22s';
    if (speed === 'slow') return '55s';
    return '36s';
  };

  const handleTickerClick = (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectTicker) {
      onSelectTicker(ticker);
    }
  };

  if (loading && !mood) {
    return (
      <div className="w-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping" />
          <span className="text-xs font-mono text-slate-500">Syncing Real-Time Watchlist News Pulse & Market Mood...</span>
        </div>
      </div>
    );
  }

  // Derive mood visual styling
  const moodScore = mood?.overallScore ?? 0;
  const isMoodBullish = moodScore >= 0.12;
  const isMoodBearish = moodScore <= -0.12;

  const moodColorClasses = isMoodBullish
    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800'
    : isMoodBearish
    ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800'
    : 'text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/80 border-cyan-300 dark:border-cyan-800';

  return (
    <div className="w-full space-y-2 mb-3">
      {/* 1. Header: Market Mood Gauge & Quick Intelligence Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs">
        {/* Left: Component identity & pulsing indicator */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white flex items-center gap-1.5">
                Real-Time Watchlist News Pulse
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 hidden sm:inline">
                {mood?.totalAssets || 0} Watchlist Assets
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Live sentiment stream fused with quantitative news impact on monitored assets
            </p>
          </div>
        </div>

        {/* Center: Immediate Visual Feedback on Watchlist Market Mood */}
        {mood && (
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/70 p-2 rounded-lg border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold hidden md:inline">
                Watchlist Mood:
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border flex items-center gap-1 ${moodColorClasses}`}>
                {isMoodBullish ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : isMoodBearish ? (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                ) : (
                  <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                )}
                <span>{mood.marketMoodLabel}</span>
                <span className="text-[10px] opacity-80 tabular-nums">
                  ({moodScore >= 0 ? `+${moodScore.toFixed(2)}` : moodScore.toFixed(2)})
                </span>
              </span>
            </div>

            {/* Visual ratio bar */}
            <div className="hidden sm:flex flex-col gap-0.5 w-24">
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                <div style={{ width: `${mood.bullishPct}%` }} className="bg-emerald-500 h-full" title={`Bullish: ${mood.bullishPct}%`} />
                <div style={{ width: `${mood.neutralPct}%` }} className="bg-slate-400 dark:bg-slate-600 h-full" title={`Neutral: ${mood.neutralPct}%`} />
                <div style={{ width: `${mood.bearishPct}%` }} className="bg-rose-500 h-full" title={`Bearish: ${mood.bearishPct}%`} />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-400 tabular-nums">
                <span className="text-emerald-600 dark:text-emerald-400">{mood.bullishPct}% Bull</span>
                <span className="text-rose-600 dark:text-rose-400">{mood.bearishPct}% Bear</span>
              </div>
            </div>
          </div>
        )}

        {/* Right: Controls & Filter Toggle */}
        <div className="flex items-center gap-1.5">
          {/* Sentiment Filter Pills */}
          <div className="hidden md:flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
            {(['all', 'bullish', 'bearish', 'live'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer capitalize ${
                  activeFilter === filter
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {filter === 'live' ? '● Live' : filter}
              </button>
            ))}
          </div>

          {/* Speed Toggle */}
          <button
            onClick={() => {
              if (speed === 'normal') setSpeed('fast');
              else if (speed === 'fast') setSpeed('slow');
              else setSpeed('normal');
            }}
            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-mono font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title={`Marquee speed: ${speed}. Click to adjust.`}
          >
            {speed === 'fast' ? '2.0x' : speed === 'slow' ? '0.6x' : '1.0x'}
          </button>

          {/* Pause / Play Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title={isPaused ? 'Resume scrolling pulse' : 'Pause scrolling pulse'}
            aria-label="Pause or play marquee"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchPulseData(true)}
            disabled={isRefreshing}
            className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Refresh latest news pulse"
            aria-label="Refresh news pulse"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-500' : ''}`} />
          </button>

          {/* View Drawer Button */}
          <button
            onClick={() => setShowDrawer(true)}
            className="px-2.5 py-1 rounded bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/80 dark:hover:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 text-[11px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="View all headlines in drawer"
          >
            <Eye className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            <span>Feed ({pulseItems.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Scrolling Marquee Ribbon Tape */}
      <div
        className="relative w-full h-12 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs flex items-center select-none group transition-all hover:border-slate-300 dark:hover:border-slate-700"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Left Lead Badge */}
        <div className="shrink-0 h-full bg-slate-900 dark:bg-slate-950 px-3 flex items-center gap-2 border-r border-slate-700 z-20 text-white font-mono text-[11px] font-bold tracking-wider">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="uppercase tracking-widest hidden sm:inline">PULSE</span>
        </div>

        {/* Left Fade Mask */}
        <div className="absolute left-16 sm:left-24 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-slate-900 to-transparent pointer-events-none z-10" />

        {/* Marquee Content Rail */}
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          {displayItems.length === 0 ? (
            <div className="px-4 text-xs font-mono text-slate-500">
              No headlines matching filter "{activeFilter}".
            </div>
          ) : (
            <div
              className={`flex items-center gap-6 whitespace-nowrap will-change-transform ${
                isPaused ? '' : 'animate-marquee'
              }`}
              style={{
                animationPlayState: isPaused ? 'paused' : 'running',
                animationDuration: getSpeedDuration(),
                display: 'flex',
                width: 'max-content'
              }}
            >
              {displayItems.map((item, index) => {
                const isPos = item.sentiment === 'positive';
                const isNeg = item.sentiment === 'negative';
                const cleanTicker = item.ticker.replace('.NS', '');

                return (
                  <div
                    key={`${item.id}-${index}`}
                    onClick={() => setSelectedItem(item)}
                    className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer text-xs font-mono group/item shrink-0 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    title="Click to view story impact & full intelligence"
                  >
                    {/* Ticker & Asset Button */}
                    <button
                      type="button"
                      onClick={(e) => handleTickerClick(item.ticker, e)}
                      className="font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-cyan-100 dark:bg-slate-800 dark:hover:bg-cyan-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-400 text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                      title={`Open full analysis for ${cleanTicker}`}
                    >
                      <Building2 className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400" />
                      <span>{cleanTicker}</span>
                      {item.changePercent !== undefined && (
                        <span className={`text-[10px] tabular-nums font-semibold ${
                          item.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(1)}%
                        </span>
                      )}
                    </button>

                    {/* Real-time LIVE chip */}
                    {item.isLive && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 animate-pulse">
                        LIVE
                      </span>
                    )}

                    {/* Sentiment Score Pill */}
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold flex items-center gap-0.5 tabular-nums ${
                        isPos
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                          : isNeg
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isPos ? (
                        <TrendingUp className="w-2.5 h-2.5" />
                      ) : isNeg ? (
                        <TrendingDown className="w-2.5 h-2.5" />
                      ) : (
                        <Minus className="w-2.5 h-2.5" />
                      )}
                      <span>
                        {item.sentimentScore >= 0 ? `+${item.sentimentScore.toFixed(2)}` : item.sentimentScore.toFixed(2)}
                      </span>
                    </span>

                    {/* Headline text */}
                    <span className="text-slate-800 dark:text-slate-200 group-hover/item:text-cyan-600 dark:group-hover/item:text-cyan-400 transition-colors font-sans text-xs max-w-sm sm:max-w-md truncate font-medium">
                      {item.headline}
                    </span>

                    {/* Source */}
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      · {item.source}
                    </span>

                    {/* Time ago */}
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      {formatTimeAgo(item.publishedAt)}
                    </span>

                    {/* Diamond separator */}
                    <span className="text-slate-300 dark:text-slate-700 mx-1">◆</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Fade Mask */}
        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none z-10" />
      </div>

      {/* 3. Detailed Modal upon clicking any headline */}
      {selectedItem && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overscroll-contain overflow-y-auto"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] shadow-2xl p-6 relative overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                  {selectedItem.ticker}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {selectedItem.companyName}
                </span>
                {selectedItem.isLive && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    REAL-TIME LIVE
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Headline Title */}
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                {selectedItem.headline}
              </h3>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-mono">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{selectedItem.source}</span>
                <span>•</span>
                <span>{formatTimeAgo(selectedItem.publishedAt)}</span>
                <span>•</span>
                <span className={selectedItem.sentiment === 'positive' ? 'text-emerald-600' : selectedItem.sentiment === 'negative' ? 'text-rose-600' : 'text-slate-500'}>
                  Score: {selectedItem.sentimentScore >= 0 ? `+${selectedItem.sentimentScore}` : selectedItem.sentimentScore} ({selectedItem.sentiment.toUpperCase()})
                </span>
              </div>
            </div>

            {/* Summary */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {selectedItem.summary}
            </div>

            {/* Actions: Direct Stock Analysis & External Source */}
            <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
              <a
                href={selectedItem.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
              >
                <span>Read Full Article on {selectedItem.source}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {onSelectTicker && (
                <button
                  onClick={() => {
                    onSelectTicker(selectedItem.ticker);
                    setSelectedItem(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <span>Launch Conformal Analysis for {selectedItem.ticker.replace('.NS', '')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 4. Full Feed Drawer Modal */}
      {showDrawer && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overscroll-contain overflow-y-auto"
          onClick={() => setShowDrawer(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Watchlist Real-Time Intelligence Feed
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  All active headlines affecting your monitored watchlist assets
                </span>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {pulseItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedItem(item);
                  }}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-500/60 transition-colors cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white">
                        {item.ticker}
                      </span>
                      <span className="text-xs text-slate-500">{item.companyName}</span>
                      {item.isLive && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                          LIVE
                        </span>
                      )}
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      item.sentiment === 'positive'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300'
                        : item.sentiment === 'negative'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {item.sentimentScore >= 0 ? `+${item.sentimentScore.toFixed(2)}` : item.sentimentScore.toFixed(2)} ({item.sentiment.toUpperCase()})
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-900 dark:text-slate-200 leading-snug">
                    {item.headline}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                    <span>{item.source} · {formatTimeAgo(item.publishedAt)}</span>
                    <span className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5">
                      <span>View details</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
