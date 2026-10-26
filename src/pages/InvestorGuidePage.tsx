import React, { useState } from 'react';
import { 
  BookOpen, 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  CheckCircle, 
  Target, 
  Sparkles, 
  ArrowRight, 
  HelpCircle,
  Briefcase
} from 'lucide-react';
import { NewInvestorShareIdea, InvestorGuideTopic } from '../types';

interface Props {
  onSelectTicker: (ticker: string) => void;
}

const GUIDE_TOPICS: InvestorGuideTopic[] = [
  {
    id: 'shares_basics',
    title: '1. What Are Shares & Equity?',
    icon: 'PieChart',
    shortSummary: 'When you buy a share, you own an actual fractional slice of a real company.',
    fullExplanation: 'A share represents legal ownership in a public enterprise. If a company has 1,000,000 shares and you own 1,000, you own 0.1% of all revenue, cash flows, assets, and future profits. You do not need thousands of dollars to begin; modern exchanges support buying single shares or fractional units.',
    keyTakeaway: 'You are an owner of a business, not a gambler betting on price tickers.',
    exampleScenario: 'Buying 1 share of Apple (AAPL) means Apple works for you every time someone purchases an iPhone or iCloud subscription.',
  },
  {
    id: 'price_movement',
    title: '2. Why Do Stock Prices Move?',
    icon: 'TrendingUp',
    shortSummary: 'Stock prices are determined second-by-second by supply, demand, and expected earnings.',
    fullExplanation: 'Every second, buyers and sellers place orders on the exchange. If more investors want to buy than sell, the price rises until an equilibrium is found. Price changes are driven by company earnings reports, interest rate policy from central banks, industry competition, and macroeconomic news.',
    keyTakeaway: 'In the short run the market is a voting machine; in the long run it is a weighing machine of earnings.',
    exampleScenario: 'If Microsoft reports 25% cloud revenue growth, institutional fund managers bid up the price to accumulate shares.',
  },
  {
    id: 'dividends_vs_growth',
    title: '3. Dividends vs. Capital Gains',
    icon: 'DollarSign',
    shortSummary: 'Two ways to make money: recurring cash payouts (dividends) or share price increases (capital gains).',
    fullExplanation: 'Mature, profitable businesses like Coca-Cola or ITC distribute excess cash directly to shareholders as bank dividends every quarter. Fast-growing technology companies like Nvidia reinvest 100% of their cash back into research and infrastructure, giving investors returns through surging share prices instead.',
    keyTakeaway: 'A balanced portfolio combines stable dividend payers with long-term compound growth companies.',
    exampleScenario: 'Holding $10,000 in a 4% dividend stock deposits $400 in cash into your bank account every year regardless of market swings.',
  },
  {
    id: 'buy_hold_sell_rules',
    title: '4. When Should You Buy, Hold, or Sell?',
    icon: 'Target',
    shortSummary: 'TradeVision removes emotional impulse by giving algorithmic Buy, Hold, and Sell signals.',
    fullExplanation: 'Never buy just because a stock surged yesterday, and never panic-sell just because the market has a bad day. Use math: BUY when high-quality businesses trade near the lower statistical conformal bound. HOLD when the price is safely progressing inside the expected channel. SELL when the stock hits full valuation, pierces the upper bound, or company fundamentals deteriorate.',
    keyTakeaway: 'Protect your downside first with stop-losses; the upside takes care of itself.',
    exampleScenario: 'If your stock gained 45% and tests the upper conformal boundary, taking partial profits locks in tangible gains.',
  },
];

