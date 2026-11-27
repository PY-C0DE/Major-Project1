/**
 * Honest Multilingual Sentiment & Language Detection Validation Script (Items 2 & 3)
 *
 * Evaluates:
 * 1. English FinBERT (`Xenova/finbert`) + Keyword Lexicon Fallback on:
 *    - `zeroshot/twitter-financial-news-sentiment` validation split (MIT licence)
 *    - `Kenpache/multilingual-financial-sentiment` `en` subset (Apache-2.0 licence)
 * 2. Multilingual Transformer (`Xenova/distilbert-base-multilingual-cased-sentiments-student`) +
 *    Multilingual Lexicon Fallback on `Kenpache/multilingual-financial-sentiment`
 *    (`ar`, `de`, `es`, `fr`, `ja`, `zh`)
 * 3. `franc-min` Language Detection accuracy & error rate across the held-out 7-language sample
 *
 * Outputs reproducible metrics to `docs/sentiment-validation.md`.
 * Never fabricates labels or claims accuracy for languages without open labelled data.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  analyzeKeywordSentiment,
  analyzeMultilingualLexiconSentiment,
  FINBERT_MODEL_ID,
  FINBERT_MODEL_VERSION,
  MULTILINGUAL_MODEL_ID,
  MULTILINGUAL_MODEL_VERSION,
  resetFinbertState,
  scoreHeadlinesWithFinbert
} from '../src/server/math/finbertSentiment';
import { detectTextLanguage } from '../src/server/math/languageDetection';

type Label = 'positive' | 'neutral' | 'negative';

interface SampleRow {
  text: string;
  label: Label;
  language: string;
  dataset: string;
}

const KENPACHE_CSV_URL =
  'https://huggingface.co/datasets/Kenpache/multilingual-financial-sentiment/resolve/main/all_languages_clean.csv';
const ZEROSHOT_VALID_URL =
  'https://huggingface.co/datasets/zeroshot/twitter-financial-news-sentiment/resolve/main/sent_valid.csv';

const CACHE_DIR = path.resolve(process.cwd(), '.cache/datasets');
const SAMPLES_PER_LANGUAGE = Number(process.env.SENTIMENT_VAL_SAMPLES || 120);
const RNG_SEED = 20261125;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicShuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parseCsvRecords(content: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && content[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || (row.length === 1 && row[0].length > 0)) {
        rows.push(row);
      }
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  const out: Array<Record<string, string>> = [];
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (cols.length < header.length) continue;
    const obj: Record<string, string> = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = cols[c] ?? '';
    }
    out.push(obj);
  }
  return out;
}

async function fetchCachedText(url: string, cacheFilename: string): Promise<string> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, cacheFilename);
  if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 1000) {
    return fs.readFileSync(cachePath, 'utf8');
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch dataset ${url}: HTTP ${res.status}`);
  }
  const text = await res.text();
  fs.writeFileSync(cachePath, text, 'utf8');
  return text;
}

function stratifiedSample(rows: SampleRow[], targetCount: number, seedOffset: number): SampleRow[] {
  const rng = mulberry32(RNG_SEED + seedOffset);
  const byClass: Record<Label, SampleRow[]> = {
    positive: [],
    neutral: [],
    negative: []
  };
  for (const r of rows) {
    byClass[r.label].push(r);
  }
  const perClass = Math.floor(targetCount / 3);
  const sampled: SampleRow[] = [
    ...deterministicShuffle(byClass.positive, rng).slice(0, perClass),
    ...deterministicShuffle(byClass.neutral, rng).slice(0, perClass),
    ...deterministicShuffle(byClass.negative, rng).slice(0, perClass)
  ];
  const remainder = targetCount - sampled.length;
  if (remainder > 0) {
    const pool = deterministicShuffle(
      [
        ...byClass.positive.slice(perClass),
        ...byClass.neutral.slice(perClass),
        ...byClass.negative.slice(perClass)
      ],
      rng
    );
    sampled.push(...pool.slice(0, remainder));
  }
  return sampled;
}

function computeClassificationMetrics(yTrue: Label[], yPred: Label[]): {
  n: number;
  accuracyPct: number;
  macroF1Pct: number;
  perClassF1: Record<Label, number>;
} {
  const classes: Label[] = ['positive', 'neutral', 'negative'];
  let correct = 0;
  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] === yPred[i]) correct++;
  }
  const accuracy = yTrue.length > 0 ? (correct / yTrue.length) * 100 : 0;

  const perClassF1: Record<Label, number> = { positive: 0, neutral: 0, negative: 0 };
  let f1Sum = 0;
  let presentClasses = 0;

  for (const cls of classes) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let support = 0;
    for (let i = 0; i < yTrue.length; i++) {
      if (yTrue[i] === cls) support++;
      if (yPred[i] === cls && yTrue[i] === cls) tp++;
      else if (yPred[i] === cls && yTrue[i] !== cls) fp++;
      else if (yPred[i] !== cls && yTrue[i] === cls) fn++;
    }
    if (support === 0) continue;
    presentClasses++;
    const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
    const rec = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;
    perClassF1[cls] = Number((f1 * 100).toFixed(2));
    f1Sum += f1 * 100;
  }

  return {
    n: yTrue.length,
    accuracyPct: Number(accuracy.toFixed(2)),
    macroF1Pct: Number((presentClasses > 0 ? f1Sum / presentClasses : 0).toFixed(2)),
    perClassF1
  };
}

async function main() {
  console.log('[ValidateSentiment] Fetching freely licensed financial sentiment datasets...');
  const [kenpacheRaw, zeroshotRaw] = await Promise.all([
    fetchCachedText(KENPACHE_CSV_URL, 'kenpache_multilingual_financial_sentiment.csv'),
    fetchCachedText(ZEROSHOT_VALID_URL, 'zeroshot_twitter_financial_valid.csv')
  ]);

  const kenpacheParsed = parseCsvRecords(kenpacheRaw);
  const zeroshotParsed = parseCsvRecords(zeroshotRaw);

  const byLang = new Map<string, SampleRow[]>();
  for (const row of kenpacheParsed) {
    const lang = (row.language || '').trim().toLowerCase();
    const label = (row.label || '').trim().toLowerCase() as Label;
    const text = (row.sentence || '').trim();
    if (!lang || !text || !['positive', 'neutral', 'negative'].includes(label)) continue;
    const list = byLang.get(lang) || [];
    list.push({
      text,
      label,
      language: lang,
      dataset: 'Kenpache/multilingual-financial-sentiment'
    });
    byLang.set(lang, list);
  }

  const zeroshotRows: SampleRow[] = [];
  for (const row of zeroshotParsed) {
    const rawLbl = (row.label || '').trim();
    const label: Label | null =
      rawLbl === '0' ? 'negative' : rawLbl === '1' ? 'positive' : rawLbl === '2' ? 'neutral' : null;
    const text = (row.text || '').trim();
    if (!text || !label) continue;
    zeroshotRows.push({
      text,
      label,
      language: 'en',
      dataset: 'zeroshot/twitter-financial-news-sentiment'
    });
  }

  const evaluatedLangs = ['en', 'de', 'fr', 'es', 'ja', 'zh', 'ar'];
  const sentimentRows: Array<{
    dataset: string;
    language: string;
    n: number;
    primaryModel: string;
    primaryAcc: number;
    primaryMacroF1: number;
    lexiconModel: string;
    lexiconAcc: number;
    lexiconMacroF1: number;
  }> = [];

  const langDetectRows: Array<{
    language: string;
    n: number;
    correct: number;
    francPrimaryUsed: number;
    errorRatePct: number;
    sampleMisclassified: string;
  }> = [];

  resetFinbertState();

  // 1. Evaluate Zeroshot Twitter Financial News Sentiment (EN, MIT)
  const zeroshotSample = stratifiedSample(zeroshotRows, SAMPLES_PER_LANGUAGE, 1);
  console.log(`[ValidateSentiment] Evaluating EN (zeroshot/twitter-financial-news-sentiment, n=${zeroshotSample.length})...`);
  const zsFinbertOut = await scoreHeadlinesWithFinbert(
    zeroshotSample.map((s) => ({ headline: s.text, publisher: 'ValidationDataset' })),
    { forceLanguage: 'en', batchSize: 16, loadTimeoutMs: 60000, inferenceTimeoutMs: 30000 }
  );
  const zsTrue = zeroshotSample.map((s) => s.label);
  const zsFinbertPred = zsFinbertOut.map((r) => r.sentiment);
  const zsLexPred = zeroshotSample.map((s) => analyzeKeywordSentiment(s.text).sentiment);

  const zsFinbertMetrics = computeClassificationMetrics(zsTrue, zsFinbertPred);
  const zsLexMetrics = computeClassificationMetrics(zsTrue, zsLexPred);
  sentimentRows.push({
    dataset: 'zeroshot/twitter-financial-news-sentiment (MIT)',
    language: 'en',
    n: zsFinbertMetrics.n,
    primaryModel: `${FINBERT_MODEL_ID} (${FINBERT_MODEL_VERSION})`,
    primaryAcc: zsFinbertMetrics.accuracyPct,
    primaryMacroF1: zsFinbertMetrics.macroF1Pct,
    lexiconModel: 'keyword-lexicon-fallback (v1)',
    lexiconAcc: zsLexMetrics.accuracyPct,
    lexiconMacroF1: zsLexMetrics.macroF1Pct
  });

  // 2. Evaluate all 7 languages from Kenpache/multilingual-financial-sentiment (Apache-2.0)
  for (let idx = 0; idx < evaluatedLangs.length; idx++) {
    const lang = evaluatedLangs[idx];
    const pool = byLang.get(lang) || [];
    const sample = stratifiedSample(pool, Math.min(SAMPLES_PER_LANGUAGE, pool.length), 10 + idx);
    console.log(`[ValidateSentiment] Evaluating ${lang.toUpperCase()} (Kenpache, n=${sample.length})...`);

    const primaryOut = await scoreHeadlinesWithFinbert(
      sample.map((s) => ({ headline: s.text, publisher: 'KenpacheValidation' })),
      { forceLanguage: lang, batchSize: 16, loadTimeoutMs: 60000, inferenceTimeoutMs: 30000 }
    );

    const yTrue = sample.map((s) => s.label);
    const yPrimary = primaryOut.map((r) => r.sentiment);
    const yLex = sample.map((s) =>
      lang === 'en'
        ? analyzeKeywordSentiment(s.text).sentiment
        : analyzeMultilingualLexiconSentiment(s.text, '', lang).sentiment
    );

    const primaryM = computeClassificationMetrics(yTrue, yPrimary);
    const lexM = computeClassificationMetrics(yTrue, yLex);

    sentimentRows.push({
      dataset: 'Kenpache/multilingual-financial-sentiment (Apache-2.0)',
      language: lang,
      n: primaryM.n,
      primaryModel:
        lang === 'en'
          ? `${FINBERT_MODEL_ID} (${FINBERT_MODEL_VERSION})`
          : `${MULTILINGUAL_MODEL_ID} (${MULTILINGUAL_MODEL_VERSION})`,
      primaryAcc: primaryM.accuracyPct,
      primaryMacroF1: primaryM.macroF1Pct,
      lexiconModel: lang === 'en' ? 'keyword-lexicon-fallback (v1)' : 'multilingual-lexicon-v1 (v1)',
      lexiconAcc: lexM.accuracyPct,
      lexiconMacroF1: lexM.macroF1Pct
    });

    // Language detection evaluation on the same held-out sample
    let detCorrect = 0;
    let francCount = 0;
    const mistakes: Record<string, number> = {};
    for (const row of sample) {
      const det = detectTextLanguage(row.text);
      if (det.detector === 'franc-min') francCount++;
      if (det.language === lang) {
        detCorrect++;
      } else {
        mistakes[det.language] = (mistakes[det.language] || 0) + 1;
      }
    }
    const topMistake = Object.entries(mistakes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([code, cnt]) => `${code}:${cnt}`)
      .join(', ');
    langDetectRows.push({
      language: lang,
      n: sample.length,
      correct: detCorrect,
      francPrimaryUsed: francCount,
      errorRatePct: Number((((sample.length - detCorrect) / sample.length) * 100).toFixed(2)),
      sampleMisclassified: topMistake || 'None'
    });
  }

  const totalLangN = langDetectRows.reduce((s, r) => s + r.n, 0);
  const totalLangCorrect = langDetectRows.reduce((s, r) => s + r.correct, 0);
  const overallLangErrorPct = Number((((totalLangN - totalLangCorrect) / totalLangN) * 100).toFixed(2));
  const totalFrancUsed = langDetectRows.reduce((s, r) => s + r.francPrimaryUsed, 0);

  const generatedAt = new Date().toISOString();
  const mdLines = [
    '# Multilingual Sentiment & Language Detection Validation Report',
    '',
    `Generated reproducibly by \`scripts/validateSentiment.ts\` (seed \`${RNG_SEED}\`, timestamp \`${generatedAt}\`).`,
    '',
    '## 1. Datasets & Licences',
    '',
    '1. **`Kenpache/multilingual-financial-sentiment`** — Licence: **Apache-2.0** (39,829 labelled financial news sentences across `ar`, `de`, `en`, `es`, `fr`, `ja`, `zh`).',
    '2. **`zeroshot/twitter-financial-news-sentiment`** (`validation` split) — Licence: **MIT** (2,388 labelled English financial news/social headlines).',
    '',
    '## 2. Sentiment Model vs. Lexicon Fallback (Accuracy & Macro-F1)',
    '',
    `- **English primary scorer**: \`${FINBERT_MODEL_ID}\` (\`${FINBERT_MODEL_VERSION}\`)`,
    `- **Non-English primary scorer**: \`${MULTILINGUAL_MODEL_ID}\` (\`${MULTILINGUAL_MODEL_VERSION}\`)`,
    '- **Fallbacks**: `keyword-lexicon-fallback` (`en`), `multilingual-lexicon-v1` (`ar, de, es, fr, ja, zh, id, hi, it, ms, pt`)',
    '',
    '| Language | Dataset (Licence) | n | Primary Transformer Model | Primary Acc (%) | Primary Macro-F1 (%) | Fallback Lexicon Acc (%) | Fallback Macro-F1 (%) |',
    '|---|---|---|---|---|---|---|---|',
    ...sentimentRows.map(
      (r) =>
        `| \`${r.language}\` | ${r.dataset} | ${r.n} | \`${r.primaryModel}\` | ${r.primaryAcc.toFixed(2)} | ${r.primaryMacroF1.toFixed(2)} | ${r.lexiconAcc.toFixed(2)} | ${r.lexiconMacroF1.toFixed(2)} |`
    ),
    '',
    '### Languages Without Open Labelled Financial Test Data',
    '',
    'The multilingual ONNX model (`Xenova/distilbert-base-multilingual-cased-sentiments-student`) supports 11 non-English languages (`ar, de, es, fr, ja, zh, hi, id, it, ms, pt`).',
    'However, **no freely licensed 3-class financial headline sentiment dataset was available in the benchmark sources above for `hi` (Hindi), `id` (Indonesian), `it` (Italian), `ms` (Malay), or `pt` (Portuguese)**. In accordance with strict scientific reporting, **no accuracy or macro-F1 numbers are claimed for those 5 languages**.',
    '',
    'Other market languages (e.g., `ko` Korean, `ru` Russian, `nl` Dutch, `sv` Swedish, `no` Norwegian, `da` Danish, `fi` Finnish) are **unsupported by the multilingual transformer** and are explicitly flagged `sentimentSource: "unsupported_language"` and excluded from daily sentiment aggregates.',
    '',
    '## 3. Language Detection Error Rate (`franc-min` + Script/Short-Text Fallback)',
    '',
    `Evaluated across **${totalLangN} held-out financial sentences** (${SAMPLES_PER_LANGUAGE} per language) from \`Kenpache/multilingual-financial-sentiment\`.`,
    `- **Overall Accuracy**: ${((totalLangCorrect / totalLangN) * 100).toFixed(2)}% (${totalLangCorrect}/${totalLangN})`,
    `- **Overall Error Rate**: **${overallLangErrorPct.toFixed(2)}%**`,
    `- **Primary \`franc-min\` invocation rate**: ${((totalFrancUsed / totalLangN) * 100).toFixed(2)}% (${totalFrancUsed}/${totalLangN})`,
    '',
    '| True Language | n | Correct | \`franc-min\` Primary Count | Error Rate (%) | Top Misclassifications |',
    '|---|---|---|---|---|---|',
    ...langDetectRows.map(
      (r) =>
        `| \`${r.language}\` | ${r.n} | ${r.correct} | ${r.francPrimaryUsed} | ${r.errorRatePct.toFixed(2)} | ${r.sampleMisclassified} |`
    ),
    ''
  ];

  const outDir = path.resolve(process.cwd(), 'docs');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'sentiment-validation.md');
  fs.writeFileSync(outPath, mdLines.join('\n'), 'utf8');
  console.log(`[ValidateSentiment] Wrote report to ${outPath}`);
}

main().catch((err) => {
  console.error('[ValidateSentiment] Failed:', err);
  process.exit(1);
});
