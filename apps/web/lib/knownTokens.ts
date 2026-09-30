// src/lib/knownTokens.ts
import { arbitrum, sepolia } from 'wagmi/chains';

export interface KnownToken {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
}

export const KNOWN_TOKENS: Record<number, KnownToken[]> = {
  [arbitrum.id]: [
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6 },
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', decimals: 6 },
  ],
  [sepolia.id]: [
    // USDC testnet oficial de Circle en Ethereum Sepolia
    { address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', symbol: 'USDC', decimals: 6 },
    // No hay un USDT de testnet "oficial" equivalente (Tether no publica uno para Sepolia).
    // Si necesitás probar con USDT, tenés que desplegar tu propio ERC-20 mock, o sacar
    // testnet USDC del faucet de Circle (https://faucet.circle.com) y probar solo con ese.
  ],
};