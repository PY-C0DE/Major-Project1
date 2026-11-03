/**
 * AlphaQuant AI - Trade Ledger CSV Exporter Utility
 * Generates an institutional-grade, spreadsheet-ready CSV file of all transaction history
 * including entry/exit prices, realized/unrealized PnL, duration, and routing metadata.
 */

import { BrokerTrade } from '../types';

export function exportTradesToCSV(trades: BrokerTrade[], fileNamePrefix = 'broker-transaction-history'): boolean {
  if (!trades || trades.length === 0) {
    return false;
  }

  const headers = [
    'Trade ID',
    'Order ID',
    'Ticker Symbol',
    'Company Name',
    'Side',
    'Status',
    'Order Type',
    'Shares (Qty)',
    'Entry Price ($)',
    'Exit / Market Price ($)',
    'Realized PnL ($)',
    'Realized PnL (%)',
    'Unrealized PnL ($)',
    'Unrealized PnL (%)',
    'Duration',
    'Entry Timestamp (UTC)',
    'Exit Timestamp (UTC)',
    'Stop Loss ($)',
    'Take Profit ($)',
    'Routing Venue',
    'Trading Thesis / Notes'
  ];

  const escapeCSV = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const getDuration = (entryDate: string, exitDate?: string) => {
    const start = new Date(entryDate).getTime();
    const end = exitDate ? new Date(exitDate).getTime() : Date.now();
    const diffMs = Math.max(0, end - start);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays >= 1) {
      const remHours = Math.round((diffMs % 86400000) / 3600000);
      return remHours > 0 ? `${diffDays}d ${remHours}h` : `${diffDays}d`;
    }
    return `${Math.max(1, diffHours)}h`;
  };

  const rows = trades.map((t) => [
    escapeCSV(t.id),
    escapeCSV(t.orderId),
    escapeCSV(t.ticker),
    escapeCSV(t.companyName),
    escapeCSV(t.side),
    escapeCSV(t.status),
    escapeCSV(t.orderType),
    t.qty,
    t.entryPrice.toFixed(2),
    t.exitPrice ? t.exitPrice.toFixed(2) : t.entryPrice.toFixed(2),
    t.realizedPnL !== undefined ? t.realizedPnL.toFixed(2) : '0.00',
    t.realizedPnLPercent !== undefined ? `${t.realizedPnLPercent.toFixed(2)}%` : '0.00%',
    t.unrealizedPnL !== undefined ? t.unrealizedPnL.toFixed(2) : '0.00',
    t.unrealizedPnLPercent !== undefined ? `${t.unrealizedPnLPercent.toFixed(2)}%` : '0.00%',
    escapeCSV(getDuration(t.entryDate, t.exitDate)),
    escapeCSV(t.entryDate),
    escapeCSV(t.exitDate || 'N/A (Active/Pending)'),
    t.stopLossPrice !== undefined ? t.stopLossPrice.toFixed(2) : 'None',
    t.takeProfitPrice !== undefined ? t.takeProfitPrice.toFixed(2) : 'None',
    escapeCSV(t.routingVenue),
    escapeCSV(t.notes || '')
  ]);

  // Include UTF-8 BOM (\uFEFF) to guarantee Excel & Numbers open special characters cleanly
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const dateStamp = new Date().toISOString().split('T')[0];
  link.href = url;
  link.setAttribute('download', `${fileNamePrefix}-${dateStamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}
