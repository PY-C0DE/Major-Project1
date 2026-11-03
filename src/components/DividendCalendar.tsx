/**
 * Dividend Yield & Calendar Module
 * AlphaQuant Institutional Portfolio Analytics
 *
 * Tracks upcoming ex-dividend dates, record dates, and payment dates for user portfolio holdings,
 * and calculates total projected annual dividend income, portfolio dividend yield, yield on cost (YoC),
 * monthly income timeline, and DRIP compounding projections.
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
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  BellRing,
  PieChart as PieIcon,
  BarChart3
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
  Legend
} from 'recharts';
import { PortfolioHolding } from '../types';
import { useTheme } from '../context/ThemeContext';

export interface DividendEvent {
  ticker: string;
  companyName: string;
  sharesHeld: number;
  currency: 'INR' | 'USD';
  currSym: string;
  currentPrice: number;
  avgBuyPrice: number;
  positionValue: number;
  annualDividendPerShare: number;
  dividendYieldPct: number;
  yieldOnCostPct: number;
  payoutPerQuarter: number;
  nextExDate: string;
  recordDate: string;
  paymentDate: string;
  daysUntilExDate: number;
  isUpcoming: boolean;
  status: 'Announced' | 'Projected' | 'Confirmed';
  frequency: 'Quarterly' | 'Semi-Annual' | 'Annual';
  estimatedQuarterlyPayout: number;
  estimatedAnnualPayout: number;
  percentOfTotalDividends: number;
  quarterlyDistribution: {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
  };
  monthlyDistribution: number[]; // 12 months (0-11 for Jan-Dec)
  payoutMonths: string[];
}

interface Props {
  holdings: PortfolioHolding[];
  onSelectTicker?: (ticker: string) => void;
}

// Known institutional dividend schedules for catalog assets (calibrated around November 2026)
const KNOWN_DIVIDEND_PROFILES: Record<string, {
  annualDps: number;
  yieldPct: number;
  freq: 'Quarterly' | 'Semi-Annual' | 'Annual';
  nextExDateStr: string;
  recordDateStr: string;
  paymentDateStr: string;
  payoutMonths: string[];
  payoutMonthIndices: number[]; // 0-indexed (0=Jan, 11=Dec)
  status: 'Announced' | 'Projected' | 'Confirmed';
}> = {
  'TCS.NS': {
    annualDps: 73.00,
    yieldPct: 1.73,
    freq: 'Quarterly',
    nextExDateStr: '2026-11-06',
    recordDateStr: '2026-11-07',
    paymentDateStr: '2026-11-20',
    payoutMonths: ['Jan', 'May', 'Jul', 'Nov'],
    payoutMonthIndices: [0, 4, 6, 10],
    status: 'Announced'
  },
  'AAPL': {
    annualDps: 1.04,
    yieldPct: 0.45,
    freq: 'Quarterly',
    nextExDateStr: '2026-11-07',
    recordDateStr: '2026-11-10',
    paymentDateStr: '2026-11-16',
    payoutMonths: ['Feb', 'May', 'Aug', 'Nov'],
    payoutMonthIndices: [1, 4, 7, 10],
    status: 'Announced'
  },
  'INFY.NS': {
    annualDps: 38.00,
    yieldPct: 1.98,
    freq: 'Semi-Annual',
    nextExDateStr: '2026-11-15',
    recordDateStr: '2026-11-16',
    paymentDateStr: '2026-11-28',
    payoutMonths: ['Jun', 'Nov'],
    payoutMonthIndices: [5, 10],
    status: 'Announced'
  },
  'ITC.NS': {
    annualDps: 13.75,
    yieldPct: 3.10,
    freq: 'Semi-Annual',
    nextExDateStr: '2026-11-18',
    recordDateStr: '2026-11-20',
    paymentDateStr: '2026-12-04',
    payoutMonths: ['Feb', 'Nov'],
    payoutMonthIndices: [1, 10],
    status: 'Announced'
  },
  'MSFT': {
    annualDps: 3.32,
    yieldPct: 0.75,
    freq: 'Quarterly',
    nextExDateStr: '2026-11-19',
    recordDateStr: '2026-11-20',
    paymentDateStr: '2026-12-10',
    payoutMonths: ['Mar', 'Jun', 'Sep', 'Dec'],
    payoutMonthIndices: [2, 5, 8, 11],
    status: 'Announced'
  },
  'JNJ': {
    annualDps: 4.96,
    yieldPct: 3.12,
    freq: 'Quarterly',
    nextExDateStr: '2026-11-24',
    recordDateStr: '2026-11-25',
    paymentDateStr: '2026-12-08',
    payoutMonths: ['Mar', 'Jun', 'Sep', 'Dec'],
    payoutMonthIndices: [2, 5, 8, 11],
    status: 'Announced'
  },
  'RELIANCE.NS': {
    annualDps: 10.00,
    yieldPct: 0.34,
    freq: 'Annual',
    nextExDateStr: '2026-11-26',
    recordDateStr: '2026-11-28',
    paymentDateStr: '2026-12-15',
    payoutMonths: ['Nov'],
    payoutMonthIndices: [10],
    status: 'Projected'
  },
  'KO': {
    annualDps: 1.94,
    yieldPct: 2.95,
    freq: 'Quarterly',
    nextExDateStr: '2026-11-30',
    recordDateStr: '2026-12-01',
    paymentDateStr: '2026-12-15',
    payoutMonths: ['Apr', 'Jul', 'Oct', 'Dec'],
    payoutMonthIndices: [3, 6, 9, 11],
    status: 'Announced'
  },
  'SBIN.NS': {
    annualDps: 13.70,
    yieldPct: 1.62,
    freq: 'Annual',
    nextExDateStr: '2026-12-02',
    recordDateStr: '2026-12-04',
    paymentDateStr: '2026-12-18',
    payoutMonths: ['Dec'],
    payoutMonthIndices: [11],
    status: 'Projected'
  },
  'NVDA': {
    annualDps: 0.04,
    yieldPct: 0.03,
    freq: 'Quarterly',
    nextExDateStr: '2026-12-04',
    recordDateStr: '2026-12-05',
    paymentDateStr: '2026-12-28',
    payoutMonths: ['Mar', 'Jun', 'Sep', 'Dec'],
    payoutMonthIndices: [2, 5, 8, 11],
    status: 'Announced'
  },
  'GOOGL': {
    annualDps: 0.80,
    yieldPct: 0.46,
    freq: 'Quarterly',
    nextExDateStr: '2026-12-09',
    recordDateStr: '2026-12-10',
    paymentDateStr: '2026-12-16',
    payoutMonths: ['Mar', 'Jun', 'Sep', 'Dec'],
    payoutMonthIndices: [2, 5, 8, 11],
    status: 'Projected'
  },
  'LT.NS': {
    annualDps: 28.00,
    yieldPct: 0.78,
    freq: 'Annual',
    nextExDateStr: '2026-12-10',
    recordDateStr: '2026-12-12',
    paymentDateStr: '2026-12-24',
    payoutMonths: ['Dec'],
    payoutMonthIndices: [11],
    status: 'Projected'
  },
  'META': {
    annualDps: 2.00,
    yieldPct: 0.35,
    freq: 'Quarterly',
    nextExDateStr: '2026-12-15',
    recordDateStr: '2026-12-16',
    paymentDateStr: '2026-12-26',
    payoutMonths: ['Mar', 'Jun', 'Sep', 'Dec'],
    payoutMonthIndices: [2, 5, 8, 11],
    status: 'Projected'
  },
  'JPM': {
    annualDps: 4.80,
    yieldPct: 2.20,
    freq: 'Quarterly',
    nextExDateStr: '2027-01-05',
    recordDateStr: '2027-01-06',
    paymentDateStr: '2027-01-31',
    payoutMonths: ['Jan', 'Apr', 'Jul', 'Oct'],
    payoutMonthIndices: [0, 3, 6, 9],
    status: 'Projected'
  },
  'HDFCBANK.NS': {
    annualDps: 19.50,
    yieldPct: 1.16,
    freq: 'Semi-Annual',
    nextExDateStr: '2027-01-14',
    recordDateStr: '2027-01-16',
    paymentDateStr: '2027-02-05',
    payoutMonths: ['Jan', 'Jul'],
    payoutMonthIndices: [0, 6],
    status: 'Projected'
  },
  'ICICIBANK.NS': {
    annualDps: 10.00,
    yieldPct: 0.88,
    freq: 'Semi-Annual',
    nextExDateStr: '2027-01-20',
    recordDateStr: '2027-01-22',
    paymentDateStr: '2027-02-10',
    payoutMonths: ['Jan', 'Jul'],
    payoutMonthIndices: [0, 6],
    status: 'Projected'
  }
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DividendCalendar: React.FC<Props> = ({ holdings, onSelectTicker }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [filterType, setFilterType] = useState<'ALL' | 'IMMINENT' | 'UPCOMING' | 'HIGH_YIELD' | 'NSE' | 'US'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartView, setChartView] = useState<'monthly' | 'quarterly' | 'asset'>('monthly');
  const [dripReinvest, setDripReinvest] = useState(true);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Compute dividend metrics per holding
  const dividendEvents: DividendEvent[] = useMemo(() => {
    // Current application calendar baseline: early November 2026
    const today = new Date('2026-11-03T00:00:00Z');

    const preliminaryList = holdings.map((h) => {
      const ticker = h.ticker;
      const isNse = ticker.endsWith('.NS');
      const currency: 'INR' | 'USD' = isNse ? 'INR' : 'USD';
      const currSym = isNse ? '₹' : '$';
      const currentPrice = h.currentPrice || h.avgBuyPrice || 100;
      const avgBuyPrice = h.avgBuyPrice || h.averageBuyPrice || currentPrice;
      const sharesHeld = h.quantity || 0;
      const positionValue = sharesHeld * currentPrice;

      const profile = KNOWN_DIVIDEND_PROFILES[ticker];
      let annualDps = 0;
      let yieldPct = 0;
      let freq: 'Quarterly' | 'Semi-Annual' | 'Annual' = 'Quarterly';
      let nextExDate = '2026-11-25';
      let recordDate = '2026-11-27';
      let paymentDate = '2026-12-10';
      let payoutMonths = ['Mar', 'Jun', 'Sep', 'Dec'];
      let payoutMonthIndices = [2, 5, 8, 11];
      let status: 'Announced' | 'Projected' | 'Confirmed' = 'Projected';

      if (profile) {
        annualDps = profile.annualDps;
        yieldPct = profile.yieldPct;
        freq = profile.freq;
        nextExDate = profile.nextExDateStr;
        recordDate = profile.recordDateStr;
        paymentDate = profile.paymentDateStr;
        payoutMonths = profile.payoutMonths;
        payoutMonthIndices = profile.payoutMonthIndices;
        status = profile.status;
      } else {
        // Realistic fallback derived from sector and market cap
        const sec = (h.sector || '').toLowerCase();
        if (sec.includes('tech') || sec.includes('software')) {
          yieldPct = 0.65;
        } else if (sec.includes('bank') || sec.includes('financ')) {
          yieldPct = 1.75;
        } else if (sec.includes('energy') || sec.includes('oil') || sec.includes('utilit')) {
          yieldPct = 3.20;
        } else if (sec.includes('consumer') || sec.includes('fmcg')) {
          yieldPct = 2.40;
        } else {
          yieldPct = 1.25;
        }
        annualDps = Number(((currentPrice * yieldPct) / 100).toFixed(2));
        freq = 'Quarterly';
        nextExDate = '2026-11-28';
        recordDate = '2026-11-30';
        paymentDate = '2026-12-14';
        payoutMonths = ['Mar', 'Jun', 'Sep', 'Dec'];
        payoutMonthIndices = [2, 5, 8, 11];
      }

      // Calculate days until ex-date
      const exDateObj = new Date(`${nextExDate}T00:00:00Z`);
      const diffTime = exDateObj.getTime() - today.getTime();
      const daysUntilExDate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isUpcoming = daysUntilExDate >= 0;

      // Yield on Cost (YoC): Annual DPS / Avg Buy Price * 100
      const yieldOnCostPct = avgBuyPrice > 0
        ? Number(((annualDps / avgBuyPrice) * 100).toFixed(2))
        : yieldPct;

      const payoutPerQuarter = freq === 'Quarterly'
        ? annualDps / 4
        : freq === 'Semi-Annual'
        ? annualDps / 2
        : annualDps / 4;

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

      // Monthly distribution array (12 elements)
      const monthlyDistribution = new Array(12).fill(0);
      const perOccurrence = estimatedAnnualPayout / Math.max(1, payoutMonthIndices.length);
      payoutMonthIndices.forEach((mIdx) => {
        monthlyDistribution[mIdx] += perOccurrence;
      });

      return {
        ticker,
        companyName: h.companyName || ticker,
        sharesHeld,
        currency,
        currSym,
        currentPrice,
        avgBuyPrice,
        positionValue,
        annualDividendPerShare: annualDps,
        dividendYieldPct: yieldPct,
        yieldOnCostPct,
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
        percentOfTotalDividends: 0, // will compute below
        quarterlyDistribution,
        monthlyDistribution,
        payoutMonths
      };
    });

    // Compute normalized total to assign percentOfTotalDividends
    const totalDivNorm = preliminaryList.reduce((acc, item) => {
      const rate = item.currency === 'INR' ? 1 / 85 : 1;
      return acc + item.estimatedAnnualPayout * rate;
    }, 0);

    return preliminaryList.map((item) => {
      const rate = item.currency === 'INR' ? 1 / 85 : 1;
      const normVal = item.estimatedAnnualPayout * rate;
      const pct = totalDivNorm > 0 ? Number(((normVal / totalDivNorm) * 100).toFixed(1)) : 0;
      return {
        ...item,
        percentOfTotalDividends: pct
      };
    });
  }, [holdings]);

  // Aggregate Portfolio Totals & Executive Statistics
  const summary = useMemo(() => {
    let totalUsdAnnual = 0;
    let totalInrAnnual = 0;
    let totalUsdQ4 = 0;
    let totalInrQ4 = 0;
    let totalPortfolioValUsd = 0;
    let totalPortfolioValInr = 0;
    let totalCostBasisUsd = 0;
    let totalCostBasisInr = 0;

    dividendEvents.forEach((d) => {
      if (d.currency === 'USD') {
        totalUsdAnnual += d.estimatedAnnualPayout;
        totalUsdQ4 += d.estimatedQuarterlyPayout;
        totalPortfolioValUsd += d.positionValue;
        totalCostBasisUsd += d.sharesHeld * d.avgBuyPrice;
      } else {
        totalInrAnnual += d.estimatedAnnualPayout;
        totalInrQ4 += d.estimatedQuarterlyPayout;
        totalPortfolioValInr += d.positionValue;
        totalCostBasisInr += d.sharesHeld * d.avgBuyPrice;
      }
    });

    // Unified normalized valuations (1 USD = 85 INR)
    const combinedValUsd = totalPortfolioValUsd + totalPortfolioValInr / 85;
    const combinedValInr = totalPortfolioValInr + totalUsdAnnual * 85;
    const combinedAnnualUsd = totalUsdAnnual + totalInrAnnual / 85;
    const combinedAnnualInr = totalInrAnnual + totalUsdAnnual * 85;
    const combinedCostUsd = totalCostBasisUsd + totalCostBasisInr / 85;

    const portfolioYieldPct = combinedValUsd > 0 ? (combinedAnnualUsd / combinedValUsd) * 100 : 0;
    const portfolioYieldOnCostPct = combinedCostUsd > 0 ? (combinedAnnualUsd / combinedCostUsd) * 100 : 0;
    const monthlyAverageInr = combinedAnnualInr / 12;
    const monthlyAverageUsd = combinedAnnualUsd / 12;

    // Upcoming events sorted by days to ex-date
    const upcomingEvents = [...dividendEvents]
      .filter((d) => d.daysUntilExDate >= 0)
      .sort((a, b) => a.daysUntilExDate - b.daysUntilExDate);

    const imminentEvents = upcomingEvents.filter((d) => d.daysUntilExDate <= 14);
    const nextUpcoming = upcomingEvents[0] || null;

    // Top income contributor
    const topContributor = [...dividendEvents].sort(
      (a, b) => b.percentOfTotalDividends - a.percentOfTotalDividends
    )[0] || null;

    return {
      totalUsdAnnual: Number(totalUsdAnnual.toFixed(2)),
      totalInrAnnual: Number(totalInrAnnual.toFixed(2)),
      totalUsdQ4: Number(totalUsdQ4.toFixed(2)),
      totalInrQ4: Number(totalInrQ4.toFixed(2)),
      combinedAnnualInr: Math.round(combinedAnnualInr),
      combinedAnnualUsd: Number(combinedAnnualUsd.toFixed(2)),
      monthlyAverageInr: Math.round(monthlyAverageInr),
      monthlyAverageUsd: Number(monthlyAverageUsd.toFixed(2)),
      portfolioYieldPct: Number(portfolioYieldPct.toFixed(2)),
      portfolioYieldOnCostPct: Number(portfolioYieldOnCostPct.toFixed(2)),
      upcomingEventsCount: upcomingEvents.length,
      imminentEvents,
      nextUpcoming,
      topContributor
    };
  }, [dividendEvents]);

  // Monthly Cash Inflow Timeline Data (Jan through Dec)
  const monthlyChartData = useMemo(() => {
    const monthlySums = new Array(12).fill(0);
    dividendEvents.forEach((d) => {
      const rate = d.currency === 'INR' ? 1 / 85 : 1;
      d.monthlyDistribution.forEach((val, mIdx) => {
        monthlySums[mIdx] += val * rate;
      });
    });

    return MONTH_NAMES.map((m, idx) => ({
      month: m,
      amount: Number(monthlySums[idx].toFixed(2)),
      amountInr: Math.round(monthlySums[idx] * 85),
      isCurrent: idx === 10 // November is current month
    }));
  }, [dividendEvents]);

  // Quarterly Cash Flow Chart Data
  const quarterlyChartData = useMemo(() => {
    let q1Usd = 0, q2Usd = 0, q3Usd = 0, q4Usd = 0;

    dividendEvents.forEach((d) => {
      const rate = d.currency === 'INR' ? 1 / 85 : 1;
      q1Usd += d.quarterlyDistribution.q1 * rate;
      q2Usd += d.quarterlyDistribution.q2 * rate;
      q3Usd += d.quarterlyDistribution.q3 * rate;
      q4Usd += d.quarterlyDistribution.q4 * rate;
    });

    return [
      { quarter: 'Q1 (Jan-Mar)', amount: Number(q1Usd.toFixed(2)), amountInr: Math.round(q1Usd * 85), status: 'Upcoming' },
      { quarter: 'Q2 (Apr-Jun)', amount: Number(q2Usd.toFixed(2)), amountInr: Math.round(q2Usd * 85), status: 'Projected' },
      { quarter: 'Q3 (Jul-Sep)', amount: Number(q3Usd.toFixed(2)), amountInr: Math.round(q3Usd * 85), status: 'Projected' },
      { quarter: 'Q4 (Oct-Dec)', amount: Number(q4Usd.toFixed(2)), amountInr: Math.round(q4Usd * 85), status: 'Active (Current)' }
    ];
  }, [dividendEvents]);

  // Asset Dividend Yield Ranking Chart Data
  const assetRankingChartData = useMemo(() => {
    return [...dividendEvents]
      .sort((a, b) => b.dividendYieldPct - a.dividendYieldPct)
      .slice(0, 8)
      .map((d) => ({
        ticker: d.ticker.replace('.NS', ''),
        fullName: d.ticker,
        yieldPct: d.dividendYieldPct,
        yocPct: d.yieldOnCostPct,
        annualIncomeUsd: d.currency === 'INR' ? Math.round(d.estimatedAnnualPayout / 85) : Math.round(d.estimatedAnnualPayout)
      }));
  }, [dividendEvents]);

  // Filtered List
  const filteredEvents = useMemo(() => {
    return dividendEvents.filter((d) => {
      const matchesSearch =
        d.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.companyName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterType === 'IMMINENT') return d.daysUntilExDate >= 0 && d.daysUntilExDate <= 14;
      if (filterType === 'UPCOMING') return d.daysUntilExDate >= 0 && d.daysUntilExDate <= 45;
      if (filterType === 'HIGH_YIELD') return d.dividendYieldPct >= 2.0;
      if (filterType === 'NSE') return d.currency === 'INR';
      if (filterType === 'US') return d.currency === 'USD';
      return true;
    });
  }, [dividendEvents, filterType, searchQuery]);

  // Export CSV Schedule
  const handleExportCSV = () => {
    try {
      const rows: string[] = [];
      rows.push(`# AlphaQuant Portfolio Dividend Yield & Cash Calendar Schedule`);
      rows.push(`# Exported: ${new Date().toISOString()}`);
      rows.push(`# Projected Annual Dividends: ₹${summary.combinedAnnualInr.toLocaleString()} (~$${summary.combinedAnnualUsd.toLocaleString()})`);
      rows.push(`# Portfolio Dividend Yield: ${summary.portfolioYieldPct}% | Yield on Cost: ${summary.portfolioYieldOnCostPct}%`);
      rows.push(``);
      rows.push([
        'Ticker',
        'Company_Name',
        'Shares_Held',
        'Currency',
        'Current_Price',
        'Avg_Buy_Price',
        'Annual_DPS',
        'Dividend_Yield_Pct',
        'Yield_On_Cost_Pct',
        'Frequency',
        'Next_Ex_Dividend_Date',
        'Record_Date',
        'Payment_Date',
        'Days_To_Ex_Date',
        'Status',
        'Est_Quarterly_Payout',
        'Est_Annual_Dividend_Income',
        'Share_Of_Total_Dividends_Pct'
      ].join(','));

      dividendEvents.forEach((d) => {
        rows.push([
          `"${d.ticker}"`,
          `"${d.companyName.replace(/"/g, '""')}"`,
          d.sharesHeld,
          d.currency,
          d.currentPrice,
          d.avgBuyPrice,
          d.annualDividendPerShare,
          `${d.dividendYieldPct}%`,
          `${d.yieldOnCostPct}%`,
          d.frequency,
          d.nextExDate,
          d.recordDate,
          d.paymentDate,
          d.daysUntilExDate,
          d.status,
          d.estimatedQuarterlyPayout,
          d.estimatedAnnualPayout,
          `${d.percentOfTotalDividends}%`
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
      {/* 1. Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                Dividend Yield &amp; Calendar
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-semibold">
                  Ex-Date Tracker
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tracks confirmed &amp; projected ex-dividend dates, record dates, and calculates total projected annual passive cash income for your current positions.
              </p>
            </div>
          </div>
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
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Exported Schedule</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-amber-500" />
                <span>Export Dividend Schedule (CSV)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Imminent Ex-Date Alert Ribbon (if any holdings within 14 days) */}
      {summary.imminentEvents.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <span className="font-bold text-amber-950 dark:text-amber-200 block text-xs sm:text-sm">
                Ex-Dividend Window Approaching ({summary.imminentEvents.length} {summary.imminentEvents.length === 1 ? 'Holding' : 'Holdings'})
              </span>
              <p className="text-amber-800 dark:text-amber-300/90 text-xs mt-0.5">
                To capture upcoming dividend payouts, shares must be purchased or held <strong>before</strong> the ex-date.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {summary.imminentEvents.map((evt) => (
              <div
                key={evt.ticker}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-amber-700/60 font-mono text-xs flex items-center gap-2 shadow-xs"
              >
                <span className="font-bold text-amber-600 dark:text-amber-400">{evt.ticker}</span>
                <span className="text-slate-500 dark:text-slate-400">Ex: {evt.nextExDate}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                  {evt.daysUntilExDate === 0 ? 'Today' : `in ${evt.daysUntilExDate}d`}
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  +{evt.currSym}{evt.estimatedQuarterlyPayout.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. KPI Telemetry Scorecards: Total Projected Annual Income & Yield */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs font-mono">
        {/* Card 1: Total Projected Annual Dividend Income */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 col-span-2 sm:col-span-2 lg:col-span-1">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block flex items-center justify-between">
            <span>Projected Annual Income</span>
            <Coins className="w-3.5 h-3.5 text-emerald-500" />
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {summary.totalInrAnnual > 0 ? `₹${summary.totalInrAnnual.toLocaleString()}` : `$${summary.totalUsdAnnual.toLocaleString()}`}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>Avg: ~₹{summary.monthlyAverageInr.toLocaleString()}/mo</span>
            {summary.totalUsdAnnual > 0 && <span>(${summary.totalUsdAnnual}/yr US)</span>}
          </div>
        </div>

        {/* Card 2: Weighted Dividend Yield */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block flex items-center justify-between">
            <span>Portfolio Yield</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-500 dark:text-amber-400 tabular-nums">
            {summary.portfolioYieldPct}%
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
            Current weighted yield
          </span>
        </div>

        {/* Card 3: Yield on Cost (YoC) */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block flex items-center justify-between">
            <span>Yield on Cost (YoC)</span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400 tabular-nums">
            {summary.portfolioYieldOnCostPct}%
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
            Return on original basis
          </span>
        </div>

        {/* Card 4: Next Imminent Ex-Date */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block flex items-center justify-between">
            <span>Next Ex-Date</span>
            <Clock className="w-3.5 h-3.5 text-purple-500" />
          </span>
          <div className="text-base sm:text-lg font-bold font-mono text-purple-600 dark:text-purple-400 truncate">
            {summary.nextUpcoming ? (
              <span>
                {summary.nextUpcoming.ticker.replace('.NS', '')}{' '}
                <span className="text-xs font-normal text-slate-500">
                  ({summary.nextUpcoming.daysUntilExDate === 0 ? 'Today' : `${summary.nextUpcoming.daysUntilExDate}d`})
                </span>
              </span>
            ) : (
              'None scheduled'
            )}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
            {summary.nextUpcoming ? `Ex: ${summary.nextUpcoming.nextExDate}` : 'All ex-dates passed'}
          </span>
        </div>

        {/* Card 5: Top Dividend Contributor */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 col-span-2 sm:col-span-2 lg:col-span-1">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block flex items-center justify-between">
            <span>Top Income Source</span>
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
          </span>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white truncate">
            {summary.topContributor ? summary.topContributor.ticker.replace('.NS', '') : 'N/A'}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold truncate">
            {summary.topContributor ? `${summary.topContributor.percentOfTotalDividends}% of total cash flow` : '—'}
          </span>
        </div>
      </div>

      {/* 4. Interactive Visualizations & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Cash Flow Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                {chartView === 'monthly' && 'Projected Monthly Dividend Cash Inflow (Jan – Dec)'}
                {chartView === 'quarterly' && 'Quarterly Dividend Cash Flow Projections'}
                {chartView === 'asset' && 'Dividend Yield & Yield on Cost by Position'}
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {chartView === 'monthly' && 'Scheduled cash distribution dates mapped across calendar months'}
                {chartView === 'quarterly' && 'Aggregated quarterly distributions normalized across holdings'}
                {chartView === 'asset' && 'Current Dividend Yield vs. Cost-Basis Yield on Cost (YoC)'}
              </span>
            </div>

            {/* View Switcher */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono">
              <button
                onClick={() => setChartView('monthly')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  chartView === 'monthly'
                    ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Monthly Timeline
              </button>
              <button
                onClick={() => setChartView('quarterly')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  chartView === 'quarterly'
                    ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Quarterly
              </button>
              <button
                onClick={() => setChartView('asset')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  chartView === 'asset'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Yield Ranking
              </button>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'monthly' ? (
                <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                  <XAxis dataKey="month" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} />
                  <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#090d16' : '#ffffff',
                      borderColor: isDark ? '#1e293b' : '#cbd5e1',
                      borderRadius: '10px',
                      fontSize: '11px',
                      color: isDark ? '#e2e8f0' : '#0f172a'
                    }}
                    formatter={(val: any, _name: any, item: any) => [
                      `$${val} (~₹${item.payload.amountInr.toLocaleString()})`,
                      'Projected Payout'
                    ]}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {monthlyChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isCurrent ? '#f59e0b' : '#06b6d4'}
                        opacity={entry.isCurrent ? 1 : 0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartView === 'quarterly' ? (
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
                    formatter={(val: any, _name: any, item: any) => [
                      `$${val} (~₹${item.payload.amountInr.toLocaleString()})`,
                      'Est. Distribution'
                    ]}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {quarterlyChartData.map((_entry, index) => (
                      <Cell
                        key={`cell-q-${index}`}
                        fill={index === 3 ? '#f59e0b' : '#10b981'}
                        opacity={0.9}
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={assetRankingChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                  <XAxis dataKey="ticker" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} />
                  <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#090d16' : '#ffffff',
                      borderColor: isDark ? '#1e293b' : '#cbd5e1',
                      borderRadius: '10px',
                      fontSize: '11px',
                      color: isDark ? '#e2e8f0' : '#0f172a'
                    }}
                    formatter={(val: any, name: any) => [`${val}%`, name === 'yieldPct' ? 'Current Yield' : 'Yield on Cost']}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={8} />
                  <Bar dataKey="yieldPct" name="Current Yield (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="yocPct" name="Yield on Cost (%)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* DRIP Reinvestment Power & Compound Simulator */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-display">
                <Sparkles className="w-4 h-4 text-purple-500" />
                DRIP Compounding Engine
              </span>
              <button
                onClick={() => setDripReinvest(!dripReinvest)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  dripReinvest
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {dripReinvest ? 'DRIP: ACTIVE' : 'DRIP: CASH'}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Dividend Reinvestment Plans (DRIP) automatically deploy cash payouts back into additional shares without friction, compounding position units.
            </p>
          </div>

          <div className="space-y-2.5 font-mono text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">1-Year Projected Compounding:</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                +{(summary.portfolioYieldPct * 0.9).toFixed(1)}% Shares
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">3-Year Compounded Yield:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{((summary.portfolioYieldPct * 3.4)).toFixed(1)}% Payout Exp.
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">5-Year Equity Expansion:</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
                +{((summary.portfolioYieldPct * 6.5)).toFixed(1)}% Extra Capital
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Filter & Search Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
            <Filter className="w-3.5 h-3.5" /> Filter Schedule:
          </span>
          {[
            { id: 'ALL', label: `All Holdings (${dividendEvents.length})` },
            { id: 'IMMINENT', label: `Imminent (< 14d) (${summary.imminentEvents.length})` },
            { id: 'UPCOMING', label: `Upcoming (< 45d)` },
            { id: 'HIGH_YIELD', label: 'Yield > 2.0%' },
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
            placeholder="Search holding or ticker..."
            className="w-full text-xs font-mono pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      {/* 6. Upcoming Ex-Dividend Dates & Payout Schedule Table */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-500" />
              Holding Dividend Ex-Date &amp; Cash Inflow Schedule
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Individual corporate actions, ex-dates, yield on cost, and projected recurring cash deposits
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
                <th className="py-3 px-4 font-medium font-sans">Asset &amp; Company</th>
                <th className="py-3 px-4 font-medium text-right">Shares Held</th>
                <th className="py-3 px-4 font-medium text-right">DPS / Yield</th>
                <th className="py-3 px-4 font-medium text-right">Yield on Cost</th>
                <th className="py-3 px-4 font-medium text-center">Ex-Dividend Date</th>
                <th className="py-3 px-4 font-medium text-center">Payment Date</th>
                <th className="py-3 px-4 font-medium text-right">Est. Quarterly Payout</th>
                <th className="py-3 px-4 font-medium text-right">Est. Annual Total</th>
                <th className="py-3 px-4 font-medium text-right">Income Share</th>
                <th className="py-3 px-4 font-medium text-center font-sans">Status</th>
                <th className="py-3 px-4 font-medium text-center font-sans">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                    <span>No matching dividend records found for the current filter criteria.</span>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => {
                  const isImminent = evt.daysUntilExDate >= 0 && evt.daysUntilExDate <= 14;
                  return (
                    <tr
                      key={evt.ticker}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isImminent ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Ticker & Name */}
                      <td className="py-3 px-4">
                        <div className="font-sans font-medium text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-cyan-600 dark:text-cyan-400">
                            {evt.ticker}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                            {evt.companyName}
                          </span>
                        </div>
                      </td>

                      {/* Shares Held */}
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        {evt.sharesHeld} shs
                      </td>

                      {/* DPS & Current Yield */}
                      <td className="py-3 px-4 text-right tabular-nums">
                        <div className="text-slate-900 dark:text-white font-bold">
                          {evt.currSym}{evt.annualDividendPerShare} /yr
                        </div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                          {evt.dividendYieldPct}% yield
                        </div>
                      </td>

                      {/* Yield on Cost */}
                      <td className="py-3 px-4 text-right tabular-nums">
                        <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                          {evt.yieldOnCostPct}%
                        </span>
                        <span className="text-[9px] text-slate-400 block font-normal">
                          YoC
                        </span>
                      </td>

                      {/* Ex-Dividend Date */}
                      <td className="py-3 px-4 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                          isImminent
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                            : 'bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800'
                        }`}>
                          <Clock className={`w-3 h-3 ${isImminent ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                          <span>{evt.nextExDate}</span>
                          {evt.daysUntilExDate >= 0 ? (
                            <span className={`text-[10px] font-bold ${isImminent ? 'text-amber-700 dark:text-amber-300' : 'text-cyan-600 dark:text-cyan-400'}`}>
                              ({evt.daysUntilExDate === 0 ? 'Today' : `${evt.daysUntilExDate}d`})
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
                      <td className="py-3 px-4 text-right text-slate-900 dark:text-white tabular-nums font-bold">
                        {evt.currSym}{evt.estimatedAnnualPayout.toLocaleString()}
                      </td>

                      {/* Income Share % */}
                      <td className="py-3 px-4 text-right tabular-nums text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {evt.percentOfTotalDividends}%
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold border ${
                          evt.status === 'Announced' || evt.status === 'Confirmed'
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
                            title={`Inspect ${evt.ticker} fundamentals & predictions`}
                          >
                            <span>Analyze</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
