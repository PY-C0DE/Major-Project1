/**
 * AlphaQuant AI - Main Application Component
 * Enforces Home Page first-view and requires authentication (Login / Sign Up)
 * to access protected features like the Dashboard, Watchlist, and Portfolio.
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { CustomerChatbot } from './components/CustomerChatbot';

import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { StockDetailPage } from './pages/StockDetailPage';
import { MarketsPage } from './pages/MarketsPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { NewsPage } from './pages/NewsPage';
import { ModelPerformancePage } from './pages/ModelPerformancePage';
import { DriftMonitorPage } from './pages/DriftMonitorPage';
import { AlertsPage } from './pages/AlertsPage';
import { AccountPage } from './pages/AccountPage';

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  // Open Home page first by default
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedTicker, setSelectedTicker] = useState<string>('RELIANCE.NS');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [portfolioAddTicker, setPortfolioAddTicker] = useState<string | undefined>(undefined);

  // When authentication status changes to true from false, default to dashboard
  useEffect(() => {
    if (isAuthenticated && activeTab === 'home') {
      setActiveTab('dashboard');
    } else if (!isAuthenticated) {
      setActiveTab('home');
    }
  }, [isAuthenticated]);

  const handleSelectTicker = (ticker: string) => {
    if (!isAuthenticated) {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }
    setSelectedTicker(ticker);
    setActiveTab('analysis');
  };

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleOpenAddHolding = (ticker: string) => {
    if (!isAuthenticated) {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }
    setPortfolioAddTicker(ticker);
    setActiveTab('portfolio');
  };

  const handleTabChange = (tab: string) => {
    if (!isAuthenticated && tab !== 'home') {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-600 dark:text-slate-400 font-mono text-xs transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping" />
          <span>Initializing AlphaQuant AI Quantitative Core...</span>
        </div>
      </div>
    );
  }

  // Universal Layout: Top Navbar (with theme toggle, brand, links & auth actions) is ALWAYS visible.
  // Home page is displayed first; other features (Dashboard, Watchlist, Portfolio, etc.) require Login or Sign Up.
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Bar Navigation (Includes Dark Mode / Light Mode toggle and Auth triggers) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onSearchTicker={handleSelectTicker}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main Viewport */}
      {!isAuthenticated || activeTab === 'home' ? (
        <div className="flex-1 flex flex-col">
          <LandingPage
            onEnterApp={() => {
              if (isAuthenticated) {
                setActiveTab('dashboard');
              } else {
                handleOpenAuth('login');
              }
            }}
            onOpenAuth={handleOpenAuth}
            onSelectFeature={handleTabChange}
          />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar for Authenticated Workspace */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            selectedTicker={selectedTicker}
          />

          {/* Viewport Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {activeTab === 'dashboard' && (
              <DashboardPage
                onSelectTicker={handleSelectTicker}
                onNavigate={handleTabChange}
              />
            )}

            {activeTab === 'analysis' && (
              <StockDetailPage
                ticker={selectedTicker}
                onOpenAddHolding={handleOpenAddHolding}
              />
            )}

            {activeTab === 'markets' && (
              <MarketsPage onSelectTicker={handleSelectTicker} />
            )}

            {activeTab === 'portfolio' && (
              <PortfolioPage
                onSelectTicker={handleSelectTicker}
                initialTickerToAdd={portfolioAddTicker}
              />
            )}

            {activeTab === 'watchlist' && (
              <WatchlistPage onSelectTicker={handleSelectTicker} />
            )}

            {activeTab === 'news' && (
              <NewsPage onSelectTicker={handleSelectTicker} />
            )}

            {activeTab === 'predictions' && (
              <StockDetailPage
                ticker={selectedTicker}
                onOpenAddHolding={handleOpenAddHolding}
              />
            )}

            {activeTab === 'performance' && <ModelPerformancePage />}

            {activeTab === 'drift' && <DriftMonitorPage />}

            {activeTab === 'alerts' && <AlertsPage />}

            {activeTab === 'account' && <AccountPage />}
          </main>
        </div>
      )}

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />

      {/* AI Customer Support & Quant Assistant Chatbot */}
      <CustomerChatbot
        onNavigate={handleTabChange}
        onOpenAuth={handleOpenAuth}
        isAuthenticated={isAuthenticated}
        userName={user?.name}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
