/**
 * Financial Headline & Article Language Detector (Item 3)
 *
 * Primary detector: `franc-min` trigram statistical language identifier (ISO 639-3 -> ISO 639-1).
 * Fallback detector: Unicode script range & closed-class diacritic/stopword heuristic for
 * very short headlines (<20 Latin chars / <8 non-Latin chars), ambiguous strings, or `'und'`.
 *
 * Ensures non-English headlines are NEVER routed to English FinBERT.
 */

import { francAll } from 'franc-min';

export interface LanguageDetectionResult {
  language: string; // ISO 639-1 code ('en', 'de', 'fr', 'es', 'pt', 'it', 'nl', 'sv', 'no', 'da', 'fi', 'id', 'ms', 'ja', 'ko', 'zh', 'hi', 'ru', 'ar', 'pl', 'tr', 'vi', 'th', or 'und')
  iso639_3?: string;
  confidence: number; // [0, 1]
  isEnglish: boolean;
  script: 'latin' | 'cjk' | 'hangul' | 'kana' | 'devanagari' | 'cyrillic' | 'arabic' | 'unknown';
  detector: 'franc-min' | 'heuristic-fallback';
}

const ISO3_TO_ISO1: Record<string, string> = {
  eng: 'en',
  deu: 'de',
  fra: 'fr',
  spa: 'es',
  por: 'pt',
  ita: 'it',
  nld: 'nl',
  swe: 'sv',
  nob: 'no',
  nno: 'no',
  nor: 'no',
  dan: 'da',
  fin: 'fi',
  ind: 'id',
  zlm: 'ms',
  zsm: 'ms',
  msa: 'ms',
  jpn: 'ja',
  kor: 'ko',
  cmn: 'zh',
  zho: 'zh',
  yue: 'zh',
  hin: 'hi',
  rus: 'ru',
  ukr: 'uk',
  arb: 'ar',
  ara: 'ar',
  pol: 'pl',
  tur: 'tr',
  vie: 'vi',
  tha: 'th',
  heb: 'he',
  ell: 'el',
  ces: 'cs',
  ron: 'ro',
  hun: 'hu',
  cat: 'ca',
  npi: 'ne',
  mar: 'mr',
  ben: 'bn',
  tam: 'ta',
  tel: 'te',
  urd: 'ur',
  fas: 'fa'
};

