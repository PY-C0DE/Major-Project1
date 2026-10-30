/**
 * DividendCalendar Component
 * Tracks upcoming dividend ex-dates, record dates, and payment dates for user portfolio holdings,
 * and calculates estimated quarterly & annual cash payouts.
 */

import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Coins,
  TrendingUp,
  Download,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  Filter,
  Search,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Check,
  RefreshCw,
  Building2
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { PortfolioHolding } from '../types';
import { useTheme } from '../context/ThemeContext';

export interface DividendEvent {
  ticker: string;
  companyName: string;
  sharesHeld: number;
  currency: 'INR' | 'USD';
  currSym: string;
  currentPrice: number;
  annualDividendPerShare: number;
  dividendYieldPct: number;
  payoutPerQuarter: number;
  nextExDate: string;
  recordDate: string;
  paymentDate: string;
  daysUntilExDate: number;
  isUpcoming: boolean;
  status: 'Announced' | 'Projected' | 'Paid';
  frequency: 'Quarterly' | 'Semi-Annual' | 'Annual';
  estimatedQuarterlyPayout: number;
  estimatedAnnualPayout: number;
  quarterlyDistribution: {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
  };
  payoutMonths: string[];
}

interface Props {
  holdings: PortfolioHolding[];
  onSelectTicker?: (ticker: string) => void;
}

