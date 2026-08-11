'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { NavItem } from './Sidebar';
import { Drawer } from '@/components/ui/Drawer';

/** Below `md` the sidebar is hidden, so navigation lives behind this button. */
export function MobileNav({ items, title }: { items: NavItem[]; title: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-ink md:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true" className="h-5 w-5">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <Drawer open={open} onClose={() => setOpen(false)} title={title}>
        <nav className="space-y-0.5" aria-label={title}>
          {items.map((item) =>
            item.comingSoon ? (
              <span
                key={item.href}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm text-faint"
              >
                {item.label}
                <span className="rounded-full bg-raised px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  Soon
                </span>
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === item.href ? 'page' : undefined}
                className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                  pathname === item.href
                    ? 'bg-active/10 font-medium text-active'
                    : 'text-muted hover:bg-raised hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </Drawer>
    </>
  );
}