const LATIN_STOPWORDS: Record<string, string[]> = {
  en: [
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'amid', 'after', 'ahead',
    'over', 'under', 'above', 'below', 'into', 'than', 'stock', 'shares', 'earnings',
    'revenue', 'profit', 'growth', 'quarter', 'quarterly', 'guidance', 'market', 'markets',
    'reports', 'report', 'surge', 'surges', 'slump', 'upgrade', 'downgrade', 'raises',
    'cuts', 'outlook', 'beats', 'misses', 'announces', 'investor', 'investors'
  ],
  de: [
    'der', 'die', 'das', 'und', 'mit', 'für', 'von', 'auf', 'über', 'nach',
    'beim', 'im', 'am', 'ein', 'eine', 'einem', 'aktie', 'aktien', 'umsatz', 'gewinn',
    'verlust', 'quartal', 'prognose', 'ausblick', 'markt', 'märkte', 'konzern', 'steigt',
    'fällt', 'wachstum', 'ergebnis', 'ergebnisse', 'milliarden', 'prozent'
  ],
  fr: [
    'le', 'la', 'les', 'des', 'une', 'un', 'dans', 'avec', 'pour', 'sur',
    'par', 'aux', 'qui', 'que', 'est', 'sont', 'après', 'avant', 'économie', 'croissance',
    'résultats', 'bénéfice', 'chiffre', 'affaires', 'bourse', 'actions', 'action', 'hausse',
    'baisse', 'trimestre', 'prévisions', 'marché', 'marchés', 'milliards'
  ],
  es: [
    'el', 'la', 'los', 'las', 'una', 'unos', 'para', 'con', 'sobre', 'entre',
    'por', 'según', 'desde', 'tras', 'acciones', 'acción', 'ingresos', 'beneficio',
    'beneficios', 'pérdida', 'trimestre', 'mercado', 'mercados', 'crecimiento', 'sube',
    'cae', 'previsión', 'millones', 'empresas', 'resultados'
  ],
  pt: [
    'os', 'as', 'uma', 'uns', 'não', 'para', 'com', 'sobre', 'após', 'entre',
    'ações', 'ação', 'lucro', 'receita', 'prejuízo', 'trimestre', 'mercado', 'alta',
    'queda', 'crescimento', 'bilhões', 'resultado', 'resultados', 'empresa'
  ],
  it: [
    'il', 'lo', 'gli', 'degli', 'della', 'delle', 'nel', 'nella', 'con', 'per',
    'sulle', 'dopo', 'azioni', 'ricavi', 'utili', 'perdita', 'trimestre', 'mercato',
    'mercati', 'crescita', 'miliardi', 'risultati', 'stima', 'previsioni'
  ],
  nl: [
    'het', 'een', 'van', 'voor', 'met', 'naar', 'uit', 'op', 'aan', 'bij',
    'aandelen', 'aandeel', 'omzet', 'winst', 'verlies', 'kwartaal', 'groei', 'beurs',
    'markt', 'verwachting', 'miljard', 'resultaten', 'stijgt', 'daalt'
  ],
  sv: [
    'och', 'för', 'med', 'till', 'från', 'som', 'aktie', 'aktien', 'aktier',
    'omsättning', 'vinst', 'förlust', 'kvartal', 'tillväxt', 'marknad', 'börs',
    'miljarder', 'rapport', 'prognos', 'stiger', 'faller'
  ],
  no: [
    'og', 'for', 'med', 'til', 'fra', 'som', 'aksje', 'aksjen', 'omsetning',
    'resultat', 'overskudd', 'kvartal', 'vekst', 'marked', 'børs', 'milliarder'
  ],
  da: [
    'og', 'for', 'med', 'til', 'fra', 'som', 'aktie', 'aktien', 'omsætning',
    'overskud', 'kvartal', 'vækst', 'marked', 'børs', 'milliarder', 'stiger', 'falder'
  ],
  fi: [
    'ja', 'sekä', 'että', 'mutta', 'liikevaihto', 'tulos', 'osake', 'osakkeet',
    'kasvu', 'neljännes', 'markkina', 'pörssi', 'miljardia', 'nousee', 'laskee'
  ],
  id: [
    'dan', 'yang', 'untuk', 'dengan', 'dari', 'pada', 'saham', 'laba', 'rugi',
    'pendapatan', 'kuartal', 'pertumbuhan', 'pasar', 'bursa', 'triliun', 'miliar'
  ],
  ms: [
    'dan', 'yang', 'untuk', 'dengan', 'daripada', 'saham', 'untung', 'rugi',
    'hasil', 'suku', 'pertumbuhan', 'pasaran', 'bursa', 'ringgit', 'bilion'
  ]
};

const DIACRITIC_HINTS: Array<{ lang: string; regex: RegExp; weight: number }> = [
  { lang: 'de', regex: /[äöüß]/gi, weight: 2.2 },
  { lang: 'fr', regex: /[éèêëàâçîïôûùüœæ]/gi, weight: 1.6 },
  { lang: 'es', regex: /[ñ¿¡áéíóúü]/gi, weight: 1.8 },
  { lang: 'pt', regex: /[ãõçáéíóúâêô]/gi, weight: 2.0 },
  { lang: 'sv', regex: /[åäö]/gi, weight: 1.8 },
  { lang: 'da', regex: /[æøå]/gi, weight: 2.0 },
  { lang: 'no', regex: /[æøå]/gi, weight: 1.8 },
  { lang: 'fi', regex: /[äö]/gi, weight: 1.3 },
  { lang: 'it', regex: /[àèéìòù]/gi, weight: 1.4 }
];

