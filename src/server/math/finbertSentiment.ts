/**
 * Multilingual & English Transformer Sentiment Scorer (Item 2)
 *
 * - English (`en`): `Xenova/finbert` (ONNX ProsusAI/finbert), fallback `'lexicon'`
 * - Supported Non-English (`ar, de, es, fr, ja, zh, id, hi, it, ms, pt`):
 *   `Xenova/distilbert-base-multilingual-cased-sentiments-student` (ONNX multilingual 3-class sentiment),
 *   fallback `'multilingual-lexicon'`
 * - Unsupported languages (e.g. `ko`, `ru`, `nl`, `sv`, `no`, `da`, `fi`, `und`, etc.):
 *   marked explicitly as `sentimentSource: 'unsupported_language'` (`modelId: 'unsupported'`, `modelVersion: 'n/a'`)
 *   and excluded from daily sentiment aggregates.
 *
 * Non-English text is NEVER passed to the English FinBERT model.
 */

import crypto from 'node:crypto';
import { SentimentSource } from '../../types';
import { detectTextLanguage } from './languageDetection';

const POSITIVE_MARKERS = [
  'surge', 'jump', 'gain', 'beat', 'record', 'profit', 'outperform', 'upgrade',
  'growth', 'bullish', 'strong', 'expansion', 'dividend', 'rally', 'breakthrough',
  'revenue rise', 'contract win', 'strategic partnership', 'upside', 'all-time high'
];

const NEGATIVE_MARKERS = [
  'slump', 'drop', 'fall', 'plunge', 'miss', 'loss', 'downgrade', 'lawsuit',
  'investigation', 'bearish', 'weak', 'recession', 'headwind', 'curb', 'decline',
  'margin pressure', 'debt crisis', 'default', 'sell-off', 'regulatory scrutiny'
];

export interface HeadlineInput {
  headline: string;
  publisher: string;
  summary?: string;
}

export interface ScoredSentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // netScore = p_pos - p_neg in [-1, 1]
  probabilities: {
    positive: number;
    neutral: number;
    negative: number;
  };
  confidence: number;
  sentimentSource: SentimentSource;
  language: string;
  modelId: string;
  modelVersion: string;
}

export type FinbertRawOutputItem =
  | Array<{ label: string; score: number }>
  | { label: string; score: number };

export type FinbertPipelineFn = (
  texts: string | string[],
  options?: Record<string, unknown>
) => Promise<FinbertRawOutputItem | FinbertRawOutputItem[]>;

export const FINBERT_MODEL_ID = 'Xenova/finbert';
export const FINBERT_MODEL_VERSION = 'onnx-prosusai-finbert-v1';

export const MULTILINGUAL_MODEL_ID = 'Xenova/distilbert-base-multilingual-cased-sentiments-student';
export const MULTILINGUAL_MODEL_VERSION = 'onnx-lxyuan-mbert-v1';

export const LEXICON_FALLBACK_MODEL_ID = 'keyword-lexicon-fallback';
export const LEXICON_FALLBACK_MODEL_VERSION = 'v1';

export const MULTILINGUAL_LEXICON_MODEL_ID = 'multilingual-lexicon-v1';
export const MULTILINGUAL_LEXICON_MODEL_VERSION = 'v1';

export const UNSUPPORTED_LANGUAGE_MODEL_ID = 'unsupported';
export const UNSUPPORTED_LANGUAGE_MODEL_VERSION = 'n/a';

/**
 * Languages supported by `lxyuan/distilbert-base-multilingual-cased-sentiments-student`
 * (excluding `en`, which routes to ProsusAI/finbert).
 */
export const SUPPORTED_MULTILINGUAL_LANGUAGES = new Set([
  'ar',
  'de',
  'es',
  'fr',
  'ja',
  'zh',
  'id',
  'hi',
  'it',
  'ms',
  'pt'
]);

const DEFAULT_LOAD_TIMEOUT_MS = Number(process.env.FINBERT_LOAD_TIMEOUT_MS || 20000);
const DEFAULT_INFERENCE_TIMEOUT_MS = Number(process.env.FINBERT_INFER_TIMEOUT_MS || 10000);
const MAX_CACHE_ENTRIES = 5000;

