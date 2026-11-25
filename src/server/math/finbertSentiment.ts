/**
 * FinBERT Transformer Sentiment Scorer (with Keyword Lexicon Fallback)
 *
 * Uses @xenova/transformers (`Xenova/finbert`, ONNX-quantized ProsusAI/finbert)
 * lazily loaded in Node.js with:
 * - Per-headline SHA-256 caching keyed on (title + publisher)
 * - Asynchronous batched inference
 * - Graceful timeout / load-failure fallback to keyword financial lexicon
 * - Normalized { positive, neutral, negative } probabilities and netScore = p_pos - p_neg in [-1, 1]
 */

import crypto from 'node:crypto';
import { SentimentSource } from '../../types';
import { detectTextLanguage } from './languageDetection';

// Canonical Financial Sentiment Lexicon & Markers (used for fallback & synthetic baselines)
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
}

export type FinbertRawOutputItem =
  | Array<{ label: string; score: number }>
  | { label: string; score: number };

export type FinbertPipelineFn = (
  texts: string | string[],
  options?: Record<string, unknown>
) => Promise<FinbertRawOutputItem | FinbertRawOutputItem[]>;

export const FINBERT_MODEL_ID = 'Xenova/finbert';
export const LEXICON_FALLBACK_MODEL_ID = 'keyword-lexicon-fallback';
export const MULTILINGUAL_LEXICON_MODEL_ID = 'multilingual-lexicon-v1';
const DEFAULT_LOAD_TIMEOUT_MS = Number(process.env.FINBERT_LOAD_TIMEOUT_MS || 20000);
const DEFAULT_INFERENCE_TIMEOUT_MS = Number(process.env.FINBERT_INFER_TIMEOUT_MS || 10000);
const MAX_CACHE_ENTRIES = 5000;

const MULTILINGUAL_POSITIVE_MARKERS: Record<string, string[]> = {
  de: ['steigert', 'steigt', 'rekord', 'gewinn', 'wachstum', 'übertrifft', 'stark', 'prognose angehoben', 'dividende', 'kaufrating', 'erholung', 'plus', 'gewinnsprung'],
  fr: ['hausse', 'croissance', 'bénéfice', 'record', 'progresse', 'surpasse', 'solide', 'dividende', 'relève', 'amélioration', 'acquisition stratégique'],
  es: ['sube', 'crecimiento', 'beneficio', 'récord', 'supera', 'fuerte', 'dividendo', 'mejora', 'alza', 'expansión', 'ganancia'],
  pt: ['alta', 'lucro', 'crescimento', 'recorde', 'supera', 'forte', 'dividendo', 'expansão', 'avança'],
  it: ['cresce', 'utile', 'utili', 'record', 'ricavi', 'dividendo', 'rialzo', 'migliora', 'solido', 'espansione'],
  nl: ['stijgt', 'winst', 'groei', 'record', 'omzetstijging', 'sterk', 'dividend', 'verhoogt', 'herstel'],
  sv: ['stiger', 'vinst', 'tillväxt', 'rekord', 'stark', 'utdelning', 'höjer', 'framgång'],
  no: ['stiger', 'overskudd', 'vekst', 'rekord', 'sterk', 'utbytte', 'oppgang'],
  da: ['stiger', 'overskud', 'vækst', 'rekord', 'stærk', 'udbytte', 'opjusterer'],
  fi: ['nousee', 'tulos', 'kasvu', 'ennätys', 'vahva', 'osinko', 'parantaa'],
  id: ['naik', 'laba', 'pertumbuhan', 'rekor', 'kuat', 'dividen', 'melonjak', 'menguat'],
  ja: ['増益', '上方修正', '最高益', '成長', '上昇', '増配', '好調', '黒字', '急騰', '買い'],
  ko: ['상승', '호실적', '성장', '최대', '급등', '흑자', '배당', '상향', '수주', '매수'],
  zh: ['增长', '上涨', '创纪录', '盈利', '大涨', '突破', '分红', '利好', '买入', '上调'],
  hi: ['मुनाफा', 'बढ़त', 'रिकॉर्ड', 'तेजी', 'मजबूत', 'लाभांश', 'विकास', 'उछाल'],
  ru: ['рост', 'прибыль', 'рекорд', 'дивиденды', 'укрепление', 'повышение'],
  ar: ['نمو', 'أرباح', 'ارتفاع', 'قياسي', 'توزيعات', 'قوي']
};

