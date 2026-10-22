/**
 * Guided Product Spotlight Tour (12-Step Interactive Walkthrough)
 * Provides genuine spotlight focus: smoothly scrolls the page to the target element,
 * renders an animated glowing halo spotlight ring around the selected component,
 * and dynamically anchors an explanatory floating quantitative card with step controls.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Activity,
  Layers,
  BarChart3,
  Send,
  Users,
  Scale,
  ActivitySquare,
  Bot,
  CheckCircle2,
  ArrowRight,
  Search,
  Eye,
  Sliders
} from 'lucide-react';

export interface TourStep {
  step: number;
  title: string;
  badge: string;
  category: string;
  icon: React.ElementType;
  targetSelector: string;
  tab?: string;
  description: string;
  highlights: string[];
  formulaOrMetric?: string;
  actionLabel?: string;
  actionId?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    title: 'AlphaQuant Terminal Core',
    badge: 'Step 1 of 12',
    category: 'Architecture Overview',
    icon: Sparkles,
    targetSelector: '#tour-brand-header',
    description:
      'AlphaQuant AI is an institutional quantitative intelligence terminal. Engineered for professional traders and portfolio managers, it bridges machine learning, split-conformal inference, and direct broker execution.',
    highlights: [
      'Split-conformal prediction intervals with distribution-free mathematical guarantees',
      'Real-time streaming inter-market telemetry across 60+ global assets (NSE, BSE, US)',
      'Sub-millisecond data pipelines with client-side state synchronization'
    ],
    formulaOrMetric: 'Terminal Engine: React 19 + TypeScript + Vector Math + Express API',
    actionLabel: 'Next: Macro Tape',
    actionId: 'next'
  },
  {
    step: 2,
    title: 'Global Macro Market Tape',
    badge: 'Step 2 of 12',
    category: 'Market Telemetry',
    icon: TrendingUp,
    targetSelector: '#tour-macro-tape',
    tab: 'dashboard',
    description:
      'Live streaming inter-market telemetry ribbon tracking benchmark indices in real-time. Dynamically monitors volatility regimes across emerging and developed market sessions.',
    highlights: [
      'Real-time streaming index cards: NIFTY 50, SENSEX, S&P 500, NASDAQ 100, and INDIA VIX',
      'Directional momentum indicators with intraday percentage deltas',
      'Screen-adaptive layout preventing index text truncation'
    ],
    formulaOrMetric: 'Tape Feed: Live Inter-Market WebSocket & Multi-Exchange Aggregator',
    actionLabel: 'Next: Price Accuracy',
    actionId: 'next'
  },
  {
    step: 3,
    title: 'Project-Wide Price Accuracy Metric',
    badge: 'Step 3 of 12',
    category: 'Performance Benchmarking',
    icon: ShieldCheck,
    targetSelector: '#tour-price-accuracy',
    tab: 'dashboard',
    description:
      'Evaluates project-wide price forecasting accuracy dynamically across the entire 60-asset universe. Derived rigorously from the Mean Absolute Percentage Error (MAPE) of calibrated models.',
    highlights: [
      'Mathematically formulated as: Price Accuracy = 100% - MAPE across catalog assets',
      'Evaluated across 60+ equities with split-conformal calibration sets',
      'Highlights average directional accuracy (>78%) and finite conformal empirical coverage (>90%)'
    ],
    formulaOrMetric: 'Price Accuracy = 100% - MAPE (Evaluated across 60 Assets)',
    actionLabel: 'Next: Active Portfolio',
    actionId: 'next'
  },
  {
    step: 4,
    title: 'Active Portfolio & Realized Valuation',
    badge: 'Step 4 of 12',
    category: 'Portfolio Telemetry',
    icon: ShieldCheck,
    targetSelector: '#tour-active-portfolio',
    tab: 'dashboard',
    description:
      'Live portfolio monitoring aggregating positions, valuation, net invested capital, and cumulative unrealized P&L with clean visual separation.',
    highlights: [
      'Real-time portfolio valuation updated synchronously with live market ticks',
      'Dedicated valuation row and sub-row for Invested Capital and P&L %',
      'Direct shortcut to Portfolio Management and Markowitz rebalancing'
    ],
    formulaOrMetric: 'P&L = Current Valuation - Invested Capital',
    actionLabel: 'Next: Macro Regime',
    actionId: 'next'
  },
  {
    step: 5,
    title: 'Hidden Markov Model Market Regimes',
    badge: 'Step 5 of 12',
    category: 'Regime Classification',
    icon: Layers,
    targetSelector: '#tour-macro-regime',
    tab: 'dashboard',
    description:
      'Classifies underlying structural market dynamics using Hidden Markov Models (HMM) and technical indicator envelopes to prevent trading against prevailing macroeconomic momentum.',
    highlights: [
      'Classifies into Bullish Steady Drift, High Volatility Expansion, or Mean-Reverting Range',
      'Dynamic transition probabilities calculating expected regime persistence durations',
      'Adaptive risk-budgeting weights based on prevailing volatility states'
    ],
    formulaOrMetric: 'States: Low Volatility Trend (S1), High Volatility Bear (S2), Sideways Mean-Revert (S3)',
    actionLabel: 'Next: Drift Monitor',
    actionId: 'next'
  },
  {
    step: 6,
    title: 'Kolmogorov-Smirnov (KS) Drift Governance',
    badge: 'Step 6 of 12',
    category: 'Model Governance',
    icon: ActivitySquare,
    targetSelector: '#tour-drift-monitor',
    tab: 'dashboard',
    description:
      'Continuous production ML governance running two-sample Kolmogorov-Smirnov tests comparing baseline training returns with live empirical returns.',
    highlights: [
      'Calculates KS distance statistic D = sup |F_live(x) - F_ref(x)| and p-value',
      'Autonomous alert triggers when statistical drift is detected (p < 0.05)',
      'Protects against catastrophic model degradation during sudden volatility regime shifts'
    ],
    formulaOrMetric: 'KS Statistic: D_{n,m} = \\sup_x |F_{1,n}(x) - F_{2,m}(x)| (Threshold α=0.05)',
    actionLabel: 'Next: Asset Search',
    actionId: 'next'
  },
  {
    step: 7,
    title: 'Universal Asset & Company Search',
    badge: 'Step 7 of 12',
    category: 'Asset Discovery',
    icon: Search,
    targetSelector: '#tour-company-search',
    tab: 'dashboard',
    description:
      'Search across 60+ global equities by company name (e.g., Tata, Reliance, Apple, Nvidia) or ticker symbol. Instantly synchronizes live charts, order books, and conformal models.',
    highlights: [
      'Instant autocomplete matching company names and ticker symbols',
      'Synchronizes conformal inference models, order book, and charts upon selection',
      'Quick-access watchlist pills for top bellwether assets'
    ],
    formulaOrMetric: 'Coverage: NSE (NIFTY 50) + BSE + US Big Tech Equities',
    actionLabel: 'Next: Conformal Envelopes',
    actionId: 'next'
  },
  {
    step: 8,
    title: 'Split-Conformal Prediction Envelopes',
    badge: 'Step 8 of 12',
    category: 'Statistical AI Core',
    icon: Activity,
    targetSelector: '#tour-conformal-card',
    tab: 'dashboard',
    description:
      'Unlike traditional black-box point forecasts that hide tail uncertainty, AlphaQuant provides mathematically calibrated prediction bands with non-asymptotic finite-sample coverage guarantees.',
    highlights: [
      'Guarantees true market close falls within [Lower Bound, Upper Bound] with probability ≥ 1 - α',
      'Distribution-free: Requires zero Gaussian or normality assumptions on market returns',
      'Interactive confidence level slider (80%, 90%, 95%) dynamically adjusting interval width'
    ],
    formulaOrMetric: 'P(Y_{n+1} ∈ C(X_{n+1})) ≥ 1 - α (Distribution-Free Guarantee)',
    actionLabel: 'Next: Quant Tools',
    actionId: 'next'
  },
  {
    step: 9,
    title: 'Options Chains & Greeks Analytics',
    badge: 'Step 9 of 12',
    category: 'Derivatives Analytics',
    icon: ActivitySquare,
    targetSelector: '#tour-quant-tools',
    description:
      'Complete derivatives workstation computing real-time Black-Scholes Greeks (Delta, Gamma, Theta, Vega, Rho) and Implied Volatility (IV) smile curves across all available strikes.',
    highlights: [
      'Real-time Black-Scholes Greeks: Δ (Delta), Γ (Gamma), Θ (Theta), ν (Vega), ρ (Rho)',
      'Implied Volatility (IV) smile curve visualization highlighting volatility skews',
      'ATM expected move projections (1-Day, 7-Day, 30-Day) and Put/Call Ratios (Volume & OI)'
    ],
    formulaOrMetric: 'd1 = [ln(S/K) + (r + σ²/2)T] / (σ√T), Δ = N(d1), Γ = N\'(d1)/(Sσ√T), ν = S√T N\'(d1)',
    actionLabel: 'Launch Options Modal',
    actionId: 'open:options'
  },
  {
    step: 10,
    title: 'Automated Quantitative Backtesting',
    badge: 'Step 10 of 12',
    category: 'Strategy Simulation',
    icon: BarChart3,
    targetSelector: '#tour-quant-tools',
    description:
      'Simulates model-driven trading strategies against standard Buy-and-Hold benchmarks over trailing historical sessions with realistic transaction slippage.',
    highlights: [
      'XGBoost + Conformal Quantile Strategy: Buys near calibrated lower bound; exits near upper bound',
      'Comparative equity curve visualization with Sharpe ratio and max drawdown stats',
      'Auditable trade blotter logging win rates, profit factors, and alpha outperformance'
    ],
    formulaOrMetric: 'Sharpe = (R_p - R_f) / σ_p, Alpha = Return_Strategy - Return_Benchmark',
    actionLabel: 'Launch Backtest Modal',
    actionId: 'open:backtest'
  },
  {
    step: 11,
    title: 'Broker Router & Portfolio Optimizer',
    badge: 'Step 11 of 12',
    category: 'Execution & Optimization',
    icon: Sliders,
    targetSelector: '#tour-quant-tools',
    description:
      'Simulates direct connectivity to institutional paper trading gateways (Alpaca) and performs Markowitz Modern Portfolio Theory mean-variance optimization.',
    highlights: [
      'Market & Limit order ticket with algorithmic stop-loss and take-profit bounds',
      'Visualizes Markowitz Efficient Frontier with 1-click portfolio weight rebalancing',
      'Verified Quantitative Social Leaderboard with 1-click portfolio mirror sync'
    ],
    formulaOrMetric: 'max w^T μ - (λ/2) w^T Σ w subject to ∑ w_i = 1, w_i ≥ 0',
    actionLabel: 'Launch Broker Router',
    actionId: 'open:broker'
  },
  {
    step: 12,
    title: 'AlphaBot Quantitative Copilot',
    badge: 'Step 12 of 12',
    category: 'AI Assistant',
    icon: Bot,
    targetSelector: '#tour-alphabot-copilot',
    description:
      'Your 24/7 dedicated quantitative copilot widget. Ready to answer terminal questions, explain conformal intervals, and recommend risk parameters.',
    highlights: [
      'Floating widget accessible from the bottom right of every terminal page',
      'Suggests optimal stop-loss thresholds and conformal coverage intervals for your risk appetite',
      'Provides code snippets and algorithmic indicator formulas tailored to your assets'
    ],
    formulaOrMetric: 'Copilot Engine: Gemini 3.8 Flash + AlphaQuant Quantitative Knowledge Base',
    actionLabel: 'Open AlphaBot Copilot',
    actionId: 'open:copilot'
  }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (actionId: string) => void;
  onNavigate?: (tab: string) => void;
  activeTab?: string;
}

export const ProductTourModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onAction,
  onNavigate,
  activeTab
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetFound, setTargetFound] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStepIdx];
  const Icon = step.icon;
  const isFirst = currentStepIdx === 0;
  const isLast = currentStepIdx === TOUR_STEPS.length - 1;
  const progressPct = ((currentStepIdx + 1) / TOUR_STEPS.length) * 100;

  // Measure target element position
  const measureTarget = useCallback(() => {
    if (!isOpen) return;
    const selector = step.targetSelector;
    let el = document.querySelector(selector) as HTMLElement | null;

    // Fallbacks if specific ID isn't found
    if (!el && selector === '#tour-company-search') {
      el = document.querySelector('#tour-search-combobox') as HTMLElement | null;
    }
    if (!el && selector === '#tour-quant-tools') {
      el = document.querySelector('#tour-nav-links') as HTMLElement | null;
    }

    if (el) {
      setTargetFound(true);
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetFound(false);
      setTargetRect(null);
    }
  }, [isOpen, step.targetSelector]);

  // When step changes, navigate if needed and scroll element into view
  useEffect(() => {
    if (!isOpen) return;

    if (step.tab && onNavigate && activeTab !== step.tab) {
      onNavigate(step.tab);
    }

    const timer = setTimeout(() => {
      const selector = step.targetSelector;
      let el = document.querySelector(selector) as HTMLElement | null;
      if (!el && selector === '#tour-company-search') {
        el = document.querySelector('#tour-search-combobox') as HTMLElement | null;
      }
      if (!el && selector === '#tour-quant-tools') {
        el = document.querySelector('#tour-nav-links') as HTMLElement | null;
      }

      if (el) {
        // Smoothly scroll the page so the selected component is centered
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

        // Update rect after scrolling settles
        const scrollTimer = setTimeout(() => {
          measureTarget();
        }, 320);

        return () => clearTimeout(scrollTimer);
      } else {
        setTargetFound(false);
        setTargetRect(null);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [isOpen, currentStepIdx, step.tab, step.targetSelector, onNavigate, activeTab, measureTarget]);

  // Handle window scroll & resize events to keep the spotlight aligned
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      measureTarget();
    };

    window.addEventListener('resize', handleUpdate, { passive: true });
    window.addEventListener('scroll', handleUpdate, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, { capture: true });
    };
  }, [isOpen, measureTarget]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') {
        setCurrentStepIdx(prev => Math.min(TOUR_STEPS.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentStepIdx(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentStepIdx(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStepIdx(prev => Math.max(0, prev - 1));
  };

  const handleStepAction = () => {
    if (step.actionId && step.actionId !== 'next') {
      if (step.actionId === 'open:copilot') {
        const copilotBtn = document.querySelector('#tour-alphabot-copilot') as HTMLElement | null;
        if (copilotBtn) copilotBtn.click();
      }
      onAction?.(step.actionId);
      onClose();
    } else {
      handleNext();
    }
  };

  // Calculate dynamic floating tooltip placement
  const calculateTooltipStyle = (): React.CSSProperties => {
    if (!targetRect || !targetFound) {
      // Centered fallback if target is not currently in view
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '520px',
        width: 'calc(100vw - 32px)',
        zIndex: 60
      };
    }

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const cardWidth = Math.min(480, viewportW - 32);
    const cardHeightEstimate = 360;

    // Horizontal placement: align with target, clamp within screen
    let left = targetRect.left + (targetRect.width / 2) - (cardWidth / 2);
    left = Math.max(16, Math.min(viewportW - cardWidth - 16, left));

    // Vertical placement: prefer below target if space permits, otherwise place above
    let top: number;
    const spaceBelow = viewportH - targetRect.bottom;
    const spaceAbove = targetRect.top;

    if (spaceBelow >= cardHeightEstimate || spaceBelow >= spaceAbove) {
      top = targetRect.bottom + 14;
      // Clamp to bottom of screen
      if (top + cardHeightEstimate > viewportH - 12) {
        top = Math.max(12, viewportH - cardHeightEstimate - 12);
      }
    } else {
      top = Math.max(12, targetRect.top - cardHeightEstimate - 14);
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
      zIndex: 60
    };
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* 1. Backdrop overlay with slight darkening for high contrast */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* 2. Interactive Spotlight Halo Ring directly over the selected element */}
      {targetFound && targetRect && (
        <div
          style={{
            top: `${Math.max(0, targetRect.top - 8)}px`,
            left: `${Math.max(0, targetRect.left - 8)}px`,
            width: `${targetRect.width + 16}px`,
            height: `${targetRect.height + 16}px`
          }}
          className="fixed pointer-events-none rounded-2xl ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 shadow-[0_0_50px_rgba(6,182,212,0.85)] border-2 border-cyan-300 transition-all duration-300 ease-out z-50 animate-pulse"
        >
          {/* Animated Glowing Outer Aura */}
          <div className="absolute -inset-1.5 rounded-2xl bg-cyan-400/25 blur-md pointer-events-none" />

          {/* Floating Target Spotlight Badge */}
          <div className="absolute -top-3.5 left-4 px-2.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-mono font-black tracking-wider uppercase shadow-lg shadow-cyan-500/40 flex items-center gap-1.5 shrink-0 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping shrink-0" />
            <Eye className="w-3 h-3 shrink-0" />
            <span>Spotlight Target</span>
          </div>
        </div>
      )}

      {/* 3. Floating Spotlight Tooltip Dialog Card */}
      <div
        ref={tooltipRef}
        style={calculateTooltipStyle()}
        className="bg-white dark:bg-slate-900 border border-cyan-500/40 dark:border-cyan-500/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 animate-fadeIn"
      >
        {/* Top Progress Ribbon */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Card Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40 shrink-0">
                  {step.badge}
                </span>
                <span className="text-[11px] font-mono text-slate-400 truncate">
                  {step.category}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-display mt-0.5 truncate">
                {step.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Exit Tour"
            title="Exit Tour (Esc)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 space-y-3.5 max-h-[50vh] overflow-y-auto">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {step.description}
          </p>

          {/* Highlights Box */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
              Quantitative Principles & Features
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {step.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="leading-tight">{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Formula or Architecture Callout */}
          {step.formulaOrMetric && (
            <div className="p-2.5 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-800/50 flex items-center justify-between text-[11px] font-mono text-cyan-800 dark:text-cyan-300">
              <span className="truncate">{step.formulaOrMetric}</span>
            </div>
          )}

          {/* Step Dots Selector */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.step}
                onClick={() => setCurrentStepIdx(idx)}
                aria-label={`Jump to step ${s.step}: ${s.title}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentStepIdx === idx
                    ? 'w-6 bg-cyan-500 shadow-xs shadow-cyan-500/50'
                    : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/50 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="text-xs font-mono text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer px-2 py-1"
          >
            Exit Tour
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Prev</span>
              </button>
            )}

            {step.actionLabel && step.actionId && step.actionId !== 'next' && (
              <button
                onClick={handleStepAction}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <span>{step.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-3.5 sm:px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-colors cursor-pointer"
            >
              <span>{isLast ? 'Finish Tour' : 'Next Part'}</span>
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
