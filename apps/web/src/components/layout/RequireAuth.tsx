'use client';
import { useRequireAuth } from '@/lib/useRequireAuth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useRequireAuth();

  if (status !== 'authed') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-active border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
