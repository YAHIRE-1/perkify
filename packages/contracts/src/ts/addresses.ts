import { ENV } from "../env";
import { isAddress } from "viem";
import { arbitrum, arbitrumSepolia, foundry, robinhoodTestnet, sepolia } from "viem/chains";

type Address = `0x${string}`;

const robinhoodEscrow = ENV.QUEST_ESCROW_ROBINHOOD_TESTNET;

export const questEscrowAddresses = {
  [foundry.id]: ENV.QUEST_ESCROW_ANVIL as Address,
  [sepolia.id]: ENV.QUEST_ESCROW_SEPOLIA as Address,
  [arbitrumSepolia.id]: undefined as Address | undefined,
  [arbitrum.id]: undefined as Address | undefined,
  [robinhoodTestnet.id]: robinhoodEscrow && isAddress(robinhoodEscrow) ? robinhoodEscrow : undefined,
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
