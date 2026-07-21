import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'ar', 'ku'] as const;
export type Locale = (typeof locales)[number];
export const rtlLocales: Locale[] = ['ar', 'ku'];
export const defaultLocale: Locale = 'en';

// Deviation from brief: this project has no `[locale]` route segment or
// middleware yet, so `requestLocale` (the current, non-deprecated API in the
// installed next-intl@3.26) resolves to `undefined`. We fall back to
// `defaultLocale` and return `locale` explicitly, since `getLocale()` /
// `getMessages()` read it from this returned config.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = (locales as readonly string[]).includes(requested ?? '')
    ? (requested as Locale)
    : defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
