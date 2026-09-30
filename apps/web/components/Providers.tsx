'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { WagmiProvider, type State } from 'wagmi';
import { config as wagmiConfig } from '@/lib/wagmi';
import { api, tokenStore } from '@/api/client';
import { signInWithWallet } from '@/lib/siwe';
import type { User } from '@/collections/schemas/User';

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
    setTheme(
      (document.documentElement.dataset.theme as Theme) || 'dark'
    );
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

// ---------- Auth (wallet + SIWE + JWT) ----------
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  refresh: async () => {},
});

export const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasToken = mounted && typeof window !== 'undefined' && !!tokenStore.get();

  const {
    data: user,
    isLoading: loadingUser,
    error: meError,
  } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api.me();
      } catch (err) {
        tokenStore.clear();
        throw err;
      }
    },
    enabled: hasToken,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      const token = await signInWithWallet();
      tokenStore.set(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const login = async () => {
    await loginMutation.mutateAsync();
  };

  const logout = () => {
    tokenStore.clear();
    queryClient.setQueryData(['me'], null);
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const isAuthChecking = hasToken ? loadingUser : false;

  return (
    <AuthCtx.Provider
      value={{
        user: meError ? null : (user ?? null),
        loading: !mounted || isAuthChecking || loginMutation.isPending,
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
  initialWagmiState,
}: {
  children: React.ReactNode;
  initialWagmiState?: State;
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
    <WagmiProvider config={wagmiConfig} initialState={initialWagmiState}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}