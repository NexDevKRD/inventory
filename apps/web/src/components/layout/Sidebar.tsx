'use client';
import Link from 'next/link';

export interface NavItem { label: string; href: string; comingSoon?: boolean }

export function Sidebar({ items, title }: { items: NavItem[]; title: string }) {
  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 px-2 text-lg font-semibold">{title}</h2>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link key={item.href} href={item.comingSoon ? '#' : item.href} className={`block rounded px-3 py-2 text-sm ${item.comingSoon ? 'cursor-not-allowed text-gray-400' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'}`}>
            {item.label}{item.comingSoon && ' (coming soon)'}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
