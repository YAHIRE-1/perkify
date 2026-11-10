'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Store, ScrollText, PlusCircle, Scale } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem } from '@perkify/ui/components/sidebar';
import { cn } from '@perkify/ui/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Marketplace', icon: Store },
  { href: '/quests/mine', label: 'My quests', icon: ScrollText },
  { href: '/quests/new', label: 'Create quest', icon: PlusCircle },
  { href: '/disputes', label: 'Disputes', icon: Scale },
];

export function NavMain() {
  const pathname = usePathname();

  // El match más largo gana, así /quests/mine y /quests/new no se pisan
  const activeHref = NAV_ITEMS
    .filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <SidebarMenu>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === activeHref;

        return (
          <SidebarMenuItem key={href}>
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-sm transition-colors',
                'hover:bg-sidebar-accent [&_svg]:size-4 [&_svg]:shrink-0',
                active && 'bg-sidebar-accent font-medium'
              )}
              style={{ color: active ? 'var(--accent-text)' : 'var(--muted)' }}
            >
              <Icon style={active ? { color: 'var(--lime)' } : undefined} />
              <span>{label}</span>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}