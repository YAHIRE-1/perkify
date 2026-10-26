import { tokens } from "@perkify/db/schema/tokens";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure } from "../index";
import { getAcceptedToken } from "../lib/tokens";

type TokenRow = typeof tokens.$inferSelect;

type TokenListItem = {
  id: string;
  chainId: number;
  address: string;
  symbol: string;
  decimals: number;
};

const list = publicProcedure
  .input(z.object({ chainId: z.number().int().positive().optional() }))
  .handler(async ({ context, input }): Promise<TokenListItem[]> => {
    const rows: TokenRow[] = await context.db
      .select()
      .from(tokens)
      .where(input.chainId ? eq(tokens.chainId, input.chainId) : undefined);

    // getAcceptedToken valida el token y lee decimals (con caché). Los que fallen se omiten.
    const settled = await Promise.allSettled(
      rows.map(async (r): Promise<TokenListItem> => {
        const t = await getAcceptedToken(context.db, r.id);
        return {
          id: t.id,
          chainId: t.chainId,
          address: t.address,
          symbol: r.symbol,
          decimals: t.decimals,
        };
      }),
    );

    return settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
  });

export const tokensRouter = { list };