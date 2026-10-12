'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import { apiFetch, jsonBody } from './api';
import { User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  updateUser: (updates: Partial<User>) => void;
  login: (email: string, password: string) => Promise<User>;
  signup: (
    email: string,
    password: string,
  ) => Promise<{ email: string; verificationRequired: boolean; verificationExpiresHours: number; message: string }>;
  resendVerification: (email: string) => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const SESSION_HINT_KEY = 'creditsea_session_hint';

const isProtectedPath = (pathname: string): boolean =>
  pathname === '/dashboard' || pathname.startsWith('/dashboard/') || pathname.startsWith('/borrower/');

const hasSessionHint = (): boolean => {
  try {
    return window.sessionStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
};

const setSessionHint = (): void => {
  try {
    window.sessionStorage.setItem(SESSION_HINT_KEY, '1');
  } catch {
    // Session storage can be unavailable in privacy-restricted browsers.
  }
};

const clearSessionHint = (): void => {
  try {
    window.sessionStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // Session storage can be unavailable in privacy-restricted browsers.
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const skipSessionCheckRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    if (skipSessionCheckRef.current) {
      skipSessionCheckRef.current = false;
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    if (user) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    if (!isProtectedPath(pathname) && !hasSessionHint()) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    apiFetch<{ user: User }>('/auth/me')
      .then(({ user: currentUser }) => {
        if (!mounted) return;
        setSessionHint();
        setUser(currentUser);
      })
      .catch(() => {
        if (!mounted) return;
        clearSessionHint();
        setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [pathname, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      updateUser: (updates) => setUser((currentUser) => (currentUser ? { ...currentUser, ...updates } : currentUser)),
      login: async (email, password) => {
        const result = await apiFetch<{ user: User }>('/auth/login', { method: 'POST', ...jsonBody({ email, password }) });
        setSessionHint();
        setUser(result.user);
        return result.user;
      },
      signup: async (email, password) => {
        return apiFetch<{ email: string; verificationRequired: boolean; verificationExpiresHours: number; message: string }>(
          '/auth/signup',
          {
            method: 'POST',
            ...jsonBody({ email, password }),
          },
        );
      },
      resendVerification: async (email) => {
        const result = await apiFetch<{ message: string }>('/auth/resend-verification', {
          method: 'POST',
          ...jsonBody({ email }),
        });
        return result.message;
      },
      logout: async () => {
        try {
          await apiFetch('/auth/logout', { method: 'POST' });
        } finally {
          skipSessionCheckRef.current = true;
          clearSessionHint();
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
