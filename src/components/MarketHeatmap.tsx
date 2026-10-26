/**
 * MarketHeatmap Component
 * D3.js interactive Sector & Index Heatmap for DashboardPage.
 * Visualizes sector-wide price action and volatility across selectable benchmark indices.
 */

import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Layers, Activity, TrendingUp, TrendingDown, Maximize2, Sparkles, Filter, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeatmapStock {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  currency: string;
  changePct: number;
  marketCapB: number;
  volatilityPct: number;
  regime: string;
}

interface SectorGroup {
  sector: string;
  stocks: HeatmapStock[];
}

interface Props {
  onSelectTicker?: (ticker: string) => void;
}

const INDEX_DATA: Record<string, HeatmapStock[]> = {
  'NIFTY 50': [
    // Tech & IT
    { ticker: 'TCS.NS', name: 'Tata Consultancy', sector: 'Information Tech', price: 4210.75, currency: '₹', changePct: 1.45, marketCapB: 182, volatilityPct: 14.2, regime: 'Steady Drift' },
    { ticker: 'INFY.NS', name: 'Infosys Ltd', sector: 'Information Tech', price: 1915.20, currency: '₹', changePct: 2.10, marketCapB: 95, volatilityPct: 16.8, regime: 'Steady Drift' },
    { ticker: 'HCLTECH.NS', name: 'HCL Technologies', sector: 'Information Tech', price: 1785.40, currency: '₹', changePct: -0.65, marketCapB: 58, volatilityPct: 17.5, regime: 'Mean Revert' },
    { ticker: 'WIPRO.NS', name: 'Wipro Limited', sector: 'Information Tech', price: 542.10, currency: '₹', changePct: -1.20, marketCapB: 34, volatilityPct: 19.1, regime: 'Mean Revert' },
    // Energy & Conglomerates
    { ticker: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energy & Tech', price: 2980.50, currency: '₹', changePct: 1.85, marketCapB: 242, volatilityPct: 15.3, regime: 'Steady Drift' },
    { ticker: 'ONGC.NS', name: 'Oil & Natural Gas', sector: 'Energy & Tech', price: 288.60, currency: '₹', changePct: 3.40, marketCapB: 44, volatilityPct: 22.4, regime: 'Volatility Breakout' },
    { ticker: 'NTPC.NS', name: 'NTPC Limited', sector: 'Energy & Tech', price: 412.30, currency: '₹', changePct: 0.95, marketCapB: 48, volatilityPct: 13.9, regime: 'Steady Drift' },
    // Financials & Banking
    { ticker: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', sector: 'Financial Services', price: 1680.90, currency: '₹', changePct: -0.75, marketCapB: 155, volatilityPct: 13.1, regime: 'Steady Drift' },
    { ticker: 'ICICIBANK.NS', name: 'ICICI Bank Ltd', sector: 'Financial Services', price: 1245.80, currency: '₹', changePct: 1.60, marketCapB: 104, volatilityPct: 14.6, regime: 'Steady Drift' },
    { ticker: 'SBIN.NS', name: 'State Bank of India', sector: 'Financial Services', price: 815.40, currency: '₹', changePct: -1.80, marketCapB: 88, volatilityPct: 18.2, regime: 'Mean Revert' },
    { ticker: 'AXISBANK.NS', name: 'Axis Bank', sector: 'Financial Services', price: 1195.00, currency: '₹', changePct: 0.40, marketCapB: 45, volatilityPct: 16.4, regime: 'Steady Drift' },
    // Auto & Industrials
    { ticker: 'TATAMOTORS.NS', name: 'Tata Motors Passenger', sector: 'Automotive', price: 890.30, currency: '₹', changePct: 2.75, marketCapB: 40, volatilityPct: 24.1, regime: 'Volatility Breakout' },
    { ticker: 'M&M.NS', name: 'Mahindra & Mahindra', sector: 'Automotive', price: 2980.00, currency: '₹', changePct: 1.90, marketCapB: 43, volatilityPct: 19.5, regime: 'Steady Drift' },
    { ticker: 'MARUTI.NS', name: 'Maruti Suzuki', sector: 'Automotive', price: 12450.00, currency: '₹', changePct: -0.90, marketCapB: 47, volatilityPct: 15.1, regime: 'Mean Revert' },
    // Consumer & Pharma
    { ticker: 'ITC.NS', name: 'ITC Limited', sector: 'Consumer Goods', price: 495.20, currency: '₹', changePct: 0.35, marketCapB: 74, volatilityPct: 11.2, regime: 'Steady Drift' },
    { ticker: 'HINDUNILVR.NS', name: 'Hindustan Unilever', sector: 'Consumer Goods', price: 2680.00, currency: '₹', changePct: -1.40, marketCapB: 76, volatilityPct: 12.8, regime: 'Mean Revert' },
    { ticker: 'SUNPHARMA.NS', name: 'Sun Pharma', sector: 'Healthcare', price: 1820.50, currency: '₹', changePct: 1.15, marketCapB: 52, volatilityPct: 14.0, regime: 'Steady Drift' }
  ],
  'S&P 500': [
    // Big Tech & Semiconductor
    { ticker: 'NVDA', name: 'NVIDIA Corp', sector: 'Technology', price: 128.40, currency: '$', changePct: 3.85, marketCapB: 3150, volatilityPct: 38.5, regime: 'Volatility Breakout' },
    { ticker: 'AAPL', name: 'Apple Inc', sector: 'Technology', price: 228.50, currency: '$', changePct: -0.45, marketCapB: 3480, volatilityPct: 16.2, regime: 'Steady Drift' },
    { ticker: 'MSFT', name: 'Microsoft Corp', sector: 'Technology', price: 445.20, currency: '$', changePct: 1.10, marketCapB: 3310, volatilityPct: 17.8, regime: 'Steady Drift' },
    { ticker: 'GOOGL', name: 'Alphabet Inc', sector: 'Technology', price: 184.60, currency: '$', changePct: 0.85, marketCapB: 2280, volatilityPct: 21.4, regime: 'Steady Drift' },
    { ticker: 'AVGO', name: 'Broadcom Inc', sector: 'Technology', price: 172.50, currency: '$', changePct: 2.65, marketCapB: 805, volatilityPct: 28.2, regime: 'Steady Drift' },
    // Consumer & Retail
    { ticker: 'AMZN', name: 'Amazon.com', sector: 'Consumer Discretionary', price: 188.30, currency: '$', changePct: 1.70, marketCapB: 1960, volatilityPct: 23.5, regime: 'Steady Drift' },
    { ticker: 'TSLA', name: 'Tesla Inc', sector: 'Consumer Discretionary', price: 218.40, currency: '$', changePct: -2.80, marketCapB: 695, volatilityPct: 45.2, regime: 'High Volatility Bear' },
    { ticker: 'WMT', name: 'Walmart Inc', sector: 'Consumer Staples', price: 78.90, currency: '$', changePct: 0.45, marketCapB: 635, volatilityPct: 12.4, regime: 'Steady Drift' },
    { ticker: 'COST', name: 'Costco Wholesale', sector: 'Consumer Staples', price: 895.10, currency: '$', changePct: -0.30, marketCapB: 397, volatilityPct: 14.5, regime: 'Steady Drift' },
    // Financials
    { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', price: 216.50, currency: '$', changePct: 1.35, marketCapB: 618, volatilityPct: 15.6, regime: 'Steady Drift' },
    { ticker: 'BAC', name: 'Bank of America', sector: 'Financials', price: 42.10, currency: '$', changePct: -1.15, marketCapB: 328, volatilityPct: 18.2, regime: 'Mean Revert' },
    { ticker: 'V', name: 'Visa Inc', sector: 'Financials', price: 278.40, currency: '$', changePct: 0.60, marketCapB: 565, volatilityPct: 13.9, regime: 'Steady Drift' },
    // Healthcare & Energy
    { ticker: 'LLY', name: 'Eli Lilly & Co', sector: 'Healthcare', price: 915.00, currency: '$', changePct: 2.40, marketCapB: 870, volatilityPct: 24.8, regime: 'Steady Drift' },
    { ticker: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', price: 582.30, currency: '$', changePct: -1.95, marketCapB: 535, volatilityPct: 17.1, regime: 'Mean Revert' },
    { ticker: 'XOM', name: 'Exxon Mobil Corp', sector: 'Energy', price: 118.70, currency: '$', changePct: 2.10, marketCapB: 472, volatilityPct: 19.3, regime: 'Steady Drift' }
  ],
  'NASDAQ 100': [
    { ticker: 'NVDA', name: 'NVIDIA Corp', sector: 'Semiconductors', price: 128.40, currency: '$', changePct: 3.85, marketCapB: 3150, volatilityPct: 38.5, regime: 'Volatility Breakout' },
    { ticker: 'AAPL', name: 'Apple Inc', sector: 'Consumer Tech', price: 228.50, currency: '$', changePct: -0.45, marketCapB: 3480, volatilityPct: 16.2, regime: 'Steady Drift' },
    { ticker: 'MSFT', name: 'Microsoft Corp', sector: 'Software & Cloud', price: 445.20, currency: '$', changePct: 1.10, marketCapB: 3310, volatilityPct: 17.8, regime: 'Steady Drift' },
    { ticker: 'META', name: 'Meta Platforms', sector: 'Digital Media', price: 585.10, currency: '$', changePct: 2.90, marketCapB: 1480, volatilityPct: 27.6, regime: 'Steady Drift' },
    { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'Semiconductors', price: 156.40, currency: '$', changePct: 4.15, marketCapB: 253, volatilityPct: 36.4, regime: 'Volatility Breakout' },
    { ticker: 'QCOM', name: 'Qualcomm Inc', sector: 'Semiconductors', price: 168.90, currency: '$', changePct: -1.65, marketCapB: 188, volatilityPct: 29.8, regime: 'Mean Revert' },
    { ticker: 'NFLX', name: 'Netflix Inc', sector: 'Streaming & Media', price: 712.50, currency: '$', changePct: 1.95, marketCapB: 306, volatilityPct: 25.1, regime: 'Steady Drift' },
    { ticker: 'INTC', name: 'Intel Corp', sector: 'Semiconductors', price: 22.80, currency: '$', changePct: -3.40, marketCapB: 98, volatilityPct: 42.0, regime: 'High Volatility Bear' }
  ],
  'GLOBAL TECH': [
    { ticker: 'NVDA', name: 'NVIDIA (US)', sector: 'Semiconductors', price: 128.40, currency: '$', changePct: 3.85, marketCapB: 3150, volatilityPct: 38.5, regime: 'Volatility Breakout' },
    { ticker: 'TSM', name: 'TSMC (Taiwan)', sector: 'Foundry & Wafers', price: 198.60, currency: '$', changePct: 2.80, marketCapB: 1030, volatilityPct: 27.2, regime: 'Steady Drift' },
    { ticker: 'TCS.NS', name: 'TCS (India)', sector: 'IT Services', price: 4210.75, currency: '₹', changePct: 1.45, marketCapB: 182, volatilityPct: 14.2, regime: 'Steady Drift' },
    { ticker: 'ASML', name: 'ASML Holding (EU)', sector: 'Lithography Systems', price: 730.40, currency: '€', changePct: -2.10, marketCapB: 290, volatilityPct: 31.5, regime: 'Mean Revert' },
    { ticker: 'INFY.NS', name: 'Infosys (India)', sector: 'Cloud & Services', price: 1915.20, currency: '₹', changePct: 2.10, marketCapB: 95, volatilityPct: 16.8, regime: 'Steady Drift' },
    { ticker: 'ARM', name: 'Arm Holdings (UK)', sector: 'IP & Architecture', price: 142.10, currency: '$', changePct: 4.60, marketCapB: 148, volatilityPct: 41.2, regime: 'Volatility Breakout' }
  ]
};

export const MarketHeatmap: React.FC<Props> = ({ onSelectTicker }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedIndex, setSelectedIndex] = useState<string>('NIFTY 50');
  const [hoveredStock, setHoveredStock] = useState<HeatmapStock | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeStocks = INDEX_DATA[selectedIndex] || INDEX_DATA['NIFTY 50'];

  // D3 Color Scale Generator
  const getColor = (pct: number) => {
    if (pct >= 3.0) return isDark ? '#059669' : '#10b981';
    if (pct >= 1.5) return isDark ? '#047857' : '#34d399';
    if (pct > 0.1) return isDark ? '#064e3b' : '#6ee7b7';
    if (pct >= -0.1 && pct <= 0.1) return isDark ? '#1e293b' : '#e2e8f0';
    if (pct <= -3.0) return isDark ? '#9f1239' : '#e11d48';
    if (pct <= -1.5) return isDark ? '#881337' : '#f43f5e';
    return isDark ? '#4c0519' : '#fda4af';
  };

  const getTextColor = (pct: number) => {
    if (!isDark && Math.abs(pct) <= 0.1) return '#0f172a';
    if (!isDark && pct > 0.1 && pct < 1.5) return '#064e3b';
    return '#ffffff';
  };

  // Group stocks by sector
  const sectorsMap = activeStocks.reduce((acc, stock) => {
    if (!acc[stock.sector]) acc[stock.sector] = [];
    acc[stock.sector].push(stock);
    return acc;
  }, {} as Record<string, HeatmapStock[]>);

  const sectors = Object.entries(sectorsMap).map(([sector, stocks]) => ({
    sector,
    stocks
  }));

  // Render D3 Treemap / Matrix
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = Math.max(340, Math.min(420, width * 0.45));

    // Clear previous SVG contents
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    // Build hierarchical data for D3 Treemap
    const rootData = {
      name: selectedIndex,
      children: sectors.map(sec => ({
        name: sec.sector,
        children: sec.stocks.map(st => ({
          ...st,
          name: st.ticker,
          value: Math.max(15, st.marketCapB)
        }))
      }))
    };

    const root = d3
      .hierarchy(rootData)
      .sum((d: any) => d.value)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    d3
      .treemap()
      .size([width, height])
      .paddingTop(22)
      .paddingInner(3)
      .round(true)(root as any);

    // Render Sector Headers
    const sectorNodes = svg
      .selectAll('.sector-group')
      .data(root.children || [])
      .enter()
      .append('g')
      .attr('class', 'sector-group');

    sectorNodes
      .append('text')
      .attr('x', (d: any) => d.x0 + 4)
      .attr('y', (d: any) => d.y0 + 15)
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .attr('fill', isDark ? '#94a3b8' : '#475569')
      .text((d: any) => d.data.name.toUpperCase());

    // Render Stock Leaf Nodes
    const leafNodes = svg
      .selectAll('.leaf-node')
      .data(root.leaves())
      .enter()
      .append('g')
      .attr('class', 'leaf-node')
      .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)
      .style('cursor', 'pointer');

    // Tile Rectangle
    leafNodes
      .append('rect')
      .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
      .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', (d: any) => getColor(d.data.changePct))
      .attr('stroke', isDark ? '#0f172a' : '#ffffff')
      .attr('stroke-width', 1.5)
      .on('mouseenter', (_e, d: any) => setHoveredStock(d.data))
      .on('mouseleave', () => setHoveredStock(null))
      .on('click', (_e, d: any) => onSelectTicker?.(d.data.ticker));

    // Ticker Symbol
    leafNodes
      .append('text')
      .attr('x', 6)
      .attr('y', 16)
      .attr('font-size', (d: any) => {
        const w = d.x1 - d.x0;
        return w < 60 ? '10px' : '12px';
      })
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .attr('fill', (d: any) => getTextColor(d.data.changePct))
      .text((d: any) => {
        const w = d.x1 - d.x0;
        const sym = d.data.ticker.replace('.NS', '');
        return w < 40 ? sym.slice(0, 3) : sym;
      });

    // Percent Change Text
    leafNodes
      .append('text')
      .attr('x', 6)
      .attr('y', (d: any) => {
        const h = d.y1 - d.y0;
        return h < 45 ? 28 : 34;
      })
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '600')
      .attr('fill', (d: any) => getTextColor(d.data.changePct))
      .text((d: any) => {
        const h = d.y1 - d.y0;
        const w = d.x1 - d.x0;
        if (h < 35 || w < 50) return '';
        const chg = d.data.changePct;
        return `${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%`;
      });
  }, [selectedIndex, isDark, activeStocks]);

  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all space-y-4">
      {/* Header with Title & Index Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold font-display text-slate-900 dark:text-white">
                Market Treemap & Volatility Heatmap
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 font-semibold">
                D3.js Vector Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Sector-wide market cap sizing, directional price action & volatility regimes
            </p>
          </div>
        </div>

        {/* Index Toggle Pills */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono">
          {Object.keys(INDEX_DATA).map(idxKey => (
            <button
              key={idxKey}
              onClick={() => setSelectedIndex(idxKey)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-semibold ${
                selectedIndex === idxKey
                  ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {idxKey}
            </button>
          ))}
        </div>
      </div>

      {/* D3 Treemap Container */}
      <div ref={containerRef} className="relative w-full rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 p-1">
        <svg ref={svgRef} className="w-full block" />

        {/* Interactive Floating Detail Overlay */}
        {hoveredStock && (
          <div className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-300 dark:border-slate-700 rounded-xl p-3 shadow-xl text-xs font-mono space-y-1.5 animate-fadeIn min-w-[210px] pointer-events-none">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {hoveredStock.ticker}
                </span>
                <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                  {hoveredStock.name}
                </span>
              </div>
              <span
                className={`font-black text-sm px-1.5 py-0.5 rounded ${
                  hoveredStock.changePct >= 0
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                }`}
              >
                {hoveredStock.changePct >= 0 ? '+' : ''}{hoveredStock.changePct}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-slate-400 text-[10px] block">Price:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {hoveredStock.currency}{hoveredStock.price.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Sector:</span>
                <span className="text-slate-700 dark:text-slate-300 truncate block">
                  {hoveredStock.sector}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Volatility:</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                  {hoveredStock.volatilityPct}% Ann.
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Regime:</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">
                  {hoveredStock.regime}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Heatmap Legend Bar */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 pt-1">
        <div className="flex items-center gap-2">
          <span>Scale:</span>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-rose-600 inline-block" title="-3.0% or worse" />
            <span className="text-[10px]">-3%</span>
            <span className="w-3.5 h-3.5 rounded bg-rose-400 inline-block" />
            <span className="w-3.5 h-3.5 rounded bg-slate-400 dark:bg-slate-700 inline-block" title="0.0% Flat" />
            <span className="text-[10px]">0%</span>
            <span className="w-3.5 h-3.5 rounded bg-emerald-400 inline-block" />
            <span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-block" title="+3.0% or higher" />
            <span className="text-[10px]">+3%</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400">
          Tile size proportional to market weighting · Click any stock to view full AI analysis
        </span>
      </div>
    </div>
  );
};
