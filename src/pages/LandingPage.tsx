/**
 * AlphaQuant AI - Public Home Page
 * High-density quantitative financial overview with dark and light mode support.
 * Replaces generic stock photos with live interactive terminal components.
 * Restricts access to Dashboard, Watchlist, Portfolio, and live trading tools
 * until the user logs in or signs up.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Layers,
  ActivitySquare,
  Newspaper,
  Target,
  ArrowRight,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  BookmarkCheck,
  BarChart3,
  Bell,
  LineChart,
  Sliders,
  ChevronRight,
  Zap,
  Search,
  Check,
  Play,
  RotateCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AnimatedQuantCard } from '../components/AnimatedQuantCard';

interface Props {
  onEnterApp: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onSelectFeature?: (tab: string) => void;
}

export const LandingPage: React.FC<Props> = ({ onEnterApp, onOpenAuth, onSelectFeature }) => {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();

  // Tab switcher in Hero: 'ai-card' (Video 1 & 2 animated copilot) vs 'terminal' (NSE/NASDAQ matrix)
  const [heroTab, setHeroTab] = useState<'ai-card' | 'terminal'>('ai-card');

  // Interactive Simulation Playground Regime & Confidence Level
  const [simRegime, setSimRegime] = useState<'bullish' | 'sideways' | 'crisis'>('bullish');
  const [confidenceLevel, setConfidenceLevel] = useState<80 | 90 | 95 | 99>(90);

  // Interactive sample ticker for hero terminal preview
  const [activeHeroTicker, setActiveHeroTicker] = useState<'RELIANCE.NS' | 'NVDA' | 'TCS.NS'>('RELIANCE.NS');

  const heroTickersData = {
    'RELIANCE.NS': {
      name: 'Reliance Industries Ltd.',
      exchange: 'NSE',
      currency: '₹',
      price: 1218.00,
      change: 31.00,
      changePercent: 2.61,
      predicted: 1202.58,
      lowerBound: 1152.62,
      upperBound: 1252.54,
      intervalPct: 8.42,
      regime: 'Low Volatility / Bullish',
      regimeProb: 88,
      sentiment: 'Positive',
      sentimentScore: 0.81,
      driftStatus: 'In-Bounds (p=0.384)'
    },
    'NVDA': {
      name: 'NVIDIA Corporation',
      exchange: 'NASDAQ',
      currency: '$',
      price: 128.40,
      change: 3.92,
      changePercent: 3.15,
      predicted: 132.80,
      lowerBound: 122.60,
      upperBound: 143.00,
      intervalPct: 15.88,
      regime: 'High Volatility / Bullish',
      regimeProb: 76,
      sentiment: 'Strong Positive',
      sentimentScore: 0.92,
      driftStatus: 'In-Bounds (p=0.412)'
    },
    'TCS.NS': {
      name: 'Tata Consultancy Services',
      exchange: 'NSE',
      currency: '₹',
      price: 4210.75,
      change: 35.45,
      changePercent: 0.85,
      predicted: 4248.10,
      lowerBound: 4120.00,
      upperBound: 4376.20,
      intervalPct: 6.08,
      regime: 'Low Volatility / Bullish',
      regimeProb: 91,
      sentiment: 'Positive',
      sentimentScore: 0.74,
      driftStatus: 'In-Bounds (p=0.620)'
    }
  };

  const currentHeroData = heroTickersData[activeHeroTicker];

  const handleFeatureClick = (targetTab?: string) => {
    if (isAuthenticated) {
      if (targetTab && onSelectFeature) {
        onSelectFeature(targetTab);
      } else {
        onEnterApp();
      }
    } else {
      onOpenAuth('login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* 1. HERO SECTION WITH ANIMATED QUANT CARD & INTERACTIVE CONTROLS */}
      <section className="relative overflow-hidden pt-8 pb-14 lg:pt-12 lg:pb-18 border-b border-slate-200 dark:border-slate-900">
        {/* Soft floating ambient light orbs */}
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-floatSlow" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none animate-float" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Quantitative Value Proposition with staggered motion */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/70 border border-cyan-300 dark:border-cyan-800/40 text-xs font-mono text-cyan-800 dark:text-cyan-300 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
                <span>Institutional Quantitative Intelligence</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display leading-[1.1] text-balance">
                Understand the market. <br />
                Analyze the news. <br />
                Predict the trend. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 dark:from-cyan-400 dark:via-teal-300 dark:to-emerald-400 animate-shimmer">
                  Measure uncertainty.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                Conventional financial systems offer single deterministic price points that ignore tail risk.
                AlphaQuant AI unifies <strong>Conformal Prediction 90% confidence envelopes</strong>,
                <strong>Hidden Markov Model regime detection</strong>, and <strong>FinBERT news fact verification</strong> into a
                rigorous, audited trading intelligence platform.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={() => (isAuthenticated ? onEnterApp() : onOpenAuth('register'))}
                  className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md shadow-cyan-500/25 flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Lock className="w-4 h-4 text-slate-950" />
                  <span>{isAuthenticated ? 'Enter Trading Terminal' : 'Sign Up to Access Platform'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => (isAuthenticated ? onEnterApp() : onOpenAuth('login'))}
                  className="px-5 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/80 text-slate-800 dark:text-white font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>{isAuthenticated ? 'Go to Dashboard' : 'Client Login'}</span>
                </button>
              </div>

              {/* Unboxed Metadata Trust Line */}
              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  90% Finite Coverage Bounds
                </span>
                <span aria-hidden="true">·</span>
                <span>Dual-Exchange (NSE / NASDAQ)</span>
                <span aria-hidden="true">·</span>
                <span>FinBERT NLP Verification</span>
                <span aria-hidden="true">·</span>
                <span>Two-Sample KS Drift Audit</span>
              </div>
            </motion.div>

            {/* Right Column: Animated Quant Copilot & Live Matrix Showcase */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6"
            >
              {/* Segmented View Switcher */}
              <div className="mb-3.5 flex items-center justify-between">
                <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300/80 dark:border-slate-700/80 text-xs font-semibold backdrop-blur-md">
                  <button
                    onClick={() => setHeroTab('ai-card')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      heroTab === 'ai-card'
                        ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Copilot (Live Motion)</span>
                  </button>
                  <button
                    onClick={() => setHeroTab('terminal')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      heroTab === 'terminal'
                        ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Raw Telemetry Matrix</span>
                  </button>
                </div>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 hidden sm:inline">
                  Interactive Preview
                </span>
              </div>

              {/* View 1: Animated Quant Card (Direct replica of Video 1 & Video 2) */}
              {heroTab === 'ai-card' ? (
                <div className="animate-fadeIn">
                  <AnimatedQuantCard
                    onSelectPrompt={(query) => {
                      if (isAuthenticated) {
                        onEnterApp();
                      } else {
                        onOpenAuth('login');
                      }
                    }}
                    onExploreTicker={(sym) => {
                      if (isAuthenticated) {
                        onEnterApp();
                      } else {
                        onOpenAuth('login');
                      }
                    }}
                  />
                </div>
              ) : (
                /* View 2: High-Density Live Telemetry Matrix */
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-md animate-fadeIn">
                  {/* Terminal Header */}
                  <div className="p-3.5 bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-white">
                        LIVE QUANTITATIVE PREVIEW
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40">
                      Split-Conformal v2.1
                    </span>
                  </div>

                  {/* Ticker Selector Tabs */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/60 flex items-center gap-1.5">
                    {(['RELIANCE.NS', 'NVDA', 'TCS.NS'] as const).map(sym => (
                      <button
                        key={sym}
                        onClick={() => setActiveHeroTicker(sym)}
                        className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                          activeHeroTicker === sym
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {sym.replace('.NS', '')}
                      </button>
                    ))}
                    <span className="text-[11px] text-slate-400 font-mono ml-auto">
                      {currentHeroData.exchange}
                    </span>
                  </div>

                  {/* Active Data Matrix */}
                  <div className="p-4 space-y-4 text-xs font-mono">
                    {/* Current Price Tape */}
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest">
                          {currentHeroData.name}
                        </div>
                        <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight tabular-nums mt-0.5">
                          {currentHeroData.currency}{currentHeroData.price.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 tabular-nums justify-end">
                          <TrendingUp className="w-3.5 h-3.5" />
                          +{currentHeroData.change} (+{currentHeroData.changePercent}%)
                        </span>
                        <span className="text-[10px] text-slate-400">Live Tick</span>
                      </div>
                    </div>

                    {/* Conformal 90% Confidence Interval Envelope */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          90% Conformal Forecast
                        </span>
                        <span className="text-cyan-700 dark:text-cyan-300 font-bold tabular-nums">
                          {currentHeroData.currency}{currentHeroData.predicted.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-500 tabular-nums">
                        <span>Lower: {currentHeroData.currency}{currentHeroData.lowerBound.toLocaleString()}</span>
                        <span>Upper: {currentHeroData.currency}{currentHeroData.upperBound.toLocaleString()}</span>
                      </div>

                      {/* Visual Confidence Envelope Bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 relative overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-2 rounded-full opacity-90"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 flex justify-between">
                        <span>5th Percentile</span>
                        <span>Uncertainty: ±{(currentHeroData.intervalPct / 2).toFixed(1)}%</span>
                        <span>95th Percentile</span>
                      </div>
                    </div>

                    {/* Macro Regime & FinBERT Sentiment Row */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">HMM Market Regime</div>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-sans mt-0.5 truncate">
                          {currentHeroData.regime}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {currentHeroData.regimeProb}% Transition Stability
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">FinBERT Tone Polarity</div>
                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-sans mt-0.5">
                          {currentHeroData.sentiment}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Score: +{currentHeroData.sentimentScore} / 1.0
                        </div>
                      </div>
                    </div>

                    {/* Concept Drift Status Pill */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <ActivitySquare className="w-3.5 h-3.5 text-amber-500" />
                        Two-Sample KS Drift Test:
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {currentHeroData.driftStatus}
                      </span>
                    </div>

                    {/* Authentication Callout inside Terminal */}
                    <div className="pt-2">
                      <button
                        onClick={() => handleFeatureClick()}
                        className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-sans font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm shadow-cyan-500/20"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{isAuthenticated ? 'Open Interactive Terminal' : 'Sign In to Unlock Full Live Analytics'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* CONTINUOUS LIVE MARQUEE MARKET TAPE (Smooth Infinite Motion) */}
      <div className="py-2.5 bg-slate-900 border-b border-slate-800/90 text-white overflow-hidden relative select-none">
        <div className="animate-marquee flex items-center gap-6 whitespace-nowrap text-xs font-mono">
          {[
            { ticker: 'NIFTY 50', price: '24,850.40', chg: '+0.68%', up: true },
            { ticker: 'SENSEX', price: '81,420.10', chg: '+0.62%', up: true },
            { ticker: 'BANK NIFTY', price: '51,340.20', chg: '+0.81%', up: true },
            { ticker: 'S&P 500', price: '5,815.20', chg: '+0.41%', up: true },
            { ticker: 'NASDAQ 100', price: '20,340.50', chg: '+0.82%', up: true },
            { ticker: 'RELIANCE', price: '₹2,980.50', chg: '+1.24%', up: true },
            { ticker: 'NVDA', price: '$128.40', chg: '+3.15%', up: true },
            { ticker: 'TCS', price: '₹4,210.75', chg: '+0.85%', up: true },
            { ticker: 'AAPL', price: '$228.50', chg: '+0.94%', up: true },
            { ticker: 'HDFCBANK', price: '₹1,675.40', chg: '+1.10%', up: true },
            { ticker: 'MSFT', price: '$442.10', chg: '+1.05%', up: true },
            // Repeat once for infinite smooth seamless loop
            { ticker: 'NIFTY 50', price: '24,850.40', chg: '+0.68%', up: true },
            { ticker: 'SENSEX', price: '81,420.10', chg: '+0.62%', up: true },
            { ticker: 'BANK NIFTY', price: '51,340.20', chg: '+0.81%', up: true },
            { ticker: 'S&P 500', price: '5,815.20', chg: '+0.41%', up: true },
            { ticker: 'NASDAQ 100', price: '20,340.50', chg: '+0.82%', up: true },
            { ticker: 'RELIANCE', price: '₹2,980.50', chg: '+1.24%', up: true },
            { ticker: 'NVDA', price: '$128.40', chg: '+3.15%', up: true },
            { ticker: 'TCS', price: '₹4,210.75', chg: '+0.85%', up: true },
            { ticker: 'AAPL', price: '$228.50', chg: '+0.94%', up: true },
            { ticker: 'HDFCBANK', price: '₹1,675.40', chg: '+1.10%', up: true },
            { ticker: 'MSFT', price: '$442.10', chg: '+1.05%', up: true }
          ].map((item, idx) => (
            <div key={idx} className="inline-flex items-center gap-2 px-2 shrink-0">
              <span className="font-bold text-slate-300">{item.ticker}</span>
              <span className="text-white font-mono">{item.price}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${item.up ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-rose-950 text-rose-400 border border-rose-800/60'}`}>
                {item.chg}
              </span>
              <span className="text-slate-600 font-sans ml-2">/</span>
            </div>
          ))}
        </div>
      </div>

      {/* INTERACTIVE QUANT SIMULATION & CONFORMAL STRESS-TEST LAB */}
      <section className="py-14 lg:py-18 bg-white dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              Interactive Mathematical Stress-Test Sandbox
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
              Test Live Model Adaptations & Finite Bounds
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Select macroeconomic regimes and adjust non-parametric coverage bounds (1 - α) to observe how the <strong>conformal confidence envelope</strong> and <strong>HMM latent regime</strong> adapt in real time.
            </p>
          </div>

          {/* Dual Interactive Controls: Regime Selector + Confidence Level Selector */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {/* Control 1: Regime Shock Selector */}
            <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold gap-1">
              <button
                onClick={() => setSimRegime('bullish')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  simRegime === 'bullish'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Bullish Low-Vol</span>
              </button>
              <button
                onClick={() => setSimRegime('sideways')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  simRegime === 'sideways'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ActivitySquare className="w-3.5 h-3.5" />
                <span>Mean-Reverting</span>
              </button>
              <button
                onClick={() => setSimRegime('crisis')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  simRegime === 'crisis'
                    ? 'bg-rose-500 text-white font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Crisis Shock</span>
              </button>
            </div>

            {/* Control 2: Conformal Coverage Level (1 - α) */}
            <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono gap-1">
              <span className="px-2.5 py-2 text-slate-400 text-[11px] uppercase tracking-wider flex items-center">
                Coverage:
              </span>
              {([80, 90, 95, 99] as const).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setConfidenceLevel(lvl)}
                  className={`px-2.5 py-2 rounded-xl transition-all cursor-pointer font-bold ${
                    confidenceLevel === lvl
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lvl}%
                </button>
              ))}
            </div>
          </div>

          {/* Animated Simulation Dashboard Cards with Dynamic Calculations */}
          {(() => {
            // Dynamic quantitative computations
            const baseInterval = simRegime === 'bullish' ? 3.8 : simRegime === 'sideways' ? 6.4 : 15.2;
            const alphaFactor = confidenceLevel === 80 ? 0.72 : confidenceLevel === 90 ? 1.0 : confidenceLevel === 95 ? 1.38 : 1.85;
            const effectiveInterval = (baseInterval * alphaFactor).toFixed(1);
            const testPrice = 1000;
            const lowerPrice = (testPrice * (1 - parseFloat(effectiveInterval) / 100)).toFixed(1);
            const upperPrice = (testPrice * (1 + parseFloat(effectiveInterval) / 100)).toFixed(1);
            const barWidthPercent = Math.min(100, Math.max(15, parseFloat(effectiveInterval) * 3.5));

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Simulation Card 1: Dynamic Conformal Envelope */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3 transition-all">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 font-medium">{confidenceLevel}% Conformal Envelope</span>
                    <span className={`font-bold tabular-nums ${simRegime === 'crisis' ? 'text-rose-600 dark:text-rose-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                      ±{effectiveInterval}%
                    </span>
                  </div>
                  
                  {/* Visual Confidence Envelope Bar */}
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        simRegime === 'bullish'
                          ? 'bg-emerald-500'
                          : simRegime === 'sideways'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${barWidthPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Bounds: ₹{lowerPrice}</span>
                    <span className="text-slate-400 font-sans">Baseline ₹{testPrice}</span>
                    <span>₹{upperPrice}</span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-snug">
                    {simRegime === 'bullish'
                      ? `Tight residuals yield compact ±${effectiveInterval}% bounds, optimizing leverage and risk-adjusted return.`
                      : simRegime === 'sideways'
                      ? `Oscillating prices expand bounds to ±${effectiveInterval}%, triggering mean-reversion filters.`
                      : `Severe variance shock detected. Conformal envelope expands to ±${effectiveInterval}% to prevent empirical violation.`}
                  </p>
                </div>

                {/* Simulation Card 2: HMM Transition Probability */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3 transition-all">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 font-medium">HMM Latent State</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {simRegime === 'bullish' ? 'State 0: Trending (92%)' : simRegime === 'sideways' ? 'State 1: Ranging (74%)' : 'State 2: Shock (88%)'}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        simRegime === 'bullish'
                          ? 'w-[92%] bg-emerald-500'
                          : simRegime === 'sideways'
                          ? 'w-[74%] bg-amber-500'
                          : 'w-[88%] bg-rose-500'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Persistence: {simRegime === 'bullish' ? '0.88' : simRegime === 'sideways' ? '0.74' : '0.82'}</span>
                    <span>Simulated Sharpe: {simRegime === 'bullish' ? '2.41' : simRegime === 'sideways' ? '1.34' : '0.28'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {simRegime === 'bullish'
                      ? 'Low volatility regime persistence confirms steady directional momentum.'
                      : simRegime === 'sideways'
                      ? 'Bimodal probability matrix activates Bollinger and ATR reversion boundaries.'
                      : 'Turbulence trigger feeds directly into stop-loss and hedging matrix.'}
                  </p>
                </div>

                {/* Simulation Card 3: KS Drift Detection Guard */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3 transition-all">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 font-medium">KS Distribution P-Value</span>
                    <span className={`font-bold tabular-nums ${simRegime === 'crisis' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {simRegime === 'bullish' ? 'p = 0.521 (Safe)' : simRegime === 'sideways' ? 'p = 0.312 (Safe)' : 'p = 0.018 (Drift Alert)'}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        simRegime === 'bullish'
                          ? 'w-[85%] bg-emerald-500'
                          : simRegime === 'sideways'
                          ? 'w-[65%] bg-emerald-500'
                          : 'w-[20%] bg-rose-500'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Null Hypothesis: {simRegime === 'crisis' ? 'REJECTED' : 'ACCEPTED'}</span>
                    <span>α = 0.05 Critical</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {simRegime === 'crisis'
                      ? 'Distribution shift detected (p < 0.05). Automated fail-safe automatically expands conformal intervals to prevent losses.'
                      : 'Two-sample test confirms stationary residuals. Predictions maintain standard calibration.'}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* 2. PLATFORM FEATURE MATRIX (AUTHENTICATION GATED) */}
      <section id="features" className="py-16 lg:py-20 bg-slate-100/70 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              Platform Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
              Enterprise Quantitative Capabilities
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Create a free account or sign in to access interactive charts, customized watchlists, automated alert rules, and real-time portfolio tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Dashboard */}
            <div className="group p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300 space-y-4 relative shadow-sm hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" /> Requires Auth
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">Live Market Dashboard</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Real-time market tape across Nifty 50, Sensex, S&P 500, Nasdaq, and VIX. Macro regime indicators, top movers, and rapid ticker forecast inspector.
              </p>
              <button
                onClick={() => handleFeatureClick('dashboard')}
                className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-cyan-500 hover:text-slate-950 dark:bg-slate-800 dark:hover:bg-cyan-500 dark:hover:text-slate-950 text-xs font-semibold text-cyan-700 dark:text-cyan-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>{isAuthenticated ? 'Open Dashboard' : 'Sign In to View Dashboard'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Feature 2: Watchlist */}
            <div className="group p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 space-y-4 relative shadow-sm hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <BookmarkCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" /> Requires Auth
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Custom Asset Watchlist</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Add Indian (NSE) and US stocks to your personal watchlist. View live quotes, 90% conformal intervals, HMM regimes, and concept drift warnings side-by-side.
              </p>
              <button
                onClick={() => handleFeatureClick('watchlist')}
                className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-emerald-500 hover:text-slate-950 dark:bg-slate-800 dark:hover:bg-emerald-500 dark:hover:text-slate-950 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>{isAuthenticated ? 'View Watchlist' : 'Sign In to View Watchlist'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Feature 3: Portfolio */}
            <div className="group p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 space-y-4 relative shadow-sm hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" /> Requires Auth
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Portfolio Management</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Track personal equity holdings, cost bases, unrealized profit/loss, and portfolio asset allocations with real-time mark-to-market prices.
              </p>
              <button
                onClick={() => handleFeatureClick('portfolio')}
                className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-indigo-500 hover:text-white dark:bg-slate-800 dark:hover:bg-indigo-500 dark:hover:text-white text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>{isAuthenticated ? 'Open Portfolio' : 'Sign In to View Portfolio'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Feature 4: Stock Analysis */}
            <div className="group p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300 space-y-4 relative shadow-sm hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 group-hover:scale-110 transition-transform">
                  <LineChart className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" /> Requires Auth
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">Deep Stock Analysis</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Interactive OHLCV charts with SMA 20/50, Bollinger Bands, RSI & MACD subcharts, Conformal 90% prediction envelope, and SHAP-like feature attributions.
              </p>
              <button
                onClick={() => handleFeatureClick('analysis')}
                className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-cyan-500 hover:text-slate-950 dark:bg-slate-800 dark:hover:bg-cyan-500 dark:hover:text-slate-950 text-xs font-semibold text-cyan-700 dark:text-cyan-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>{isAuthenticated ? 'Analyze Stocks' : 'Sign In for Stock Analysis'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Feature 5: Model Backtesting & Performance */}
            <div className="group p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 space-y-4 relative shadow-sm hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 group-hover:scale-110 transition-transform">
                  <ActivitySquare className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" /> Requires Auth
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Backtesting & Drift Audit</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Out-of-sample forward backtest metrics (MAE, RMSE, MAPE, R², 72%+ Directional Accuracy) and two-sample Kolmogorov-Smirnov drift test distributions.
              </p>
              <button
                onClick={() => handleFeatureClick('performance')}
                className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-amber-500 hover:text-slate-950 dark:bg-slate-800 dark:hover:bg-amber-500 dark:hover:text-slate-950 text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>{isAuthenticated ? 'View Metrics' : 'Sign In to View Metrics'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Feature 6: Alerts & News */}
            <div className="group p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 space-y-4 relative shadow-sm hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 group-hover:scale-110 transition-transform">
                  <Bell className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" /> Requires Auth
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Alerts & News Intelligence</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Automated breakout triggers, regime transition alarms, and FinBERT tone filtering with source credibility and claim verification.
              </p>
              <button
                onClick={() => handleFeatureClick('alerts')}
                className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-purple-500 hover:text-white dark:bg-slate-800 dark:hover:bg-purple-500 dark:hover:text-white text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>{isAuthenticated ? 'Manage Alerts' : 'Sign In to Manage Alerts'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE FOUR CORE MATHEMATICAL USPs */}
      <section id="usps" className="py-16 lg:py-20 bg-white dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              Institutional Innovations
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
              Four Core Mathematical Differentiators
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Why professional quantitative desks rely on conformal prediction intervals, latent Markov state transitions, and distribution drift monitors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* USP 1 */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-cyan-500/40 transition-colors space-y-4">
              <div className="h-10 w-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 flex items-center justify-center text-cyan-700 dark:text-cyan-400">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                01. Conformal Prediction (MAPIE)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Rather than claiming a false deterministic future (e.g. "Price will be ₹3,025"), the model calculates a <strong>90% finite-sample prediction interval</strong> [₹2,915 — ₹3,136]. Users observe exact uncertainty widths based on calibrated out-of-sample residuals.
              </p>
              <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                <div className="text-cyan-600 dark:text-cyan-400 font-semibold mb-1">Guaranteed Finite Coverage:</div>
                <div>Predicted Price: ₹3,025.80 (±3.6% interval)</div>
                <div className="text-slate-500 text-[10px] mt-1">Mathematical bounds without distribution assumptions</div>
              </div>
            </div>

            {/* USP 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/40 transition-colors space-y-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                02. HMM Market Regime Detection
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Markets oscillate between quiet trending phases and turbulent tail-risk cascades. Our Gaussian Hidden Markov Model isolates <strong>Low Volatility / Bullish</strong> and <strong>High Volatility / Bearish</strong> regimes, adjusting predictions before shocks materialize.
              </p>
              <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold mb-1">State Transition Engine:</div>
                <div>P(Bull → Bull): 88% · P(Bear → Bear): 82%</div>
                <div className="text-slate-500 text-[10px] mt-1">Fed as conditioned input into XGBoost model</div>
              </div>
            </div>

            {/* USP 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-indigo-500/40 transition-colors space-y-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-700 dark:text-indigo-400">
                <Newspaper className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                03. FinBERT & Fact Verification Fusion
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Raw financial headlines are processed through Hugging Face's <code>yiyanghkust/finbert-tone</code> to extract discrete positive/neutral/negative probabilities, coupled with Google Fact Check Tools claim verification and domain reputation scoring.
              </p>
              <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                <div className="text-indigo-600 dark:text-indigo-400 font-semibold mb-1">Multimodal Input Vector:</div>
                <div>Tone: Positive (81%) · Fact-Check Weight: 0.94</div>
                <div className="text-slate-500 text-[10px] mt-1">Filters unverified rumors from certified disclosures</div>
              </div>
            </div>

            {/* USP 4 */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-amber-500/40 transition-colors space-y-4">
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400">
                <ActivitySquare className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                04. Kolmogorov-Smirnov Concept Drift
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Financial data is non-stationary. The platform continuously runs two-sample KS tests (<code>scipy.stats.ks_2samp</code>) comparing training baseline distributions with live 30-day inference windows, raising automated safety warnings when distribution drift occurs.
              </p>
              <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                <div className="text-amber-600 dark:text-amber-400 font-semibold mb-1">Distribution Drift Guard:</div>
                <div>Null Hypothesis Testing · p-value &lt; 0.05 Alert Trigger</div>
                <div className="text-slate-500 text-[10px] mt-1">Automatically widens conformal intervals upon drift</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. VISUAL PIPELINE WORKFLOW WITH REAL-TIME SIGNAL FLOW */}
      <section id="pipeline" className="py-16 lg:py-20 bg-slate-100/70 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              End-to-End Pipeline
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
              The Quantitative Intelligence Workflow
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Continuous live stream ingestion through non-parametric risk calibration
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative">
            {[
              { step: '01', title: 'Market OHLCV', desc: 'Real tick bars from NSE & US exchanges', badge: 'Live Ticks' },
              { step: '02', title: 'Technical Factors', desc: 'SMA, RSI, MACD, Bollinger, ATR', badge: '14 Factors' },
              { step: '03', title: 'FinBERT NLP', desc: 'Hugging Face financial tone scoring', badge: 'NLP Vector' },
              { step: '04', title: 'HMM Regimes', desc: 'Gaussian 2-state volatility modeling', badge: 'Regime Prob' },
              { step: '05', title: 'XGBoost Fusion', desc: 'Non-linear tree ensemble inference', badge: 'Ensemble' },
              { step: '06', title: 'Conformal 90%', desc: 'Calibrated prediction interval', badge: '1-α Coverage' }
            ].map((w, idx) => (
              <div
                key={w.step}
                className="group relative p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5 transition-all text-left shadow-sm hover:-translate-y-1 duration-300"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                    {w.step}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  {w.title}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                  {w.desc}
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>{w.badge}</span>
                  <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. MODEL SAFETY & UNCERTAINTY SECTION */}
      <section id="safety" className="py-16 lg:py-20 bg-white dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                Prediction ≠ Guarantee: Understanding Model Uncertainty
              </h3>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Financial machine learning is inherently stochastic. No statistical model, deep neural network, or ensemble system can guarantee future prices. AlphaQuant AI is specifically built to prevent overconfidence bias:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-900 dark:text-white block mb-1">Finite-Sample Bounds</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">90% conformal intervals indicate where prices historically reside under similar variance.</p>
              </div>
              <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-900 dark:text-white block mb-1">No Data Leakage</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Strict out-of-sample forward backtesting prevents future-lookahead distortion.</p>
              </div>
              <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-900 dark:text-white block mb-1">Drift Invalidation</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Models automatically warn the operator when macroeconomic regime drift occurs.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION / REGISTRATION PROMPT */}
      <section className="py-16 lg:py-20 text-center bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-3xl mx-auto px-4 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
            Ready to Access the Full AI Trading Terminal?
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Log in or create your account to unlock the full dashboard, customized watchlists, real-time portfolio management, and alerts.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => onOpenAuth('register')}
              className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-md shadow-cyan-500/20 cursor-pointer flex items-center gap-2"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onOpenAuth('login')}
              className="px-6 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold text-sm transition-all cursor-pointer shadow-sm"
            >
              <span>Sign In to Existing Account</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4">
          AlphaQuant AI Platform · Educational & Research Quantitative System · Built for institutional financial software evaluation
        </div>
      </footer>
    </div>
  );
};
