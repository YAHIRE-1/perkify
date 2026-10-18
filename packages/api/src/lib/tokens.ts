import { ORPCError } from "@orpc/server";
import { tokens } from "@perkify/db";
import { eq } from "drizzle-orm";
import { parseUnits } from "viem";

import type { Context } from "../context";

export interface AcceptedToken {
  id: string;
  address: string;
  decimals: number;
  chainId: number;
  symbol: string;
}

/**
 * La tabla `tokens` actúa como lista blanca. Requiere la columna `decimals` (ver schema/tokens.ts).
 */
export async function getAcceptedToken(db: Context["db"], tokenId: string): Promise<AcceptedToken> {
  const [token] = await db
    .select({
      id: tokens.id,
      address: tokens.address,
      decimals: tokens.decimals,
      chainId: tokens.chainId,
      symbol: tokens.symbol,
    })
    .from(tokens)
    .where(eq(tokens.id, tokenId))
    .limit(1);

  if (!token) {
    throw new ORPCError("BAD_REQUEST", { message: "Token no aceptado" });
  }
  return token as AcceptedToken;
}

/**
 * Monto decimal ("25.5", o "25.500000000000000000" como lo devuelve numeric(36,18))
 * a unidades mínimas del token. Rechaza más decimales de los que admite el token.
 */
export function toUnits(amount: string, decimals: number): bigint {
  const [whole = "0", fraction = ""] = amount.split(".");
  const trimmed = fraction.replace(/0+$/, "");
  if (trimmed.length > decimals) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Este token admite máximo ${decimals} decimales`,
    });
  }
  const units = parseUnits(trimmed ? `${whole}.${trimmed}` : whole, decimals);
  if (units <= 0n) {
    throw new ORPCError("BAD_REQUEST", { message: "El monto debe ser mayor a 0" });
  }
  return units;
}