const MULTILINGUAL_POSITIVE_MARKERS: Record<string, string[]> = {
  de: ['steigert', 'steigt', 'rekord', 'gewinn', 'wachstum', 'übertrifft', 'stark', 'prognose angehoben', 'dividende', 'kaufrating', 'erholung', 'plus', 'gewinnsprung'],
  fr: ['hausse', 'croissance', 'bénéfice', 'record', 'progresse', 'surpasse', 'solide', 'dividende', 'relève', 'amélioration', 'acquisition stratégique'],
  es: ['sube', 'crecimiento', 'beneficio', 'récord', 'supera', 'fuerte', 'dividendo', 'mejora', 'alza', 'expansión', 'ganancia'],
  pt: ['alta', 'lucro', 'crescimento', 'recorde', 'supera', 'forte', 'dividendo', 'expansão', 'avança'],
  it: ['cresce', 'utile', 'utili', 'record', 'ricavi', 'dividendo', 'rialzo', 'migliora', 'solido', 'espansione'],
  id: ['naik', 'laba', 'pertumbuhan', 'rekor', 'kuat', 'dividen', 'melonjak', 'menguat'],
  ms: ['naik', 'untung', 'pertumbuhan', 'rekod', 'kukuh', 'dividen', 'melonjak'],
  ja: ['増益', '上方修正', '最高益', '成長', '上昇', '増配', '好調', '黒字', '急騰', '買い'],
  zh: ['增长', '上涨', '创纪录', '盈利', '大涨', '突破', '分红', '利好', '买入', '上调'],
  hi: ['मुनाफा', 'बढ़त', 'रिकॉर्ड', 'तेजी', 'मजबूत', 'लाभांश', 'विकास', 'उछाल'],
  ar: ['نمو', 'أرباح', 'ارتفاع', 'قياسي', 'توزيعات', 'قوي']
};

const MULTILINGUAL_NEGATIVE_MARKERS: Record<string, string[]> = {
  de: ['fällt', 'verlust', 'einbruch', 'rückgang', 'schwach', 'warnung', 'senkt', 'untersuchung', 'klage', 'schulden', 'krise', 'minus', 'stürzt'],
  fr: ['baisse', 'chute', 'perte', 'recul', 'faible', 'avertissement', 'enquête', 'dette', 'crise', 'dégradation', 'plonge'],
  es: ['cae', 'caída', 'pérdida', 'pérdidas', 'débil', 'advertencia', 'recorte', 'demanda', 'deuda', 'crisis', 'desplome'],
  pt: ['queda', 'prejuízo', 'recuo', 'fraco', 'crise', 'dívida', 'investigação', 'desaba'],
  it: ['cala', 'perdita', 'ribasso', 'debole', 'crollo', 'indagine', 'debito', 'crisi'],
  id: ['turun', 'rugi', 'anjlok', 'lemah', 'utang', 'penurunan', 'koreksi'],
  ms: ['turun', 'rugi', 'merosot', 'lemah', 'hutang', 'penurunan'],
  ja: ['減益', '下方修正', '赤字', '下落', '急落', '悪化', '減配', '売り', '訴訟'],
  zh: ['下跌', '亏损', '暴跌', '下滑', '疲软', '下调', '违约', '利空', '卖出', '衰退'],
  hi: ['गिरावट', 'नुकसान', 'घाटा', 'कमजोर', 'मंदी', 'संकट', 'दबाव'],
  ar: ['انخفاض', 'خسارة', 'تراجع', 'أزمة', 'ضعيف', 'هبوط']
};

export function analyzeMultilingualLexiconSentiment(
  headline: string,
  summary = '',
  language = 'und'
): ScoredSentimentResult {
  const combined = `${headline} ${summary}`.toLowerCase();
  const posList = MULTILINGUAL_POSITIVE_MARKERS[language] || [];
  const negList = MULTILINGUAL_NEGATIVE_MARKERS[language] || [];

  let posScore = 0;
  let negScore = 0;
  for (const term of posList) {
    if (combined.includes(term.toLowerCase())) posScore += 1.5;
  }
  for (const term of negList) {
    if (combined.includes(term.toLowerCase())) negScore += 1.5;
  }

  const zPos = Math.exp(posScore);
  const zNeu = Math.exp(0.85);
  const zNeg = Math.exp(negScore);
  const zTotal = zPos + zNeu + zNeg;

  const probPos = Number((zPos / zTotal).toFixed(3));
  const probNeu = Number((zNeu / zTotal).toFixed(3));
  const probNeg = Number((zNeg / zTotal).toFixed(3));

  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  let confidence = probNeu;
  if (probPos > probNeu && probPos > probNeg) {
    sentiment = 'positive';
    confidence = probPos;
  } else if (probNeg > probNeu && probNeg > probPos) {
    sentiment = 'negative';
    confidence = probNeg;
  }

  const net = Number(Math.max(-1, Math.min(1, probPos - probNeg)).toFixed(3));
  return {
    sentiment,
    sentimentScore: net,
    probabilities: { positive: probPos, neutral: probNeu, negative: probNeg },
    confidence,
    sentimentSource: 'multilingual-lexicon',
    language,
    modelId: MULTILINGUAL_LEXICON_MODEL_ID,
    modelVersion: MULTILINGUAL_LEXICON_MODEL_VERSION
  };
}

