'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { apiFetch, jsonBody } from './api';
import { User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  updateUser: (updates: Partial<User>) => void;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiFetch<{ user: User }>('/auth/me')
      .then(({ user: currentUser }) => {
        if (!mounted) return;
        setUser(currentUser);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      updateUser: (updates) => setUser((currentUser) => (currentUser ? { ...currentUser, ...updates } : currentUser)),
      login: async (email, password) => {
        const result = await apiFetch<{ user: User }>('/auth/login', { method: 'POST', ...jsonBody({ email, password }) });
        setUser(result.user);
        return result.user;
      },
      signup: async (email, password) => {
        const result = await apiFetch<{ user: User }>('/auth/signup', { method: 'POST', ...jsonBody({ email, password }) });
        setUser(result.user);
        return result.user;
      },
      logout: async () => {
        try {
          await apiFetch('/auth/logout', { method: 'POST' });
        } finally {
          setUser(null);
        }
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
