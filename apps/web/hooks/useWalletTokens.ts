import { useEffect } from 'react';
import { useAccount, useBalance, useReadContracts, useConfig } from 'wagmi';
import { KNOWN_TOKENS, NATIVE_TOKEN_ADDRESS } from '@/lib/knownTokens';

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
  const config = useConfig();
  const { address, isConnected, chainId } = useAccount();
  const tokenList = chainId ? (KNOWN_TOKENS[chainId] ?? []) : [];
  const isSupportedChain = tokenList.length > 0;

  const erc20 = useReadContracts({
    contracts: tokenList.map((t) => ({
      address: t.address,
      abi: ERC20_BALANCE_ABI,
      functionName: 'balanceOf',
      args: [address!],
      chainId,
    })),
    query: { enabled: isConnected && !!address && isSupportedChain },
  });

  const native = useBalance({
    address,
    chainId,
    query: { enabled: isConnected && !!address && isSupportedChain },
  });

  // ---------- DEBUG ----------
  useEffect(() => {
    console.group('[useWalletTokens] estado');
    console.log('isConnected:', isConnected);
    console.log('address:', address);
    console.log('chainId (wallet):', chainId);
    console.log('chains en wagmiConfig:', config.chains.map((c) => `${c.name} (${c.id})`));
    console.log('chainId configurado en wagmi?:', config.chains.some((c) => c.id === chainId));
    console.log('isSupportedChain:', isSupportedChain);
    console.log('tokenList:', tokenList);
    console.groupEnd();
  }, [isConnected, address, chainId, isSupportedChain]);

  useEffect(() => {
    console.group('[useWalletTokens] ERC-20 (useReadContracts)');
    console.log('status:', erc20.status, '| fetchStatus:', erc20.fetchStatus);
    console.log('isLoading:', erc20.isLoading);
    console.log('error (global):', erc20.error);
    if (erc20.error) {
      console.log('error.name:', erc20.error.name);
      console.log('error.message:', erc20.error.message);
      console.log('error.cause:', (erc20.error as any).cause);
    }
    erc20.data?.forEach((r, i) => {
      console.log(`  [${tokenList[i]?.symbol}] ${tokenList[i]?.address}`, {
        status: r.status,
        result: r.status === 'success' ? String(r.result) : undefined,
        error: r.status === 'failure' ? r.error : undefined,
      });
    });
    console.groupEnd();
  }, [erc20.status, erc20.fetchStatus, erc20.error, erc20.data]);

  useEffect(() => {
    console.group('[useWalletTokens] ETH nativo (useBalance)');
    console.log('status:', native.status, '| fetchStatus:', native.fetchStatus);
    console.log('isLoading:', native.isLoading);
    console.log('data:', native.data && { ...native.data, value: String(native.data.value) });
    console.log('error:', native.error);
    if (native.error) {
      console.log('error.name:', native.error.name);
      console.log('error.message:', native.error.message);
      console.log('error.cause:', (native.error as any).cause);
    }
    console.groupEnd();
  }, [native.status, native.fetchStatus, native.error, native.data]);
  // ---------- /DEBUG ----------

  const tokens: WalletToken[] = [];

  if (native.data && native.data.value > BigInt(0)) {
    tokens.push({
      address: NATIVE_TOKEN_ADDRESS,
      symbol: native.data.symbol,
      decimals: native.data.decimals,
      balance: native.data.value,
    });
  }

  erc20.data?.forEach((result, i) => {
    if (result.status === 'success' && (result.result as bigint) > BigInt(0)) {
      tokens.push({ ...tokenList[i], balance: result.result as bigint });
    }
  });

  return {
    tokens,
    isLoading: erc20.isLoading || native.isLoading,
    isConnected,
    chainId,
    isSupportedChain,
    error: erc20.error ?? native.error,
  };
}