/**
 * Deterministic keyword financial-sentiment lexicon scorer (fallback & synthetic baselines)
 */
export function analyzeKeywordSentiment(headline: string, summary = ''): {
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  probabilities: { positive: number; neutral: number; negative: number };
  confidence: number;
} {
  const text = `${headline} ${summary}`.toLowerCase();

  let posScore = 0;
  let negScore = 0;

  for (const word of POSITIVE_MARKERS) {
    if (text.includes(word)) posScore += 1.5;
  }
  for (const word of NEGATIVE_MARKERS) {
    if (text.includes(word)) negScore += 1.5;
  }

  const zPos = Math.exp(posScore);
  const zNeu = Math.exp(0.85);
  const zNeg = Math.exp(negScore);
  const zTotal = zPos + zNeu + zNeg;

  const probPos = Number((zPos / zTotal).toFixed(3));
  const probNeu = Number((zNeu / zTotal).toFixed(3));
  const probNeg = Number((zNeg / zTotal).toFixed(3));

  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  let confidence = probNeu;

  if (probPos > probNeu && probPos > probNeg) {
    sentiment = 'positive';
    confidence = probPos;
  } else if (probNeg > probNeu && probNeg > probPos) {
    sentiment = 'negative';
    confidence = probNeg;
  }

  const rawNet = Math.max(-1, Math.min(1, probPos - probNeg));
  const sentimentScore = Number(rawNet.toFixed(3));

  return {
    sentiment,
    sentimentScore,
    probabilities: {
      positive: probPos,
      neutral: probNeu,
      negative: probNeg
    },
    confidence
  };
}

