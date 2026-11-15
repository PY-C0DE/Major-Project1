import fs from 'node:fs';
import path from 'node:path';
import { TICKER_CATALOG } from '../src/shared/tickerCatalog';
import { getHistoricalDataWithSource } from '../src/server/services/stockService';
import {
  clearEvaluationCaches,
  runAggregateModelEvaluation,
  buildModelAuditPayload
} from '../src/server/math/evaluation';
import { buildAuditCsv } from '../src/shared/auditExport';

async function main() {
  clearEvaluationCaches();
  console.log(`[Audit CLI] Evaluating ${TICKER_CATALOG.length} catalog tickers using live Yahoo Finance history...`);

  const evaluation = await runAggregateModelEvaluation(getHistoricalDataWithSource, TICKER_CATALOG);
  const audit = buildModelAuditPayload(evaluation);

  if (!audit.available || audit.evaluatedAssetsCount === 0) {
    console.error(`[Audit CLI] Audit failed: ${audit.reason || 'No live market data available'} (evaluatedAssetsCount=${audit.evaluatedAssetsCount}, skippedTickers=${audit.skippedTickers?.length ?? 0}).`);
    process.exitCode = 1;
    return;
  }

  const outDir = path.resolve(process.cwd(), 'audit-output');
  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'audit.json');
  const csvPath = path.join(outDir, 'audit.csv');

  fs.writeFileSync(jsonPath, JSON.stringify(audit, null, 2), 'utf-8');
  fs.writeFileSync(csvPath, buildAuditCsv(audit, 'ALL'), 'utf-8');

  const ds = audit.directionalStats;
  const ss = audit.summaryStats;
  console.log('\n=== AlphaQuant Reproducible Model Audit Summary ===');
  console.log(`Evaluated At      : ${audit.evaluatedAt}`);
  console.log(`Git Commit        : ${audit.gitCommit ?? 'null (unavailable)'}`);
  console.log(`Data Source       : ${audit.dataSource}`);
  console.log(`Assets Evaluated  : ${audit.evaluatedAssetsCount} / ${TICKER_CATALOG.length} (skipped: ${audit.skippedTickers?.length ?? 0})`);
  console.log(`Test Window       : ${audit.testWindowStart} -> ${audit.testWindowEnd} (n = ${audit.totalTestPredictions})`);
  console.log(`Price Accuracy    : Mean ${audit.priceAccuracy?.toFixed(2)}% | Median ${ss?.priceAccuracy?.median ?? 'n/a'}% (Naive Mean ${audit.naivePriceAccuracy?.toFixed(2)}% | Median ${ss?.naivePriceAccuracy?.median ?? 'n/a'}%)`);
  console.log(`Skill vs Naive    : MAE Beat ${audit.beatNaiveLabel ?? 'n/a'} | Mean MAE Skill ${audit.maeSkillVsNaive != null ? `${(audit.maeSkillVsNaive * 100).toFixed(2)}%` : 'n/a'} | Median ${ss?.maeSkillVsNaive ? `${(ss.maeSkillVsNaive.median * 100).toFixed(2)}%` : 'n/a'}`);
  if (ds) {
    console.log(`Pooled (indep.)   : DirAcc ${ds.pooledDirectionalAccuracyPct}% vs AlwaysUp ${ds.pooledAlwaysUpAccuracyPct}% | Wilson 95% CI [${ds.wilson95CI[0]}%, ${ds.wilson95CI[1]}%] | Binomial p = ${ds.binomialPValueVsAlwaysUp}`);
    console.log(`Date Bootstrap CI : Edge ${ds.directionalEdgeVsAlwaysUpPct}pp | 95% CI [${ds.directionalEdgeVsAlwaysUp95CI?.[0]}, ${ds.directionalEdgeVsAlwaysUp95CI?.[1]}]pp | P(edge > 0) = ${ds.bootstrapProbEdgePositive}`);
    console.log(`Per-Asset Sign    : ${ds.signTestWins} wins, ${ds.signTestLosses} losses, ${ds.signTestTies} ties | two-sided p = ${ds.signTestPValue}`);
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
  .finally(() => {
    clearInterval(keepAlive);
  });
