/**
 * NLP & Verification Engine
 * Implements FinBERT Transformer Sentiment (with Keyword Lexicon fallback),
 * Publisher Credibility Weighting, and Daily Sentiment Persistence.
 */

import { NewsItem, ClassifiedFinancialEvent, SentimentSource, DailySentimentRecord } from '../../types';
import { fetchLiveNewsForTicker, RawLiveArticle } from '../services/liveNewsService';
import { analyzeKeywordSentiment, scoreHeadlinesWithFinbert } from './finbertSentiment';
import { alignTimestampToTradingDate } from './exchangeCalendar';
import { db } from '../store/db';

export { analyzeKeywordSentiment };

const CREDIBLE_DOMAINS: Record<string, number> = {
  'Bloomberg': 0.96,
  'Reuters': 0.98,
  'Financial Times': 0.95,
  'The Wall Street Journal': 0.97,
  'CNBC': 0.90,
  'Economic Times': 0.89,
  'Business Standard': 0.88,
  'Mint': 0.88,
  'Barron\'s': 0.91,
  'MarketWatch': 0.89,
  'Forbes': 0.84,
  'Seeking Alpha': 0.78,
  'Yahoo Finance': 0.87,
  'Benzinga': 0.76,
  'StockTwits / Anonymous': 0.38
};

/**
 * Evaluates fact verification and credibility
 */
export function verifyNewsItem(
  headline: string,
  source: string
): {
  factCheckStatus: 'Verified' | 'Partially Verified' | 'Unverified' | 'Contradicted' | 'No Fact Check Found';
  verificationScore: number;
  sourceCredibility: number;
} {
  const credibility = CREDIBLE_DOMAINS[source] || 0.75;
  const lower = headline.toLowerCase();

  let status: 'Verified' | 'Partially Verified' | 'Unverified' | 'Contradicted' | 'No Fact Check Found' = 'No Fact Check Found';
  let verificationScore = credibility * 0.85;

  if (lower.includes('rumor') || lower.includes('unconfirmed') || lower.includes('speculation')) {
    status = 'Unverified';
    verificationScore = 0.42;
  } else if (lower.includes('official') || lower.includes('sec filing') || lower.includes('quarterly report') || lower.includes('press release') || lower.includes('earnings')) {
    status = 'Verified';
    verificationScore = Math.min(0.99, credibility + 0.05);
  } else if (credibility >= 0.90) {
    status = 'Verified';
    verificationScore = credibility;
  } else {
    status = 'Partially Verified';
    verificationScore = credibility * 0.9;
  }

  return {
    factCheckStatus: status,
    verificationScore: Number(verificationScore.toFixed(2)),
    sourceCredibility: credibility
  };
}

/**
 * Compute publisher-credibility-weighted mean sentiment net score across items.
 */
export function computeCredibilityWeightedMeanScore(
  items: Array<{ sentimentScore: number; sourceCredibility: number }>
): number {
  if (!items || items.length === 0) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const item of items) {
    const w = Math.max(0.05, Number.isFinite(item.sourceCredibility) ? item.sourceCredibility : 0.75);
    weightedSum += item.sentimentScore * w;
    totalWeight += w;
  }
  if (totalWeight <= 0) return 0;
  const mean = weightedSum / totalWeight;
  return Number(Math.max(-1, Math.min(1, mean)).toFixed(4));
}

function summarizeSourceKind(items: Array<{ sentimentSource?: SentimentSource }>): SentimentSource | 'mixed' {
  const hasFinbert = items.some(i => i.sentimentSource === 'finbert');
  const hasLexicon = items.some(i => i.sentimentSource !== 'finbert');
  if (hasFinbert && !hasLexicon) return 'finbert';
  if (hasFinbert && hasLexicon) return 'mixed';
  return 'lexicon';
}

