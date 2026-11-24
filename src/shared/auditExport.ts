import { ModelAuditResponse } from '../types';

function escapeCsvCell(val: string | number | undefined | null): string {
  const str = val === undefined || val === null ? '' : String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildAuditCsv(audit: ModelAuditResponse, scopeLabel = 'ALL'): string {
  const headers = [
    'ticker',
    'name',
    'currency',
    'dataSource',
    'testWindowStart',
    'testWindowEnd',
    'samples',
    'priceAccuracyPct',
    'naivePriceAccuracyPct',
    'mapePct',
    'naiveMapePct',
    'maeSkillVsNaive',
    'rmseSkillVsNaive',
    'conformalCoveragePct',
    'directionalAccuracyPct',
    'alwaysUpAccuracyPct',
    'mae',
    'naiveMae',
    'rmse',
    'naiveRmse',
    'r2'
  ];

  const rows = (audit.assets || []).map((row) => [
    row.ticker,
    row.name,
    row.currency ?? '',
    row.dataSource,
    row.testWindowStart,
    row.testWindowEnd,
    row.samples,
    row.priceAccuracy.toFixed(2),
    row.naivePriceAccuracy != null ? row.naivePriceAccuracy.toFixed(2) : '',
    row.mape.toFixed(2),
    row.naiveMape != null ? row.naiveMape.toFixed(2) : '',
    row.maeSkillVsNaive != null ? row.maeSkillVsNaive.toFixed(4) : '',
    row.rmseSkillVsNaive != null ? row.rmseSkillVsNaive.toFixed(4) : '',
    row.conformalCoverage,
    row.directionalAccuracy,
    row.alwaysUpAccuracy,
    row.mae != null ? row.mae.toFixed(2) : '',
    row.naiveMae != null ? row.naiveMae.toFixed(2) : '',
    row.rmse != null ? row.rmse.toFixed(2) : '',
    row.naiveRmse != null ? row.naiveRmse.toFixed(2) : '',
    row.r2
  ]);

  const ep = audit.evaluationParams;
  const skipped = audit.skippedTickers || [];
  const skippedSummary = skipped.length > 0
    ? skipped.map((s) => `${s.ticker}(${s.reason}${s.barsCount !== undefined ? `:${s.barsCount}` : ''})`).join('; ')
    : 'none';

  const metadataLines = [
    `# Reproducible Audit Metadata (${scopeLabel})`,
    `# evaluatedAt=${audit.evaluatedAt ?? 'n/a'}, gitCommit=${audit.gitCommit ?? 'null'}, dataSource=${audit.dataSource}, currency=${audit.currency ?? 'n/a'}, evaluatedAssetsCount=${audit.evaluatedAssetsCount}, skippedCount=${skipped.length}`,
    ...(ep
      ? [
          `# evaluationParams: historyDays=${ep.historyDays}, minBarsRequired=${ep.minBarsRequired}, testWindowRule="${ep.testWindowRule}", retrainIntervalRule="${ep.retrainIntervalRule}", calibrationWindowMax=${ep.calibrationWindowMax}, conformalCoverageTarget=${ep.conformalCoverageTarget}, bootstrapResamples=${ep.bootstrapResamples}, bootstrapSeed=${ep.bootstrapSeed}, signTestNullP=${ep.signTestNullP}`
        ]
      : []),
    `# skippedTickers: ${skippedSummary}`
  ];

  const ds = audit.directionalStats;
  const ss = audit.summaryStats;
  const summaryLines = [
    ...(ss
      ? [
          `# Price Accuracy Summary: modelMean=${audit.priceAccuracy?.toFixed(2) ?? 'n/a'}%, modelMedian=${ss.priceAccuracy?.median ?? 'n/a'}%, naiveMean=${audit.naivePriceAccuracy?.toFixed(2) ?? 'n/a'}%, naiveMedian=${ss.naivePriceAccuracy?.median ?? 'n/a'}%, maeSkillMean=${ss.maeSkillVsNaive?.mean ?? 'n/a'}, maeSkillMedian=${ss.maeSkillVsNaive?.median ?? 'n/a'}, beatNaive=${audit.beatNaiveLabel ?? 'n/a'}`
        ]
      : []),
    ...(ds
      ? [
          `# Pooled (assumes independence): dirAcc=${ds.pooledDirectionalAccuracyPct}%, alwaysUp=${ds.pooledAlwaysUpAccuracyPct}%, wilson95CI=[${ds.wilson95CI[0]}%, ${ds.wilson95CI[1]}%], oneSidedBinomialP=${ds.binomialPValueVsAlwaysUp}, n=${ds.totalTestPredictions}`,
          `# Date-Clustered Bootstrap (${ds.bootstrapResamples ?? 2000} resamples, seed=${ds.bootstrapSeed ?? 20261114}): edgeVsAlwaysUp=${ds.directionalEdgeVsAlwaysUpPct ?? 'n/a'}pp, ci95=[${ds.directionalEdgeVsAlwaysUp95CI?.[0] ?? 'n/a'}, ${ds.directionalEdgeVsAlwaysUp95CI?.[1] ?? 'n/a'}]pp, probEdgePositive=${ds.bootstrapProbEdgePositive ?? 'n/a'}`,
          `# Per-Asset Sign Test (vs Always-Up, p0=0.5): wins=${ds.signTestWins ?? 0}, losses=${ds.signTestLosses ?? 0}, ties=${ds.signTestTies ?? 0}, twoSidedPValue=${ds.signTestPValue ?? 'n/a'}`,
          `# Citation Guidance: The date-bootstrap interval is the one to cite.`
        ]
      : [])
  ];

  const sa = audit.sentimentAblation;
  const ablationLines = sa
    ? sa.available && sa.priceOnly && sa.pricePlusSentiment && sa.pairedDiff
      ? [
          `# Sentiment Ablation (Paired Subset): samples=${sa.matchedSamples}, dates=${sa.matchedDates}, assets=${sa.matchedAssetsCount}, currency=${sa.currency ?? 'n/a'}, significant=${sa.pairedDiff.statisticallySignificantImprovement}`,
          `# Sentiment Ablation Price-Only (24f): priceAcc=${sa.priceOnly.priceAccuracy.toFixed(2)}%, mae=${sa.priceOnly.mae != null ? sa.priceOnly.mae.toFixed(4) : 'n/a(mixed)'}, maeSkill=${sa.priceOnly.maeSkillVsNaive ?? 'n/a'}, dirAcc=${sa.priceOnly.directionalAccuracy}%, coverage=${sa.priceOnly.conformalCoverage}%`,
          `# Sentiment Ablation Price+Sentiment (28f): priceAcc=${sa.pricePlusSentiment.priceAccuracy.toFixed(2)}%, mae=${sa.pricePlusSentiment.mae != null ? sa.pricePlusSentiment.mae.toFixed(4) : 'n/a(mixed)'}, maeSkill=${sa.pricePlusSentiment.maeSkillVsNaive ?? 'n/a'}, dirAcc=${sa.pricePlusSentiment.directionalAccuracy}%, coverage=${sa.pricePlusSentiment.conformalCoverage}%`,
          `# Sentiment Ablation Paired Diff (b-a): deltaPriceAcc=${sa.pairedDiff.priceAccuracyDiffPct}%, deltaMae=${sa.pairedDiff.maeDiff != null ? sa.pairedDiff.maeDiff : 'n/a(mixed)'} ci95=${sa.pairedDiff.maeDiffCI95 ? `[${sa.pairedDiff.maeDiffCI95[0]}, ${sa.pairedDiff.maeDiffCI95[1]}]` : 'n/a'}, deltaDirAcc=${sa.pairedDiff.directionalAccuracyDiffPp}pp ci95=[${sa.pairedDiff.directionalAccuracyDiffCI95[0]}, ${sa.pairedDiff.directionalAccuracyDiffCI95[1]}]pp`
        ]
      : [
          `# Sentiment Ablation: available=false, matchedSamples=${sa.matchedSamples}, matchedDates=${sa.matchedDates}, matchedAssets=${sa.matchedAssetsCount}, reason="${sa.reason ?? 'insufficient overlap'}"`
        ]
    : [];

  return [
    ...metadataLines,
    ...summaryLines,
    ...ablationLines,
    headers.join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(','))
  ].join('\n');
}
