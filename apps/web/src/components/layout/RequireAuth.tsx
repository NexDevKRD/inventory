'use client';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { Spinner } from '@/components/ui/Button';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useRequireAuth();

  if (status !== 'authed') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas" role="status">
        <Spinner className="h-7 w-7 text-active" />
        <p className="text-sm text-muted">Checking your session…</p>
      </div>
    );
  }

  return <>{children}</>;
}