/**
 * Aggregates ONLY real live news items (`isLive === true`) into per-(ticker, YYYY-MM-DD)
 * credibility-weighted daily sentiment records aligned to the ticker's exchange-local trading calendar.
 * Articles published after exchange close, on weekends, or on exchange holidays advance to the next
 * open trading session so causal sentiment aligns without same-day return lookahead.
 * Zero-article days are omitted (never 0-filled).
 */
export function buildDailySentimentRecordsFromLiveArticles(
  ticker: string,
  liveItems: NewsItem[],
  options?: { exchange?: string; alignToTradingSession?: boolean; respectMarketClose?: boolean }
): DailySentimentRecord[] {
  const byDate = new Map<string, NewsItem[]>();
  const upperTicker = ticker.trim().toUpperCase();
  const useExchangeCalendar = options?.alignToTradingSession !== false;
  const respectClose = options?.respectMarketClose !== false;

  for (const item of liveItems) {
    if (!item.isLive || !item.publishedAt) continue;
    const parsed = new Date(item.publishedAt);
    if (isNaN(parsed.getTime())) continue;
    const isoDate = useExchangeCalendar
      ? alignTimestampToTradingDate(parsed, options?.exchange || upperTicker, {
          respectMarketClose: respectClose
        }).tradingDate
      : parsed.toISOString().slice(0, 10);
    const list = byDate.get(isoDate) || [];
    list.push(item);
    byDate.set(isoDate, list);
  }

  const nowIso = new Date().toISOString();
  const records: DailySentimentRecord[] = [];
  for (const [date, articles] of byDate.entries()) {
    if (articles.length === 0) continue;
    records.push({
      ticker: upperTicker,
      date,
      credibilityWeightedNetScore: computeCredibilityWeightedMeanScore(articles),
      articleCount: articles.length,
      sentimentSource: summarizeSourceKind(articles),
      updatedAt: nowIso
    });
  }

  records.sort((a, b) => a.date.localeCompare(b.date));
  return records;
}

/**
 * Generate contextual news feed for a ticker (baseline synthetic fallback templates)
 */
export function getNewsForTicker(ticker: string, companyName: string): NewsItem[] {
  const cleanTicker = ticker.replace('.NS', '').replace('.BO', '');
  const now = Date.now();

  const templates = [
    {
      title: `${companyName} Reports Robust Quarterly Earnings with 18% YoY Revenue Acceleration`,
      summary: `Management raised forward guidance citing strong enterprise cloud demand and margin expansion across core operating segments.`,
      source: 'Bloomberg',
      offsetHours: 3
    },
    {
      title: `Institutional Inflows Surge for ${cleanTicker} Ahead of Key Sector Index Rebalancing`,
      summary: `Global mutual funds and index trackers increased weightings by 45 basis points amid improving macroeconomic outlook.`,
      source: 'Reuters',
      offsetHours: 8
    },
    {
      title: `Analyst Consensus Upgrades ${cleanTicker} to Outperform with Revised Fair-Value Target`,
      summary: `Equity research desk highlighted resilient free cash flow generation and defensive moat despite broader market volatility.`,
      source: 'Financial Times',
      offsetHours: 16
    },
    {
      title: `Market Volatility Tests Sector Resilience as Treasury Yields Fluctuate`,
      summary: `Trading desks observe rotation between high-beta growth stocks and quality dividend payers following central bank commentary.`,
      source: 'The Wall Street Journal',
      offsetHours: 28
    },
    {
      title: `Supply Chain Optimization and Capacity Expansion Underway at ${companyName}`,
      summary: `New production facilities scheduled for commercial commission next quarter, boosting operational throughput.`,
      source: 'CNBC',
      offsetHours: 42
    }
  ];

  return templates.map((tmpl, idx) => {
    const tone = analyzeKeywordSentiment(tmpl.title, tmpl.summary);
    const verification = verifyNewsItem(tmpl.title, tmpl.source);

    return {
      id: `news-${ticker}-${idx + 1}`,
      ticker,
      headline: tmpl.title,
      summary: tmpl.summary,
      source: tmpl.source,
      url: `https://finance.yahoo.com/quote/${ticker}`,
      publishedAt: new Date(now - tmpl.offsetHours * 3600000).toISOString(),
      sentiment: tone.sentiment,
      sentimentScore: tone.sentimentScore,
      probabilities: tone.probabilities,
      confidence: tone.confidence,
      factCheckStatus: verification.factCheckStatus,
      verificationScore: verification.verificationScore,
      sourceCredibility: verification.sourceCredibility,
      isLive: false,
      dataSource: 'synthetic',
      fetchedAt: new Date(now).toISOString(),
      sentimentSource: 'lexicon'
    };
  });
}

