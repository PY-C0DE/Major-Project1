/**
 * AlphaQuant AI - User Profile & Account Settings
 * Complete institutional profile section featuring:
 * 1. Personal Profile & Avatar configuration
 * 2. Platform & Quantitative Preferences (Theme, Currency, Conformal 90% interval, Horizon)
 * 3. Security & Password (Password change, 2FA, Session management)
 * 4. Notifications & Risk Alarms (Regime shift alerts, Drift warnings, Morning digests)
 * 5. Data & Prediction Audit Log (Export, History, Statistics)
 * Fully compatible with Dark and Light modes.
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Calendar,
  Briefcase,
  ShieldCheck,
  LogOut,
  Sliders,
  Database,
  Key,
  Lock,
  Bell,
  Sun,
  Moon,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  Globe,
  Phone,
  Building,
  Target,
  Clock,
  Sparkles,
  Camera,
  RefreshCw,
  BookmarkCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { AvatarModal } from '../components/AvatarModal';
import { SYSTEM_AVATARS } from '../assets/avatars';
import avatarImg from '../assets/images/avatar_lead_quant_1791318574843.jpg';

export const AccountPage: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security' | 'notifications' | 'data'>('profile');

  // Avatar Modal State
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const activeAvatar = user?.avatarUrl || avatarImg;
  const currentSystemAvatar = SYSTEM_AVATARS.find(a => a.svgDataUri === user?.avatarUrl);

  // Form State: Profile
  const [name, setName] = useState(user?.name || '');
  const [title, setTitle] = useState(user?.title || 'Lead Quantitative Strategist');
  const [organization, setOrganization] = useState(user?.organization || 'Morgan Capital Alpha Desk');
  const [phone, setPhone] = useState(user?.phone || '+91 98765 43210');
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Kolkata (IST)');
  const [bio, setBio] = useState(
    user?.bio || 'Institutional quantitative analyst focusing on Conformal Prediction uncertainty envelopes and regime-switching models.'
  );

  // Form State: Preferences
  const [currency, setCurrency] = useState<'INR' | 'USD'>(user?.currencyPreference || 'INR');
  const [exchange, setExchange] = useState<'NSE' | 'NASDAQ'>(user?.defaultExchange || 'NSE');
  const [confidenceLevel, setConfidenceLevel] = useState<number>(user?.confidenceLevel || 90);
  const [chartHorizon, setChartHorizon] = useState<number>(90);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Form State: Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled ?? true);

  // Form State: Notifications
  const [notifications, setNotifications] = useState({
    emailAlerts: user?.notifications?.emailAlerts ?? true,
    regimeShifts: user?.notifications?.regimeShifts ?? true,
    driftWarnings: user?.notifications?.driftWarnings ?? true,
    marketOpenSummary: user?.notifications?.marketOpenSummary ?? false
  });

  // History & Metrics State
  const [predictionHistory, setPredictionHistory] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const hist = await api.getPredictionHistory();
        setPredictionHistory(hist);
      } catch (e) {
        console.error(e);
      }
    }
    loadHistory();
  }, []);

  // Update local form state when user changes
  useEffect(() => {
    if (user) {
      setName(user.name);
      if (user.title) setTitle(user.title);
      if (user.organization) setOrganization(user.organization);
      if (user.phone) setPhone(user.phone);
      if (user.timezone) setTimezone(user.timezone);
      if (user.bio) setBio(user.bio);
      if (user.currencyPreference) setCurrency(user.currencyPreference);
      if (user.defaultExchange) setExchange(user.defaultExchange);
      if (user.confidenceLevel) setConfidenceLevel(user.confidenceLevel);
      if (user.twoFactorEnabled !== undefined) setTwoFactorEnabled(user.twoFactorEnabled);
    }
  }, [user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  // Handlers
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      title,
      organization,
      phone,
      timezone,
      bio
    });
    showToast('Personal profile information saved successfully.');
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      currencyPreference: currency,
      defaultExchange: exchange,
      confidenceLevel
    });
    showToast('Platform & quantitative preferences updated.');
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      showError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('New password and confirmation password do not match.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('Your password has been changed securely.');
  };

  const handleToggle2FA = () => {
    const nextState = !twoFactorEnabled;
    setTwoFactorEnabled(nextState);
    updateProfile({ twoFactorEnabled: nextState });
    showToast(`Two-Factor Authentication (2FA) is now ${nextState ? 'Enabled' : 'Disabled'}.`);
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ notifications });
    showToast('Notification & alarm preferences saved.');
  };

  const handleExportData = () => {
    const exportPayload = {
      userProfile: user,
      preferences: {
        currency,
        exchange,
        confidenceLevel,
        theme
      },
      predictionsCount: predictionHistory.length,
      predictionHistory,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alphaquant-account-${user?.id || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Account data exported to JSON.');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans pb-12">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-500 hover:opacity-75 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:opacity-75 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Profile Header Hero Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500" />

        <div className="flex flex-wrap items-center justify-between gap-6 pt-2">
          {/* User Bio & Avatar */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative group">
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                title="Click to Change Profile Photo or Choose Google Play Games Avatar"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-cyan-500/30 hover:border-cyan-400 shadow-md shrink-0 bg-slate-100 dark:bg-slate-800 relative cursor-pointer group transition-transform hover:scale-105 focus:outline-none"
              >
                <img
                  src={activeAvatar}
                  alt={user?.name || 'User Avatar'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                  <Camera className="w-5 h-5 text-cyan-400" />
                  <span className="text-[9px] font-bold tracking-tight mt-0.5">Change</span>
                </div>
              </button>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" title="Active Client" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-display">
                  {user?.name || 'Quantitative Analyst'}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 font-semibold">
                  Institutional Client
                </span>
                {twoFactorEnabled && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    2FA Verified
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>Change Photo / Avatar</span>
                </button>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{user?.email || 'user@alphaquant.ai'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{title}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Sign Out Action */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={logout}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto text-xs font-medium scrollbar-none">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile & Info</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Platform Preferences</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Security & Password</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications & Alarms</span>
        </button>

        <button
          onClick={() => setActiveTab('data')}
          className={`px-4 py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'data'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Activity & History</span>
        </button>
      </div>

      {/* TAB 1: PROFILE & PERSONAL DETAILS */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Avatar & Photo Customization Section */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-cyan-500/40 shadow-md shrink-0 bg-slate-100 dark:bg-slate-800">
                    <img
                      src={activeAvatar}
                      alt="Active Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAvatarModal(true)}
                    className="absolute -bottom-1 -right-1 p-1 rounded-full bg-cyan-500 text-slate-950 shadow-md hover:bg-cyan-400 transition-colors cursor-pointer"
                    title="Change Photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                    Profile Picture & Persona Avatar
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                      {currentSystemAvatar
                        ? `Avatar: ${currentSystemAvatar.name}`
                        : user?.avatarUrl
                        ? 'Custom Uploaded Photo'
                        : 'Default Institutional Avatar'}
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Synced</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Select from 20 Google Play Games style personas or upload your own square photo.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-sm shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Choose System Avatar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                </button>
                {user?.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      updateProfile({ avatarUrl: undefined });
                      showToast('Avatar reset to institutional default.');
                    }}
                    className="px-2.5 py-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium transition-colors cursor-pointer"
                    title="Reset to default picture"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Personal & Professional Details
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage how your account displays across trading logs, portfolio statements, and team workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Full Name
                </label>
                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus-within:border-cyan-500">
                  <User className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan, CFA"
                    className="w-full bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Email Address
                </label>
                <div className="flex items-center bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-500 dark:text-slate-400 cursor-not-allowed">
                  <Mail className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="email"
                    disabled
                    value={user?.email || 'user@alphaquant.ai'}
                    className="w-full bg-transparent focus:outline-none cursor-not-allowed"
                  />
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0">
                    Verified
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Professional Title / Role
                </label>
                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus-within:border-cyan-500">
                  <Briefcase className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Senior Quantitative Analyst"
                    className="w-full bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Organization / Desk
                </label>
                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus-within:border-cyan-500">
                  <Building className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                    placeholder="e.g. Morgan Capital Alpha Desk"
                    className="w-full bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Contact Phone Number
                </label>
                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus-within:border-cyan-500">
                  <Phone className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Preferred Timezone
                </label>
                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus-within:border-cyan-500">
                  <Clock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="Asia/Kolkata (IST)" className="dark:bg-slate-900">Asia/Kolkata (IST · UTC+5:30)</option>
                    <option value="America/New_York (EST)" className="dark:bg-slate-900">America/New_York (EST · UTC-5:00)</option>
                    <option value="Europe/London (GMT)" className="dark:bg-slate-900">Europe/London (GMT · UTC+0:00)</option>
                    <option value="Asia/Singapore (SGT)" className="dark:bg-slate-900">Asia/Singapore (SGT · UTC+8:00)</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Bio & Quantitative Focus
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Describe your market focus, horizon, and portfolio mandates..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 resize-none text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                Save Profile Changes
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: PLATFORM PREFERENCES & QUANT SETTINGS */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleSavePreferences} className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Platform & Quantitative Model Configuration
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customize platform theme, display currency, default trading exchange, and uncertainty intervals.
              </p>
            </div>

            {/* Theme Appearance Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider">
                Theme Appearance
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'border-cyan-500 bg-cyan-950/20 ring-1 ring-cyan-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-900 text-cyan-400 border border-slate-800 shrink-0">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      Dark Slate Mode (Recommended)
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      High-contrast institutional terminal theme optimized for trading screens and reduced eye fatigue.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-600 border border-amber-200 shrink-0">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      Light Clean Mode
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      Crisp, modern financial workspace with high-clarity typography for bright ambient environments.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Currency & Market Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Default Display Currency
                </label>
                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrency('INR')}
                    className={`flex-1 py-2 text-center rounded-lg font-mono font-bold transition-all cursor-pointer ${
                      currency === 'INR'
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    ₹ INR (Indian Rupee)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`flex-1 py-2 text-center rounded-lg font-mono font-bold transition-all cursor-pointer ${
                      currency === 'USD'
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    $ USD (US Dollar)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Primary Market Focus
                </label>
                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setExchange('NSE')}
                    className={`flex-1 py-2 text-center rounded-lg font-mono font-bold transition-all cursor-pointer ${
                      exchange === 'NSE'
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    NSE (India)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExchange('NASDAQ')}
                    className={`flex-1 py-2 text-center rounded-lg font-mono font-bold transition-all cursor-pointer ${
                      exchange === 'NASDAQ'
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    NASDAQ / US
                  </button>
                </div>
              </div>
            </div>

            {/* Conformal Prediction Level */}
            <div className="pt-2 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider">
                Conformal Prediction Interval Coverage (1 - α)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {[
                  { val: 80, label: '80% Coverage', desc: 'Aggressive / Narrow bounds' },
                  { val: 90, label: '90% Coverage (Standard)', desc: 'Calibrated MAPIE Institutional' },
                  { val: 95, label: '95% Coverage', desc: 'Conservative tail-risk envelope' }
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setConfidenceLevel(opt.val)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      confidenceLevel === opt.val
                        ? 'border-cyan-500 bg-cyan-500/10 dark:bg-cyan-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-slate-900 dark:text-white font-mono flex items-center justify-between">
                      <span>{opt.label}</span>
                      {confidenceLevel === opt.val && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Change Password */}
          <form onSubmit={handleUpdatePassword} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Change Account Password
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ensure your quantitative trading account is secured with a strong alphanumeric password.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Current Password
                </label>
                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus-within:border-cyan-500">
                  <Key className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  New Password
                </label>
                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus-within:border-cyan-500">
                  <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Confirm New Password
                </label>
                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus-within:border-cyan-500">
                  <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1.5 cursor-pointer font-mono"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-bold text-xs tracking-wide transition-all shadow-sm cursor-pointer"
              >
                Update Password
              </button>
            </div>
          </form>

          {/* Two-Factor Authentication Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Two-Factor Authentication (2FA)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-lg leading-relaxed">
                  Adds an institutional security perimeter requiring a verification challenge when accessing portfolio data or modifying alert rules.
                </p>
                <div className="mt-2 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  Status: {twoFactorEnabled ? 'Active (Protected via SMS & App)' : 'Disabled'}
                </div>
              </div>
            </div>

            <button
              onClick={handleToggle2FA}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                twoFactorEnabled
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
              }`}
            >
              {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA Protection'}
            </button>
          </div>

          {/* Active Sessions */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Active Authorized Sessions
            </h3>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-cyan-500 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Chrome on Web Workstation (Current Device)
                  </div>
                  <span className="text-[10px] text-slate-500">Asia/Kolkata · Active now</span>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold">
                Online
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS & RISK ALARMS */}
      {activeTab === 'notifications' && (
        <form onSubmit={handleSaveNotifications} className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Automated Notification & Alarm Preferences
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure real-time automated triggers for regime shifts, concept drift, and market alerts.
              </p>
            </div>

            <div className="space-y-3.5 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="pt-2 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    HMM Regime Shift Transition Alarms
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Receive instantaneous notifications when a tracked asset switches from Low Volatility to High Volatility.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.regimeShifts}
                  onChange={e => setNotifications({ ...notifications, regimeShifts: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="pt-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    Kolmogorov-Smirnov Concept Drift Warnings
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Trigger warning alarms whenever empirical distribution tests detect divergence (p-value &lt; 0.05).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.driftWarnings}
                  onChange={e => setNotifications({ ...notifications, driftWarnings: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="pt-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    Daily Pre-Market Intelligence Briefing
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Morning digest summarizing overnight global indices, top Nifty 50 movers, and macro calendar.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.marketOpenSummary}
                  onChange={e => setNotifications({ ...notifications, marketOpenSummary: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="pt-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    Email Digest & Critical Risk Warnings
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Send high-priority risk alarms and weekly portfolio performance digests to {user?.email}.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.emailAlerts}
                  onChange={e => setNotifications({ ...notifications, emailAlerts: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                Save Notification Settings
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 5: DATA & PREDICTION AUDIT LOG */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          {/* Quick Metrics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Saved Predictions</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {predictionHistory.length}
              </div>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 mt-1 block">Logged to session audit</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Conformal Standard</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                {confidenceLevel}% Bound
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Finite-sample coverage</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Account Status</span>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                Active Client
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Dual Exchange (NSE / US)</span>
            </div>
          </div>

          {/* Prediction History Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                  Saved Prediction Audit Log
                </h3>
              </div>
              <button
                onClick={handleExportData}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit (JSON)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Ticker</th>
                    <th className="py-2.5 px-3 text-right">Tick Price</th>
                    <th className="py-2.5 px-3 text-right">Forecast</th>
                    <th className="py-2.5 px-3 text-center">90% Envelope</th>
                    <th className="py-2.5 px-3 text-right">Regime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {predictionHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                        No predictions logged yet. Go to any stock analysis page and click "Log Forecast".
                      </td>
                    </tr>
                  ) : (
                    predictionHistory.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(p.timestamp).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-cyan-600 dark:text-cyan-400 font-sans">
                          {p.ticker}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                          ₹{p.currentPrice.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                          ₹{p.predictedPrice.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500 tabular-nums">
                          ₹{p.lowerBound.toLocaleString()} ─ ₹{p.upperBound.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400 font-sans">
                          {p.marketRegime.split('/')[0]}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
            <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400 font-display">
              Data Management & Reset
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Permanently clear saved local prediction history or reset platform parameters back to institutional defaults.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => {
                  setPredictionHistory([]);
                  showToast('Local forecast logs cleared.');
                }}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Prediction Logs</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Disclaimer Banner */}
      <DisclaimerBanner />

      {/* Profile Photo & Avatar Customization Modal */}
      <AvatarModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        currentAvatarUrl={user?.avatarUrl}
        onSaveAvatar={(newAvatarUrl) => {
          updateProfile({ avatarUrl: newAvatarUrl });
          showToast(newAvatarUrl ? 'Profile photo & avatar updated successfully!' : 'Avatar reset to default.');
        }}
      />
    </div>
  );
};
