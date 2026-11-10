import type {
  AppRouterInputs,
  AppRouterOutputs,
} from "@perkify/api/routers/index";
import { useMutation, keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { client, orpc } from "@/utils/orpc";

export type ListInput = AppRouterInputs["quests"]["list"];
type QuestRow = AppRouterOutputs["quests"]["list"]["items"][number];

export function useListQuests(
  params: ListInput,
  options?: { enabled?: boolean },
) {
  return useQuery({
    ...orpc.quests.list.queryOptions({ input: params }),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

export function useGetQuest(id: string) {
  return useQuery(orpc.quests.get.queryOptions({ input: { id } }));
}

export function useCreateQuest() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.quests.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.quests.key() });
      },
      onError: (error: Error) => toast.error(error.message),
    })
  );
}

export function useConfirmQuest() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.quests.confirm.mutationOptions({
      onSuccess: async () => {
        toast.success("Quest fondeada");
        await queryClient.invalidateQueries({ queryKey: orpc.quests.key() });
      },
      onError: (error: Error) => toast.error(error.message),
    })
  );
}

export function useUpdateQuest() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.quests.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Cliente actualizado");
        await queryClient.invalidateQueries({ queryKey: orpc.quests.key() });
      },
      onError: (error: Error) => toast.error(error.message),
    })
  );
}

export function useArchiveQuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (q: Pick<QuestRow, "id" | "title">) =>
      client.quests.archive({ id: q.id }),
    onSuccess: async (_data, q) => {
      await queryClient.invalidateQueries({ queryKey: orpc.quests.key() });
      toast.success("Quest archivada", {
        description: `Se archivó "${q.title}" con éxito.`,
      });
    },
    onError: (error) => {
      console.error("Error al archivar la quest:", error);
      toast.error("Algo salió mal...", {
        description:
          "Hubo un error al archivar la quest. Intenta de nuevo.",
      });
    },
  });
}