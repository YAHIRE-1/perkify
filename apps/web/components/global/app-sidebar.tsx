'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import type { ComponentProps } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@perkify/ui/components/sidebar';
import { NavMain } from '@/components/global/nav-main';
import { NavUser } from '@/components/global/nav-user';

function Wordmark() {
  return (
    <span className="font-display text-xl font-bold">
      Prky<span className="text-(--lime)">.</span>
    </span>
  );
}

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  // En móvil el menú es un sheet sobre la página; ciérralo al navegar.
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Expandido: wordmark completo */}
            <SidebarMenuButton
              className="h-12 group-data-[collapsible=icon]:hidden hover:bg-transparent"
              render={<Link aria-label="Perkify, ir al inicio" href="/" />}
            >
              <Wordmark />
            </SidebarMenuButton>
            {/* Colapsado: solo la marca */}
            <SidebarMenuButton
              className="hidden justify-center group-data-[collapsible=icon]:flex hover:bg-transparent"
              render={<Link aria-label="Perkify, ir al inicio" href="/" />}
              tooltip="Perkify"
            >
              <span className="font-display text-lg font-bold">
                P<span className="text-(--lime)">.</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}