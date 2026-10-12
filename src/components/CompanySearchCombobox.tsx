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

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Default suggested companies when empty query is focused
  const defaultSuggestions: StockSearchResult[] = [
    { ticker: 'RELIANCE.NS', name: 'Reliance Industries Ltd.', exchange: 'NSE', currency: 'INR', price: 2980.50, sector: 'Energy & Conglomerate' },
    { ticker: 'TCS.NS', name: 'Tata Consultancy Services', exchange: 'NSE', currency: 'INR', price: 4210.75, sector: 'Information Technology' },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', currency: 'USD', price: 128.40, sector: 'Semiconductors & AI' },
    { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currency: 'USD', price: 228.50, sector: 'Consumer Electronics' },
    { ticker: 'HDFCBANK.NS', name: 'HDFC Bank Ltd.', exchange: 'NSE', currency: 'INR', price: 1675.40, sector: 'Banking & Financial Services' },
    { ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', currency: 'USD', price: 442.10, sector: 'Enterprise Software & Cloud' },
    { ticker: 'INFY.NS', name: 'Infosys Ltd.', exchange: 'NSE', currency: 'INR', price: 1915.20, sector: 'Information Technology' },
    { ticker: 'SBIN.NS', name: 'State Bank of India', exchange: 'NSE', currency: 'INR', price: 815.60, sector: 'Banking & Financial Services' },
    { ticker: 'GOOGL', name: 'Alphabet Inc. (Google)', exchange: 'NASDAQ', currency: 'USD', price: 178.60, sector: 'Internet & Search' },
    { ticker: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', currency: 'USD', price: 248.90, sector: 'Automotive & Clean Energy' },
    { ticker: 'ZOMATO.NS', name: 'Zomato Ltd.', exchange: 'NSE', currency: 'INR', price: 268.50, sector: 'Consumer Internet' }
  ];

  // Fetch search results debounced
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(defaultSuggestions);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await api.searchStocks(trimmed);
        setResults(data && data.length > 0 ? data : []);
      } catch (err) {
        console.error('Error searching companies:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

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
    setResults(defaultSuggestions);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input Field */}
      <div
        className={`flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 transition-colors focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/30 ${
          compact ? 'py-1.5 text-xs' : 'text-sm'
        }`}
      >
        <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (!query.trim()) setResults(defaultSuggestions);
          }}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
        />

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
              const isIndia = item.ticker.endsWith('.NS') || item.exchange === 'NSE';
              const currSym = item.currency === 'INR' || isIndia ? '₹' : '$';

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
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>{item.exchange}</span>
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
                        {currSym}{item.price.toLocaleString()}
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