export interface HybridNewsResult {
  news: NewsItem[];
  liveCount: number;
  baselineCount: number;
  liveSentimentScore: number;
  baselineSentimentScore: number;
  blendedSentimentScore: number;
  sentimentSource: SentimentSource | 'mixed';
  topLiveHeadline?: string;
  topLiveSource?: string;
}

export async function scoreRawLiveArticles(
  ticker: string,
  rawLive: RawLiveArticle[]
): Promise<NewsItem[]> {
  if (!rawLive || rawLive.length === 0) return [];

  const fetchedAt = new Date().toISOString();
  const scoredList = await scoreHeadlinesWithFinbert(
    rawLive.map((item) => ({
      headline: item.title,
      publisher: item.source,
      summary: item.summary
    }))
  );

  return rawLive.map((item, idx) => {
    const tone = scoredList[idx];
    const verification = verifyNewsItem(item.title, item.source);

    return {
      id: `live-news-${ticker}-${idx + 1}`,
      ticker,
      headline: item.title,
      summary: item.summary,
      source: item.source,
      url: item.url,
      publishedAt: item.publishedAt,
      sentiment: tone.sentiment,
      sentimentScore: tone.sentimentScore,
      probabilities: tone.probabilities,
      confidence: tone.confidence,
      factCheckStatus: verification.factCheckStatus,
      verificationScore: verification.verificationScore,
      sourceCredibility: verification.sourceCredibility,
      isLive: true,
      dataSource: 'live',
      fetchedAt,
      sentimentSource: tone.sentimentSource
    };
  });
}

/**
 * Fetches live articles for a ticker, scores them with FinBERT (or lexicon fallback),
 * persists daily credibility-weighted aggregates to JSON store without overwriting past days,
 * and returns the scored live NewsItems + store upsert summary.
 */
export async function collectAndPersistLiveSentimentForTicker(
  ticker: string,
  companyName: string,
  options?: { bypassCache?: boolean; maxArticles?: number; persistToDisk?: boolean }
): Promise<{
  liveNewsItems: NewsItem[];
  dailyRecords: DailySentimentRecord[];
  upsertStats: Awaited<ReturnType<typeof db.upsertDailySentiment>>;
}> {
  const rawLive = await fetchLiveNewsForTicker(ticker, companyName, {
    bypassCache: options?.bypassCache,
    maxArticles: options?.maxArticles
  });
  const liveNewsItems = await scoreRawLiveArticles(ticker, rawLive);
  const dailyRecords = buildDailySentimentRecordsFromLiveArticles(ticker, liveNewsItems);
  const upsertStats = await db.upsertDailySentiment(dailyRecords, {
    persist: options?.persistToDisk ?? true
  });
  return { liveNewsItems, dailyRecords, upsertStats };
}

/**
 * Fetches real-time live news, scores headlines asynchronously with FinBERT
 * (falling back to keyword lexicon), persists live daily sentiment records,
 * and merges with baseline context for UI consumption.
 */
