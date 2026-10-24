import { ENV } from "../env";
import { createDb } from "../index";
import { tokens } from "../schema/tokens";

/**
 * Tokens aceptados (lista blanca). Verifica las direcciones en la documentación
 * de Circle antes de usarlas en producción, y mantén el mismo formato
 * (checksum o minúsculas) que las filas que ya existan en la tabla.
 */
const ACCEPTED_TOKENS = [
  {
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    chainId: 42_161, // Arbitrum One
    decimals: 6,
    symbol: "USDC",
  },
  {
    address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    chainId: 421_614, // Arbitrum Sepolia
    decimals: 6,
    symbol: "USDC",
  },
  {
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    chainId: 84_532, // Base Sepolia
    decimals: 6,
    symbol: "USDC",
  },
  {
    address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    chainId: 11_155_111, // Ethereum Sepolia
    decimals: 6,
    symbol: "USDC",
  },
];

export async function seedTokens() {
  const db = createDb({ DATABASE_URL: ENV.DATABASE_URL });

  console.log("🪙 Seeding accepted tokens...");

  const inserted = await db
    .insert(tokens)
    .values(ACCEPTED_TOKENS)
    .onConflictDoNothing({ target: [tokens.chainId, tokens.address] })
    .returning({ chainId: tokens.chainId, id: tokens.id, symbol: tokens.symbol });

  if (inserted.length === 0) {
    console.log("ℹ️  Tokens already seeded, skipping");

    return;
  }

  for (const row of inserted) {
    console.log(`✅ Token added: ${row.symbol} on chain ${row.chainId} (ID: ${row.id})`);
  }
}