function inspectScripts(text: string): {
  dominant: LanguageDetectionResult['script'];
  hangul: number;
  kana: number;
  han: number;
  devanagari: number;
  cyrillic: number;
  arabic: number;
  latin: number;
  nonLatinTotal: number;
} {
  const hangul = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || []).length;
  const kana = (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
  const han = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
  const devanagari = (text.match(/[\u0900-\u097F]/g) || []).length;
  const cyrillic = (text.match(/[\u0400-\u04FF]/g) || []).length;
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z\u00C0-\u024F]/g) || []).length;
  const nonLatinTotal = hangul + kana + han + devanagari + cyrillic + arabic;

  let dominant: LanguageDetectionResult['script'] = 'unknown';
  if (hangul >= 2) dominant = 'hangul';
  else if (kana >= 2 || (kana >= 1 && han >= 1)) dominant = 'kana';
  else if (han >= 2) dominant = 'cjk';
  else if (devanagari >= 2) dominant = 'devanagari';
  else if (cyrillic >= 2) dominant = 'cyrillic';
  else if (arabic >= 2) dominant = 'arabic';
  else if (latin >= 2) dominant = 'latin';

  return { dominant, hangul, kana, han, devanagari, cyrillic, arabic, latin, nonLatinTotal };
}

function sanitizeHeadlineForLanguageDetection(text: string): string {
  // Strip URLs, $TICKER symbols, exchange suffixes (.NS, .KS), and standalone uppercase acronyms so
  // financial tickers like "NVDA" or "SAP" don't bias statistical trigram models on non-English headlines.
  const cleaned = text
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\$[A-Z]{1,6}(?:\.[A-Z]{1,3})?/g, ' ')
    .replace(/\b[A-Z0-9]{1,6}\.(?:NS|BO|KS|KQ|T|HK|L|DE|PA|AS|MI|MC|BR|SW|ST|OL|CO|HE|TO|AX|SI|JK|KL)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length >= 8 ? cleaned : text.trim();
}