const MULTILINGUAL_NEGATIVE_MARKERS: Record<string, string[]> = {
  de: ['fällt', 'verlust', 'einbruch', 'rückgang', 'schwach', 'warnung', 'senkt', 'untersuchung', 'klage', 'schulden', 'krise', 'minus', 'stürzt'],
  fr: ['baisse', 'chute', 'perte', 'recul', 'faible', 'avertissement', 'enquête', 'dette', 'crise', 'dégradation', 'plonge'],
  es: ['cae', 'caída', 'pérdida', 'pérdidas', 'débil', 'advertencia', 'recorte', 'demanda', 'deuda', 'crisis', 'desplome'],
  pt: ['queda', 'prejuízo', 'recuo', 'fraco', 'crise', 'dívida', 'investigação', 'desaba'],
  it: ['cala', 'perdita', 'ribasso', 'debole', 'crollo', 'indagine', 'debito', 'crisi'],
  nl: ['daalt', 'verlies', 'krimp', 'zwak', 'waarschuwing', 'schuld', 'daling', 'onderzoek'],
  sv: ['faller', 'förlust', 'nedgång', 'svag', 'varning', 'skuld', 'rasar'],
  no: ['faller', 'underskudd', 'nedgang', 'svak', 'advarsel', 'gjeld'],
  da: ['falder', 'underskud', 'nedgang', 'svag', 'nedjusterer', 'gæld'],
  fi: ['laskee', 'tappio', 'heikko', 'varoitus', 'velka', 'pudotus'],
  id: ['turun', 'rugi', 'anjlok', 'lemah', 'utang', 'penurunan', 'koreksi'],
  ja: ['減益', '下方修正', '赤字', '下落', '急落', '悪化', '減配', '売り', '訴訟'],
  ko: ['하락', '적자', '급락', '부진', '감소', '하향', '손실', '악화', '매도'],
  zh: ['下跌', '亏损', '暴跌', '下滑', '疲软', '下调', '违约', '利空', '卖出', '衰退'],
  hi: ['गिरावट', 'नुकसान', 'घाटा', 'कमजोर', 'मंदी', 'संकट', 'दबाव'],
  ru: ['падение', 'убыток', 'снижение', 'кризис', 'слабый', 'штраф'],
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
    modelId: MULTILINGUAL_LEXICON_MODEL_ID
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

  // If pipeline only returned top-1 label (e.g. a mock without topk scores), allocate residual cleanly
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

function buildFinbertResult(
  probs: { positive: number; neutral: number; negative: number },
  language = 'en'
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
    sentimentSource: 'finbert',
    language,
    modelId: FINBERT_MODEL_ID
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
    modelId: LEXICON_FALLBACK_MODEL_ID
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

// Module state for lazy singleton + per-headline cache + test overrides
const HEADLINE_CACHE = new Map<string, ScoredSentimentResult>();
let cacheHits = 0;
let cacheMisses = 0;

let pipelinePromise: Promise<FinbertPipelineFn> | null = null;
let overrideLoader: (() => Promise<FinbertPipelineFn>) | null = null;
let lastLoadFailureAt = 0;
const RETRY_LOAD_COOLDOWN_MS = 60 * 1000;

export function setFinbertPipelineOverride(loader: (() => Promise<FinbertPipelineFn>) | null): void {
  overrideLoader = loader;
  pipelinePromise = null;
  lastLoadFailureAt = 0;
}

export function resetFinbertState(): void {
  HEADLINE_CACHE.clear();
  cacheHits = 0;
  cacheMisses = 0;
  pipelinePromise = null;
  overrideLoader = null;
  lastLoadFailureAt = 0;
}

export function getFinbertCacheStats() {
  return {
    size: HEADLINE_CACHE.size,
    hits: cacheHits,
    misses: cacheMisses
  };
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

/**
 * Scores a batch of headlines asynchronously with FinBERT (`Xenova/finbert`),
 * using per-(title+publisher) SHA-256 caching and falling back to the keyword
 * lexicon if FinBERT fails to load or times out.
 */
export async function scoreHeadlinesWithFinbert(
  items: HeadlineInput[],
  options?: {
    loadTimeoutMs?: number;
    inferenceTimeoutMs?: number;
    batchSize?: number;
  }
): Promise<ScoredSentimentResult[]> {
  if (!items || items.length === 0) return [];

  const loadTimeoutMs = options?.loadTimeoutMs ?? DEFAULT_LOAD_TIMEOUT_MS;
  const inferenceTimeoutMs = options?.inferenceTimeoutMs ?? DEFAULT_INFERENCE_TIMEOUT_MS;
  const batchSize = Math.max(1, Math.min(32, options?.batchSize ?? 16));

  const results: Array<ScoredSentimentResult | undefined> = new Array(items.length);
  const detectedLangs = new Array<string>(items.length);
  const uncachedEnglishIndices: number[] = [];
  const keyByIdx = new Array<string>(items.length);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const detected = detectTextLanguage(`${item.headline} ${item.summary || ''}`);
    detectedLangs[i] = detected.language;
    const key = `${hashHeadlineKey(item.headline, item.publisher)}:${detected.language}`;
    keyByIdx[i] = key;

    const cached = HEADLINE_CACHE.get(key);
    if (cached) {
      cacheHits++;
      results[i] = cached;
      continue;
    }

    cacheMisses++;

    // Step 5 Guard: NEVER pass non-English text to English FinBERT (`Xenova/finbert`)
    if (!detected.isEnglish) {
      const multiResult = analyzeMultilingualLexiconSentiment(
        item.headline,
        item.summary || '',
        detected.language
      );
      results[i] = multiResult;
      if (HEADLINE_CACHE.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = HEADLINE_CACHE.keys().next().value;
        if (oldestKey) HEADLINE_CACHE.delete(oldestKey);
      }
      HEADLINE_CACHE.set(key, multiResult);
      continue;
    }

    uncachedEnglishIndices.push(i);
  }

  if (uncachedEnglishIndices.length === 0) {
    return results as ScoredSentimentResult[];
  }

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

      const normalizedBatch: FinbertRawOutputItem[] = Array.isArray(rawOutputs)
        ? texts.length === 1 && rawOutputs.length > 0 && !Array.isArray(rawOutputs[0]) && typeof (rawOutputs[0] as any).label === 'string'
          ? [rawOutputs as Array<{ label: string; score: number }>]
          : (rawOutputs as FinbertRawOutputItem[])
        : [rawOutputs];

      for (let j = 0; j < chunkIndices.length; j++) {
        const origIdx = chunkIndices[j];
        const rawOut = normalizedBatch[j];
        if (!rawOut) {
          results[origIdx] = buildLexiconFallbackResult(
            items[origIdx].headline,
            items[origIdx].summary,
            detectedLangs[origIdx]
          );
          continue;
        }
        const probs = normalizeLabelScores(rawOut);
        const scored = buildFinbertResult(probs, detectedLangs[origIdx]);
        results[origIdx] = scored;

        if (HEADLINE_CACHE.size >= MAX_CACHE_ENTRIES) {
          const oldestKey = HEADLINE_CACHE.keys().next().value;
          if (oldestKey) HEADLINE_CACHE.delete(oldestKey);
        }
        HEADLINE_CACHE.set(keyByIdx[origIdx], scored);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Sentiment] FinBERT unavailable (${message}); falling back to keyword lexicon.`);
  }

  // Fill any unscored English slots with deterministic English keyword lexicon fallback
  for (let i = 0; i < items.length; i++) {
    if (!results[i]) {
      results[i] = buildLexiconFallbackResult(
        items[i].headline,
        items[i].summary,
        detectedLangs[i] || 'en'
      );
    }
  }

  return results as ScoredSentimentResult[];
}
