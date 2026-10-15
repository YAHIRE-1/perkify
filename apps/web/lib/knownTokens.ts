import { arbitrum, sepolia, mainnet, base } from 'wagmi/chains';

export const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export interface KnownToken {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
}


export const KNOWN_TOKENS: Record<number, KnownToken[]> = {
  [mainnet.id]: [
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
  ],
  [base.id]: [
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6 },
  ],
  [arbitrum.id]: [
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6 },
  ],
  [sepolia.id]: [
    { address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', symbol: 'USDC', decimals: 6 },
  ],
};