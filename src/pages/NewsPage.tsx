/**
 * AlphaQuant AI - Financial News & Verification Intelligence Page
 * Powered by FinBERT tone architecture and Google Fact Check Tools claim verification.
 * Fully styled for pleasant light mode and dark mode.
 */

import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Filter,
  Search,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { NewsItem } from '../types';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

export const NewsPage: React.FC<{ onSelectTicker: (ticker: string) => void }> = ({ onSelectTicker }) => {
  const [selectedTicker, setSelectedTicker] = useState('RELIANCE.NS');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [verifFilter, setVerifFilter] = useState<'all' | 'verified' | 'unverified'>('all');

  const tickersList = ['RELIANCE.NS', 'TCS.NS', 'NVDA', 'AAPL', 'INFY.NS', 'MSFT', 'HDFCBANK.NS'];

  useEffect(() => {
    async function loadNews() {
      setLoading(true);
      try {
        const data = await api.getNews(selectedTicker);
        setNews(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadNews();
  }, [selectedTicker]);

  const filteredNews = news.filter(item => {
    if (sentimentFilter !== 'all' && item.sentiment !== sentimentFilter) return false;
    if (verifFilter === 'verified' && item.factCheckStatus !== 'Verified') return false;
    if (verifFilter === 'unverified' && item.factCheckStatus === 'Verified') return false;
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md transition-colors">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Financial News Intelligence & Fact Verification
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time corporate disclosures analyzed via <code>yiyanghkust/finbert-tone</code> with credibility grading.
          </p>
        </div>

        {/* Ticker Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          {tickersList.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTicker(t)}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                selectedTicker === t
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.replace('.NS', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs text-xs transition-colors">
        {/* Sentiment Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase font-semibold">FinBERT Tone:</span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {(['all', 'positive', 'neutral', 'negative'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSentimentFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer capitalize ${
                  sentimentFilter === s
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Verification Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase font-semibold">Verification:</span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {(['all', 'verified', 'unverified'] as const).map(v => (
              <button
                key={v}
                onClick={() => setVerifFilter(v)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer capitalize ${
                  verifFilter === v
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* News Feed Stream */}
      <div className="space-y-3">
        {filteredNews.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            No news items matching the active sentiment and verification filters.
          </div>
        ) : (
          filteredNews.map(item => (
            <article
              key={item.id}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-slate-700 shadow-xs transition-all space-y-2.5"
            >
              <div className="flex items-start justify-between gap-4">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors leading-snug"
                >
                  {item.headline}
                </a>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-cyan-600 transition-colors shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.summary}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-sans font-medium">
                  {item.source}
                </span>

                <span
                  className={`px-2 py-0.5 rounded font-semibold ${
                    item.sentiment === 'positive'
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                      : item.sentiment === 'negative'
                      ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {item.sentiment.toUpperCase()} ({(item.confidence * 100).toFixed(0)}%)
                </span>

                <span className="px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40 flex items-center gap-1 font-sans font-medium">
                  <CheckCircle2 className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                  <span>{item.factCheckStatus}</span>
                </span>

                <span className="text-slate-400 dark:text-slate-500 ml-auto">
                  {new Date(item.publishedAt).toLocaleDateString()}
                </span>
              </div>
            </article>
          ))
        )}
      </div>

      <DisclaimerBanner />
    </div>
  );
};
