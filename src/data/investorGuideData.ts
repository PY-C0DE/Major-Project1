/**
 * Beginner Investor Academy Data & Curated Educational Stocks
 * Real-world assets with accurate currencies (INR ₹ / USD $),
 * actionable Buy/Hold/Sell rationale, and core foundational modules.
 */

import { InvestorGuideTopic, NewInvestorShareIdea } from '../types';

export const GUIDE_TOPICS: InvestorGuideTopic[] = [
  {
    id: 'shares_basics',
    title: '1. What Are Shares & Equity?',
    icon: 'PieChart',
    shortSummary: 'When you buy a share, you own an actual fractional slice of a real operating company.',
    fullExplanation: 'A share represents legal equity ownership in a public enterprise. If a corporation has 1,000,000 shares and you own 1,000, you legally own 0.1% of its revenue, assets, and future profits. You do not need large sums of money to start; modern exchanges allow you to purchase single shares or fractional units. As the company grows and produces cash, the value of your ownership stake expands alongside it.',
    keyTakeaway: 'You are an owner of a business, not a gambler betting on price blinks.',
    exampleScenario: 'Buying 1 share of Apple (AAPL) means Apple works for you every time someone purchases an iPhone, Mac, or iCloud cloud subscription.',
  },
  {
    id: 'price_movement',
    title: '2. Why Do Stock Prices Move?',
    icon: 'TrendingUp',
    shortSummary: 'Stock prices are determined tick-by-tick by supply, demand, and expected future earnings.',
    fullExplanation: 'Every second, buyers and sellers place bid and ask orders on the exchange. When positive catalysts arrive—such as a blockbuster quarterly earnings beat, central bank interest rate cuts, or new patent approvals—more buyers enter, driving the price upward until sellers meet them. Short-term prices fluctuate with sentiment and news headlines, but long-term valuations follow corporate earnings and free cash flows.',
    keyTakeaway: 'In the short run the market is a voting machine; in the long run it is a weighing machine of earnings.',
    exampleScenario: 'When NVIDIA reports 120% datacenter revenue growth, institutional fund managers bid up the price to accumulate shares.',
  },
  {
    id: 'dividends_vs_growth',
    title: '3. Dividends vs. Capital Gains',
    icon: 'DollarSign',
    shortSummary: 'Two ways to compound wealth: recurring cash payouts (dividends) or share price gains.',
    fullExplanation: 'Mature, profitable businesses like TCS, Coca-Cola, or ITC generate excess cash and distribute a portion directly into shareholders\' bank accounts every quarter as dividends. Meanwhile, rapid-growth technology companies like Nvidia or Tesla reinvest 100% of their operational cash back into engineering and infrastructure, rewarding investors through capital appreciation instead.',
    keyTakeaway: 'A robust portfolio blends defensive dividend payers for passive cash flow with long-term compound growth engines.',
    exampleScenario: 'Holding ₹2,00,000 in a 3.5% dividend yield bluechip deposits ₹7,000 directly into your bank every year, regardless of market volatility.',
  },
  {
    id: 'buy_hold_sell_rules',
    title: '4. When Should You Buy, Hold, or Sell?',
    icon: 'Target',
    shortSummary: 'AlphaQuant removes emotional impulse using statistical conformal bounds and algorithmic signals.',
    fullExplanation: 'Never buy purely because a stock rallied yesterday, and never panic-sell because of an intraday dip. Use quantitative rigor: BUY when high-quality businesses trade near the lower 90% conformal statistical floor with favorable risk/reward. HOLD when the price advances safely inside its upward channel. SELL or TRIM when the stock reaches full valuation at the upper conformal ceiling, or when underlying fundamentals deteriorate.',
    keyTakeaway: 'Protect your downside first with disciplined stop-losses; the upside takes care of itself.',
    exampleScenario: 'If your holding gains 35% and approaches the upper 90% conformal boundary, trimming 25% of your position locks in tangible profit.',
  },
  {
    id: 'risk_management',
    title: '5. Risk Management & Stop-Losses: The 2% Rule',
    icon: 'ShieldCheck',
    shortSummary: 'Never risk more than 1% to 2% of your total portfolio on any single trade setup.',
    fullExplanation: 'Successful professional investors focus on survival first. If you enter a trade with a predetermined stop-loss, you know exactly what your maximum loss could be before clicking buy. By calculating position size so that hitting your stop-loss only dents 1% to 2% of your total capital, you can endure five losing trades in a row and still maintain 90%+ of your capital ready for the next winning trend.',
    keyTakeaway: 'Amateurs focus on how much they could win; professionals focus on how much they could lose.',
    exampleScenario: 'With a ₹1,00,000 portfolio, risking 1.5% means your maximum loss on a trade is ₹1,500. If your stop-loss is 5% below entry, you invest ₹30,000 in that position.',
  },
  {
    id: 'conformal_bands',
    title: '6. Conformal Prediction: What the Shaded Tunnel Means',
    icon: 'Layers',
    shortSummary: 'Statistical bounds that guarantee 90% historical coverage without assuming a bell curve.',
    fullExplanation: 'Most trading software uses simple moving averages that lag behind reality. AlphaQuant utilizes Conformal Prediction—a state-of-the-art statistical technique that calculates upper and lower bounds based on recent volatility and historical error distributions. Statistically, 9 out of 10 future prices will fall inside this shaded tunnel. When price drops to the lower green boundary, it is mathematically oversold.',
    keyTakeaway: 'Look for entries near the lower bound and take profits near the upper bound.',
    exampleScenario: 'If Reliance is trading at ₹2,780 and its lower conformal bound is ₹2,740, entering near ₹2,750 gives you maximum statistical edge with tight risk.',
  },
];