// Known institutional dividend schedules for catalog assets
const KNOWN_DIVIDEND_PROFILES: Record<string, {
  annualDps: number;
  yieldPct: number;
  freq: 'Quarterly' | 'Semi-Annual' | 'Annual';
  exMonthOffset: number; // approximate month
  nextExDateStr: string;
  recordDateStr: string;
  paymentDateStr: string;
  payoutMonths: string[];
  status: 'Announced' | 'Projected';
}> = {
  'AAPL': {
    annualDps: 1.04,
    yieldPct: 0.45,
    freq: 'Quarterly',
    exMonthOffset: 11,
    nextExDateStr: '2026-11-07',
    recordDateStr: '2026-11-10',
    paymentDateStr: '2026-11-16',
    payoutMonths: ['Feb', 'May', 'Aug', 'Nov'],
    status: 'Announced'
  },
  'MSFT': {
    annualDps: 3.32,
    yieldPct: 0.75,
    freq: 'Quarterly',
    exMonthOffset: 11,
    nextExDateStr: '2026-11-19',
    recordDateStr: '2026-11-20',
    paymentDateStr: '2026-12-10',
    payoutMonths: ['Mar', 'Jun', 'Sep', 'Dec'],
    status: 'Announced'
  },
  'NVDA': {
    annualDps: 0.04,
    yieldPct: 0.03,
    freq: 'Quarterly',
    exMonthOffset: 12,
    nextExDateStr: '2026-12-04',
    recordDateStr: '2026-12-05',
    paymentDateStr: '2026-12-28',
    payoutMonths: ['Mar', 'Jun', 'Sep', 'Dec'],
    status: 'Announced'
  },
  'GOOGL': {
    annualDps: 0.80,
    yieldPct: 0.46,
    freq: 'Quarterly',
    exMonthOffset: 12,
    nextExDateStr: '2026-12-09',
    recordDateStr: '2026-12-10',
    paymentDateStr: '2026-12-16',
    payoutMonths: ['Mar', 'Jun', 'Sep', 'Dec'],
    status: 'Projected'
  },
  'META': {
    annualDps: 2.00,
    yieldPct: 0.35,
    freq: 'Quarterly',
    exMonthOffset: 12,
    nextExDateStr: '2026-12-15',
    recordDateStr: '2026-12-16',
    paymentDateStr: '2026-12-26',
    payoutMonths: ['Mar', 'Jun', 'Sep', 'Dec'],
    status: 'Projected'
  },
  'JNJ': {
    annualDps: 4.96,
    yieldPct: 3.12,
    freq: 'Quarterly',
    exMonthOffset: 11,
    nextExDateStr: '2026-11-24',
    recordDateStr: '2026-11-25',
    paymentDateStr: '2026-12-08',
    payoutMonths: ['Mar', 'Jun', 'Sep', 'Dec'],
    status: 'Announced'
  },
  'KO': {
    annualDps: 1.94,
    yieldPct: 2.95,
    freq: 'Quarterly',
    exMonthOffset: 11,
    nextExDateStr: '2026-11-30',
    recordDateStr: '2026-12-01',
    paymentDateStr: '2026-12-15',
    payoutMonths: ['Apr', 'Jul', 'Oct', 'Dec'],
    status: 'Announced'
  },
  'JPM': {
    annualDps: 4.80,
    yieldPct: 2.20,
    freq: 'Quarterly',
    exMonthOffset: 1,
    nextExDateStr: '2027-01-05',
    recordDateStr: '2027-01-06',
    paymentDateStr: '2027-01-31',
    payoutMonths: ['Jan', 'Apr', 'Jul', 'Oct'],
    status: 'Projected'
  },
  'TCS.NS': {
    annualDps: 73.00,
    yieldPct: 1.73,
    freq: 'Quarterly',
    exMonthOffset: 11,
    nextExDateStr: '2026-11-06',
    recordDateStr: '2026-11-07',
    paymentDateStr: '2026-11-20',
    payoutMonths: ['Jan', 'May', 'Jul', 'Oct'],
    status: 'Announced'
  },
  'RELIANCE.NS': {
    annualDps: 10.00,
    yieldPct: 0.34,
    freq: 'Annual',
    exMonthOffset: 11,
    nextExDateStr: '2026-11-26',
    recordDateStr: '2026-11-28',
    paymentDateStr: '2026-12-15',
    payoutMonths: ['Aug', 'Nov'],
    status: 'Projected'
  },
  'INFY.NS': {
    annualDps: 38.00,
    yieldPct: 1.98,
    freq: 'Semi-Annual',
    exMonthOffset: 10,
    nextExDateStr: '2026-10-28',
    recordDateStr: '2026-10-29',
    paymentDateStr: '2026-11-12',
    payoutMonths: ['Jun', 'Oct'],
    status: 'Announced'
  },
  'HDFCBANK.NS': {
    annualDps: 19.50,
    yieldPct: 1.16,
    freq: 'Annual',
    exMonthOffset: 5,
    nextExDateStr: '2027-05-14',
    recordDateStr: '2027-05-16',
    paymentDateStr: '2027-06-05',
    payoutMonths: ['May'],
    status: 'Projected'
  },
  'ICICIBANK.NS': {
    annualDps: 10.00,
    yieldPct: 0.88,
    freq: 'Annual',
    exMonthOffset: 7,
    nextExDateStr: '2027-07-12',
    recordDateStr: '2027-07-14',
    paymentDateStr: '2027-08-02',
    payoutMonths: ['Jul'],
    status: 'Projected'
  },
  'ITC.NS': {
    annualDps: 13.75,
    yieldPct: 3.10,
    freq: 'Semi-Annual',
    exMonthOffset: 2,
    nextExDateStr: '2027-02-15',
    recordDateStr: '2027-02-17',
    paymentDateStr: '2027-03-04',
    payoutMonths: ['Feb', 'Jun'],
    status: 'Projected'
  },
  'SBIN.NS': {
    annualDps: 13.70,
    yieldPct: 1.62,
    freq: 'Annual',
    exMonthOffset: 5,
    nextExDateStr: '2027-05-20',
    recordDateStr: '2027-05-22',
    paymentDateStr: '2027-06-12',
    payoutMonths: ['May'],
    status: 'Projected'
  },
  'LT.NS': {
    annualDps: 28.00,
    yieldPct: 0.78,
    freq: 'Annual',
    exMonthOffset: 7,
    nextExDateStr: '2027-07-20',
    recordDateStr: '2027-07-22',
    paymentDateStr: '2027-08-08',
    payoutMonths: ['Jul'],
    status: 'Projected'
  }
};

