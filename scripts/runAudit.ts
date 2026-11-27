import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { TICKER_CATALOG, TickerMeta } from '../src/shared/tickerCatalog';
import { parseTickerMasterCsv } from '../src/shared/tickerMetadata';
import { getHistoricalDataWithSource } from '../src/server/services/stockService';
import { getMarketDataProvider } from '../src/server/providers/marketDataProvider';
import { MIN_CONFORMAL_BARS } from '../src/server/math/conformal';
import {
  clearEvaluationCaches,
  runAggregateModelEvaluation,
  runModelEvaluation,
  buildModelAuditPayload,
  DEFAULT_MIN_BREAKDOWN_ASSETS,
  EVALUATION_HISTORY_DAYS,
  UniverseTickerMeta
} from '../src/server/math/evaluation';
import {
  parseUniverseCliArgs,
  stratifiedSampleUniverse
} from '../src/server/math/universeSampling';
import { buildAuditCsv } from '../src/shared/auditExport';
import { db } from '../src/server/store/db';
import { closePool } from '../src/db/index';
import {
  DailySentimentRecord,
  DelistedStratumAssetReport,
  DelistedStratumReport,
  PerExchangeSamplingCount,
  TickerMasterItem
} from '../src/types';

function toTickerMeta(item: TickerMasterItem): TickerMeta {
  return {
    ticker: item.symbol,
    name: item.name,
    exchange: item.exchangeCode || item.exchange,
    currency: item.currency,
    basePrice: item.basePrice ?? (item.symbol.endsWith('.KS') || item.symbol.endsWith('.KQ') ? 56000 : 150),
    pe: item.pe ?? 20,
    marketCap: item.marketCap ?? 0,
    sector: item.sector || 'Equity',
    aliases: item.aliases || []
  };
}

async function evaluateDelistedStratum(
  delistedEquities: TickerMasterItem[]
): Promise<DelistedStratumReport> {
  const provider = getMarketDataProvider();
  const assets: DelistedStratumAssetReport[] = [];
  const skippedByReason: Record<string, number> = {};
  let evaluatedCount = 0;
  let skippedCount = 0;
  const batchSize = 5;

  for (let i = 0; i < delistedEquities.length; i += batchSize) {
    const batch = delistedEquities.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (item): Promise<DelistedStratumAssetReport> => {
        try {
          const res = await provider.getHistory(item.symbol, EVALUATION_HISTORY_DAYS, toTickerMeta(item));
          if (res.source === 'synthetic') {
            const skipReason: DelistedStratumAssetReport['skipReason'] =
              res.unavailableReason || 'synthetic_data';
            return {
              ticker: item.symbol,
              name: item.name,
              exchange: item.exchange,
              country: item.country,
              currency: item.currency,
              status: 'skipped',
              skipReason,
              ...(res.provider ? { dataProvider: res.provider } : {}),
              ...(res.fallbackFrom ? { fallbackFrom: res.fallbackFrom } : {}),
              ...(res.unavailableDetail ? { detail: res.unavailableDetail } : {})
            };
          }
          if (!res.bars || res.bars.length < MIN_CONFORMAL_BARS) {
            const skipReason: DelistedStratumAssetReport['skipReason'] =
              !res.bars || res.bars.length === 0 ? 'no_history' : 'insufficient_history';
            return {
              ticker: item.symbol,
              name: item.name,
              exchange: item.exchange,
              country: item.country,
              currency: item.currency,
              status: 'skipped',
              skipReason,
              ...(res.bars && res.bars.length > 0 ? { lastBarDate: res.bars[res.bars.length - 1].date } : {}),
              ...(res.provider ? { dataProvider: res.provider } : {}),
              ...(res.fallbackFrom ? { fallbackFrom: res.fallbackFrom } : {}),
              detail: `bars=${res.bars?.length ?? 0} (< ${MIN_CONFORMAL_BARS})`
            };
          }
          const ev = runModelEvaluation(res.bars, item.symbol, 'live');
          return {
            ticker: item.symbol,
            name: item.name,
            exchange: item.exchange,
            country: item.country,
            currency: item.currency,
            status: 'evaluated_stopped',
            lastBarDate: res.bars[res.bars.length - 1].date,
            samples: ev.totalBacktestSamples,
            priceAccuracy: Number((ev.priceAccuracy ?? 100 - ev.mape).toFixed(2)),
            naivePriceAccuracy: Number((ev.naivePriceAccuracy ?? 100 - (ev.naiveMape ?? ev.mape)).toFixed(2)),
            conformalCoverage: ev.conformalCoverage,
            directionalAccuracy: ev.directionalAccuracy,
            ...(res.provider ? { dataProvider: res.provider } : {}),
            ...(res.fallbackFrom ? { fallbackFrom: res.fallbackFrom } : {})
          };
        } catch (err: any) {
          return {
            ticker: item.symbol,
            name: item.name,
            exchange: item.exchange,
            country: item.country,
            currency: item.currency,
            status: 'skipped',
            skipReason: 'fetch_error',
            detail: err?.message ? String(err.message) : 'Fetch failed'
          };
        }
      })
    );

    for (const r of results) {
      assets.push(r);
      if (r.status === 'evaluated_stopped') {
        evaluatedCount++;
      } else {
        skippedCount++;
        const reasonKey = r.skipReason || 'delisted';
        skippedByReason[reasonKey] = (skippedByReason[reasonKey] || 0) + 1;
      }
    }
  }

  return {
    note: 'Delisted (active=false) equities isolated from active universe metrics and breakdowns because historical price series stop or return empty/404 upstream.',
    requestedCount: delistedEquities.length,
    evaluatedCount,
    skippedCount,
    skippedByReason,
    evaluatedAt: new Date().toISOString(),
    assets
  };
}

