/**
 * CompanySearchCombobox
 * Rich company search & autocomplete combobox allowing users to search
 * by company name (e.g. "Reliance", "Tata Consultancy", "Apple", "Nvidia", "State Bank of India")
 * or ticker symbol. Displays company name, ticker, exchange, sector, and live price.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, TrendingUp, TrendingDown, Building2, Globe } from 'lucide-react';
import { api } from '../services/api';
import { StockSearchResult } from '../types';
import { ConvertedPrice } from './ConvertedPrice';
import { MarketStatusBadge } from './MarketStatusBadge';

interface Props {
  onSelect: (item: StockSearchResult) => void;
  placeholder?: string;
  initialValue?: string;
  className?: string;
  autoFocus?: boolean;
  compact?: boolean;
  showPrice?: boolean;
}

export const CompanySearchCombobox: React.FC<Props> = ({
  onSelect,
  placeholder = 'Type company name (e.g. Reliance, Nvidia, Apple)...',
  initialValue = '',
  className = '',
  autoFocus = false,
  compact = false,
  showPrice = true
}) => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Animated typewriter queries (matching Video 2)
  const typewriterQueries = [
    'Search ticker (e.g. NVDA, RELIANCE)...',
    'Try "Apple" for conformal risk bounds...',
    'Try "TCS" for market regime prediction...',
    'Search "Nvidia" for sentiment score...'
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [typedPlaceholder, setTypedPlaceholder] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typewriter effect matching Video 2
  useEffect(() => {
    if (isInputFocused || query) return;

    const currentPrompt = typewriterQueries[placeholderIndex];
    const speed = isDeleting ? 25 : 60;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (typedPlaceholder.length < currentPrompt.length) {
          setTypedPlaceholder(currentPrompt.slice(0, typedPlaceholder.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2200);
        }
      } else {
        if (typedPlaceholder.length > 0) {
          setTypedPlaceholder(currentPrompt.slice(0, typedPlaceholder.length - 1));
        } else {
          setIsDeleting(false);
          setPlaceholderIndex(prev => (prev + 1) % typewriterQueries.length);
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [typedPlaceholder, isDeleting, placeholderIndex, isInputFocused, query]);

  const [initialSuggestions, setInitialSuggestions] = useState<StockSearchResult[]>([]);

  const mapMasterToSearchResult = (item: import('../types').TickerMasterItem): StockSearchResult => ({
    ticker: item.symbol,
    name: item.name,
    exchange: item.exchangeCode || item.exchange,
    exchangeCode: item.exchange,
    country: item.country,
    currency: item.currency,
    timezone: item.timezone,
    assetType: item.assetType,
    price: item.basePrice ?? undefined,
    sector: item.sector
  });

  // Load initial ranked universe slice from ticker_master
  useEffect(() => {
    let active = true;
    api
      .searchTickersMaster({ limit: 12 })
      .then((res) => {
        if (!active) return;
        const mapped = (res.items || []).map(mapMasterToSearchResult);
        setInitialSuggestions(mapped);
        if (!query.trim()) {
          setResults(mapped);
        }
      })
      .catch(() => {
        // Ignore transient startup failure; live search remains active
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch search results debounced from PostgreSQL ticker_master (+ Yahoo discovery fallback)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(initialSuggestions);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const masterRes = await api.searchTickersMaster({ q: trimmed, limit: 12 });
        let combined = (masterRes.items || []).map(mapMasterToSearchResult);

        if (trimmed.length >= 2 && combined.length < 6) {
          const remote = await api.searchStocks(trimmed);
          const seen = new Set(combined.map((c) => c.ticker.toUpperCase()));
          for (const item of remote) {
            if (!seen.has(item.ticker.toUpperCase())) {
              seen.add(item.ticker.toUpperCase());
              combined.push(item);
            }
          }
        }

        if (!cancelled) {
          setResults(combined.slice(0, 15));
        }
      } catch {
        if (!cancelled) {
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, initialSuggestions]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: StockSearchResult) => {
    setQuery(`${item.name} (${item.ticker})`);
    setIsOpen(false);
    onSelect(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex]);
      } else if (results.length > 0) {
        handleSelect(results[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const clearInput = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery('');
    setResults(initialSuggestions);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input Field */}
      <div
        className={`relative flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 transition-all focus-within:border-cyan-500/80 focus-within:ring-2 focus-within:ring-cyan-500/20 ${
          compact ? 'py-1 text-xs' : 'py-2 text-sm'
        }`}
      >
        <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={query}
            autoFocus={autoFocus}
            onChange={e => {
              setQuery(e.target.value);
              setIsOpen(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => {
              setIsInputFocused(true);
              setIsOpen(true);
              if (!query.trim()) setResults(initialSuggestions);
            }}
            onBlur={() => {
              setIsInputFocused(false);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-transparent focus:outline-none"
          />

          {/* Typewriter animated placeholder overlay matching Video 2 */}
          {!query && (
            <div
              onClick={() => inputRef.current?.focus()}
              className="absolute inset-0 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 truncate"
            >
              <span>{isInputFocused ? placeholder : (typedPlaceholder || placeholder)}</span>
              {!isInputFocused && (
                <span className="inline-block w-0.5 h-3.5 bg-cyan-500 dark:bg-cyan-400 ml-0.5 animate-blink" />
              )}
            </div>
          )}
        </div>

        {loading ? (
          <Loader2 className="w-4 h-4 text-cyan-500 animate-spin shrink-0 ml-1.5" />
        ) : query ? (
          <button
            type="button"
            onClick={clearInput}
            className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 text-xs max-h-80 overflow-y-auto animate-fadeIn divide-y divide-slate-100 dark:divide-slate-800/60">
          <div className="p-2 bg-slate-50 dark:bg-slate-950/80 text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>{query.trim() ? `Search Results for "${query}"` : 'Popular Companies'}</span>
            <span>{results.length} companies</span>
          </div>

          {results.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              <Building2 className="w-6 h-6 mx-auto mb-2 text-slate-400 opacity-60" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No company found matching "{query}"</p>
              <p className="text-[11px] text-slate-400 mt-1">Try typing another company name like "Reliance", "Tata", "Nvidia", or "Apple".</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={`${item.ticker}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected ? 'bg-cyan-500/10 dark:bg-cyan-500/15' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center shrink-0 font-bold text-xs text-slate-700 dark:text-slate-300 font-mono">
                      {item.ticker.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 font-semibold border border-cyan-200 dark:border-cyan-800/60">
                          {item.ticker}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {item.exchange}
                        </span>
                        {item.exchangeCode && item.exchangeCode !== item.exchange && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {item.exchangeCode}
                          </span>
                        )}
                        {item.country && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                            {item.country}
                          </span>
                        )}
                        {item.currency && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                            {item.currency}
                          </span>
                        )}
                        <MarketStatusBadge
                          ticker={item.ticker}
                          exchange={item.exchange}
                          exchangeTimezoneName={item.timezone}
                          compact
                          showTime={false}
                        />
                        {item.sector && (
                          <>
                            <span>·</span>
                            <span className="truncate max-w-[140px]">{item.sector}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {showPrice && item.price !== undefined && (
                    <div className="text-right shrink-0 font-mono">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        <ConvertedPrice amount={item.price} currency={item.currency} ticker={item.ticker} />
                      </span>
                      {item.changePercent !== undefined && (
                        <span
                          className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${
                            item.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {item.changePercent >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
