/**
 * TradeLedger Component
 * Chronological paper trade blotter and execution ledger for BrokerRouter.
 * Features:
 * - Real-time chronological trade list with entry and exit prices
 * - Search input matching ticker, company, order ID, routing venue, and trade thesis notes
 * - Dedicated Status filter (All, Open, Closed, Pending) with real-time counters
 * - Calculated Realized & Unrealized PnL ($ and %)
 * - Support for Pending / Working limit & stop orders with 1-click Cancel Order action
 * - Comprehensive performance telemetry (Net Realized, Open MTM PnL, Pending Orders, Win Rate)
 * - Sorting by Date, PnL, and Volume
 * - Direct "New Paper Order" and "Close Position" execution triggers
 * - Complete CSV export of trade blotter
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ScrollText,
  TrendingUp,
  TrendingDown,
  Building2,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Percent,
  Layers,
  Send,
  X,
  Tag,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import { BrokerTrade, BrokerAccount } from '../types';
import { BrokerRouterModal } from './BrokerRouterModal';
import { TradeSparkline } from './TradeSparkline';
import { exportTradesToCSV } from '../utils/tradeExport';
import { ExecutiveTradeSummary } from './ExecutiveTradeSummary';

interface Props {
  onSelectTicker?: (ticker: string) => void;
  className?: string;
}

export const TradeLedger: React.FC<Props> = ({
  onSelectTicker,
  className = ''
}) => {
  const [trades, setTrades] = useState<BrokerTrade[]>([]);
  const [account, setAccount] = useState<BrokerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED' | 'PENDING'>('ALL');
  const [sideFilter, setSideFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'PNL_DESC' | 'PNL_ASC'>('DATE_DESC');

  // Order cancellation state
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Broker router modal trigger state
  const [brokerModalOpen, setBrokerModalOpen] = useState(false);
  const [selectedTickerForRouter, setSelectedTickerForRouter] = useState<string>('NVDA');

  useEffect(() => {
    loadLedgerData();
  }, []);

  async function loadLedgerData(isManualRefresh = false) {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [tradesData, accData] = await Promise.all([
        api.getBrokerTrades().catch(() => []),
        api.getBrokerAccount().catch(() => null)
      ]);
      setTrades(tradesData);
      if (accData) setAccount(accData);
    } catch (err) {
      console.error('Failed to load trade ledger:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    const closedTrades = trades.filter((t) => t.status === 'CLOSED');
    const openTrades = trades.filter((t) => t.status === 'OPEN');
    const pendingTrades = trades.filter((t) => t.status === 'PENDING');

    const totalRealizedPnL = closedTrades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
    const totalUnrealizedPnL = openTrades.reduce((sum, t) => sum + (t.unrealizedPnL || 0), 0);

    const winningTrades = closedTrades.filter((t) => (t.realizedPnL || 0) > 0);
    const losingTrades = closedTrades.filter((t) => (t.realizedPnL || 0) < 0);
    const winRate =
      closedTrades.length > 0
        ? Number(((winningTrades.length / closedTrades.length) * 100).toFixed(1))
        : 0;

    const totalVolume = trades.reduce(
      (sum, t) => sum + t.entryPrice * t.qty,
      0
    );

    const pendingNotional = pendingTrades.reduce(
      (sum, t) => sum + (t.entryPrice * t.qty),
      0
    );

    const grossGains = winningTrades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
    const grossLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0));
    const profitFactor =
      grossLosses > 0 ? Number((grossGains / grossLosses).toFixed(2)) : grossGains > 0 ? 99.9 : 0;

    return {
      closedCount: closedTrades.length,
      openCount: openTrades.length,
      pendingCount: pendingTrades.length,
      totalRealizedPnL,
      totalUnrealizedPnL,
      pendingNotional,
      winRate,
      winningCount: winningTrades.length,
      losingCount: losingTrades.length,
      totalVolume,
      profitFactor
    };
  }, [trades]);

  // Unique tickers for quick filter chips
  const quickTickers = useMemo(() => {
    const list = Array.from(new Set(trades.map((t) => t.ticker))).filter(Boolean);
    return list.slice(0, 5);
  }, [trades]);

  // Filtered & Sorted Trades
  const filteredTrades = useMemo(() => {
    return trades
      .filter((trade) => {
        // Status filter: Open, Closed, Pending, All
        if (statusFilter !== 'ALL' && trade.status !== statusFilter) return false;

        // Side filter: Buy, Sell, All
        if (sideFilter !== 'ALL' && trade.side !== sideFilter) return false;

        // Search query filter: checks ticker, company name, orderId, notes, venue, order type, status
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTicker = trade.ticker.toLowerCase().includes(q);
          const matchCompany = trade.companyName.toLowerCase().includes(q);
          const matchNotes = trade.notes?.toLowerCase().includes(q);
          const matchOrderId = trade.orderId?.toLowerCase().includes(q);
          const matchTradeId = trade.id?.toLowerCase().includes(q);
          const matchVenue = trade.routingVenue?.toLowerCase().includes(q);
          const matchType = trade.orderType?.toLowerCase().includes(q);
          const matchStatus = trade.status.toLowerCase().includes(q);

          if (
            !matchTicker &&
            !matchCompany &&
            !matchNotes &&
            !matchOrderId &&
            !matchTradeId &&
            !matchVenue &&
            !matchType &&
            !matchStatus
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'DATE_DESC') {
          const dateA = new Date(a.exitDate || a.entryDate).getTime();
          const dateB = new Date(b.exitDate || b.entryDate).getTime();
          return dateB - dateA;
        }
        if (sortBy === 'DATE_ASC') {
          const dateA = new Date(a.exitDate || a.entryDate).getTime();
          const dateB = new Date(b.exitDate || b.entryDate).getTime();
          return dateA - dateB;
        }
        if (sortBy === 'PNL_DESC') {
          const pnlA = a.status === 'CLOSED' ? a.realizedPnL || 0 : a.status === 'OPEN' ? a.unrealizedPnL || 0 : -999999;
          const pnlB = b.status === 'CLOSED' ? b.realizedPnL || 0 : b.status === 'OPEN' ? b.unrealizedPnL || 0 : -999999;
          return pnlB - pnlA;
        }
        if (sortBy === 'PNL_ASC') {
          const pnlA = a.status === 'CLOSED' ? a.realizedPnL || 0 : a.status === 'OPEN' ? a.unrealizedPnL || 0 : 999999;
          const pnlB = b.status === 'CLOSED' ? b.realizedPnL || 0 : b.status === 'OPEN' ? b.unrealizedPnL || 0 : 999999;
          return pnlA - pnlB;
        }
        return 0;
      });
  }, [trades, statusFilter, sideFilter, searchQuery, sortBy]);

  // Cancel a pending working order
  const handleCancelPendingOrder = async (orderId: string, ticker: string) => {
    try {
      setCancellingOrderId(orderId);
      await api.cancelBrokerOrder(orderId);
      setActionFeedback(`Cancelled pending order for ${ticker} (${orderId})`);
      setTimeout(() => setActionFeedback(null), 4000);
      await loadLedgerData(true);
    } catch (err: any) {
      console.error('Failed to cancel order:', err);
      setActionFeedback(`Error cancelling order: ${err?.message || 'Please try again.'}`);
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Export CSV of transaction history
  const handleExportCSV = (onlyFiltered = false) => {
    const listToExport = onlyFiltered && hasActiveFilters ? filteredTrades : trades;
    if (!listToExport.length) return;

    const prefix = onlyFiltered && hasActiveFilters
      ? `broker-transactions-${statusFilter.toLowerCase()}`
      : 'broker-transaction-history';

    const success = exportTradesToCSV(listToExport, prefix);
    if (success) {
      setActionFeedback(`Downloaded ${listToExport.length} transactions as CSV (${onlyFiltered ? 'filtered view' : 'complete history'}).`);
      setTimeout(() => setActionFeedback(null), 4500);
    }
  };

  const handleOpenRouterForTrade = (ticker: string) => {
    setSelectedTickerForRouter(ticker);
    setBrokerModalOpen(true);
  };

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'ALL' || sideFilter !== 'ALL';

  return (
    <div className={`space-y-4 sm:space-y-5 animate-fadeIn ${className}`}>
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Title and Top Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <ScrollText className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                BrokerRouter Trade Ledger
              </h2>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Alpaca Paper Gateway
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chronological paper trade blotter with real-time entry and exit execution tracking, status filtering, and calculated PnL.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => loadLedgerData(true)}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Refresh fills and mark-to-market valuations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-500' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Export Transaction History CSV Button */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleExportCSV(false)}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-300 dark:border-emerald-700 shadow-xs"
                title="Export complete transaction history as a CSV file"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Export Transactions (CSV)</span>
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => handleExportCSV(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                  title={`Export ${filteredTrades.length} filtered transactions only`}
                >
                  <Download className="w-3 h-3 text-cyan-500" />
                  <span>Filtered ({filteredTrades.length})</span>
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedTickerForRouter('NVDA');
                setBrokerModalOpen(true);
              }}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>New Paper Order</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Telemetry Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Realized PnL Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Net Realized PnL</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {metrics.closedCount} Closed
              </span>
            </div>
            <div
              className={`text-xl font-bold font-mono tabular-nums flex items-center gap-1 ${
                metrics.totalRealizedPnL >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {metrics.totalRealizedPnL >= 0 ? '+' : ''}${metrics.totalRealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block truncate">
              {metrics.winningCount} Wins / {metrics.losingCount} Losses • Locked Profit
            </span>
          </div>

          {/* Unrealized PnL Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Unrealized Paper PnL</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300">
                {metrics.openCount} Open
              </span>
            </div>
            <div
              className={`text-xl font-bold font-mono tabular-nums flex items-center gap-1 ${
                metrics.totalUnrealizedPnL >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {metrics.totalUnrealizedPnL >= 0 ? '+' : ''}${metrics.totalUnrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block truncate">
              Live mark-to-market positions
            </span>
          </div>

          {/* Pending Working Orders Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Pending Orders</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center gap-1 font-semibold">
                <Clock className="w-2.5 h-2.5" />
                {metrics.pendingCount} Queued
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
              {metrics.pendingCount} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">working</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block truncate">
              ${metrics.pendingNotional.toLocaleString(undefined, { maximumFractionDigits: 0 })} notional awaiting execution
            </span>
          </div>

          {/* Win Rate & Volume Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Win Rate & Volume</span>
              <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                PF: {metrics.profitFactor > 0 ? metrics.profitFactor : 'N/A'}
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {metrics.winRate}%
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block truncate">
              Vol: ${metrics.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })} • BP: ${account?.buyingPower?.toLocaleString() || '248,500'}
            </span>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {actionFeedback && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/80 text-xs text-cyan-800 dark:text-cyan-300 animate-fadeIn">
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span>{actionFeedback}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-cyan-600 hover:text-cyan-900 dark:hover:text-cyan-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Executive Trade Summary Section for Closed Trade History */}
        <ExecutiveTradeSummary
          trades={trades}
          onSelectTicker={onSelectTicker}
        />

        {/* Filters, Search & Sorting Controls */}
        <div className="space-y-2.5 pt-1">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
            {/* Left Controls: Search Input + Status Filter (Open, Closed, Pending) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
              {/* 1. Enhanced Search Input */}
              <div className="relative min-w-[240px] sm:min-w-[280px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search ticker, company, order ID, thesis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 2. Status Filter Tabs (Open, Closed, Pending, All) */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Show all historical paper trades"
                >
                  <span>All</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    statusFilter === 'ALL'
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                      : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {trades.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('OPEN')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'OPEN'
                      ? 'bg-cyan-500 text-slate-950 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400'
                  }`}
                  title="Show active open positions"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'OPEN' ? 'bg-slate-950' : 'bg-cyan-500 animate-pulse'}`}></span>
                  <span>Open</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    statusFilter === 'OPEN'
                      ? 'bg-cyan-400 text-slate-950 font-bold'
                      : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                  }`}>
                    {metrics.openCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('CLOSED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'CLOSED'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                  title="Show realized closed trades"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Closed</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    statusFilter === 'CLOSED'
                      ? 'bg-emerald-400 text-slate-950 font-bold'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {metrics.closedCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'PENDING'
                      ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
                  }`}
                  title="Show pending queued limit & stop orders"
                >
                  <Clock className="w-3 h-3" />
                  <span>Pending</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    statusFilter === 'PENDING'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  }`}>
                    {metrics.pendingCount}
                  </span>
                </button>
              </div>

              {/* 3. Side Filter */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSideFilter('ALL')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    sideFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  All Sides
                </button>
                <button
                  type="button"
                  onClick={() => setSideFilter('BUY')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    sideFilter === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={() => setSideFilter('SELL')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    sideFilter === 'SELL'
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Sell
                </button>
              </div>
            </div>

            {/* Right Controls: Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-400 font-medium flex items-center gap-1 font-mono text-xs">
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 font-medium text-xs cursor-pointer focus:outline-none focus:border-cyan-500"
              >
                <option value="DATE_DESC">Date: Newest First</option>
                <option value="DATE_ASC">Date: Oldest First</option>
                <option value="PNL_DESC">PnL: Highest First</option>
                <option value="PNL_ASC">PnL: Lowest First</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips & Quick Suggestions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            {/* Quick Ticker Chips */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <Tag className="w-3 h-3 text-slate-400" />
                Quick filter:
              </span>
              {quickTickers.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSearchQuery(searchQuery === t ? '' : t)}
                  className={`px-2 py-0.5 rounded-md font-mono transition-colors cursor-pointer border ${
                    searchQuery.toLowerCase() === t.toLowerCase()
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Match Counter */}
            <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 sm:text-right">
              Showing <span className="font-bold text-slate-900 dark:text-white">{filteredTrades.length}</span> of {trades.length} trades
            </div>
          </div>

          {/* Active Filters Clear Banner */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Active Filters:</span>
                {statusFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium">
                    Status: <strong className="text-slate-900 dark:text-white capitalize">{statusFilter.toLowerCase()}</strong>
                    <button onClick={() => setStatusFilter('ALL')} className="hover:text-rose-500 cursor-pointer ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {searchQuery.trim() && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium">
                    Search: <strong className="text-slate-900 dark:text-white">"{searchQuery}"</strong>
                    <button onClick={() => setSearchQuery('')} className="hover:text-rose-500 cursor-pointer ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {sideFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium">
                    Side: <strong className="text-slate-900 dark:text-white">{sideFilter}</strong>
                    <button onClick={() => setSideFilter('ALL')} className="hover:text-rose-500 cursor-pointer ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setSideFilter('ALL');
                }}
                className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-semibold cursor-pointer shrink-0"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Trade Ledger Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-center space-y-3">
            <RefreshCw className="w-7 h-7 text-cyan-500 animate-spin" />
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Fetching paper trades and live mark-to-market prices...
            </p>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
              <ScrollText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No Historical Trades Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL' || sideFilter !== 'ALL'
                ? `No orders matching your active filters ${statusFilter !== 'ALL' ? `(Status: ${statusFilter})` : ''} ${searchQuery ? `"${searchQuery}"` : ''}. Try resetting your search or status filter.`
                : 'Execute paper orders through the BrokerRouter to track entry/exit executions and real-time PnL.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setSideFilter('ALL');
              }}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 cursor-pointer shadow-sm"
            >
              Reset Filters ({trades.length} Total Trades)
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider font-mono">
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-3">Asset</th>
                  <th className="py-3 px-3">Side & Type</th>
                  <th className="py-3 px-3 text-right">Shares</th>
                  <th className="py-3 px-3 text-right">Entry / Limit</th>
                  <th className="py-3 px-3 text-right">Exit / Fill</th>
                  <th className="py-3 px-3 text-center">PnL Sparkline</th>
                  <th className="py-3 px-4 text-right">Calculated PnL</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Routing Venue</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[12px]">
                {filteredTrades.map((trade) => {
                  const isClosed = trade.status === 'CLOSED';
                  const isOpen = trade.status === 'OPEN';
                  const isPending = trade.status === 'PENDING';

                  const pnl = isClosed ? trade.realizedPnL || 0 : isOpen ? trade.unrealizedPnL || 0 : 0;
                  const pnlPct = isClosed ? trade.realizedPnLPercent || 0 : isOpen ? trade.unrealizedPnLPercent || 0 : 0;
                  const isProfit = pnl >= 0;

                  const entryDateFormatted = new Date(trade.entryDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  const entryTimeFormatted = new Date(trade.entryDate).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  const exitDateFormatted = trade.exitDate
                    ? new Date(trade.exitDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })
                    : null;

                  return (
                    <tr
                      key={trade.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {isClosed && exitDateFormatted ? exitDateFormatted : entryDateFormatted}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {entryTimeFormatted}
                        </div>
                      </td>

                      {/* Asset Ticker & Name */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectTicker?.(trade.ticker)}
                            className="font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>{trade.ticker}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans truncate max-w-[150px]">
                          {trade.companyName}
                        </div>
                      </td>

                      {/* Side & Order Type */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              trade.side === 'BUY'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {trade.side}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {trade.orderType}
                          </span>
                        </div>
                        {trade.stopLossPrice && (
                          <div className="text-[9px] text-amber-600 dark:text-amber-400">
                            SL: ${trade.stopLossPrice}
                          </div>
                        )}
                      </td>

                      {/* Shares Quantity */}
                      <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap text-slate-800 dark:text-slate-200">
                        {trade.qty.toLocaleString()}
                        <span className="text-[10px] text-slate-400 ml-1">shs</span>
                      </td>

                      {/* Entry Price / Limit */}
                      <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          ${trade.entryPrice.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isPending ? 'Target Cost' : 'Cost'}: ${(trade.entryPrice * trade.qty).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </td>

                      {/* Exit Price / Target Fill */}
                      <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {isPending ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              ${trade.entryPrice.toFixed(2)}
                            </span>
                          ) : (
                            `$${trade.exitPrice.toFixed(2)}`
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isClosed ? (
                            'Realized Exit'
                          ) : isOpen ? (
                            <span className="text-cyan-600 dark:text-cyan-400 font-sans">
                              Live MTM
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-sans flex items-center justify-end gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              Working Limit
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Mini Sparkline Chart (Realized Gain/Loss over Duration) */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-center">
                        <TradeSparkline trade={trade} width={105} height={28} />
                      </td>

                      {/* Calculated PnL */}
                      <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                        {isPending ? (
                          <div className="flex flex-col items-end">
                            <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Awaiting Fill
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans">
                              Order Working
                            </span>
                          </div>
                        ) : (
                          <>
                            <div
                              className={`font-bold flex items-center justify-end gap-1 ${
                                isProfit
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              <span>
                                {isProfit ? '+' : ''}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div
                              className={`text-[10px] font-semibold ${
                                isProfit
                                  ? 'text-emerald-600/80 dark:text-emerald-400/80'
                                  : 'text-rose-600/80 dark:text-rose-400/80'
                              }`}
                            >
                              {isProfit ? '+' : ''}{pnlPct.toFixed(2)}%
                            </div>
                          </>
                        )}
                      </td>

                      {/* Status (Open, Closed, Pending) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isOpen && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                            Open
                          </span>
                        )}
                        {isClosed && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 w-fit flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                            Closed
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
                            <Clock className="w-2.5 h-2.5 animate-spin" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Routing Venue & Notes */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                        <div className="truncate max-w-[140px]" title={trade.routingVenue}>
                          {trade.routingVenue}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]" title={trade.orderId}>
                          {trade.orderId}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isOpen ? (
                          <button
                            onClick={() => handleOpenRouterForTrade(trade.ticker)}
                            className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Execute offsetting sell order to close position"
                          >
                            Close Position
                          </button>
                        ) : isPending ? (
                          <button
                            onClick={() => handleCancelPendingOrder(trade.orderId, trade.ticker)}
                            disabled={cancellingOrderId === trade.orderId}
                            className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="Cancel pending working order"
                          >
                            {cancellingOrderId === trade.orderId ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            <span>Cancel</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenRouterForTrade(trade.ticker)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                            title="Trade again via BrokerRouter"
                          >
                            Trade Again
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Ledger Telemetry */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
          <div className="flex items-center gap-2 flex-wrap">
            <span>Showing {filteredTrades.length} of {trades.length} recorded paper trades</span>
            <span>•</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{metrics.openCount} Open</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{metrics.closedCount} Closed</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">{metrics.pendingCount} Pending</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleExportCSV(false)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold transition-colors cursor-pointer border border-emerald-300 dark:border-emerald-700"
              title="Export complete transaction history as a CSV file"
            >
              <Download className="w-3 h-3 text-emerald-500" />
              <span>Export CSV</span>
            </button>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Live Gateway Active
            </span>
          </div>
        </div>
      </div>

      {/* Embedded BrokerRouterModal when launched from ledger */}
      <BrokerRouterModal
        isOpen={brokerModalOpen}
        onClose={() => setBrokerModalOpen(false)}
        defaultTicker={selectedTickerForRouter}
        onOrderSuccess={() => {
          loadLedgerData(true);
        }}
      />
    </div>
  );
};
