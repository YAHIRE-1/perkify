'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { useAuth } from './Providers';

const short = (address?: string) => 
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

export default function Navbar() {
  const { user, loading, login, logout } = useAuth();
  const path = usePathname();
  const link = (href: string, label: string) => (
    <Link href={href} className="text-sm font-medium"
      style={{ color: path === href ? 'var(--accent-text)' : 'var(--muted)' }}>{label}</Link>
  );
  return (
    <header className="sticky top-0 z-30 backdrop-blur" style={{ background: 'color-mix(in srgb, var(--bg) 85%, transparent)', borderBottom: '1px solid var(--border)' }}>
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-display text-xl font-bold">Prky<span style={{ color: 'var(--lime)' }}>.</span></Link>
        <nav className="hidden gap-5 sm:flex">
          {link('/dashboard', 'Marketplace')}
          {user && link('/quests/mine', 'My quests')}
          {user && link('/quests/new', 'Create quest')}
          {user && link('/disputes', 'Disputes')}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          {loading ? null : user ? (
            <>
              <Link href="/profile" className="chip chip-cyan">{user.name || short(user.walletAddress)}</Link>
              <button className="btn" onClick={logout}>Log out</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => login().catch((e) => alert(e.message))}>Connect wallet</button>
          )}
        </div>
      </div>
    </header>
  );
}