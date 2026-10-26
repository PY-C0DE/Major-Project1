/**
 * Social Sentiment & Copy-Trading Feeds Modal
 * Aggregates community discussions from Reddit/WallStreetBets, FinTwit, and Institutional Quants.
 * Features verified copy-trading portfolio leaderboard with 1-click allocation mirroring.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  MessageSquare,
  ThumbsUp,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
  Filter,
  RefreshCw,
  CheckCircle2,
  Copy
} from 'lucide-react';
import { api } from '../services/api';
import { SocialDiscussion, VerifiedTrader } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPortfolioSynced?: () => void;
}

export const SocialCopyTradeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onPortfolioSynced
}) => {
  const [activeTab, setActiveTab] = useState<'discussions' | 'copy_trade'>('discussions');
  const [selectedTicker, setSelectedTicker] = useState<string>('ALL');
  const [feed, setFeed] = useState<SocialDiscussion[]>([]);
  const [traders, setTraders] = useState<VerifiedTrader[]>([]);
  const [loading, setLoading] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const filterTickers = ['ALL', 'NVDA', 'RELIANCE.NS', 'AAPL', 'TCS.NS', 'TSLA', 'GOOGL'];

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, selectedTicker]);

  async function loadData() {
    setLoading(true);
    try {
      const [discussions, verified] = await Promise.all([
        api.getSocialFeed(selectedTicker === 'ALL' ? undefined : selectedTicker),
        api.getVerifiedTraders()
      ]);
      setFeed(discussions);
      setTraders(verified);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleCopyTrade = async (trader: VerifiedTrader) => {
    setCopyingId(trader.id);
    setSuccessBanner(null);
    try {
      const res = await api.copyTraderPortfolio(trader.id);
      setSuccessBanner(res.message);
      onPortfolioSynced?.();
    } catch (err: any) {
      alert(err?.message || 'Failed to copy portfolio.');
    } finally {
      setCopyingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans transition-colors">
        {/* Terminal Header */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-slate-900 dark:text-white">
                  Social Sentiment & Copy-Trading
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-semibold">
                  Alpha Social Network
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Real-time Reddit/WSB and FinTwit sentiment streams with verified quant replication
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs & Ticker Filter */}
        <div className="px-5 py-3 bg-slate-100/70 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('discussions')}
              className={`px-3.5 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                activeTab === 'discussions'
                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-500 font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Community Sentiment ({feed.length})
            </button>
            <button
              onClick={() => setActiveTab('copy_trade')}
              className={`px-3.5 py-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'copy_trade'
                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-500 font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Verified Portfolios ({traders.length})</span>
            </button>
          </div>

          {activeTab === 'discussions' && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase">Filter:</span>
              {filterTickers.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTicker(t)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                    selectedTicker === t
                      ? 'bg-purple-600 dark:bg-purple-500 text-white dark:text-slate-950 font-bold shadow-xs'
                      : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t.replace('.NS', '')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-950/50 overflow-y-auto space-y-4 flex-1">
          {successBanner && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl flex items-center gap-2 text-xs font-mono text-emerald-800 dark:text-emerald-300 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successBanner}</span>
            </div>
          )}

          {/* TAB 1: DISCUSSIONS STREAM */}
          {activeTab === 'discussions' && (
            <div className="space-y-3">
              {feed.map((post) => (
                <div
                  key={post.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md transition-all space-y-3 text-left"
                >
                  {/* Card Header Row: Ticker, Author, Badge, Source · Sentiment & Time */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 font-bold text-xs font-mono">
                        {post.ticker}
                      </span>
                      <span className="text-xs font-bold font-sans text-slate-900 dark:text-slate-100">
                        {post.author}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {post.authorBadge}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">· {post.source}</span>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs font-mono ml-auto">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                        post.sentiment === 'BULLISH'
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : post.sentiment === 'BEARISH'
                          ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}>
                        {post.sentiment} ({(post.sentimentScore * 100).toFixed(0)}%)
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono shrink-0">{post.timeAgo}</span>
                    </div>
                  </div>

                  {/* Post Title */}
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-display text-left tracking-tight leading-snug">
                    {post.title}
                  </h3>

                  {/* Post Content */}
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-left">
                    {post.content}
                  </p>

                  {/* Verified Trade Call Box */}
                  {post.verifiedTrade && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-bold">Verified Trade Call:</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 font-bold border border-emerald-200/80 dark:border-emerald-800/80">
                          {post.verifiedTrade.action} @ {post.verifiedTrade.price}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/80 text-cyan-800 dark:text-cyan-300 font-bold ml-auto sm:ml-0">
                        <span className="text-[10px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold">Target</span>
                        <span>{post.verifiedTrade.target}</span>
                      </div>
                    </div>
                  )}

                  {/* Upvotes & Comments */}
                  <div className="flex items-center gap-5 pt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                      <ThumbsUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span className="font-medium">{post.upvotes.toLocaleString()} upvotes</span>
                    </span>
                    <span className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span className="font-medium">{post.commentsCount} comments</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: VERIFIED COPY-TRADE LEADERBOARD */}
          {activeTab === 'copy_trade' && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs font-mono text-purple-900 dark:text-purple-200">
                Institutional quantitative portfolio managers verified by audit history. Copying a portfolio will automatically calculate and rebalance matching asset allocations in your active account.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {traders.map((trader) => (
                  <div
                    key={trader.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 text-left"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                            {trader.name}
                          </h4>
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-mono">
                            {trader.handle}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-mono font-bold flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {trader.strategyDescription}
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 dark:bg-slate-950/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block">30d Return</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">+{trader.return30dPct}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block">Sharpe Ratio</span>
                        <span className="text-cyan-600 dark:text-cyan-400 font-bold text-sm">{trader.sharpeRatio}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block">Win Rate</span>
                        <span className="text-slate-900 dark:text-white font-bold">{trader.winRatePct}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block">AUM Managed</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold">{trader.aum}</span>
                      </div>
                    </div>

                    {/* Asset allocation preview */}
                    <div className="space-y-1 text-xs font-mono">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Top Holdings:</span>
                      <div className="flex flex-wrap gap-1">
                        {trader.holdings.map(h => (
                          <span key={h.ticker} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300 font-medium">
                            {h.ticker.replace('.NS', '')} {h.weightPct}%
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 1-Click Copy Trade Button */}
                    <button
                      onClick={() => handleCopyTrade(trader)}
                      disabled={copyingId === trader.id}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-purple-600/20"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copyingId === trader.id ? 'Synchronizing Holdings...' : 'Copy Portfolio Allocations'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
