import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Quest, QuestFilters, Page } from '../api/types';
import { api, ApiError } from '../api/client';

export const questKeys = {
  all: ['quests'] as const,
  lists: () => [...questKeys.all, 'list'] as const,
  list: (filters: QuestFilters = {}) => [...questKeys.lists(), filters] as const,
  mine: () => [...questKeys.all, 'mine'] as const,
  mineList: (filters: QuestFilters = {}) => [...questKeys.mine(), filters] as const,
  details: () => [...questKeys.all, 'detail'] as const,
  detail: (id: string) => [...questKeys.details(), id] as const,
};

/** GET /quests (público — nunca incluye DRAFTs) */
export function useQuests(filters: QuestFilters = {}) {
  return useQuery<Page<Quest>, ApiError>({
    queryKey: questKeys.list(filters),
    queryFn: () => api.quests.list(filters),
    placeholderData: (previousData) => previousData, // paginación fluida
  });
}

/**
 * GET /quests/mine (privado — requiere sesión, incluye DRAFTs propios)
 * enabled se apaga automáticamente si no se pasa isAuthenticated=true,
 * para no disparar la query antes de tener sesión.
 */
export function useMyQuests(filters: QuestFilters = {}, options?: { enabled?: boolean }) {
  return useQuery<Page<Quest>, ApiError>({
    queryKey: questKeys.mineList(filters),
    queryFn: () => api.quests.mine(filters),
    enabled: options?.enabled ?? true,
    placeholderData: (previousData) => previousData,
  });
}

/** GET /quests/:id */
export function useQuest(id: string, options?: { enabled?: boolean }) {
  return useQuery<Quest, ApiError>({
    queryKey: questKeys.detail(id),
    queryFn: () => api.quests.get(id),
    enabled: (options?.enabled ?? true) && !!id,
  });
}

/**
 * POST /quests
 * Invalida todas las listas de quests (públicas y propias) al crear una nueva.
 */
export function useCreateQuest() {
  const queryClient = useQueryClient();

  return useMutation<Quest, ApiError, Partial<Quest>>({
    mutationFn: (d) => api.quests.create(d),
    onSuccess: (newQuest) => {
      queryClient.invalidateQueries({ queryKey: questKeys.lists() });
      queryClient.invalidateQueries({ queryKey: questKeys.mine() });
      queryClient.setQueryData(questKeys.detail(newQuest.id), newQuest);
    },
  });
}

/**
 * PATCH /quests/:id
 * Invalida listas (públicas y propias) y el detalle específico afectado.
 */
export function useUpdateQuest() {
  const queryClient = useQueryClient();

  return useMutation<Quest, ApiError, { id: string; data: Partial<Quest> }>({
    mutationFn: ({ id, data }) => api.quests.update(id, data),
    onSuccess: (updatedQuest, variables) => {
      queryClient.invalidateQueries({ queryKey: questKeys.lists() });
      queryClient.invalidateQueries({ queryKey: questKeys.mine() });
      queryClient.invalidateQueries({ queryKey: questKeys.detail(variables.id) });
      queryClient.setQueryData(questKeys.detail(variables.id), updatedQuest);
    },
  });
}

/**
 * DELETE /quests/:id
 * Invalida listas (públicas y propias) y elimina el detalle de la cache.
 */
export function useDeleteQuest() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.quests.remove(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: questKeys.lists() });
      queryClient.invalidateQueries({ queryKey: questKeys.mine() });
      queryClient.removeQueries({ queryKey: questKeys.detail(id) });
    },
  });
}