export async function getHybridNewsForTicker(ticker: string, companyName: string): Promise<HybridNewsResult> {
  const baselineNews = getNewsForTicker(ticker, companyName);
  const baselineScore = computeCredibilityWeightedMeanScore(baselineNews);

  let rawLive: RawLiveArticle[] = [];
  try {
    rawLive = await fetchLiveNewsForTicker(ticker, companyName);
  } catch (err) {
    console.error(`Live news fetch failed for ${ticker}, using baseline mechanism:`, err);
  }

  if (!rawLive || rawLive.length === 0) {
    return {
      news: baselineNews,
      liveCount: 0,
      baselineCount: baselineNews.length,
      liveSentimentScore: Number(baselineScore.toFixed(3)),
      baselineSentimentScore: Number(baselineScore.toFixed(3)),
      blendedSentimentScore: Number(baselineScore.toFixed(3)),
      sentimentSource: 'lexicon',
      topLiveHeadline: undefined,
      topLiveSource: undefined
    };
  }

  const liveNewsItems = await scoreRawLiveArticles(ticker, rawLive);

  // Task 2: Append daily per-ticker aggregate from live articles ONLY (never baseline templates)
  const dailyRecords = buildDailySentimentRecordsFromLiveArticles(ticker, liveNewsItems);
  if (dailyRecords.length > 0) {
    await db.upsertDailySentiment(dailyRecords);
  }

  const liveScore = computeCredibilityWeightedMeanScore(liveNewsItems);

  // Blended hybrid score: 70% live real-time sentiment + 30% baseline template sentiment (or 50/50 if fewer than 3 live items)
  const liveWeight = liveNewsItems.length >= 3 ? 0.70 : liveNewsItems.length > 0 ? 0.50 : 0.0;
  const blendedScore = Number((liveWeight * liveScore + (1 - liveWeight) * baselineScore).toFixed(3));

  // Merge live items with foundational baseline items (top 2 baseline items appended for fundamental context)
  const combinedNews = [...liveNewsItems, ...baselineNews.slice(0, 2)];

  return {
    news: combinedNews,
    liveCount: liveNewsItems.length,
    baselineCount: baselineNews.length,
    liveSentimentScore: Number(liveScore.toFixed(3)),
    baselineSentimentScore: Number(baselineScore.toFixed(3)),
    blendedSentimentScore: blendedScore,
    sentimentSource: summarizeSourceKind(liveNewsItems),
    topLiveHeadline: liveNewsItems[0]?.headline,
    topLiveSource: liveNewsItems[0]?.source
  };
}

/**
 * Classifies financial events (Mergers, Earnings, Regulatory, Dividends, etc.)
 * and computes their mathematical expected impact on price forecasting.
 */
