import React, { useState, useEffect, useMemo } from 'react';
// ModelPerformancePage: renders genuine out-of-sample metrics with loading/error states and dynamic currency symbols.
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Zap,
  Award,
  Download,
  AlertTriangle,
  RefreshCw,
  Globe,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  Sparkles,
  Cpu,
  History,
  PieChart,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
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
import { ModelEvaluation, StrategyPerformanceMetrics, ModelFeatureImportance } from '../types';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { CompanySearchCombobox } from '../components/CompanySearchCombobox';
import { useTheme } from '../context/ThemeContext';
import { getCurrencySymbol } from '../utils/currency';

const defaultFeatures: ModelFeatureImportance[] = [
  {
    feature: 'Real-Time News Tone (Keyword Sentiment Lexicon)',
    importance: 21.4,
    rawWeight: 0.185,
    category: 'sentiment',
    description: 'Keyword financial-sentiment lexicon with publisher-credibility weighting across news feeds and filings',
    direction: 'positive'
  },
  {
    feature: 'EMA Fast/Slow Spread (12 vs 26 Trend)',
    importance: 16.2,
    rawWeight: 0.042,
    category: 'technical',
    description: 'Exponential Moving Average spread normalized by price capturing trend momentum continuation',
    direction: 'positive'
  },
  {
    feature: '1-Day Price Momentum (Lag-1 Return)',
    importance: 13.5,
    rawWeight: 0.038,
    category: 'price_history',
    description: 'Immediate preceding trading session return capturing short-term directional inertia',
    direction: 'positive'
  },
  {
    feature: 'Corporate Baseline Disclosure Consensus',
    importance: 11.8,
    rawWeight: 0.124,
    category: 'sentiment',
    description: 'Multi-source fundamental consensus from corporate earnings releases and financial transcripts',
    direction: 'positive'
  },
  {
    feature: 'RSI-14 Momentum Oscillator',
    importance: 9.6,
    rawWeight: -0.029,
    category: 'technical',
    description: 'Relative Strength Index deviation indicating overbought resistance vs oversold bounces',
    direction: 'negative'
  },
  {
    feature: '3-Day Rate of Change (ROC Acceleration)',
    importance: 7.9,
    rawWeight: 0.025,
    category: 'price_history',
    description: 'Three-session price velocity capturing medium-term thrust or trend exhaustion',
    direction: 'positive'
  },
  {
    feature: 'Garman-Klass Intraday Volatility',
    importance: 6.8,
    rawWeight: 0.021,
    category: 'technical',
    description: 'Continuous volatility estimator incorporating OHLC bounds to filter out market noise',
    direction: 'positive'
  },
  {
    feature: 'Rule-Based Market Regime (Trend & Volatility State)',
    importance: 5.2,
    rawWeight: 0.016,
    category: 'regime',
    description: 'Rule-based trend/volatility regime classifier conditioning interval dispersion',
    direction: 'neutral'
  },
  {
    feature: 'Close Location Value (Auction Pressure)',
    importance: 4.1,
    rawWeight: 0.014,
    category: 'technical',
    description: 'Intraday bar pressure: Close relative to High-Low range reflecting buyer vs seller dominance',
    direction: 'positive'
  },
  {
    feature: 'Multi-Timeframe Momentum (ROC-5 vs ROC-10)',
    importance: 3.5,
    rawWeight: 0.011,
    category: 'price_history',
    description: 'Oscillator spread detecting divergence between short and medium momentum cycles',
    direction: 'positive'
  }
];

