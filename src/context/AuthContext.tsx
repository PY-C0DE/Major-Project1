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
  isSubmitting: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  enterDemoMode: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem('alphaquant_token');
      let baseUser: UserProfile | null = null;

      if (token && token !== 'demo-token') {
        try {
          baseUser = await api.getCurrentUser();
        } catch {
          localStorage.removeItem('alphaquant_token');
          baseUser = null;
        }
      } else if (token === 'demo-token' && import.meta.env.VITE_DEMO_MODE === 'true') {
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
      } else if (token === 'demo-token') {
        localStorage.removeItem('alphaquant_token');
      }

      if (baseUser) {
        const userSpecificKey = `alphaquant_user_profile_${baseUser.id}`;
        const savedProfile = localStorage.getItem(userSpecificKey) || localStorage.getItem('alphaquant_user_profile');
        if (savedProfile) {
          try {
            const parsed = JSON.parse(savedProfile);
            if (parsed && parsed.id === baseUser.id) {
              baseUser = { ...baseUser, ...parsed };
            }
          } catch (e) {
            console.error(e);
          }
        }
      }

      setUser(baseUser);
      setIsLoading(false);
    }
    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsSubmitting(true);
    try {
      const { user: authedUser, token } = await api.login(email, pass);
      localStorage.setItem('alphaquant_token', token);
      localStorage.removeItem('alphaquant_logged_out');
      
      const userSpecificKey = `alphaquant_user_profile_${authedUser.id}`;
      const savedProfile = localStorage.getItem(userSpecificKey) || localStorage.getItem('alphaquant_user_profile');
      let mergedUser = authedUser;
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          if (parsed.id === authedUser.id) {
            mergedUser = { ...authedUser, ...parsed };
          }
        } catch {}
      }
      localStorage.setItem(userSpecificKey, JSON.stringify(mergedUser));
      setUser(mergedUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    setIsSubmitting(true);
    try {
      const { user: registeredUser, token } = await api.register(name, email, pass);
      localStorage.setItem('alphaquant_token', token);
      localStorage.removeItem('alphaquant_logged_out');
      const userSpecificKey = `alphaquant_user_profile_${registeredUser.id}`;
      localStorage.setItem(userSpecificKey, JSON.stringify(registeredUser));
      setUser(registeredUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = () => {
    // End active token session, but keep persistent user data in database and local cache
    localStorage.removeItem('alphaquant_token');
    localStorage.setItem('alphaquant_logged_out', 'true');
    setUser(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      const userSpecificKey = `alphaquant_user_profile_${prev.id}`;
      localStorage.setItem(userSpecificKey, JSON.stringify(updated));
      localStorage.setItem('alphaquant_user_profile', JSON.stringify(updated));
      return updated;
    });

    try {
      const saved = await api.updateProfile(updates);
      if (saved) {
        setUser(current => (current ? { ...current, ...saved } : saved));
        if (saved.id) {
          localStorage.setItem(`alphaquant_user_profile_${saved.id}`, JSON.stringify(saved));
        }
      }
    } catch (err) {
      console.warn('Profile updated locally; remote sync error:', err);
    }
  };

  const enterDemoMode = async () => {
    localStorage.removeItem('alphaquant_logged_out');
    try {
      await login('alex.morgan@alphaquant.ai', 'demo1234');
    } catch (e) {
      if (import.meta.env.VITE_DEMO_MODE === 'true') {
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
        const saved = localStorage.getItem(`alphaquant_user_profile_${demoUser.id}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setUser({ ...demoUser, ...parsed });
            return;
          } catch {}
        }
        setUser(demoUser);
      } else {
        throw e;
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isSubmitting,
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
