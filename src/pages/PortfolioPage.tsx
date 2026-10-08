/**
 * AlphaQuant AI - User Portfolio Management & Mean-Variance Optimization Page
 * Features real-time mark-to-market positions, P&L tracking, position ledger,
 * and an institutional Markowitz Mean-Variance Optimization (MVO) Rebalance Suggester
 * with Efficient Frontier charting, asset correlation heatmap, and one-click rebalance execution.
 * Fully compatible with dark and light themes.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  X,
  Scale,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  PieChart,
  ShieldCheck,
  Check,
  Zap,
  Info,
  Sliders,
  Download,
  Copy,
  DollarSign,
  Layers,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { PortfolioHolding, PortfolioOptimizationResult, RebalanceSuggestion } from '../types';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface Props {
  onSelectTicker: (ticker: string) => void;
  initialTickerToAdd?: string;
}

export const PortfolioPage: React.FC<Props> = ({ onSelectTicker, initialTickerToAdd }) => {
  const [activeTab, setActiveTab] = useState<'holdings' | 'optimizer'>('holdings');
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Mean-Variance Optimization State
  const [optObjective, setOptObjective] = useState<'max_sharpe' | 'min_volatility' | 'equal_weight'>('max_sharpe');
  const [riskFreeRatePct, setRiskFreeRatePct] = useState<number>(5.0);
  const [maxWeightCapPct, setMaxWeightCapPct] = useState<number>(50);
  const [minWeightFloorPct, setMinWeightFloorPct] = useState<number>(4);
  const [showAdvSettings, setShowAdvSettings] = useState(false);
  const [showMvoInLedger, setShowMvoInLedger] = useState(true);

  const [optResult, setOptResult] = useState<PortfolioOptimizationResult | null>(null);
  const [optLoading, setOptLoading] = useState(false);
  const [rebalanceApplying, setRebalanceApplying] = useState(false);
  const [rebalanceSuccessMessage, setRebalanceSuccessMessage] = useState<string | null>(null);
  const [copiedManifest, setCopiedManifest] = useState(false);

  // Cash Inflow Simulation State
  const [freshCashInput, setFreshCashInput] = useState<string>('');

  // Form State
  const [tickerInput, setTickerInput] = useState(initialTickerToAdd || '');
  const [qtyInput, setQtyInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const data = await api.getPortfolio();
      setHoldings(data);
      if (data && data.length > 0) {
        // Run optimization eagerly so advice is available on both tabs
        triggerOptimization(optObjective, data, riskFreeRatePct / 100, maxWeightCapPct / 100, minWeightFloorPct / 100);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  useEffect(() => {
    if (initialTickerToAdd) {
      setTickerInput(initialTickerToAdd);
      setShowAddModal(true);
    }
  }, [initialTickerToAdd]);

  const triggerOptimization = async (
    obj = optObjective,
    currentHoldings = holdings,
    rf = riskFreeRatePct / 100,
    cap = maxWeightCapPct / 100,
    floor = minWeightFloorPct / 100
  ) => {
    if (currentHoldings.length === 0) return;
    setOptLoading(true);
    try {
      const result = await api.optimizePortfolio(obj, currentHoldings, {
        riskFreeRate: rf,
        maxWeightCap: cap,
        minWeightFloor: floor
      });
      setOptResult(result);
    } catch (err) {
      console.error('Optimization error:', err);
    } finally {
      setOptLoading(false);
    }
  };

  const handleObjectiveChange = (newObj: 'max_sharpe' | 'min_volatility' | 'equal_weight') => {
    setOptObjective(newObj);
    triggerOptimization(newObj);
  };

  const handleApplyAdvancedConstraints = () => {
    triggerOptimization(optObjective, holdings, riskFreeRatePct / 100, maxWeightCapPct / 100, minWeightFloorPct / 100);
  };

  const handleApplyRebalance = async () => {
    if (!optResult || !optResult.suggestions || optResult.suggestions.length === 0) return;
    setRebalanceApplying(true);
    setShowConfirmModal(false);
    try {
      const res = await api.applyRebalance(optResult.suggestions);
      setHoldings(res.holdings);
      setRebalanceSuccessMessage(res.message || 'Portfolio rebalanced to optimal weights.');
      // Refresh optimization with updated holdings
      const refreshedOpt = await api.optimizePortfolio(optObjective, res.holdings, {
        riskFreeRate: riskFreeRatePct / 100,
        maxWeightCap: maxWeightCapPct / 100,
        minWeightFloor: minWeightFloorPct / 100
      });
      setOptResult(refreshedOpt);
      setTimeout(() => setRebalanceSuccessMessage(null), 6000);
    } catch (err) {
      console.error(err);
    } finally {
      setRebalanceApplying(false);
    }
  };

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tickerInput || !qtyInput || !priceInput) return;

    try {
      await api.addHolding({
        ticker: tickerInput.toUpperCase(),
        quantity: parseFloat(qtyInput),
        avgBuyPrice: parseFloat(priceInput),
        notes: notesInput
      });
      setShowAddModal(false);
      setTickerInput('');
      setQtyInput('');
      setPriceInput('');
      setNotesInput('');
      loadPortfolio();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteHolding = async (id: string) => {
    try {
      await api.deleteHolding(id);
      loadPortfolio();
    } catch (err) {
      console.error(err);
    }
  };

  // Calculations
  const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // Copy Trade Orders to Clipboard
  const handleCopyManifest = () => {
    if (!optResult?.suggestions) return;
    const textLines = [
      `AlphaQuant AI - Rebalance Manifest (${new Date().toLocaleDateString()})`,
      `Strategy Objective: ${optObjective.toUpperCase().replace('_', ' ')}`,
      `Portfolio Value: ₹${totalValue.toLocaleString()}`,
      `----------------------------------------`,
      ...optResult.suggestions.map(s =>
        `${s.action}: ${s.ticker} | Delta Shares: ${s.quantityDelta >= 0 ? '+' : ''}${s.quantityDelta} | Capital: ₹${Math.abs(s.valueDelta).toLocaleString()} | Target Weight: ${s.optimalWeightPct}%`
      )
    ];
    navigator.clipboard.writeText(textLines.join('\n'));
    setCopiedManifest(true);
    setTimeout(() => setCopiedManifest(false), 3000);
  };

  // Export CSV Manifest
  const handleExportCSV = () => {
    if (!optResult?.suggestions) return;
    const headers = ['Ticker', 'Action', 'CurrentQty', 'TargetQty', 'DeltaQty', 'CurrentWeightPct', 'OptimalWeightPct', 'CurrentPrice', 'ValueDelta'];
    const rows = optResult.suggestions.map(s => [
      s.ticker,
      s.action,
      s.currentQuantity,
      s.targetQuantity,
      s.quantityDelta,
      s.currentWeightPct,
      s.optimalWeightPct,
      s.currentPrice,
      s.valueDelta
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `alphaquant_rebalance_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Rebalance trade counts
  const buyTrades = useMemo(() => optResult?.suggestions.filter(s => s.action === 'BUY') || [], [optResult]);
  const sellTrades = useMemo(() => optResult?.suggestions.filter(s => s.action === 'SELL') || [], [optResult]);
  const alignedHoldings = useMemo(() => optResult?.suggestions.filter(s => s.action === 'HOLD') || [], [optResult]);

  // Cash Inflow Simulation calculation
  const freshCashVal = parseFloat(freshCashInput) || 0;
  const simulatedCashAllocations = useMemo(() => {
    if (!optResult || freshCashVal <= 0) return [];
    return optResult.suggestions.map(s => {
      const allocatedCash = (freshCashVal * (s.optimalWeightPct / 100));
      const addShares = Math.floor(allocatedCash / (s.currentPrice || 1));
      return {
        ticker: s.ticker,
        allocatedCash: Math.round(allocatedCash),
        addShares,
        currentPrice: s.currentPrice
      };
    });
  }, [optResult, freshCashVal]);

  return (
    <div className="space-y-6">
      {/* Portfolio Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            My Portfolio Intelligence & Allocation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time mark-to-market valuation, P&L tracking, and Markowitz Mean-Variance Rebalancing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-Tab Navigation Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('holdings')}
              className={`px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'holdings'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Holdings Ledger</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('optimizer');
                if (holdings.length > 0 && !optResult) {
                  triggerOptimization(optObjective);
                }
              }}
              className={`px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'optimizer'
                  ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Mean-Variance Rebalance</span>
              <span className="text-[10px] bg-cyan-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">
                MVO
              </span>
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Position</span>
          </button>
        </div>
      </div>

      {/* Portfolio Snapshot KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 block">Total Invested</span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block tabular-nums">
            ₹{totalInvested.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block font-mono">Cost Basis</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 block">Current Portfolio Value</span>
          <span className="text-xl font-bold font-mono text-cyan-700 dark:text-cyan-300 mt-1 block tabular-nums">
            ₹{totalValue.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block font-mono">Real-Time Quotes</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 block">Total Profit / Loss</span>
          <span
            className={`text-xl font-bold font-mono mt-1 block tabular-nums flex items-center gap-1 ${
              totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {totalPnl >= 0 ? '+' : ''}₹{Math.abs(totalPnl).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block font-mono">Unrealized P&L</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 block">Return on Investment</span>
          <span
            className={`text-xl font-bold font-mono mt-1 block tabular-nums flex items-center gap-1 ${
              totalPnlPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {totalPnlPct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block font-mono">{holdings.length} Active Positions</span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {rebalanceSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs flex items-center justify-between text-emerald-800 dark:text-emerald-200 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">{rebalanceSuccessMessage}</span>
          </div>
          <span className="font-mono text-[10px]">Optimal Rebalance Confirmed</span>
        </div>
      )}

      {/* PROMINENT MVO ADVISORY BANNER - Visible on both tabs when optimization suggests trades */}
      {optResult && (buyTrades.length > 0 || sellTrades.length > 0) && (
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-cyan-950/30 via-slate-900/60 to-emerald-950/30 border border-cyan-500/30 dark:border-cyan-500/20 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-500 text-slate-950">
                AI MVO ADVISORY
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Markowitz Rebalance Opportunity: +{optResult.optimalMetrics.sharpeGainPct}% Sharpe Efficiency Gain
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Current Sharpe is <strong className="font-mono text-slate-900 dark:text-white">{optResult.currentMetrics.sharpeRatio}</strong>. Rebalancing to the Tangency Portfolio can elevate Sharpe to <strong className="font-mono text-emerald-600 dark:text-emerald-400">{optResult.optimalMetrics.sharpeRatio}</strong> and cut variance risk by <strong className="font-mono text-cyan-600 dark:text-cyan-400">{optResult.optimalMetrics.volatilityReductionPct}%</strong> with {buyTrades.length} buy and {sellTrades.length} sell orders.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
            {activeTab === 'holdings' ? (
              <button
                onClick={() => setActiveTab('optimizer')}
                className="w-full md:w-auto px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Review & Rebalance ({buyTrades.length + sellTrades.length} orders)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={rebalanceApplying}
                className="w-full md:w-auto px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Execute Rebalance Trades</span>
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'holdings' ? (
        /* TAB 1: STANDARD HOLDINGS LEDGER */
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm dark:shadow-lg transition-colors">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Holdings & Mark-to-Market Ledger</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{holdings.length} Positions</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Toggle to show/hide MVO Target Weights directly in table */}
              {optResult && (
                <button
                  onClick={() => setShowMvoInLedger(!showMvoInLedger)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Toggle Mean-Variance Target Weights & Deltas in table"
                >
                  {showMvoInLedger ? <Eye className="w-3.5 h-3.5 text-cyan-500" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{showMvoInLedger ? 'Hide MVO Targets' : 'Show MVO Targets'}</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('optimizer')}
                className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <span>Full MVO Optimizer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                  <th className="py-3 px-4 font-medium">Asset / Company</th>
                  <th className="py-3 px-4 font-medium text-right">Quantity</th>
                  <th className="py-3 px-4 font-medium text-right">Avg Price</th>
                  <th className="py-3 px-4 font-medium text-right">Current Price</th>
                  <th className="py-3 px-4 font-medium text-right">Total Value</th>
                  <th className="py-3 px-4 font-medium text-right">Current Weight</th>
                  {showMvoInLedger && optResult && (
                    <>
                      <th className="py-3 px-4 font-medium text-right text-cyan-600 dark:text-cyan-400">Target Weight (MVO)</th>
                      <th className="py-3 px-4 font-medium text-center text-cyan-600 dark:text-cyan-400">Rebalance Suggestion</th>
                    </>
                  )}
                  <th className="py-3 px-4 font-medium text-right">P&L</th>
                  <th className="py-3 px-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {holdings.length === 0 ? (
                  <tr>
                    <td colSpan={showMvoInLedger ? 10 : 8} className="py-8 text-center text-slate-500 font-sans">
                      No holdings recorded yet. Click "Add Position" above to track your portfolio.
                    </td>
                  </tr>
                ) : (
                  holdings.map(h => {
                    const isUp = h.pnl >= 0;
                    const weightPct = totalValue > 0 ? ((h.currentValue / totalValue) * 100).toFixed(1) : '0.0';
                    const sug = optResult?.suggestions.find(s => s.ticker === h.ticker);

                    return (
                      <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/70 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => onSelectTicker(h.ticker)}
                            className="text-left font-sans font-bold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer block"
                          >
                            {h.ticker}
                          </button>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans block truncate max-w-[160px]">
                            {h.companyName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-200 tabular-nums">
                          {h.quantity}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                          ₹{h.avgBuyPrice.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-cyan-700 dark:text-cyan-300 font-semibold tabular-nums">
                          ₹{h.currentPrice.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-bold tabular-nums">
                          ₹{h.currentValue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                          {weightPct}%
                        </td>

                        {showMvoInLedger && optResult && (
                          <>
                            <td className="py-3 px-4 text-right font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
                              {sug?.optimalWeightPct ?? weightPct}%
                            </td>
                            <td className="py-3 px-4 text-center">
                              {sug?.action === 'BUY' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 inline-flex items-center gap-1">
                                  <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>Buy +{sug.quantityDelta} shares</span>
                                </span>
                              )}
                              {sug?.action === 'SELL' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/80 inline-flex items-center gap-1">
                                  <ArrowDownRight className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                  <span>Trim {sug.quantityDelta} shares</span>
                                </span>
                              )}
                              {sug?.action === 'HOLD' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
                                  <Check className="w-3 h-3 text-slate-400" />
                                  <span>Optimal (Hold)</span>
                                </span>
                              )}
                            </td>
                          </>
                        )}

                        <td className="py-3 px-4 text-right tabular-nums">
                          <span className={`font-semibold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isUp ? '+' : ''}₹{h.pnl.toLocaleString()} ({isUp ? '+' : ''}{h.pnlPercent}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDeleteHolding(h.id)}
                            title="Remove Holding"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 2: MEAN-VARIANCE OPTIMIZATION & REBALANCING */
        <div className="space-y-6">
          {/* MVO Objective Selector and Controls */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 text-cyan-700 dark:text-cyan-400">
                    <Scale className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                    Markowitz Mean-Variance Allocation Optimizer
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Solves for mathematically optimal asset weights across the efficient frontier to maximize risk-adjusted returns (Sharpe ratio) or minimize portfolio variance.
                </p>
              </div>

              {/* Actions & Objectives */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Objective Selector */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                  {[
                    { id: 'max_sharpe', label: 'Maximum Sharpe (Tangency)' },
                    { id: 'min_volatility', label: 'Minimum Volatility (Safe)' },
                    { id: 'equal_weight', label: 'Equal Weight (1/N)' }
                  ].map(obj => (
                    <button
                      key={obj.id}
                      onClick={() => handleObjectiveChange(obj.id as any)}
                      className={`px-3 py-1.5 rounded transition-colors cursor-pointer font-medium ${
                        optObjective === obj.id
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {obj.label}
                    </button>
                  ))}
                </div>

                {/* Advanced Constraints Toggle */}
                <button
                  onClick={() => setShowAdvSettings(!showAdvSettings)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition-colors ${
                    showAdvSettings
                      ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Adjust Risk-Free Benchmark Rate and Allocation Bounds"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Constraints</span>
                </button>

                <button
                  onClick={() => triggerOptimization()}
                  disabled={optLoading}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${optLoading ? 'animate-spin' : ''}`} />
                  <span>Recalculate</span>
                </button>

                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={rebalanceApplying || !optResult || (buyTrades.length === 0 && sellTrades.length === 0)}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{rebalanceApplying ? 'Applying Trades...' : 'Apply Rebalancing'}</span>
                </button>
              </div>
            </div>

            {/* Advanced Constraints Drawer */}
            {showAdvSettings && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-500" />
                    Portfolio Optimization Constraints & Benchmarks
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">Modern Portfolio Theory Parameters</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-slate-600 dark:text-slate-400">Risk-Free Benchmark Rate (Rf)</label>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">{riskFreeRatePct}%</span>
                    </div>
                    <input
                      type="range"
                      min="2.0"
                      max="8.0"
                      step="0.5"
                      value={riskFreeRatePct}
                      onChange={e => setRiskFreeRatePct(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                    <span className="text-[10px] text-slate-400 font-sans block">Benchmark 10-Yr Sovereign Yield</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-slate-600 dark:text-slate-400">Max Single-Asset Cap</label>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">{maxWeightCapPct}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="70"
                      step="5"
                      value={maxWeightCapPct}
                      onChange={e => setMaxWeightCapPct(parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-500"
                    />
                    <span className="text-[10px] text-slate-400 font-sans block">Prevents single-asset concentration</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-slate-600 dark:text-slate-400">Min Single-Asset Floor</label>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">{minWeightFloorPct}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={minWeightFloorPct}
                      onChange={e => setMinWeightFloorPct(parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-500"
                    />
                    <span className="text-[10px] text-slate-400 font-sans block">Guarantees portfolio diversification</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleApplyAdvancedConstraints}
                    className="px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 cursor-pointer"
                  >
                    Apply Constraints & Re-Solve
                  </button>
                </div>
              </div>
            )}

            {/* Before vs After Metric Comparison Strip */}
            {optResult && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 font-mono">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] uppercase text-slate-400 block">Expected Annual Return</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-sm font-semibold text-slate-500 line-through">
                      {optResult.currentMetrics.expectedReturnAnnualPct}%
                    </span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {optResult.optimalMetrics.expectedReturnAnnualPct}%
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {optResult.optimalMetrics.expectedReturnDeltaPct >= 0 ? '+' : ''}{optResult.optimalMetrics.expectedReturnDeltaPct}% Delta
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] uppercase text-slate-400 block">Annualized Volatility (Risk)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-sm font-semibold text-slate-500 line-through">
                      {optResult.currentMetrics.volatilityAnnualPct}%
                    </span>
                    <span className="text-base font-bold text-cyan-600 dark:text-cyan-400">
                      {optResult.optimalMetrics.volatilityAnnualPct}%
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 mt-0.5 block">
                    {optResult.optimalMetrics.volatilityReductionPct > 0 ? `-${optResult.optimalMetrics.volatilityReductionPct}% Variance Reduction` : 'Target Risk Aligned'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] uppercase text-slate-400 block">Portfolio Sharpe Ratio (Rf: {riskFreeRatePct}%)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-sm font-semibold text-slate-500 line-through">
                      {optResult.currentMetrics.sharpeRatio}
                    </span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {optResult.optimalMetrics.sharpeRatio}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    +{optResult.optimalMetrics.sharpeGainPct}% Efficiency Gain
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] uppercase text-slate-400 block">Diversification Ratio</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {optResult.currentMetrics.diversificationRatio}x
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Asset Co-Movement Factor
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Allocation Comparison & Rebalance Suggestions Table */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm dark:shadow-lg">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Suggested Stock Allocations & Rebalance Orders
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Exact share trade orders to achieve optimal target weights
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyManifest}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Copy orders to clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedManifest ? 'Copied Orders!' : 'Copy Orders'}</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Download CSV for broker import"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <span className="text-xs font-mono text-slate-500 ml-2">
                  Total Value: ₹{totalValue.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                    <th className="py-3 px-4 font-sans font-medium">Asset</th>
                    <th className="py-3 px-4 font-medium text-right">Current Weight</th>
                    <th className="py-3 px-4 font-medium text-right text-cyan-600 dark:text-cyan-400">Optimal Weight</th>
                    <th className="py-3 px-4 font-medium text-right">Current Value</th>
                    <th className="py-3 px-4 font-medium text-right">Target Value</th>
                    <th className="py-3 px-4 font-medium text-right">Capital Delta (₹)</th>
                    <th className="py-3 px-4 font-medium text-right">Share Delta</th>
                    <th className="py-3 px-4 font-medium text-center">Suggested Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {optResult?.suggestions.map(s => {
                    const isBuy = s.action === 'BUY';
                    const isSell = s.action === 'SELL';

                    return (
                      <tr key={s.ticker} className="hover:bg-slate-50 dark:hover:bg-slate-900/70 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => onSelectTicker(s.ticker)}
                            className="font-sans font-bold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer block text-left"
                          >
                            {s.ticker}
                          </button>
                          <span className="text-[10px] text-slate-500 font-sans block truncate max-w-[150px]">
                            {s.companyName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                          {s.currentWeightPct}%
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-cyan-600 dark:text-cyan-300 tabular-nums">
                          {s.optimalWeightPct}%
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                          ₹{s.currentValue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-semibold tabular-nums">
                          ₹{s.targetValue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          <span className={s.valueDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                            {s.valueDelta >= 0 ? '+' : ''}₹{s.valueDelta.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums">
                          <span className={s.quantityDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : s.quantityDelta < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}>
                            {s.quantityDelta > 0 ? `+${s.quantityDelta}` : s.quantityDelta} shares
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isBuy && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-sans font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 inline-flex items-center gap-1">
                              <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>{s.actionLabel}</span>
                            </span>
                          )}
                          {isSell && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-sans font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/80 inline-flex items-center gap-1">
                              <ArrowDownRight className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                              <span>{s.actionLabel}</span>
                            </span>
                          )}
                          {!isBuy && !isSell && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-sans font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
                              <Check className="w-3 h-3 text-slate-400" />
                              <span>Aligned (Hold)</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fresh Cash Contribution Rebalancing Simulator */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  Cash Inflow Rebalancing Simulator (Rebalance Without Selling)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Want to avoid selling shares and triggering capital gains tax? Enter cash you plan to invest, and see how to allocate it directly toward optimal weights.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">₹</span>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={freshCashInput}
                    onChange={e => setFreshCashInput(e.target.value)}
                    className="w-40 pl-7 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {simulatedCashAllocations.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                {simulatedCashAllocations.map(item => (
                  <div key={item.ticker} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 font-mono text-xs">
                    <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white">
                      <span>{item.ticker}</span>
                      <span className="text-emerald-600 dark:text-emerald-400">+₹{item.allocatedCash.toLocaleString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                      <span>Add Shares:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">+{item.addShares} shares</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Allocation Weights Visual Bar Breakdown & Frontier */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visual Allocation Weight Shift Chart */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Allocation Weight Shift (Current vs. Optimal)
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Visual percentage reallocation breakdown
                  </span>
                </div>
                <span className="text-xs text-cyan-600 dark:text-cyan-400 font-mono">
                  {optObjective === 'max_sharpe' ? 'Max Sharpe' : optObjective === 'min_volatility' ? 'Min Volatility' : 'Equal Weight'}
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {optResult?.suggestions.map(s => (
                  <div key={s.ticker} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900 dark:text-white font-sans">{s.ticker} ({s.companyName})</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">Current: {s.currentWeightPct}%</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="text-cyan-600 dark:text-cyan-400 font-bold text-xs">Optimal: {s.optimalWeightPct}%</span>
                      </div>
                    </div>
                    {/* Visual Comparison Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 relative overflow-hidden flex">
                      <div
                        className="bg-slate-400 dark:bg-slate-600 h-2 transition-all"
                        style={{ width: `${s.currentWeightPct}%` }}
                        title={`Current: ${s.currentWeightPct}%`}
                      />
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 relative overflow-hidden flex">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-2 transition-all"
                        style={{ width: `${s.optimalWeightPct}%` }}
                        title={`Optimal: ${s.optimalWeightPct}%`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Markowitz Efficient Frontier Plot */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Markowitz Efficient Frontier Curve
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Annual Volatility Risk (%) vs. Expected Return (%)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Current
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Optimal
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={optResult?.efficientFrontier || []}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.4} />
                    <XAxis
                      dataKey="volatilityPct"
                      type="number"
                      domain={['auto', 'auto']}
                      unit="%"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="expectedReturnPct"
                      type="number"
                      domain={['auto', 'auto']}
                      unit="%"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val}%`, name === 'expectedReturnPct' ? 'Exp. Return' : 'Volatility']}
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expectedReturnPct"
                      name="Efficient Frontier"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Scatter
                      dataKey="expectedReturnPct"
                      name="Portfolio Coordinates"
                      fill="#10b981"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                💡 <strong>Modern Portfolio Theory:</strong> Portfolios on the upper boundary of the frontier curve represent the maximum possible expected return for any given volatility tolerance. Rebalancing moves your holdings from suboptimal internal variance closer to the theoretical frontier tangency point.
              </div>
            </div>
          </div>

          {/* Cross-Asset Correlation Heatmap Matrix */}
          {optResult?.correlationMatrix && optResult.correlationMatrix.tickers.length > 1 && (
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-500" />
                    Asset Correlation & Covariance Heatmap
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Pairwise Pearson correlation matrix (R) driving mean-variance diversification
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Low Corr (&lt; 0.3)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Mod Corr (0.3 - 0.7)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" /> High Corr (&gt; 0.7)
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs font-mono">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-slate-400 uppercase text-[10px]">Asset</th>
                      {optResult.correlationMatrix.tickers.map(t => (
                        <th key={t} className="p-2 text-slate-600 dark:text-slate-300 font-bold">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {optResult.correlationMatrix.tickers.map((rowTicker, rowIdx) => (
                      <tr key={rowTicker} className="border-t border-slate-100 dark:border-slate-800/60">
                        <td className="p-2 text-left font-bold text-slate-900 dark:text-white font-sans">
                          {rowTicker}
                        </td>
                        {optResult.correlationMatrix.matrix[rowIdx]?.map((corrVal, colIdx) => {
                          const isDiag = rowIdx === colIdx;
                          let bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
                          if (!isDiag) {
                            if (corrVal < 0.35) bgClass = 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold';
                            else if (corrVal < 0.65) bgClass = 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold';
                            else bgClass = 'bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold';
                          }

                          return (
                            <td key={colIdx} className="p-2">
                              <span className={`px-2 py-1 rounded text-xs block ${bgClass}`}>
                                {corrVal.toFixed(2)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Rebalance Execution */}
      {showConfirmModal && optResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-cyan-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">Confirm Rebalancing Orders</h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                You are about to execute the following Markowitz Mean-Variance rebalancing trades across your holdings:
              </p>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 font-mono">
                {optResult.suggestions
                  .filter(s => s.action !== 'HOLD')
                  .map(s => (
                    <div
                      key={s.ticker}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{s.ticker}</span>
                        <span className="text-[10px] text-slate-400 block font-sans">{s.companyName}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${s.action === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {s.action}: {s.quantityDelta > 0 ? `+${s.quantityDelta}` : s.quantityDelta} shares
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          ₹{Math.abs(s.valueDelta).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 text-slate-700 dark:text-cyan-300 text-[11px] space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Target Portfolio Sharpe:</span>
                  <span>{optResult.optimalMetrics.sharpeRatio} (vs {optResult.currentMetrics.sharpeRatio} current)</span>
                </div>
                <div className="flex justify-between">
                  <span>Expected Variance Reduction:</span>
                  <span>-{optResult.optimalMetrics.volatilityReductionPct}% risk</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyRebalance}
                disabled={rebalanceApplying}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors cursor-pointer shadow-sm text-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{rebalanceApplying ? 'Executing Trades...' : 'Confirm & Execute Trades'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Holding Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">Add Position to Portfolio</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddHolding} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-mono mb-1">Ticker Symbol (NSE / US)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RELIANCE.NS, TCS.NS, NVDA"
                  value={tickerInput}
                  onChange={e => setTickerInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-mono mb-1">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 50"
                    value={qtyInput}
                    onChange={e => setQtyInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-mono mb-1">Avg Buy Price</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 2850.00"
                    value={priceInput}
                    onChange={e => setPriceInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-mono mb-1">Investment Thesis / Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Core defensive compounder"
                  value={notesInput}
                  onChange={e => setNotesInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Save Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DisclaimerBanner />
    </div>
  );
};
