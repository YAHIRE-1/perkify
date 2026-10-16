import { useMutation } from "@tanstack/react-query";
import { authClient, type SessionUser } from "@/lib/auth-client";

export function useMe() {
  const { data: session, isPending, error, refetch } = authClient.useSession();

  return {
    data: session?.user ?? null, // ya viene tipado como SessionUser, sin casts
    isLoading: isPending,
    error,
    refetch,
  };
}

type UpdateMeInput = Partial<Pick<SessionUser, "name" | "bio" | "avatarUrl">>;

export function useUpdateMe() {
  return useMutation<void, Error, UpdateMeInput>({
    mutationFn: async (d) => {
      const { error } = await authClient.updateUser({
        ...(d.name !== undefined && { name: d.name }),
        ...(d.bio !== undefined && { bio: d.bio }),
        ...(d.avatarUrl !== undefined && { avatarUrl: d.avatarUrl }),
      });

      if (error) throw new Error(error.message ?? "No se pudo actualizar el perfil");
    },
  });
}

export function useLogout() {
  return async () => {
    await authClient.signOut();
  };
}