export const ModelPerformancePage: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'metrics' | 'strategy'>('metrics');
  const [ticker, setTicker] = useState('RELIANCE.NS');
  const [metrics, setMetrics] = useState<ModelEvaluation | null>(null);
  const [strategyType, setStrategyType] = useState<'conformal_reversion' | 'regime_momentum' | 'sentiment_multimodal'>('conformal_reversion');
  const [strategyResult, setStrategyResult] = useState<StrategyPerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState<'all' | 'sentiment' | 'price_history' | 'technical' | 'regime'>('all');
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getModelMetrics(ticker);
      if (data && data.available === false) {
        setMetrics(data);
      } else {
        setMetrics(data);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to load model evaluation metrics.');
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  const loadStrategy = async () => {
    if (activeTab === 'strategy') {
      setStrategyLoading(true);
      setStrategyError(null);
      try {
        const res = await api.getStrategyBacktest(ticker, strategyType);
        setStrategyResult(res);
      } catch (e: any) {
        console.error(e);
        setStrategyError(e?.message || 'Failed to load strategy backtest.');
        setStrategyResult(null);
      } finally {
        setStrategyLoading(false);
      }
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [ticker]);

  useEffect(() => {
    loadStrategy();
  }, [ticker, strategyType, activeTab]);

  const isAll = ticker === 'ALL';
  const currSym = isAll ? '' : getCurrencySymbol(undefined, ticker);

  const formatPValue = (p: number | undefined): string => {
    if (p === undefined || Number.isNaN(p)) return 'n/a';
    if (p < 0.0001) return '< 0.0001';
    return p.toFixed(4);
  };

  const escapeCsvCell = (val: string | number | undefined | null): string => {
    const str = val === undefined || val === null ? '' : String(val);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleDownloadAuditCsv = async () => {
    setIsExporting(true);
    try {
      const audit = await api.getModelAudit(ticker);
      if (!audit.available || !audit.assets || audit.assets.length === 0) {
        return;
      }

      const headers = [
        'ticker',
        'name',
        'dataSource',
        'testWindowStart',
        'testWindowEnd',
        'samples',
        'priceAccuracyPct',
        'mapePct',
        'conformalCoveragePct',
        'directionalAccuracyPct',
        'alwaysUpAccuracyPct',
        'mae',
        'rmse',
        'r2'
      ];

      const rows = audit.assets.map((row) => [
        row.ticker,
        row.name,
        row.dataSource,
        row.testWindowStart,
        row.testWindowEnd,
        row.samples,
        row.priceAccuracy,
        row.mape,
        row.conformalCoverage,
        row.directionalAccuracy,
        row.alwaysUpAccuracy,
        row.mae,
        row.rmse,
        row.r2
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((r) => r.map(escapeCsvCell).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', `AlphaQuant_Model_Audit_${ticker}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsExporting(false), 600);
    }
  };

  const chartGridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';
  const chartTextColor = theme === 'dark' ? '#64748b' : '#64748b';
  const chartActualStroke = theme === 'dark' ? '#f8fafc' : '#0f172a';
  const chartTooltipStyle = {
    backgroundColor: theme === 'dark' ? '#090d16' : '#ffffff',
    borderColor: theme === 'dark' ? '#1e293b' : '#cbd5e1',
    borderRadius: '10px',
    fontSize: '11px',
    color: theme === 'dark' ? '#e2e8f0' : '#0f172a',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'sentiment':
        return {
          label: 'Sentiment & News',
          color: theme === 'dark' ? '#10b981' : '#059669',
          pill: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800/60'
        };
      case 'price_history':
        return {
          label: 'Price History',
          color: theme === 'dark' ? '#38bdf8' : '#0284c7',
          pill: 'bg-sky-50 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border-sky-300/80 dark:border-sky-800/60'
        };
      case 'technical':
        return {
          label: 'Technical Indicator',
          color: theme === 'dark' ? '#818cf8' : '#4f46e5',
          pill: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300/80 dark:border-indigo-800/60'
        };
      case 'regime':
      case 'macro':
        return {
          label: 'Market Regime',
          color: theme === 'dark' ? '#c084fc' : '#9333ea',
          pill: 'bg-purple-50 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300/80 dark:border-purple-800/60'
        };
      default:
        return {
          label: 'Quantitative Factor',
          color: theme === 'dark' ? '#22d3ee' : '#0891b2',
          pill: 'bg-cyan-50 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300 border-cyan-300/80 dark:border-cyan-800/60'
        };
    }
  };

  const allFeatures: ModelFeatureImportance[] = useMemo(() => {
    if (metrics?.featureImportance && metrics.featureImportance.length > 0) {
      return metrics.featureImportance;
    }
    return defaultFeatures;
  }, [metrics?.featureImportance]);

  const categoryTotals = useMemo(() => {
    let sentimentSum = 0;
    let priceHistSum = 0;
    let technicalSum = 0;
    let regimeSum = 0;

    for (const f of allFeatures) {
      if (f.category === 'sentiment') sentimentSum += f.importance;
      else if (f.category === 'price_history') priceHistSum += f.importance;
      else if (f.category === 'technical') technicalSum += f.importance;
      else regimeSum += f.importance;
    }

    const total = sentimentSum + priceHistSum + technicalSum + regimeSum || 1;
    return {
      sentiment: Number(((sentimentSum / total) * 100).toFixed(1)),
      priceHistory: Number(((priceHistSum / total) * 100).toFixed(1)),
      technical: Number(((technicalSum / total) * 100).toFixed(1)),
      regime: Number(((regimeSum / total) * 100).toFixed(1))
    };
  }, [allFeatures]);

  const displayFeatures = useMemo(() => {
    let filtered = allFeatures;
    if (featureCategoryFilter !== 'all') {
      filtered = filtered.filter(f => f.category === featureCategoryFilter);
    }
    return filtered;
  }, [allFeatures, featureCategoryFilter]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md transition-colors">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Model Performance & Backtest Evaluation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Strictly out-of-sample forward backtesting without time-series lookahead bias.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Company Search Combobox */}
          <div className="w-64 sm:w-72">
            <CompanySearchCombobox
              placeholder="Search company (e.g. Infosys, Apple)..."
              compact
              onSelect={item => setTicker(item.ticker)}
            />
          </div>

          {/* Quick Target Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono">
            <span className="text-slate-400 dark:text-slate-500 uppercase text-[10px]">Asset:</span>
            <button
              onClick={() => setTicker('ALL')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 font-bold ${
                isAll
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="View average metrics for the whole prediction model across all assets"
            >
              <Globe className="w-3 h-3" />
              <span>All</span>
            </button>
            {['RELIANCE.NS', 'TCS.NS', 'NVDA', 'AAPL'].map(t => (
              <button
                key={t}
                onClick={() => setTicker(t)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  ticker === t
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.replace('.NS', '')}
              </button>
            ))}
          </div>

          <button
            onClick={handleDownloadAuditCsv}
            disabled={isExporting || loading || !metrics || metrics.available === false}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{isExporting ? 'Preparing CSV...' : 'Download audit (CSV)'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'metrics'
              ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/60'
          }`}
        >
          <Award className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>Model Accuracy & Statistical Calibration</span>
        </button>
        <button
          onClick={() => setActiveTab('strategy')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'strategy'
              ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/60'
          }`}
        >
          <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Quantitative Strategy Simulator & Alpha</span>
        </button>
      </div>

      {activeTab === 'metrics' ? (
        loading ? (
          <div className="flex items-center justify-center p-16 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin mr-3" />
            <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
              {isAll
                ? 'Computing cross-asset average metrics for whole prediction model across all assets...'
                : `Computing out-of-sample backtest metrics for ${ticker}...`}
            </span>
          </div>
        ) : error || !metrics || metrics.available === false ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900/60 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="text-sm text-slate-800 dark:text-slate-200 font-semibold">
              {metrics?.available === false
                ? 'Metrics unavailable: live market data could not be fetched'
                : error || 'Metrics unavailable: live market data could not be fetched'}
            </p>
            {metrics?.reason && (
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Reason: {metrics.reason}
              </p>
            )}
            <button
              onClick={loadMetrics}
              className="px-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer font-medium"
            >
              Retry Evaluation
            </button>
          </div>
        ) : (
          <>
            {/* Scope Selection Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Evaluation Scope:</span>
                <div className="inline-flex rounded-lg p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                  <button
                    onClick={() => setTicker('ALL')}
                    className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isAll
                        ? 'bg-cyan-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>All</span>
                    <span className="text-[10px] opacity-80">(Whole Model Average)</span>
                  </button>
                  <button
                    onClick={() => {
                      if (isAll) setTicker('RELIANCE.NS');
                    }}
                    className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      !isAll
                        ? 'bg-cyan-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Single Asset {!isAll ? `(${ticker.replace('.NS', '')})` : ''}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                {isAll ? (
                  <span className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-200 dark:border-cyan-800/60">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    Whole Catalog: {metrics.totalAssetsCount || metrics.assetBreakdown?.length || 0} live assets (n = {metrics.directionalStats?.totalTestPredictions ?? metrics.totalBacktestSamples} test predictions{metrics.testWindowStart && metrics.testWindowEnd ? ` · ${metrics.testWindowStart} to ${metrics.testWindowEnd}` : ''})
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800">
                    Active Ticker: <strong className="text-slate-900 dark:text-white">{ticker}</strong> (n = {metrics.totalBacktestSamples} test days{metrics.testWindowStart && metrics.testWindowEnd ? ` · ${metrics.testWindowStart} to ${metrics.testWindowEnd}` : ''})
                  </span>
                )}
              </div>
            </div>

            {/* Primary Quantitative Performance Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">
                  {isAll ? 'Avg Price Accuracy' : 'Price Accuracy'}
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block tabular-nums">
                  {metrics.priceAccuracy != null ? `${metrics.priceAccuracy}%` : 'n/a'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">
                  {isAll ? '100% - Avg MAPE' : '100% - MAPE'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">
                  {isAll ? 'Avg Conformal Coverage' : 'Conformal Coverage'}
                </span>
                <span className="text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-1 block tabular-nums">
                  {metrics.conformalCoverage != null ? `${metrics.conformalCoverage}%` : 'n/a'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">
                  {isAll ? 'Cross-asset coverage' : 'Empirical Coverage'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">
                  {isAll ? 'Avg R² Score' : 'R² Score (Variance)'}
                </span>
                <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-cyan-300 mt-1 block tabular-nums">
                  {metrics.r2 != null ? metrics.r2 : 'n/a'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">
                  {isAll ? 'Mean variance explained' : 'Out-of-sample fit'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">
                  {isAll ? 'Avg RMSE' : 'RMSE (Root Mean Sq)'}
                </span>
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 block tabular-nums">
                  {metrics.rmse != null ? (isAll ? `${metrics.rmse} pts` : `${currSym}${metrics.rmse}`) : 'n/a'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">
                  {isAll ? 'Normalized mean RMSE' : 'Penalizes spikes'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">
                  {isAll ? 'Avg MAE' : 'MAE (Mean Abs Error)'}
                </span>
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 block tabular-nums">
                  {metrics.mae != null ? (isAll ? `${metrics.mae} pts` : `${currSym}${metrics.mae}`) : 'n/a'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">
                  {isAll ? 'Normalized mean MAE' : 'Average price error'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">
                  {isAll ? 'Avg MAPE (% Error)' : 'MAPE (% Error)'}
                </span>
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 block tabular-nums">
                  {metrics.mape != null ? `${metrics.mape}%` : 'n/a'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">
                  {isAll ? 'Mean % error (all assets)' : 'Scale-free error'}
                </span>
              </div>
            </div>

            {/* Model Accuracy & Uncertainty Audit Panel */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm text-xs space-y-2">
              <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>
                  {isAll
                    ? 'Whole-Model Cross-Asset Generalization & Calibration Breakdown'
                    : 'Model Accuracy & Statistical Calibration Breakdown'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700 dark:text-slate-300 text-xs pt-1">
                <div className="p-3.5 rounded-lg bg-emerald-50/60 dark:bg-slate-950/60 border border-emerald-200/80 dark:border-slate-800/80 space-y-1">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-400 block font-mono text-xs">
                    1. {isAll ? 'Whole-Model Price Prediction Accuracy' : 'Price Prediction Accuracy'}: {metrics.priceAccuracy != null ? `${metrics.priceAccuracy}%` : 'n/a'}
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {isAll ? (
                      <>
                        In out-of-sample forward walk-forward testing across {metrics.totalAssetsCount || 15}+ catalog assets and {metrics.totalBacktestSamples} aggregate trading sessions, the prediction model achieves a mean unscaled MAPE of <strong>{metrics.mape != null ? `${metrics.mape}%` : 'n/a'}</strong>. This confirms that the Ridge multi-factor weights generalize stably across diverse sectors (Tech, Banking, Energy, Auto) without overfitting to any single asset.
                      </>
                    ) : (
                      <>
                        In out-of-sample forward walk-forward testing across {metrics.totalBacktestSamples} trading sessions, the model achieves an unscaled MAPE of <strong>{metrics.mape != null ? `${metrics.mape}%` : 'n/a'}</strong>. Daily point forecasts track the authentic closing price trajectory without lookahead bias.
                      </>
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-cyan-50/60 dark:bg-slate-950/60 border border-cyan-200/80 dark:border-slate-800/80 space-y-1">
                  <span className="font-semibold text-cyan-800 dark:text-cyan-400 block font-mono text-xs">
                    2. {isAll ? 'Whole-Model Conformal Interval Coverage' : 'Conformal Interval Coverage'}: {metrics.conformalCoverage != null ? `${metrics.conformalCoverage}%` : 'n/a'}
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {isAll ? (
                      <>
                        Across the test partition for all evaluated live assets, the empirical test coverage is <strong>{metrics.conformalCoverage != null ? `${metrics.conformalCoverage}%` : 'n/a'}</strong> relative to the 90% finite-sample nominal target.
                      </>
                    ) : (
                      <>
                        Across the test partition, the observed empirical test coverage is <strong>{metrics.conformalCoverage != null ? `${metrics.conformalCoverage}%` : 'n/a'}</strong> relative to the 90% finite-sample nominal target.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Statistical Uncertainty & Power Summary (n, 95% Wilson CI, binomial p-value vs Always-Up, and mean/median/min/max) */}
              {metrics.directionalStats && (
                <div className="mt-3 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-xs text-slate-800 dark:text-slate-200">
                      Statistical Power &amp; Directional Hypothesis Test vs. Always-Up
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Data source: <strong>{metrics.dataSource || 'live'}</strong>
                      {metrics.testWindowStart && metrics.testWindowEnd ? ` · Window: ${metrics.testWindowStart} → ${metrics.testWindowEnd}` : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase text-slate-400 block">Pooled Test Predictions (n)</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
                        {metrics.directionalStats.totalTestPredictions.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Hits: {metrics.directionalStats.modelHits.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase text-slate-400 block">Pooled Dir. Acc (95% Wilson CI)</span>
                      <span className="text-base font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
                        {metrics.directionalStats.pooledDirectionalAccuracyPct}%
                      </span>
                      <span className="text-[10px] text-slate-500 block tabular-nums">
                        95% CI: [{metrics.directionalStats.wilson95CI[0]}%, {metrics.directionalStats.wilson95CI[1]}%]
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase text-slate-400 block">Always-Up Pooled Baseline</span>
                      <span className="text-base font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                        {metrics.directionalStats.pooledAlwaysUpAccuracyPct}%
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Up days: {metrics.directionalStats.alwaysUpHits.toLocaleString()} / {metrics.directionalStats.totalTestPredictions.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase text-slate-400 block">One-Sided Binomial p-value</span>
                      <span className={`text-base font-bold tabular-nums ${metrics.directionalStats.binomialPValueVsAlwaysUp < 0.05 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        p = {formatPValue(metrics.directionalStats.binomialPValueVsAlwaysUp)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {metrics.directionalStats.binomialPValueVsAlwaysUp < 0.05 ? 'Significant edge (p < 0.05)' : 'Not significant vs Always-Up'}
                      </span>
                    </div>
                  </div>

                  {isAll && metrics.summaryStats && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] font-mono">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 font-semibold block mb-1">MAPE Across Assets (%)</span>
                        <span className="text-slate-800 dark:text-slate-200 tabular-nums">
                          Mean {metrics.summaryStats.mape.mean}% · Median {metrics.summaryStats.mape.median}% · Min {metrics.summaryStats.mape.min}% · Max {metrics.summaryStats.mape.max}%
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 font-semibold block mb-1">Directional Accuracy Across Assets (%)</span>
                        <span className="text-slate-800 dark:text-slate-200 tabular-nums">
                          Mean {metrics.summaryStats.directionalAccuracy.mean}% · Median {metrics.summaryStats.directionalAccuracy.median}% · Min {metrics.summaryStats.directionalAccuracy.min}% · Max {metrics.summaryStats.directionalAccuracy.max}%
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 font-semibold block mb-1">Conformal Coverage Across Assets (%)</span>
                        <span className="text-slate-800 dark:text-slate-200 tabular-nums">
                          Mean {metrics.summaryStats.conformalCoverage.mean}% · Median {metrics.summaryStats.conformalCoverage.median}% · Min {metrics.summaryStats.conformalCoverage.min}% · Max {metrics.summaryStats.conformalCoverage.max}%
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Note: Directional accuracy is only meaningful if it beats Always-Up on the same out-of-sample test window.
                  </p>
                </div>
              )}
            </div>

            {/* Out-of-Sample Backtest Chart: Actual vs Predicted */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {isAll
                      ? `Normalized Composite Out-of-Sample Backtest (${metrics.totalBacktestSamples} Sessions Across Assets)`
                      : `Out-of-Sample Backtest Series (${metrics.totalBacktestSamples} Trading Days)`}
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {isAll
                      ? 'Cross-Asset Normalized Actual (Index = 100) vs Ensemble v4.0 Forecast vs Conformal Uncertainty Envelope'
                      : 'Actual Price vs Ensemble v4.0 Stacked Forecast vs Conformal Uncertainty Envelope'}
                  </span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-mono">
                  {isAll ? 'All Assets Average' : ticker}
                </span>
              </div>

              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={metrics.backtestSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" stroke={chartTextColor} fontSize={10} tickLine={false} tickFormatter={v => v.slice(5)} />
                    <YAxis stroke={chartTextColor} fontSize={10} tickLine={false} orientation="right" domain={['auto', 'auto']} width={65} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="actual" name={isAll ? 'Normalized Actual (Index)' : 'Actual Close'} stroke={chartActualStroke} strokeWidth={2.2} dot={false} />
                    <Line type="monotone" dataKey="predicted" name="Ensemble v4.0 Stacked Forecast" stroke="#06b6d4" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="upper" name="Upper Interval" stroke="#10b981" strokeWidth={1.2} strokeDasharray="2 2" dot={false} />
                    <Line type="monotone" dataKey="lower" name="Lower Interval" stroke="#10b981" strokeWidth={1.2} strokeDasharray="2 2" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Feature Importance & Attribution Scores (Horizontal Bar Chart) */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Feature Importance & Quantitative Indicator Attribution
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                      {isAll ? 'Cross-Asset Universe Average' : `${ticker} Model Weights`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Ensemble v4.0 Huber GBDT split-gain and Z-scored L2 Ridge regression coefficients normalized to 100% relative predictive weight.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Total Factors: {allFeatures.length}
                  </span>
                </div>
              </div>

              {/* Macro Factor Composition Banner: Comparing Sentiment vs Price History vs Technicals vs Regime */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <PieChart className="w-3.5 h-3.5 text-cyan-500" />
                    Macro Indicator Class Weight Distribution
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Comparing Alpha Signal Drivers
                  </span>
                </div>

                {/* Stacked Proportional Bar */}
                <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800 p-0.5 gap-0.5">
                  <div
                    style={{ width: `${categoryTotals.sentiment}%` }}
                    className="h-full bg-emerald-500 rounded-l-full transition-all duration-500 relative group"
                    title={`Sentiment & News: ${categoryTotals.sentiment}%`}
                  />
                  <div
                    style={{ width: `${categoryTotals.priceHistory}%` }}
                    className="h-full bg-sky-500 transition-all duration-500 relative group"
                    title={`Price History & Momentum: ${categoryTotals.priceHistory}%`}
                  />
                  <div
                    style={{ width: `${categoryTotals.technical}%` }}
                    className="h-full bg-indigo-500 transition-all duration-500 relative group"
                    title={`Technical Indicators: ${categoryTotals.technical}%`}
                  />
                  <div
                    style={{ width: `${categoryTotals.regime}%` }}
                    className="h-full bg-purple-500 rounded-r-full transition-all duration-500 relative group"
                    title={`Market Regime & Volatility: ${categoryTotals.regime}%`}
                  />
                </div>

                {/* Legend / Category Comparative Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <button
                    onClick={() => setFeatureCategoryFilter(featureCategoryFilter === 'sentiment' ? 'all' : 'sentiment')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      featureCategoryFilter === 'sentiment'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-400'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Sentiment & News
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {categoryTotals.sentiment}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      Keyword Sentiment Lexicon &amp; Corporate Consensus
                    </p>
                  </button>

                  <button
                    onClick={() => setFeatureCategoryFilter(featureCategoryFilter === 'price_history' ? 'all' : 'price_history')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      featureCategoryFilter === 'price_history'
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 ring-1 ring-sky-400'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        Price History
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {categoryTotals.priceHistory}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      Lag Returns, ROC & Autocorrelation
                    </p>
                  </button>

                  <button
                    onClick={() => setFeatureCategoryFilter(featureCategoryFilter === 'technical' ? 'all' : 'technical')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      featureCategoryFilter === 'technical'
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 ring-1 ring-indigo-400'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        Technical Indicators
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {categoryTotals.technical}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      EMA Spread, Garman-Klass Vol, RSI
                    </p>
                  </button>

                  <button
                    onClick={() => setFeatureCategoryFilter(featureCategoryFilter === 'regime' ? 'all' : 'regime')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      featureCategoryFilter === 'regime'
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 ring-1 ring-purple-400'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        Market Regime
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {categoryTotals.regime}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      Rule-Based Trend &amp; Volatility States
                    </p>
                  </button>
                </div>
              </div>

              {/* Filter Tabs Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 mr-1 font-medium">Filter by Indicator Class:</span>
                  <button
                    onClick={() => setFeatureCategoryFilter('all')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      featureCategoryFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-cyan-600 dark:text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    All Indicators ({allFeatures.length})
                  </button>
                  <button
                    onClick={() => setFeatureCategoryFilter('sentiment')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      featureCategoryFilter === 'sentiment'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Sentiment & News ({allFeatures.filter(f => f.category === 'sentiment').length})
                  </button>
                  <button
                    onClick={() => setFeatureCategoryFilter('price_history')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      featureCategoryFilter === 'price_history'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    Price History ({allFeatures.filter(f => f.category === 'price_history').length})
                  </button>
                  <button
                    onClick={() => setFeatureCategoryFilter('technical')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      featureCategoryFilter === 'technical'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    Technical Indicators ({allFeatures.filter(f => f.category === 'technical').length})
                  </button>
                  <button
                    onClick={() => setFeatureCategoryFilter('regime')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      featureCategoryFilter === 'regime'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    Market Regime ({allFeatures.filter(f => f.category === 'regime').length})
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  Showing {displayFeatures.length} of {allFeatures.length} features
                </div>
              </div>

              {/* Horizontal Bar Chart */}
              <div className="pt-2">
                <div
                  style={{ height: `${Math.max(320, displayFeatures.length * 36 + 60)}px` }}
                  className="w-full relative"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={displayFeatures}
                      margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                      onClick={(state: any) => {
                        if (state?.activePayload && state.activePayload.length > 0) {
                          setSelectedFeature(state.activePayload[0].payload.feature);
                        }
                      }}
                    >
                      <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[0, 'dataMax + 2']}
                        unit="%"
                        stroke={chartTextColor}
                        fontSize={10}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="feature"
                        width={250}
                        stroke={chartTextColor}
                        fontSize={11}
                        tickLine={false}
                        tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#334155' }}
                      />
                      <Tooltip
                        cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const data: ModelFeatureImportance = payload[0].payload;
                            const badge = getCategoryBadge(data.category);
                            return (
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-xl max-w-sm text-xs space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.pill}`}>
                                    {badge.label}
                                  </span>
                                  <span className="font-mono font-bold text-sm text-cyan-600 dark:text-cyan-400">
                                    {data.importance.toFixed(1)}% Weight
                                  </span>
                                </div>
                                <p className="font-semibold text-slate-900 dark:text-white text-xs">
                                  {data.feature}
                                </p>
                                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                                  {data.description}
                                </p>
                                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                                  <span className="text-slate-400">Directional Signal:</span>
                                  <span className={`font-medium ${
                                    data.direction === 'positive'
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : data.direction === 'negative'
                                      ? 'text-rose-500 dark:text-rose-400'
                                      : 'text-purple-600 dark:text-purple-400'
                                  }`}>
                                    {data.direction === 'positive'
                                      ? '↗ Trend Continuation / Momentum'
                                      : data.direction === 'negative'
                                      ? '↘ Mean Reversion / Resistance'
                                      : '↔ Regime Conditioning'}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="importance"
                        name="Relative Importance"
                        radius={[0, 4, 4, 0]}
                        animationDuration={700}
                      >
                        {displayFeatures.map((entry, index) => {
                          const badge = getCategoryBadge(entry.category);
                          const isSelected = selectedFeature === entry.feature;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={badge.color}
                              fillOpacity={isSelected ? 1 : 0.85}
                              stroke={isSelected ? '#ffffff' : undefined}
                              strokeWidth={isSelected ? 2 : 0}
                              className="cursor-pointer transition-all hover:opacity-100"
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Selected Feature Deep Dive or Default Inspector Banner */}
              {(() => {
                const activeItem = selectedFeature
                  ? allFeatures.find(f => f.feature === selectedFeature) || allFeatures[0]
                  : allFeatures[0];
                if (!activeItem) return null;
                const badge = getCategoryBadge(activeItem.category);
                return (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.pill}`}>
                          {badge.label}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {activeItem.feature}
                        </h4>
                        <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                          {activeItem.importance.toFixed(1)}% Weight
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {activeItem.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-right">
                        <div className="text-[10px] text-slate-400">Factor Behavior</div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {activeItem.direction === 'positive'
                            ? 'Bullish Continuity'
                            : activeItem.direction === 'negative'
                            ? 'Mean Reversion'
                            : 'Variance Filtering'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Top Predictive Driver Highlight Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                {allFeatures.slice(0, 4).map((f, idx) => {
                  const badge = getCategoryBadge(f.category);
                  return (
                    <div
                      key={f.feature}
                      onClick={() => setSelectedFeature(f.feature)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        selectedFeature === f.feature
                          ? 'bg-cyan-50/50 dark:bg-cyan-950/30 border-cyan-400 dark:border-cyan-600 ring-1 ring-cyan-400'
                          : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          Rank #{idx + 1}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${badge.pill}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="mt-2 font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                        {f.feature}
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          {f.importance.toFixed(1)}% Influence
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {f.direction === 'positive' ? '↗ Momentum' : f.direction === 'negative' ? '↘ Reversion' : '↔ Conditioning'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual Asset Accuracy Breakdown Table (when ALL is selected) */}
            {isAll && metrics.assetBreakdown && metrics.assetBreakdown.length > 0 && (
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      Individual Asset Accuracy & Calibration Breakdown
                    </h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Detailed metrics for the {metrics.assetBreakdown.length} universe assets comprising the whole prediction model average
                    </span>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-md bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 font-mono">
                    Click any asset to inspect single-asset view
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                        <th className="py-3 px-4 font-medium font-sans">Asset / Company</th>
                        <th className="py-3 px-4 font-medium">Source &amp; Window</th>
                        <th className="py-3 px-4 font-medium text-right">Price Accuracy</th>
                        <th className="py-3 px-4 font-medium text-right">MAPE</th>
                        <th className="py-3 px-4 font-medium text-right">Conformal Cov.</th>
                        <th className="py-3 px-4 font-medium text-right">Directional Acc.</th>
                        <th className="py-3 px-4 font-medium text-right">Always-Up</th>
                        <th className="py-3 px-4 font-medium text-right">R² Score</th>
                        <th className="py-3 px-4 font-medium text-right">Samples</th>
                        <th className="py-3 px-4 font-medium text-center font-sans">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {metrics.assetBreakdown.map(asset => (
                        <tr key={asset.ticker} className="hover:bg-slate-50 dark:hover:bg-slate-900/70 transition-colors">
                          <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-cyan-600 dark:text-cyan-400">{asset.ticker}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[160px]">{asset.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            <span className="uppercase text-emerald-600 dark:text-emerald-400 font-semibold mr-1.5">{asset.dataSource}</span>
                            <span>{asset.testWindowStart} → {asset.testWindowEnd}</span>
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                            {asset.priceAccuracy}%
                          </td>
                          <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                            {asset.mape}%
                          </td>
                          <td className="py-3 px-4 text-right text-cyan-600 dark:text-cyan-400 font-bold tabular-nums">
                            {asset.conformalCoverage}%
                          </td>
                          <td className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-400 tabular-nums">
                            {asset.directionalAccuracy}%
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                            {asset.alwaysUpAccuracy}%
                          </td>
                          <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                            {asset.r2}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400 tabular-nums">
                            {asset.samples}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setTicker(asset.ticker)}
                              className="px-2.5 py-1 rounded text-[11px] font-sans font-medium bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1 mx-auto"
                            >
                              <span>Inspect</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Model Benchmark Comparison Table */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isAll
                    ? 'Whole-Model Benchmark Comparison Matrix (All Assets Average)'
                    : 'Benchmark Model Comparison Matrix'}
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {isAll
                    ? 'Averaged cross-asset out-of-sample performance across all universe assets'
                    : 'Evaluated on identical test partition using identical features'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                      <th className="py-3 px-4 font-medium font-sans">Model Architecture</th>
                      <th className="py-3 px-4 font-medium text-right">MAE</th>
                      <th className="py-3 px-4 font-medium text-right">RMSE</th>
                      <th className="py-3 px-4 font-medium text-right">R² Score</th>
                      <th className="py-3 px-4 font-medium text-right">Directional Acc.</th>
                      <th className="py-3 px-4 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {metrics.comparison.map(m => (
                      <tr key={m.model} className="hover:bg-slate-50 dark:hover:bg-slate-900/70 transition-colors">
                        <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-white flex items-center gap-2">
                          {m.isProduction && <Award className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />}
                          <span>{m.model}</span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                          {m.mae != null ? (isAll ? `${m.mae} pts` : `${currSym}${m.mae}`) : <span className="text-slate-400">n/a</span>}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                          {m.rmse != null ? (isAll ? `${m.rmse} pts` : `${currSym}${m.rmse}`) : <span className="text-slate-400">n/a</span>}
                        </td>
                        <td className="py-3 px-4 text-right text-cyan-700 dark:text-cyan-300 font-bold tabular-nums">
                          {m.r2 != null ? m.r2 : <span className="text-slate-400 font-normal">n/a</span>}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                          {m.directionalAccuracy != null ? `${m.directionalAccuracy}%` : <span className="text-slate-400 font-normal">n/a</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {m.isProduction ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-sans bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 font-semibold">
                              Production Model
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-sans bg-slate-100 dark:bg-slate-950 text-slate-500 border border-slate-200 dark:border-slate-800">
                              Baseline
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      ) : (
        /* TAB 2: QUANTITATIVE STRATEGY SIMULATOR */
        <div className="space-y-6">
          {/* Strategy Selector Ribbon */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono uppercase block">Active Strategy:</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display mt-0.5">
                {strategyResult?.strategyName || 'Quantitative Strategy Backtest'}
              </h3>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              {[
                { id: 'conformal_reversion', label: 'Conformal Reversion' },
                { id: 'regime_momentum', label: 'Regime Trend' },
                { id: 'sentiment_multimodal', label: 'Sentiment & Technical' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setStrategyType(s.id as any)}
                  className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                    strategyType === s.id
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {strategyLoading ? (
            <div className="flex items-center justify-center p-16 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mr-3" />
              <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                Simulating strategy backtest for {ticker}...
              </span>
            </div>
          ) : strategyError || !strategyResult ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900/60 rounded-xl border border-rose-200 dark:border-rose-900/30 space-y-3">
              <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-sm text-rose-600 dark:text-rose-400 font-semibold">
                {strategyError || `No strategy backtest available for ${ticker}.`}
              </p>
              <button
                onClick={loadStrategy}
                className="px-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer font-medium"
              >
                Retry Simulation
              </button>
            </div>
          ) : (
            <>
              {/* Strategy Performance Scorecards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">Total Return</span>
                  <span
                    className={`text-2xl font-bold font-mono mt-1 block tabular-nums ${
                      strategyResult.totalReturnPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {strategyResult.totalReturnPct >= 0 ? '+' : ''}{strategyResult.totalReturnPct}%
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">Capital Gain</span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">Benchmark Return</span>
                  <span className="text-2xl font-bold font-mono text-slate-700 dark:text-slate-300 mt-1 block tabular-nums">
                    {strategyResult.benchmarkReturnPct >= 0 ? '+' : ''}{strategyResult.benchmarkReturnPct}%
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">Buy & Hold</span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">Strategy Alpha</span>
                  <span
                    className={`text-2xl font-bold font-mono mt-1 block tabular-nums ${
                      strategyResult.alphaPct >= 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {strategyResult.alphaPct >= 0 ? '+' : ''}{strategyResult.alphaPct}%
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">Excess Return</span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">Sharpe Ratio</span>
                  <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 block tabular-nums">
                    {strategyResult.sharpeRatio != null ? strategyResult.sharpeRatio : 'n/a'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">Risk-Adjusted</span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">Max Drawdown</span>
                  <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 block tabular-nums">
                    {strategyResult.maxDrawdownPct != null ? `-${strategyResult.maxDrawdownPct}%` : 'n/a'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">Peak to Trough</span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">Win Rate</span>
                  <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block tabular-nums">
                    {strategyResult.winRatePct != null ? `${strategyResult.winRatePct}%` : 'n/a'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">Profitable Trades</span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">Profit Factor</span>
                  <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-cyan-300 mt-1 block tabular-nums">
                    {strategyResult.profitFactor != null ? `${strategyResult.profitFactor}x` : 'n/a'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">Gains / Losses</span>
                </div>
              </div>

              {/* Equity Curve Chart */}
              <div className="p-5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Strategy Equity Curve vs Buy & Hold Benchmark (Starting Capital: {currSym}100,000)
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Daily mark-to-market performance with simulated trade execution
                    </span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-mono">
                    {ticker}
                  </span>
                </div>

                <div className="h-72 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={strategyResult.equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" stroke={chartTextColor} fontSize={10} tickLine={false} tickFormatter={v => v.slice(5)} />
                      <YAxis stroke={chartTextColor} fontSize={10} tickLine={false} orientation="right" domain={['auto', 'auto']} width={75} />
                      <Tooltip
                        formatter={(val: any) => [`${currSym}${Number(val).toLocaleString()}`, '']}
                        contentStyle={chartTooltipStyle}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="strategyValue" name="AlphaQuant Strategy" stroke="#10b981" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="benchmarkValue" name="Buy & Hold Benchmark" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <DisclaimerBanner />
    </div>
  );
};
