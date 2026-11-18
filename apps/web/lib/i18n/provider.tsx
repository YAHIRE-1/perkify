'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import locales from './locales.json';
import catalog from './messages.json';

export { locales };
type Locale = keyof typeof locales;
type Messages = Record<string, string>;
const dictionaries: Partial<Record<Locale, Messages>> = catalog;
const storageKey = 'perkify.locale';

export function isLocale(value: string | null): value is Locale {
  return value !== null && Object.hasOwn(locales, value);
}

function translate(locale: Locale, source: string, values?: Record<string, string | number>) {
  const dictionary = dictionaries[locale];
  const message = dictionary && Object.hasOwn(dictionary, source) ? dictionary[source] : source;
  return message.replace(/\{(\w+)\}/g, (token, name: string) => String(values?.[name] ?? token));
}

const LanguageContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({
  locale: 'en',
  setLocale: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(storageKey); } catch { /* Storage may be unavailable. */ }
    if (isLocale(saved)) {
      setLocale(saved);
      return;
    }
    for (const preference of navigator.languages) {
      const language = preference.toLowerCase();
      const exact = Object.keys(locales).find((option) => option.toLowerCase() === language);
      if (exact && isLocale(exact)) return setLocale(exact);
      const base = language.split('-')[0];
      const match = Object.keys(locales).find((option) => option.toLowerCase().split('-')[0] === base);
      if (match && isLocale(match)) return setLocale(match);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const changeLocale = (selected: Locale) => {
    setLocale(selected);
    try { localStorage.setItem(storageKey, selected); } catch { /* Keep the session preference. */ }
  };

  return <LanguageContext.Provider value={{ locale, setLocale: changeLocale }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const { locale, setLocale } = useContext(LanguageContext);
  return {
    locale,
    setLocale,
    t: (source: string, values?: Record<string, string | number>) => translate(locale, source, values),
  };
}

export function Translate({ text, values }: { text: string; values?: Record<string, string | number> }) {
  const { t } = useLanguage();
  return t(text, values);
}
