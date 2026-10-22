/**
 * Social Sentiment & Copy-Trading Feeds Service
 * Aggregates real-time community discussions from Reddit/WallStreetBets,
 * FinTwit, and Institutional Alpha Desk feeds, with verified copy-trade leaderboards.
 */

export interface SocialDiscussion {
  id: string;
  ticker: string;
  source: 'Reddit / r/wallstreetbets' | 'FinTwit / Verified Quants' | 'Institutional Bloomberg Terminal' | 'Discord Quant Desk';
  author: string;
  authorBadge: 'Top Contributor' | 'CFA Institute' | 'Verified Quant' | 'Algorithmic Fund';
  title: string;
  content: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentScore: number;
  upvotes: number;
  commentsCount: number;
  timeAgo: string;
  verifiedTrade?: {
    action: 'BUY' | 'SELL';
    price: string;
    target: string;
  };
}

export interface VerifiedTrader {
  id: string;
  name: string;
  handle: string;
  title: string;
  avatarSeed: string;
  aum: string;
  winRatePct: number;
  return30dPct: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  followersCount: number;
  strategyDescription: string;
  holdings: Array<{ ticker: string; weightPct: number }>;
}

const mockDiscussions: SocialDiscussion[] = [
  {
    id: 'soc-01',
    ticker: 'NVDA',
    source: 'Reddit / r/wallstreetbets',
    author: 'DeepValueQuant',
    authorBadge: 'Top Contributor',
    title: 'NVDA 90% Conformal Interval Breakout — Blackwell ramp is beating whisper numbers',
    content: 'Observing continuous compression in residual dispersion over the last 20 sessions. Conformal lower bounds have shifted upward from $118 to $124. Accumulating 135 Call options expiring next month.',
    sentiment: 'BULLISH',
    sentimentScore: 0.88,
    upvotes: 1420,
    commentsCount: 238,
    timeAgo: '18m ago',
    verifiedTrade: { action: 'BUY', price: '$128.40', target: '$145.00' }
  },
  {
    id: 'soc-02',
    ticker: 'RELIANCE.NS',
    source: 'Institutional Bloomberg Terminal',
    author: 'MorganCapitalDesk',
    authorBadge: 'CFA Institute',
    title: 'Reliance Industries: Retail demerger timeline & green energy capex cycle',
    content: 'O2C margins stabilizing with strong retail EBITDA expansion. HMM regime detector firmly in Regime 0 (Low Volatility / Bullish steady drift). Target revised to ₹3,350.',
    sentiment: 'BULLISH',
    sentimentScore: 0.82,
    upvotes: 890,
    commentsCount: 94,
    timeAgo: '42m ago',
    verifiedTrade: { action: 'BUY', price: '₹2,980.50', target: '₹3,350.00' }
  },
  {
    id: 'soc-03',
    ticker: 'AAPL',
    source: 'FinTwit / Verified Quants',
    author: 'MacroAlphaPulse',
    authorBadge: 'Verified Quant',
    title: 'Apple Intelligence rollout delay: Two-sample KS test flags slight momentum drift',
    content: 'Our Kolmogorov-Smirnov distribution check against the 90-day baseline triggered a p=0.038 warning on short-term RSI. Suggest hedging with OTM protective puts or tightening trailing stop-losses.',
    sentiment: 'NEUTRAL',
    sentimentScore: -0.05,
    upvotes: 620,
    commentsCount: 88,
    timeAgo: '1h ago'
  },
  {
    id: 'soc-04',
    ticker: 'TCS.NS',
    source: 'Discord Quant Desk',
    author: 'BombayQuantGroup',
    authorBadge: 'Algorithmic Fund',
    title: 'TCS Q3 Order Book Deal TCV reaches $10.2B — Conformal bands confirm support',
    content: 'Defensive IT rotation underway as BFSI spend revives in North America. Statistical forecast lower bound held strong at ₹4,120. Institutional accumulations detected on block deals.',
    sentiment: 'BULLISH',
    sentimentScore: 0.74,
    upvotes: 512,
    commentsCount: 65,
    timeAgo: '2h ago',
    verifiedTrade: { action: 'BUY', price: '₹4,210.75', target: '₹4,600.00' }
  },
  {
    id: 'soc-05',
    ticker: 'TSLA',
    source: 'Reddit / r/wallstreetbets',
    author: 'OptionsThetaGod',
    authorBadge: 'Top Contributor',
    title: 'Robotaxi regulatory approvals: Implied Volatility smile is heavily call-skewed',
    content: 'ATM IV is pricing an expected move of ±$18.50 over the next 14 sessions. Setting up an Iron Condor to capture high volatility premium with bounded downside.',
    sentiment: 'NEUTRAL',
    sentimentScore: 0.15,
    upvotes: 1890,
    commentsCount: 412,
    timeAgo: '3h ago'
  },
  {
    id: 'soc-06',
    ticker: 'GOOGL',
    source: 'FinTwit / Verified Quants',
    author: 'TensorFlowAlphas',
    authorBadge: 'Verified Quant',
    title: 'Gemini 2.5 API Enterprise adoption accelerating cloud backlog',
    content: 'GCP growth trajectory running 28% YoY. Fundamental multiples (P/E 23.9) remain discounted relative to peers. Solid risk-reward for long allocations.',
    sentiment: 'BULLISH',
    sentimentScore: 0.79,
    upvotes: 775,
    commentsCount: 110,
    timeAgo: '4h ago'
  }
];

