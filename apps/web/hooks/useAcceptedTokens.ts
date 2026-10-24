'use client';
import { useEffect, useState } from 'react';
import { erc20Abi } from 'viem';
import { useAccount, useReadContracts } from 'wagmi';
import { orpc, errorMessage } from '@/lib/orpc';

export type AcceptedToken = {
  id: string;
  chainId: number;
  address: `0x${string}`;
  symbol: string;
  decimals: number;
};
export type AcceptedTokenWithBalance = AcceptedToken & { balance: bigint | null };

/**
 * Tokens que acepta la plataforma en la chain de la wallet conectada (ERC-20 únicamente),
 * con el saldo de la wallet. El `id` es el `tokenId` que espera quests.create.
 */
export function useAcceptedTokens() {
  const { address, chainId, isConnected } = useAccount();
  const [list, setList] = useState<AcceptedToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[wallet]', { isConnected, chainId, address });

    if (!isConnected || !chainId) {
      setList([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    orpc.tokens
      .list({ chainId })
      .then((r) => {
        console.log('[tokens.list]', { chainId, count: (r as unknown[]).length });
        if (!cancelled) setList(r as AcceptedToken[]);
      })
      .catch((e) => {
        console.error('[tokens.list] error', e);
        if (!cancelled) setError(errorMessage(e));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isConnected, chainId, address]);

  const balances = useReadContracts({
    contracts: list.map((t) => ({
      address: t.address,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [address as `0x${string}`] as const,
      chainId: t.chainId,
    })),
    query: { enabled: isConnected && !!address && list.length > 0 },
  });

  // ---- DEBUG: por qué un saldo sale en null ----
  useEffect(() => {
    if (!balances.data && !balances.error) return;
    console.log(
      '[balances]',
      balances.error?.message ?? '',
      list.map((t, i) => {
        const r = balances.data?.[i];
        return `${t.symbol}@${t.chainId}: ${r?.status ?? 'sin dato'}${
          r?.status === 'failure' ? ` → ${r.error.message}` : ''
        }`;
      }),
    );
  }, [balances.data, balances.error, list]);

  const tokens: AcceptedTokenWithBalance[] = list.map((t, i) => {
    const r = balances.data?.[i];
    return { ...t, balance: r?.status === 'success' ? (r.result as bigint) : null };
  });

  return { tokens, isLoading: loading || balances.isLoading, error, isConnected, chainId };
}