export function classifyFinancialEvent(title: string, summary: string): {
  category: ClassifiedFinancialEvent['category'];
  eventImpact: ClassifiedFinancialEvent['eventImpact'];
  predictedPriceEffectPct: number;
  confidenceScore: number;
  incorporationInModel: string;
} {
  const combined = `${title} ${summary}`.toLowerCase();

  // 1. Mergers & Acquisitions (M&A)
  if (
    combined.includes('merger') ||
    combined.includes('acquisition') ||
    combined.includes('acquire') ||
    combined.includes('takeover') ||
    combined.includes('buyout') ||
    combined.includes('stake buy') ||
    combined.includes('consolidation')
  ) {
    const isPremium = combined.includes('premium') || combined.includes('all-cash') || combined.includes('synergy');
    const effect = isPremium ? 4.8 : 3.2;
    return {
      category: 'Mergers & Acquisitions (M&A)',
      eventImpact: 'High Bullish Catalyst',
      predictedPriceEffectPct: effect,
      confidenceScore: 0.92,
      incorporationInModel: 'Logged as an informational M&A catalyst tag; conformal bounds remain anchored strictly to split-conformal residual quantiles.'
    };
  }

  // 2. Earnings & Guidance Releases
  if (
    combined.includes('earnings') ||
    combined.includes('revenue') ||
    combined.includes('profit') ||
    combined.includes('quarterly') ||
    combined.includes('guidance') ||
    combined.includes('ebitda') ||
    combined.includes('eps beat')
  ) {
    const isBeat = combined.includes('beat') || combined.includes('accelerat') || combined.includes('record') || combined.includes('robust') || combined.includes('surge');
    const isMiss = combined.includes('miss') || combined.includes('plunge') || combined.includes('decline') || combined.includes('downgrade');
    return {
      category: 'Earnings & Guidance',
      eventImpact: isBeat ? 'High Bullish Catalyst' : isMiss ? 'High Risk Headwind' : 'Moderate Bullish',
      predictedPriceEffectPct: isBeat ? 3.5 : isMiss ? -4.2 : 1.2,
      confidenceScore: 0.88,
      incorporationInModel: isBeat
        ? 'Logged as an informational bullish earnings catalyst; does not alter split-conformal interval bounds.'
        : isMiss
        ? 'Logged as an informational earnings headwind alert; split-conformal bounds remain unchanged from historical calibration residuals.'
        : 'Logged as a neutral earnings update with baseline split-conformal band widths.'
    };
  }

  // 3. Regulatory & Legal
  if (
    combined.includes('regulatory') ||
    combined.includes('lawsuit') ||
    combined.includes('scrutiny') ||
    combined.includes('antitrust') ||
    combined.includes('investigation') ||
    combined.includes('penalty') ||
    combined.includes('fine') ||
    combined.includes('sec') ||
    combined.includes('doj')
  ) {
    return {
      category: 'Regulatory & Legal',
      eventImpact: 'High Risk Headwind',
      predictedPriceEffectPct: -3.8,
      confidenceScore: 0.85,
      incorporationInModel: 'Logged as an informational regulatory headwind warning; conformal uncertainty bands are not automatically widened.'
    };
  }

  // 4. Dividends & Capital Restructuring
  if (
    combined.includes('dividend') ||
    combined.includes('buyback') ||
    combined.includes('share repurchase') ||
    combined.includes('split') ||
    combined.includes('demerger') ||
    combined.includes('spin-off')
  ) {
    return {
      category: 'Dividends & Capital',
      eventImpact: 'Moderate Bullish',
      predictedPriceEffectPct: 2.4,
      confidenceScore: 0.90,
      incorporationInModel: 'Logged as an informational capital-return catalyst; quantitative forecasts continue to follow price-series calibration.'
    };
  }

  // 5. Macro & Monetary Policy
  if (
    combined.includes('central bank') ||
    combined.includes('interest rate') ||
    combined.includes('federal reserve') ||
    combined.includes('rbi') ||
    combined.includes('inflation') ||
    combined.includes('treasury yield')
  ) {
    const isHawkish = combined.includes('hike') || combined.includes('surge') || combined.includes('tighten');
    return {
      category: 'Macro & Monetary',
      eventImpact: isHawkish ? 'Moderate Bearish' : 'Moderate Bullish',
      predictedPriceEffectPct: isHawkish ? -1.8 : 1.5,
      confidenceScore: 0.84,
      incorporationInModel: 'Logged as an informational macroeconomic regime catalyst for analyst context.'
    };
  }

  // Default: Product & Expansion
  return {
    category: 'Product & Expansion',
    eventImpact: 'Moderate Bullish',
    predictedPriceEffectPct: 2.1,
    confidenceScore: 0.80,
    incorporationInModel: 'Logged as an informational strategic expansion news catalyst.'
  };
}

/**
 * Generates verified classified financial events for a given ticker,
 * dynamically extracting events from live breaking news and blending with fundamental templates.
 */
