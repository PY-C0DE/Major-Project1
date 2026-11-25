/**
 * Deterministic Financial Headline & Article Language Detector (Step 5)
 *
 * Identifies ISO 639-1 language codes from Unicode script ranges, diacritics,
 * and closed-class financial/function word markers without network calls.
 * Ensures non-English financial headlines are NEVER routed to English FinBERT.
 */

export interface LanguageDetectionResult {
  language: string; // ISO 639-1 code ('en', 'de', 'fr', 'es', 'pt', 'it', 'nl', 'sv', 'no', 'da', 'fi', 'id', 'ja', 'ko', 'zh', 'hi', 'ru', 'ar', or 'und')
  confidence: number; // [0, 1]
  isEnglish: boolean;
  script: 'latin' | 'cjk' | 'hangul' | 'kana' | 'devanagari' | 'cyrillic' | 'arabic' | 'unknown';
}

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

export function detectTextLanguage(text: string): LanguageDetectionResult {
  const clean = (text || '').trim();
  if (!clean) {
    return { language: 'und', confidence: 0, isEnglish: false, script: 'unknown' };
  }

  // 1. Check non-Latin Unicode script ranges first
  const hangulCount = (clean.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || []).length;
  const kanaCount = (clean.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
  const hanCount = (clean.match(/[\u4E00-\u9FFF]/g) || []).length;
  const devanagariCount = (clean.match(/[\u0900-\u097F]/g) || []).length;
  const cyrillicCount = (clean.match(/[\u0400-\u04FF]/g) || []).length;
  const arabicCount = (clean.match(/[\u0600-\u06FF]/g) || []).length;

  if (hangulCount >= 2) {
    return { language: 'ko', confidence: 0.99, isEnglish: false, script: 'hangul' };
  }
  if (kanaCount >= 2) {
    return { language: 'ja', confidence: 0.99, isEnglish: false, script: 'kana' };
  }
  if (hanCount >= 2 && kanaCount === 0 && hangulCount === 0) {
    return { language: 'zh', confidence: 0.96, isEnglish: false, script: 'cjk' };
  }
  if (devanagariCount >= 2) {
    return { language: 'hi', confidence: 0.99, isEnglish: false, script: 'devanagari' };
  }
  if (cyrillicCount >= 2) {
    return { language: 'ru', confidence: 0.98, isEnglish: false, script: 'cyrillic' };
  }
  if (arabicCount >= 2) {
    return { language: 'ar', confidence: 0.98, isEnglish: false, script: 'arabic' };
  }

  // 2. Latin-script stopword + diacritic scoring
  const tokens = clean
    .toLowerCase()
    .split(/[^a-zA-Z\u00C0-\u024F]+/)
    .filter((t) => t.length >= 2);

  if (tokens.length === 0) {
    return { language: 'und', confidence: 0, isEnglish: false, script: 'unknown' };
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

  // Disambiguate ties cleanly: if English has zero hits AND no other language hit, classify ASCII English headline cautiously if >= 2 Latin tokens
  if (bestScore === 0) {
    const hasOnlyBasicAscii = !/[\u00C0-\u024F]/.test(clean);
    if (hasOnlyBasicAscii && tokens.length >= 2) {
      return { language: 'en', confidence: 0.65, isEnglish: true, script: 'latin' };
    }
    return { language: 'und', confidence: 0.3, isEnglish: false, script: 'latin' };
  }

  const margin = Math.max(0, bestScore - secondScore);
  const confidence = Number(Math.min(0.99, 0.55 + margin * 0.08).toFixed(2));
  return {
    language: bestLang,
    confidence,
    isEnglish: bestLang === 'en',
    script: 'latin'
  };
}
