'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { config } from '@/lib/wagmi';
import { authClient } from '@/lib/auth-client';
import { signInWithWallet } from '@/lib/wallet-auth';
import type { UserRow as User } from '@perkify/db';

// ---------- Tema (oscuro/claro) ----------
type Theme = 'dark' | 'light';

const ThemeCtx = createContext<{
  theme: Theme;
  toggle: () => void;
}>({
  theme: 'dark',
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeCtx);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as Theme) || 'dark');
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';

    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('prky_theme', next);
  };

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}

// ---------- Auth (wallet + SIWE + sesión better-auth) ----------
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

export const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending, refetch } = authClient.useSession();
  const [signingIn, setSigningIn] = useState(false);

  const login = async () => {
    setSigningIn(true);
    try {
      await signInWithWallet();
      await refetch();
    } finally {
      setSigningIn(false);
    }
  };

  const logout = async () => {
    await authClient.signOut();
    await refetch();
  };

  const refresh = async () => {
    await refetch();
  };

  return (
    <AuthCtx.Provider
      value={{
        user: (session?.user as unknown as User) ?? null,
        loading: isPending || signingIn,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

// ---------- Composición ----------
export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutos
            retry: (failureCount, error: any) => {
              // Desactivar reintentos en errores 4xx
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
          },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}