function runHeuristicFallback(
  clean: string,
  scripts: ReturnType<typeof inspectScripts>
): LanguageDetectionResult {
  if (scripts.hangul >= 2) {
    return { language: 'ko', iso639_3: 'kor', confidence: 0.99, isEnglish: false, script: 'hangul', detector: 'heuristic-fallback' };
  }
  if (scripts.kana >= 2 || (scripts.kana >= 1 && scripts.han >= 1)) {
    return { language: 'ja', iso639_3: 'jpn', confidence: 0.99, isEnglish: false, script: 'kana', detector: 'heuristic-fallback' };
  }
  if (scripts.han >= 2 && scripts.kana === 0 && scripts.hangul === 0) {
    return { language: 'zh', iso639_3: 'cmn', confidence: 0.96, isEnglish: false, script: 'cjk', detector: 'heuristic-fallback' };
  }
  if (scripts.devanagari >= 2) {
    return { language: 'hi', iso639_3: 'hin', confidence: 0.98, isEnglish: false, script: 'devanagari', detector: 'heuristic-fallback' };
  }
  if (scripts.cyrillic >= 2) {
    return { language: 'ru', iso639_3: 'rus', confidence: 0.97, isEnglish: false, script: 'cyrillic', detector: 'heuristic-fallback' };
  }
  if (scripts.arabic >= 2) {
    return { language: 'ar', iso639_3: 'arb', confidence: 0.97, isEnglish: false, script: 'arabic', detector: 'heuristic-fallback' };
  }

  const tokens = clean
    .toLowerCase()
    .split(/[^a-zA-Z\u00C0-\u024F]+/)
    .filter((t) => t.length >= 2);

  if (tokens.length === 0) {
    return { language: 'und', confidence: 0, isEnglish: false, script: 'unknown', detector: 'heuristic-fallback' };
  }

  const scores = new Map<string, number>();
  for (const [lang, vocab] of Object.entries(LATIN_STOPWORDS)) {
    const vocabSet = new Set(vocab);
    let score = 0;
    for (const tok of tokens) {
      if (vocabSet.has(tok)) {
        score += 2.0;
      }
    }
    scores.set(lang, score);
  }

  for (const hint of DIACRITIC_HINTS) {
    const matches = clean.match(hint.regex);
    if (matches && matches.length > 0) {
      const prev = scores.get(hint.lang) || 0;
      scores.set(hint.lang, prev + Math.min(6, matches.length * hint.weight));
    }
  }

  let bestLang = 'en';
  let bestScore = scores.get('en') || 0;
  let secondScore = 0;

  for (const [lang, score] of scores.entries()) {
    if (lang === 'en') continue;
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      bestLang = lang;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  if (bestScore === 0) {
    const hasOnlyBasicAscii = !/[\u00C0-\u024F]/.test(clean);
    if (hasOnlyBasicAscii && tokens.length >= 2) {
      return { language: 'en', confidence: 0.6, isEnglish: true, script: 'latin', detector: 'heuristic-fallback' };
    }
    return { language: 'und', confidence: 0.25, isEnglish: false, script: 'latin', detector: 'heuristic-fallback' };
  }

  const margin = Math.max(0, bestScore - secondScore);
  const confidence = Number(Math.min(0.95, 0.55 + margin * 0.08).toFixed(2));
  return {
    language: bestLang,
    confidence,
    isEnglish: bestLang === 'en',
    script: 'latin',
    detector: 'heuristic-fallback'
  };
}

export function detectTextLanguage(text: string): LanguageDetectionResult {
  const clean = (text || '').trim();
  if (!clean) {
    return { language: 'und', confidence: 0, isEnglish: false, script: 'unknown', detector: 'heuristic-fallback' };
  }

  const normalizedForDetect = sanitizeHeadlineForLanguageDetection(clean);
  const scripts = inspectScripts(normalizedForDetect);

  // Script-authoritative checks prevent trigram misclassifications on mixed ASCII+CJK/Hangul/Kana headlines
  // (e.g. "NVIDIA (NVDA) 決算は予想を上回る大幅増益" where ASCII tokens would dilute trigram length)
  const hasStrongNonLatin = scripts.nonLatinTotal >= 6;
  const hasEnoughLatinForFranc = scripts.latin >= 20 && normalizedForDetect.length >= 20;

  if (hasStrongNonLatin || hasEnoughLatinForFranc) {
    const candidates = francAll(normalizedForDetect, { minLength: 6 });
    const top = candidates[0];
    const second = candidates[1];

    if (top && top[0] && top[0] !== 'und') {
      let chosenIso3 = top[0];
      let chosenScore = top[1];

      // Devanagari disambiguation: franc-min frequently ranks `npi` (1.0) slightly ahead of `hin` (~0.98) on Hindi financial text
      if (scripts.devanagari >= 4) {
        const hinMatch = candidates.find(([code]) => code === 'hin');
        if (hinMatch && hinMatch[1] >= 0.85 * chosenScore) {
          chosenIso3 = 'hin';
          chosenScore = hinMatch[1];
        }
      }

      // If non-Latin script clearly indicates Korean/Japanese/Chinese/Arabic/Cyrillic/Devanagari, confirm compatibility
      const mappedIso1 = ISO3_TO_ISO1[chosenIso3] || chosenIso3.slice(0, 2);
      const scriptMismatch =
        (scripts.hangul >= 2 && mappedIso1 !== 'ko') ||
        (scripts.kana >= 2 && mappedIso1 !== 'ja') ||
        (scripts.han >= 2 && scripts.kana === 0 && scripts.hangul === 0 && !['zh', 'ja'].includes(mappedIso1)) ||
        (scripts.devanagari >= 2 && !['hi', 'ne', 'mr'].includes(mappedIso1)) ||
        (scripts.arabic >= 2 && !['ar', 'fa', 'ur'].includes(mappedIso1));

      if (!scriptMismatch && mappedIso1 !== 'un') {
        const gap = second ? Math.max(0, chosenScore - second[1]) : 0.25;
        const confidence = Number(Math.min(0.99, Math.max(0.6, 0.72 + gap * 0.6)).toFixed(2));
        return {
          language: mappedIso1,
          iso639_3: chosenIso3,
          confidence,
          isEnglish: mappedIso1 === 'en',
          script: scripts.dominant,
          detector: 'franc-min'
        };
      }
    }
  }

  return runHeuristicFallback(normalizedForDetect, scripts);
}
