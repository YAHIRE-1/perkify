'use client';
import Link from 'next/link';
import ThemeToggle from '../ThemeToggle';
import { useAuth } from '../Providers';

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
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-display text-xl font-bold">
          Prky<span style={{ color: 'var(--lime)' }}>.</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <button
            className="btn btn-primary"
            onClick={() => login().catch((e) => alert(e.message))}
          >
            Connect wallet
          </button>
        </div>
      </div>
    </header>
  );
}