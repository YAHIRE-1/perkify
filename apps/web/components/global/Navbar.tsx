'use client';
import { Translate } from '@/lib/i18n/provider';

import Link from 'next/link';
import ThemeToggle from '../ThemeToggle';
import { useAuth } from '../Providers';
import LanguageSelect from './LanguageSelect';

export default function Navbar() {
  const { login } = useAuth();

  return (
    <header
      className="sticky top-0 z-30 backdrop-blur"
      style={{
        background: 'color-mix(in srgb, var(--bg) 85%, transparent)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
        <Link href="/" className="font-display text-xl font-bold">
          Prky<span style={{ color: 'var(--lime)' }}>.</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <LanguageSelect />
          <ThemeToggle />
          <button
            className="btn btn-primary"
            onClick={() => login().catch((e) => alert(e.message))}
          ><Translate text={"Connect wallet"} /></button>
        </div>
      </div>
    </header>
  );
}
