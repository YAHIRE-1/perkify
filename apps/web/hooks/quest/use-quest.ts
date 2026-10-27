import type {
  AppRouterInputs,
  AppRouterOutputs,
} from "@perkify/api/routers/index";
import { useMutation, keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { client, orpc } from "@/utils/orpc";

type ListInput = AppRouterInputs["quests"]["list"];
type QuestRow = AppRouterOutputs["quests"]["list"]["items"][number];

export function useListQuests(params: ListInput) {
  return useQuery({
    ...orpc.quests.list.queryOptions({ input: params }),
    placeholderData: keepPreviousData,
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
    mutationFn: (Quest: Pick<QuestRow, "id" | "title" | "archived">) =>
      client.quests.archive({ id: Quest.id }),
    onSuccess: async (_data, Quest) => {
      await queryClient.invalidateQueries({ queryKey: orpc.quests.key() });
      toast.success(
        Quest.archived ? "Cliente desarchivado" : "Cliente archivado",
        {
          description: `Se ${Quest.archived ? "desarchivó" : "archivó"} a ${Quest.title} con éxito.`,
        }
      );
    },
    onError: (error) => {
      console.error("Error al archivar el cliente:", error);
      toast.error("Algo salió mal...", {
        description:
          "Hubo un error al cambiar el estado del cliente. Intenta de nuevo.",
      });
    },
  });
}