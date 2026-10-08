/**
 * AlphaQuant AI - Financial News & Verification Intelligence Page
 * Powered by FinBERT tone architecture and Google Fact Check Tools claim verification.
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
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-indigo-400" />
            Financial News Intelligence & Fact Verification
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time corporate disclosures analyzed via <code>yiyanghkust/finbert-tone</code> with credibility grading.
          </p>
        </div>

        {/* Ticker Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-950 rounded-lg border border-slate-800">
          {tickersList.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTicker(t)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors cursor-pointer ${
                selectedTicker === t
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.replace('.NS', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
        {/* Sentiment Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-[11px] uppercase">FinBERT Tone:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['all', 'positive', 'neutral', 'negative'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSentimentFilter(s)}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer capitalize ${
                  sentimentFilter === s
                    ? 'bg-indigo-500/20 text-indigo-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Verification Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-[11px] uppercase">Verification Status:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['all', 'verified', 'unverified'] as const).map(v => (
              <button
                key={v}
                onClick={() => setVerifFilter(v)}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer capitalize ${
                  verifFilter === v
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-white'
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
          <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
            No news items matching the active sentiment and verification filters.
          </div>
        ) : (
          filteredNews.map(item => (
            <article
              key={item.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
            >
              <div className="flex items-start justify-between gap-4">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-slate-100 hover:text-cyan-400 transition-colors leading-snug"
                >
                  {item.headline}
                </a>
                <ExternalLink className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{item.summary}</p>

              {/* Zero-Pill Metadata Line with Typographic Separators */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 pt-1 border-t border-slate-800/60">
                <span className="text-slate-300 font-medium">{item.source}</span>
                <span aria-hidden="true">·</span>
                <span>{new Date(item.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    item.sentiment === 'positive'
                      ? 'text-emerald-400 font-semibold'
                      : item.sentiment === 'negative'
                      ? 'text-rose-400 font-semibold'
                      : 'text-slate-300'
                  }
                >
                  Tone: {item.sentiment.toUpperCase()} ({(item.confidence * 100).toFixed(0)}%)
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-cyan-400 inline-flex items-center gap-1 font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {item.factCheckStatus}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-400">
                  Credibility: {(item.sourceCredibility * 100).toFixed(0)}%
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
