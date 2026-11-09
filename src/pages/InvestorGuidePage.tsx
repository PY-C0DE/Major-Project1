import React, { useState } from 'react';
import { 
  BookOpen, 
  Lightbulb, 
  ShieldCheck, 
  CheckCircle, 
  Target, 
  Sparkles, 
  ArrowRight, 
  Calculator,
  Award,
  Check
} from 'lucide-react';
import { 
  GUIDE_TOPICS, 
  CURATED_SHARE_SUGGESTIONS, 
  INVESTOR_GOLDEN_RULES, 
  formatStockCurrency 
} from '../data/investorGuideData';

interface Props {
  onSelectTicker: (ticker: string) => void;
}

export const InvestorGuidePage: React.FC<Props> = ({ onSelectTicker }) => {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'guide' | 'calculator' | 'rules'>('suggestions');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('shares_basics');
  const [filterAction, setFilterAction] = useState<'ALL' | 'BUY' | 'HOLD' | 'SELL'>('ALL');

  // Calculator State
  const [calcInitial, setCalcInitial] = useState<number>(25000);
  const [calcMonthly, setCalcMonthly] = useState<number>(5000);
  const [calcYears, setCalcYears] = useState<number>(5);
  const [calcReturnRate, setCalcReturnRate] = useState<number>(14);
  const [calcDividendYield, setCalcDividendYield] = useState<number>(2.5);
  const [calcCurrency, setCalcCurrency] = useState<'INR' | 'USD'>('INR');

  const currentTopic = GUIDE_TOPICS.find(t => t.id === selectedTopicId) || GUIDE_TOPICS[0];

  const filteredSuggestions = CURATED_SHARE_SUGGESTIONS.filter(item => {
    if (filterAction === 'ALL') return true;
    return item.recommendedAction === filterAction;
  });

  // Calculate compound return
  const totalMonths = calcYears * 12;
  const monthlyRate = (calcReturnRate + calcDividendYield) / 100 / 12;
  let futureValue = calcInitial;
  let totalDeposited = calcInitial;

  for (let m = 0; m < totalMonths; m++) {
    futureValue = futureValue * (1 + monthlyRate) + calcMonthly;
    totalDeposited += calcMonthly;
  }
  const totalGains = Math.max(0, futureValue - totalDeposited);
  const currencySymbol = calcCurrency === 'INR' ? '₹' : '$';

  return (
    <div className="space-y-6 animate-fadeIn pb-12 text-left">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-display">
              Beginner's Investor Academy & Share Ideas
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              Zero to Confident
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Master the fundamentals of equity investing, learn when to Buy, Hold, or Sell, and explore curated mathematical picks.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'suggestions'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Shares ({CURATED_SHARE_SUGGESTIONS.length})
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'guide'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            How Shares Work
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'calculator'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Compound Calculator
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'rules'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Golden Rules
          </button>
        </div>
      </div>

      {/* TAB 1: CURATED SHARE IDEAS */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          {/* Filter Row */}
          <div className="flex items-center justify-between flex-wrap gap-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">Filter by Signal:</span>
              {(['ALL', 'BUY', 'HOLD', 'SELL'] as const).map(action => (
                <button
                  key={action}
                  onClick={() => setFilterAction(action)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    filterAction === action
                      ? action === 'BUY'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : action === 'HOLD'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : action === 'SELL'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Calibrated with Conformal 90% Statistical Coverage</span>
            </div>
          </div>

          {/* Suggestions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuggestions.map((item) => {
              const isBuy = item.recommendedAction === 'BUY';
              const isHold = item.recommendedAction === 'HOLD';

              return (
                <div
                  key={item.ticker}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Ticker, Name, Action Badge */}
                    <div className="flex items-start justify-between gap-3 mb-2.5 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white font-mono">
                            {item.ticker}
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-[180px] sm:max-w-[200px]" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide block mt-0.5">
                          {item.category}
                        </span>
                      </div>

                      <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                        isBuy 
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' 
                          : isHold
                          ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                          : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                      }`}>
                        {item.recommendedAction}
                      </span>
                    </div>

                    {/* Plain English explanation */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed font-sans">
                      {item.simpleExplanation}
                    </p>

                    {/* Rationale callout */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 mb-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Why this recommendation:
                      </div>
                      <div className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                        {item.whyInvestNow}
                      </div>
                    </div>

                    {/* Target & Stop Loss Pills */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3 font-mono">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Current</span>
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {formatStockCurrency(item.currentPrice, item.ticker, item.currency)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300">
                        <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase">Target</span>
                        <span className="font-bold text-xs">
                          {formatStockCurrency(item.targetPrice, item.ticker, item.currency)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300">
                        <span className="block text-[10px] text-rose-700 dark:text-rose-400 font-semibold uppercase">Stop Loss</span>
                        <span className="font-bold text-xs">
                          {formatStockCurrency(item.stopLoss, item.ticker, item.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Risk: <span className="text-slate-800 dark:text-slate-200 font-semibold">{item.riskRating}</span>
                    </span>
                    <button
                      onClick={() => onSelectTicker(item.ticker)}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                    >
                      <span>Deep Analysis</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: FOUNDATION GUIDE */}
      {activeTab === 'guide' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 space-y-2">
            <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-mono">
              Learning Modules ({GUIDE_TOPICS.length})
            </span>
            {GUIDE_TOPICS.map((topic) => {
              const isSelected = topic.id === selectedTopicId;
              return (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500/80 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900 dark:text-white mb-1">
                    {topic.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {topic.shortSummary}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="md:col-span-8 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <BookOpen className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                {currentTopic.title}
              </h3>
            </div>

            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              {currentTopic.fullExplanation}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Lightbulb className="w-3.5 h-3.5" />
                Real-World Example
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {currentTopic.exampleScenario}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 font-mono">
                  Core Investor Rule:
                </div>
                <div className="text-xs text-emerald-800 dark:text-emerald-400 mt-0.5 leading-relaxed">
                  {currentTopic.keyTakeaway}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPOUND RETURN CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Inputs Column */}
            <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Investment Parameters</span>
                </h4>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
                  <button
                    onClick={() => setCalcCurrency('INR')}
                    className={`px-2 py-0.5 rounded font-bold ${calcCurrency === 'INR' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'}`}
                  >
                    ₹ INR
                  </button>
                  <button
                    onClick={() => setCalcCurrency('USD')}
                    className={`px-2 py-0.5 rounded font-bold ${calcCurrency === 'USD' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'}`}
                  >
                    $ USD
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Initial Starting Investment ({currencySymbol})
                </label>
                <input
                  type="number"
                  value={calcInitial}
                  onChange={(e) => setCalcInitial(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Monthly Contribution ({currencySymbol}/month)
                </label>
                <input
                  type="number"
                  value={calcMonthly}
                  onChange={(e) => setCalcMonthly(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  <span>Time Horizon:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{calcYears} Years</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={calcYears}
                  onChange={(e) => setCalcYears(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  <span>Expected Annual Growth (CAGR):</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{calcReturnRate}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={calcReturnRate}
                  onChange={(e) => setCalcReturnRate(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  <span>Reinvested Dividend Yield:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{calcDividendYield}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="0.5"
                  value={calcDividendYield}
                  onChange={(e) => setCalcDividendYield(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            {/* Results Column */}
            <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1 font-mono">
                  Projected Portfolio Value After {calcYears} Years
                </span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {currencySymbol}{Math.round(futureValue).toLocaleString()}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Calculated using monthly compounding with {(calcReturnRate + calcDividendYield).toFixed(1)}% total effective return.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Total Capital Deposited</span>
                  <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                    {currencySymbol}{Math.round(totalDeposited).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                  <span className="text-[10px] uppercase font-mono text-emerald-600 dark:text-emerald-400 block">Pure Compound Growth</span>
                  <span className="text-base font-bold font-mono">
                    +{currencySymbol}{Math.round(totalGains).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-300 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5" />
                  The Power of Time
                </span>
                <p className="leading-relaxed">
                  Your money earns interest, and then that interest earns interest. Over {calcYears} years, {Math.round((totalGains / (futureValue || 1)) * 100)}% of your final wealth was generated purely through mathematical compounding.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GOLDEN RULES CHECKLIST */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
              These 5 golden rules represent the consensus wisdom of world-class value investors and quantitative risk managers. Review them before placing any trade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INVESTOR_GOLDEN_RULES.map((rule, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-start gap-3.5"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-1 font-display">
                    {rule.title}
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                    {rule.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorGuidePage;