const mockVerifiedTraders: VerifiedTrader[] = [
  {
    id: 'trader-01',
    name: 'Elena Rostova, PhD',
    handle: '@ElenaQuantAlpha',
    title: 'Managing Director, Horizon Quant Research',
    avatarSeed: 'Elena',
    aum: '$48.2M',
    winRatePct: 74.2,
    return30dPct: 18.6,
    sharpeRatio: 2.85,
    maxDrawdownPct: 4.8,
    followersCount: 12400,
    strategyDescription: 'Multi-asset split-conformal statistical arbitrage with dynamic HMM regime hedging.',
    holdings: [
      { ticker: 'NVDA', weightPct: 35 },
      { ticker: 'RELIANCE.NS', weightPct: 25 },
      { ticker: 'TCS.NS', weightPct: 20 },
      { ticker: 'MSFT', weightPct: 20 }
    ]
  },
  {
    id: 'trader-02',
    name: 'Vikram Sengupta, CFA',
    handle: '@VikramAlphaDesk',
    title: 'Chief Investment Officer, Dalal Alpha Fund',
    avatarSeed: 'Vikram',
    aum: '₹340 Cr ($41M)',
    winRatePct: 69.8,
    return30dPct: 14.2,
    sharpeRatio: 2.42,
    maxDrawdownPct: 5.6,
    followersCount: 8900,
    strategyDescription: 'Large-cap NSE quality momentum coupled with Black-Scholes gamma scalp overlays.',
    holdings: [
      { ticker: 'RELIANCE.NS', weightPct: 30 },
      { ticker: 'HDFCBANK.NS', weightPct: 25 },
      { ticker: 'INFY.NS', weightPct: 25 },
      { ticker: 'TCS.NS', weightPct: 20 }
    ]
  },
  {
    id: 'trader-03',
    name: 'Marcus Vance',
    handle: '@VanceVolatility',
    title: 'Head of Derivatives, Citadel Former Quant',
    avatarSeed: 'Marcus',
    aum: '$62.5M',
    winRatePct: 71.5,
    return30dPct: 22.4,
    sharpeRatio: 3.10,
    maxDrawdownPct: 6.2,
    followersCount: 19200,
    strategyDescription: 'Volatility surface arbitrage, exploiting IV skew asymmetry and tail-risk options.',
    holdings: [
      { ticker: 'NVDA', weightPct: 40 },
      { ticker: 'AAPL', weightPct: 30 },
      { ticker: 'GOOGL', weightPct: 20 },
      { ticker: 'AMZN', weightPct: 10 }
    ]
  }
];

export function getSocialFeed(ticker?: string): SocialDiscussion[] {
  if (!ticker || ticker === 'ALL') {
    return mockDiscussions;
  }
  const tUpper = ticker.toUpperCase();
  return mockDiscussions.filter(d => d.ticker.toUpperCase() === tUpper || d.ticker.includes(tUpper));
}

export function getVerifiedTraders(): VerifiedTrader[] {
  return mockVerifiedTraders;
}
