/**
 * Live Financial News Service
 * Ingests real-time financial breaking news from Google News RSS and Yahoo Finance
 * with in-memory TTL caching, HTML entity sanitation, and multi-source deduplication.
 */

export interface RawLiveArticle {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  isLive: true;
}

interface CacheEntry {
  timestamp: number;
  articles: RawLiveArticle[];
}

const NEWS_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

/**
 * Sanitizes raw HTML and decodes HTML entities into clean human-readable text
 */
function cleanHtmlText(text: string): string {
  if (!text) return '';
  // Step 1: decode entities so any encoded tags like &lt;a ...&gt; become real tags
  const unescaped = text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');

  // Step 2: strip all HTML tags
  return unescaped
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses XML items from Google News RSS feed without external XML parser dependency
 */
function parseGoogleNewsRss(xmlText: string): RawLiveArticle[] {
  const articles: RawLiveArticle[] = [];
  const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g);
  if (!itemMatches) return articles;

  for (const itemXml of itemMatches) {
    try {
      // Title
      const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
      let rawTitle = titleMatch ? titleMatch[1] : '';
      rawTitle = cleanHtmlText(rawTitle);

      // Google News titles frequently format as: "Headline - Source Name"
      let source = 'Financial News';
      const lastDashIdx = rawTitle.lastIndexOf(' - ');
      if (lastDashIdx > 15) {
        source = rawTitle.substring(lastDashIdx + 3).trim();
        rawTitle = rawTitle.substring(0, lastDashIdx).trim();
      }

      // Source override from <source> tag if available
      const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/);
      if (sourceMatch && sourceMatch[1]) {
        source = cleanHtmlText(sourceMatch[1]);
      }

      // Link
      const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
      const url = linkMatch ? linkMatch[1].trim() : '';

      // Published Date
      const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      let publishedAt = new Date().toISOString();
      if (pubDateMatch && pubDateMatch[1]) {
        const parsed = new Date(pubDateMatch[1]);
        if (!isNaN(parsed.getTime())) {
          publishedAt = parsed.toISOString();
        }
      }

      // Description / summary
      const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/);
      let summary = descMatch ? cleanHtmlText(descMatch[1]) : '';
      if (!summary || summary === rawTitle || summary.length < 20) {
        summary = `Market reporting from ${source} regarding corporate developments, earnings performance, and forward valuation catalysts.`;
      }

      if (rawTitle && rawTitle.length > 10) {
        articles.push({
          title: rawTitle,
          summary,
          source,
          url,
          publishedAt,
          isLive: true
        });
      }
    } catch {
      // Skip malformed item
    }
  }

  return articles;
}

/**
 * Fetches real-time articles from Yahoo Finance search/news endpoint
 */
async function fetchYahooFinanceNews(ticker: string, companyName: string): Promise<RawLiveArticle[]> {
  const cleanTicker = ticker.replace('.NS', '').replace('.BO', '');
  const query = companyName && companyName.length > 2 ? companyName : cleanTicker;
  const endpoint = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=1&newsCount=8`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.news || !Array.isArray(data.news)) return [];

    return data.news.map((item: any) => ({
      title: cleanHtmlText(item.title || ''),
      summary: cleanHtmlText(item.summary || `Live financial market coverage from ${item.publisher || 'Yahoo Finance'}`),
      source: item.publisher || 'Yahoo Finance',
      url: item.link || `https://finance.yahoo.com/quote/${ticker}`,
      publishedAt: item.providerPublishTime
        ? new Date(item.providerPublishTime * 1000).toISOString()
        : new Date().toISOString(),
      isLive: true as const
    })).filter((a: RawLiveArticle) => a.title.length > 10);
  } catch {
    return [];
  }
}

/**
 * Fetches real-time articles from Google News RSS
 */
async function fetchGoogleNewsRss(ticker: string, companyName: string): Promise<RawLiveArticle[]> {
  const isIndian = ticker.endsWith('.NS') || ticker.endsWith('.BO') || /tata|reliance|infosys|hdfc|icici|wipro|sbi|itc/i.test(ticker + companyName);
  const cleanTicker = ticker.replace('.NS', '').replace('.BO', '');
  const searchTerms = companyName && !companyName.includes('.')
    ? `${companyName} stock`
    : `${cleanTicker} stock`;

  const hl = isIndian ? 'en-IN' : 'en-US';
  const gl = isIndian ? 'IN' : 'US';
  const ceid = isIndian ? 'IN:en' : 'US:en';

  const endpoint = `https://news.google.com/rss/search?q=${encodeURIComponent(searchTerms)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) return [];
    const xml = await res.text();
    return parseGoogleNewsRss(xml);
  } catch {
    return [];
  }
}

/**
 * Main export: fetches real-time live news for a given ticker & company name
 */
export async function fetchLiveNewsForTicker(
  ticker: string,
  companyName = ''
): Promise<RawLiveArticle[]> {
  const cacheKey = ticker.toUpperCase();
  const cached = NEWS_CACHE.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS && cached.articles.length > 0) {
    return cached.articles;
  }

  try {
    // Run both queries concurrently
    const [rssArticles, yahooArticles] = await Promise.allSettled([
      fetchGoogleNewsRss(ticker, companyName),
      fetchYahooFinanceNews(ticker, companyName)
    ]);

    const combined: RawLiveArticle[] = [];

    if (rssArticles.status === 'fulfilled' && Array.isArray(rssArticles.value)) {
      combined.push(...rssArticles.value);
    }
    if (yahooArticles.status === 'fulfilled' && Array.isArray(yahooArticles.value)) {
      combined.push(...yahooArticles.value);
    }

    // Deduplicate articles based on headline similarity
    const seenTitles = new Set<string>();
    const deduplicated: RawLiveArticle[] = [];

    for (const art of combined) {
      const normalized = art.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
      if (!seenTitles.has(normalized)) {
        seenTitles.add(normalized);
        deduplicated.push(art);
      }
    }

    // Sort by publication date descending (newest first)
    deduplicated.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    // Limit to top 8 most recent live articles
    const topLive = deduplicated.slice(0, 8);

    if (topLive.length > 0) {
      NEWS_CACHE.set(cacheKey, {
        timestamp: now,
        articles: topLive
      });
    }

    return topLive;
  } catch (error) {
    console.error(`Live news fetch failed for ${ticker}:`, error);
    return [];
  }
}
