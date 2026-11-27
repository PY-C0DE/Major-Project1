import { ModelAuditResponse } from '../types';

function escapeCsvCell(val: string | number | boolean | undefined | null): string {
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
    'country',
    'exchange',
    'region',
    'currency',
    'dataSource',
    'dataProvider',
    'fallbackFrom',
    'testWindowStart',
    'testWindowEnd',
    'samples',
    'shortTestWindow',
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
    row.country ?? '',
    row.exchange ?? '',
    row.region ?? '',
    row.currency ?? '',
    row.dataSource,
    row.dataProvider ?? audit.dataProvider ?? '',
    row.fallbackFrom ?? '',
    row.testWindowStart,
    row.testWindowEnd,
    row.samples,
    row.shortTestWindow ? 'true' : 'false',
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
    ? skipped
        .map((s) => {
          const metaParts = [s.country, s.exchange].filter(Boolean).join('/');
          return `${s.ticker}(${s.reason}${s.barsCount !== undefined ? `:${s.barsCount}` : ''}${metaParts ? `,${metaParts}` : ''})`;
        })
        .join('; ')
    : 'none';

  const pt = audit.providerTelemetry;
  const cv = audit.calendarValidation;

  const metadataLines = [
    `# Reproducible Audit Metadata (${scopeLabel})`,
    `# evaluatedAt=${audit.evaluatedAt ?? 'n/a'}, universeMode=${audit.universeMode ?? 'catalog'}, gitCommit=${audit.gitCommit ?? 'null'}, dataSource=${audit.dataSource}, dataProvider=${audit.dataProvider ?? 'n/a'}, fallbackFrom=${audit.fallbackFrom ?? 'none'}, currency=${audit.currency ?? 'n/a'}, evaluatedAssetsCount=${audit.evaluatedAssetsCount}, skippedCount=${skipped.length}`,
    ...(audit.sampling
      ? [
          `# sampling: method=${audit.sampling.method}, perExchange=${audit.sampling.perExchange}, seed=${audit.sampling.seed}, totalMasterRows=${audit.sampling.totalMasterRows}, activeEquitiesCount=${audit.sampling.activeEquitiesCount}, delistedEquitiesCount=${audit.sampling.delistedEquitiesCount}, sampledActiveRequested=${audit.sampling.sampledActiveRequested}, exchangesCovered=${audit.sampling.exchangesCovered}`
        ]
      : []),
    ...(pt
      ? [
          `# providerTelemetry: twelveDataStatus=${pt.twelveDataStatus === 'not_configured' ? 'not configured' : 'configured'}, configuredProvider=${pt.configuredProvider}, providerCounts=${JSON.stringify(pt.providerCounts)}, fallbackTotal=${pt.fallbackTotal}, fallbackByProvider=${JSON.stringify(pt.fallbackByProvider)}, fallbackByReason=${JSON.stringify(pt.fallbackByReason)}, rateLimit429Count=${pt.rateLimit429Count}`
        ]
      : []),
    ...(audit.providerWarning ? [`# providerWarning: ${audit.providerWarning}`] : []),
    ...(audit.shortTestWindowCount !== undefined
      ? [
          `# shortTestWindow: threshold=${audit.minTestPredictionsThreshold ?? 120}, shortWindowAssetsCount=${audit.shortTestWindowCount}`
        ]
      : []),
    ...(cv
      ? [
          `# calendarValidation: checkedExchanges=${cv.checkedExchangesCount}, checkedAssets=${cv.checkedAssetsCount}, checkedTestDates=${cv.checkedTestDatesCount}, mismatchCount=${cv.mismatchCount}`
        ]
      : []),
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
          `# Pooled (assumes independence): dirAcc=${ds.pooledDirectionalAccuracyPct}%, alwaysUp=${ds.pooledAlwaysUpAccuracyPct}%, wilson95CI=[${ds.wilson95CI[0]}%, ${ds.wilson95CI[1]}%]${ds.binomialPValueVsAlwaysUp != null ? `, oneSidedBinomialP=${ds.binomialPValueVsAlwaysUp}` : ''}, n=${ds.totalTestPredictions}`,
          `# Date-Clustered Bootstrap (${ds.bootstrapResamples ?? 2000} resamples, seed=${ds.bootstrapSeed ?? 20261114}): edgeVsAlwaysUp=${ds.directionalEdgeVsAlwaysUpPct ?? 'n/a'}pp, ci95=[${ds.directionalEdgeVsAlwaysUp95CI?.[0] ?? 'n/a'}, ${ds.directionalEdgeVsAlwaysUp95CI?.[1] ?? 'n/a'}]pp, probEdgePositive=${ds.bootstrapProbEdgePositive ?? 'n/a'}`,
          `# Per-Asset Sign Test (vs Always-Up, p0=0.5): wins=${ds.signTestWins ?? 0}, losses=${ds.signTestLosses ?? 0}, ties=${ds.signTestTies ?? 0}, twoSidedPValue=${ds.signTestPValue ?? 'n/a'}`,
          `# Citation Guidance: The date-bootstrap interval is the one to cite.`
        ]
      : [])
  ];

  const breakdownLines: string[] = [];
  if (audit.regionBreakdowns) {
    for (const [region, b] of Object.entries(audit.regionBreakdowns)) {
      breakdownLines.push(
        `# Region Breakdown [${region}]: assets=${b.assetsCount}, predictions=${b.totalTestPredictions ?? b.directionalStats.totalTestPredictions}, priceAcc=${b.priceAccuracy.toFixed(2)}% vs naive=${b.naivePriceAccuracy.toFixed(2)}%, maeSkill=${b.maeSkillVsNaive ?? 'n/a'}, dirAcc=${b.directionalAccuracy}% vs alwaysUp=${b.alwaysUpAccuracy}%, coverage=${b.conformalCoverage}%`
      );
    }
  }
  if (audit.countryBreakdowns) {
    for (const [country, b] of Object.entries(audit.countryBreakdowns)) {
      const maeStr = b.mae != null ? b.mae.toFixed(4) : 'n/a(mixed)';
      const nMaeStr = b.naiveMae != null ? b.naiveMae.toFixed(4) : 'n/a(mixed)';
      breakdownLines.push(
        `# Country Breakdown [${country}]: assets=${b.assetsCount}, currency=${b.currency}, priceAcc=${b.priceAccuracy.toFixed(2)}% vs naive=${b.naivePriceAccuracy.toFixed(2)}%, MAE=${maeStr} vs naiveMAE=${nMaeStr}, maeSkill=${b.maeSkillVsNaive ?? 'n/a'}, coverage=${b.conformalCoverage}%, dirAcc=${b.directionalAccuracy}%`
      );
    }
  }
  if (audit.insufficientSampleCountries && audit.insufficientSampleCountries.length > 0) {
    breakdownLines.push(
      `# Insufficient Sample Countries (n<${audit.minBreakdownAssets ?? 5}): ${audit.insufficientSampleCountries.map((c) => `${c.key}(assets=${c.assetsCount})`).join(', ')}`
    );
  }
  if (audit.exchangeBreakdowns) {
    for (const [exchange, b] of Object.entries(audit.exchangeBreakdowns)) {
      const maeStr = b.mae != null ? b.mae.toFixed(4) : 'n/a(mixed)';
      const nMaeStr = b.naiveMae != null ? b.naiveMae.toFixed(4) : 'n/a(mixed)';
      breakdownLines.push(
        `# Exchange Breakdown [${exchange}]: assets=${b.assetsCount}, currency=${b.currency}, priceAcc=${b.priceAccuracy.toFixed(2)}% vs naive=${b.naivePriceAccuracy.toFixed(2)}%, MAE=${maeStr} vs naiveMAE=${nMaeStr}, maeSkill=${b.maeSkillVsNaive ?? 'n/a'}, coverage=${b.conformalCoverage}%, dirAcc=${b.directionalAccuracy}%`
      );
    }
  }
  if (audit.insufficientSampleExchanges && audit.insufficientSampleExchanges.length > 0) {
    breakdownLines.push(
      `# Insufficient Sample Exchanges (n<${audit.minBreakdownAssets ?? 5}): ${audit.insufficientSampleExchanges.map((x) => `${x.key}(assets=${x.assetsCount})`).join(', ')}`
    );
  }
  if (audit.perExchangeCounts) {
    for (const row of audit.perExchangeCounts) {
      breakdownLines.push(
        `# Exchange Sampling [${row.exchange}|${row.country}]: availableActive=${row.availableActive}, requested=${row.requested}, evaluated=${row.evaluated}, skipped=${row.skipped}, delisted=${row.delistedCount}, strategy=${row.samplingStrategy}`
      );
    }
  }
  if (audit.delistedStratum) {
    breakdownLines.push(
      `# Delisted Stratum: requested=${audit.delistedStratum.requestedCount}, evaluatedStopped=${audit.delistedStratum.evaluatedCount}, skipped=${audit.delistedStratum.skippedCount}, skippedByReason=${JSON.stringify(audit.delistedStratum.skippedByReason)}`
    );
  }

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
    ...breakdownLines,
    ...ablationLines,
    headers.join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(','))
  ].join('\n');
}
