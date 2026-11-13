import type { LucideIcon } from 'lucide-react';
import { PlusCircle, Scale, ScrollText, Store } from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavLink[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Explorar',
    items: [
      { href: '/dashboard', label: 'Marketplace', icon: Store },
      { href: '/disputes', label: 'Disputes', icon: Scale },
    ],
  },
  {
    label: 'Quests',
    items: [
      { href: '/quests/mine', label: 'My quests', icon: ScrollText },
      { href: '/quests/new', label: 'Create quest', icon: PlusCircle },
    ],
  },
];

const ALL_LINKS = NAV_GROUPS.flatMap((group) => group.items);

function matches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** El match más largo gana, así /quests/mine y /quests/new no se pisan. */
export function getActiveHref(pathname: string) {
  return ALL_LINKS.filter(({ href }) => matches(pathname, href)).sort(
    (a, b) => b.href.length - a.href.length
  )[0]?.href;
}