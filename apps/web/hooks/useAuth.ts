import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@/collections/schemas/User';
import { api, ApiError, tokenStore } from '../api/client';

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

/** POST /auth/nonce */
export function useNonce() {
  return useMutation<{ nonce: string }, ApiError, string>({
    mutationFn: (address) => api.nonce(address),
  });
}

/**
 * POST /auth/verify
 * Al resolver, guarda el token en el tokenStore y refresca `me`.
 */
export function useVerify() {
  const queryClient = useQueryClient();

  return useMutation<{ accessToken: string }, ApiError, { message: string; signature: string }>({
    mutationFn: ({ message, signature }) => api.verify(message, signature),
    onSuccess: (data) => {
      tokenStore.set(data.accessToken);
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
}

/** GET /me */
export function useMe(options?: { enabled?: boolean }) {
  return useQuery<User, ApiError>({
    queryKey: authKeys.me(),
    queryFn: api.me,
    enabled: options?.enabled ?? (typeof window !== 'undefined' && !!tokenStore.get()),
    retry: false,
  });
}

/**
 * PATCH /me
 * Actualiza el usuario y sincroniza la cache de `me` de forma optimista,
 * además de invalidarla para asegurar consistencia con el servidor.
 */
export function useUpdateMe() {
  const queryClient = useQueryClient();

  return useMutation<User, ApiError, Partial<Pick<User, 'avatarUrl' | 'bio' | 'name'>>>({
    mutationFn: (d) => api.updateMe(d),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(authKeys.me(), updatedUser);
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
}

/** Utilidad para cerrar sesión (limpia token + cache local del usuario) */
export function useLogout() {
  const queryClient = useQueryClient();

  return () => {
    tokenStore.clear();
    queryClient.removeQueries({ queryKey: authKeys.me() });
  };
}