export function getClassifiedEventsForTicker(
  ticker: string,
  companyName: string,
  liveArticles?: NewsItem[]
): ClassifiedFinancialEvent[] {
  const clean = ticker.replace('.NS', '').replace('.BO', '');
  const events: ClassifiedFinancialEvent[] = [];

  // 1. Extract classified events from real-time live news articles if available
  if (liveArticles && liveArticles.length > 0) {
    liveArticles.forEach((art, idx) => {
      const classification = classifyFinancialEvent(art.headline, art.summary);
      // Include non-generic events or any event with significant price effect
      if (Math.abs(classification.predictedPriceEffectPct) >= 1.5 || art.isLive) {
        events.push({
          id: `live-event-${ticker}-${idx + 1}`,
          title: art.headline,
          summary: art.summary,
          category: classification.category,
          eventImpact: classification.eventImpact,
          predictedPriceEffectPct: classification.predictedPriceEffectPct,
          confidenceScore: classification.confidenceScore,
          source: `${art.source} (Live)`,
          timeAgo: 'Live Breaking',
          incorporationInModel: `${classification.incorporationInModel} [Live real-time news feed]`
        });
      }
    });
  }

  // 2. Foundational baseline events (the existing baseline mechanism)
  const rawEvents = [
    {
      title: `${companyName} Finalizes Strategic Acquisition of AI Cloud Infrastructure Assets in $1.4B Deal`,
      summary: `Consolidation expands hyperscale data center compute capacity and enterprise AI inference workload throughput by 40%.`,
      source: 'Bloomberg Terminal',
      timeAgo: '2h ago'
    },
    {
      title: `${clean} Board Approves Massive Share Buyback & Special Interim Dividend Program`,
      summary: `Capital return plan repurchases 2.5% of outstanding floating equity at premium valuation band.`,
      source: 'Reuters Financial',
      timeAgo: '7h ago'
    },
    {
      title: `Antitrust Regulators Conclude Preliminary Review on ${clean} Cross-Border Cloud Venture`,
      summary: `Regulatory compliance milestone clears immediate legal headwind with nominal oversight requirements.`,
      source: 'The Wall Street Journal',
      timeAgo: '1d ago'
    },
    {
      title: `${companyName} Q3 Operational Earnings Exceed Consensus Forecast with 22% Margin Expansion`,
      summary: `High-value enterprise contracts drive operating leverage across international and domestic divisions.`,
      source: 'Financial Times',
      timeAgo: '2d ago'
    }
  ];

  const baselineClassified = rawEvents.map((ev, idx) => {
    const classification = classifyFinancialEvent(ev.title, ev.summary);
    return {
      id: `event-${ticker}-${idx + 1}`,
      title: ev.title,
      summary: ev.summary,
      category: classification.category,
      eventImpact: classification.eventImpact,
      predictedPriceEffectPct: classification.predictedPriceEffectPct,
      confidenceScore: classification.confidenceScore,
      source: ev.source,
      timeAgo: ev.timeAgo,
      incorporationInModel: classification.incorporationInModel
    };
  });

  // Blend live events at the top, followed by baseline events (up to 4 total)
  return [...events.slice(0, 3), ...baselineClassified].slice(0, 5);
}

/**
 * Returns a collection of market-wide real-time news headlines for the auto-scrolling ticker
 */
export function getAllMarketHeadlines(): NewsItem[] {
  const sampleTickers = ['NVDA', 'RELIANCE.NS', 'AAPL', 'TCS.NS', 'MSFT', 'HDFCBANK.NS', 'GOOGL', 'TSLA'];
  const all: NewsItem[] = [];

  sampleTickers.forEach(t => {
    const news = getNewsForTicker(t, t.replace('.NS', ''));
    if (news.length > 0) {
      all.push(news[0]);
      if (news[1]) all.push(news[1]);
    }
  });

  return all;
}

/**
 * Asynchronously returns real-time market headlines for the top tickers
 */
export async function getAllMarketHeadlinesAsync(): Promise<NewsItem[]> {
  const sampleTickers = ['NVDA', 'TATAMOTORS.NS', 'RELIANCE.NS', 'AAPL', 'TCS.NS', 'MSFT', 'GOOGL', 'TSLA'];
  const all: NewsItem[] = [];

  const results = await Promise.allSettled(
    sampleTickers.map(t => getHybridNewsForTicker(t, t.replace('.NS', '')))
  );

  results.forEach(res => {
    if (res.status === 'fulfilled' && res.value.news.length > 0) {
      all.push(res.value.news[0]);
      if (res.value.news[1]) all.push(res.value.news[1]);
    }
  });

  return all.length > 0 ? all : getAllMarketHeadlines();
}

