'use client';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { LogOut, User } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@perkify/ui/components/sidebar';
import { cn } from '@perkify/ui/lib/utils';
import { NavMain } from '@/components/global/nav-main';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/components/Providers';

const short = (address?: string | null) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

const itemClass = cn(
  'flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-sm transition-colors',
  'hover:bg-[var(--sidebar-accent)] [&_svg]:size-4 [&_svg]:shrink-0'
);

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth();

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <Link href="/" className="font-display px-2 py-1 text-xl font-bold">
          Prky<span style={{ color: 'var(--lime)' }}>.</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <div className="p-2">
          <NavMain />
        </div>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/profile" className={itemClass} style={{ color: 'var(--muted)' }}>
              <User />
              <span className="truncate">
                {user?.name || short(user?.walletAddress)}
              </span>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <button
              type="button"
              onClick={logout}
              className={itemClass}
              style={{ color: 'var(--muted)' }}
            >
              <LogOut />
              <span>Log out</span>
            </button>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2">
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}