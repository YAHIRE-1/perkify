'use client';
import { useTheme } from './Providers';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button onClick={toggle} role="switch" aria-checked={dark} aria-label="Cambiar entre modo oscuro y claro"
      className="relative h-8 w-14 shrink-0 rounded-full border"
      style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
      <span className="absolute top-1 grid h-6 w-6 place-items-center rounded-full text-xs transition-all"
        style={{ left: dark ? 4 : 28, background: 'var(--lime)', color: 'var(--on-lime)' }}>
        {dark ? '☾' : '☀'}
      </span>
    </button>
  );
}
