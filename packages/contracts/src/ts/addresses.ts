import { arbitrum, arbitrumSepolia } from "viem/chains";

/// Direcciones del contrato por red. Se llenan después de cada despliegue
/// (el script Deploy.s.sol imprime la dirección).
export const questEscrowAddresses = {
  [arbitrumSepolia.id]: undefined as `0x${string}` | undefined,
  [arbitrum.id]: undefined as `0x${string}` | undefined,
} as const;

export type SupportedChainId = keyof typeof questEscrowAddresses;

export function getQuestEscrowAddress(chainId: number): `0x${string}` {
  const address = questEscrowAddresses[chainId as SupportedChainId];
  if (!address) {
    throw new Error(`QuestEscrow no está desplegado en la chain ${chainId}`);
  }
  return address;
}
