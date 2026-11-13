'use client';
import Link from 'next/link';
import { ChevronsUpDown, LogOut, User } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@perkify/ui/components/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@perkify/ui/components/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@perkify/ui/components/sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/components/Providers';

const short = (address?: string | null) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

function initials(name: string) {
  return name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}

interface IdentityProps {
  name: string;
  subtitle?: string;
  image?: string | null;
}

function UserIdentity({ name, subtitle, image }: IdentityProps) {
  return (
    <>
      <Avatar>
        {image ? <AvatarImage alt="" src={image} /> : null}
        <AvatarFallback>{initials(name) || '?'}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{name}</span>
        {subtitle ? (
          <span className="text-muted-foreground truncate text-xs">
            {subtitle}
          </span>
        ) : null}
      </div>
    </>
  );
}

export function NavUser() {
  const { user, logout } = useAuth();
  const { isMobile } = useSidebar();

  if (!user) return null;

  const wallet = short(user.walletAddress);
  const identity: IdentityProps = {
    name: user.name || wallet,
    subtitle: user.name ? wallet : undefined,
    image: user.image,
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <UserIdentity {...identity} />
            <ChevronsUpDown className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex items-center gap-2">
                  <UserIdentity {...identity} />
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/profile" />}>
              <User />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-2 py-1.5 text-sm">
              <span className="text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}