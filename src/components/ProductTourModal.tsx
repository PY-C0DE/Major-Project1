/**
 * Guided Product Spotlight Tour (16-Step Interactive Walkthrough)
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
  Sliders,
  LineChart,
  Calendar,
  Coins,
  Briefcase,
  Bell,
  Newspaper
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
    badge: 'Step 1 of 16',
    category: 'Architecture Overview',
    icon: Sparkles,
    targetSelector: '#tour-brand-header',
    description:
      'AlphaQuant AI is an institutional quantitative intelligence terminal. Engineered for professional traders and portfolio managers, it bridges machine learning price prediction, split-conformal inference, and direct broker execution.',
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
    badge: 'Step 2 of 16',
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
    badge: 'Step 3 of 16',
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
    badge: 'Step 4 of 16',
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
    actionLabel: 'Next: Asset Search',
    actionId: 'next'
  },
  {
    step: 5,
    title: 'Universal Asset & Company Search',
    badge: 'Step 5 of 16',
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
    actionLabel: 'Next: Primary Price Prediction Chart',
    actionId: 'next'
  },
  {
    step: 6,
    title: 'Primary Stock Price Prediction Candlestick Chart',
    badge: 'Step 6 of 16',
    category: 'Core Predictive Motive',
    icon: LineChart,
    targetSelector: '#tour-candle-chart',
    tab: 'dashboard',
    description:
      'Stock price prediction is the central motive of AlphaQuant. The interactive candlestick chart plots real-time OHLCV data alongside machine learning forecast trajectories and uncertainty bounds.',
    highlights: [
      'Multi-indicator technical suite: SMA 20/50, Bollinger Bands, RSI & MACD momentum',
      'Overlaid forward price forecast horizon calibrated to user-selected intervals',
      'Dynamic crosshair inspection with historical volume bars and volatility channels'
    ],
    formulaOrMetric: 'ŷ_{t+h} = f_θ(X_t) + ε_t (Multi-Horizon Forward Inference)',
    actionLabel: 'Next: Conformal Envelopes',
    actionId: 'next'
  },
  {
    step: 7,
    title: 'Split-Conformal Prediction Envelopes',
    badge: 'Step 7 of 16',
    category: 'Statistical AI Core',
    icon: Activity,
    targetSelector: '#tour-conformal-card',
    tab: 'dashboard',
    description:
      'Unlike traditional black-box point forecasts that hide tail uncertainty, AlphaQuant provides mathematically calibrated prediction bands with non-asymptotic finite-sample coverage guarantees.',
    highlights: [
      'Guarantees true market close falls within [Lower Bound, Upper Bound] with probability ≥ 1 - α',
      'Distribution-free: Requires zero Gaussian or normality assumptions on market returns',
      'Interactive confidence level slider (80%, 90%, 95%, 99%) dynamically adjusting interval width'
    ],
    formulaOrMetric: 'P(Y_{n+1} ∈ C(X_{n+1})) ≥ 1 - α (Distribution-Free Guarantee)',
    actionLabel: 'Next: Market Regimes',
    actionId: 'next'
  },
  {
    step: 8,
    title: 'Hidden Markov Model Market Regimes',
    badge: 'Step 8 of 16',
    category: 'Regime Classification',
    icon: Layers,
    targetSelector: '#tour-regime-card',
    tab: 'dashboard',
    description:
      'Classifies underlying structural market dynamics using Hidden Markov Models (HMM) and technical indicator envelopes to prevent trading against prevailing macroeconomic momentum.',
    highlights: [
      'Classifies into Bullish Steady Drift, High Volatility Expansion, or Mean-Reverting Range',
      'Dynamic transition probabilities calculating expected regime persistence durations',
      'Adaptive risk-budgeting weights based on prevailing volatility states'
    ],
    formulaOrMetric: 'States: Low Volatility Trend (S1), High Volatility Bear (S2), Sideways Mean-Revert (S3)',
    actionLabel: 'Next: News Sentiment',
    actionId: 'next'
  },
  {
    step: 9,
    title: 'News Sentiment & Publisher Credibility',
    badge: 'Step 9 of 16',
    category: 'Financial NLP Intelligence',
    icon: Newspaper,
    targetSelector: '#tour-sentiment-card',
    tab: 'dashboard',
    description:
      'Domain-specific financial lexicon analyzes news sentiment and extracts positive/negative polarities, strictly weighted by verified publisher reputation scores.',
    highlights: [
      'Domain credibility weighting: Tier-1 agencies (Reuters, Bloomberg, WSJ, FT) weighted higher',
      'Detects sentiment momentum shifts and headline velocity before price reactions',
      'Synthesizes multi-source news feed directly into the predictive inference vector'
    ],
    formulaOrMetric: 'Score = ∑ (Sentiment_i × PublisherWeight_i) / ∑ PublisherWeight_i',
    actionLabel: 'Next: Concept Drift Guard',
    actionId: 'next'
  },
  {
    step: 10,
    title: 'Kolmogorov-Smirnov (KS) Drift Governance',
    badge: 'Step 10 of 16',
    category: 'Model Governance',
    icon: ActivitySquare,
    targetSelector: '#tour-drift-card',
    tab: 'dashboard',
    description:
      'Continuous production ML governance running two-sample Kolmogorov-Smirnov tests comparing baseline training returns with live empirical returns.',
    highlights: [
      'Calculates KS distance statistic D = sup |F_live(x) - F_ref(x)| and p-value',
      'Autonomous alert triggers when statistical drift is detected (p < 0.05)',
      'Protects against catastrophic model degradation during sudden volatility regime shifts'
    ],
    formulaOrMetric: 'KS Statistic: D_{n,m} = \\sup_x |F_{1,n}(x) - F_{2,m}(x)| (Threshold α=0.05)',
    actionLabel: 'Next: Earnings Calendar',
    actionId: 'next'
  },
  {
    step: 11,
    title: 'Watchlist Earnings Calendar & Consensus EPS',
    badge: 'Step 11 of 16',
    category: 'Fundamental Catalyst Tracking',
    icon: Calendar,
    targetSelector: '#tour-earnings-calendar',
    tab: 'dashboard',
    description:
      'Tracks upcoming quarterly earnings release dates, consensus Wall Street / Dalal Street EPS estimates, and historical post-earnings surprise patterns.',
    highlights: [
      'Countdown to scheduled earnings reporting dates across all watchlist stocks',
      'Historical earnings beat/miss surprise percentage patterns',
      'Pre-earnings volatility expansion warning flags to manage binary event risk'
    ],
    formulaOrMetric: 'EPS Surprise % = (Reported EPS - Consensus EPS) / |Consensus EPS| × 100',
    actionLabel: 'Next: Seasonality Analysis',
    actionId: 'next'
  },
  {
    step: 12,
    title: 'Seasonality & Calendar Alpha Analysis',
    badge: 'Step 12 of 16',
    category: 'Temporal Alpha Engine',
    icon: Calendar,
    targetSelector: '#tour-seasonality',
    tab: 'analysis',
    description:
      'Uncovers recurrent monthly return patterns and cyclical tendencies across 5-year multi-annual matrices, identifying historical seasonal outperformers.',
    highlights: [
      'Multi-year monthly return heatmaps with win-rate %, median return, and volatility',
      'Target-month tendency bias rating (Strong Bullish, Bullish, Neutral, Bearish)',
      'Identifies universe outperformers for specific seasons (Diwali Q4, Santa Rally, Jan effect)'
    ],
    formulaOrMetric: 'Seasonality Bias = (Win Rate % - 50%) × Avg Return / Historical Volatility',
    actionLabel: 'Next: Dividend Calendar',
    actionId: 'next'
  },
  {
    step: 13,
    title: 'Dividend Yield & Ex-Date Cashflow Calendar',
    badge: 'Step 13 of 16',
    category: 'Cashflow Optimization',
    icon: Coins,
    targetSelector: '#tour-dividend-calendar',
    tab: 'portfolio',
    description:
      'Monitors upcoming ex-dividend dates, calculates total projected annual dividend income, Yield on Cost (YoC %), and runs DRIP compounding projections.',
    highlights: [
      'Total projected annual dividend cashflow in INR and USD run-rates',
      'Live countdown to imminent ex-dividend dates (< 14 days payout alert ribbons)',
      'Monthly cashflow distribution schedule and DRIP reinvestment growth simulator'
    ],
    formulaOrMetric: 'Yield on Cost = (Annual Dividend per Share / Purchase Price) × 100',
    actionLabel: 'Next: Trade Analytics',
    actionId: 'next'
  },
  {
    step: 14,
    title: 'Executive Trade Summary & Risk Attribution',
    badge: 'Step 14 of 16',
    category: 'Trade Governance',
    icon: Briefcase,
    targetSelector: '#tour-trade-ledger',
    tab: 'portfolio',
    description:
      'Rigorous quantitative audit of closed trading performance displaying Sharpe Ratio, Win/Loss ratio, average holding duration, and sector/asset class risk attribution.',
    highlights: [
      'Executive metrics: Realized Sharpe ratio, profit factor, win rate %, and holding period',
      'Risk attribution breakdown calculating capital allocation across sectors and asset classes',
      'Direct audit trail ensuring disciplined risk-budgeting adherence'
    ],
    formulaOrMetric: 'Sharpe = (R_p - R_f) / σ_p, Sector Risk % = Allocated Capital_s / Total Capital',
    actionLabel: 'Next: Risk-Based Alerts',
    actionId: 'next'
  },
  {
    step: 15,
    title: 'Risk-Based & Momentum RSI Alerts Engine',
    badge: 'Step 15 of 16',
    category: 'Proactive Alerting',
    icon: Bell,
    targetSelector: '#tour-risk-alerts',
    tab: 'alerts',
    description:
      'Proactive monitoring engine dispatching automated push alerts when an asset exceeds user-defined Value-at-Risk (VaR), volatility caps, or RSI oversold (≤30) and overbought (≥70) thresholds.',
    highlights: [
      'Automated push alerts on RSI crosses: Oversold dip buys (≤30) & overbought profit taking (≥70)',
      'Value-at-Risk (VaR 95% & 99%) threshold breaches with custom forward horizons',
      'Autonomous volatility expansion triggers preventing unhedged drawdown exposure'
    ],
    formulaOrMetric: 'VaR_α = -μΔt + z_α σ √Δt, RSI = 100 - (100 / (1 + RS))',
    actionLabel: 'Next: AlphaBot Copilot',
    actionId: 'next'
  },
  {
    step: 16,
    title: 'AlphaBot Quantitative Copilot',
    badge: 'Step 16 of 16',
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
    if (!el && selector === '#tour-regime-card') {
      el = document.querySelector('#tour-macro-regime') as HTMLElement | null;
    }
    if (!el && selector === '#tour-drift-card') {
      el = document.querySelector('#tour-drift-monitor') as HTMLElement | null;
    }
    if (!el && selector === '#tour-dividend-calendar') {
      el = document.querySelector('#tour-dividend-kpi') as HTMLElement | null;
    }
    if (!el && selector === '#tour-trade-ledger') {
      el = document.querySelector('#tour-active-portfolio') as HTMLElement | null;
    }
    if (!el && (selector === '#tour-seasonality' || selector === '#tour-earnings-calendar')) {
      el = document.querySelector('#tour-candle-chart') as HTMLElement | null;
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
      if (!el && selector === '#tour-regime-card') {
        el = document.querySelector('#tour-macro-regime') as HTMLElement | null;
      }
      if (!el && selector === '#tour-drift-card') {
        el = document.querySelector('#tour-drift-monitor') as HTMLElement | null;
      }
      if (!el && selector === '#tour-dividend-calendar') {
        el = document.querySelector('#tour-dividend-kpi') as HTMLElement | null;
      }
      if (!el && selector === '#tour-trade-ledger') {
        el = document.querySelector('#tour-active-portfolio') as HTMLElement | null;
      }
      if (!el && (selector === '#tour-seasonality' || selector === '#tour-earnings-calendar')) {
        el = document.querySelector('#tour-candle-chart') as HTMLElement | null;
      }

      if (el) {
        // Smoothly scroll the main content area so the element is cleanly placed in view
        const mainEl = document.querySelector('main');
        if (mainEl) {
          const mainRect = mainEl.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const currentScroll = mainEl.scrollTop;
          const relativeTop = elRect.top - mainRect.top + currentScroll;
          // Scroll so target has 24px clearance from top of view
          mainEl.scrollTo({
            top: Math.max(0, relativeTop - 24),
            behavior: 'smooth'
          });
        } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        }

        // Continuously update targetRect while scrolling settles
        const interval = setInterval(() => {
          measureTarget();
        }, 50);

        const scrollTimer = setTimeout(() => {
          clearInterval(interval);
          measureTarget();
        }, 450);

        return () => {
          clearInterval(interval);
          clearTimeout(scrollTimer);
        };
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

  // Keyboard navigation (Supports Arrow Right, Arrow Left, Enter, Space, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        setCurrentStepIdx(prev => {
          if (prev >= TOUR_STEPS.length - 1) {
            onClose();
            return prev;
          }
          return prev + 1;
        });
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
  // Screen-adaptive floating tooltip placement and sizing
  const calculateTooltipStyle = (): React.CSSProperties => {
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;

    if (!targetRect || !targetFound) {
      // Centered fallback if target is not currently in view
      const maxHeight = Math.min(460, Math.max(220, viewportH - 32));
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '460px',
        width: 'calc(100vw - 32px)',
        maxHeight: `${maxHeight}px`,
        zIndex: 60
      };
    }

    const isMobile = viewportW < 640;
    const isTablet = viewportW >= 640 && viewportW < 1024;
    const cardWidth = isMobile
      ? Math.min(viewportW - 24, 400)
      : isTablet
      ? Math.min(viewportW - 32, 430)
      : 440;

    // Horizontal placement: center with target, clamp within screen margins
    let left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    left = Math.max(12, Math.min(viewportW - cardWidth - 12, left));

    // Vertical clearances around target
    const spaceBelow = viewportH - targetRect.bottom - 16;
    const spaceAbove = targetRect.top - 16;

    // Mobile layout: smart bottom/top dock with strict height bounds
    if (isMobile) {
      if (targetRect.top > viewportH * 0.45) {
        // Target is in bottom half -> place card at top
        const maxHeight = Math.max(180, Math.min(320, targetRect.top - 20));
        return {
          position: 'fixed',
          top: '12px',
          left: '12px',
          width: 'calc(100vw - 24px)',
          maxHeight: `${maxHeight}px`,
          zIndex: 60
        };
      } else {
        // Target is in top half -> place card at bottom
        const maxHeight = Math.max(180, Math.min(340, viewportH - targetRect.bottom - 20));
        return {
          position: 'fixed',
          bottom: '12px',
          left: '12px',
          width: 'calc(100vw - 24px)',
          maxHeight: `${maxHeight}px`,
          zIndex: 60
        };
      }
    }

    // Wide screen / desktop: side placement (e.g. step 3 in user screenshot where target is to the left)
    const spaceRight = viewportW - targetRect.right - 20;
    const spaceLeft = targetRect.left - 20;
    if (viewportW >= 1024 && (spaceBelow < 280 || spaceRight >= cardWidth)) {
      if (spaceRight >= cardWidth) {
        const targetH = Math.min(390, Math.max(220, viewportH - 32));
        // Clamp top so that top + targetH <= viewportH - 16
        const top = Math.max(16, Math.min(viewportH - targetH - 16, Math.max(16, targetRect.top - 16)));
        const maxHeight = Math.max(200, viewportH - top - 16);
        return {
          position: 'fixed',
          top: `${top}px`,
          left: `${targetRect.right + 16}px`,
          width: `${cardWidth}px`,
          maxHeight: `${maxHeight}px`,
          zIndex: 60
        };
      } else if (spaceLeft >= cardWidth) {
        const targetH = Math.min(390, Math.max(220, viewportH - 32));
        const top = Math.max(16, Math.min(viewportH - targetH - 16, Math.max(16, targetRect.top - 16)));
        const maxHeight = Math.max(200, viewportH - top - 16);
        return {
          position: 'fixed',
          top: `${top}px`,
          left: `${targetRect.left - cardWidth - 16}px`,
          width: `${cardWidth}px`,
          maxHeight: `${maxHeight}px`,
          zIndex: 60
        };
      }
    }

    // Standard Desktop / Tablet placement:
    // Prefer placing below if space permits (>= 270px) or if spaceBelow >= spaceAbove
    if (spaceBelow >= 270 || spaceBelow >= spaceAbove) {
      const targetH = Math.min(380, Math.max(180, spaceBelow));
      let top = targetRect.bottom + 12;
      if (top + targetH > viewportH - 16) {
        top = Math.max(16, viewportH - targetH - 16);
      }
      const maxHeight = Math.max(200, viewportH - top - 16);
      return {
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${cardWidth}px`,
        maxHeight: `${maxHeight}px`,
        zIndex: 60
      };
    } else {
      // Place above target
      const targetH = Math.min(380, Math.max(180, spaceAbove));
      let bottom = viewportH - targetRect.top + 12;
      if (bottom + targetH > viewportH - 16) {
        bottom = Math.max(16, viewportH - targetH - 16);
      }
      const maxHeight = Math.max(200, viewportH - bottom - 16);
      return {
        position: 'fixed',
        bottom: `${bottom}px`,
        left: `${left}px`,
        width: `${cardWidth}px`,
        maxHeight: `${maxHeight}px`,
        zIndex: 60
      };
    }
  };

  const getDirectionHint = () => {
    if (!targetRect || !targetFound) return null;
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
    if (viewportW < 640) {
      return targetRect.top > viewportH * 0.45 ? '↑ Target in Lower View' : '↓ Target in Upper View';
    }
    const spaceBelow = viewportH - targetRect.bottom - 16;
    const spaceAbove = targetRect.top - 16;
    if (viewportW >= 1024 && (spaceBelow < 280 || viewportW - targetRect.right - 20 >= 440)) {
      if (viewportW - targetRect.right - 20 >= 440) return '← Target to Left';
      if (targetRect.left - 20 >= 440) return '→ Target to Right';
    }
    return spaceBelow >= 270 || spaceBelow >= spaceAbove ? '↑ Feature Above' : '↓ Feature Below';
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden font-sans"
      onWheel={(e) => {
        // Allow wheel scrolling anywhere on screen to smoothly scroll the page content
        const target = e.target as HTMLElement;
        const isInsideCardBody = target.closest('.tour-card-body');
        if (!isInsideCardBody) {
          const mainEl = document.querySelector('main');
          if (mainEl) {
            mainEl.scrollTop += e.deltaY;
            measureTarget();
          }
        }
      }}
    >
      {/* 1. Backdrop overlay with SVG Cutout Mask:
          The hole punched over targetRect has 0% opacity, so the underlying feature is 100% visible and NOT translucent!
          The rest of the screen is darkened to focus the user's attention. */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-40 transition-opacity duration-300">
        <defs>
          <mask id="tour-spotlight-cutout-mask">
            {/* White fills everything (opaque backdrop) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black punches out the hole for the focused element so it remains 100% crystal clear */}
            {targetFound && targetRect && (
              <rect
                x={Math.max(0, targetRect.left - 6)}
                y={Math.max(0, targetRect.top - 6)}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Shaded backdrop with cutout hole */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.78)"
          mask="url(#tour-spotlight-cutout-mask)"
          className="pointer-events-auto cursor-pointer"
          onClick={onClose}
        />
      </svg>

      {/* 2. Focused Feature Halo: ONLY the border glows, with zero tint or haze over the inner feature */}
      {targetFound && targetRect && (
        <div
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`
          }}
          className="fixed pointer-events-none rounded-2xl border-2 border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.85),0_0_35px_rgba(6,182,212,0.4)] transition-all duration-300 ease-out z-50"
        >
          {/* Subtle perimeter border pulse (strictly border, no fill) */}
          <div className="absolute inset-0 rounded-2xl border border-cyan-300/60 animate-ping opacity-25 pointer-events-none" />

          {/* Floating Focused Feature Badge */}
          <div className="absolute -top-3.5 left-4 px-2.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-mono font-black tracking-wider uppercase shadow-md shadow-cyan-500/40 flex items-center gap-1.5 shrink-0 pointer-events-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping shrink-0" />
            <Eye className="w-3 h-3 shrink-0" />
            <span>Target Focused</span>
          </div>
        </div>
      )}

      {/* 3. Floating Spotlight Tooltip Dialog Card - Screen Adaptive */}
      <div
        ref={tooltipRef}
        style={calculateTooltipStyle()}
        className="bg-white dark:bg-slate-900 border border-cyan-500/40 dark:border-cyan-500/50 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 animate-fadeIn select-none"
      >
        {/* Top Progress Ribbon */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 shrink-0">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Card Header (Fixed height, never shrinks away) */}
        <div className="p-3 sm:p-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40 shrink-0">
                  {step.badge}
                </span>
                <span className="text-[11px] font-mono text-slate-400 truncate hidden xs:inline">
                  {step.category}
                </span>
                {getDirectionHint() && (
                  <span className="hidden sm:inline-flex text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {getDirectionHint()}
                  </span>
                )}
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-display mt-0.5 truncate">
                {step.title}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {targetFound && (
              <button
                onClick={measureTarget}
                title="Re-center view on feature"
                className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 px-1.5 py-1 rounded-md hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                <span>Re-center</span>
              </button>
            )}
            {/* Quick Header Next Button (Always accessible at top of card) */}
            <button
              onClick={handleNext}
              className="text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-2.5 sm:px-3 py-1 rounded-lg flex items-center gap-1 shadow-xs shadow-cyan-500/20 cursor-pointer transition-transform active:scale-95"
            >
              <span>{isLast ? 'Finish' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              aria-label="Exit Tour"
              title="Exit Tour (Esc)"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card Body (Independently scrollable to ensure footer is NEVER cut off) */}
        <div className="tour-card-body flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2.5 sidebar-scrollbar">
          <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
            {step.description}
          </p>

          {/* Highlights Box */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
              Quantitative Principles & Features
            </div>
            <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
              {step.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="leading-tight">{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Formula or Architecture Callout */}
          {step.formulaOrMetric && (
            <div className="p-2 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-800/50 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-cyan-800 dark:text-cyan-300">
              <span className="truncate">{step.formulaOrMetric}</span>
            </div>
          )}

          {/* Step Dots Selector */}
          <div className="flex items-center justify-center gap-1.5 pt-0.5">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.step}
                onClick={() => setCurrentStepIdx(idx)}
                aria-label={`Jump to step ${s.step}: ${s.title}`}
                className={`h-1.5 sm:h-2 rounded-full transition-all cursor-pointer ${
                  currentStepIdx === idx
                    ? 'w-6 bg-cyan-500 shadow-xs shadow-cyan-500/50'
                    : 'w-1.5 sm:w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card Footer (Always pinned & visible at bottom, never cut off) */}
        <div className="p-2.5 sm:p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-950/90 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs font-mono text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer px-1 py-0.5"
            >
              Exit Tour
            </button>
            <span className="hidden sm:inline text-[10px] font-mono text-slate-400">
              {currentStepIdx + 1}/{TOUR_STEPS.length} · Enter/→ keys
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
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
