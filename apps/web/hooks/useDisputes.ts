import { useQuery } from '@tanstack/react-query';
import type { Dispute, Page } from '../api/types';
import { api, ApiError } from '../api/client';

export const disputeKeys = {
  all: ['disputes'] as const,
  list: () => [...disputeKeys.all, 'list'] as const,
};

/** GET /disputes */
export function useDisputes() {
  return useQuery<Page<Dispute>, ApiError>({
    queryKey: disputeKeys.list(),
    queryFn: api.disputes.list,
  });
}
