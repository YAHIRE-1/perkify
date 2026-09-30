// src/lib/useWalletTokens.ts
import { useAccount, useReadContracts } from 'wagmi';
import { KNOWN_TOKENS } from '@/lib/knownTokens';

const ERC20_BALANCE_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

export interface WalletToken {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  balance: bigint;
}

export function useWalletTokens() {
  const { address, isConnected, chainId } = useAccount();
  const tokenList = chainId ? (KNOWN_TOKENS[chainId] ?? []) : [];

  const { data, isLoading, error, status } = useReadContracts({
    contracts: tokenList.map((t) => ({
      address: t.address,
      abi: ERC20_BALANCE_ABI,
      functionName: 'balanceOf',
      args: address ? [address] : undefined,
    })),
    query: { enabled: isConnected && !!address && tokenList.length > 0 },
  });

  const tokens: WalletToken[] =
    data?.reduce<WalletToken[]>((acc, result, i) => {
      if (result.status === 'success' && result.result > BigInt(0)) {     
        acc.push({ ...tokenList[i], balance: result.result });
      }
      return acc;
    }, []) ?? [];


  return { tokens, isLoading, isConnected, chainId };
}