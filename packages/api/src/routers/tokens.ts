
import { tokens } from "@perkify/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure } from "../index";
import { getAcceptedToken } from "../lib/tokens";

const list = publicProcedure
  .input(z.object({ chainId: z.number().int().positive().optional() }))
  .handler(async ({ context, input }) => {
    const rows = await context.db
      .select()
      .from(tokens)
      .where(input.chainId ? eq(tokens.chainId, input.chainId) : undefined);

    // getAcceptedToken valida el token y lee decimals (con caché). Los que fallen se omiten.
    const settled = await Promise.allSettled(
      rows.map(async (r) => {
        const t = await getAcceptedToken(context.db, r.id);
        return {
          id: t.id as string,
          chainId: t.chainId as number,
          address: t.address as string,
          symbol: r.symbol as string,
          decimals: t.decimals as number,
        };
      }),
    );
    return settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
  });

export const tokensRouter = { list };
