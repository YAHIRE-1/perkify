import { createAuth } from "@perkify/auth";
import { createDb } from "@perkify/db";
import type { SupportedChainId } from "@perkify/contracts/addresses";
import { ORPCError } from "@orpc/server";
import { createPublicClient, http, type Chain, type PublicClient } from "viem";
import { arbitrum, arbitrumSepolia, foundry, sepolia } from "viem/chains";
import { ENV } from "./env";

export const db = createDb(ENV);

export const auth = createAuth(db);

const chains: Record<SupportedChainId, Chain> = {
  [foundry.id]: foundry,
  [sepolia.id]: sepolia,
  [arbitrumSepolia.id]: arbitrumSepolia,
  [arbitrum.id]: arbitrum,
};

const rpcConfig: Record<SupportedChainId, { envName: string; url: string | undefined }> = {
  [foundry.id]: { envName: "(hardcoded)", url: "http://127.0.0.1:8545" },
  [sepolia.id]: { envName: "SEPOLIA_RPC_URL", url: ENV.SEPOLIA_RPC_URL },
  [arbitrumSepolia.id]: { envName: "ARBITRUM_SEPOLIA_RPC_URL", url: ENV.ARBITRUM_SEPOLIA_RPC_URL },
  [arbitrum.id]: { envName: "ARBITRUM_RPC_URL", url: ENV.ARBITRUM_RPC_URL },
};

// Log al arrancar: qué RPCs están configurados (sin exponer las URLs, llevan API keys)
for (const [id, { envName, url }] of Object.entries(rpcConfig)) {
  console.log(`[rpc] chain ${id} ${envName}: ${url ? "OK" : "FALTA"}`);
}

const clients = new Map<number, PublicClient>();

export function getPublicClient(chainId: SupportedChainId): PublicClient {
  let client = clients.get(chainId);
  if (!client) {
    const config = rpcConfig[chainId];
    if (!config) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: `Chain ${chainId} sin configuración RPC`,
      });
    }
    if (!config.url) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: `RPC URL vacío para chainId=${chainId} (${config.envName}). Valor recibido: ${JSON.stringify(config.url)}`,
      });
    }
    client = createPublicClient({
      chain: chains[chainId],
      transport: http(config.url),
    }) as PublicClient;
    clients.set(chainId, client);
  }
  return client;
}