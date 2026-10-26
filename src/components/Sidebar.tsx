/**
 * Financial Workspace Sidebar Navigation
 * Fully compatible with Dark and Light modes.
 */

import React from 'react';
import {
  Home,
  LayoutDashboard,
  LineChart,
  Globe2,
  Briefcase,
  BookmarkCheck,
  Newspaper,
  Target,
  BarChart3,
  ActivitySquare,
  Bell,
  Settings,
  Sparkles,
  Send,
  Users,
  Sliders,
  Scale,
  ShieldCheck,
  LogOut,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import avatarImg from '../assets/images/avatar_lead_quant_1791318574843.jpg';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedTicker: string;
  onOpenOptions?: () => void;
  onOpenBacktest?: () => void;
  onOpenBroker?: () => void;
  onOpenSocial?: () => void;
  onOpenOptimizer?: () => void;
  onOpenTour?: () => void;
  onOpenInvestorGuide?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  selectedTicker,
  onOpenOptions,
  onOpenBacktest,
  onOpenBroker,
  onOpenSocial,
  onOpenOptimizer,
  onOpenTour,
  onOpenInvestorGuide
}) => {
  const { user, logout } = useAuth();
  const mainItems = [
    { id: 'home', label: 'Home Overview', icon: Home },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analysis', label: `Analysis (${selectedTicker.replace('.NS', '')})`, icon: LineChart },
    { id: 'markets', label: 'Markets Screener', icon: Globe2 },
    { id: 'portfolio', label: 'My Portfolio', icon: Briefcase },
    { id: 'watchlist', label: 'Watchlist', icon: BookmarkCheck }
  ];

  const intelligenceItems = [
    { id: 'news', label: 'News Intelligence', icon: Newspaper },
    { id: 'predictions', label: 'Conformal Forecasts', icon: Target },
    { id: 'performance', label: 'Model Evaluation', icon: BarChart3 },
    { id: 'drift', label: 'Drift Monitor', icon: ActivitySquare },
    { id: 'alerts', label: 'Alert Manager', icon: Bell }
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/80 flex flex-col shrink-0 hidden lg:flex h-full max-h-[calc(100vh-57px)] sticky top-[57px] transition-colors duration-200 overflow-hidden">
      {/* Scrollable Navigation Options with Independent Scrollbar */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-6 sidebar-scrollbar">
        {/* Core Workspace */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold">
            Workspace
          </div>
          <nav className="space-y-1">
            {mainItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-semibold border border-cyan-200 dark:border-cyan-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quantitative AI Core */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold">
            AI Intelligence & Risk
          </div>
          <nav className="space-y-1">
            {intelligenceItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-semibold border border-cyan-200 dark:border-cyan-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Terminal Tools & Modals */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold">
            Institutional Tools
          </div>
          <nav className="space-y-1">
            {onOpenOptions && (
              <button
                onClick={onOpenOptions}
                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors cursor-pointer text-left"
              >
                <ActivitySquare className="w-4 h-4 shrink-0 text-cyan-500" />
                <span className="truncate">Options & Greeks</span>
              </button>
            )}
            {onOpenBacktest && (
              <button
                onClick={onOpenBacktest}
                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors cursor-pointer text-left"
              >
                <BarChart3 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span className="truncate">Backtest Engine</span>
              </button>
            )}
            {onOpenBroker && (
              <button
                onClick={onOpenBroker}
                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors cursor-pointer text-left"
              >
                <Send className="w-4 h-4 shrink-0 text-indigo-500" />
                <span className="truncate">Broker Router</span>
              </button>
            )}
            {onOpenSocial && (
              <button
                onClick={onOpenSocial}
                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors cursor-pointer text-left"
              >
                <Users className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="truncate">Social & Copy-Trade</span>
              </button>
            )}
            {onOpenOptimizer && (
              <button
                onClick={onOpenOptimizer}
                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors cursor-pointer text-left"
              >
                <Scale className="w-4 h-4 shrink-0 text-amber-500" />
                <span className="truncate">Portfolio Optimizer</span>
              </button>
            )}
            {onOpenInvestorGuide && (
              <button
                id="tour-investor-guide-tool"
                onClick={onOpenInvestorGuide}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <GraduationCap className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="truncate">Beginner's Guide</span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-200/80 dark:bg-emerald-800/80 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.2 rounded shrink-0">
                  Tool
                </span>
              </button>
            )}
            {onOpenTour && (
              <button
                onClick={onOpenTour}
                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200/60 dark:border-cyan-800/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 transition-colors cursor-pointer text-left"
              >
                <Sparkles className="w-4 h-4 shrink-0 text-cyan-500 animate-pulse" />
                <span className="truncate font-semibold">12-Step Tour</span>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Bottom Safe Status & Settings */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-900 space-y-2 shrink-0 bg-white dark:bg-slate-950">
        <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="text-[11px] leading-tight">
            <div className="text-slate-700 dark:text-slate-300 font-medium">Finite Coverage: 90%</div>
            <div className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">Split-Conformal Active</div>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('account')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'account'
              ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-semibold border border-cyan-200 dark:border-cyan-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
          }`}
        >
          <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700 bg-cyan-500/10">
            <img src={user?.avatarUrl || avatarImg} alt="User Avatar" className="w-full h-full object-cover" />
          </div>
          <span className="truncate">My Profile & Settings</span>
        </button>

        {/* Permanently Visible Sign Out Button with Logout Icon */}
        <button
          onClick={() => {
            logout();
            setActiveTab('home');
          }}
          title="Sign Out of Platform"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="truncate">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
