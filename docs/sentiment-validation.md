# Multilingual Sentiment & Language Detection Validation Report

Generated reproducibly by `scripts/validateSentiment.ts` (seed `20261125`, timestamp `2026-11-26T08:48:49.369Z`).

## 1. Datasets & Licences

1. **`Kenpache/multilingual-financial-sentiment`** — Licence: **Apache-2.0** (39,829 labelled financial news sentences across `ar`, `de`, `en`, `es`, `fr`, `ja`, `zh`).
2. **`zeroshot/twitter-financial-news-sentiment`** (`validation` split) — Licence: **MIT** (2,388 labelled English financial news/social headlines).

## 2. Sentiment Model vs. Lexicon Fallback (Accuracy & Macro-F1)

- **English primary scorer**: `Xenova/finbert` (`onnx-prosusai-finbert-v1`)
- **Non-English primary scorer**: `Xenova/distilbert-base-multilingual-cased-sentiments-student` (`onnx-lxyuan-mbert-v1`)
- **Fallbacks**: `keyword-lexicon-fallback` (`en`), `multilingual-lexicon-v1` (`ar, de, es, fr, ja, zh, id, hi, it, ms, pt`)

| Language | Dataset (Licence) | n | Primary Transformer Model | Primary Acc (%) | Primary Macro-F1 (%) | Fallback Lexicon Acc (%) | Fallback Macro-F1 (%) |
|---|---|---|---|---|---|---|---|
| `en` | zeroshot/twitter-financial-news-sentiment (MIT) | 120 | `Xenova/finbert (onnx-prosusai-finbert-v1)` | 60.83 | 60.80 | 46.67 | 41.85 |
| `en` | Kenpache/multilingual-financial-sentiment (Apache-2.0) | 120 | `Xenova/finbert (onnx-prosusai-finbert-v1)` | 60.00 | 59.52 | 38.33 | 35.46 |
| `de` | Kenpache/multilingual-financial-sentiment (Apache-2.0) | 120 | `Xenova/distilbert-base-multilingual-cased-sentiments-student (onnx-lxyuan-mbert-v1)` | 49.17 | 39.31 | 40.83 | 33.03 |
| `fr` | Kenpache/multilingual-financial-sentiment (Apache-2.0) | 120 | `Xenova/distilbert-base-multilingual-cased-sentiments-student (onnx-lxyuan-mbert-v1)` | 55.83 | 46.00 | 51.67 | 49.54 |
| `es` | Kenpache/multilingual-financial-sentiment (Apache-2.0) | 120 | `Xenova/distilbert-base-multilingual-cased-sentiments-student (onnx-lxyuan-mbert-v1)` | 55.83 | 46.20 | 47.50 | 43.08 |
| `ja` | Kenpache/multilingual-financial-sentiment (Apache-2.0) | 120 | `Xenova/distilbert-base-multilingual-cased-sentiments-student (onnx-lxyuan-mbert-v1)` | 48.33 | 40.33 | 50.00 | 46.85 |
| `zh` | Kenpache/multilingual-financial-sentiment (Apache-2.0) | 120 | `Xenova/distilbert-base-multilingual-cased-sentiments-student (onnx-lxyuan-mbert-v1)` | 48.33 | 40.13 | 46.67 | 40.93 |
| `ar` | Kenpache/multilingual-financial-sentiment (Apache-2.0) | 120 | `Xenova/distilbert-base-multilingual-cased-sentiments-student (onnx-lxyuan-mbert-v1)` | 51.67 | 41.59 | 45.83 | 42.66 |

### Languages Without Open Labelled Financial Test Data

The multilingual ONNX model (`Xenova/distilbert-base-multilingual-cased-sentiments-student`) supports 11 non-English languages (`ar, de, es, fr, ja, zh, hi, id, it, ms, pt`).
However, **no freely licensed 3-class financial headline sentiment dataset was available in the benchmark sources above for `hi` (Hindi), `id` (Indonesian), `it` (Italian), `ms` (Malay), or `pt` (Portuguese)**. In accordance with strict scientific reporting, **no accuracy or macro-F1 numbers are claimed for those 5 languages**.

Other market languages (e.g., `ko` Korean, `ru` Russian, `nl` Dutch, `sv` Swedish, `no` Norwegian, `da` Danish, `fi` Finnish) are **unsupported by the multilingual transformer** and are explicitly flagged `sentimentSource: "unsupported_language"` and excluded from daily sentiment aggregates.

## 3. Language Detection Error Rate (`franc-min` + Script/Short-Text Fallback)

Evaluated across **840 held-out financial sentences** (120 per language) from `Kenpache/multilingual-financial-sentiment`.
- **Overall Accuracy**: 99.52% (836/840)
- **Overall Error Rate**: **0.48%**
- **Primary `franc-min` invocation rate**: 99.88% (839/840)

| True Language | n | Correct | `franc-min` Primary Count | Error Rate (%) | Top Misclassifications |
|---|---|---|---|---|---|
| `en` | 120 | 118 | 120 | 1.67 | pt:1, it:1 |
| `de` | 120 | 118 | 120 | 1.67 | en:1, nl:1 |
| `fr` | 120 | 120 | 120 | 0.00 | None |
| `es` | 120 | 120 | 120 | 0.00 | None |
| `ja` | 120 | 120 | 120 | 0.00 | None |
| `zh` | 120 | 120 | 120 | 0.00 | None |
| `ar` | 120 | 120 | 119 | 0.00 | None |

## 4. Live Sentiment History Accumulation for Causal Ablation

In live model audits (`npm run audit` and `npm run audit -- --universe`), the paired sentiment ablation (`sentimentAblation`) enforces strict walk-forward causality (`sentimentDate < predictionDate` aligned to the exchange trading calendar) and never backfills or fabricates historical sentiment.

- **Activation thresholds**:
  - `minRequiredDates >= 10` distinct exchange-local trading dates with live news sentiment overlapping the out-of-sample evaluation test window.
  - `minRequiredSamples >= 30` matched `(ticker, predictionDate)` pairs across evaluated assets.
- Until scheduled daily sentiment collection accumulates at least **10 distinct trading days** overlapping the OOS test window (`>= 30` matched ticker-date pairs), `sentimentAblation.available` honestly reports `false` with the exact observed `matchedSamples` and `matchedDates` counts.
