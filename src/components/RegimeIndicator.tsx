/**
 * RegimeIndicator Component
 * Displays the rule-based trend/volatility market regime (e.g., 'Low Volatility / Bullish',
 * 'Bullish Volatile', 'High Volatility / Bearish', 'Stable Bearish')
 * as a color-coded status badge with animated live pulse, posterior probability,
 * volatility classification, and institutional hover telemetry.
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertOctagon,
  Flame,
  Layers,
  Activity,
  Info,
  CheckCircle2
} from 'lucide-react';
import { MarketRegime } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface RegimeIndicatorProps {
  regime: MarketRegime | null;
  className?: string;
  compact?: boolean;
  showDetails?: boolean;
  onToggleOption?: () => void;
  isOptionActive?: boolean;
}

export const RegimeIndicator: React.FC<RegimeIndicatorProps> = ({
  regime,
  className = '',
  compact = false,
  showDetails = true,
  onToggleOption,
  isOptionActive = false
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  if (!regime) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-100 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 animate-pulse ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping" />
        <span>Detecting Regime...</span>
      </div>
    );
  }

  const rawName = regime.currentRegime || (regime.regimeId === 0 ? 'Bullish / Low Volatility' : 'Bearish / High Volatility');
  const lowerName = rawName.toLowerCase();
  const regimeName = regime.regimeId === 0 ? t('regime.bullish_low_vol') : t('regime.bearish_high_vol');

  // Classify regime type for colors and icons
  let theme = {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-300 dark:border-emerald-800/60',
    text: 'text-emerald-800 dark:text-emerald-300',
    dot: 'bg-emerald-500 shadow-emerald-500/50',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200',
    icon: TrendingUp,
    label: t('regime.bullish_low_vol'),
    description: 'Persistent upward drift with compressed volatility and reliable conformal intervals.'
  };

  if (lowerName.includes('bullish') && (lowerName.includes('volatile') || lowerName.includes('high vol'))) {
    theme = {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-300 dark:border-amber-800/60',
      text: 'text-amber-800 dark:text-amber-300',
      dot: 'bg-amber-500 shadow-amber-500/50',
      badgeBg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
      icon: Flame,
      label: 'Bullish / Volatile',
      description: 'Upward trend accompanied by elevated intraday variance and widened prediction bounds.'
    };
  } else if (lowerName.includes('bearish') && (lowerName.includes('stable') || lowerName.includes('low vol'))) {
    theme = {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      border: 'border-rose-300 dark:border-rose-800/60',
      text: 'text-rose-800 dark:text-rose-300',
      dot: 'bg-rose-500 shadow-rose-500/50',
      badgeBg: 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200',
      icon: TrendingDown,
      label: 'Bearish / Stable',
      description: 'Orderly persistent downward drift with controlled variance and negative drift conditioning.'
    };
  } else if (lowerName.includes('bearish') || lowerName.includes('high vol') || regime.regimeId === 1) {
    theme = {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      border: 'border-rose-300 dark:border-rose-800/60',
      text: 'text-rose-800 dark:text-rose-300',
      dot: 'bg-rose-500 shadow-rose-500/50',
      badgeBg: 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200',
      icon: AlertOctagon,
      label: 'Bearish / High Volatility',
      description: 'Elevated downside tail risk, violent swings, and widening conformal uncertainty bounds.'
    };
  } else if (lowerName.includes('neutral') || lowerName.includes('sideways')) {
    theme = {
      bg: 'bg-cyan-50 dark:bg-cyan-950/40',
      border: 'border-cyan-300 dark:border-cyan-800/60',
      text: 'text-cyan-800 dark:text-cyan-300',
      dot: 'bg-cyan-500 shadow-cyan-500/50',
      badgeBg: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200',
      icon: Layers,
      label: 'Mean-Reverting',
      description: 'Range-bound equilibrium with alternating mean-reverting swing dynamics.'
    };
  }

  const IconComponent = theme.icon;
  const probPct = Math.round((regime.regimeProbability || 0.85) * 100);
  const stabPct = Math.round((regime.stabilityScore || 0.82) * 100);
  const dwellDays = Math.max(2, Math.round(1 / (1 - (regime.stabilityScore || 0.8))));

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Badge Button / Capsule */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          onToggleOption?.();
        }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border shadow-xs cursor-pointer ${theme.bg} ${theme.border} ${theme.text} ${isOptionActive ? 'ring-2 ring-cyan-500 shadow-sm' : ''} hover:opacity-95 focus:outline-none`}
        aria-label={`Market Regime: ${regimeName}`}
        title={onToggleOption ? 'Click to toggle Rule-Based Market Regime module in analysis' : 'Rule-Based Trend/Volatility Regime Classifier'}
      >
        {/* Animated Pulse Indicator */}
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme.dot}`}
          />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${theme.dot}`} />
        </span>

        {/* Icon */}
        <IconComponent className="w-3.5 h-3.5 shrink-0" />

        {/* Regime Text */}
        <span className="font-bold tracking-tight whitespace-nowrap">
          {compact ? theme.label : regimeName}
        </span>

        {/* Probability / Confidence Pill */}
        {showDetails && (
          <span
            className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ml-0.5 whitespace-nowrap ${theme.badgeBg}`}
          >
            {probPct}% Conf
          </span>
        )}

        <Info className="w-3 h-3 opacity-60 ml-0.5 hidden sm:inline-block" />
      </button>

      {/* Hover / Click Flyout Tooltip Card */}
      {isOpen && (
        <div
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 z-50 w-72 sm:w-80 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-left animate-fadeIn font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${theme.badgeBg}`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                  Rule-Based Market Regime
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  State {regime.regimeId}: {regimeName}
                </span>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${theme.badgeBg}`}>
              {probPct}% Post.
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
            {theme.description}
          </p>

          {/* Quantitative Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 dark:bg-slate-950/70 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 mb-2.5">
            <div>
              <span className="text-[10px] text-slate-400 block">Stability / Persistence</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                {stabPct}%
              </span>
              <span className="text-[9px] text-slate-500">~{dwellDays}d expected dwell</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Volatility Profile</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                {regime.volatilityLevel || 'Normal'}
              </span>
              <span className="text-[9px] text-slate-500">20-Day Annualized</span>
            </div>
          </div>

          {/* Downstream Impact Notice */}
          <div className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
            <span>Conditioning input for conformal prediction bounds &amp; position sizing.</span>
          </div>
        </div>
      )}
    </div>
  );
};
