'use client';
import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createApiClient } from './apiClient';

interface AuthUser { id: string; email: string; roles: string[]; permissions: string[] }
interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();

  const client = useMemo(
    () => createApiClient(() => accessToken, () => router.push('/login')),
    [accessToken, router]
  );

  const login = useCallback(async (email: string, password: string) => {
    const res = await client.post('/auth/login', { email, password });
    setAccessToken(res.data.data.accessToken);
    setUser(res.data.data.user);
    return res.data.data.user as AuthUser;
  }, [client]);

  const logout = useCallback(async () => {
    await client.post('/auth/logout');
    setAccessToken(null);
    setUser(null);
    router.push('/login');
  }, [client, router]);

  return <AuthContext.Provider value={{ user, accessToken, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
