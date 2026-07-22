'use client';
import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosInstance } from 'axios';
import { createApiClient } from './apiClient';

interface AuthUser { id: string; email: string; roles: string[]; permissions: string[] }
interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  apiClient: AxiosInstance;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeAccessToken(token: string): { userId: string; roles: string[]; permissions: string[] } | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

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

  const restoreSession = useCallback(async () => {
    try {
      const res = await client.post('/auth/refresh');
      const newToken = res.data.data.accessToken as string;
      setAccessToken(newToken);
      const decoded = decodeAccessToken(newToken);
      if (decoded) {
        setUser((prev) => prev ?? { id: decoded.userId, email: '', roles: decoded.roles, permissions: decoded.permissions });
      }
      return true;
    } catch {
      setAccessToken(null);
      setUser(null);
      return false;
    }
  }, [client]);

  return (
    <AuthContext.Provider value={{ user, accessToken, apiClient: client, login, logout, restoreSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
