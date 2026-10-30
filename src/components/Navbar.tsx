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
  Camera,
  Menu,
  X,
  LayoutDashboard,
  LineChart,
  Globe2,
  Newspaper,
  BarChart3,
  ActivitySquare,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AvatarModal } from './AvatarModal';
import { CompanySearchCombobox } from './CompanySearchCombobox';
import avatarImg from '../assets/images/avatar_lead_quant_1791318574843.jpg';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSearchTicker: (ticker: string) => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
  onOpenOptions?: () => void;
  onOpenBacktest?: () => void;
  onOpenBroker?: () => void;
  onOpenSocial?: () => void;
  onOpenOptimizer?: () => void;
  onOpenTour?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSearchTicker,
  onOpenAuth,
  onOpenOptions,
  onOpenBacktest,
  onOpenBroker,
  onOpenSocial,
  onOpenOptimizer,
  onOpenTour
}) => {
  const { user, isAuthenticated, logout, updateProfile, enterDemoMode } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const [showQuantMenu, setShowQuantMenu] = useState(false);

  const coreNavLinks = isAuthenticated
    ? [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'analysis', label: 'Analysis' },
        { id: 'portfolio', label: 'Portfolio' },
        { id: 'watchlist', label: 'Watchlist' }
      ]
    : [
        { id: 'home', label: 'Home' },
        { id: 'features', label: 'Features' },
        { id: 'usps', label: 'Innovations' },
        { id: 'safety', label: 'Model Safety' },
        { id: 'dashboard', label: 'Dashboard', locked: true }
      ];

  const quantTools = [
    { id: 'options_greeks', label: 'Options & Greeks', desc: 'Black-Scholes & Volatility Smiles', icon: ActivitySquare },
    { id: 'backtest', label: 'Backtest Strategy', desc: 'Algorithmic Simulation & Sharpe', icon: BarChart3 },
    { id: 'broker_router', label: 'Broker Router', desc: 'Alpaca Paper & Execution Gateway', icon: ShieldCheck },
    { id: 'social_copy', label: 'Social & Copy-Trade', desc: 'Leaderboard & 1-Click Sync', icon: Users },
    { id: 'optimizer', label: 'AI Portfolio Optimizer', desc: 'Markowitz Mean-Variance Frontier', icon: Sliders },
    { id: 'performance', label: 'Model Calibration & Accuracy', desc: 'Project-Wide MAPE & Metrics', icon: LineChart }
  ];

  const handleNavClick = (id: string, locked?: boolean) => {
    if (locked || (!isAuthenticated && (id === 'dashboard' || id === 'watchlist' || id === 'portfolio' || id === 'analysis' || id === 'options_greeks' || id === 'backtest' || id === 'broker_router' || id === 'social_copy' || id === 'optimizer'))) {
      onOpenAuth?.('login');
      return;
    }
    if (id === 'options_greeks') {
      onOpenOptions?.();
      return;
    }
    if (id === 'backtest') {
      onOpenBacktest?.();
      return;
    }
    if (id === 'broker_router') {
      onOpenBroker?.();
      return;
    }
    if (id === 'social_copy') {
      onOpenSocial?.();
      return;
    }
    if (id === 'optimizer') {
      onOpenOptimizer?.();
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
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-2.5 sm:px-4 md:px-6 py-2.5 transition-colors duration-200">
      <div className="w-full flex items-center justify-between gap-2 sm:gap-3 md:gap-4 min-w-0">
        {/* Zone 1: Single text wordmark in display face with Tour Target ID */}
        <div id="tour-brand-header" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            onClick={() => setActiveTab(isAuthenticated ? 'dashboard' : 'home')}
            className="text-left group cursor-pointer focus:outline-none"
          >
            <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 group-hover:scale-125 transition-transform" />
              AlphaQuant AI
            </span>
          </button>
          <span className="hidden xl:inline text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2 border-l border-slate-200 dark:border-slate-800">
            v2.1 ML Core
          </span>
        </div>

        {/* Zone 2: Navigation Links (Cleanly structured on desktop displays - zero collision) */}
        <nav id="tour-nav-links" className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 shrink min-w-0">
          {coreNavLinks.map(link => (
            <button
              key={link.id}
              onClick={() => handleNavClick(link.id, (link as any).locked)}
              className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 ${
                activeTab === link.id
                  ? 'text-cyan-600 dark:text-cyan-400 font-bold bg-cyan-50/80 dark:bg-cyan-950/50 border border-cyan-200/60 dark:border-cyan-800/50'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <span>{link.label}</span>
              {(link as any).locked && (
                <span className="text-[10px] text-amber-500 font-mono">🔒</span>
              )}
            </button>
          ))}

          {/* Institutional Quant Tools Dropdown Menu */}
          {isAuthenticated && (
            <div className="relative">
              <button
                id="tour-quant-tools"
                onClick={() => setShowQuantMenu(prev => !prev)}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 font-medium ${
                  showQuantMenu
                    ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
                title="Institutional Quantitative Instruments & Algorithms"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-500" />
                <span>Quant Tools</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showQuantMenu ? 'rotate-180' : ''}`} />
              </button>

              {showQuantMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowQuantMenu(false)} />
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-40 animate-fadeIn text-xs">
                    <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold flex items-center justify-between">
                      <span>Quantitative Instruments</span>
                      <span className="text-cyan-500">6 Modules</span>
                    </div>
                    <div className="py-1">
                      {quantTools.map(tool => {
                        const IconComponent = tool.icon;
                        return (
                          <button
                            key={tool.id}
                            onClick={() => {
                              setShowQuantMenu(false);
                              handleNavClick(tool.id);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-cyan-50/60 dark:hover:bg-slate-800 flex items-start gap-2.5 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer group"
                          >
                            <div className="p-1 rounded-md bg-slate-100 group-hover:bg-cyan-100 dark:bg-slate-800 dark:group-hover:bg-cyan-950 text-slate-500 group-hover:text-cyan-600 dark:text-slate-400 dark:group-hover:text-cyan-400 shrink-0 mt-0.5 transition-colors">
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                {tool.label}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">
                                {tool.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </nav>

        {/* Zone 3: Actions + Theme Toggle + User Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Company Search Combobox with Tour ID */}
          <div id="tour-search-combobox" className="w-28 xs:w-36 sm:w-44 md:w-48 lg:w-48 xl:w-56 shrink min-w-0">
            <CompanySearchCombobox
              compact
              placeholder="Search ticker..."
              onSelect={(item) => handleSelect(item.ticker)}
            />
          </div>

          {/* Guided Tour Launcher with Tour ID */}
          {onOpenTour && (
            <button
              id="tour-nav-tour"
              onClick={onOpenTour}
              title="Launch Guided Product Tour"
              aria-label="Launch Guided Product Tour"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-pulse shrink-0" />
              <span className="hidden sm:inline">Tour</span>
            </button>
          )}

          {/* Theme Toggle Button (Sun / Moon) */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
            className="p-1.5 sm:p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-all duration-300 cursor-pointer shrink-0 group"
          >
            <div className="relative w-4 h-4 flex items-center justify-center transition-transform duration-300 group-hover:rotate-12">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-scaleIn" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 dark:text-slate-300 animate-scaleIn" />
              )}
            </div>
          </button>

          {/* User state & Actions */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {user.isDemoUser && (
                <span className="hidden 2xl:inline text-[10px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/40 rounded px-2 py-0.5 whitespace-nowrap shrink-0">
                  Demo Mode
                </span>
              )}

              {/* Profile Button with Dropdown attached directly */}
              <div className="relative flex items-center shrink-0">
                <button
                  onClick={() => {
                    setActiveTab('account');
                    setShowProfileMenu(false);
                  }}
                  title="Open My Profile & Settings"
                  className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-l-lg bg-slate-100 hover:bg-cyan-50 dark:bg-slate-900 dark:hover:bg-slate-800 border-y border-l border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer group shrink-0"
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 flex items-center justify-center text-xs font-bold shrink-0">
                    <img
                      src={user.avatarUrl || avatarImg}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="hidden xl:inline text-xs font-medium max-w-[85px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                </button>
                <button
                  onClick={() => setShowProfileMenu(prev => !prev)}
                  title="Profile Shortcuts & Menu"
                  aria-expanded={showProfileMenu}
                  className="p-1 sm:py-1 sm:px-1.5 rounded-r-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Floating Profile Dropdown Menu */}
                {showProfileMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-40 text-xs animate-fadeIn transition-colors">
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

                      {/* Quantitative Terminal Features */}
                      <div className="py-1 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="px-3.5 py-1 text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                          Quantitative Tools
                        </div>
                        {onOpenOptions && (
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              onOpenOptions();
                            }}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <ActivitySquare className="w-4 h-4 text-cyan-500" />
                              <span>Options & Greeks</span>
                            </span>
                            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">Black-Scholes</span>
                          </button>
                        )}
                        {onOpenBacktest && (
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              onOpenBacktest();
                            }}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <BarChart3 className="w-4 h-4 text-emerald-500" />
                              <span>Strategy Backtest</span>
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Simulation</span>
                          </button>
                        )}
                        {onOpenBroker && (
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              onOpenBroker();
                            }}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <LineChart className="w-4 h-4 text-indigo-500" />
                              <span>Broker Router</span>
                            </span>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">Paper Alpaca</span>
                          </button>
                        )}
                        {onOpenSocial && (
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              onOpenSocial();
                            }}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <Globe2 className="w-4 h-4 text-rose-500" />
                              <span>Social & Copy-Trade</span>
                            </span>
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono">Feeds</span>
                          </button>
                        )}
                        {onOpenOptimizer && (
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              onOpenOptimizer();
                            }}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <Sliders className="w-4 h-4 text-amber-500" />
                              <span>AI Portfolio Optimizer</span>
                            </span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">MVO Sync</span>
                          </button>
                        )}
                        {onOpenTour && (
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              onOpenTour();
                            }}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <Sparkles className="w-4 h-4 text-cyan-500" />
                              <span>12-Step Product Tour</span>
                            </span>
                            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">Guided</span>
                          </button>
                        )}
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

                      {/* Sign Out Button in Dropdown */}
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

              {/* Permanently Visible & Highlighted Sign Out Button with Logout Icon */}
              <button
                onClick={() => {
                  logout();
                  setActiveTab('home');
                }}
                title="Sign Out of Platform"
                aria-label="Sign Out"
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 shadow-2xs font-semibold text-xs"
              >
                <LogOut className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={() => enterDemoMode()}
                title="Launch Quant Demo Desk"
                className="px-2.5 py-1.5 text-xs font-bold text-cyan-800 dark:text-cyan-300 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 border border-cyan-300 dark:border-cyan-800/60 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="hidden sm:inline">Demo Desk</span>
              </button>
              <button
                onClick={() => onOpenAuth?.('login')}
                className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => onOpenAuth?.('register')}
                className="px-3 sm:px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer shadow-xs shadow-cyan-500/20"
              >
                <span>Sign Up</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mobile Hamburger Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            title="Toggle Navigation Menu"
            aria-label="Toggle Navigation Menu"
            className="lg:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 animate-slideUp bg-white dark:bg-slate-950 pb-3">
          <div className="space-y-1 px-1">
            {isAuthenticated ? (
              <>
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
                  Main Workspaces
                </div>
                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'dashboard'
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 font-semibold border border-cyan-200 dark:border-cyan-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <LayoutDashboard className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Dashboard</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Real-Time</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('analysis');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'analysis'
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 font-semibold border border-cyan-200 dark:border-cyan-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <LineChart className="w-4 h-4 text-blue-500" />
                    <span>Stock Analysis</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Conformal</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('portfolio');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'portfolio'
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 font-semibold border border-cyan-200 dark:border-cyan-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Briefcase className="w-4 h-4 text-indigo-500" />
                    <span>Portfolio</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Optimized</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('watchlist');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'watchlist'
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 font-semibold border border-cyan-200 dark:border-cyan-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <BookmarkCheck className="w-4 h-4 text-emerald-500" />
                    <span>Watchlist</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Saved</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('markets');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'markets'
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 font-semibold border border-cyan-200 dark:border-cyan-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Globe2 className="w-4 h-4 text-amber-500" />
                    <span>Markets Screener</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Global</span>
                </button>

                <div className="pt-2 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
                  AI Intelligence & Risk
                </div>

                <button
                  onClick={() => {
                    setActiveTab('performance');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'performance'
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 font-semibold border border-cyan-200 dark:border-cyan-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                    <span>Model Evaluation</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">95% Acc</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('drift');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'drift'
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 font-semibold border border-cyan-200 dark:border-cyan-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <ActivitySquare className="w-4 h-4 text-rose-500" />
                    <span>Drift Monitor</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">KS-Test</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('news');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'news'
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 font-semibold border border-cyan-200 dark:border-cyan-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Newspaper className="w-4 h-4 text-teal-500" />
                    <span>News & Sentiment</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Sentiment</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('alerts');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'alerts'
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 font-semibold border border-cyan-200 dark:border-cyan-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-amber-500" />
                    <span>Alerts Manager</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Live</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('account');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'account'
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 font-semibold border border-cyan-200 dark:border-cyan-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Profile & Settings</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{user?.name?.split(' ')[0]}</span>
                </button>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => {
                      logout();
                      setActiveTab('home');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition-colors cursor-pointer text-xs font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setActiveTab('home');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  Home Overview
                </button>
                <button
                  onClick={() => {
                    setActiveTab('home');
                    setMobileMenuOpen(false);
                    setTimeout(() => {
                      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  Platform Features
                </button>
                <button
                  onClick={() => {
                    setActiveTab('home');
                    setMobileMenuOpen(false);
                    setTimeout(() => {
                      document.getElementById('usps')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  Core Innovations
                </button>
                <button
                  onClick={() => {
                    setActiveTab('home');
                    setMobileMenuOpen(false);
                    setTimeout(() => {
                      document.getElementById('safety')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  Model Safety & Conformal 90%
                </button>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth?.('login');
                    }}
                    className="flex-1 py-2 text-center rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth?.('register');
                    }}
                    className="flex-1 py-2 text-center rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold shadow-sm"
                  >
                    Sign Up
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