export const CURATED_SHARE_SUGGESTIONS: NewInvestorShareIdea[] = [
  {
    ticker: 'HDFCBANK.NS',
    name: 'HDFC Bank Ltd.',
    category: 'Conservative Wealth Builder',
    recommendedAction: 'BUY',
    currentPrice: 1745.00,
    targetPrice: 2050.00,
    stopLoss: 1610.00,
    expectedAnnualReturn: '16 - 20%',
    riskRating: 'Low Risk',
    simpleExplanation: 'India\'s premier private banking institution. Features an unmatched low-cost CASA deposit franchise and pristine asset quality.',
    whyInvestNow: 'Post-merger net interest margins are rebounding, and the stock trades at its most attractive price-to-book multiple in 5 years.',
    minimumInvestmentAmount: 1745.00,
    currency: 'INR',
  },
  {
    ticker: 'TCS.NS',
    name: 'Tata Consultancy Services',
    category: 'Defensive Dividend',
    recommendedAction: 'BUY',
    currentPrice: 4120.00,
    targetPrice: 4680.00,
    stopLoss: 3880.00,
    expectedAnnualReturn: '14 - 18%',
    riskRating: 'Low Risk',
    simpleExplanation: 'Global technology consulting and digital enterprise transformation leader with 0 debt and exceptional corporate governance.',
    whyInvestNow: 'Conformal lower support holds firm as enterprise generative AI deals ramp up; dependable quarterly dividend compounder.',
    minimumInvestmentAmount: 4120.00,
    currency: 'INR',
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    category: 'Conservative Wealth Builder',
    recommendedAction: 'BUY',
    currentPrice: 228.50,
    targetPrice: 265.00,
    stopLoss: 212.00,
    expectedAnnualReturn: '14 - 18%',
    riskRating: 'Low Risk',
    simpleExplanation: 'Consumer tech ecosystem with 2.2+ billion active devices, high-margin software services, and massive annual share buybacks.',
    whyInvestNow: 'Apple Intelligence rollout is igniting a multi-year iPhone and Mac replacement supercycle across global consumer bases.',
    minimumInvestmentAmount: 228.50,
    currency: 'USD',
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
    simpleExplanation: 'Dominant leader in AI GPUs, CUDA programming architecture, and next-generation datacenter computing infrastructure worldwide.',
    whyInvestNow: 'Blackwell architecture GPU silicon orders are booked out for 12 months with massive hyperscaler capital expenditure.',
    minimumInvestmentAmount: 138.25,
    currency: 'USD',
  },
  {
    ticker: 'RELIANCE.NS',
    name: 'Reliance Industries Ltd.',
    category: 'Balanced Growth',
    recommendedAction: 'HOLD',
    currentPrice: 2780.00,
    targetPrice: 3120.00,
    stopLoss: 2620.00,
    expectedAnnualReturn: '12 - 16%',
    riskRating: 'Low Risk',
    simpleExplanation: 'Indian powerhouse spanning Retail commerce, Jio 5G Telecommunications, Oil-to-Chemicals, and Green Hydrogen energy.',
    whyInvestNow: 'Currently consolidating steadily inside its middle conformal corridor. Existing shareholders should HOLD; wait for dip to add fresh shares.',
    minimumInvestmentAmount: 2780.00,
    currency: 'INR',
  },
  {
    ticker: 'SMCI',
    name: 'Super Micro Computer Inc.',
    category: 'High Alpha Momentum',
    recommendedAction: 'SELL',
    currentPrice: 42.80,
    targetPrice: 31.00,
    stopLoss: 48.50,
    expectedAnnualReturn: 'Negative / Downside Risk',
    riskRating: 'Higher Volatility',
    simpleExplanation: 'High-density server integrator facing severe accounting disclosure uncertainty, margin compression, and governance challenges.',
    whyInvestNow: 'SELL signal triggered: Price pierced the lower conformal band on heavy volume with rising volatility regime; capital preservation advised.',
    minimumInvestmentAmount: 42.80,
    currency: 'USD',
  },
];

export const INVESTOR_GOLDEN_RULES = [
  {
    title: '1. Never Invest Rent or Emergency Money',
    description: 'Only allocate capital that you will not need to withdraw for at least 6 to 12 months. This eliminates panic-selling during temporary market dips.',
  },
  {
    title: '2. Diversify Across Sectors',
    description: 'Never put all your capital into a single sector. Spread across Banking, Technology, Energy, and Consumer sectors to absorb industry-specific shocks.',
  },
  {
    title: '3. Pre-Define Your Exit Before Entering',
    description: 'Always know your target price to take profits and your stop-loss price to limit downside before you execute the order.',
  },
  {
    title: '4. Reinvest Dividends to Harness Compounding',
    description: 'Reinvesting quarterly dividend income back into more shares creates exponential wealth compounding over 5 to 10 year horizons.',
  },
  {
    title: '5. Let Conformal Math Drive Decisions, Not Social Media',
    description: 'Avoid following unverified tips on social forums. Use calibrated statistical prediction bounds and verified financial catalysts.',
  },
];

import { formatCurrencyAmount } from '../utils/currency';

/**
 * Format price according to stock market currency (INR ₹ for .NS, KRW ₩ for .KS, USD $ otherwise)
 */
export function formatStockCurrency(amount: number, ticker: string, currency?: string): string {
  return formatCurrencyAmount(amount, currency, ticker);
}
