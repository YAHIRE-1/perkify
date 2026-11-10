import { ENV } from "../env";
import { arbitrum, arbitrumSepolia, foundry, sepolia } from "viem/chains";

type Address = `0x${string}`;

export const questEscrowAddresses = {
  [foundry.id]: ENV.QUEST_ESCROW_ANVIL as Address,
  [sepolia.id]: ENV.QUEST_ESCROW_SEPOLIA as Address,
  [arbitrumSepolia.id]: undefined as Address | undefined,
  [arbitrum.id]: undefined as Address | undefined,
} as const;

export const questEscrowDeployBlocks = {
  [sepolia.id]: BigInt(ENV.QUEST_ESCROW_SEPOLIA_BLOCK),
} as const;

export type SupportedChainId = keyof typeof questEscrowAddresses;

export function getQuestEscrowAddress(chainId: number): Address {
  const address = questEscrowAddresses[chainId as SupportedChainId];
  if (!address) {
    throw new Error(`QuestEscrow no está desplegado en la chain ${chainId}`);
  }
  return address;
}