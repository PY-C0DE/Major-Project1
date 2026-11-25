/**
 * Cookie & Consent Banner Stub
 * Persists essential vs analytics consent in localStorage with direct links to Terms and Privacy Policy.
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie } from 'lucide-react';

const CONSENT_STORAGE_KEY = 'alphaquant_cookie_consent_v1';

interface ConsentRecord {
  essential: true;
  analytics: boolean;
  timestamp: string;
}

interface Props {
  onOpenLegal: (doc: 'terms' | 'privacy') => void;
}

export const CookieConsentBanner: React.FC<Props> = ({ onOpenLegal }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!saved) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const saveConsent = (analytics: boolean) => {
    const record: ConsentRecord = {
      essential: true,
      analytics,
      timestamp: new Date().toISOString()
    };
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Ignore storage quota errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie and Privacy Consent Banner"
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-lg z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-300 dark:border-slate-700 rounded-2xl p-4 shadow-2xl text-xs text-slate-700 dark:text-slate-300 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 shrink-0">
          <Cookie className="w-4 h-4" />
        </div>
        <div className="space-y-2.5 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Cookie &amp; Privacy Preferences
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
            AlphaQuant AI uses essential local storage for authentication, theme, currency preferences, and compliance settings. Review our{' '}
            <button
              type="button"
              onClick={() => onOpenLegal('privacy')}
              className="text-cyan-600 dark:text-cyan-400 underline font-semibold cursor-pointer"
            >
              Privacy Policy
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => onOpenLegal('terms')}
              className="text-cyan-600 dark:text-cyan-400 underline font-semibold cursor-pointer"
            >
              Terms of Service
            </button>
            .
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => saveConsent(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
            >
              Essential Only
            </button>
            <button
              type="button"
              onClick={() => saveConsent(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer transition-colors shadow-xs"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
