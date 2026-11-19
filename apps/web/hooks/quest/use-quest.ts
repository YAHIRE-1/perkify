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
    staleTime: 15_000,
    enabled: options?.enabled ?? true,
  });
}

export function useMyQuests(params: ListInput, enabled: boolean) {
  return useQuery({
    ...orpc.quests.mine.queryOptions({ input: params }),
    placeholderData: keepPreviousData,
    enabled,
    refetchInterval: (query) => query.state.data?.items.some((quest) => quest.cancelExpiresAt != null) ? 15_000 : false,
  });
}

export function useGetQuest(id: string, enabled = true) {
  return useQuery({
    ...orpc.quests.get.queryOptions({ input: { id } }),
    enabled,
    refetchInterval: (query) => {
      const quest = query.state.data;
      return quest?.status === "FUNDED" || quest?.status === "DISPUTED" || quest?.cancelExpiresAt != null ? 15_000 : false;
    },
  });
}

export function useInvalidateQuestQueries() {
  const queryClient = useQueryClient();

  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: orpc.quests.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.disputes.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.notifications.key() }),
  ]);
}

export function useCreateQuest() {
  const invalidateQuestQueries = useInvalidateQuestQueries();
  return useMutation(
    orpc.quests.create.mutationOptions({
      onSuccess: invalidateQuestQueries,
      onError: (error: Error) => toast.error(error.message),
    })
  );
}

export function useConfirmQuest() {
  const invalidateQuestQueries = useInvalidateQuestQueries();
  return useMutation(
    orpc.quests.confirm.mutationOptions({
      onSuccess: async () => {
        toast.success("Quest fondeada");
        await invalidateQuestQueries();
      },
      onError: (error: Error) => toast.error(error.message),
    })
  );
}

export function useUpdateQuest() {
  const invalidateQuestQueries = useInvalidateQuestQueries();

  return useMutation(
    orpc.quests.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Cliente actualizado");
        await invalidateQuestQueries();
      },
      onError: (error: Error) => toast.error(error.message),
    })
  );
}

export function useArchiveQuest() {
  const invalidateQuestQueries = useInvalidateQuestQueries();

  return useMutation({
    mutationFn: (q: Pick<QuestRow, "id" | "title">) =>
      client.quests.archive({ id: q.id }),
    onSuccess: async (_data, q) => {
      await invalidateQuestQueries();
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
