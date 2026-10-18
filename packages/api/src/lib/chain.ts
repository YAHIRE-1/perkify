import { ORPCError } from "@orpc/server";
import { getQuestEscrowAddress } from "@perkify/contracts";
import { createPublicClient, http, type PublicClient } from "viem";
import { arbitrum, arbitrumSepolia } from "viem/chains";

const SUPPORTED = {
  [arbitrumSepolia.id]: { chain: arbitrumSepolia, rpcEnv: "ARBITRUM_SEPOLIA_RPC_URL" },
  [arbitrum.id]: { chain: arbitrum, rpcEnv: "ARBITRUM_RPC_URL" },
} as const;

const clients = new Map<number, PublicClient>();

export const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function assertSupportedChain(chainId: number) {
  if (!(chainId in SUPPORTED)) {
    throw new ORPCError("BAD_REQUEST", { message: `Chain no soportada: ${chainId}` });
  }
}

export function getPublicClient(chainId: number): PublicClient {
  const cached = clients.get(chainId);
  if (cached) return cached;

  assertSupportedChain(chainId);
  const entry = SUPPORTED[chainId as keyof typeof SUPPORTED];

  const rpcUrl = process.env[entry.rpcEnv];
  if (!rpcUrl) {
    throw new ORPCError("SERVICE_UNAVAILABLE", { message: `Falta ${entry.rpcEnv} en el entorno` });
  }

  const client = createPublicClient({
    chain: entry.chain,
    transport: http(rpcUrl),
  }) as PublicClient;
  clients.set(chainId, client);
  return client;
}

/** Dirección de nuestro QuestEscrow en esa chain (o error si aún no se despliega). */
export function getEscrowAddress(chainId: number): `0x${string}` {
  let address: `0x${string}` | undefined;
  try {
    address = getQuestEscrowAddress(chainId) as `0x${string}` | undefined;
  } catch {
    address = undefined;
  }
  if (!address) {
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: `QuestEscrow no está desplegado en la chain ${chainId}`,
    });
  }
  return address;
}