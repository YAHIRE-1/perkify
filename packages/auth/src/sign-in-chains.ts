import {
  arbitrum,
  arbitrumSepolia,
  mainnet,
  robinhoodTestnet,
  sepolia,
} from "viem/chains";

export const signInChains = [
  mainnet,
  arbitrum,
  robinhoodTestnet,
  sepolia,
  arbitrumSepolia,
] as const;

export type SignInChain = (typeof signInChains)[number];