export const DividendCalendar: React.FC<Props> = ({ holdings, onSelectTicker }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [filterType, setFilterType] = useState<'ALL' | 'UPCOMING' | 'HIGH_YIELD' | 'NSE' | 'US'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dripReinvest, setDripReinvest] = useState(true);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Compute dividend metrics per holding
  const dividendEvents: DividendEvent[] = useMemo(() => {
    const today = new Date('2026-10-27T10:00:00Z');

    return holdings.map((h) => {
      const ticker = h.ticker;
      const isNse = ticker.endsWith('.NS');
      const currency = isNse ? 'INR' : 'USD';
      const currSym = isNse ? '₹' : '$';
      const currentPrice = h.currentPrice || h.avgBuyPrice || 100;
      const sharesHeld = h.quantity || 0;

      const profile = KNOWN_DIVIDEND_PROFILES[ticker];
      let annualDps = 0;
      let yieldPct = 0;
      let freq: 'Quarterly' | 'Semi-Annual' | 'Annual' = 'Quarterly';
      let nextExDate = '2026-11-20';
      let recordDate = '2026-11-22';
      let paymentDate = '2026-12-05';
      let payoutMonths = ['Mar', 'Jun', 'Sep', 'Dec'];
      let status: 'Announced' | 'Projected' = 'Projected';

      if (profile) {
        annualDps = profile.annualDps;
        yieldPct = profile.yieldPct;
        freq = profile.freq;
        nextExDate = profile.nextExDateStr;
        recordDate = profile.recordDateStr;
        paymentDate = profile.paymentDateStr;
        payoutMonths = profile.payoutMonths;
        status = profile.status;
      } else {
        // Derive realistic sector yield
        const sec = (h.sector || '').toLowerCase();
        if (sec.includes('tech')) {
          yieldPct = 0.55;
        } else if (sec.includes('bank') || sec.includes('financ')) {
          yieldPct = 1.65;
        } else if (sec.includes('energy') || sec.includes('utilit')) {
          yieldPct = 2.40;
        } else {
          yieldPct = 1.10;
        }
        annualDps = Number(((currentPrice * yieldPct) / 100).toFixed(2));
        freq = 'Quarterly';
        nextExDate = '2026-11-25';
        recordDate = '2026-11-27';
        paymentDate = '2026-12-10';
        payoutMonths = ['Mar', 'Jun', 'Sep', 'Dec'];
      }

      const exDateObj = new Date(nextExDate);
      const diffTime = exDateObj.getTime() - today.getTime();
      const daysUntilExDate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isUpcoming = daysUntilExDate >= 0;

      const payoutPerQuarter = freq === 'Quarterly'
        ? annualDps / 4
        : freq === 'Semi-Annual'
        ? annualDps / 2
        : annualDps / 4; // normalized quarter

      const estimatedQuarterlyPayout = Number((sharesHeld * payoutPerQuarter).toFixed(2));
      const estimatedAnnualPayout = Number((sharesHeld * annualDps).toFixed(2));

      // Quarterly distribution pattern
      const qAmount = estimatedQuarterlyPayout;
      const quarterlyDistribution = {
        q1: freq === 'Annual' ? 0 : qAmount,
        q2: freq === 'Annual' ? 0 : qAmount,
        q3: freq === 'Annual' ? estimatedAnnualPayout : qAmount,
        q4: qAmount
      };

      return {
        ticker,
        companyName: h.companyName || ticker,
        sharesHeld,
        currency,
        currSym,
        currentPrice,
        annualDividendPerShare: annualDps,
        dividendYieldPct: yieldPct,
        payoutPerQuarter: Number(payoutPerQuarter.toFixed(2)),
        nextExDate,
        recordDate,
        paymentDate,
        daysUntilExDate,
        isUpcoming,
        status,
        frequency: freq,
        estimatedQuarterlyPayout,
        estimatedAnnualPayout,
        quarterlyDistribution,
        payoutMonths
      };
    });
  }, [holdings]);

  // Aggregate Portfolio Totals
  const summary = useMemo(() => {
    let totalUsdAnnual = 0;
    let totalInrAnnual = 0;
    let totalUsdQ4 = 0;
    let totalInrQ4 = 0;
    let totalPortfolioValUsd = 0;
    let totalPortfolioValInr = 0;

    dividendEvents.forEach((d) => {
      if (d.currency === 'USD') {
        totalUsdAnnual += d.estimatedAnnualPayout;
        totalUsdQ4 += d.estimatedQuarterlyPayout;
        totalPortfolioValUsd += d.sharesHeld * d.currentPrice;
      } else {
        totalInrAnnual += d.estimatedAnnualPayout;
        totalInrQ4 += d.estimatedQuarterlyPayout;
        totalPortfolioValInr += d.sharesHeld * d.currentPrice;
      }
    });

    // Approximate USD conversion for combined portfolio-level yield calculation (1 USD = 85 INR)
    const combinedValUsd = totalPortfolioValUsd + totalPortfolioValInr / 85;
    const combinedAnnualUsd = totalUsdAnnual + totalInrAnnual / 85;
    const portfolioYieldPct = combinedValUsd > 0 ? (combinedAnnualUsd / combinedValUsd) * 100 : 0;

    // Closest upcoming ex-date event
    const upcomingEvents = [...dividendEvents]
      .filter((d) => d.daysUntilExDate >= 0)
      .sort((a, b) => a.daysUntilExDate - b.daysUntilExDate);

    const nextUpcoming = upcomingEvents[0] || null;

    return {
      totalUsdAnnual: Number(totalUsdAnnual.toFixed(2)),
      totalInrAnnual: Number(totalInrAnnual.toFixed(2)),
      totalUsdQ4: Number(totalUsdQ4.toFixed(2)),
      totalInrQ4: Number(totalInrQ4.toFixed(2)),
      portfolioYieldPct: Number(portfolioYieldPct.toFixed(2)),
      nextUpcoming
    };
  }, [dividendEvents]);

  // Quarterly Cash Flow Chart Data
  const quarterlyChartData = useMemo(() => {
    let q1Usd = 0, q2Usd = 0, q3Usd = 0, q4Usd = 0;

    dividendEvents.forEach((d) => {
      // Normalize to USD equivalent for aggregated chart view
      const rate = d.currency === 'INR' ? 1 / 85 : 1;
      q1Usd += d.quarterlyDistribution.q1 * rate;
      q2Usd += d.quarterlyDistribution.q2 * rate;
      q3Usd += d.quarterlyDistribution.q3 * rate;
      q4Usd += d.quarterlyDistribution.q4 * rate;
    });

    return [
      { quarter: 'Q1 (Jan-Mar)', amount: Number(q1Usd.toFixed(2)), status: 'Upcoming' },
      { quarter: 'Q2 (Apr-Jun)', amount: Number(q2Usd.toFixed(2)), status: 'Projected' },
      { quarter: 'Q3 (Jul-Sep)', amount: Number(q3Usd.toFixed(2)), status: 'Projected' },
      { quarter: 'Q4 (Oct-Dec)', amount: Number(q4Usd.toFixed(2)), status: 'Active (Current)' }
    ];
  }, [dividendEvents]);

  // Filtered List
  const filteredEvents = useMemo(() => {
    return dividendEvents.filter((d) => {
      const matchesSearch =
        d.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.companyName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterType === 'UPCOMING') return d.daysUntilExDate >= 0 && d.daysUntilExDate <= 45;
      if (filterType === 'HIGH_YIELD') return d.dividendYieldPct >= 1.5;
      if (filterType === 'NSE') return d.currency === 'INR';
      if (filterType === 'US') return d.currency === 'USD';
      return true;
    });
  }, [dividendEvents, filterType, searchQuery]);

  // Export CSV Schedule
  const handleExportCSV = () => {
    try {
      const rows: string[] = [];
      rows.push(`# AlphaQuant Portfolio Dividend Calendar & Cash Flow Schedule`);
      rows.push(`# Exported: ${new Date().toISOString()}`);
      rows.push(`# Portfolio Annual Dividend Yield: ${summary.portfolioYieldPct}%`);
      rows.push(``);
      rows.push([
        'Ticker',
        'Company_Name',
        'Shares_Held',
        'Currency',
        'Current_Price',
        'Annual_DPS',
        'Dividend_Yield_Pct',
        'Frequency',
        'Next_Ex_Date',
        'Record_Date',
        'Payment_Date',
        'Days_To_Ex_Date',
        'Status',
        'Est_Quarterly_Payout',
        'Est_Annual_Payout'
      ].join(','));

      dividendEvents.forEach((d) => {
        rows.push([
          `"${d.ticker}"`,
          `"${d.companyName.replace(/"/g, '""')}"`,
          d.sharesHeld,
          d.currency,
          d.currentPrice,
          d.annualDividendPerShare,
          `${d.dividendYieldPct}%`,
          d.frequency,
          d.nextExDate,
          d.recordDate,
          d.paymentDate,
          d.daysUntilExDate,
          d.status,
          d.estimatedQuarterlyPayout,
          d.estimatedAnnualPayout
        ].join(','));
      });

      const blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AlphaQuant_Dividend_Calendar_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (e) {
      console.error('Export CSV failed:', e);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-white">
              Portfolio Dividend Calendar & Cash Flow
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tracks confirmed and projected dividend ex-dates, record dates, and estimates recurring quarterly cash inflows.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Export Dividend Schedule as CSV for Excel / Tax Planning"
          >
            {exportSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Exported CSV</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-amber-500" />
                <span>Export Dividend CSV</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Telemetry Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        {/* Card 1: Annual Projected Payout */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">
            Annual Est. Dividends
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {summary.totalUsdAnnual > 0 && <span>${summary.totalUsdAnnual.toLocaleString()}</span>}
            {summary.totalUsdAnnual > 0 && summary.totalInrAnnual > 0 && <span className="text-slate-400 text-xs mx-1">+</span>}
            {summary.totalInrAnnual > 0 && <span>₹{summary.totalInrAnnual.toLocaleString()}</span>}
            {summary.totalUsdAnnual === 0 && summary.totalInrAnnual === 0 && <span>$0.00</span>}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
            Projected passive cash flow
          </span>
        </div>

        {/* Card 2: Current Quarter Inflow */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">
            Q4 Estimated Inflow
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400 tabular-nums">
            {summary.totalUsdQ4 > 0 && <span>${summary.totalUsdQ4.toLocaleString()}</span>}
            {summary.totalUsdQ4 > 0 && summary.totalInrQ4 > 0 && <span className="text-slate-400 text-xs mx-1">+</span>}
            {summary.totalInrQ4 > 0 && <span>₹{summary.totalInrQ4.toLocaleString()}</span>}
            {summary.totalUsdQ4 === 0 && summary.totalInrQ4 === 0 && <span>$0.00</span>}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
            Current quarter distribution
          </span>
        </div>

        {/* Card 3: Portfolio Effective Yield */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">
            Portfolio Dividend Yield
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-amber-500 dark:text-amber-400 tabular-nums">
            {summary.portfolioYieldPct}%
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
            Weighted portfolio return rate
          </span>
        </div>

        {/* Card 4: Next Ex-Date */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">
            Next Upcoming Ex-Date
          </span>
          <div className="text-base sm:text-lg font-bold font-mono text-purple-600 dark:text-purple-400 truncate">
            {summary.nextUpcoming ? (
              <span>
                {summary.nextUpcoming.ticker.replace('.NS', '')}{' '}
                <span className="text-xs font-normal text-slate-500">
                  (in {summary.nextUpcoming.daysUntilExDate}d)
                </span>
              </span>
            ) : (
              'None within 60d'
            )}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
            {summary.nextUpcoming ? `Ex: ${summary.nextUpcoming.nextExDate}` : 'All ex-dates current'}
          </span>
        </div>
      </div>

      {/* Main Grid: Quarterly Cash Flow Chart & DRIP Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quarterly Distribution Bar Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                Quarterly Cash Payout Projections (Normalized USD Equiv.)
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Projected cash deposits scheduled across calendar quarters
              </span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              Q4 2026 - Q3 2027
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="quarter" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} />
                <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#090d16' : '#ffffff',
                    borderColor: isDark ? '#1e293b' : '#cbd5e1',
                    borderRadius: '10px',
                    fontSize: '11px',
                    color: isDark ? '#e2e8f0' : '#0f172a'
                  }}
                  formatter={(val: any) => [`$${val}`, 'Projected Payout']}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {quarterlyChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 3 ? '#f59e0b' : '#06b6d4'}
                      opacity={index === 3 ? 1 : 0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DRIP Reinvestment Compound Simulator */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-display">
                <Sparkles className="w-4 h-4 text-purple-500" />
                DRIP Reinvestment Power
              </span>
              <button
                onClick={() => setDripReinvest(!dripReinvest)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  dripReinvest
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {dripReinvest ? 'DRIP: ON' : 'DRIP: OFF'}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Automatic Dividend Reinvestment (DRIP) accumulates additional fractional shares without brokerage commission,
              compounding cash yields over time.
            </p>
          </div>

          <div className="space-y-3 font-mono text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">1-Year Additional Shares:</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                +{(summary.portfolioYieldPct * 0.85).toFixed(1)}% Shares
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">3-Year Compounded Yield:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{((summary.portfolioYieldPct * 3.3)).toFixed(1)}% Gain
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">5-Year Capital Expansion:</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
                +{((summary.portfolioYieldPct * 6.2)).toFixed(1)}% Total
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {[
            { id: 'ALL', label: 'All Holdings' },
            { id: 'UPCOMING', label: 'Upcoming (< 45d)' },
            { id: 'HIGH_YIELD', label: 'Yield > 1.5%' },
            { id: 'NSE', label: 'NSE (₹)' },
            { id: 'US', label: 'US ($)' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterType === f.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search holding dividend..."
            className="w-full text-xs font-mono pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      {/* Upcoming Dividend Ex-Dates & Payout Schedule Table */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-500" />
              Holding Dividend Ex-Date & Cash Inflow Schedule
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Individual corporate actions and expected quarterly deposits
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {filteredEvents.length} Assets Found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                <th className="py-3 px-4 font-medium font-sans">Asset & Company</th>
                <th className="py-3 px-4 font-medium text-right">Shares Held</th>
                <th className="py-3 px-4 font-medium text-right">DPS / Yield</th>
                <th className="py-3 px-4 font-medium text-center">Ex-Dividend Date</th>
                <th className="py-3 px-4 font-medium text-center">Payment Date</th>
                <th className="py-3 px-4 font-medium text-right">Est. Quarterly Payout</th>
                <th className="py-3 px-4 font-medium text-right">Est. Annual Total</th>
                <th className="py-3 px-4 font-medium text-center font-sans">Status</th>
                <th className="py-3 px-4 font-medium text-center font-sans">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500 dark:text-slate-400">
                    No matching dividend records found for the current filter.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => (
                  <tr key={evt.ticker} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Ticker & Name */}
                    <td className="py-3 px-4">
                      <div className="font-sans font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-cyan-600 dark:text-cyan-400">
                          {evt.ticker}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                          {evt.companyName}
                        </span>
                      </div>
                    </td>

                    {/* Shares Held */}
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                      {evt.sharesHeld} shs
                    </td>

                    {/* Dividend Per Share & Yield */}
                    <td className="py-3 px-4 text-right tabular-nums">
                      <div className="text-slate-900 dark:text-white font-bold">
                        {evt.currSym}{evt.annualDividendPerShare} /yr
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400">
                        {evt.dividendYieldPct}% yield
                      </div>
                    </td>

                    {/* Ex-Dividend Date */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span className="text-slate-900 dark:text-white">{evt.nextExDate}</span>
                        {evt.daysUntilExDate >= 0 ? (
                          <span className="text-[10px] text-cyan-600 dark:text-cyan-400">
                            ({evt.daysUntilExDate}d)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Past</span>
                        )}
                      </div>
                    </td>

                    {/* Payment Date */}
                    <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                      {evt.paymentDate}
                    </td>

                    {/* Estimated Quarterly Payout */}
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {evt.currSym}{evt.estimatedQuarterlyPayout.toLocaleString()}
                    </td>

                    {/* Estimated Annual Total */}
                    <td className="py-3 px-4 text-right text-slate-900 dark:text-white tabular-nums font-semibold">
                      {evt.currSym}{evt.estimatedAnnualPayout.toLocaleString()}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold border ${
                        evt.status === 'Announced'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}>
                        {evt.status}
                      </span>
                    </td>

                    {/* Action: Open Stock Detail */}
                    <td className="py-3 px-4 text-center">
                      {onSelectTicker ? (
                        <button
                          onClick={() => onSelectTicker(evt.ticker)}
                          className="px-2 py-1 rounded text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1 mx-auto"
                        >
                          <span>Analyze</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
