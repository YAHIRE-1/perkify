'use client';
import { useLanguage } from '@/lib/i18n/provider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@perkify/ui/components/sidebar';
import { NAV_GROUPS, getActiveHref } from '@/components/global/nav-items';

export function NavMain() {
  const { t } = useLanguage();
  const activeHref = getActiveHref(usePathname());

  return (
    <>
      {NAV_GROUPS.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{t(group.label)}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map(({ href, label, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  isActive={href === activeHref}
                  render={<Link href={href} />}
                  tooltip={t(label)}
                >
                  <Icon />
                  <span>{t(label)}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
