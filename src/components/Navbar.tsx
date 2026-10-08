/**
 * Top Bar Navigation
 * Strictly adheres to Universal Frontend Design Top Bar Contract:
 * [Brand title, one line] — [4-6 nav links, 1-2 word labels] — [1-2 primary actions]
 * Includes theme toggle (Dark / Light mode) and authentication controls.
 */

import React, { useState } from 'react';
import {
  Search,
  User,
  LogOut,
  Sparkles,
  Sun,
  Moon,
  ArrowRight,
  Settings,
  BookmarkCheck,
  Briefcase,
  Bell,
  ChevronDown,
  ShieldCheck,
  Sliders,
  Camera
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AvatarModal } from './AvatarModal';
import avatarImg from '../assets/images/avatar_lead_quant_1791318574843.jpg';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSearchTicker: (ticker: string) => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSearchTicker,
  onOpenAuth
}) => {
  const { user, isAuthenticated, logout, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const popularTickers = [
    { ticker: 'RELIANCE.NS', name: 'Reliance Industries' },
    { ticker: 'TCS.NS', name: 'Tata Consultancy' },
    { ticker: 'NVDA', name: 'NVIDIA Corp' },
    { ticker: 'AAPL', name: 'Apple Inc' },
    { ticker: 'INFY.NS', name: 'Infosys' },
    { ticker: 'MSFT', name: 'Microsoft' }
  ];

  const handleSelect = (ticker: string) => {
    onSearchTicker(ticker);
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  const navLinks = isAuthenticated
    ? [
        { id: 'home', label: 'Home' },
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'analysis', label: 'Stock Analysis' },
        { id: 'portfolio', label: 'Portfolio' },
        { id: 'watchlist', label: 'Watchlist' },
        { id: 'news', label: 'News Intelligence' },
        { id: 'performance', label: 'Model Metrics' }
      ]
    : [
        { id: 'home', label: 'Home' },
        { id: 'features', label: 'Features' },
        { id: 'usps', label: 'Innovations' },
        { id: 'safety', label: 'Model Safety' },
        { id: 'dashboard', label: 'Dashboard', locked: true },
        { id: 'watchlist', label: 'Watchlist', locked: true }
      ];

  const handleNavClick = (id: string, locked?: boolean) => {
    if (locked || (!isAuthenticated && (id === 'dashboard' || id === 'watchlist' || id === 'portfolio' || id === 'analysis'))) {
      onOpenAuth?.('login');
      return;
    }
    if (id === 'home') {
      setActiveTab('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (id === 'features' || id === 'usps' || id === 'safety') {
      setActiveTab('home');
      setTimeout(() => {
        const elem = document.getElementById(id);
        if (elem) elem.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else {
      setActiveTab(id);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 lg:px-8 py-3 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Single text wordmark in display face */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab(isAuthenticated ? 'dashboard' : 'home')}
            className="text-left group cursor-pointer focus:outline-none"
          >
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 group-hover:scale-125 transition-transform" />
              AlphaQuant AI
            </span>
          </button>
          <span className="hidden sm:inline text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2 border-l border-slate-200 dark:border-slate-800">
            v2.1 ML Core
          </span>
        </div>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          {navLinks.map(link => (
            <button
              key={link.id}
              onClick={() => handleNavClick(link.id, (link as any).locked)}
              className={`transition-colors whitespace-nowrap cursor-pointer hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 ${
                activeTab === link.id
                  ? 'text-cyan-600 dark:text-cyan-400 font-semibold'
                  : ''
              }`}
            >
              <span>{link.label}</span>
              {(link as any).locked && (
                <span className="text-[10px] text-amber-500 font-mono">🔒</span>
              )}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1-2 primary actions + Theme Toggle */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search Bar (When Authenticated) */}
          {isAuthenticated && (
            <div className="relative">
              <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-cyan-500/60 transition-colors w-32 sm:w-52">
                <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search Ticker..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                  className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Auto-suggest dropdown */}
              {showSearchDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSearchDropdown(false)}
                  />
                  <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-20 text-xs">
                    <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      Suggested Tickers
                    </div>
                    {popularTickers
                      .filter(
                        t =>
                          !searchQuery ||
                          t.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.name.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(item => (
                        <button
                          key={item.ticker}
                          onClick={() => handleSelect(item.ticker)}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center justify-between text-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          <span className="font-semibold text-cyan-600 dark:text-cyan-400">{item.ticker}</span>
                          <span className="text-slate-500 truncate max-w-[120px] text-right">{item.name}</span>
                        </button>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Theme Toggle Button (Sun / Moon) */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* User state & Actions */}
          {isAuthenticated && user ? (
            <div className="relative">
              <div className="flex items-center gap-2">
                {user.isDemoUser && (
                  <span className="hidden xl:inline text-[11px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/40 rounded px-2 py-0.5 whitespace-nowrap">
                    Demo Mode
                  </span>
                )}

                {/* Profile Button with Avatar and Chevron */}
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      setActiveTab('account');
                      setShowProfileMenu(false);
                    }}
                    title="Open My Profile & Settings"
                    className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-l-lg bg-slate-100 hover:bg-cyan-50 dark:bg-slate-900 dark:hover:bg-slate-800 border-y border-l border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer group"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 flex items-center justify-center text-xs font-bold shrink-0">
                      <img
                        src={user.avatarUrl || avatarImg}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="hidden md:inline text-xs font-medium max-w-[110px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                  </button>
                  <button
                    onClick={() => setShowProfileMenu(prev => !prev)}
                    title="Profile Shortcuts & Menu"
                    aria-expanded={showProfileMenu}
                    className="p-1 sm:py-1 sm:px-1.5 rounded-r-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    logout();
                    setActiveTab('home');
                  }}
                  title="Sign Out"
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-900 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Floating Profile Dropdown Menu */}
              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-40 text-xs animate-fadeIn transition-colors">
                    {/* User Header (Clickable to open Profile) */}
                    <button
                      onClick={() => {
                        setActiveTab('account');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left p-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 group-hover:ring-2 ring-cyan-500/50 transition-all">
                        <img
                          src={user.avatarUrl || avatarImg}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="overflow-hidden flex-1">
                        <div className="font-bold text-slate-900 dark:text-white truncate text-sm font-display group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {user.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                          {user.email}
                        </div>
                        <span className="inline-block mt-1 text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50">
                          {user.title || 'Quantitative Member'}
                        </span>
                      </div>
                    </button>

                    {/* Navigation Items */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setActiveTab('account');
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5 font-medium">
                          <Settings className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                          <span>My Profile & Settings</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowAvatarModal(true);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5 font-medium">
                          <Camera className="w-4 h-4 text-emerald-500" />
                          <span>Change Photo & Avatar</span>
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">20 Avatars</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('portfolio');
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <Briefcase className="w-4 h-4 text-indigo-500" />
                          <span>My Portfolio</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Holdings</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('watchlist');
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <BookmarkCheck className="w-4 h-4 text-emerald-500" />
                          <span>My Watchlist</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Assets</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('alerts');
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <Bell className="w-4 h-4 text-purple-500" />
                          <span>Alert Rules</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Rules</span>
                      </button>
                    </div>

                    {/* Quick Setting Controls in Dropdown */}
                    <div className="p-2.5 mx-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                        <span>Theme Appearance</span>
                        <button
                          onClick={toggleTheme}
                          className="flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white cursor-pointer"
                        >
                          {theme === 'dark' ? <Moon className="w-3 h-3 text-cyan-400" /> : <Sun className="w-3 h-3 text-amber-500" />}
                          <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Sign Out Button */}
                    <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800/80 px-2">
                      <button
                        onClick={() => {
                          logout();
                          setActiveTab('home');
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition-colors cursor-pointer font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out of Platform</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth?.('login')}
                title="Account & Profile (Sign In)"
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4" />
              </button>
              <button
                onClick={() => onOpenAuth?.('login')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => onOpenAuth?.('register')}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-sm shadow-cyan-500/20"
              >
                <span>Sign Up</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Photo & Avatar Customization Modal */}
      <AvatarModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        currentAvatarUrl={user?.avatarUrl}
        onSaveAvatar={(newAvatarUrl) => {
          updateProfile({ avatarUrl: newAvatarUrl });
        }}
      />
    </header>
  );
};
