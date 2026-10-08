/**
 * Authentication Context
 * Manages user state, login, registration, and demo session credentials.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  enterDemoMode: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem('alphaquant_token');
      const savedProfile = localStorage.getItem('alphaquant_user_profile');
      let baseUser: UserProfile | null = null;

      if (token && token !== 'demo-token') {
        try {
          baseUser = await api.getCurrentUser();
        } catch {
          localStorage.removeItem('alphaquant_token');
          baseUser = null;
        }
      } else if (token === 'demo-token') {
        baseUser = {
          id: 'user-alphaquant-demo-1',
          name: 'Alex Morgan, CFA',
          email: 'alex.morgan@alphaquant.ai',
          createdAt: '2026-01-15T09:00:00.000Z',
          isDemoUser: true,
          title: 'Lead Quantitative Strategist',
          organization: 'Morgan Capital Alpha Desk',
          currencyPreference: 'INR',
          defaultExchange: 'NSE',
          confidenceLevel: 90,
          twoFactorEnabled: true,
          timezone: 'Asia/Kolkata (IST)',
          bio: 'Institutional quantitative portfolio manager focusing on tail-risk mitigation and conformal forecast envelopes.'
        };
      }

      if (baseUser && savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          if (parsed && parsed.id === baseUser.id) {
            baseUser = { ...baseUser, ...parsed };
          }
        } catch (e) {
          console.error(e);
        }
      }

      setUser(baseUser);
      setIsLoading(false);
    }
    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const { user: authedUser, token } = await api.login(email, pass);
      localStorage.setItem('alphaquant_token', token);
      const savedProfile = localStorage.getItem('alphaquant_user_profile');
      let mergedUser = authedUser;
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          if (parsed.id === authedUser.id) {
            mergedUser = { ...authedUser, ...parsed };
          }
        } catch {}
      }
      setUser(mergedUser);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    setIsLoading(true);
    try {
      const { user: registeredUser, token } = await api.register(name, email, pass);
      localStorage.setItem('alphaquant_token', token);
      setUser(registeredUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('alphaquant_token');
    localStorage.removeItem('alphaquant_user_profile');
    setUser(null);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('alphaquant_user_profile', JSON.stringify(updated));
      return updated;
    });
  };

  const enterDemoMode = () => {
    localStorage.setItem('alphaquant_token', 'demo-token');
    const demoUser: UserProfile = {
      id: 'user-alphaquant-demo-1',
      name: 'Alex Morgan, CFA',
      email: 'alex.morgan@alphaquant.ai',
      createdAt: '2026-01-15T09:00:00.000Z',
      isDemoUser: true,
      title: 'Lead Quantitative Strategist',
      organization: 'Morgan Capital Alpha Desk',
      currencyPreference: 'INR',
      defaultExchange: 'NSE',
      confidenceLevel: 90,
      twoFactorEnabled: true,
      timezone: 'Asia/Kolkata (IST)',
      bio: 'Institutional quantitative portfolio manager focusing on tail-risk mitigation and conformal forecast envelopes.'
    };
    setUser(demoUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        enterDemoMode,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
