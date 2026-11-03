/**
 * AlphaQuant AI - Executive Trade Summary Component
 * Displays institutional quantitative performance metrics and risk attribution for closed trade history:
 * - Annualized Sharpe Ratio & Sortino Ratio
 * - Win / Loss Ratio, Win Rate, and Payoff Ratio (Avg Win vs Avg Loss)
 * - Average Holding Duration (Mean, Min, Max holding periods)
 * - Mathematical Expectancy per Trade & Max Drawdown
 * - Cumulative Closed Equity Curve (Interactive SVG Area Chart)
 * - Trade Outlier Highlights (Best Winner vs Largest Loss)
 * - Risk Attribution Breakdown (Percentage of total capital allocated by Sector and Asset Class)
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  Scale,
  Award,
  Zap,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Percent,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Activity,
  PieChart,
  Layers,
  Briefcase,
  Target,
  ShieldAlert,
  Info
} from 'lucide-react';
import { BrokerTrade } from '../types';
import { TICKER_CATALOG } from '../shared/tickerCatalog';

interface Props {
  trades: BrokerTrade[];
  className?: string;
  onSelectTicker?: (ticker: string) => void;
}

export interface RiskAttributionGroup {
  id: string;
  name: string;
  capitalAllocated: number; // in USD equivalent
  allocationPct: number;    // % of total closed capital
  tradeCount: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  tickers: string[];
  realizedPnL: number;
  returnOnCapitalPct: number;
  color: string;
  barColor: string;
  badgeBg: string;
  riskStance: 'Heavy Exposure' | 'Core Weight' | 'Moderate' | 'Tactical';
}

const PALETTE = [
  { color: '#06b6d4', barColor: 'bg-cyan-500', badgeBg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/25' },
  { color: '#10b981', barColor: 'bg-emerald-500', badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25' },
  { color: '#8b5cf6', barColor: 'bg-purple-500', badgeBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/25' },
  { color: '#f59e0b', barColor: 'bg-amber-500', badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25' },
  { color: '#3b82f6', barColor: 'bg-blue-500', badgeBg: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25' },
  { color: '#ec4899', barColor: 'bg-pink-500', badgeBg: 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/25' },
  { color: '#14b8a6', barColor: 'bg-teal-500', badgeBg: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/25' },
  { color: '#f97316', barColor: 'bg-orange-500', badgeBg: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/25' },
];

function getTradeSector(t: BrokerTrade): string {
  if (t.sector) return t.sector;
  const match = TICKER_CATALOG.find(
    (item) => item.ticker.toUpperCase() === t.ticker.toUpperCase()
  );
  if (match?.sector) {
    if (match.sector.includes('Automobile')) return 'Automotive & Transport';
    if (match.sector.includes('Semiconductors')) return 'Semiconductors & AI Hardware';
    if (match.sector.includes('Software')) return 'Enterprise Software & Cloud';
    if (match.sector.includes('Consumer Electronics') || match.sector.includes('Technology')) return 'Consumer Tech & Hardware';
    if (match.sector.includes('Banking') || match.sector.includes('Financial')) return 'Financial Services & Banking';
    if (match.sector.includes('Energy')) return 'Energy & Conglomerate';
    return match.sector;
  }
  const upper = t.ticker.toUpperCase();
  if (['NVDA', 'AMD', 'AVGO', 'INTC', 'TSM', 'QCOM'].includes(upper)) return 'Semiconductors & AI Hardware';
  if (['AAPL'].includes(upper)) return 'Consumer Electronics & Hardware';
  if (['TSLA', 'RIVN', 'LCID'].includes(upper)) return 'Automotive & Clean Energy';
  if (['TMCV.NS', 'TATAMOTORS', 'TMPV.NS', 'M&M.NS', 'BAJAJ-AUTO.NS'].includes(upper)) return 'Automotive & Transport';
  if (['MSFT', 'ORCL', 'CRM', 'ADBE'].includes(upper)) return 'Enterprise Software & Cloud';
  if (['GOOGL', 'META', 'AMZN'].includes(upper)) return 'Internet & Platform Tech';
  if (['RELIANCE.NS', 'ONGC.NS', 'COALINDIA.NS'].includes(upper)) return 'Energy & Conglomerate';
  if (['TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS'].includes(upper)) return 'IT Services & Consulting';
  if (['HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'JIOFIN.NS'].includes(upper)) return 'Banking & Financials';
  return 'Global Equities';
}

function getTradeAssetClass(t: BrokerTrade): string {
  if (t.assetClass) return t.assetClass;
  const upper = t.ticker.toUpperCase();
  if (upper.endsWith('.NS') || ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'TMCV.NS', 'HDFCBANK.NS'].includes(upper)) {
    return 'Emerging Market Equities (NSE)';
  }
  if (['NVDA', 'AMD', 'AVGO', 'INTC', 'TSM'].includes(upper)) {
    return 'US Semiconductor Equities';
  }
  if (['AAPL', 'MSFT', 'GOOGL', 'META', 'AMZN'].includes(upper)) {
    return 'US Mega-Cap Tech';
  }
  if (['TSLA', 'RIVN', 'LCID'].includes(upper)) {
    return 'US Large-Cap Growth / EV';
  }
  return 'Global Equities';
}

function getTradeNotionalUSD(t: BrokerTrade): number {
  const isINR = t.currency === 'INR' || t.ticker.toUpperCase().endsWith('.NS');
  const rawCapital = (t.qty || 0) * (t.entryPrice || 0);
  // Standard USD/INR conversion rate (~83.5) for uniform portfolio allocation
  return isINR ? rawCapital / 83.5 : rawCapital;
}

function getTradeRealizedPnLUSD(t: BrokerTrade): number {
  const isINR = t.currency === 'INR' || t.ticker.toUpperCase().endsWith('.NS');
  const rawPnL = t.realizedPnL || 0;
  return isINR ? rawPnL / 83.5 : rawPnL;
}

export const ExecutiveTradeSummary: React.FC<Props> = ({
  trades,
  className = '',
  onSelectTicker
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [attributionTab, setAttributionTab] = useState<'SECTOR' | 'ASSET_CLASS'>('SECTOR');
  const [activeTooltipIndex, setActiveTooltipIndex] = useState<number | null>(null);
  const [activeAttributionHover, setActiveAttributionHover] = useState<string | null>(null);

  // Filter closed trades
  const closedTrades = useMemo(() => {
    return trades
      .filter((t) => t.status === 'CLOSED')
      .sort((a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime());
  }, [trades]);

  // Executive Metrics Calculation
  const metrics = useMemo(() => {
    if (!closedTrades.length) {
      return null;
    }

    const count = closedTrades.length;
    const winningTrades = closedTrades.filter((t) => (t.realizedPnL || 0) > 0);
    const losingTrades = closedTrades.filter((t) => (t.realizedPnL || 0) < 0);
    const breakevenTrades = closedTrades.filter((t) => (t.realizedPnL || 0) === 0);

    const winCount = winningTrades.length;
    const lossCount = losingTrades.length;

    // Win/Loss Ratio
    const winLossRatio = lossCount > 0 ? Number((winCount / lossCount).toFixed(2)) : winCount > 0 ? winCount : 0;
    const winRatePct = Number(((winCount / count) * 100).toFixed(1));

    // Gains & Losses
    const grossGains = winningTrades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
    const grossLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0));
    const netRealizedPnL = grossGains - grossLosses;

    const avgWin = winCount > 0 ? grossGains / winCount : 0;
    const avgLoss = lossCount > 0 ? grossLosses / lossCount : 0;
    const payoffRatio = avgLoss > 0 ? Number((avgWin / avgLoss).toFixed(2)) : avgWin > 0 ? 99.9 : 0;
    const profitFactor = grossLosses > 0 ? Number((grossGains / grossLosses).toFixed(2)) : grossGains > 0 ? 99.9 : 0;

    // Mathematical Expectancy ($ and % per trade)
    const winProb = winCount / count;
    const lossProb = lossCount / count;
    const expectancyDollar = Number((winProb * avgWin - lossProb * avgLoss).toFixed(2));

    // Holding Durations
    const durationsMs = closedTrades.map((t) => {
      const start = new Date(t.entryDate).getTime();
      const end = new Date(t.exitDate || t.entryDate).getTime();
      return Math.max(0, end - start);
    });

    const totalDurationMs = durationsMs.reduce((acc, d) => acc + d, 0);
    const avgDurationMs = totalDurationMs / count;
    const minDurationMs = Math.min(...durationsMs);
    const maxDurationMs = Math.max(...durationsMs);

    const formatDuration = (ms: number) => {
      const hours = Math.round(ms / 3600000);
      const days = Math.floor(ms / 86400000);
      if (days >= 1) {
        const remHours = Math.round((ms % 86400000) / 3600000);
        return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
      }
      if (hours >= 1) return `${hours}h`;
      const mins = Math.max(1, Math.round(ms / 60000));
      return `${mins}m`;
    };

    const avgHoldingDays = Math.max(0.1, avgDurationMs / 86400000);

    // Return Series & Volatility for Sharpe Ratio
    const returns = closedTrades.map((t) => (t.realizedPnLPercent || 0) / 100);
    const meanReturn = returns.reduce((acc, r) => acc + r, 0) / count;

    const variance =
      count > 1
        ? returns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0) / (count - 1)
        : 0;
    const stdev = Math.sqrt(variance);

    // Downside deviation for Sortino Ratio
    const downsideVariance =
      count > 1
        ? returns.reduce((acc, r) => acc + Math.pow(Math.min(0, r), 2), 0) / (count - 1)
        : 0;
    const downsideStdev = Math.sqrt(downsideVariance);

    // Annualized Sharpe Ratio calculation (5% risk-free rate assumption)
    const riskFreeRatePerTrade = 0.05 / Math.max(1, 252 / avgHoldingDays);
    const excessReturn = meanReturn - riskFreeRatePerTrade;

    const tradesPerYear = Math.min(252, Math.max(12, 252 / avgHoldingDays));
    const annualizationFactor = Math.sqrt(tradesPerYear);

    const tradeSharpe = stdev > 0 ? excessReturn / stdev : 0;
    const annualizedSharpe = Number((tradeSharpe * annualizationFactor).toFixed(2));

    const tradeSortino = downsideStdev > 0 ? excessReturn / downsideStdev : 0;
    const annualizedSortino = Number((tradeSortino * annualizationFactor).toFixed(2));

    // Sharpe rating descriptor
    let sharpeRating = 'Sub-Optimal';
    let sharpeColor = 'text-amber-500';
    if (annualizedSharpe >= 3.0) {
      sharpeRating = 'Institutional Elite (≥3.0)';
      sharpeColor = 'text-emerald-500';
    } else if (annualizedSharpe >= 2.0) {
      sharpeRating = 'Strong Alpha (≥2.0)';
      sharpeColor = 'text-emerald-400';
    } else if (annualizedSharpe >= 1.0) {
      sharpeRating = 'Acceptable (≥1.0)';
      sharpeColor = 'text-cyan-400';
    } else if (annualizedSharpe > 0) {
      sharpeRating = 'Marginal (>0)';
      sharpeColor = 'text-amber-400';
    } else {
      sharpeRating = 'Negative Excess Return';
      sharpeColor = 'text-rose-400';
    }

    // Cumulative Closed Equity Curve Trajectory
    let runningPnL = 0;
    let peakPnL = 0;
    let maxDrawdownDollar = 0;
    let maxDrawdownPct = 0;

    const equityPoints = [{
      index: 0,
      ticker: 'Inception',
      cumulativePnL: 0,
      deltaPnL: 0,
      date: closedTrades[0]?.entryDate || new Date().toISOString()
    }];

    closedTrades.forEach((t, i) => {
      const pnl = t.realizedPnL || 0;
      runningPnL += pnl;
      if (runningPnL > peakPnL) {
        peakPnL = runningPnL;
      }
      const dd = peakPnL - runningPnL;
      if (dd > maxDrawdownDollar) {
        maxDrawdownDollar = dd;
        if (peakPnL > 0) {
          const ddPct = (dd / peakPnL) * 100;
          if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;
        }
      }

      equityPoints.push({
        index: i + 1,
        ticker: t.ticker,
        cumulativePnL: runningPnL,
        deltaPnL: pnl,
        date: t.exitDate || t.entryDate
      });
    });

    // Best & Worst Trade
    const sortedByPnL = [...closedTrades].sort((a, b) => (b.realizedPnL || 0) - (a.realizedPnL || 0));
    const bestTrade = sortedByPnL[0];
    const worstTrade = sortedByPnL[sortedByPnL.length - 1];

    // ==========================================
    // RISK ATTRIBUTION BREAKDOWN CALCULATIONS
    // ==========================================
    const totalClosedCapitalUSD = closedTrades.reduce((sum, t) => sum + getTradeNotionalUSD(t), 0);
    const netClosedRealizedUSD = closedTrades.reduce((sum, t) => sum + getTradeRealizedPnLUSD(t), 0);

    // Grouping helper
    const buildAttributionGroups = (classifier: (t: BrokerTrade) => string): RiskAttributionGroup[] => {
      const groupMap = new Map<string, {
        capital: number;
        pnl: number;
        count: number;
        wins: number;
        losses: number;
        tickers: Set<string>;
      }>();

      closedTrades.forEach((t) => {
        const cat = classifier(t);
        const cap = getTradeNotionalUSD(t);
        const pnl = getTradeRealizedPnLUSD(t);
        const isWin = (t.realizedPnL || 0) > 0;
        const isLoss = (t.realizedPnL || 0) < 0;

        const current = groupMap.get(cat) || {
          capital: 0,
          pnl: 0,
          count: 0,
          wins: 0,
          losses: 0,
          tickers: new Set<string>()
        };

        current.capital += cap;
        current.pnl += pnl;
        current.count += 1;
        if (isWin) current.wins += 1;
        if (isLoss) current.losses += 1;
        current.tickers.add(t.ticker);

        groupMap.set(cat, current);
      });

      // Convert to sorted array
      const items: RiskAttributionGroup[] = [];
      let paletteIdx = 0;

      groupMap.forEach((val, name) => {
        const allocationPct = totalClosedCapitalUSD > 0 ? (val.capital / totalClosedCapitalUSD) * 100 : 0;
        const returnOnCapitalPct = val.capital > 0 ? (val.pnl / val.capital) * 100 : 0;
        const winRatePct = val.count > 0 ? (val.wins / val.count) * 100 : 0;
        const style = PALETTE[paletteIdx % PALETTE.length];
        paletteIdx++;

        let riskStance: RiskAttributionGroup['riskStance'] = 'Tactical';
        if (allocationPct >= 40) riskStance = 'Heavy Exposure';
        else if (allocationPct >= 25) riskStance = 'Core Weight';
        else if (allocationPct >= 10) riskStance = 'Moderate';

        items.push({
          id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name,
          capitalAllocated: Number(val.capital.toFixed(2)),
          allocationPct: Number(allocationPct.toFixed(1)),
          tradeCount: val.count,
          winningTrades: val.wins,
          losingTrades: val.losses,
          winRatePct: Number(winRatePct.toFixed(1)),
          tickers: Array.from(val.tickers),
          realizedPnL: Number(val.pnl.toFixed(2)),
          returnOnCapitalPct: Number(returnOnCapitalPct.toFixed(2)),
          color: style.color,
          barColor: style.barColor,
          badgeBg: style.badgeBg,
          riskStance
        });
      });

      return items.sort((a, b) => b.capitalAllocated - a.capitalAllocated);
    };

    const sectorAttribution = buildAttributionGroups(getTradeSector);
    const assetClassAttribution = buildAttributionGroups(getTradeAssetClass);

    // Herfindahl-Hirschman Index (HHI) for concentration
    const sectorHHI = Math.round(sectorAttribution.reduce((acc, g) => acc + Math.pow(g.allocationPct, 2), 0));
    const assetClassHHI = Math.round(assetClassAttribution.reduce((acc, g) => acc + Math.pow(g.allocationPct, 2), 0));

    const getHHIClassification = (hhi: number) => {
      if (hhi < 1500) return { label: 'Diversified', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25' };
      if (hhi < 2500) return { label: 'Moderate Concentration', color: 'text-amber-500 bg-amber-500/10 border-amber-500/25' };
      return { label: 'High Concentration', color: 'text-rose-500 bg-rose-500/10 border-rose-500/25' };
    };

    const overallRoC = totalClosedCapitalUSD > 0 ? (netClosedRealizedUSD / totalClosedCapitalUSD) * 100 : 0;

    return {
      count,
      winningTrades,
      losingTrades,
      breakevenTrades,
      winCount,
      lossCount,
      winLossRatio,
      winRatePct,
      grossGains,
      grossLosses,
      netRealizedPnL,
      avgWin,
      avgLoss,
      payoffRatio,
      profitFactor,
      expectancyDollar,
      avgHoldingDays,
      avgDurationText: formatDuration(avgDurationMs),
      minDurationText: formatDuration(minDurationMs),
      maxDurationText: formatDuration(maxDurationMs),
      annualizedSharpe,
      annualizedSortino,
      sharpeRating,
      sharpeColor,
      equityPoints,
      maxDrawdownDollar,
      maxDrawdownPct,
      bestTrade,
      worstTrade,
      // Risk Attribution
      totalClosedCapitalUSD,
      netClosedRealizedUSD,
      overallRoC: Number(overallRoC.toFixed(2)),
      sectorAttribution,
      assetClassAttribution,
      sectorHHI,
      assetClassHHI,
      sectorHHIStatus: getHHIClassification(sectorHHI),
      assetClassHHIStatus: getHHIClassification(assetClassHHI)
    };
  }, [closedTrades]);

  if (!metrics) {
    return (
      <div className={`p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs flex items-center gap-2 ${className}`}>
        <Info className="w-4 h-4 text-cyan-500 shrink-0" />
        <span>No closed trade history yet. Execute and exit paper positions to unlock Executive Trade Analytics and Risk Attribution.</span>
      </div>
    );
  }

  // Active Attribution Items according to selected tab
  const activeAttributionList = attributionTab === 'SECTOR' ? metrics.sectorAttribution : metrics.assetClassAttribution;
  const activeHHI = attributionTab === 'SECTOR' ? metrics.sectorHHI : metrics.assetClassHHI;
  const activeHHIStatus = attributionTab === 'SECTOR' ? metrics.sectorHHIStatus : metrics.assetClassHHIStatus;

  // Chart dimensions for cumulative closed equity curve
  const svgWidth = 600;
  const svgHeight = 160;
  const padX = 24;
  const padY = 18;

  const minPnL = Math.min(0, ...metrics.equityPoints.map((p) => p.cumulativePnL));
  const maxPnL = Math.max(10, ...metrics.equityPoints.map((p) => p.cumulativePnL));
  const pnlRange = maxPnL - minPnL || 1;

  const getX = (i: number) => padX + (i / Math.max(1, metrics.equityPoints.length - 1)) * (svgWidth - padX * 2);
  const getY = (val: number) => padY + (svgHeight - padY * 2) - ((val - minPnL) / pnlRange) * (svgHeight - padY * 2);
  const zeroY = getY(0);

  const coords = metrics.equityPoints.map((p, i) => ({
    x: getX(i),
    y: getY(p.cumulativePnL),
    data: p
  }));

  const pathD = coords.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, '');

  const areaD = `${pathD} L ${coords[coords.length - 1].x.toFixed(1)} ${svgHeight - 4} L ${coords[0].x.toFixed(1)} ${svgHeight - 4} Z`;

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors ${className}`}>
      {/* 1. Header with Collapsible Toggle and Executive Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/15 to-emerald-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shadow-2xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Executive Trade Summary
              </h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                Closed History Analytics
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quantitative risk-adjusted performance, capital allocation attribution, and duration statistics across {metrics.count} closed round-trip orders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title={isExpanded ? 'Collapse Executive Summary' : 'Expand Executive Summary'}
          >
            <span>{isExpanded ? 'Collapse Summary' : 'Expand Summary'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-5 animate-fadeIn">
          {/* 2. Top 3 Core Required Metrics Cards (Sharpe Ratio, Win/Loss Ratio, Avg Holding Duration) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Metric 1: Sharpe Ratio */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-cyan-500/5 dark:from-slate-950 dark:to-cyan-950/20 border border-slate-200 dark:border-slate-800/90 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-cyan-500" />
                  Sharpe Ratio (Annualized)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/25">
                  Rf = 5.0%
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight ${metrics.sharpeColor}`}>
                  {metrics.annualizedSharpe}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Sortino: <strong className="text-slate-700 dark:text-slate-300">{metrics.annualizedSortino}</strong>
                </span>
              </div>

              <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Rating:</span>
                <span className={`font-semibold ${metrics.sharpeColor}`}>{metrics.sharpeRating}</span>
              </div>
            </div>

            {/* Metric 2: Win / Loss Ratio */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-emerald-500/5 dark:from-slate-950 dark:to-emerald-950/20 border border-slate-200 dark:border-slate-800/90 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  Win / Loss Ratio
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/25">
                  {metrics.winRatePct}% Win Rate
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                  {metrics.winLossRatio}:1
                </span>
                <span className="text-xs font-mono text-slate-400">
                  ({metrics.winCount}W / {metrics.lossCount}L)
                </span>
              </div>

              <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Payoff Ratio (Avg W/L):</span>
                <span className="font-semibold font-mono text-slate-700 dark:text-slate-300">
                  {metrics.payoffRatio}x • PF {metrics.profitFactor}
                </span>
              </div>
            </div>

            {/* Metric 3: Average Holding Duration */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-indigo-500/5 dark:from-slate-950 dark:to-indigo-950/20 border border-slate-200 dark:border-slate-800/90 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  Average Holding Duration
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-500/25">
                  {metrics.avgHoldingDays.toFixed(1)} Days Mean
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums tracking-tight">
                  {metrics.avgDurationText}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  avg in-market
                </span>
              </div>

              <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Horizon Span:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  Min {metrics.minDurationText} • Max {metrics.maxDurationText}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Secondary Quantitative Matrix (Net Realized, Expectancy, Max Drawdown) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                  Net Realized Gain
                </span>
                <span className={`text-base font-bold font-mono ${metrics.netRealizedPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {metrics.netRealizedPnL >= 0 ? '+' : ''}${metrics.netRealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <DollarSign className={`w-4 h-4 ${metrics.netRealizedPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                  Expectancy per Trade
                </span>
                <span className={`text-base font-bold font-mono ${metrics.expectancyDollar >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {metrics.expectancyDollar >= 0 ? '+' : ''}${metrics.expectancyDollar.toFixed(2)}
                </span>
              </div>
              <Activity className="w-4 h-4 text-cyan-500" />
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                  Max Closed Drawdown
                </span>
                <span className="text-base font-bold font-mono text-rose-500">
                  ${metrics.maxDrawdownDollar.toFixed(2)} ({metrics.maxDrawdownPct.toFixed(1)}%)
                </span>
              </div>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
          </div>

          {/* 4. Closed Equity Curve & Outlier Highlights (2 Columns on Desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            {/* SVG Cumulative Closed Equity Curve (2 Cols) */}
            <div className="lg:col-span-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    Cumulative Closed PnL Trajectory
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {metrics.equityPoints.length - 1} round-trips
                </span>
              </div>

              {/* Chart SVG */}
              <div className="relative w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-36 select-none"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="execEquityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  <line
                    x1={padX}
                    y1={zeroY}
                    x2={svgWidth - padX}
                    y2={zeroY}
                    stroke="#64748b"
                    strokeWidth="0.8"
                    strokeDasharray="3 3"
                    opacity="0.4"
                  />
                  <text
                    x={padX + 2}
                    y={zeroY - 3}
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    $0 Breakeven
                  </text>

                  {/* Area fill */}
                  <path d={areaD} fill="url(#execEquityGrad)" />

                  {/* Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data points */}
                  {coords.map((pt, i) => (
                    <g key={i}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={activeTooltipIndex === i ? 5 : 3.5}
                        fill={i === 0 ? '#94a3b8' : pt.data.deltaPnL >= 0 ? '#10b981' : '#f43f5e'}
                        stroke="#0f172a"
                        strokeWidth="1.5"
                        className="cursor-pointer transition-all"
                        onMouseEnter={() => setActiveTooltipIndex(i)}
                        onMouseLeave={() => setActiveTooltipIndex(null)}
                      />
                    </g>
                  ))}
                </svg>

                {/* Active Hover Point Tooltip */}
                {activeTooltipIndex !== null && coords[activeTooltipIndex] && (
                  <div className="absolute top-2 right-2 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-mono border border-slate-700 shadow-xl pointer-events-none animate-fadeIn">
                    <span className="font-bold text-cyan-400 block">
                      {coords[activeTooltipIndex].data.ticker}
                    </span>
                    <span>
                      Cumulative PnL: ${coords[activeTooltipIndex].data.cumulativePnL.toFixed(2)}
                    </span>
                    {coords[activeTooltipIndex].data.deltaPnL !== 0 && (
                      <span className={`block ${coords[activeTooltipIndex].data.deltaPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Trade PnL: {coords[activeTooltipIndex].data.deltaPnL >= 0 ? '+' : ''}${coords[activeTooltipIndex].data.deltaPnL.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Chart Legend */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-200/50 dark:border-slate-800/60 pt-2">
                <span>Inception: {new Date(closedTrades[0]?.entryDate).toLocaleDateString()}</span>
                <span>Latest Exit: {new Date(closedTrades[closedTrades.length - 1]?.exitDate || '').toLocaleDateString()}</span>
              </div>
            </div>

            {/* Best & Worst Trades Highlight Box (1 Col) */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Trade Outlier Highlights
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Best performing win vs maximum adverse loss.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                {/* Best Closed Trade */}
                {metrics.bestTrade && (
                  <div className="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 font-bold uppercase flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                        Best Winner
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectTicker?.(metrics.bestTrade.ticker)}
                        className="font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer font-mono"
                      >
                        {metrics.bestTrade.ticker}
                      </button>
                    </div>
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                        +${(metrics.bestTrade.realizedPnL || 0).toFixed(2)}
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        +{(metrics.bestTrade.realizedPnLPercent || 0).toFixed(2)}%
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 block truncate">
                      {metrics.bestTrade.notes || metrics.bestTrade.companyName}
                    </span>
                  </div>
                )}

                {/* Worst Closed Trade */}
                {metrics.worstTrade && (
                  <div className="p-2.5 rounded-lg bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-rose-800 dark:text-rose-300 font-bold uppercase flex items-center gap-1">
                        <ArrowDownRight className="w-3 h-3 text-rose-600" />
                        Largest Loss
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectTicker?.(metrics.worstTrade.ticker)}
                        className="font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer font-mono"
                      >
                        {metrics.worstTrade.ticker}
                      </button>
                    </div>
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-rose-700 dark:text-rose-300">
                        ${(metrics.worstTrade.realizedPnL || 0).toFixed(2)}
                      </span>
                      <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                        {(metrics.worstTrade.realizedPnLPercent || 0).toFixed(2)}%
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 block truncate">
                      {metrics.worstTrade.notes || metrics.worstTrade.companyName}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800/60 flex justify-between">
                <span>Total Closed Orders:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{metrics.count}</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. RISK ATTRIBUTION BREAKDOWN (SECTORS & ASSET CLASSES)                  */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            {/* Risk Attribution Header & Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    Risk Attribution & Capital Allocation
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-500/20">
                    Closed Portfolio
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calculates the percentage of total deployed capital ($) and realized return efficiency across distinct market sectors and asset classes.
                </p>
              </div>

              {/* Segmented Mode Switcher */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shrink-0 self-start sm:self-auto text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAttributionTab('SECTOR')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    attributionTab === 'SECTOR'
                      ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 shadow-xs border border-slate-200 dark:border-slate-700 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>By Sector ({metrics.sectorAttribution.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAttributionTab('ASSET_CLASS')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    attributionTab === 'ASSET_CLASS'
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200 dark:border-slate-700 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>By Asset Class ({metrics.assetClassAttribution.length})</span>
                </button>
              </div>
            </div>

            {/* Quick Executive Attribution Telemetry Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/70 space-y-0.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
                  Total Closed Capital
                </span>
                <span className="text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                  ${metrics.totalClosedCapitalUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  Cumulative entry notional
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/70 space-y-0.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
                  Top Risk Concentration
                </span>
                <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 truncate block">
                  {activeAttributionList[0]?.name || 'N/A'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  {activeAttributionList[0]?.allocationPct || 0}% of closed capital
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/70 space-y-0.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
                  HHI Concentration Index
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                    {activeHHI}
                  </span>
                  <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border ${activeHHIStatus.color}`}>
                    {activeHHIStatus.label}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono block">
                  Herfindahl-Hirschman scale
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/70 space-y-0.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
                  Closed Capital RoC
                </span>
                <span className={`text-base font-bold font-mono ${metrics.overallRoC >= 0 ? 'text-emerald-500' : 'text-rose-500'} tabular-nums`}>
                  {metrics.overallRoC >= 0 ? '+' : ''}{metrics.overallRoC}%
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  {metrics.netClosedRealizedUSD >= 0 ? '+' : ''}${metrics.netClosedRealizedUSD.toFixed(2)} USD net realized
                </span>
              </div>
            </div>

            {/* Visual Proportional Allocation Spectrum Bar */}
            <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-mono">
                  <Target className="w-3.5 h-3.5 text-cyan-500" />
                  Capital Allocation Spectrum (100% Total Deployed)
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Hover segments for details
                </span>
              </div>

              {/* Multi-segment distribution bar */}
              <div className="h-6 w-full rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden flex p-0.5 gap-0.5 shadow-inner">
                {activeAttributionList.map((item) => (
                  <div
                    key={item.id}
                    style={{ width: `${Math.max(4, item.allocationPct)}%`, backgroundColor: item.color }}
                    className={`h-full rounded-md transition-all cursor-pointer relative group flex items-center justify-center ${
                      activeAttributionHover === item.id ? 'ring-2 ring-white dark:ring-slate-300 scale-[1.02] z-10' : 'opacity-95 hover:opacity-100'
                    }`}
                    onMouseEnter={() => setActiveAttributionHover(item.id)}
                    onMouseLeave={() => setActiveAttributionHover(null)}
                    title={`${item.name}: ${item.allocationPct}% ($${item.capitalAllocated.toLocaleString()})`}
                  >
                    {item.allocationPct >= 12 && (
                      <span className="text-[10px] font-mono font-bold text-slate-950 px-1 truncate pointer-events-none drop-shadow-xs">
                        {item.allocationPct}%
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Dynamic Legend and Quick Hover Feedback */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                {activeAttributionList.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setActiveAttributionHover(item.id)}
                    onMouseLeave={() => setActiveAttributionHover(null)}
                    className={`px-2 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeAttributionHover === item.id
                        ? 'bg-slate-200 dark:bg-slate-800 border-slate-400 text-slate-900 dark:text-white'
                        : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold">{item.name}:</span>
                    <span className="font-bold tabular-nums">{item.allocationPct}%</span>
                    <span className="text-[10px] text-slate-400">(${item.capitalAllocated.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Allocation Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {activeAttributionList.map((item) => {
                const isHovered = activeAttributionHover === item.id;
                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setActiveAttributionHover(item.id)}
                    onMouseLeave={() => setActiveAttributionHover(null)}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      isHovered
                        ? 'bg-slate-50 dark:bg-slate-950 border-cyan-500 shadow-md ring-1 ring-cyan-500/30'
                        : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-2xs'
                    }`}
                  >
                    {/* Header: Name, Allocation %, and Stance Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-sm shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                            {item.name}
                          </h5>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          <span>{item.tradeCount} trade{item.tradeCount > 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>{item.winRatePct}% Win Rate</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                          {item.allocationPct}%
                        </span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                          item.riskStance === 'Heavy Exposure'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                            : item.riskStance === 'Core Weight'
                            ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25'
                            : item.riskStance === 'Moderate'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25'
                        }`}>
                          {item.riskStance}
                        </span>
                      </div>
                    </div>

                    {/* Proportional Progress Track */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.allocationPct}%`,
                            backgroundColor: item.color
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Allocated: ${item.capitalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span>{item.allocationPct}% of closed pool</span>
                      </div>
                    </div>

                    {/* Financial Performance of this Allocation */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/70 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">Realized Return</span>
                        <span className={`font-mono font-bold ${item.realizedPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {item.realizedPnL >= 0 ? '+' : ''}${item.realizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-[10px] ml-1 font-normal opacity-85">
                            ({item.realizedPnL >= 0 ? '+' : ''}{item.returnOnCapitalPct}%)
                          </span>
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">Execution Matrix</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                          {item.winningTrades}W / {item.losingTrades}L
                        </span>
                      </div>
                    </div>

                    {/* Associated Tickers Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px] font-mono">
                      <span className="text-slate-400 text-[9px] uppercase">Symbols:</span>
                      {item.tickers.map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => onSelectTicker?.(sym)}
                          className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-600 dark:text-cyan-400 font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                          title={`Click to view ${sym}`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Institutional Risk Commentary Banner */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
                <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Executive Risk Assessment & Allocation Takeaway</span>
              </div>
              <p className="text-[11px] text-indigo-800/90 dark:text-indigo-300/90 leading-relaxed">
                Total closed capital was allocated across {activeAttributionList.length} distinct {attributionTab === 'SECTOR' ? 'industry sectors' : 'asset classes'}.
                The top exposure represents <strong className="font-mono text-indigo-900 dark:text-white">{activeAttributionList[0]?.allocationPct}%</strong> of total deployed capital in <strong className="font-mono text-indigo-900 dark:text-white">{activeAttributionList[0]?.name}</strong>.
                {activeHHI > 2500
                  ? ' High concentration detected — portfolio capital is sensitive to sector-specific policy, macroeconomic, or supply-chain headwinds. Consider setting a maximum 30% single-sector allocation threshold for future orders.'
                  : ' Capital allocation is diversified across uncorrelated assets, preserving portfolio resilience against localized market drawdowns.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
