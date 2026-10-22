import React, { useState, useEffect } from 'react';
// ModelPerformancePage: renders genuine out-of-sample metrics with loading/error states and dynamic currency symbols.
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Zap,
  Award,
  Download,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { api } from '../services/api';
import { ModelEvaluation, StrategyPerformanceMetrics } from '../types';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { CompanySearchCombobox } from '../components/CompanySearchCombobox';
import { useTheme } from '../context/ThemeContext';

export const ModelPerformancePage: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'metrics' | 'strategy'>('metrics');
  const [ticker, setTicker] = useState('RELIANCE.NS');
  const [metrics, setMetrics] = useState<ModelEvaluation | null>(null);
  const [strategyType, setStrategyType] = useState<'conformal_reversion' | 'regime_momentum' | 'finbert_multimodal'>('conformal_reversion');
  const [strategyResult, setStrategyResult] = useState<StrategyPerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getModelMetrics(ticker);
      setMetrics(data);
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

  const currSym = ticker.endsWith('.NS') ? '₹' : '$';

  const handleExportAudit = () => {
    setIsExporting(true);
    try {
      const exportData = {
        platform: 'AlphaQuant AI Quantitative Intelligence',
        exportedAt: new Date().toISOString(),
        ticker,
        modelVersion: 'AlphaQuant Ridge Regression (8 Technical Factors)',
        evaluationType: 'Chronological Out-of-Sample Walk-Forward Backtest',
        accuracySummary: {
          directionalAccuracy: metrics?.directionalAccuracy != null ? `${metrics.directionalAccuracy}%` : 'n/a',
          conformalEmpiricalCoverage: metrics?.conformalCoverage != null ? `${metrics.conformalCoverage}%` : 'n/a',
          priceAccuracy: metrics?.priceAccuracy != null ? `${metrics.priceAccuracy}%` : 'n/a',
          mape: metrics?.mape != null ? `${metrics.mape}%` : 'n/a',
          r2Score: metrics?.r2 != null ? metrics.r2 : 'n/a',
          rmse: metrics?.rmse != null ? `${currSym}${metrics.rmse}` : 'n/a',
          mae: metrics?.mae != null ? `${currSym}${metrics.mae}` : 'n/a'
        },
        calibrationParameters: {
          methodology: 'Split-Conformal Inference with Ridge Regression Residual Calibration',
          featuresFused: ['EMA Fast/Slow Spread', 'Bollinger %B Reversion', 'MACD Momentum', 'RSI 14', 'ATR Volatility']
        },
        comparativeBaselines: metrics?.comparison || [],
        backtestSamplesCount: metrics?.backtestSeries?.length || 0,
        backtestSeries: metrics?.backtestSeries || []
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `AlphaQuant_Model_Audit_${ticker}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
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
            <span className="text-slate-400 dark:text-slate-500 uppercase text-[10px]">Quick:</span>
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
            onClick={handleExportAudit}
            disabled={isExporting || loading || !metrics}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{isExporting ? 'Exporting...' : 'Export Audit'}</span>
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
              Computing out-of-sample backtest metrics for {ticker}...
            </span>
          </div>
        ) : error || !metrics ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900/60 rounded-xl border border-rose-200 dark:border-rose-900/30 space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm text-rose-600 dark:text-rose-400 font-semibold">
              {error || `No metrics available for ${ticker}.`}
            </p>
            <button
              onClick={loadMetrics}
              className="px-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer font-medium"
            >
              Retry Evaluation
            </button>
          </div>
        ) : (
          <>
            {/* Primary Quantitative Performance Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">Price Accuracy</span>
                <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block tabular-nums">
                  {metrics.priceAccuracy != null ? `${metrics.priceAccuracy}%` : 'n/a'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">100% - MAPE</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">Conformal Coverage</span>
                <span className="text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-1 block tabular-nums">
                  {metrics.conformalCoverage != null ? `${metrics.conformalCoverage}%` : 'n/a'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">Empirical Coverage</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">R² Score (Variance)</span>
                <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-cyan-300 mt-1 block tabular-nums">
                  {metrics.r2 != null ? metrics.r2 : 'n/a'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">Out-of-sample fit</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">RMSE (Root Mean Sq)</span>
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 block tabular-nums">
                  {metrics.rmse != null ? `${currSym}${metrics.rmse}` : 'n/a'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">Penalizes spikes</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">MAE (Mean Abs Error)</span>
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 block tabular-nums">
                  {metrics.mae != null ? `${currSym}${metrics.mae}` : 'n/a'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">Average price error</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">MAPE (% Error)</span>
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 block tabular-nums">
                  {metrics.mape != null ? `${metrics.mape}%` : 'n/a'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">Scale-free error</span>
              </div>
            </div>

            {/* Model Accuracy & Uncertainty Audit Panel */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm text-xs space-y-2">
              <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Model Accuracy & Statistical Calibration Breakdown</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700 dark:text-slate-300 text-xs pt-1">
                <div className="p-3.5 rounded-lg bg-emerald-50/60 dark:bg-slate-950/60 border border-emerald-200/80 dark:border-slate-800/80 space-y-1">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-400 block font-mono text-xs">
                    1. Price Prediction Accuracy: {metrics.priceAccuracy != null ? `${metrics.priceAccuracy}%` : 'n/a'}
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    In out-of-sample forward walk-forward testing across {metrics.totalBacktestSamples} trading sessions, the model achieves an unscaled MAPE of <strong>{metrics.mape != null ? `${metrics.mape}%` : 'n/a'}</strong>. Daily point forecasts track the authentic closing price trajectory without lookahead bias.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-cyan-50/60 dark:bg-slate-950/60 border border-cyan-200/80 dark:border-slate-800/80 space-y-1">
                  <span className="font-semibold text-cyan-800 dark:text-cyan-400 block font-mono text-xs">
                    2. Conformal Interval Coverage: {metrics.conformalCoverage != null ? `${metrics.conformalCoverage}%` : 'n/a'}
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Across the test partition, the observed empirical test coverage is <strong>{metrics.conformalCoverage != null ? `${metrics.conformalCoverage}%` : 'n/a'}</strong>. This represents the fraction of actual closing prices falling strictly within the calculated interval bounds.
                  </p>
                </div>
              </div>
            </div>

            {/* Out-of-Sample Backtest Chart: Actual vs Predicted */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Out-of-Sample Backtest Series ({metrics.totalBacktestSamples} Trading Days)
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Actual Price vs Ridge Regression Predicted vs Conformal Uncertainty Envelope
                  </span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-mono">
                  {ticker}
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
                    <Line type="monotone" dataKey="actual" name="Actual Close" stroke={chartActualStroke} strokeWidth={2.2} dot={false} />
                    <Line type="monotone" dataKey="predicted" name="Ridge Regression Forecast" stroke="#06b6d4" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="upper" name="Upper Interval" stroke="#10b981" strokeWidth={1.2} strokeDasharray="2 2" dot={false} />
                    <Line type="monotone" dataKey="lower" name="Lower Interval" stroke="#10b981" strokeWidth={1.2} strokeDasharray="2 2" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Model Benchmark Comparison Table */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Benchmark Model Comparison Matrix</h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Evaluated on identical test partition using identical features
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
                          {currSym}{m.mae}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                          {currSym}{m.rmse}
                        </td>
                        <td className="py-3 px-4 text-right text-cyan-700 dark:text-cyan-300 font-bold tabular-nums">
                          {m.r2}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                          {m.directionalAccuracy}%
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
                { id: 'finbert_multimodal', label: 'Sentiment & Technical' }
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
