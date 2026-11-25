/**
 * Authentication Modal
 * Sign Up, Login, and Instant Demo Access.
 * Supports Dark and Light themes.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Lock, Mail, User, Sparkles, AlertCircle, CheckCircle2, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export type AuthModalMode = 'login' | 'register' | 'forgot' | 'reset' | 'verify';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: AuthModalMode;
  initialToken?: string;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, defaultMode = 'login', initialToken = '' }) => {
  const { login, loginWithGoogle, register, enterDemoMode, refreshProfile } = useAuth();
  const [mode, setMode] = useState<AuthModalMode>(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tokenInput, setTokenInput] = useState(initialToken);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setTokenInput(initialToken || '');
      setError(null);
      setInfo(null);
    }
  }, [defaultMode, initialToken, isOpen]);

  // Auto-confirm verification token when arriving from an email verification link
  useEffect(() => {
    if (!isOpen || mode !== 'verify' || !initialToken) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setInfo(null);
      try {
        const res = await api.confirmEmailVerification(initialToken);
        if (!cancelled) {
          setInfo(res.message || 'Your email address is now verified.');
          await refreshProfile();
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Email verification failed or token expired.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mode, initialToken]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const switchMode = (nextMode: AuthModalMode) => {
    setMode(nextMode);
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        onClose();
      } else if (mode === 'register') {
        await register(name, email, password);
        onClose();
      } else if (mode === 'forgot') {
        const res = await api.forgotPassword(email);
        setInfo(res.message || 'If an account matches that email, password reset instructions have been sent.');
      } else if (mode === 'reset') {
        if (password.length < 8) {
          throw new Error('New password must be at least 8 characters long.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        const res = await api.resetPassword(tokenInput.trim(), password);
        setPassword('');
        setConfirmPassword('');
        setInfo(res.message || 'Password updated successfully. You can now sign in.');
      } else if (mode === 'verify') {
        const res = await api.confirmEmailVerification(tokenInput.trim());
        setInfo(res.message || 'Your email address has been verified.');
        await refreshProfile();
      }
    } catch (err: any) {
      setError(err?.message || 'Request failed. Please check details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    try {
      setLoading(true);
      setError(null);
      await enterDemoMode();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate demo user.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed before completing authentication.');
      } else {
        setError(err?.message || 'Google sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const headerTitle =
    mode === 'login'
      ? 'Client Access Login'
      : mode === 'register'
      ? 'Create Quantitative Account'
      : mode === 'forgot'
      ? 'Reset Your Password'
      : mode === 'reset'
      ? 'Choose New Password'
      : 'Confirm Email Verification';

  return typeof document !== 'undefined' ? createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 overscroll-contain overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 transition-colors max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
              {headerTitle}
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              AlphaQuant AI Financial Intelligence Core
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {info && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>{info}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'register' && (
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-mono mb-1">Full Name</label>
              <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white">
                <User className="w-3.5 h-3.5 text-slate-400 mr-2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan, CFA"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-transparent focus:outline-none placeholder-slate-400"
                />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-mono mb-1">Institutional Email</label>
              <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white">
                <Mail className="w-3.5 h-3.5 text-slate-400 mr-2" />
                <input
                  type="email"
                  required
                  placeholder="name@firm.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-transparent focus:outline-none placeholder-slate-400"
                />
              </div>
            </div>
          )}

          {(mode === 'reset' || mode === 'verify') && (
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-mono mb-1">
                {mode === 'reset' ? 'Password Reset Token' : 'Email Verification Token'}
              </label>
              <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white">
                <KeyRound className="w-3.5 h-3.5 text-slate-400 mr-2" />
                <input
                  type="text"
                  required
                  placeholder="Paste token from email"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  className="w-full bg-transparent focus:outline-none placeholder-slate-400 font-mono"
                />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'reset') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-600 dark:text-slate-400 font-mono">
                  {mode === 'reset' ? 'New Password (min 8 chars)' : 'Password'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline font-medium cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white">
                <Lock className="w-3.5 h-3.5 text-slate-400 mr-2" />
                <input
                  type="password"
                  required
                  minLength={mode === 'reset' ? 8 : 6}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-transparent focus:outline-none placeholder-slate-400"
                />
              </div>
            </div>
          )}

          {mode === 'reset' && (
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-mono mb-1">Confirm New Password</label>
              <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white">
                <Lock className="w-3.5 h-3.5 text-slate-400 mr-2" />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent focus:outline-none placeholder-slate-400"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors cursor-pointer text-xs mt-2 disabled:opacity-50 shadow-sm"
          >
            {loading
              ? 'Processing...'
              : mode === 'login'
              ? 'Sign In to Terminal'
              : mode === 'register'
              ? 'Create Account'
              : mode === 'forgot'
              ? 'Send Password Reset Email'
              : mode === 'reset'
              ? 'Reset Password'
              : 'Verify Email'}
          </button>
        </form>

        {/* Secondary navigation links */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1 space-y-1.5">
          {mode === 'login' && (
            <span>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold cursor-pointer"
              >
                Register here
              </button>
            </span>
          )}

          {mode === 'register' && (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold cursor-pointer"
              >
                Sign in
              </button>
            </span>
          )}

          {mode === 'forgot' && (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:underline font-medium cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" /> Back to sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode('reset')}
                className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold cursor-pointer"
              >
                Enter reset token
              </button>
            </div>
          )}

          {(mode === 'reset' || mode === 'verify') && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" /> Return to Sign In
            </button>
          )}
        </div>

        {/* Instant Demo Access & Google Sign-In Divider */}
        {(mode === 'login' || mode === 'register') && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full py-2 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
              </svg>
              <span>Continue with Google</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleDemoAccess}
              className="w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Instant Demo Session (Alex Morgan, CFA)</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null;
};
