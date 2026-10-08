/**
 * Mandatory Financial Disclaimer
 * Explicitly distinguishes statistical machine learning forecasts from financial advice.
 * Fully compatible with dark and light themes.
 */

import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export const DisclaimerBanner: React.FC<{ compact?: boolean }> = ({ compact }) => {
  if (compact) {
    return (
      <div className="text-[11px] text-slate-600 dark:text-slate-500 flex items-center gap-1.5 py-1 px-2 bg-slate-100 dark:bg-slate-900/30 rounded border border-slate-200 dark:border-slate-800/40">
        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>
          Educational & research platform only. Prediction intervals represent statistical uncertainty and are not financial guarantees.
        </span>
      </div>
    );
  }

  return (
    <aside aria-label="Regulatory and Financial Disclaimer" className="w-full bg-slate-100/80 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800/80 rounded-xl p-4 my-6 text-xs text-slate-600 dark:text-slate-400 transition-colors">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-slate-800 dark:text-slate-300">
            Statistical Uncertainty & Regulatory Financial Disclaimer
          </div>
          <p className="leading-relaxed">
            AlphaQuant AI is designed strictly for quantitative research, backtesting, and academic education. All price forecasts, conformal prediction bands, market regime classifications, and sentiment scores are outputs of statistical machine-learning models. They do not constitute financial, investment, legal, or tax advice. Market prices are subject to systemic risk and past model accuracy does not guarantee future financial returns.
          </p>
        </div>
      </div>
    </aside>
  );
};
