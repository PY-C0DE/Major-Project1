/**
 * AnimatedQuantCard
 * Inspired directly by modern motion design showcase (acme AI video & animated search pill).
 * Features:
 * 1. Frosted glassmorphism card with ambient glow and clean display wordmark
 * 2. Morphing AI insight bubble with smooth fluid height transition, fade & spring motion
 * 3. Interactive feedback toolbar: Thumbs up, thumbs down, copy with toast, refresh/cycle, more
 * 4. Glassy pill command bar with animated typewriter query, paperclip, "+", and shimmering "Ask AI" button
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  RotateCw,
  MoreHorizontal,
  Plus,
  Paperclip,
  ArrowUpRight,
  Target,
  Zap,
  ActivitySquare,
  FileSpreadsheet,
  CheckCircle2,
  Sliders,
  TrendingUp,
  ShieldCheck,
  Cpu
} from 'lucide-react';

interface InsightItem {
  id: string;
  category: string;
  ticker: string;
  text: string;
  metric: string;
  delta: string;
  confidence: string;
  regime: string;
}

const INSIGHTS: InsightItem[] = [
  {
    id: 'conformal-nvda',
    category: 'Split-Conformal Prediction Interval',
    ticker: 'NVDA',
    text: 'Split-conformal prediction interval calibrated using non-parametric residuals on historical market prices. The finite-sample interval bounds the forward forecast at calibrated coverage, quantifying downside risk.',
    metric: '90% Coverage',
    delta: '+3.15%',
    confidence: 'Calibrated coverage',
    regime: 'Trending'
  },
  {
    id: 'regime-nifty',
    category: 'Market Regime Classifier',
    ticker: 'NIFTY 50',
    text: 'Rule-based regime classifier identifies an 89.4% stability score in Regime 0 (Low Volatility / Bullish Momentum). The transition probabilities confirm state persistence, indicating favorable risk-reward for systematic long strategies.',
    metric: 'Regime 0: Bullish',
    delta: '+0.85%',
    confidence: '89.4% transition stability',
    regime: 'Low-Vol Momentum'
  },
  {
    id: 'sentiment-reliance',
    category: 'Keyword Sentiment & Credibility',
    ticker: 'RELIANCE.NS',
    text: 'Keyword sentiment analyzer processed corporate disclosures and market filings with domain reputation weighting. Net sentiment scored +0.92 polarity with zero concept drift detected across two-sample Kolmogorov-Smirnov distribution tests.',
    metric: 'Polarity: +0.92',
    delta: '+2.61%',
    confidence: 'p=0.412 drift-safe',
    regime: 'Fundamental Breakout'
  },
  {
    id: 'mvo-portfolio',
    category: 'Markowitz MVO Efficient Frontier',
    ticker: 'PORTFOLIO',
    text: 'Mean-Variance Optimization engine rebalances asset vectors. Shifting 4.5% from concentrated mega-cap tech into defensive energy assets elevates portfolio Sharpe ratio from 1.62 to 2.14 while compressing maximum historic drawdown by 3.8%.',
    metric: 'Sharpe 2.14',
    delta: '+18.4% return',
    confidence: '99.9% quadratic convergence',
    regime: 'Optimized Allocation'
  },
  {
    id: 'ks-drift-tcs',
    category: 'Two-Sample KS Concept Drift Guard',
    ticker: 'TCS.NS',
    text: 'Automated Kolmogorov-Smirnov two-sample test (scipy.stats.ks_2samp) evaluated 30-day inference window versus 252-day training distribution. Statistic D=0.084 (p=0.620) confirms distribution stationarity with active automated fail-safes intact.',
    metric: 'D = 0.084 (p=0.620)',
    delta: '+0.95%',
    confidence: 'Distribution Stationarity Confirmed',
    regime: 'In-Bounds Steady'
  }
];

const SEARCH_PROMPTS = [
  'What is NVDA 90% conformal risk bound?',
  'Analyze market regime for Reliance...',
  'Scan market news for keyword sentiment...',
  'Rebalance portfolio for maximum Sharpe...',
  'Verify KS concept drift on NIFTY index...'
];

const QUICK_TEMPLATES = [
  { label: 'Calculate 90% Conformal Bounds', prompt: 'Compute finite-sample 90% confidence envelope for active tickers', target: 0 },
  { label: 'Run Regime State Detection', prompt: 'Identify rule-based market regime and transition probabilities', target: 1 },
  { label: 'Analyze News Sentiment & Claims', prompt: 'Analyze corporate news sentiment and publisher credibility', target: 2 },
  { label: 'Rebalance Markowitz Frontier', prompt: 'Solve quadratic optimization for highest Sharpe ratio allocation', target: 3 },
  { label: 'Run Two-Sample KS Drift Audit', prompt: 'Audit feature stationarity using Kolmogorov-Smirnov hypothesis test', target: 4 }
];

interface Props {
  onSelectPrompt?: (prompt: string) => void;
  onExploreTicker?: (ticker: string) => void;
}

export const AnimatedQuantCard: React.FC<Props> = ({ onSelectPrompt, onExploreTicker }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [attachToast, setAttachToast] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Typewriter state for search command bar (matching Video 2)
  const [promptIndex, setPromptIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const currentInsight = INSIGHTS[currentIndex];

  // Cycle to next insight with smooth loading animation
  const handleNextInsight = (targetIdx?: number) => {
    setIsRotating(true);
    setIsGenerating(true);
    setTimeout(() => {
      if (typeof targetIdx === 'number') {
        setCurrentIndex(targetIdx);
      } else {
        setCurrentIndex(prev => (prev + 1) % INSIGHTS.length);
      }
      setIsGenerating(false);
      setIsRotating(false);
      setLiked(null);
    }, 450);
  };

  // Copy insight text
  const handleCopy = () => {
    navigator.clipboard.writeText(currentInsight.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Attachment click handler
  const handleAttach = () => {
    setAttachToast('Telemetry dataset attached (252-day OHLCV + Sentiment vector)');
    setTimeout(() => setAttachToast(null), 3000);
  };

  // Typewriter effect loop
  useEffect(() => {
    if (isFocused || customInput) return;

    const fullPrompt = SEARCH_PROMPTS[promptIndex];
    const typingSpeed = isDeleting ? 25 : 55;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (typedText.length < fullPrompt.length) {
          setTypedText(fullPrompt.slice(0, typedText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2400);
        }
      } else {
        if (typedText.length > 0) {
          setTypedText(fullPrompt.slice(0, typedText.length - 1));
        } else {
          setIsDeleting(false);
          setPromptIndex(prev => (prev + 1) % SEARCH_PROMPTS.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, promptIndex, isFocused, customInput]);

  const handlePromptSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = customInput.trim() || typedText || SEARCH_PROMPTS[promptIndex];
    onSelectPrompt?.(query);
    handleNextInsight();
    setCustomInput('');
  };

  return (
    <div className="relative w-full max-w-xl mx-auto select-none">
      {/* Ambient background glow orbs */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500/25 via-indigo-500/20 to-emerald-500/25 rounded-3xl blur-2xl opacity-75 dark:opacity-60 pointer-events-none animate-pulseGlow" />

      {/* Main Glassmorphic Card Container (Matching Video 1) */}
      <div className="relative rounded-3xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 p-5 sm:p-7 shadow-2xl transition-all duration-300 hover:shadow-cyan-500/10">
        
        {/* Attachment Toast */}
        <AnimatePresence>
          {attachToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-cyan-900 text-cyan-100 text-[11px] font-mono flex items-center gap-1.5 shadow-lg border border-cyan-700/80"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300" />
              <span>{attachToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header: Brand wordmark & live telemetry badge */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            {/* Stylized acme AI / alphaquant AI Wordmark with animated glow */}
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => handleNextInsight()}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30 group-hover:scale-105 transition-transform">
                <Zap className="w-4 h-4 fill-white text-white" />
              </div>
              <span className="text-xl sm:text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white flex items-baseline gap-1">
                <span>alphaquant</span>
                <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50">
                  AI
                </span>
              </span>
            </div>
          </div>

          {/* Live Engine Indicator */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time v2.1</span>
            </span>
          </div>
        </div>

        {/* Morphing Message Bubble (Direct replica of Video 1's animated insight box) */}
        <div className="my-5">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="generating"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="relative rounded-2xl bg-gradient-to-br from-cyan-50/80 via-indigo-50/60 to-purple-50/80 dark:from-cyan-950/40 dark:via-indigo-950/30 dark:to-purple-950/40 border border-cyan-200/80 dark:border-cyan-800/40 p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-3 min-h-[160px]"
              >
                <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-mono text-xs font-semibold">
                  <Cpu className="w-4 h-4 animate-spin" />
                  <span>Computing 90% Conformal Envelope & HMM Regimes...</span>
                </div>
                <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-indigo-500 animate-shimmer" />
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Calibrating out-of-sample residuals
                </span>
              </motion.div>
            ) : (
              <motion.div
                key={currentInsight.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="relative rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-cyan-50/70 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-cyan-950/30 border border-indigo-100/90 dark:border-indigo-900/40 p-4.5 sm:p-5.5 shadow-sm overflow-hidden"
              >
                {/* Subtle top indicator bar */}
                <div className="flex items-center justify-between gap-2 mb-3 text-[11px] font-mono">
                  <span className="font-semibold text-indigo-700 dark:text-cyan-300 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>{currentInsight.category}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900/80 font-bold text-slate-800 dark:text-slate-200 border border-indigo-200/60 dark:border-indigo-800/50">
                      {currentInsight.ticker}
                    </span>
                    <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-cyan-100/60 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 font-sans">
                      {currentInsight.regime}
                    </span>
                  </div>
                </div>

                {/* Main Morphing Narrative Text */}
                <p className="text-sm sm:text-[15px] leading-relaxed text-slate-800 dark:text-slate-100 font-sans tracking-tight font-normal">
                  {currentInsight.text}
                </p>

                {/* Metric Highlights Pill inside Bubble */}
                <div className="mt-4 pt-3 border-t border-indigo-200/50 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {currentInsight.metric}
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-100/70 dark:bg-emerald-950/60">
                      {currentInsight.delta}
                    </span>
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
                    {currentInsight.confidence}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Toolbar Below Speech Bubble (Exact replica of Video 1) */}
          <div className="flex items-center justify-between mt-3 px-1 text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Thumbs Up */}
              <button
                onClick={() => setLiked(liked === true ? null : true)}
                title="Helpful insight"
                aria-label="Thumbs Up"
                className={`p-1.5 rounded-lg transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  liked === true
                    ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 scale-110'
                    : 'hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>

              {/* Thumbs Down */}
              <button
                onClick={() => setLiked(liked === false ? null : false)}
                title="Not helpful"
                aria-label="Thumbs Down"
                className={`p-1.5 rounded-lg transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  liked === false
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 scale-110'
                    : 'hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>

              {/* Copy to Clipboard with Toast */}
              <button
                onClick={handleCopy}
                title="Copy insight"
                aria-label="Copy insight"
                className="p-1.5 rounded-lg hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500 animate-scaleIn" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied && (
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-mono bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-2 py-0.5 rounded shadow animate-fadeIn whitespace-nowrap">
                    Copied!
                  </span>
                )}
              </button>

              {/* Refresh / Next Insight */}
              <button
                onClick={() => handleNextInsight()}
                title="Cycle to next quantitative scenario"
                aria-label="Refresh insight"
                className="p-1.5 rounded-lg hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RotateCw className={`w-4 h-4 transition-transform duration-500 ${isRotating ? 'rotate-180' : ''}`} />
              </button>

              {/* More Options */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(prev => !prev)}
                  title="More actions"
                  aria-label="More actions"
                  className="p-1.5 rounded-lg hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                    <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-30 text-xs animate-fadeIn text-slate-700 dark:text-slate-200">
                      <button
                        onClick={() => {
                          onExploreTicker?.(currentInsight.ticker);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                      >
                        <span>Deep Analysis on {currentInsight.ticker}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button
                        onClick={() => {
                          handleNextInsight();
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                      >
                        <span>Next Scenario</span>
                        <span className="text-[10px] text-slate-400 font-mono">⌘N</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Pagination indicator dots with smooth spring width expansion */}
            <div className="flex items-center gap-1.5">
              {INSIGHTS.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => handleNextInsight(idx)}
                  aria-label={`View scenario ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    currentIndex === idx
                      ? 'w-6 bg-cyan-500 shadow-sm shadow-cyan-500/50'
                      : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Animated Glassy Search / Command Bar (Matching Video 1 & Video 2) */}
        <form onSubmit={handlePromptSubmit} className="relative mt-5">
          <div className="relative flex items-center rounded-full bg-slate-100/95 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800/90 shadow-sm px-3.5 py-2 transition-all duration-200 focus-within:border-cyan-500/80 focus-within:ring-2 focus-within:ring-cyan-500/20 backdrop-blur-md">
            
            {/* Left Controls: Plus + Attachment (Matching Video 1) */}
            <div className="relative flex items-center gap-1 text-slate-400 dark:text-slate-500 mr-2 shrink-0">
              {/* Plus Button with Template Prompt Picker */}
              <button
                type="button"
                onClick={() => setShowPlusMenu(prev => !prev)}
                title="Select Quantitative Scenario"
                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Plus Menu Popover */}
              {showPlusMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowPlusMenu(false)} />
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-40 text-xs text-slate-700 dark:text-slate-200 animate-fadeIn">
                    <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      Quantitative Scenarios
                    </div>
                    {QUICK_TEMPLATES.map(tpl => (
                      <button
                        key={tpl.label}
                        type="button"
                        onClick={() => {
                          handleNextInsight(tpl.target);
                          setShowPlusMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-950/40 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-medium truncate">{tpl.label}</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Paperclip button */}
              <button
                type="button"
                onClick={handleAttach}
                title="Attach market telemetry dataset"
                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Animated Typewriter Input Field (Matching Video 2) */}
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder=""
                className="w-full bg-transparent text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none placeholder-transparent"
              />

              {/* Animated Typewriter Placeholder overlay when empty */}
              {!customInput && (
                <div
                  onClick={() => setIsFocused(true)}
                  className="absolute inset-0 flex items-center pointer-events-none text-xs sm:text-sm text-slate-400 dark:text-slate-500 truncate"
                >
                  <span>{typedText}</span>
                  <span className="inline-block w-0.5 h-4 bg-cyan-500 dark:bg-cyan-400 ml-0.5 animate-blink" />
                </div>
              )}
            </div>

            {/* Ask AI Sparkles Pill Button (Matching Video 1) */}
            <button
              type="submit"
              className="ml-2 shrink-0 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-cyan-500/20 cursor-pointer transition-transform hover:scale-[1.03] active:scale-[0.98] animate-shimmer"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span>Ask AI</span>
            </button>
          </div>
        </form>

        {/* Quick prompt tag pills below bar with animated click-to-load */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
          <span className="text-slate-400">Scenarios:</span>
          {[
            { tag: 'NVDA Conformal', idx: 0 },
            { tag: 'Market Regime', idx: 1 },
            { tag: 'Sentiment Score', idx: 2 },
            { tag: 'MVO Frontier', idx: 3 },
            { tag: 'KS Drift Test', idx: 4 }
          ].map(item => (
            <button
              key={item.tag}
              type="button"
              onClick={() => handleNextInsight(item.idx)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-cyan-50 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors cursor-pointer hover:scale-105 active:scale-95"
            >
              {item.tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

