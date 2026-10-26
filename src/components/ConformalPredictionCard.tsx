/**
 * USP 1: Conformal Prediction Card
 * Displays point estimate, 90% finite-sample prediction interval [Lower, Upper],
 * interval width, expected percentage change, and SHAP-style feature impact breakdown.
 * Fully supports dark and light modes.
 */

import React, { useState, useEffect } from 'react';
import { Target, HelpCircle, TrendingUp, TrendingDown, ShieldCheck, ChevronDown, ChevronUp, Award, BarChart2 } from 'lucide-react';
import { ConformalPrediction } from '../types';

interface Props {
  prediction: ConformalPrediction | null;
  currency: string;
  onRefresh?: () => void;
  onConfigChange?: (horizon: number, confidence: number) => void;
}

export const ConformalPredictionCard: React.FC<Props> = ({
  prediction,
  currency,
  onConfigChange
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showExplain, setShowExplain] = useState(true);
  const [selectedHorizon, setSelectedHorizon] = useState<number>(prediction?.horizonDays || 1);
  const [selectedConfidence, setSelectedConfidence] = useState<number>(prediction?.confidenceLevel || 0.90);

  useEffect(() => {
    if (prediction?.confidenceLevel) {
      setSelectedConfidence(prediction.confidenceLevel);
    }
    if (prediction?.horizonDays) {
      setSelectedHorizon(prediction.horizonDays);
    }
  }, [prediction?.confidenceLevel, prediction?.horizonDays]);

  if (!prediction) {
    return (
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 animate-pulse min-h-[260px] flex items-center justify-center">
        <span className="text-xs font-mono text-slate-500">Calculating Conformal Prediction Bounds...</span>
      </div>
    );
  }

  const isPositive = prediction.predictionChangePercent >= 0;
  const currSym = currency === 'INR' ? '₹' : '$';

  const handleHorizonSelect = (h: number) => {
    setSelectedHorizon(h);
    onConfigChange?.(h, selectedConfidence);
  };

  const handleConfidenceSelect = (c: number) => {
    setSelectedConfidence(c);
    onConfigChange?.(selectedHorizon, c);
  };

  const horizonLabels: Record<number, string> = {
    1: '1-Day Ahead',
    3: '3-Day Horizon',
    5: '5-Day (1 Week)',
    10: '10-Day (2 Weeks)',
    30: '30-Day (1 Month)'
  };

  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 lg:p-6 relative overflow-hidden shadow-xs hover:shadow-sm transition-all">
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200/90 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
            <Target className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              Conformal Prediction
              <button
                type="button"
                aria-label="Explain conformal prediction interval"
                onClick={() => setShowTooltip(!showTooltip)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {horizonLabels[prediction.horizonDays] || `${prediction.horizonDays}-Day Horizon`} · Split-Conformal Inference
            </span>
          </div>
        </div>

        {/* Accuracy and Coverage Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
            <Award className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Acc: {prediction.priceAccuracy != null ? `${prediction.priceAccuracy}%` : prediction.directionalAccuracy != null ? `${prediction.directionalAccuracy}%` : 'n/a'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-[11px] font-mono text-cyan-700 dark:text-cyan-300">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Coverage: {prediction.empiricalCoverage != null ? `${(prediction.empiricalCoverage * 100).toFixed(1)}%` : `${((prediction.confidenceLevel || 0.90) * 100).toFixed(0)}%`}</span>
          </div>
        </div>
      </div>

      {/* Interactive Controls Bar: Horizon & Confidence Sliders */}
      <div className="mb-4 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Horizon Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">Horizon:</span>
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded border border-slate-200 dark:border-slate-800">
            {[1, 3, 5, 10, 30].map(h => (
              <button
                key={h}
                onClick={() => handleHorizonSelect(h)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  (prediction.horizonDays || selectedHorizon) === h
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {h}D
              </button>
            ))}
          </div>
        </div>

        {/* Confidence Level Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">Confidence (1-α):</span>
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded border border-slate-200 dark:border-slate-800">
            {[0.80, 0.90, 0.95, 0.99].map(c => (
              <button
                key={c}
                onClick={() => handleConfidenceSelect(c)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  Math.abs((prediction.confidenceLevel || selectedConfidence) - c) < 0.01
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {(c * 100).toFixed(0)}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Uncertainty Tooltip Dropdown */}
      {showTooltip && (
        <div className="mb-4 p-3.5 bg-slate-50 dark:bg-slate-950 border border-cyan-200 dark:border-cyan-900/60 rounded-lg text-xs text-slate-700 dark:text-slate-300 space-y-2 animate-fadeIn">
          <div className="font-semibold text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4" />
            <span>How Conformal Prediction & Accuracy Work</span>
          </div>
          <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 space-y-1">
            <p>
              • <strong>Prediction Price Accuracy ({prediction.priceAccuracy != null ? `${prediction.priceAccuracy}%` : 'n/a'}):</strong> Evaluated on held-out actual stock prices (100% - MAPE).
            </p>
            <p>
              • <strong>Finite-Sample Coverage ({prediction.empiricalCoverage != null ? `${(prediction.empiricalCoverage * 100).toFixed(1)}%` : `${((prediction.confidenceLevel || 0.90) * 100).toFixed(0)}%`}):</strong> Observed fraction of validation actuals falling inside the conformal prediction interval for the nominal target of {((prediction.confidenceLevel || 0.90) * 100).toFixed(0)}%.
            </p>
            <p className="text-amber-600 dark:text-amber-400 font-mono text-[10px]">
              ⚠️ Prediction intervals reflect mathematical uncertainty bounds, not guaranteed financial profits.
            </p>
          </div>
        </div>
      )}

      {/* Main Prediction & Interval Display with Screen-Responsive Typography */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 p-4 sm:p-5 rounded-xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/80">
        {/* Point Estimate */}
        <div>
          <div className="text-[11px] sm:text-xs uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between flex-wrap gap-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>Predicted Target</span>
              {prediction.targetDateFormatted && (
                <span className="px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-[10px] font-bold normal-case tracking-normal">
                  📅 {prediction.targetDateFormatted} ({prediction.horizonDays}D)
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              Model Acc: {prediction.priceAccuracy != null ? `${prediction.priceAccuracy}%` : prediction.directionalAccuracy != null ? `${prediction.directionalAccuracy}%` : 'Analyzing...'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight text-slate-950 dark:text-white tabular-nums">
              {currSym}{prediction.predictedPrice.toLocaleString()}
            </span>
            <span
              className={`text-xs sm:text-sm font-mono font-bold flex items-center gap-0.5 tabular-nums ${
                isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {isPositive ? <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              {isPositive ? '+' : ''}{prediction.predictionChangePercent}%
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            vs current {currSym}{prediction.currentPrice.toLocaleString()}
          </div>
        </div>

        {/* Prediction Interval Envelope */}
        <div>
          <div className="text-[11px] uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>{(prediction.confidenceLevel * 100).toFixed(0)}% Prediction Interval</span>
            <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">
              Width: ±{(prediction.intervalWidthPercent / 2).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between font-mono text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1 tabular-nums">
            <span className="text-cyan-700 dark:text-cyan-400">{currSym}{prediction.lowerBound.toLocaleString()}</span>
            <span className="text-slate-400 dark:text-slate-600 font-sans text-xs">──────────</span>
            <span className="text-cyan-700 dark:text-cyan-400">{currSym}{prediction.upperBound.toLocaleString()}</span>
          </div>
          {/* Visual Bar representation */}
          <div className="w-full bg-slate-200 dark:bg-slate-800/80 rounded-full h-2 mt-2 relative overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-2 rounded-full opacity-90"
              style={{ width: '100%' }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>Lower ({(5 * (1 - prediction.confidenceLevel) * 10).toFixed(1)}th %ile)</span>
            <span>Upper ({(100 - 5 * (1 - prediction.confidenceLevel) * 10).toFixed(1)}th %ile)</span>
          </div>
        </div>
      </div>

      {/* Feature Explainability Section */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/60">
        <button
          onClick={() => setShowExplain(!showExplain)}
          className="w-full flex items-center justify-between text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors py-1 cursor-pointer"
        >
          <span className="font-semibold text-slate-800 dark:text-slate-300">Why is the model predicting this? (SHAP Feature Attributions)</span>
          {showExplain ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showExplain && prediction.topFeatures && (
          <div className="mt-3 space-y-2">
            {prediction.topFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/40"
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-800 dark:text-slate-300 font-medium">{feat.feature}</span>
                  <span className="text-[10px] text-slate-500 hidden sm:inline">{feat.description}</span>
                </div>
                <span
                  className={`font-mono text-xs font-semibold tabular-nums shrink-0 ${
                    feat.impact >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {feat.impact >= 0 ? `+${feat.impact}%` : `${feat.impact}%`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
