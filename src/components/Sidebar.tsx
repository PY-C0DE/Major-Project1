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
  ShieldCheck,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import avatarImg from '../assets/images/avatar_lead_quant_1791318574843.jpg';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedTicker: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, selectedTicker }) => {
  const { user } = useAuth();
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
    <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/80 p-4 flex flex-col justify-between shrink-0 hidden lg:flex min-h-[calc(100vh-57px)] transition-colors duration-200">
      <div className="space-y-6">
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
      </div>

      {/* Bottom Safe Status & Settings */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-900 space-y-2">
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
      </div>
    </aside>
  );
};
