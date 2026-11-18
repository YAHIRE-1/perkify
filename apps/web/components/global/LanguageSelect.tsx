'use client';

import { Globe } from 'lucide-react';
import { isLocale, locales, useLanguage } from '@/lib/i18n/provider';

export default function LanguageSelect() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <label className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm">
      <Globe aria-hidden className="size-4 shrink-0 text-[var(--muted)]" />
      <select
        aria-label={t("Language")}
        className="h-8 max-w-28 bg-[var(--surface)]"
        value={locale}
        onChange={(event) => {
          if (isLocale(event.target.value)) setLocale(event.target.value);
        }}
      >
        {Object.entries(locales).map(([value, { label }]) => (
          <option key={value} value={value} lang={value}>{label}</option>
        ))}
      </select>
    </label>
  );
}
