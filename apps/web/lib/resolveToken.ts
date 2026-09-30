import { createPublicClient, http, isAddress, getContract } from 'viem';
import { mainnet } from 'viem/chains';

const ERC20_ABI = [
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const;

const client = createPublicClient({ chain: mainnet, transport: http() });

export async function resolveToken(address: string): Promise<{ symbol: string; decimals: number }> {
  if (!isAddress(address)) throw new Error('Dirección de contrato inválida');
  const contract = getContract({ address: address as `0x${string}`, abi: ERC20_ABI, client });
  const [symbol, decimals] = await Promise.all([
    contract.read.symbol(),
    contract.read.decimals(),
  ]);
  return { symbol, decimals: Number(decimals) };
}