const CURATED_SHARE_SUGGESTIONS: NewInvestorShareIdea[] = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    category: 'Conservative Wealth Builder',
    recommendedAction: 'BUY',
    currentPrice: 228.50,
    targetPrice: 260.00,
    stopLoss: 210.00,
    expectedAnnualReturn: '14 - 18%',
    riskRating: 'Low Risk',
    simpleExplanation: 'Unmatched consumer ecosystem, over 2.2 billion active devices, and massive annual share buybacks provide downside defense.',
    whyInvestNow: 'Upcoming Apple Intelligence cycle is triggering a multi-year iPhone upgrade supercycle.',
    minimumInvestmentAmount: 228.50,
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    category: 'High Alpha Momentum',
    recommendedAction: 'BUY',
    currentPrice: 138.25,
    targetPrice: 175.00,
    stopLoss: 122.00,
    expectedAnnualReturn: '25 - 35%',
    riskRating: 'Higher Volatility',
    simpleExplanation: 'Monopolistic lead in AI GPUs, CUDA software ecosystem, and cloud hyperscaler infrastructure spending worldwide.',
    whyInvestNow: 'Blackwell architecture orders are sold out for 12 months, locking in guaranteed record quarterly free cash flow.',
    minimumInvestmentAmount: 138.25,
  },
  {
    ticker: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    category: 'Conservative Wealth Builder',
    recommendedAction: 'BUY',
    currentPrice: 1720.00,
    targetPrice: 2050.00,
    stopLoss: 1580.00,
    expectedAnnualReturn: '16 - 20%',
    riskRating: 'Low Risk',
    simpleExplanation: 'India\'s largest private lender. Post-merger credit-deposit ratio is normalizing with superior asset quality and branch reach.',
    whyInvestNow: 'Valuation is at a 5-year historical discount compared to underlying ROE and credit growth expansion.',
    minimumInvestmentAmount: 1720.00,
  },
  {
    ticker: 'RELIANCE',
    name: 'Reliance Industries',
    category: 'Balanced Growth',
    recommendedAction: 'HOLD',
    currentPrice: 2780.00,
    targetPrice: 3100.00,
    stopLoss: 2620.00,
    expectedAnnualReturn: '12 - 15%',
    riskRating: 'Medium Risk',
    simpleExplanation: 'Powerhouse conglomerate spanning Retail, Jio 5G Telecom, and Renewable Green Energy transition.',
    whyInvestNow: 'Strong core, but currently in a consolidation channel. Existing holders should HOLD; wait for dip to add fresh shares.',
    minimumInvestmentAmount: 2780.00,
  },
  {
    ticker: 'SPECULATIVE_OVERBOUGHT',
    name: 'High-P/E Speculative Meme Stocks',
    category: 'High Alpha Momentum',
    recommendedAction: 'SELL',
    currentPrice: 94.50,
    targetPrice: 65.00,
    stopLoss: 102.00,
    expectedAnnualReturn: 'Negative / Downside Risk',
    riskRating: 'Higher Volatility',
    simpleExplanation: 'Unprofitable companies trading above 100x earnings with weakening insider ownership and negative free cash flow.',
    whyInvestNow: 'SELL signal triggered: Conformal bands confirm upper exhaust with extreme RSI overbought reading (>82).',
    minimumInvestmentAmount: 94.50,
  },
];

export const InvestorGuidePage: React.FC<Props> = ({ onSelectTicker }) => {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'guide'>('suggestions');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('shares_basics');
  const [filterAction, setFilterAction] = useState<'ALL' | 'BUY' | 'HOLD' | 'SELL'>('ALL');

  const currentTopic = GUIDE_TOPICS.find(t => t.id === selectedTopicId) || GUIDE_TOPICS[0];

  const filteredSuggestions = CURATED_SHARE_SUGGESTIONS.filter(item => {
    if (filterAction === 'ALL') return true;
    return item.recommendedAction === filterAction;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Beginner's Investor Academy & Share Ideas
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              Tool
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Master the fundamentals of equity investing, learn when to Buy, Hold, or Sell, and explore curated mathematical picks.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'suggestions'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Shares to Buy, Hold & Sell
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'guide'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            How Shares Work
          </button>
        </div>
      </div>

      {activeTab === 'suggestions' ? (
        <div className="space-y-4">
          {/* Filter Row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 mr-1">Filter by Signal:</span>
              {(['ALL', 'BUY', 'HOLD', 'SELL'] as const).map(action => (
                <button
                  key={action}
                  onClick={() => setFilterAction(action)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    filterAction === action
                      ? action === 'BUY'
                        ? 'bg-emerald-600 text-white'
                        : action === 'HOLD'
                        ? 'bg-amber-600 text-white'
                        : action === 'SELL'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Calibrated with Conformal 90% Statistical Coverage
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
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between overflow-hidden text-left"
                >
                  <div>
                    {/* Top Row: Ticker, Name, Action Badge */}
                    <div className="flex items-start justify-between gap-3 mb-2.5 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white font-mono">
                            {item.ticker === 'SPECULATIVE_OVERBOUGHT' ? 'SPECULATIVE' : item.ticker}
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-[180px] sm:max-w-[240px]" title={item.name}>
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
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Current</span>
                        <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                          ${item.currentPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300">
                        <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase">Target</span>
                        <span className="font-bold text-xs sm:text-sm">
                          ${item.targetPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300">
                        <span className="block text-[10px] text-rose-700 dark:text-rose-400 font-semibold uppercase">Stop Loss</span>
                        <span className="font-bold text-xs sm:text-sm">
                          ${item.stopLoss.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Risk: <span className="text-slate-800 dark:text-slate-200 font-semibold">{item.riskRating}</span>
                    </span>
                    {item.ticker !== 'SPECULATIVE_OVERBOUGHT' && (
                      <button
                        onClick={() => onSelectTicker(item.ticker)}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                      >
                        <span>Deep Analysis</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 space-y-2">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Learning Modules
            </span>
            {GUIDE_TOPICS.map((topic) => {
              const isSelected = topic.id === selectedTopicId;
              return (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500/80 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
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
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {currentTopic.title}
              </h3>
            </div>

            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              {currentTopic.fullExplanation}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" />
                Real-World Example
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {currentTopic.exampleScenario}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  Core Investor Rule:
                </div>
                <div className="text-xs text-emerald-800 dark:text-emerald-400">
                  {currentTopic.keyTakeaway}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default InvestorGuidePage;
