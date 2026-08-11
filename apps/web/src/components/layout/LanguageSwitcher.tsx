'use client';
import { useLocale } from 'next-intl';
import { GlobeIcon } from '@/components/ui/icons';

const LABELS: Record<string, string> = { en: 'EN', ar: 'AR', ku: 'KU' };

export function LanguageSwitcher() {
  const locale = useLocale();

  return (
    <label className="relative flex h-9 items-center gap-1.5 rounded-lg px-2 text-muted transition-colors duration-150 hover:bg-raised hover:text-ink focus-within:bg-raised">
      <GlobeIcon className="h-4 w-4" />
      <span className="sr-only">Language</span>
      <select
        // Reflects the locale actually in effect rather than assuming English.
        value={locale}
        onChange={(e) => {
          document.cookie = `NEXT_LOCALE=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
          location.reload();
        }}
        className="cursor-pointer appearance-none bg-transparent pe-1 text-sm font-medium outline-none"
      >
        {Object.entries(LABELS).map(([value, label]) => (
          <option key={value} value={value} className="bg-surface text-ink">
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
