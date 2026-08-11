'use client';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from './ThemeProvider';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileNav } from './MobileNav';
import type { NavItem } from './Sidebar';
import { SunIcon, MoonIcon, LogOutIcon } from '@/components/ui/icons';
import { NotificationBell } from './NotificationBell';

const iconBtn =
  'flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-raised hover:text-ink';

export function TopNav({ items, title }: { items?: NavItem[]; title?: string }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-surface/85 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {items && title && <MobileNav items={items} title={title} />}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-active/10 text-sm font-semibold text-active">
          {initial}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium text-ink">{user?.email}</p>
          <p className="truncate text-xs text-muted">{user?.roles?.join(', ')}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        <button
          type="button"
          onClick={toggle}
          className={iconBtn}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        <NotificationBell />
        <button
          type="button"
          onClick={() => logout()}
          className="ltr:ml-1 rtl:mr-1 flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm text-muted transition-colors duration-150 hover:bg-raised hover:text-ink"
        >
          <LogOutIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
