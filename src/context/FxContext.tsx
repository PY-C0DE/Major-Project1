/**
 * AlphaQuant AI - Real-Time Foreign Exchange (FX) Context
 * Polls live market FX rates and performs instant cross-currency conversions
 * anchored to the user's preferred home currency.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { getCurrencySymbol } from '../utils/currency';

export interface ConversionResult {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  convertedAmount: number;
  rate: number;        // 1 fromCurrency = rate * toCurrency
  inverseRate: number; // 1 toCurrency = inverseRate * fromCurrency
  usdAmount: number | null;
  usdRate: number | null;
  isForeign: boolean;
  isLive: boolean;
  lastUpdated: string;
  source: string;
}

interface FxContextValue {
  rates: Record<string, number>; // Units per 1 USD
  homeCurrency: string;
  setHomeCurrency: (currency: string) => void;
  isLive: boolean;
  lastUpdated: string;
  source: string;
  convert: (amount: number, fromCurrency: string, targetCurrency?: string) => ConversionResult;
  refreshRates: () => Promise<void>;
}

const DEFAULT_RATES: Record<string, number> = {
  USD: 1,
  INR: 85.5,
  KRW: 1380.0,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 154.0,
  CNY: 7.22,
  HKD: 7.78,
  TWD: 32.1,
  CAD: 1.39,
  AUD: 1.52,
  SGD: 1.33,
  CHF: 0.88,
  BRL: 5.75
};

const FxContext = createContext<FxContextValue | undefined>(undefined);

const STORAGE_KEY = 'alphaquant_home_currency';

export const FxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateProfile } = useAuth();
  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_RATES);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [source, setSource] = useState<string>('Reference FX Baseline');

  const [homeCurrency, setHomeCurrencyState] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved.toUpperCase();
    return user?.currencyPreference || 'INR';
  });

  // Sync if user logs in / updates currencyPreference in AccountPage
  useEffect(() => {
    if (user?.currencyPreference) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved || (saved !== user.currencyPreference && (saved === 'INR' || saved === 'USD'))) {
        setHomeCurrencyState(user.currencyPreference);
      }
    }
  }, [user?.currencyPreference]);

  const setHomeCurrency = useCallback(
    (curr: string) => {
      const normalized = curr.toUpperCase().trim();
      setHomeCurrencyState(normalized);
      localStorage.setItem(STORAGE_KEY, normalized);
      if (user && (normalized === 'INR' || normalized === 'USD')) {
        updateProfile({ currencyPreference: normalized });
      }
    },
    [user, updateProfile]
  );

  const refreshRates = useCallback(async () => {
    try {
      const data = await api.getFxRates();
      if (data && data.rates) {
        setRates(data.rates);
        setIsLive(data.isLive);
        setLastUpdated(data.timestamp);
        setSource(data.source);
      }
    } catch {
      // Keep existing or fallback rates silently
    }
  }, []);

  useEffect(() => {
    refreshRates();
    const timer = setInterval(refreshRates, 60 * 1000);
    return () => clearInterval(timer);
  }, [refreshRates]);

  const convert = useCallback(
    (amount: number, fromCurrency: string, targetCurrency?: string): ConversionResult => {
      const from = (fromCurrency || 'USD').toUpperCase().trim();
      const to = (targetCurrency || homeCurrency || 'INR').toUpperCase().trim();

      const fromPerUsd = rates[from] ?? 1;
      const toPerUsd = rates[to] ?? 1;

      // Cross rate: 1 unit of `from` = (toPerUsd / fromPerUsd) units of `to`
      const rate = from === to ? 1 : toPerUsd / fromPerUsd;
      const inverseRate = rate > 0 ? 1 / rate : 1;
      const convertedAmount = amount * rate;

      const usdRate = from !== 'USD' && to !== 'USD' ? 1 / fromPerUsd : null;
      const usdAmount = usdRate !== null ? amount * usdRate : null;

      return {
        amount,
        fromCurrency: from,
        toCurrency: to,
        convertedAmount,
        rate,
        inverseRate,
        usdAmount,
        usdRate,
        isForeign: from !== to,
        isLive,
        lastUpdated,
        source
      };
    },
    [rates, homeCurrency, isLive, lastUpdated, source]
  );

  return (
    <FxContext.Provider
      value={{
        rates,
        homeCurrency,
        setHomeCurrency,
        isLive,
        lastUpdated,
        source,
        convert,
        refreshRates
      }}
    >
      {children}
    </FxContext.Provider>
  );
};

export const HOME_CURRENCY_OPTIONS = [
  { code: 'INR', symbol: getCurrencySymbol('INR'), name: 'Indian Rupee' },
  { code: 'USD', symbol: getCurrencySymbol('USD'), name: 'US Dollar' },
  { code: 'EUR', symbol: getCurrencySymbol('EUR'), name: 'Euro' },
  { code: 'GBP', symbol: getCurrencySymbol('GBP'), name: 'British Pound' },
  { code: 'JPY', symbol: getCurrencySymbol('JPY'), name: 'Japanese Yen' },
  { code: 'KRW', symbol: getCurrencySymbol('KRW'), name: 'Korean Won' }
];

export function useFx(): FxContextValue {
  const ctx = useContext(FxContext);
  if (!ctx) {
    throw new Error('useFx must be used within an FxProvider');
  }
  return ctx;
}
