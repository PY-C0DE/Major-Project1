/**
 * High-Density Interactive Financial Stock Chart
 * Displays Historical OHLCV, Moving Averages (SMA20, SMA50),
 * Bollinger Bands, Conformal 90% Confidence Envelope, and RSI/MACD sub-charts.
 * Supports dark and light themes.
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Layers, Activity } from 'lucide-react';
import { HistoricalBar, ConformalPrediction } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getCurrencySymbol } from '../utils/currency';

interface Props {
  bars: HistoricalBar[];
  prediction: ConformalPrediction | null;
  currency: string;
  ticker: string;
}

export const InteractiveStockChart: React.FC<Props> = ({ bars, prediction, currency, ticker }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [rangeDays, setRangeDays] = useState<number>(90);
  const [showSMA50, setShowSMA50] = useState<boolean>(true);
  const [showSMA200, setShowSMA200] = useState<boolean>(true);
  const [showSMA20, setShowSMA20] = useState<boolean>(false);
  const [showBB, setShowBB] = useState<boolean>(false);
  const [subChart, setSubChart] = useState<'rsi' | 'macd' | 'none'>('rsi');

  const currSym = getCurrencySymbol(currency, ticker);
  const isDark = theme === 'dark';

  // Compute rolling moving averages over the full bar history to ensure continuity across all ranges
  const enrichedBars = useMemo(() => {
    if (!bars || bars.length === 0) return [];
    const closes = bars.map(b => b.close);

    const calcSMA = (data: number[], p: number) => {
      const out: (number | undefined)[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < p - 1) {
          out.push(undefined);
        } else {
          let sum = 0;
          for (let j = 0; j < p; j++) sum += data[i - j];
          out.push(Number((sum / p).toFixed(2)));
        }
      }
      return out;
    };

    const s20 = calcSMA(closes, 20);
    const s50 = calcSMA(closes, 50);
    const s200 = calcSMA(closes, 200);

    return bars.map((b, i) => ({
      ...b,
      sma20: b.sma20 ?? s20[i],
      sma50: b.sma50 ?? s50[i],
      sma200: b.sma200 ?? s200[i]
    }));
  }, [bars]);

  // Filter bars by range
  const filteredBars = enrichedBars.slice(-rangeDays);

  // Calculate Y min and max for responsive scale
  const closes = filteredBars.map(b => b.close);
  const minPrice = Math.min(...closes) * 0.96;
  const maxPrice = Math.max(...closes) * 1.04;

  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const axisColor = isDark ? '#64748b' : '#94a3b8';

  // Latest metrics for trend analysis ribbon
  const latestBar = filteredBars[filteredBars.length - 1];
  const latestClose = latestBar?.close;
  const latestSMA50 = latestBar?.sma50;
  const latestSMA200 = latestBar?.sma200;

  const trendSignal = useMemo(() => {
    if (!latestClose) return null;
    if (latestSMA50 && latestSMA200) {
      if (latestClose >= latestSMA50 && latestSMA50 >= latestSMA200) {
        return {
          label: t('chart.golden_cross'),
          badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
          rationale: 'Price trading above both SMA 50 and SMA 200 (Institutional Uptrend)'
        };
      }
      if (latestClose <= latestSMA50 && latestSMA50 <= latestSMA200) {
        return {
          label: t('chart.death_cross'),
          badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700',
          rationale: 'Price suppressed below both SMA 50 and SMA 200 (Macro Downside Trend)'
        };
      }
      if (latestClose <= latestSMA50 && latestClose >= latestSMA200) {
        return {
          label: t('chart.consolidation'),
          badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
          rationale: 'Holding above 200-day baseline with intermediate pullback below SMA 50'
        };
      }
      if (latestClose >= latestSMA50 && latestClose <= latestSMA200) {
        return {
          label: t('chart.counter_trend'),
          badge: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700',
          rationale: 'Short-term recovery above SMA 50 testing 200-day macro barrier'
        };
      }
    } else if (latestSMA50) {
      return {
        label: latestClose >= latestSMA50 ? `${t('chart.golden_cross')} (> SMA 50)` : `${t('chart.death_cross')} (< SMA 50)`,
        badge: latestClose >= latestSMA50
          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700',
        rationale: `Price trading ${latestClose >= latestSMA50 ? t('chart.above') : t('chart.below')} 50-day average`
      };
    }
    return null;
  }, [latestClose, latestSMA50, latestSMA200, t]);

  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 sm:p-5 lg:p-6 shadow-xs hover:shadow-sm transition-all">
      {/* Chart Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono">{ticker}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">· Daily Candle Stream</span>
          {bars.length > 0 && bars[0]?.source === 'synthetic' && (
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              Simulated data
            </span>
          )}
        </div>

        {/* Toggles & Range Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Moving Averages Toggles (SMA 50, SMA 200, SMA 20, BB) */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 px-1 hidden sm:inline">MA:</span>
            <button
              onClick={() => setShowSMA50(!showSMA50)}
              className={`px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                showSMA50
                  ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 font-semibold ring-1 ring-blue-400/60 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Toggle 50-Day Simple Moving Average (Intermediate Trend)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              SMA 50
            </button>
            <button
              onClick={() => setShowSMA200(!showSMA200)}
              className={`px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                showSMA200
                  ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 font-semibold ring-1 ring-purple-400/60 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Toggle 200-Day Simple Moving Average (Macro Baseline)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              SMA 200
            </button>
            <button
              onClick={() => setShowSMA20(!showSMA20)}
              className={`px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                showSMA20
                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold ring-1 ring-amber-400/60 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Toggle 20-Day Simple Moving Average (Short-term)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              SMA 20
            </button>
            <button
              onClick={() => setShowBB(!showBB)}
              className={`px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                showBB
                  ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 font-semibold ring-1 ring-indigo-400/60 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Toggle Bollinger Bands (20, 2σ)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              BB
            </button>
          </div>

          {/* Subchart Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setSubChart('rsi')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                subChart === 'rsi'
                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              RSI (14)
            </button>
            <button
              onClick={() => setSubChart('macd')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                subChart === 'macd'
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              MACD
            </button>
            <button
              onClick={() => setSubChart('none')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                subChart === 'none'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Hide
            </button>
          </div>

          {/* Range Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono">
            {[
              { label: '1M', days: 30 },
              { label: '3M', days: 90 },
              { label: '6M', days: 180 },
              { label: '1Y', days: 250 }
            ].map(r => (
              <button
                key={r.label}
                onClick={() => setRangeDays(r.days)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  rangeDays === r.days
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trend Analysis Ribbon (Evaluated from SMA 50 & SMA 200) */}
      {(showSMA50 || showSMA200) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 mb-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-[11px] font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Trend Analysis:
            </span>
            {showSMA50 && latestSMA50 !== undefined && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">SMA 50:</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {currSym}{latestSMA50.toFixed(2)}
                </span>
                {latestClose !== undefined && (
                  <span className={`text-[10px] font-bold ${latestClose >= latestSMA50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    ({latestClose >= latestSMA50 ? '+' : ''}{(((latestClose - latestSMA50) / latestSMA50) * 100).toFixed(1)}%)
                  </span>
                )}
              </span>
            )}
            {showSMA200 && latestSMA200 !== undefined && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">SMA 200:</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {currSym}{latestSMA200.toFixed(2)}
                </span>
                {latestClose !== undefined && (
                  <span className={`text-[10px] font-bold ${latestClose >= latestSMA200 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    ({latestClose >= latestSMA200 ? '+' : ''}{(((latestClose - latestSMA200) / latestSMA200) * 100).toFixed(1)}%)
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Trend Classification Badge */}
          {trendSignal && (
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${trendSignal.badge}`}>
                {trendSignal.label}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden md:inline">
                {trendSignal.rationale}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Price Chart */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredBars} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={isDark ? 0.25 : 0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              stroke={axisColor}
              fontSize={10}
              tickLine={false}
              tickFormatter={val => val.slice(5)}
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              stroke={axisColor}
              fontSize={10}
              tickLine={false}
              orientation="right"
              tickFormatter={val => `${currSym}${val.toFixed(0)}`}
              width={65}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#090d16' : '#ffffff',
                borderColor: isDark ? '#1e293b' : '#e2e8f0',
                borderRadius: '8px',
                fontSize: '11px',
                color: isDark ? '#e2e8f0' : '#0f172a',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: any, name: any) => {
                if (typeof value === 'number') {
                  return [`${currSym}${value.toFixed(2)}`, name];
                }
                return [value, name];
              }}
            />

            {/* Bollinger Bands Overlay */}
            {showBB && (
              <>
                <Line
                  type="monotone"
                  dataKey="bbUpper"
                  name="BB Upper"
                  stroke="#818cf8"
                  strokeDasharray="2 2"
                  dot={false}
                  strokeWidth={1}
                />
                <Line
                  type="monotone"
                  dataKey="bbLower"
                  name="BB Lower"
                  stroke="#818cf8"
                  strokeDasharray="2 2"
                  dot={false}
                  strokeWidth={1}
                />
              </>
            )}

            {/* Technical Moving Averages Overlays (SMA 20, SMA 50, SMA 200) */}
            {showSMA20 && (
              <Line
                type="monotone"
                dataKey="sma20"
                name="SMA 20 (Short-term)"
                stroke="#f59e0b"
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            )}
            {showSMA50 && (
              <Line
                type="monotone"
                dataKey="sma50"
                name="SMA 50 (Trend Line)"
                stroke="#3b82f6"
                dot={false}
                strokeWidth={1.8}
                isAnimationActive={false}
              />
            )}
            {showSMA200 && (
              <Line
                type="monotone"
                dataKey="sma200"
                name="SMA 200 (Macro Baseline)"
                stroke="#a855f7"
                strokeDasharray="4 2"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            )}

            {/* Price Area */}
            <Area
              type="monotone"
              dataKey="close"
              name="Close Price"
              stroke="#0891b2"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#priceGradient)"
            />

            {/* Conformal 90% Prediction Range Indicator Line */}
            {prediction && (
              <ReferenceLine
                y={prediction.predictedPrice}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{
                  value: `Forecast ${currSym}${prediction.predictedPrice} (${prediction.targetDate || `${prediction.horizonDays}D`})`,
                  fill: '#10b981',
                  fontSize: 10,
                  position: 'left'
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Subchart: RSI or MACD */}
      {subChart === 'rsi' && (
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1">
            <span>RSI (14-Period Momentum Oscillator)</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold tabular-nums">
              Latest: {filteredBars[filteredBars.length - 1]?.rsi?.toFixed(1) || '50.0'}
            </span>
          </div>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredBars} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="2 2" vertical={false} />
                <YAxis
                  domain={[0, 100]}
                  stroke={axisColor}
                  fontSize={9}
                  orientation="right"
                  ticks={[30, 50, 70]}
                  width={40}
                />
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" opacity={0.6} />
                <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" opacity={0.6} />
                <Line
                  type="monotone"
                  dataKey="rsi"
                  stroke="#f59e0b"
                  dot={false}
                  strokeWidth={1.5}
                  name="RSI 14"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {subChart === 'macd' && (
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1">
            <span>MACD (12, 26, 9) Histogram & Signal</span>
          </div>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredBars} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="2 2" vertical={false} />
                <YAxis stroke={axisColor} fontSize={9} orientation="right" width={40} />
                <Bar
                  dataKey="macdHist"
                  name="MACD Hist"
                  fill="#06b6d4"
                  opacity={0.8}
                />
                <Line
                  type="monotone"
                  dataKey="macd"
                  stroke="#10b981"
                  dot={false}
                  strokeWidth={1.5}
                  name="MACD"
                />
                <Line
                  type="monotone"
                  dataKey="macdSignal"
                  stroke="#f43f5e"
                  dot={false}
                  strokeWidth={1.5}
                  name="Signal"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
