import { useMutation } from '@tanstack/react-query';
import type { User } from '@/collections/schemas/User';
import { authClient } from '@/lib/auth-client';

/** Usuario actual (sesión de better-auth, por cookie) */
export function useMe() {
  const { data: session, isPending, error, refetch } = authClient.useSession();

  return {
    data: (session?.user as unknown as User) ?? null,
    isLoading: isPending,
    error,
    refetch,
  };
}

/**
 * Actualiza el usuario.
 * better-auth refresca la sesión después de updateUser.
 */
export function useUpdateMe() {
  return useMutation<void, Error, Partial<Pick<User, 'avatarUrl' | 'bio' | 'name'>>>({
    mutationFn: async (d) => {
      const { error } = await authClient.updateUser({
        name: d.name ?? undefined,
        image: d.avatarUrl ?? undefined, 
        ...(d.bio !== undefined && {
          additionalFields: {
            bio: d.bio,
          },
        }),
      });

      if (error) throw new Error(error.message ?? 'No se pudo actualizar el perfil');
    },
  });
}

/** Cerrar sesión */
export function useLogout() {
  return async () => {
    await authClient.signOut();
  };
}