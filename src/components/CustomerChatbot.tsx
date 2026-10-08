/**
 * AlphaQuant AI - Customer Support & Quantitative Assistant Chatbot
 * Provides real-time assistance, platform onboarding, model explanations,
 * and navigation shortcuts for both prospective visitors and authenticated clients.
 * Powered by Gemini 3.8 Flash with full Dark and Light mode support.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Minimize2,
  Trash2,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  Target,
  BookmarkCheck,
  Briefcase
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { generateSupportFallback } from '../utils/supportKnowledge';
import avatarImg from '../assets/images/avatar_lead_quant_1791318574843.jpg';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  suggestedActions?: Array<{ label: string; action: string }>;
}

interface CustomerChatbotProps {
  onNavigate: (tab: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  isAuthenticated: boolean;
  userName?: string;
}

export const CustomerChatbot: React.FC<CustomerChatbotProps> = ({
  onNavigate,
  onOpenAuth,
  isAuthenticated,
  userName
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasPromptTeaser, setHasPromptTeaser] = useState(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const initialWelcomeMessage: ChatMessage = {
    id: 'welcome-1',
    role: 'model',
    content: `### Welcome to AlphaQuant AI Support! 👋

I'm your **AI Quantitative & Support Assistant**. I'm here to help you get the most out of our platform:

- 🚀 **Getting Started**: Learn how to create an account or sign in
- 📊 **Platform Tour**: Explore the Live Dashboard, Custom Watchlist & Portfolio tracker
- 🎯 **Quantitative Models**: Understand **90% Conformal Prediction**, **HMM Regimes**, and **FinBERT Sentiment**
- 🌐 **Markets & Tickers**: Learn how to search NSE and US global equities

*How can I assist you today?*`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    suggestedActions: !isAuthenticated
      ? [
          { label: '🚀 Create Free Account', action: 'auth:register' },
          { label: '🎯 Explain Conformal Prediction', action: 'ask:conformal' },
          { label: '📊 How to use Watchlist?', action: 'ask:watchlist' }
        ]
      : [
          { label: '📊 Open Dashboard', action: 'nav:dashboard' },
          { label: '📑 View Watchlist', action: 'nav:watchlist' },
          { label: '💼 Track Portfolio', action: 'nav:portfolio' }
        ]
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcomeMessage]);

  const quickPrompts = [
    { label: '🚀 How to get started?', prompt: 'How do I create an account and get started on AlphaQuant AI?' },
    { label: '🎯 What is 90% Conformal Prediction?', prompt: 'Can you explain how 90% Conformal Prediction works and why it is better than regular price forecasts?' },
    { label: '📊 How does the Watchlist work?', prompt: 'How do I add stocks to my watchlist and what metrics does it display?' },
    { label: '💼 How to track my portfolio?', prompt: 'How does portfolio tracking work in AlphaQuant AI?' },
    { label: '📈 What are HMM Market Regimes?', prompt: 'What are Hidden Markov Model market regimes and how do they help traders?' },
    { label: '🛡️ Is this financial advice?', prompt: 'Are these predictions guaranteed or considered financial advice?' }
  ];

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await api.sendSupportChat(apiMessages);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: response.suggestedActions
      };

      setMessages(prev => [...prev, botMsg]);
    } catch {
      const fallbackReply = generateSupportFallback(promptText);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          { label: '📊 Open Dashboard', action: 'nav:dashboard' },
          { label: '📑 View Watchlist', action: 'nav:watchlist' }
        ]
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: string) => {
    if (action === 'auth:register') {
      onOpenAuth('register');
    } else if (action === 'auth:login') {
      onOpenAuth('login');
    } else if (action.startsWith('nav:')) {
      const targetTab = action.replace('nav:', '');
      onNavigate(targetTab);
    } else if (action.startsWith('ask:')) {
      const topic = action.replace('ask:', '');
      if (topic === 'conformal') {
        handleSendMessage('Explain how 90% Conformal Prediction works.');
      } else if (topic === 'watchlist') {
        handleSendMessage('How does the Watchlist work?');
      } else if (topic === 'portfolio') {
        handleSendMessage('How do I manage my portfolio?');
      }
    }
  };

  const handleClearChat = () => {
    setMessages([initialWelcomeMessage]);
  };

  // Render markdown text simply and cleanly
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-xs leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1" />;
          }

          if (trimmed.startsWith('### ')) {
            return (
              <div key={idx} className="font-bold text-slate-900 dark:text-white pt-1 text-sm font-display">
                {trimmed.replace('### ', '')}
              </div>
            );
          }

          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const itemText = trimmed.substring(2);
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="text-cyan-600 dark:text-cyan-400 mt-1">•</span>
                <span>{renderInlineFormatting(itemText)}</span>
              </div>
            );
          }

          if (/^\d+\.\s/.test(trimmed)) {
            const num = trimmed.match(/^(\d+\.)\s/)?.[1] || '';
            const itemText = trimmed.replace(/^\d+\.\s/, '');
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{num}</span>
                <span>{renderInlineFormatting(itemText)}</span>
              </div>
            );
          }

          return <p key={idx}>{renderInlineFormatting(trimmed)}</p>;
        })}
      </div>
    );
  };

  const renderInlineFormatting = (text: string) => {
    // Basic bold and code rendering
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[11px] font-mono text-cyan-700 dark:text-cyan-300">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-3">
        {/* Teaser pill when closed */}
        {!isOpen && hasPromptTeaser && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-full shadow-lg border border-slate-200 dark:border-slate-800 animate-bounce">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
            <span>Need help? Ask AlphaQuant AI</span>
            <button
              onClick={e => {
                e.stopPropagation();
                setHasPromptTeaser(false);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setHasPromptTeaser(false);
          }}
          aria-label="Open Customer Support Chatbot"
          className="relative group p-3.5 sm:px-4 sm:py-3.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-xl shadow-cyan-500/25 flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
          </span>
          <MessageSquare className="w-5 h-5 text-slate-950" />
          <span className="hidden sm:inline text-xs font-semibold tracking-wide">
            {isOpen ? 'Close Assistant' : 'AI Support'}
          </span>
        </button>
      </div>

      {/* Chat Window Modal / Drawer */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[420px] max-w-[440px] h-[580px] max-h-[calc(100vh-100px)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-200 font-sans">
          {/* Header */}
          <div className="p-3.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative p-2 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <Bot className="w-5 h-5" />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                    AlphaQuant Assistant
                  </h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40">
                    Gemini 3.8 Flash
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                  <span>Customer Support & Quant AI</span>
                  <span>·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Online</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                title="Reset Conversation"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize Chat"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips (Horizontal Scroll) */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/60 overflow-x-auto flex items-center gap-1.5 shrink-0 scrollbar-none text-[11px]">
            {quickPrompts.map((chip, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(chip.prompt)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 hover:bg-cyan-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-700 transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && (
                  <div className="w-7 h-7 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800/40 text-cyan-700 dark:text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 transition-colors shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-cyan-500 text-slate-950 rounded-br-none font-medium'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 rounded-bl-none'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    renderFormattedContent(msg.content)
                  )}

                  {/* Contextual Action Buttons */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((act, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => handleActionClick(act.action)}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-cyan-700 dark:text-cyan-300 font-semibold border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 transition-colors flex items-center gap-1 text-[11px] cursor-pointer shadow-xs"
                        >
                          <span>{act.label}</span>
                          <ArrowRight className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div
                    className={`text-[9px] font-mono mt-1.5 flex items-center gap-1 ${
                      msg.role === 'user' ? 'text-slate-800 justify-end' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 mt-0.5 bg-slate-200 dark:bg-slate-800">
                    <img
                      src={user?.avatarUrl || avatarImg}
                      alt={userName || 'User'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Loader Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800/40 text-cyan-700 dark:text-cyan-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl rounded-bl-none flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Disclaimer */}
          <div className="px-3 py-1 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 text-center font-mono">
            Statistical research system · Automated AI assistant
          </div>

          {/* Input Bar */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about features, models, or onboarding..."
              disabled={isLoading}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 font-bold transition-all cursor-pointer shrink-0 shadow-sm"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
