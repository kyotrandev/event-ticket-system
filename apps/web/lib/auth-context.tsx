'use client';

// Client-side auth state. The token lives in localStorage (see api.ts); this
// context exposes the current user plus login/register/logout actions and
// hydrates the user from GET /auth/me on mount when a token is present.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api, authApi, tokenStore } from './api';
import { RoleId, type User } from './types';

const USER_KEY = 'ets.user';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: number;
    companyName?: string;
    phoneNumber?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  isRole: (role: RoleId) => boolean;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

function readCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function cacheUser(user: User | null) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from cache for instant paint, then revalidate against /auth/me.
  // Work runs inside an async closure so state updates happen off the effect
  // body (avoids the set-state-in-effect cascade warning).
  useEffect(() => {
    void (async () => {
      const cached = readCachedUser();
      if (cached) setUser(cached);

      if (!tokenStore.get()) {
        setLoading(false);
        return;
      }
      try {
        const fresh = await api.get<User>('/auth/me');
        setUser(fresh);
        cacheUser(fresh);
      } catch {
        // token invalid / refresh failed → signed out
        tokenStore.clear();
        cacheUser(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    tokenStore.set(res.token, res.refreshToken);
    cacheUser(res.user);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role?: number;
      companyName?: string;
      phoneNumber?: string;
    }) => {
      await authApi.register(data);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on logout; clear locally regardless
    }
    tokenStore.clear();
    cacheUser(null);
    setUser(null);
  }, []);

  const isRole = useCallback(
    (role: RoleId) => user?.role?.id === role,
    [user],
  );

  const updateUser = useCallback((updatedUser: User) => {
    cacheUser(updatedUser);
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, isRole, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
