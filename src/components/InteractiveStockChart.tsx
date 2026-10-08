/**
 * High-Density Interactive Financial Stock Chart
 * Displays Historical OHLCV, Moving Averages (SMA20, SMA50),
 * Bollinger Bands, Conformal 90% Confidence Envelope, and RSI/MACD sub-charts.
 * Supports dark and light themes.
 */

import React, { useState } from 'react';
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
import { HistoricalBar, ConformalPrediction } from '../types';
import { useTheme } from '../context/ThemeContext';

interface Props {
  bars: HistoricalBar[];
  prediction: ConformalPrediction | null;
  currency: string;
  ticker: string;
}

export const InteractiveStockChart: React.FC<Props> = ({ bars, prediction, currency, ticker }) => {
  const { theme } = useTheme();
  const [rangeDays, setRangeDays] = useState<number>(90);
  const [showSMA, setShowSMA] = useState<boolean>(true);
  const [showBB, setShowBB] = useState<boolean>(false);
  const [subChart, setSubChart] = useState<'rsi' | 'macd' | 'none'>('rsi');

  const currSym = currency === 'INR' ? '₹' : '$';
  const isDark = theme === 'dark';

  // Filter bars by range
  const filteredBars = bars.slice(-rangeDays);

  // Calculate Y min and max for responsive scale
  const closes = filteredBars.map(b => b.close);
  const minPrice = Math.min(...closes) * 0.96;
  const maxPrice = Math.max(...closes) * 1.04;

  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const axisColor = isDark ? '#64748b' : '#94a3b8';

  return (
    <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm dark:shadow-xl transition-colors">
      {/* Chart Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono">{ticker}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">· Daily Candle Stream</span>
        </div>

        {/* Toggles & Range Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Technical Overlays Toggles */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setShowSMA(!showSMA)}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                showSMA
                  ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              SMA 20/50
            </button>
            <button
              onClick={() => setShowBB(!showBB)}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                showBB
                  ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bollinger Bands
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
              Hide Subchart
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

            {/* Moving Averages */}
            {showSMA && (
              <>
                <Line
                  type="monotone"
                  dataKey="sma20"
                  name="SMA 20"
                  stroke="#f59e0b"
                  dot={false}
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey="sma50"
                  name="SMA 50"
                  stroke="#3b82f6"
                  dot={false}
                  strokeWidth={1.5}
                />
              </>
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
                  value: `Forecast ${currSym}${prediction.predictedPrice}`,
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