function reconcilePerExchangeCounts(
  baseCounts: PerExchangeSamplingCount[],
  evaluatedAssets: Array<{ ticker: string; exchange?: string }>,
  skippedTickers: Array<{ ticker: string; reason: string; exchange?: string }>,
  itemBySymbol: Map<string, TickerMasterItem>
): PerExchangeSamplingCount[] {
  const byMic = new Map<string, PerExchangeSamplingCount>();
  for (const row of baseCounts) {
    byMic.set(row.exchange, {
      ...row,
      evaluated: 0,
      skipped: 0,
      skippedByReason: {}
    });
  }

  for (const asset of evaluatedAssets) {
    const master = itemBySymbol.get(asset.ticker.toUpperCase());
    const mic = (master?.exchange || asset.exchange || 'UNKNOWN').toUpperCase();
    const row = byMic.get(mic);
    if (row) {
      row.evaluated += 1;
    }
  }

  for (const skip of skippedTickers) {
    const master = itemBySymbol.get(skip.ticker.toUpperCase());
    const mic = (master?.exchange || skip.exchange || 'UNKNOWN').toUpperCase();
    const row = byMic.get(mic);
    if (row) {
      row.skipped += 1;
      row.skippedByReason[skip.reason] = (row.skippedByReason[skip.reason] || 0) + 1;
    }
  }

  return Array.from(byMic.values()).sort((a, b) => a.exchange.localeCompare(b.exchange));
}

