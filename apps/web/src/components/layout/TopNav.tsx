'use client';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from './ThemeProvider';
import { LanguageSwitcher } from './LanguageSwitcher';

export function TopNav() {
  const { user, logout } = useAuth();
  const { toggle } = useTheme();
  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
      <span className="text-sm text-gray-500">{user?.email}</span>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <button onClick={toggle} className="rounded px-2 py-1 text-sm">🌓</button>
        <button aria-label="notifications" className="rounded px-2 py-1 text-sm">🔔</button>
        <button onClick={() => logout()} className="rounded bg-gray-100 px-3 py-1.5 text-sm dark:bg-gray-800">Log out</button>
      </div>
    </header>
  );
}
