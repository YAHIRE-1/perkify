import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';

export const escrowKeys = {
  all: ['escrow'] as const,
  status: (questId: string) => [...escrowKeys.all, 'status', questId] as const,
};

type PrepareDepositResponse = { to: string; data: string; value?: string };
type EscrowStatusResponse = { status: string; [k: string]: unknown };

/**
 * POST /escrow/prepare-deposit
 * Al completarse, invalida el status de escrow de ese quest (por si el
 * backend ya refleja un cambio, p. ej. "pending_deposit").
 */
export function usePrepareDeposit() {
  const queryClient = useQueryClient();

  return useMutation<PrepareDepositResponse, ApiError, string>({
    mutationFn: (questId) => api.escrow.prepareDeposit(questId),
    onSuccess: (_data, questId) => {
      queryClient.invalidateQueries({ queryKey: escrowKeys.status(questId) });
    },
  });
}

/**
 * GET /escrow/status/:questId
 * Se refresca periódicamente mientras el estado no sea final, útil para
 * hacer polling tras confirmar una transacción on-chain.
 */
export function useEscrowStatus(
  questId: string,
  options?: { enabled?: boolean; pollWhilePending?: boolean },
) {
  return useQuery<EscrowStatusResponse, ApiError>({
    queryKey: escrowKeys.status(questId),
    queryFn: () => api.escrow.status(questId),
    enabled: (options?.enabled ?? true) && !!questId,
    refetchInterval: (query) => {
      if (!options?.pollWhilePending) return false;
      const status = query.state.data?.status;
      const finalStates = ['completed', 'released', 'refunded', 'failed'];
      return status && finalStates.includes(status) ? false : 4000;
    },
  });
}
