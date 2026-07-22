'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

export type SessionStatus = 'checking' | 'authed' | 'unauthed';

/**
 * Ensures a session exists before protected content renders.
 * If there's no access token in memory yet (e.g. after a page reload),
 * attempts a single silent refresh. Redirects to /login if that fails.
 */
export function useRequireAuth(): SessionStatus {
  const { accessToken, restoreSession } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<SessionStatus>(accessToken ? 'authed' : 'checking');

  useEffect(() => {
    if (accessToken) {
      setStatus('authed');
      return;
    }
    let cancelled = false;
    restoreSession().then((ok) => {
      if (cancelled) return;
      if (ok) {
        setStatus('authed');
      } else {
        setStatus('unauthed');
        router.replace('/login');
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return status;
}
