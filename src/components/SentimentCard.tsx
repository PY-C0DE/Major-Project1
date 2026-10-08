/**
 * USP 3: Multimodal Sentiment & News Fact-Verification Card
 * Powered by FinBERT tone architecture (Positive, Neutral, Negative)
 * fused with Google Fact Check verification and domain reputation scoring.
 * Fully supports dark and light themes.
 */

import React from 'react';
import { Newspaper, CheckCircle2, ShieldCheck, ExternalLink } from 'lucide-react';
import { NewsItem } from '../types';

interface Props {
  news: NewsItem[];
  ticker: string;
}

export const SentimentCard: React.FC<Props> = ({ news, ticker }) => {
  if (!news || news.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 animate-pulse min-h-[260px] flex items-center justify-center">
        <span className="text-xs font-mono text-slate-500">Evaluating FinBERT Sentiment & Claim Verification...</span>
      </div>
    );
  }

  // Calculate aggregated FinBERT probabilities across headlines
  let totalPos = 0;
  let totalNeu = 0;
  let totalNeg = 0;
  let totalVerif = 0;

  news.forEach(item => {
    totalPos += item.probabilities.positive;
    totalNeu += item.probabilities.neutral;
    totalNeg += item.probabilities.negative;
    totalVerif += item.verificationScore;
  });

  const count = news.length;
  const avgPos = Math.round((totalPos / count) * 100);
  const avgNeu = Math.round((totalNeu / count) * 100);
  const avgNeg = Math.round((totalNeg / count) * 100);
  const avgVerif = Math.round((totalVerif / count) * 100);

  return (
    <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-5 relative overflow-hidden shadow-sm dark:shadow-lg transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400">
            <Newspaper className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">FinBERT & Fact Verification</h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Hugging Face Transformers · Multi-Modal Signal Fusion
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/40 text-[11px] font-mono text-indigo-700 dark:text-indigo-300">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Verif. Weight: {avgVerif}%</span>
        </div>
      </div>

      {/* Aggregate FinBERT Tone Breakdown */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-lg mb-4">
        <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
          <span>Aggregated News Sentiment Tone</span>
          <span className="text-slate-400 text-[10px]">yiyanghkust/finbert-tone</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">Positive</span>
            <span className="text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums">{avgPos}%</span>
          </div>
          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Neutral</span>
            <span className="text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums">{avgNeu}%</span>
          </div>
          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-semibold">Negative</span>
            <span className="text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums">{avgNeg}%</span>
          </div>
        </div>
      </div>

      {/* Recent Verified Headlines */}
      <div className="space-y-2.5">
        <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider">
          Recent Financial Disclosures & Verification
        </div>

        {news.slice(0, 3).map(item => (
          <div
            key={item.id}
            className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-slate-800 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors leading-snug line-clamp-2"
              >
                {item.headline}
              </a>
              <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
            </div>

            {/* Zero-pill metadata line with typographic separators */}
            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 font-mono">
              <span className="text-slate-600 dark:text-slate-400 font-medium">{item.source}</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  item.sentiment === 'positive'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : item.sentiment === 'negative'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500 dark:text-slate-400'
                }
              >
                {item.sentiment.toUpperCase()} ({(item.confidence * 100).toFixed(0)}%)
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-cyan-700 dark:text-cyan-400 flex items-center gap-1 font-sans">
                <CheckCircle2 className="w-3 h-3 inline" />
                {item.factCheckStatus}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