export function hashHeadlineKey(headline: string, publisher: string): string {
  const normalized = `${(headline || '').trim()}\0${(publisher || '').trim()}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function normalizeLabelScores(raw: FinbertRawOutputItem): {
  positive: number;
  neutral: number;
  negative: number;
} {
  const items = Array.isArray(raw) ? raw : [raw];
  let pos = 0;
  let neu = 0;
  let neg = 0;

  for (const item of items) {
    if (!item || typeof item.label !== 'string' || !Number.isFinite(item.score)) continue;
    const lbl = item.label.trim().toLowerCase();
    const s = Math.max(0, item.score);
    if (lbl.includes('pos')) pos += s;
    else if (lbl.includes('neg')) neg += s;
    else if (lbl.includes('neu')) neu += s;
  }

  const sum = pos + neu + neg;
  if (sum <= 0) {
    return { positive: 0.333, neutral: 0.334, negative: 0.333 };
  }

  if (items.length === 1 && sum < 0.999) {
    const rem = Math.max(0, 1 - sum);
    if (pos > 0) {
      neu += rem * 0.75;
      neg += rem * 0.25;
    } else if (neg > 0) {
      neu += rem * 0.75;
      pos += rem * 0.25;
    } else {
      pos += rem * 0.5;
      neg += rem * 0.5;
    }
  }

  const total = pos + neu + neg || 1;
  const pPos = Number((pos / total).toFixed(4));
  const pNeg = Number((neg / total).toFixed(4));
  const pNeu = Number(Math.max(0, 1 - pPos - pNeg).toFixed(4));

  return {
    positive: Math.max(0, Math.min(1, pPos)),
    neutral: Math.max(0, Math.min(1, pNeu)),
    negative: Math.max(0, Math.min(1, pNeg))
  };
}

function buildTransformerResult(
  probs: { positive: number; neutral: number; negative: number },
  language: string,
  sentimentSource: 'finbert' | 'multilingual-transformer',
  modelId: string,
  modelVersion: string
): ScoredSentimentResult {
  const { positive, neutral, negative } = probs;
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  let confidence = neutral;
  if (positive >= neutral && positive >= negative) {
    sentiment = 'positive';
    confidence = positive;
  } else if (negative >= neutral && negative >= positive) {
    sentiment = 'negative';
    confidence = negative;
  }

  const net = Math.max(-1, Math.min(1, positive - negative));
  return {
    sentiment,
    sentimentScore: Number(net.toFixed(4)),
    probabilities: probs,
    confidence: Number(confidence.toFixed(4)),
    sentimentSource,
    language,
    modelId,
    modelVersion
  };
}

function buildLexiconFallbackResult(headline: string, summary = '', language = 'en'): ScoredSentimentResult {
  const lex = analyzeKeywordSentiment(headline, summary);
  return {
    sentiment: lex.sentiment,
    sentimentScore: lex.sentimentScore,
    probabilities: lex.probabilities,
    confidence: lex.confidence,
    sentimentSource: 'lexicon',
    language,
    modelId: LEXICON_FALLBACK_MODEL_ID,
    modelVersion: LEXICON_FALLBACK_MODEL_VERSION
  };
}

function buildUnsupportedLanguageResult(language: string): ScoredSentimentResult {
  return {
    sentiment: 'neutral',
    sentimentScore: 0,
    probabilities: { positive: 0, neutral: 1, negative: 0 },
    confidence: 0,
    sentimentSource: 'unsupported_language',
    language: language || 'und',
    modelId: UNSUPPORTED_LANGUAGE_MODEL_ID,
    modelVersion: UNSUPPORTED_LANGUAGE_MODEL_VERSION
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// Module state for lazy singletons + per-headline cache + test overrides
const HEADLINE_CACHE = new Map<string, ScoredSentimentResult>();
let cacheHits = 0;
let cacheMisses = 0;

let pipelinePromise: Promise<FinbertPipelineFn> | null = null;
let overrideLoader: (() => Promise<FinbertPipelineFn>) | null = null;
let lastLoadFailureAt = 0;

let multiPipelinePromise: Promise<FinbertPipelineFn> | null = null;
let multiOverrideLoader: (() => Promise<FinbertPipelineFn>) | null = null;
let multiLastLoadFailureAt = 0;

const RETRY_LOAD_COOLDOWN_MS = 60 * 1000;

export function setFinbertPipelineOverride(loader: (() => Promise<FinbertPipelineFn>) | null): void {
  overrideLoader = loader;
  pipelinePromise = null;
  lastLoadFailureAt = 0;
}

export function setMultilingualPipelineOverride(loader: (() => Promise<FinbertPipelineFn>) | null): void {
  multiOverrideLoader = loader;
  multiPipelinePromise = null;
  multiLastLoadFailureAt = 0;
}

export function resetFinbertState(): void {
  HEADLINE_CACHE.clear();
  cacheHits = 0;
  cacheMisses = 0;
  pipelinePromise = null;
  overrideLoader = null;
  lastLoadFailureAt = 0;
  multiPipelinePromise = null;
  multiOverrideLoader = null;
  multiLastLoadFailureAt = 0;
}

export function getFinbertCacheStats() {
  return {
    size: HEADLINE_CACHE.size,
    hits: cacheHits,
    misses: cacheMisses
  };
}

function setCacheEntry(key: string, value: ScoredSentimentResult): void {
  if (HEADLINE_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = HEADLINE_CACHE.keys().next().value;
    if (oldestKey) HEADLINE_CACHE.delete(oldestKey);
  }
  HEADLINE_CACHE.set(key, value);
}

async function loadFinbertPipeline(loadTimeoutMs: number): Promise<FinbertPipelineFn> {
  if (overrideLoader) {
    if (!pipelinePromise) {
      pipelinePromise = withTimeout(overrideLoader(), loadTimeoutMs, 'FinBERT pipeline override load');
    }
    try {
      return await pipelinePromise;
    } catch (err) {
      pipelinePromise = null;
      throw err;
    }
  }

  if (process.env.DISABLE_FINBERT === 'true') {
    throw new Error('FinBERT disabled via DISABLE_FINBERT=true');
  }

  if (!pipelinePromise) {
    if (lastLoadFailureAt > 0 && Date.now() - lastLoadFailureAt < RETRY_LOAD_COOLDOWN_MS) {
      throw new Error('FinBERT load in cooldown after previous failure');
    }
    pipelinePromise = withTimeout(
      (async () => {
        const { pipeline, env } = await import('@xenova/transformers');
        if (env) {
          env.allowLocalModels = true;
        }
        const clf = await pipeline('text-classification', FINBERT_MODEL_ID, {
          quantized: true
        });
        return clf as unknown as FinbertPipelineFn;
      })(),
      loadTimeoutMs,
      'FinBERT model load'
    );
  }

  try {
    return await pipelinePromise;
  } catch (err) {
    pipelinePromise = null;
    lastLoadFailureAt = Date.now();
    throw err;
  }
}

async function loadMultilingualPipeline(loadTimeoutMs: number): Promise<FinbertPipelineFn> {
  if (multiOverrideLoader) {
    if (!multiPipelinePromise) {
      multiPipelinePromise = withTimeout(
        multiOverrideLoader(),
        loadTimeoutMs,
        'Multilingual sentiment pipeline override load'
      );
    }
    try {
      return await multiPipelinePromise;
    } catch (err) {
      multiPipelinePromise = null;
      throw err;
    }
  }

  if (process.env.DISABLE_MULTILINGUAL_SENTIMENT === 'true' || process.env.DISABLE_FINBERT === 'true') {
    throw new Error('Multilingual transformer disabled via env');
  }

  if (!multiPipelinePromise) {
    if (multiLastLoadFailureAt > 0 && Date.now() - multiLastLoadFailureAt < RETRY_LOAD_COOLDOWN_MS) {
      throw new Error('Multilingual transformer load in cooldown after previous failure');
    }
    multiPipelinePromise = withTimeout(
      (async () => {
        const { pipeline, env } = await import('@xenova/transformers');
        if (env) {
          env.allowLocalModels = true;
        }
        const clf = await pipeline('text-classification', MULTILINGUAL_MODEL_ID, {
          quantized: true
        });
        return clf as unknown as FinbertPipelineFn;
      })(),
      loadTimeoutMs,
      'Multilingual transformer model load'
    );
  }

  try {
    return await multiPipelinePromise;
  } catch (err) {
    multiPipelinePromise = null;
    multiLastLoadFailureAt = Date.now();
    throw err;
  }
}

function normalizeBatchOutput(rawOutputs: FinbertRawOutputItem | FinbertRawOutputItem[], expectedLen: number): FinbertRawOutputItem[] {
  if (Array.isArray(rawOutputs)) {
    if (
      expectedLen === 1 &&
      rawOutputs.length > 0 &&
      !Array.isArray(rawOutputs[0]) &&
      typeof (rawOutputs[0] as { label?: string }).label === 'string'
    ) {
      return [rawOutputs as Array<{ label: string; score: number }>];
    }
    return rawOutputs as FinbertRawOutputItem[];
  }
  return [rawOutputs];
}

/**
 * Scores a batch of headlines asynchronously:
 * - English (`en`) -> FinBERT (`Xenova/finbert`), falling back to `lexicon`
 * - Supported Non-English -> Multilingual Transformer (`Xenova/distilbert-base-multilingual-cased-sentiments-student`),
 *   falling back to `multilingual-lexicon`
 * - Unsupported languages -> `unsupported_language` (excluded from daily sentiment aggregates)
 */
export async function scoreHeadlinesWithFinbert(
  items: HeadlineInput[],
  options?: {
    loadTimeoutMs?: number;
    inferenceTimeoutMs?: number;
    batchSize?: number;
    forceLanguage?: string;
  }
): Promise<ScoredSentimentResult[]> {
  if (!items || items.length === 0) return [];

  const loadTimeoutMs = options?.loadTimeoutMs ?? DEFAULT_LOAD_TIMEOUT_MS;
  const inferenceTimeoutMs = options?.inferenceTimeoutMs ?? DEFAULT_INFERENCE_TIMEOUT_MS;
  const batchSize = Math.max(1, Math.min(32, options?.batchSize ?? 16));

  const results: Array<ScoredSentimentResult | undefined> = new Array(items.length);
  const detectedLangs = new Array<string>(items.length);
  const keyByIdx = new Array<string>(items.length);

  const uncachedEnglishIndices: number[] = [];
  const uncachedMultilingualIndices: number[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const lang = options?.forceLanguage
      ? options.forceLanguage.trim().toLowerCase()
      : detectTextLanguage(`${item.headline} ${item.summary || ''}`).language;
    detectedLangs[i] = lang;
    const key = `${hashHeadlineKey(item.headline, item.publisher)}:${lang}`;
    keyByIdx[i] = key;

    const cached = HEADLINE_CACHE.get(key);
    if (cached) {
      cacheHits++;
      results[i] = cached;
      continue;
    }

    cacheMisses++;

    if (lang === 'en') {
      uncachedEnglishIndices.push(i);
    } else if (SUPPORTED_MULTILINGUAL_LANGUAGES.has(lang)) {
      uncachedMultilingualIndices.push(i);
    } else {
      // Unsupported language: never pass to FinBERT or fabricate score; mark explicitly & cache
      const unsupportedRes = buildUnsupportedLanguageResult(lang);
      results[i] = unsupportedRes;
      setCacheEntry(key, unsupportedRes);
    }
  }

  // 1. Score English headlines via FinBERT (never receives non-English text)
  if (uncachedEnglishIndices.length > 0) {
    try {
      const clf = await loadFinbertPipeline(loadTimeoutMs);
      for (let start = 0; start < uncachedEnglishIndices.length; start += batchSize) {
        const chunkIndices = uncachedEnglishIndices.slice(start, start + batchSize);
        const texts = chunkIndices.map((idx) => items[idx].headline.trim().slice(0, 512));

        const rawOutputs = await withTimeout(
          clf(texts, { topk: null }),
          inferenceTimeoutMs,
          'FinBERT batch inference'
        );
        const normalizedBatch = normalizeBatchOutput(rawOutputs, texts.length);

        for (let j = 0; j < chunkIndices.length; j++) {
          const origIdx = chunkIndices[j];
          const rawOut = normalizedBatch[j];
          if (!rawOut) {
            results[origIdx] = buildLexiconFallbackResult(
              items[origIdx].headline,
              items[origIdx].summary,
              'en'
            );
            continue;
          }
          const probs = normalizeLabelScores(rawOut);
          const scored = buildTransformerResult(
            probs,
            'en',
            'finbert',
            FINBERT_MODEL_ID,
            FINBERT_MODEL_VERSION
          );
          results[origIdx] = scored;
          setCacheEntry(keyByIdx[origIdx], scored);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[Sentiment] FinBERT unavailable (${message}); falling back to keyword lexicon.`);
    }
  }

  // 2. Score supported non-English headlines via Multilingual Transformer
  if (uncachedMultilingualIndices.length > 0) {
    try {
      const multiClf = await loadMultilingualPipeline(loadTimeoutMs);
      for (let start = 0; start < uncachedMultilingualIndices.length; start += batchSize) {
        const chunkIndices = uncachedMultilingualIndices.slice(start, start + batchSize);
        const texts = chunkIndices.map((idx) => items[idx].headline.trim().slice(0, 512));

        const rawOutputs = await withTimeout(
          multiClf(texts, { topk: null }),
          inferenceTimeoutMs,
          'Multilingual transformer batch inference'
        );
        const normalizedBatch = normalizeBatchOutput(rawOutputs, texts.length);

        for (let j = 0; j < chunkIndices.length; j++) {
          const origIdx = chunkIndices[j];
          const rawOut = normalizedBatch[j];
          const lang = detectedLangs[origIdx];
          if (!rawOut) {
            results[origIdx] = analyzeMultilingualLexiconSentiment(
              items[origIdx].headline,
              items[origIdx].summary || '',
              lang
            );
            continue;
          }
          const probs = normalizeLabelScores(rawOut);
          const scored = buildTransformerResult(
            probs,
            lang,
            'multilingual-transformer',
            MULTILINGUAL_MODEL_ID,
            MULTILINGUAL_MODEL_VERSION
          );
          results[origIdx] = scored;
          setCacheEntry(keyByIdx[origIdx], scored);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[Sentiment] Multilingual transformer unavailable (${message}); falling back to multilingual lexicon.`
      );
    }
  }

  // 3. Fill any remaining un-scored slots with the appropriate labeled fallback
  for (let i = 0; i < items.length; i++) {
    if (!results[i]) {
      const lang = detectedLangs[i] || 'en';
      if (lang === 'en') {
        results[i] = buildLexiconFallbackResult(items[i].headline, items[i].summary, 'en');
      } else if (SUPPORTED_MULTILINGUAL_LANGUAGES.has(lang)) {
        results[i] = analyzeMultilingualLexiconSentiment(
          items[i].headline,
          items[i].summary || '',
          lang
        );
      } else {
        results[i] = buildUnsupportedLanguageResult(lang);
      }
    }
  }

  return results as ScoredSentimentResult[];
}
