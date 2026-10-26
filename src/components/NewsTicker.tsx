/**
 * NewsTicker Component
 * Horizontal, auto-scrolling news ticker for market-moving headlines.
 * Uses real-time headlines with pause-on-hover and sentiment indicators.
 */

import React, { useState, useEffect } from 'react';
import { Newspaper, TrendingUp, TrendingDown, Minus, ExternalLink, Sparkles, Pause, Play } from 'lucide-react';
import { api } from '../services/api';
import { NewsItem } from '../types';

interface Props {
  onSelectTicker?: (ticker: string) => void;
}

export const NewsTicker: React.FC<Props> = ({ onSelectTicker }) => {
  const [headlines, setHeadlines] = useState<NewsItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchNews() {
      try {
        const data = await api.getMarketHeadlines();
        if (isMounted && data && data.length > 0) {
          setHeadlines(data);
        }
      } catch (err) {
        console.error('Failed to fetch market headlines for ticker:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchNews();
    const interval = setInterval(fetchNews, 60000); // refresh every minute
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading && headlines.length === 0) {
    return (
      <div className="h-10 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center px-4 text-xs font-mono text-slate-500 animate-pulse">
        <Newspaper className="w-4 h-4 mr-2 text-cyan-500 animate-spin" />
        <span>Loading live market-moving news headlines...</span>
      </div>
    );
  }

  if (headlines.length === 0) return null;

  // Duplicate items to ensure smooth continuous marquee loop
  const displayItems = [...headlines, ...headlines];

  return (
    <div
      className="relative w-full h-11 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs flex items-center select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Ticker Lead Tag */}
      <div className="shrink-0 h-full bg-cyan-600 dark:bg-cyan-950 px-3.5 flex items-center gap-2 border-r border-cyan-500/30 dark:border-cyan-800/60 z-10 text-white dark:text-cyan-300 font-mono text-xs font-bold tracking-wider">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <Newspaper className="w-3.5 h-3.5 text-cyan-200 dark:text-cyan-400" />
        <span className="hidden sm:inline uppercase text-[11px]">Breaking Tape</span>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="ml-1 p-0.5 rounded text-white/80 hover:text-white dark:text-cyan-400/80 dark:hover:text-cyan-300 cursor-pointer"
          title={isPaused ? 'Resume auto-scroll' : 'Pause ticker'}
        >
          {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
        </button>
      </div>

      {/* Marquee Content Rail */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <div
          className={`flex items-center gap-8 whitespace-nowrap will-change-transform ${
            isPaused ? 'animation-pause' : 'animate-marquee'
          }`}
          style={{
            animationPlayState: isPaused ? 'paused' : 'running',
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
                onClick={() => onSelectTicker?.(item.ticker)}
                className="inline-flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer text-xs font-mono group/item shrink-0"
              >
                {/* Ticker Badge */}
                <span className="font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 text-[11px] group-hover/item:border-cyan-500 transition-colors">
                  {cleanTicker}
                </span>

                {/* Sentiment Pill */}
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold flex items-center gap-0.5 ${
                    isPos
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                      : isNeg
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {isPos ? <TrendingUp className="w-2.5 h-2.5" /> : isNeg ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                  <span>{item.sentiment.toUpperCase()}</span>
                </span>

                {/* Headline Text */}
                <span className="text-slate-800 dark:text-slate-200 font-sans text-xs group-hover/item:text-cyan-600 dark:group-hover/item:text-cyan-400 transition-colors max-w-sm sm:max-w-md truncate">
                  {item.headline}
                </span>

                {/* Source & Timestamp */}
                <span className="text-[10px] text-slate-600 dark:text-slate-400">
                  ({item.source})
                </span>

                <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fade Edge Masks */}
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none" />
    </div>
  );
};
