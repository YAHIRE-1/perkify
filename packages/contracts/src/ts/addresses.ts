import { arbitrum, arbitrumSepolia, foundry } from "viem/chains";

export const questEscrowAddresses = {
  // Local (anvil), chain id 31337. Solo desarrollo.
  [foundry.id]: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" as `0x${string}`,
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