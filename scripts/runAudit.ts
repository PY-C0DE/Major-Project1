import fs from 'node:fs';
import path from 'node:path';
import { TICKER_CATALOG } from '../src/shared/tickerCatalog';
import { getHistoricalDataWithSource } from '../src/server/services/stockService';
import {
  clearEvaluationCaches,
  runAggregateModelEvaluation,
  buildModelAuditPayload,
  UniverseTickerMeta
} from '../src/server/math/evaluation';
import { buildAuditCsv } from '../src/shared/auditExport';
import { db } from '../src/server/store/db';
import { closePool } from '../src/db/index';
import { DailySentimentRecord } from '../src/types';

async function main() {
  const args = new Set(process.argv.slice(2));
  const useUniverse = args.has('--universe');

  clearEvaluationCaches();
  const allSentiment = await db.getAllDailySentiment();
  const sentimentByTicker = new Map<string, DailySentimentRecord[]>();
  for (const rec of allSentiment) {
    const key = rec.ticker.toUpperCase();
    const list = sentimentByTicker.get(key) || [];
    list.push(rec);
    sentimentByTicker.set(key, list);
  }

  let targetCatalog: Array<{ ticker: string; name: string }> = TICKER_CATALOG;
  let tickerMetaLookup: Map<string, UniverseTickerMeta> | undefined;

  if (useUniverse) {
    const masterTickers = await db.getAllTickers(true);
    const equityTickers = masterTickers.filter(
      (t) => !t.assetType || t.assetType.toUpperCase() === 'EQUITY'
    );
    targetCatalog = equityTickers.map((t) => ({ ticker: t.symbol, name: t.name }));
    tickerMetaLookup = new Map<string, UniverseTickerMeta>();
    for (const t of equityTickers) {
      tickerMetaLookup.set(t.symbol.toUpperCase(), {
        name: t.name,
        country: t.country,
        exchange: t.exchange,
        exchangeCode: t.exchangeCode || t.exchange
      });
    }
    console.log(
      `[Audit CLI] --universe mode: evaluating ${targetCatalog.length} active ticker_master equities (stored daily sentiment: ${allSentiment.length} record(s) across ${sentimentByTicker.size} ticker(s))...`
    );
  } else {
    console.log(
      `[Audit CLI] Evaluating ${TICKER_CATALOG.length} catalog tickers using live Yahoo Finance history (stored daily sentiment: ${allSentiment.length} record(s) across ${sentimentByTicker.size} ticker(s))...`
    );
  }

  const evaluation = await runAggregateModelEvaluation(getHistoricalDataWithSource, targetCatalog, {
    sentimentByTicker,
    ...(useUniverse
      ? {
          tickerMetaLookup,
          universeMode: 'ticker_master' as const,
          includeBreakdowns: true
        }
      : {})
  });
  const audit = buildModelAuditPayload(evaluation);

  if (!audit.available || audit.evaluatedAssetsCount === 0) {
    console.error(
      `[Audit CLI] Audit failed: ${audit.reason || 'No live market data available'} (evaluatedAssetsCount=${audit.evaluatedAssetsCount}, skippedTickers=${audit.skippedTickers?.length ?? 0}).`
    );
    process.exitCode = 1;
    return;
  }

  const outDir = path.resolve(process.cwd(), 'audit-output');
  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, useUniverse ? 'universe-audit.json' : 'audit.json');
  const csvPath = path.join(outDir, useUniverse ? 'universe-audit.csv' : 'audit.csv');
  const scopeLabel = useUniverse ? 'UNIVERSE_TICKER_MASTER' : 'ALL';

  fs.writeFileSync(jsonPath, JSON.stringify(audit, null, 2), 'utf-8');
  fs.writeFileSync(csvPath, buildAuditCsv(audit, scopeLabel), 'utf-8');

  const ds = audit.directionalStats;
  const ss = audit.summaryStats;
  console.log(`\n=== AlphaQuant Reproducible Model Audit Summary (${scopeLabel}) ===`);
  console.log(`Evaluated At      : ${audit.evaluatedAt}`);
  console.log(`Git Commit        : ${audit.gitCommit ?? 'null (unavailable)'}`);
  console.log(`Data Source       : ${audit.dataSource}`);
  console.log(`Data Provider     : ${audit.dataProvider ?? 'n/a'}`);
  if (audit.fallbackFrom) {
    console.warn(`Fallback Warning  : fallbackFrom=${audit.fallbackFrom} (${audit.providerWarning || 'primary provider unavailable'})`);
  }
  console.log(`Currency Scope    : ${audit.currency ?? 'n/a'}`);
  console.log(`Assets Evaluated  : ${audit.evaluatedAssetsCount} / ${targetCatalog.length} (skipped: ${audit.skippedTickers?.length ?? 0})`);
  console.log(`Test Window       : ${audit.testWindowStart} -> ${audit.testWindowEnd} (n = ${audit.totalTestPredictions})`);
  console.log(`Price Accuracy    : Mean ${audit.priceAccuracy?.toFixed(2)}% | Median ${ss?.priceAccuracy?.median ?? 'n/a'}% (Naive Mean ${audit.naivePriceAccuracy?.toFixed(2)}% | Median ${ss?.naivePriceAccuracy?.median ?? 'n/a'}%)`);
  console.log(`Skill vs Naive    : MAE Beat ${audit.beatNaiveLabel ?? 'n/a'} | Mean MAE Skill ${audit.maeSkillVsNaive != null ? `${(audit.maeSkillVsNaive * 100).toFixed(2)}%` : 'n/a'} | Median ${ss?.maeSkillVsNaive ? `${(ss.maeSkillVsNaive.median * 100).toFixed(2)}%` : 'n/a'}`);
  if (ds) {
    console.log(`Pooled (indep.)   : DirAcc ${ds.pooledDirectionalAccuracyPct}% vs AlwaysUp ${ds.pooledAlwaysUpAccuracyPct}% | Wilson 95% CI [${ds.wilson95CI[0]}%, ${ds.wilson95CI[1]}%] | Binomial p = ${ds.binomialPValueVsAlwaysUp}`);
    console.log(`Date Bootstrap CI : Edge ${ds.directionalEdgeVsAlwaysUpPct}pp | 95% CI [${ds.directionalEdgeVsAlwaysUp95CI?.[0]}, ${ds.directionalEdgeVsAlwaysUp95CI?.[1]}]pp | P(edge > 0) = ${ds.bootstrapProbEdgePositive}`);
    console.log(`Per-Asset Sign    : ${ds.signTestWins} wins, ${ds.signTestLosses} losses, ${ds.signTestTies} ties | two-sided p = ${ds.signTestPValue}`);
  }
  if (audit.countryBreakdowns && Object.keys(audit.countryBreakdowns).length > 0) {
    console.log('\nCountry Breakdowns:');
    for (const [country, b] of Object.entries(audit.countryBreakdowns)) {
      const maeStr = b.mae != null ? b.mae.toFixed(2) : 'n/a (mixed currency)';
      console.log(
        `  - ${country}: ${b.assetsCount} asset(s) [${b.currency}] | PriceAcc ${b.priceAccuracy.toFixed(2)}% (Naive ${b.naivePriceAccuracy.toFixed(2)}%) | MAE=${maeStr} | Coverage=${b.conformalCoverage}% | DirAcc=${b.directionalAccuracy}% | Bootstrap Edge=${b.directionalStats.directionalEdgeVsAlwaysUpPct}pp`
      );
    }
  }
  if (audit.exchangeBreakdowns && Object.keys(audit.exchangeBreakdowns).length > 0) {
    console.log('\nExchange Breakdowns:');
    for (const [ex, b] of Object.entries(audit.exchangeBreakdowns)) {
      const maeStr = b.mae != null ? b.mae.toFixed(2) : 'n/a (mixed currency)';
      console.log(
        `  - ${ex}: ${b.assetsCount} asset(s) [${b.currency}] | PriceAcc ${b.priceAccuracy.toFixed(2)}% (Naive ${b.naivePriceAccuracy.toFixed(2)}%) | MAE=${maeStr} | Coverage=${b.conformalCoverage}% | DirAcc=${b.directionalAccuracy}% | BeatNaive=${b.beatNaiveLabel}`
      );
    }
  }
  if (audit.skippedTickers && audit.skippedTickers.length > 0) {
    console.log('\nSkipped Tickers:');
    for (const s of audit.skippedTickers) {
      const loc = [s.country, s.exchange].filter(Boolean).join('/');
      console.log(`  - ${s.ticker}${loc ? ` (${loc})` : ''}: ${s.reason}${s.barsCount !== undefined ? ` (bars=${s.barsCount})` : ''}`);
    }
  }
  const sa = audit.sentimentAblation;
  if (sa) {
    if (sa.available && sa.priceOnly && sa.pricePlusSentiment && sa.pairedDiff) {
      const maePart = sa.pairedDiff.maeDiff != null && sa.pairedDiff.maeDiffCI95
        ? `ΔMAE=${sa.pairedDiff.maeDiff} 95%CI [${sa.pairedDiff.maeDiffCI95[0]}, ${sa.pairedDiff.maeDiffCI95[1]}]`
        : 'ΔMAE=n/a(mixed currency)';
      console.log(`Sentiment Ablation: n=${sa.matchedSamples} across ${sa.matchedDates} dates (${sa.matchedAssetsCount} assets) | ΔPriceAcc=${sa.pairedDiff.priceAccuracyDiffPct >= 0 ? '+' : ''}${sa.pairedDiff.priceAccuracyDiffPct.toFixed(2)}% | ${maePart} | ΔDirAcc=${sa.pairedDiff.directionalAccuracyDiffPp >= 0 ? '+' : ''}${sa.pairedDiff.directionalAccuracyDiffPp}pp 95%CI [${sa.pairedDiff.directionalAccuracyDiffCI95[0]}, ${sa.pairedDiff.directionalAccuracyDiffCI95[1]}]pp`);
    } else {
      console.log(`Sentiment Ablation: unavailable (${sa.reason})`);
    }
  }
  console.log(`Wrote JSON        : ${jsonPath}`);
  console.log(`Wrote CSV         : ${csvPath}`);
}

const keepAlive = setInterval(() => {}, 1000);
main()
  .catch((err) => {
    console.error('[Audit CLI] Unhandled error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    clearInterval(keepAlive);
    await closePool().catch(() => {});
  });
