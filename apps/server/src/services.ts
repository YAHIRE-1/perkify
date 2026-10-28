import { createAuth } from "@perkify/auth";
import { createDb } from "@perkify/db";
import { createPublicClient, http, type PublicClient } from "viem";
import { arbitrum, arbitrumSepolia, foundry, sepolia } from "viem/chains";
import { ENV } from "./env";
import type { SupportedChainId } from "@perkify/contracts/addresses";

export const db = createDb(ENV);

export const auth = createAuth(db);

const rpcUrls: Record<SupportedChainId, string> = {
  [foundry.id]: "http://127.0.0.1:8545",
  [sepolia.id]: ENV.NEXT_PUBLIC_SEPOLIA_RPC_URL,
  [arbitrumSepolia.id]: ENV.ARBITRUM_SEPOLIA_RPC_URL,
  [arbitrum.id]: ENV.ARBITRUM_RPC_URL,
};

const clients = new Map<number, PublicClient>();

export function getPublicClient(chainId: SupportedChainId): PublicClient {
  let client = clients.get(chainId);
  if (!client) {
    client = createPublicClient({ transport: http(rpcUrls[chainId]) });
    clients.set(chainId, client);
  }
  return client;
}