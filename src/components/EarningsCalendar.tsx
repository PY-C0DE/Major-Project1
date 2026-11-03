/**
 * AlphaQuant AI - Earnings Calendar Component
 * Displays upcoming corporate earnings dates, consensus EPS forecasts,
 * YoY growth projections, implied options moves, and historical surprise patterns (4-quarter track records)
 * for the user's watchlist stocks.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  DollarSign,
  Activity,
  Layers,
  BarChart3,
  Calendar,
  Flame,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  Target
} from 'lucide-react';
import { api } from '../services/api';
import { EarningsCalendarItem, HistoricalEarningsQuarter } from '../types';

interface Props {
  onSelectTicker?: (ticker: string) => void;
  className?: string;
}

type TimeHorizonFilter = 'ALL' | 'NEXT_14' | 'NEXT_30';
type SurpriseFilter = 'ALL' | 'CONSISTENT_BEATS' | 'RECENT_MISSES';
type ViewLayout = 'CARDS' | 'TABLE';

export const EarningsCalendar: React.FC<Props> = ({ onSelectTicker, className = '' }) => {
  const [items, setItems] = useState<EarningsCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeHorizonFilter>('ALL');
  const [surpriseFilter, setSurpriseFilter] = useState<SurpriseFilter>('ALL');
  const [viewLayout, setViewLayout] = useState<ViewLayout>('CARDS');
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [reminderToast, setReminderToast] = useState<{ ticker: string; message: string } | null>(null);

  const fetchEarningsData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.getEarningsCalendar(false);
      setItems(data);
    } catch (err) {
      console.error('Failed to load earnings calendar:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, []);

  // Filtered Earnings Events
  const filteredEvents = useMemo(() => {
    return items.filter((item) => {
      // 1. Watchlist filter
      if (watchlistOnly && !item.inWatchlist) return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTicker = item.ticker.toLowerCase().includes(q);
        const matchCompany = item.companyName.toLowerCase().includes(q);
        const matchSector = item.sector.toLowerCase().includes(q);
        if (!matchTicker && !matchCompany && !matchSector) return false;
      }

      // 3. Time Horizon filter
      if (timeFilter === 'NEXT_14' && item.daysUntilReport > 14) return false;
      if (timeFilter === 'NEXT_30' && item.daysUntilReport > 30) return false;

      // 4. Surprise Pattern filter
      if (surpriseFilter === 'CONSISTENT_BEATS' && item.beatRatePct < 75) return false;
      if (surpriseFilter === 'RECENT_MISSES') {
        const hasRecentMiss = item.historicalQuarters.some((q) => q.outcome === 'MISS');
        if (!hasRecentMiss) return false;
      }

      return true;
    });
  }, [items, watchlistOnly, searchQuery, timeFilter, surpriseFilter]);

  // Executive Telemetry Computations
  const telemetry = useMemo(() => {
    if (!items.length) {
      return {
        next30DaysCount: 0,
        avgEPSGrowth: 0,
        overallBeatRate: 0,
        nearestEvent: null
      };
    }

    const next30 = items.filter((i) => i.daysUntilReport <= 30);
    const avgEPS = items.reduce((acc, i) => acc + i.yoyEPSGrowthPct, 0) / items.length;
    const avgBeat = items.reduce((acc, i) => acc + i.beatRatePct, 0) / items.length;
    const nearest = [...items].sort((a, b) => a.daysUntilReport - b.daysUntilReport)[0] || null;

    return {
      next30DaysCount: next30.length,
      avgEPSGrowth: Number(avgEPS.toFixed(1)),
      overallBeatRate: Math.round(avgBeat),
      nearestEvent: nearest
    };
  }, [items]);

  // Download .ics Calendar Reminder File
  const handleDownloadICS = (item: EarningsCalendarItem) => {
    const reportDate = new Date(`${item.reportDate}T16:00:00Z`);
    const dateStr = reportDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDateStr = new Date(reportDate.getTime() + 3600000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AlphaQuant AI//Earnings Calendar//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:earnings-${item.ticker}-${item.fiscalPeriod}@alphaquant.ai`,
      `DTSTAMP:${dateStr}`,
      `DTSTART:${dateStr}`,
      `DTEND:${endDateStr}`,
      `SUMMARY:📈 ${item.ticker} (${item.companyName}) Earnings Release - ${item.fiscalPeriod}`,
      `DESCRIPTION:Consensus Estimated EPS: ${item.currSym}${item.estimatedEPS.toFixed(2)} (YoY: ${item.yoyEPSGrowthPct > 0 ? '+' : ''}${item.yoyEPSGrowthPct}%). Estimated Revenue: ${item.estimatedRevenue}. Historical Beat Rate: ${item.beatRatePct}%. Key Themes: ${item.keyFocusThemes.join(', ')}.`,
      `LOCATION:${item.session === 'AMC' ? 'After Market Close' : item.session === 'BMO' ? 'Before Market Open' : 'Market Session'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${item.ticker}_Earnings_${item.fiscalPeriod}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setReminderToast({
      ticker: item.ticker,
      message: `Downloaded .ics Calendar reminder for ${item.ticker} ${item.fiscalPeriod} earnings (${item.reportDateFormatted})`
    });
    setTimeout(() => setReminderToast(null), 4000);
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors ${className}`}>
      {/* 1. Header Bar with Calendar Badge and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/15 via-cyan-500/15 to-emerald-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-2xs">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 font-display">
                <span>Earnings Calendar</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                  Consensus &amp; Surprises
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upcoming corporate earnings release dates, consensus EPS estimates, revenue projections, and 4-quarter historical beat/miss patterns.
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Watchlist Toggle */}
          <button
            type="button"
            onClick={() => setWatchlistOnly(!watchlistOnly)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              watchlistOnly
                ? 'bg-cyan-500/15 border-cyan-500/35 text-cyan-700 dark:text-cyan-300 font-bold'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            <span>{watchlistOnly ? 'Watchlist Only' : 'All Watchlist & Equities'}</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchEarningsData(true)}
            disabled={refreshing}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Refresh Earnings Calendar"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Executive Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
            Upcoming in 30 Days
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {telemetry.next30DaysCount} <span className="text-xs font-sans font-normal text-slate-400">Reports</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">
            Key catalyst windows
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
            Avg EPS Growth Forecast
          </span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{telemetry.avgEPSGrowth}% <span className="text-xs font-sans font-normal text-slate-400">YoY</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">
            Consensus analyst revisions
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
            Watchlist Historical Beat Rate
          </span>
          <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
            {telemetry.overallBeatRate}% <span className="text-xs font-sans font-normal text-slate-400">Beats</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">
            Trailing 4 quarters consistency
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
            Nearest Earnings Event
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold font-mono text-cyan-600 dark:text-cyan-400 truncate">
              {telemetry.nearestEvent?.ticker || 'N/A'}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold">
              In {telemetry.nearestEvent?.daysUntilReport}d
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono block truncate">
            {telemetry.nearestEvent?.reportDateFormatted} ({telemetry.nearestEvent?.session})
          </span>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
        {/* Search Input */}
        <div className="relative min-w-[220px] sm:min-w-[260px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter ticker, company, or sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-7 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Time Horizon Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setTimeFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                timeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All Horizons
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('NEXT_14')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                timeFilter === 'NEXT_14'
                  ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Next 14 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('NEXT_30')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                timeFilter === 'NEXT_30'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Next 30 Days
            </button>
          </div>

          {/* Surprise Pattern Filter */}
          <select
            value={surpriseFilter}
            onChange={(e) => setSurpriseFilter(e.target.value as SurpriseFilter)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Surprise Patterns</option>
            <option value="CONSISTENT_BEATS">Consistent Beaters (≥75% Beats)</option>
            <option value="RECENT_MISSES">Recent Miss Exposure</option>
          </select>
        </div>
      </div>

      {/* Reminder Download Notification Toast */}
      {reminderToast && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-500/20 via-cyan-500/20 to-emerald-500/20 border border-indigo-500/40 text-xs flex items-center justify-between gap-3 text-slate-900 dark:text-white animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-medium">{reminderToast.message}</span>
          </div>
          <button
            onClick={() => setReminderToast(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Earnings Event Cards Grid */}
      {loading ? (
        <div className="p-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs space-y-2">
          <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin mx-auto" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">Synchronizing earnings consensus forecasts...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs space-y-2">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">No earnings releases match the active filters</p>
          <p className="text-slate-400">Try widening your time horizon or clearing the search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredEvents.map((item) => {
            const isExpanded = expandedTicker === item.ticker;

            return (
              <div
                key={item.ticker}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3.5 ${
                  item.daysUntilReport <= 10
                    ? 'bg-gradient-to-br from-white via-white to-amber-500/5 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20 border-amber-300/80 dark:border-amber-900/50 shadow-xs'
                    : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Date Badge + Session + Days Countdown */}
                  <div className="flex items-start justify-between gap-2">
                    {/* Date Block */}
                    <div className="flex items-center gap-2.5">
                      <div className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center shrink-0">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block leading-tight">
                          {item.reportDateFormatted.split(' ')[0]}
                        </span>
                        <span className="text-base font-bold font-mono text-slate-900 dark:text-white block leading-tight">
                          {item.reportDateFormatted.split(' ')[1].replace(',', '')}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectTicker?.(item.ticker)}
                            className="font-bold text-sm font-mono text-slate-900 dark:text-white hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <span>{item.ticker}</span>
                            <ArrowUpRight className="w-3 h-3 text-slate-400" />
                          </button>

                          {item.inWatchlist && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/20">
                              Watchlist
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate block max-w-[160px]">
                          {item.companyName}
                        </span>
                      </div>
                    </div>

                    {/* Countdown Badge & Timing */}
                    <div className="text-right space-y-0.5">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full inline-block ${
                        item.daysUntilReport <= 7
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25 animate-pulse'
                          : item.daysUntilReport <= 14
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        In {item.daysUntilReport} Days
                      </span>
                      <div className="text-[10px] font-mono text-slate-400 flex items-center justify-end gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{item.session === 'AMC' ? 'After Close' : item.session === 'BMO' ? 'Before Open' : 'Market Hours'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Estimated Consensus EPS & Revenue Strip */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Consensus EPS ({item.fiscalPeriod})
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                          {item.currSym}{item.estimatedEPS.toFixed(2)}
                        </span>
                        <span className={`text-[10px] font-mono font-semibold ${item.yoyEPSGrowthPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {item.yoyEPSGrowthPct >= 0 ? '+' : ''}{item.yoyEPSGrowthPct}% YoY
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 block">
                        Range: {item.currSym}{item.estimatedEPSLow.toFixed(2)} - {item.currSym}{item.estimatedEPSHigh.toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Revenue Estimate
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                          {item.estimatedRevenue}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-500 font-semibold">
                          +{item.yoyRevenueGrowthPct}%
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 block">
                        {item.analystCount} Analysts Covering
                      </span>
                    </div>
                  </div>

                  {/* Historical Surprise Patterns & Track Record */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        <span>Historical Surprise Pattern:</span>
                      </span>
                      <span className={`font-bold ${item.beatRatePct >= 75 ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {item.beatRatePct}% Beats ({item.consecutiveBeats}x Streak)
                      </span>
                    </div>

                    {/* 4 Historical Quarter Outcome Chips */}
                    <div className="grid grid-cols-4 gap-1">
                      {item.historicalQuarters.map((hq) => {
                        const isBeat = hq.outcome === 'BEAT';
                        const isMiss = hq.outcome === 'MISS';

                        return (
                          <div
                            key={hq.quarter}
                            className={`p-1.5 rounded-lg border text-center transition-all ${
                              isBeat
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
                                : isMiss
                                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}
                            title={`${hq.quarter}: Est ${item.currSym}${hq.estimatedEPS.toFixed(2)} vs Act ${item.currSym}${hq.actualEPS.toFixed(2)} (${hq.surprisePct > 0 ? '+' : ''}${hq.surprisePct.toFixed(1)}%). 1D Move: ${hq.postEarningsMovePct > 0 ? '+' : ''}${hq.postEarningsMovePct}%`}
                          >
                            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 block leading-tight">
                              {hq.quarter}
                            </span>
                            <span className={`text-[10px] font-mono font-bold block leading-tight ${
                              isBeat ? 'text-emerald-600 dark:text-emerald-400' : isMiss ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                            }`}>
                              {hq.surprisePct > 0 ? '+' : ''}{hq.surprisePct.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expandable Deep-Dive Surprise Progression & Focus Themes */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3 animate-fadeIn text-xs">
                      {/* Past 4 Quarters Detail Table */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                          4-Quarter Historical Progression (Actual vs Estimate)
                        </span>
                        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden text-[10px] font-mono">
                          <table className="w-full text-left">
                            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500">
                              <tr>
                                <th className="p-1.5">Quarter</th>
                                <th className="p-1.5">EPS (Est / Act)</th>
                                <th className="p-1.5">Surprise</th>
                                <th className="p-1.5">1D Move</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                              {item.historicalQuarters.map((hq) => (
                                <tr key={hq.quarter} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                  <td className="p-1.5 font-bold text-slate-800 dark:text-slate-200">{hq.quarter}</td>
                                  <td className="p-1.5 tabular-nums">
                                    {item.currSym}{hq.estimatedEPS.toFixed(2)} / <strong className="text-slate-900 dark:text-white">{item.currSym}{hq.actualEPS.toFixed(2)}</strong>
                                  </td>
                                  <td className={`p-1.5 font-bold tabular-nums ${hq.surprisePct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {hq.surprisePct > 0 ? '+' : ''}{hq.surprisePct.toFixed(2)}%
                                  </td>
                                  <td className={`p-1.5 tabular-nums ${hq.postEarningsMovePct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {hq.postEarningsMovePct > 0 ? '+' : ''}{hq.postEarningsMovePct}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Implied Volatility & Key Themes */}
                      <div className="p-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/50 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-indigo-900 dark:text-indigo-200 font-semibold">Options Implied Move:</span>
                          <span className="font-bold text-indigo-700 dark:text-indigo-300">&plusmn;{item.impliedStraddleMovePct}%</span>
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Key Focus Themes: </span>
                          <span>{item.keyFocusThemes.join(' • ')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Action Links & Expand Toggle */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => handleDownloadICS(item)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Download .ics Calendar Event"
                  >
                    <Download className="w-3 h-3" />
                    <span>Add to Cal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedTicker(isExpanded ? null : item.ticker)}
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    <span>{isExpanded ? 'Less' : 'Dossier'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function XIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
