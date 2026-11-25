/**
 * Compliance Legal Skeleton Pages (Terms of Service & Privacy Policy)
 * Displays configurable operator placeholders sourced from /api/compliance/config.
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Lock, ShieldCheck, Building2, Mail } from 'lucide-react';
import { api } from '../services/api';
import { ComplianceConfig } from '../types';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface LegalPageProps {
  initialDoc: 'terms' | 'privacy';
  onBack?: () => void;
  onSwitchDoc?: (doc: 'terms' | 'privacy') => void;
  onNavigateAccount?: () => void;
  isAuthenticated?: boolean;
}

const DEFAULT_CONFIG: ComplianceConfig = {
  disclaimerText:
    'Quantitative Analytics & Conformal Prediction Simulation — Not Financial Advice. Historical walk-forward accuracy and split-conformal coverage bounds do not guarantee future performance.',
  operatorLegalEntity: '[OPERATOR_LEGAL_ENTITY]',
  operatorAddress: '[OPERATOR_ADDRESS]',
  operatorContactEmail: '[OPERATOR_CONTACT_EMAIL]',
  dpoContact: '[DPO_CONTACT]',
  governingJurisdiction: '[GOVERNING_JURISDICTION]',
  updatedAt: new Date().toISOString().split('T')[0]
};

export const LegalPage: React.FC<LegalPageProps> = ({
  initialDoc,
  onBack,
  onSwitchDoc,
  onNavigateAccount,
  isAuthenticated
}) => {
  const [doc, setDoc] = useState<'terms' | 'privacy'>(initialDoc);
  const [config, setConfig] = useState<ComplianceConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    setDoc(initialDoc);
  }, [initialDoc]);

  useEffect(() => {
    let active = true;
    api
      .getComplianceConfig()
      .then((remote) => {
        if (active && remote) setConfig(remote);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleSelectDoc = (next: 'terms' | 'privacy') => {
    setDoc(next);
    onSwitchDoc?.(next);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 font-sans text-left animate-fadeIn">
      {/* Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              aria-label="Back to Platform"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
              {doc === 'terms' ? (
                <FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              ) : (
                <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{doc === 'terms' ? 'Terms of Service (Compliance Skeleton)' : 'Privacy & Data Protection Policy (Compliance Skeleton)'}</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              Effective Date: {config.updatedAt} · Operator: {config.operatorLegalEntity}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleSelectDoc('terms')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              doc === 'terms'
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Terms of Service
          </button>
          <button
            type="button"
            onClick={() => handleSelectDoc('privacy')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              doc === 'privacy'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Privacy Policy
          </button>
        </div>
      </div>

      {/* Operator Metadata Card */}
      <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase text-slate-400 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Legal Entity
          </span>
          <div className="font-semibold text-slate-800 dark:text-slate-200 break-words">
            {config.operatorLegalEntity}
          </div>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase text-slate-400">Registered Address</span>
          <div className="font-semibold text-slate-800 dark:text-slate-200 break-words">
            {config.operatorAddress}
          </div>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase text-slate-400 flex items-center gap-1">
            <Mail className="w-3 h-3" /> Operator / DPO Contact
          </span>
          <div className="font-semibold text-slate-800 dark:text-slate-200 break-words">
            {config.operatorContactEmail} / {config.dpoContact}
          </div>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Jurisdiction
          </span>
          <div className="font-semibold text-slate-800 dark:text-slate-200 break-words">
            {config.governingJurisdiction}
          </div>
        </div>
      </div>

      {doc === 'terms' ? (
        <article className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              1. Operator Identity &amp; Scope
            </h2>
            <p>
              These Terms of Service govern access to AlphaQuant AI, operated by{' '}
              <strong>{config.operatorLegalEntity}</strong> located at{' '}
              <strong>{config.operatorAddress}</strong>. Contact inquiries may be addressed to{' '}
              <strong>{config.operatorContactEmail}</strong>. This document is a compliance template skeleton intended for counsel review prior to commercial deployment.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              2. Educational &amp; Quantitative Research Use Only — Not Investment Advice
            </h2>
            <p>
              AlphaQuant AI delivers quantitative statistical outputs including out-of-sample walk-forward estimates, split-conformal prediction intervals, regime heuristics, options surface Greeks, and sentiment aggregates strictly for educational and research purposes. Nothing presented constitutes investment advice, fiduciary counsel, brokerage execution, or an offer to buy or sell any security.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              3. Third-Party Market Data &amp; Availability Caveats
            </h2>
            <p>
              Historical OHLCV bars, live quotes, FX reference rates, and financial news feeds are sourced from third-party market data providers (e.g., Yahoo Finance or Twelve Data). Delayed feeds, exchange holiday schedules, upstream outages, or incomplete history may render forecasts or conformal metrics temporarily unavailable. We do not warrant uninterrupted real-time availability or suitability for live capital allocation.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              4. Account Responsibilities &amp; Acceptable Use
            </h2>
            <p>
              Users are responsible for safeguarding account credentials, completing email verification when configured, avoiding automated abuse or circumvention of API rate limits, and maintaining independent risk controls before placing live trades with any licensed broker.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              5. Limitation of Liability &amp; Governing Law
            </h2>
            <p>
              To the maximum extent permitted under the laws of <strong>{config.governingJurisdiction}</strong>,{' '}
              <strong>{config.operatorLegalEntity}</strong> shall not be liable for trading losses, lost profits, or consequential damages arising from reliance on statistical forecasts or market data delays. Disputes shall be governed exclusively by the laws of{' '}
              <strong>{config.governingJurisdiction}</strong>.
            </p>
          </section>
        </article>
      ) : (
        <article className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              1. Data Controller &amp; Protection Officer
            </h2>
            <p>
              Personal information is processed by <strong>{config.operatorLegalEntity}</strong> ({config.operatorAddress}). Privacy inquiries and data-subject requests may be directed to our Data Protection Officer at{' '}
              <strong>{config.dpoContact}</strong> or general support at{' '}
              <strong>{config.operatorContactEmail}</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              2. Information We Collect &amp; Storage Security
            </h2>
            <p>
              When you register or configure preferences, we store your display name, email address, email-verification status, salted bcrypt password hash (never exported or exposed via APIs), timezone, preferred currency, portfolio holdings ledger, watchlists, alert rules, and logged prediction snapshots inside our PostgreSQL database.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              3. Browser Storage, Session Tokens &amp; Consent Preferences
            </h2>
            <p>
              Essential browser storage (`localStorage`) is used solely for authenticated session continuity, UI theme/language state, and recording your cookie/consent banner choice (`alphaquant_cookie_consent_v1`). Optional analytics consent can be updated at any time by clearing site storage.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              4. Third-Party Processors
            </h2>
            <p>
              Transactional verification and password-reset emails are transmitted solely when an operator configures an SMTP relay or Resend API processor. Market data queries transmit stock ticker symbols—not user PII—to market data providers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              5. Your Data Subject Rights (Export &amp; Permanent Erasure — GDPR / CPRA)
            </h2>
            <p>
              Authenticated users can directly exercise data portability via <code>GET /api/account/export</code> and permanent erasure via <code>DELETE /api/account</code> (cascading deletion across portfolios, watchlists, alerts, prediction history, and verification tokens).
            </p>
            {isAuthenticated && onNavigateAccount && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onNavigateAccount}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors"
                >
                  Open Account Data Export &amp; Deletion Controls
                </button>
              </div>
            )}
          </section>
        </article>
      )}

      <DisclaimerBanner />
    </div>
  );
};

export default LegalPage;