async function main() {
  const { useUniverse, perExchange, seed } = parseUniverseCliArgs(process.argv.slice(2));

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
  let itemBySymbol: Map<string, TickerMasterItem> | undefined;
  let basePerExchangeCounts: PerExchangeSamplingCount[] | undefined;
  let samplingMeta: ReturnType<typeof stratifiedSampleUniverse>['sampling'] | undefined;
  let delistedEquities: TickerMasterItem[] = [];

  if (useUniverse) {
    let masterTickers = await db.getAllTickers(false);
    if (masterTickers.length <= 100) {
      const csvPath = path.resolve(process.cwd(), 'scripts/seeds/global_tickers.csv');
      if (fs.existsSync(csvPath)) {
        const csvItems = parseTickerMasterCsv(fs.readFileSync(csvPath, 'utf8'));
        await db.upsertTickers(csvItems);
        masterTickers = await db.getAllTickers(false);
        console.log(
          `[Audit CLI] --universe auto-imported scripts/seeds/global_tickers.csv into ticker_master (total rows=${masterTickers.length}).`
        );
      }
    }

    const sampled = stratifiedSampleUniverse(masterTickers, { perExchange, seed });
    samplingMeta = sampled.sampling;
    basePerExchangeCounts = sampled.perExchangeCounts;
    delistedEquities = sampled.delistedEquities;

    targetCatalog = sampled.sampledActive.map((t) => ({ ticker: t.symbol, name: t.name }));
    tickerMetaLookup = new Map<string, UniverseTickerMeta>();
    itemBySymbol = new Map<string, TickerMasterItem>();
    for (const t of sampled.sampledActive) {
      const upper = t.symbol.toUpperCase();
      tickerMetaLookup.set(upper, {
        name: t.name,
        country: t.country,
        exchange: t.exchange,
        exchangeCode: t.exchangeCode || t.exchange
      });
      itemBySymbol.set(upper, t);
    }

    console.log(
      `[Audit CLI] --universe mode: sampled ${targetCatalog.length} active equities (up to ${perExchange}/exchange, seed=${seed}) across ${samplingMeta.exchangesCovered} exchanges (+ ${delistedEquities.length} delisted in separate stratum; stored daily sentiment: ${allSentiment.length} record(s) across ${sentimentByTicker.size} ticker(s))...`
    );
  } else {
    console.log(
      `[Audit CLI] Evaluating ${TICKER_CATALOG.length} catalog tickers using live market data history (stored daily sentiment: ${allSentiment.length} record(s) across ${sentimentByTicker.size} ticker(s))...`
    );
  }

  let universeDone = 0;
  const activeProvider = getMarketDataProvider();
  const fetcher = useUniverse
    ? async (ticker: string, days?: number) => {
        try {
          const master = itemBySymbol?.get(ticker.toUpperCase());
          return await activeProvider.getHistory(
            ticker,
            days ?? EVALUATION_HISTORY_DAYS,
            master ? toTickerMeta(master) : undefined
          );
        } finally {
          universeDone++;
          if (universeDone % 50 === 0 || universeDone === targetCatalog.length) {
            console.log(`[Audit CLI] --universe fetch progress: ${universeDone}/${targetCatalog.length} active tickers`);
          }
        }
      }
    : getHistoricalDataWithSource;

  const evaluation = await runAggregateModelEvaluation(fetcher, targetCatalog, {
    sentimentByTicker,
    ...(useUniverse
      ? {
          tickerMetaLookup,
          universeMode: 'ticker_master' as const,
          includeBreakdowns: true,
          minBreakdownAssets: DEFAULT_MIN_BREAKDOWN_ASSETS,
          includeCalendarValidation: true
        }
      : {})
  });

  let delistedStratum: DelistedStratumReport | undefined;
  let reconciledExchangeCounts: PerExchangeSamplingCount[] | undefined;
  if (useUniverse && basePerExchangeCounts && itemBySymbol) {
    if (delistedEquities.length > 0) {
      console.log(`[Audit CLI] Evaluating isolated delisted stratum (${delistedEquities.length} inactive tickers)...`);
    }
    delistedStratum = await evaluateDelistedStratum(delistedEquities);
    const evalAssets = 'assetBreakdown' in evaluation && evaluation.assetBreakdown ? evaluation.assetBreakdown : [];
    const skips = evaluation.skippedTickers || [];
    reconciledExchangeCounts = reconcilePerExchangeCounts(
      basePerExchangeCounts,
      evalAssets,
      skips,
      itemBySymbol
    );
    evaluation.sampling = samplingMeta;
    evaluation.perExchangeCounts = reconciledExchangeCounts;
    evaluation.delistedStratum = delistedStratum;
  }

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
  const pt = audit.providerTelemetry;
  console.log(`\n=== AlphaQuant Reproducible Model Audit Summary (${scopeLabel}) ===`);
  console.log(`Evaluated At      : ${audit.evaluatedAt}`);
  console.log(`Git Commit        : ${audit.gitCommit ?? 'null (unavailable)'}`);
  if (audit.sampling) {
    console.log(
      `Sampling          : method=${audit.sampling.method}, perExchange=${audit.sampling.perExchange}, seed=${audit.sampling.seed}, exchanges=${audit.sampling.exchangesCovered}, activePool=${audit.sampling.activeEquitiesCount}, delistedPool=${audit.sampling.delistedEquitiesCount}`
    );
  }
  console.log(`Data Source       : ${audit.dataSource}`);
  console.log(`Data Provider     : ${audit.dataProvider ?? 'n/a'}`);
  if (pt) {
    console.log(
      `Provider Counts   : ${JSON.stringify(pt.providerCounts)} | twelveData=${pt.twelveDataStatus === 'not_configured' ? 'not configured' : 'configured'} | fallbackTotal=${pt.fallbackTotal} | fallbackByProvider=${JSON.stringify(pt.fallbackByProvider)} | fallbackByReason=${JSON.stringify(pt.fallbackByReason)} | rateLimit429=${pt.rateLimit429Count}`
    );
  }
  if (audit.fallbackFrom) {
    console.warn(`Fallback Warning  : fallbackFrom=${audit.fallbackFrom} (${audit.providerWarning || 'primary provider unavailable'})`);
  }
  console.log(`Currency Scope    : ${audit.currency ?? 'n/a'}`);
  console.log(`Assets Evaluated  : ${audit.evaluatedAssetsCount} / ${targetCatalog.length} (skipped: ${audit.skippedTickers?.length ?? 0})`);
  if (audit.shortTestWindowCount !== undefined) {
    console.log(
      `Short Windows     : ${audit.shortTestWindowCount} evaluated asset(s) with < ${audit.minTestPredictionsThreshold ?? 120} test predictions`
    );
  }
  if (audit.calendarValidation) {
    console.log(
      `Calendar Check    : ${audit.calendarValidation.checkedTestDatesCount} test date(s) across ${audit.calendarValidation.checkedExchangesCount} exchange(s) -> mismatchCount=${audit.calendarValidation.mismatchCount}`
    );
  }
  console.log(`Test Window       : ${audit.testWindowStart} -> ${audit.testWindowEnd} (n = ${audit.totalTestPredictions})`);
  console.log(`Price Accuracy    : Mean ${audit.priceAccuracy?.toFixed(2)}% | Median ${ss?.priceAccuracy?.median ?? 'n/a'}% (Naive Mean ${audit.naivePriceAccuracy?.toFixed(2)}% | Median ${ss?.naivePriceAccuracy?.median ?? 'n/a'}%)`);
  console.log(`Skill vs Naive    : MAE Beat ${audit.beatNaiveLabel ?? 'n/a'} | Mean MAE Skill ${audit.maeSkillVsNaive != null ? `${(audit.maeSkillVsNaive * 100).toFixed(2)}%` : 'n/a'} | Median ${ss?.maeSkillVsNaive ? `${(ss.maeSkillVsNaive.median * 100).toFixed(2)}%` : 'n/a'}`);
  if (ds) {
    const binomNote =
      ds.binomialPValueVsAlwaysUp != null ? ` | Binomial p = ${ds.binomialPValueVsAlwaysUp}` : ' | Binomial p = omitted (cross-asset correlated)';
    console.log(`Pooled (indep.)   : DirAcc ${ds.pooledDirectionalAccuracyPct}% vs AlwaysUp ${ds.pooledAlwaysUpAccuracyPct}% | Wilson 95% CI [${ds.wilson95CI[0]}%, ${ds.wilson95CI[1]}%]${binomNote}`);
    console.log(`Date Bootstrap CI : Edge ${ds.directionalEdgeVsAlwaysUpPct}pp | 95% CI [${ds.directionalEdgeVsAlwaysUp95CI?.[0]}, ${ds.directionalEdgeVsAlwaysUp95CI?.[1]}]pp | P(edge > 0) = ${ds.bootstrapProbEdgePositive}`);
    console.log(`Per-Asset Sign    : ${ds.signTestWins} wins, ${ds.signTestLosses} losses, ${ds.signTestTies} ties | two-sided p = ${ds.signTestPValue}`);
  }
  if (audit.regionBreakdowns && Object.keys(audit.regionBreakdowns).length > 0) {
    console.log('\nRegion Breakdowns:');
    for (const [region, b] of Object.entries(audit.regionBreakdowns)) {
      console.log(
        `  - ${region}: ${b.assetsCount} asset(s), n=${b.totalTestPredictions} | PriceAcc ${b.priceAccuracy.toFixed(2)}% (Naive ${b.naivePriceAccuracy.toFixed(2)}%) | MAESkill=${b.maeSkillVsNaive != null ? (b.maeSkillVsNaive * 100).toFixed(2) + '%' : 'n/a'} | DirAcc=${b.directionalAccuracy}% vs AlwaysUp=${b.alwaysUpAccuracy}% (Boot Edge=${b.directionalStats.directionalEdgeVsAlwaysUpPct}pp) | Coverage=${b.conformalCoverage}%`
      );
    }
  }
  if (audit.countryBreakdowns && Object.keys(audit.countryBreakdowns).length > 0) {
    console.log(`\nCountry Breakdowns (n >= ${audit.minBreakdownAssets ?? 5}):`);
    for (const [country, b] of Object.entries(audit.countryBreakdowns)) {
      const maeStr = b.mae != null ? b.mae.toFixed(2) : 'n/a (mixed currency)';
      console.log(
        `  - ${country}: ${b.assetsCount} asset(s) [${b.currency}] | PriceAcc ${b.priceAccuracy.toFixed(2)}% (Naive ${b.naivePriceAccuracy.toFixed(2)}%) | MAE=${maeStr} | Coverage=${b.conformalCoverage}% | DirAcc=${b.directionalAccuracy}% | Bootstrap Edge=${b.directionalStats.directionalEdgeVsAlwaysUpPct}pp`
      );
    }
  }
  if (audit.insufficientSampleCountries && audit.insufficientSampleCountries.length > 0) {
    console.log(
      `\nCountries With Insufficient Sample (n < ${audit.minBreakdownAssets ?? 5}): ${audit.insufficientSampleCountries.map((c) => `${c.key}(n=${c.assetsCount})`).join(', ')}`
    );
  }
  if (audit.exchangeBreakdowns && Object.keys(audit.exchangeBreakdowns).length > 0) {
    console.log(`\nExchange Breakdowns (n >= ${audit.minBreakdownAssets ?? 5}):`);
    for (const [ex, b] of Object.entries(audit.exchangeBreakdowns)) {
      const maeStr = b.mae != null ? b.mae.toFixed(2) : 'n/a (mixed currency)';
      console.log(
        `  - ${ex}: ${b.assetsCount} asset(s) [${b.currency}] | PriceAcc ${b.priceAccuracy.toFixed(2)}% (Naive ${b.naivePriceAccuracy.toFixed(2)}%) | MAE=${maeStr} | Coverage=${b.conformalCoverage}% | DirAcc=${b.directionalAccuracy}% | BeatNaive=${b.beatNaiveLabel}`
      );
    }
  }
  if (audit.insufficientSampleExchanges && audit.insufficientSampleExchanges.length > 0) {
    console.log(
      `\nExchanges With Insufficient Sample (n < ${audit.minBreakdownAssets ?? 5}): ${audit.insufficientSampleExchanges.map((x) => `${x.key}(n=${x.assetsCount})`).join(', ')}`
    );
  }
  if (audit.perExchangeCounts && audit.perExchangeCounts.length > 0) {
    console.log('\nPer-Exchange Sampling Counts:');
    for (const row of audit.perExchangeCounts) {
      const skipReasons = Object.entries(row.skippedByReason)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      console.log(
        `  - ${row.exchange} (${row.country}): availActive=${row.availableActive}, req=${row.requested}, eval=${row.evaluated}, skip=${row.skipped}${skipReasons ? ` [${skipReasons}]` : ''}, delisted=${row.delistedCount}`
      );
    }
  }
  if (audit.delistedStratum) {
    console.log(
      `\nDelisted Stratum  : requested=${audit.delistedStratum.requestedCount}, evaluatedStopped=${audit.delistedStratum.evaluatedCount}, skipped=${audit.delistedStratum.skippedCount} ${JSON.stringify(audit.delistedStratum.skippedByReason)}`
    );
  }
  if (audit.skippedTickers && audit.skippedTickers.length > 0) {
    console.log(`\nSkipped Tickers (${audit.skippedTickers.length}):`);
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
