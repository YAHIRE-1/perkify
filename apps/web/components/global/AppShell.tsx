'use client';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import { AppSidebar } from './app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@perkify/ui/components/sidebar';
import { useAuth } from '../Providers';
import NotificationBell from '../notifications/NotificationBell';
import LanguageSelect from './LanguageSelect';
import FirstRunTour from './FirstRunTour';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (pathname === '/' || pathname === '/how-to-test-perkify' || pathname === '/terms' || pathname === '/privacy' || loading) {
    return <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>;
  }

  // Visitante: navbar arriba
  if (!user) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </>
    );
  }

  // Logueado: sidebar lateral
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header
          className="sticky top-0 z-20 flex h-12 items-center gap-2 px-4 backdrop-blur"
          style={{
            background: 'color-mix(in srgb, var(--bg) 85%, transparent)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <SidebarTrigger />
          <NotificationBell key={`notifications:${user.id}`} userId={user.id} />
          <FirstRunTour key={`tour:${user.id}`} userId={user.id} />
          <LanguageSelect />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
