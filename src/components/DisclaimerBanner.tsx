/**
 * Mandatory Financial Disclaimer
 * Distinguishes statistical machine-learning forecasts, intervals, and signals from financial advice.
 * Configurable via server compliance endpoint (/api/compliance/config) and VITE_DISCLAIMER_TEXT.
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

let cachedDisclaimerText: string | null = null;
let pendingDisclaimerPromise: Promise<string | null> | null = null;

async function resolveConfiguredDisclaimer(): Promise<string | null> {
  if (cachedDisclaimerText) return cachedDisclaimerText;
  if (!pendingDisclaimerPromise) {
    pendingDisclaimerPromise = api
      .getComplianceConfig()
      .then((cfg) => {
        if (cfg?.disclaimerText?.trim()) {
          cachedDisclaimerText = cfg.disclaimerText.trim();
        }
        return cachedDisclaimerText;
      })
      .catch(() => null);
  }
  return pendingDisclaimerPromise;
}

const CONTEXT_SUFFIX: Record<'forecast' | 'interval' | 'recommendation' | 'general', string> = {
  forecast:
    'Point forecasts are statistical out-of-sample approximations derived from historical bars and do not constitute investment advice.',
  interval:
    'Split-conformal intervals reflect empirical finite-sample residual quantiles and are not guaranteed trading boundaries.',
  recommendation:
    'Buy/Hold/Sell or rebalance suggestions are algorithmic portfolio heuristics, not personalized financial recommendations.',
  general:
    'All price forecasts, conformal prediction bands, market regime classifications, and sentiment scores are outputs of statistical machine-learning models and do not constitute financial, investment, legal, or tax advice.'
};

export const DisclaimerBanner: React.FC<{
  compact?: boolean;
  context?: 'forecast' | 'interval' | 'recommendation' | 'general';
}> = ({ compact, context = 'general' }) => {
  const { t } = useLanguage();
  const envFallback = (import.meta.env.VITE_DISCLAIMER_TEXT || '').trim() || t('footer.disclaimer');
  const [configuredText, setConfiguredText] = useState<string>(cachedDisclaimerText || envFallback);

  useEffect(() => {
    let active = true;
    resolveConfiguredDisclaimer().then((remote) => {
      if (active && remote) {
        setConfiguredText(remote);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (compact) {
    return (
      <div
        role="note"
        aria-label="Regulatory Financial Disclaimer"
        className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 py-1.5 px-2.5 bg-slate-100 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800/60"
      >
        <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span>{configuredText}</span>
      </div>
    );
  }

  return (
    <aside
      aria-label="Regulatory and Financial Disclaimer"
      className="w-full bg-slate-100/80 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800/80 rounded-xl p-4 my-6 text-xs text-slate-600 dark:text-slate-400 transition-colors"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-slate-800 dark:text-slate-300">
            Statistical Uncertainty &amp; Regulatory Financial Disclaimer
          </div>
          <p className="leading-relaxed">
            {configuredText} {CONTEXT_SUFFIX[context]} Past model accuracy or historical backtests do not guarantee future financial returns.
          </p>
        </div>
      </div>
    </aside>
  );
};

