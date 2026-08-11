'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem { label: string; href: string; comingSoon?: boolean }

export function Sidebar({ items, title }: { items: NavItem[]; title: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-line bg-surface ltr:border-r rtl:border-l md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-active text-sm font-bold text-white">
          M
        </span>
        <span className="truncate text-sm font-semibold tracking-tight text-ink">{title}</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label={title}>
        {items.map((item) => {
          const isActive = !item.comingSoon && pathname === item.href;

          if (item.comingSoon) {
            return (
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
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex items-center rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                isActive
                  ? 'bg-active/10 font-medium text-active'
                  : 'text-muted hover:bg-raised hover:text-ink'
              }`}
            >
              {isActive && (
                <span className="absolute inset-y-1.5 w-0.5 rounded-full bg-active ltr:-left-1 rtl:-right-1" />
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
