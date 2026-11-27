/**
 * Idempotent Daily Sentiment Backfill Script
 *
 * Fetches available recent headlines from Google News RSS and Yahoo Finance Search
 * across the catalog tickers, scores them using FinBERT (with keyword lexicon fallback),
 * weights by publisher credibility, and persists daily per-ticker aggregates in
 * data/alphaquant_store.json.
 *
 * - Strictly idempotent: never overwrites past days already stored.
 * - Zero-article days are omitted (left missing, never recorded as 0).
 *
 * Usage:
 *   npx tsx scripts/backfillSentiment.ts
 */

import 'dotenv/config';
import { TICKER_CATALOG } from '../src/shared/tickerCatalog';
import { collectAndPersistLiveSentimentForTicker } from '../src/server/math/nlpEngine';
import { db } from '../src/server/store/db';
import { closePool } from '../src/db/index';

async function main() {
  const uniqueTickers = Array.from(new Map(TICKER_CATALOG.map((item) => [item.ticker, item])).values());
  console.log(`[Sentiment Backfill] Scanning ${uniqueTickers.length} catalog tickers from Yahoo Finance & Google News RSS...`);

  let totalArticlesScored = 0;
  let totalFinbertArticles = 0;
  let totalLexiconArticles = 0;
  let totalInserted = 0;
  let totalUpdatedToday = 0;
  let totalSkippedPast = 0;
  let tickersWithLiveNews = 0;

  const batchSize = 4;
  for (let i = 0; i < uniqueTickers.length; i += batchSize) {
    const batch = uniqueTickers.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (item) => {
        return {
          ticker: item.ticker,
          ...(await collectAndPersistLiveSentimentForTicker(item.ticker, item.name, {
            bypassCache: true,
            maxArticles: 25,
            persistToDisk: true
          }))
        };
      })
    );

    for (const res of results) {
      if (res.status !== 'fulfilled') {
        console.warn('[Sentiment Backfill] Ticker batch item failed:', res.reason);
        continue;
      }
      const { ticker, liveNewsItems, dailyRecords, upsertStats } = res.value;
      if (liveNewsItems.length > 0) tickersWithLiveNews++;
      totalArticlesScored += liveNewsItems.length;
      totalFinbertArticles += liveNewsItems.filter((n) => n.sentimentSource === 'finbert').length;
      totalLexiconArticles += liveNewsItems.filter((n) => n.sentimentSource !== 'finbert').length;
      totalInserted += upsertStats.inserted;
      totalUpdatedToday += upsertStats.updatedToday;
      totalSkippedPast += upsertStats.skippedExistingPast;

      if (dailyRecords.length > 0) {
        const dateList = dailyRecords.map((r) => `${r.date}(${r.articleCount})`).join(', ');
        console.log(`  ${ticker.padEnd(15)} -> ${liveNewsItems.length} live headlines across ${dailyRecords.length} day(s): ${dateList}`);
      } else {
        console.log(`  ${ticker.padEnd(15)} -> 0 live headlines returned`);
      }
    }

    if (i + batchSize < uniqueTickers.length) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  await db.flushToDisk();
  const countsByTicker = await db.getDailySentimentCountsByTicker();
  const totalStoredRows = (await db.getAllDailySentiment()).length;
  const maxDaysPerTicker = Math.max(0, ...Object.values(countsByTicker));

  console.log('\n=== Daily Sentiment Backfill Complete ===');
  console.log(`Store Target               : ${db.getStoreFilePath()}`);
  console.log(`Tickers With Live Headlines: ${tickersWithLiveNews} / ${uniqueTickers.length}`);
  console.log(`Live Articles Scored       : ${totalArticlesScored} (FinBERT: ${totalFinbertArticles}, Lexicon fallback: ${totalLexiconArticles})`);
  console.log(`Records Inserted           : ${totalInserted}`);
  console.log(`Same-Day Records Updated   : ${totalUpdatedToday}`);
  console.log(`Past-Day Records Preserved : ${totalSkippedPast}`);
  console.log(`Total Stored Daily Rows    : ${totalStoredRows} across ${Object.keys(countsByTicker).length} ticker(s) (max days/ticker: ${maxDaysPerTicker})`);
}

main()
  .catch((err) => {
    console.error('[Sentiment Backfill] Unhandled error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool().catch(() => {});
  });
