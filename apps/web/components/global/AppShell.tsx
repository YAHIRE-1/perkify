'use client';
import Navbar from './Navbar';
import { AppSidebar } from './app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@perkify/ui/components/sidebar';
import { useAuth } from '../Providers';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Mientras carga la sesión no mostramos navbar ni sidebar (evita el parpadeo)
  if (loading) {
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
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}