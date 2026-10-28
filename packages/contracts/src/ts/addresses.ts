import { arbitrum, arbitrumSepolia, foundry, sepolia } from "viem/chains";

export const questEscrowAddresses = {
  [foundry.id]: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" as `0x${string}`,
  [sepolia.id]: "0x0EF7555573435b11ab3DaFAf38295FFad38FBE4B" as `0x${string}`,
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