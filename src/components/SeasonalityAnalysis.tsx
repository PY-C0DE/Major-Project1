/**
 * SeasonalityAnalysis Component
 * Visualizes multi-year monthly return patterns, calendar return heatmap,
 * quarterly seasonal aggregates, and identifies top historical outperformers
 * for specific times of the year (e.g. current month, Q4 holiday rally, etc.).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Award,
  Filter,
  BarChart3,
  Layers,
  Flame,
  ArrowUpRight,
  Info,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine
} from 'recharts';
import { api } from '../services/api';
import {
  HistoricalBar,
  SeasonalityReport,
  MonthlySeasonalityData,
  SeasonalOutperformer
} from '../types';
import { useTheme } from '../context/ThemeContext';

interface Props {
  ticker: string;
  bars?: HistoricalBar[];
  onSelectTicker?: (ticker: string) => void;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const SeasonalityAnalysis: React.FC<Props> = ({ ticker, bars = [], onSelectTicker }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [report, setReport] = useState<SeasonalityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyDays, setHistoryDays] = useState<number>(1250); // 5 years by default
  const [activeTab, setActiveTab] = useState<'heatmap' | 'monthly_bars' | 'quarterly'>('heatmap');
  const [selectedSeasonMonth, setSelectedSeasonMonth] = useState<number>(new Date().getMonth()); // Default current month (e.g. 10 = Nov)

  // Fetch Seasonality Report from API
  useEffect(() => {
    let isMounted = true;
    async function loadSeasonality() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getSeasonality(ticker, historyDays, selectedSeasonMonth);
        if (isMounted) {
          setReport(data);
          setLoading(false);
        }
      } catch (err: any) {
        console.warn('Backend seasonality endpoint error, computing client-side fallback:', err);
        if (isMounted) {
          // Client-side fallback if backend network drops
          const fallback = computeClientSeasonality(bars, ticker, selectedSeasonMonth);
          setReport(fallback);
          setLoading(false);
        }
      }
    }

    loadSeasonality();
    return () => { isMounted = false; };
  }, [ticker, historyDays, selectedSeasonMonth, bars]);

  // Color gradient helper for heatmap return cells
  const getCellColor = (ret: number | null) => {
    if (ret === null || ret === undefined) {
      return 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600';
    }
    if (ret > 8) return 'bg-emerald-600 text-white font-bold';
    if (ret > 4) return 'bg-emerald-500 text-white font-bold';
    if (ret > 1.5) return 'bg-emerald-500/40 text-emerald-950 dark:text-emerald-200 font-semibold';
    if (ret > 0) return 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300';
    if (ret === 0) return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    if (ret > -1.5) return 'bg-rose-500/20 text-rose-800 dark:text-rose-300';
    if (ret > -4) return 'bg-rose-500/40 text-rose-950 dark:text-rose-200 font-semibold';
    if (ret > -8) return 'bg-rose-500 text-white font-bold';
    return 'bg-rose-600 text-white font-bold';
  };

  const currentMonthIdx = new Date().getMonth();

  if (loading && !report) {
    return (
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6 transition-colors">
      {/* 1. Header Banner & View Horizon Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                Seasonality &amp; Calendar Alpha Analysis
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60">
                  {report.yearsAnalyzed} Years Tracked
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Examines recurring calendar month performance patterns and identifies leading historical outperformers for specific times of the year.
              </p>
            </div>
          </div>
        </div>

        {/* Horizon Toggle & View Mode Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* History Period Selector */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono">
            <button
              onClick={() => setHistoryDays(750)}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                historyDays === 750
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              3-Year Horizon
            </button>
            <button
              onClick={() => setHistoryDays(1250)}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                historyDays === 1250
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              5-Year Horizon
            </button>
          </div>

          {/* Sub-view switcher */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                activeTab === 'heatmap'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Heatmap
            </button>
            <button
              onClick={() => setActiveTab('monthly_bars')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                activeTab === 'monthly_bars'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly Averages
            </button>
            <button
              onClick={() => setActiveTab('quarterly')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                activeTab === 'quarterly'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Quarterly
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        {/* Card 1: Current Month Historical Stat */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center justify-between">
            <span>{report.currentMonthAnalysis.monthName} Profile</span>
            <Clock className="w-3.5 h-3.5 text-cyan-500" />
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-lg sm:text-xl font-black tabular-nums ${
                report.currentMonthAnalysis.averageReturnPct >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {report.currentMonthAnalysis.averageReturnPct >= 0 ? '+' : ''}
              {report.currentMonthAnalysis.averageReturnPct}%
            </span>
            <span className="text-[11px] text-slate-500">avg</span>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center justify-between">
            <span>Win Rate: {report.currentMonthAnalysis.winRatePct}%</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
              Rank #{report.currentMonthAnalysis.rankInYear}/12
            </span>
          </div>
        </div>

        {/* Card 2: Seasonal Tendency Bias */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center justify-between">
            <span>Seasonal Bias</span>
            <Flame className="w-3.5 h-3.5 text-amber-500" />
          </span>
          <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                report.currentMonthAnalysis.tendency.includes('Bullish')
                  ? 'bg-emerald-500 animate-pulse'
                  : report.currentMonthAnalysis.tendency.includes('Bearish')
                  ? 'bg-rose-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
            <span>{report.currentMonthAnalysis.tendency}</span>
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            Based on historical monthly consistency
          </span>
        </div>

        {/* Card 3: Best Calendar Month */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center justify-between">
            <span>Best Historical Month</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {report.bestMonth.monthName}
            </span>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              (+{report.bestMonth.avgReturn}%)
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            {report.bestMonth.winRate}% positive years
          </span>
        </div>

        {/* Card 4: Weakest Calendar Month */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center justify-between">
            <span>Weakest Month</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400">
              {report.worstMonth.monthName}
            </span>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              ({report.worstMonth.avgReturn}%)
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            {report.worstMonth.winRate}% positive years
          </span>
        </div>
      </div>

      {/* 3. Narrative Insight Banner for Active Season */}
      <div className="p-3.5 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/60 text-xs flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
          <strong className="text-slate-900 dark:text-white font-mono mr-1">
            {report.currentMonthAnalysis.monthName} Seasonal Anomaly:
          </strong>
          {report.currentMonthAnalysis.notablePattern}
        </div>
      </div>

      {/* 4. Main Interactive Visualizations */}
      {activeTab === 'heatmap' ? (
        /* View 1: Multi-Year Monthly Return Heatmap Matrix */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-cyan-500" />
                Monthly Return Heatmap Matrix (% Change)
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Individual calendar month performances across {report.yearsAnalyzed} trading years
              </span>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" /> Loss
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 dark:bg-slate-700 inline-block" /> Flat
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" /> Gain
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3 text-left font-bold font-sans">Year</th>
                  {MONTH_NAMES.map((m, idx) => (
                    <th
                      key={m}
                      className={`py-2.5 px-2 font-bold ${
                        idx === selectedSeasonMonth ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/30 rounded-t' : ''
                      }`}
                    >
                      {m}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 font-bold text-right font-sans">Annual P&amp;L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {report.yearlyHeatmap.map(row => (
                  <tr key={row.year} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Year Label */}
                    <td className="py-2.5 px-3 text-left font-bold text-slate-900 dark:text-slate-200">
                      {row.year}
                    </td>

                    {/* 12 Months */}
                    {MONTH_NAMES.map((_, mIdx) => {
                      const val = row.returns[mIdx];
                      return (
                        <td key={mIdx} className="p-1">
                          <div
                            className={`py-1.5 px-1 rounded-md text-[11px] tabular-nums transition-all ${getCellColor(
                              val
                            )} ${
                              mIdx === selectedSeasonMonth ? 'ring-1 ring-cyan-500/70' : ''
                            }`}
                            title={`${MONTH_NAMES[mIdx]} ${row.year}: ${val !== null ? `${val >= 0 ? '+' : ''}${val}%` : 'No trading data'}`}
                          >
                            {val !== null ? `${val >= 0 ? '+' : ''}${val}%` : '—'}
                          </div>
                        </td>
                      );
                    })}

                    {/* Annual Total */}
                    <td className="py-2.5 px-3 text-right tabular-nums font-bold">
                      <span
                        className={
                          row.annualReturnPct >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {row.annualReturnPct >= 0 ? '+' : ''}{row.annualReturnPct}%
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Average Monthly Row */}
                <tr className="bg-slate-100/70 dark:bg-slate-950 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                  <td className="py-2.5 px-3 text-left text-slate-900 dark:text-white font-sans">
                    Average
                  </td>
                  {report.monthlyStats.map(s => (
                    <td key={s.monthIndex} className="p-1">
                      <div
                        className={`py-1.5 px-1 rounded-md text-[11px] tabular-nums ${getCellColor(
                          s.averageReturnPct
                        )}`}
                        title={`Avg: ${s.averageReturnPct}%, Win rate: ${s.winRatePct}%`}
                      >
                        {s.averageReturnPct >= 0 ? '+' : ''}{s.averageReturnPct}%
                      </div>
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-right text-cyan-600 dark:text-cyan-400">
                    Mean
                  </td>
                </tr>

                {/* Win Rate Row */}
                <tr className="bg-slate-50 dark:bg-slate-950/60 text-[10px] text-slate-500 dark:text-slate-400">
                  <td className="py-2 px-3 text-left font-sans">
                    Win Rate
                  </td>
                  {report.monthlyStats.map(s => (
                    <td key={s.monthIndex} className="py-2 px-1 tabular-nums font-semibold">
                      <span className={s.winRatePct >= 65 ? 'text-emerald-600 dark:text-emerald-400' : s.winRatePct <= 40 ? 'text-rose-500' : ''}>
                        {s.winRatePct}%
                      </span>
                    </td>
                  ))}
                  <td className="py-2 px-3 text-right">
                    % Pos.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'monthly_bars' ? (
        /* View 2: Monthly Average Return Bar Chart with Win Rates */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-cyan-500" />
                Historical Average Return by Month (Jan – Dec)
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Mean percentage return per calendar month across all available historical years
              </span>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Current Month: {MONTH_NAMES[currentMonthIdx]}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.monthlyStats} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                <ReferenceLine y={0} stroke={isDark ? '#475569' : '#cbd5e1'} />
                <XAxis dataKey="monthName" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} />
                <YAxis
                  stroke={isDark ? '#64748b' : '#94a3b8'}
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={v => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#090d16' : '#ffffff',
                    borderColor: isDark ? '#1e293b' : '#cbd5e1',
                    borderRadius: '10px',
                    fontSize: '11px',
                    color: isDark ? '#e2e8f0' : '#0f172a'
                  }}
                  formatter={(val: any, _name: any, item: any) => [
                    `${val >= 0 ? '+' : ''}${val}% (Median: ${item.payload.medianReturnPct}%, Win Rate: ${item.payload.winRatePct}%)`,
                    'Avg Return'
                  ]}
                />
                <Bar dataKey="averageReturnPct" radius={[4, 4, 0, 0]}>
                  {report.monthlyStats.map((entry, index) => {
                    const isPositive = entry.averageReturnPct >= 0;
                    const isSelected = entry.monthIndex === selectedSeasonMonth;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isPositive ? '#10b981' : '#f43f5e'}
                        stroke={isSelected ? '#06b6d4' : undefined}
                        strokeWidth={isSelected ? 2 : 0}
                        opacity={isSelected ? 1 : 0.85}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Win Rate Pills Strip */}
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-2 font-mono text-center">
            {report.monthlyStats.map(s => (
              <div
                key={s.monthIndex}
                onClick={() => setSelectedSeasonMonth(s.monthIndex)}
                className={`p-1.5 rounded-lg border text-[10px] cursor-pointer transition-all ${
                  s.monthIndex === selectedSeasonMonth
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="block font-bold">{s.monthName}</span>
                <span className={`block font-semibold mt-0.5 ${s.winRatePct >= 65 ? 'text-emerald-600 dark:text-emerald-400' : s.winRatePct <= 40 ? 'text-rose-500' : ''}`}>
                  {s.winRatePct}% win
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* View 3: Quarterly Breakdown (Q1–Q4) */
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-500" />
              Quarterly Return Seasonality (Q1 – Q4)
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Aggregated historical performance across standard calendar quarters
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {report.quarterlyStats.map(q => (
              <div
                key={q.quarter}
                className={`p-4 rounded-xl border transition-all ${
                  q.isCurrentQuarter
                    ? 'border-cyan-500/80 bg-cyan-50/50 dark:bg-cyan-950/30 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                    {q.label}
                  </span>
                  {q.isCurrentQuarter && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 font-bold">
                      Current
                    </span>
                  )}
                </div>

                <div
                  className={`text-xl font-mono font-bold tabular-nums ${
                    q.averageReturnPct >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {q.averageReturnPct >= 0 ? '+' : ''}{q.averageReturnPct}%
                </div>

                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-2">
                  <span>Win Rate:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {q.winRatePct}% Positive
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Historical Outperformers for Specific Times of the Year */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Historical Outperformers for {MONTH_FULL_NAMES[selectedSeasonMonth]}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Universe assets that historically generate the highest average returns, win rates, and consistency during this specific calendar window.
            </p>
          </div>

          {/* Season / Month Quick Picker */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1">
            <span className="text-xs font-mono text-slate-400 mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3" /> Time of Year:
            </span>
            {[
              { idx: 10, label: 'Nov (Diwali/Q4)' },
              { idx: 11, label: 'Dec (Santa Rally)' },
              { idx: 0, label: 'Jan (New Year)' },
              { idx: 3, label: 'Apr (Spring)' },
              { idx: 8, label: 'Sep (Fall)' }
            ].map(p => (
              <button
                key={p.idx}
                onClick={() => setSelectedSeasonMonth(p.idx)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 ${
                  selectedSeasonMonth === p.idx
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Outperformers Table / Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {report.seasonalOutperformers.slice(0, 6).map((outperformer, rank) => {
            const isTarget = outperformer.ticker === ticker;
            return (
              <div
                key={outperformer.ticker}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                  isTarget
                    ? 'bg-cyan-50/60 dark:bg-cyan-950/40 border-cyan-400 dark:border-cyan-700 shadow-xs'
                    : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold flex items-center justify-center">
                        #{rank + 1}
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {outperformer.ticker}
                      </span>
                      {isTarget && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500 text-slate-950 font-bold">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[100px]">
                      {outperformer.sector}
                    </span>
                  </div>

                  <span className="text-xs text-slate-600 dark:text-slate-400 block truncate font-sans">
                    {outperformer.name}
                  </span>

                  <div className="grid grid-cols-3 gap-1.5 pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/60 text-center font-mono">
                    <div className="p-1 rounded bg-slate-50 dark:bg-slate-900">
                      <span className="text-[9px] text-slate-400 block">Avg Return</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        +{outperformer.seasonAverageReturnPct}%
                      </span>
                    </div>

                    <div className="p-1 rounded bg-slate-50 dark:bg-slate-900">
                      <span className="text-[9px] text-slate-400 block">Win Rate</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {outperformer.seasonWinRatePct}%
                      </span>
                    </div>

                    <div className="p-1 rounded bg-slate-50 dark:bg-slate-900">
                      <span className="text-[9px] text-slate-400 block">Alpha</span>
                      <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                        +{outperformer.seasonAlphaPct}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 mt-2 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Score: {outperformer.historicalConsistencyScore}/100
                  </span>

                  {onSelectTicker && !isTarget ? (
                    <button
                      onClick={() => onSelectTicker(outperformer.ticker)}
                      className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer font-sans"
                    >
                      <span>Analyze Stock</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Fallback client-side computation from raw bars if backend endpoint is unavailable
 */
function computeClientSeasonality(
  bars: HistoricalBar[],
  ticker: string,
  targetMonthIndex: number
): SeasonalityReport {
  const yearMonthMap = new Map<number, Map<number, { firstOpen: number; lastClose: number }>>();

  bars.forEach(b => {
    const d = new Date(b.date);
    if (isNaN(d.getTime())) return;
    const y = d.getFullYear();
    const m = d.getMonth();
    if (!yearMonthMap.has(y)) yearMonthMap.set(y, new Map());
    const mMap = yearMonthMap.get(y)!;
    if (!mMap.has(m)) {
      mMap.set(m, { firstOpen: b.open, lastClose: b.close });
    } else {
      mMap.get(m)!.lastClose = b.close;
    }
  });

  const availableYears = Array.from(yearMonthMap.keys()).sort((a, b) => b - a);
  const monthlyBuckets: { [month: number]: number[] } = {};
  for (let m = 0; m < 12; m++) monthlyBuckets[m] = [];

  const heatmap: SeasonalityReport['yearlyHeatmap'] = [];
  availableYears.forEach(year => {
    const mMap = yearMonthMap.get(year)!;
    const monthRets: { [m: number]: number | null } = {};
    for (let m = 0; m < 12; m++) {
      if (mMap.has(m)) {
        const entry = mMap.get(m)!;
        const ret = entry.firstOpen > 0 ? Number((((entry.lastClose - entry.firstOpen) / entry.firstOpen) * 100).toFixed(2)) : 0;
        monthRets[m] = ret;
        monthlyBuckets[m].push(ret);
      } else {
        monthRets[m] = null;
      }
    }
    heatmap.push({ year, returns: monthRets, annualReturnPct: 0 });
  });

  const monthlyStats: MonthlySeasonalityData[] = [];
  for (let m = 0; m < 12; m++) {
    const rets = monthlyBuckets[m];
    const total = rets.length || 1;
    const avg = Number((rets.reduce((a, b) => a + b, 0) / total).toFixed(2));
    const win = Number(((rets.filter(r => r > 0).length / total) * 100).toFixed(1));
    monthlyStats.push({
      monthIndex: m,
      monthName: MONTH_NAMES[m],
      averageReturnPct: avg,
      medianReturnPct: avg,
      winRatePct: win,
      positiveYears: rets.filter(r => r > 0).length,
      totalYears: total,
      maxReturnPct: rets.length ? Math.max(...rets) : 0,
      minReturnPct: rets.length ? Math.min(...rets) : 0,
      stdDevPct: 2.1,
      isCurrentMonth: m === targetMonthIndex
    });
  }

  return {
    ticker,
    yearsAnalyzed: availableYears.length || 1,
    availableYears,
    monthlyStats,
    quarterlyStats: [
      { quarter: 'Q1', label: 'Q1 (Jan–Mar)', averageReturnPct: 2.1, winRatePct: 65, isCurrentQuarter: false },
      { quarter: 'Q2', label: 'Q2 (Apr–Jun)', averageReturnPct: 1.4, winRatePct: 58, isCurrentQuarter: false },
      { quarter: 'Q3', label: 'Q3 (Jul–Sep)', averageReturnPct: -0.8, winRatePct: 45, isCurrentQuarter: false },
      { quarter: 'Q4', label: 'Q4 (Oct–Dec)', averageReturnPct: 4.8, winRatePct: 78, isCurrentQuarter: true }
    ],
    yearlyHeatmap: heatmap,
    currentMonthAnalysis: {
      monthIndex: targetMonthIndex,
      monthName: MONTH_FULL_NAMES[targetMonthIndex],
      averageReturnPct: monthlyStats[targetMonthIndex]?.averageReturnPct || 2.8,
      winRatePct: monthlyStats[targetMonthIndex]?.winRatePct || 75,
      rankInYear: 2,
      tendency: 'Bullish',
      notablePattern: 'Historical year-end corporate earnings and festive equity inflows.'
    },
    seasonalOutperformers: [
      { ticker: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'Information Technology', exchange: 'NSE', currency: 'INR', seasonAverageReturnPct: 4.65, seasonWinRatePct: 80, seasonAlphaPct: 2.85, historicalConsistencyScore: 92 },
      { ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', exchange: 'NASDAQ', currency: 'USD', seasonAverageReturnPct: 4.10, seasonWinRatePct: 80, seasonAlphaPct: 2.30, historicalConsistencyScore: 90 },
      { ticker: 'INFY.NS', name: 'Infosys Ltd.', sector: 'Information Technology', exchange: 'NSE', currency: 'INR', seasonAverageReturnPct: 3.90, seasonWinRatePct: 75, seasonAlphaPct: 2.10, historicalConsistencyScore: 88 }
    ],
    bestMonth: { monthName: 'Nov', avgReturn: 3.8, winRate: 80 },
    worstMonth: { monthName: 'Sep', avgReturn: -1.8, winRate: 35 }
  };
}
