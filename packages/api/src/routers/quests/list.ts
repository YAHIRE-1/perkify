import { quest } from "@perkify/db/schema/quests";
import { ORPCError } from "@orpc/server";
import { and, asc, count, eq, ilike, isNull } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure } from "../../index";

export const list = publicProcedure
  .route({ method: "GET", path: "/" })
  .input(
    z.object({
      mine: z.boolean().default(false),
      search: z.string().trim().optional(),
      category: z.string().trim().max(60).optional(),
      tokenId: z.string().uuid().optional(),
      isBoosted: z.boolean().optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(50).default(9),
    })
  )
  .handler(async ({ input, context }) => {
    const { mine, search, category, tokenId, isBoosted, page, limit } = input;

    const userId = context.session?.user?.id;
    if (mine && !userId) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const where = and(
      isNull(quest.archived),
      search ? ilike(quest.title, `%${search}%`) : undefined,
      category ? ilike(quest.category, `%${category}%`) : undefined,
      tokenId ? eq(quest.tokenId, tokenId) : undefined,
      isBoosted ? eq(quest.isBoosted, true) : undefined,
      // El creador sale de la sesión, nunca del input
      mine && userId ? eq(quest.creatorId, userId) : undefined
    );

    const [items, countRows] = await Promise.all([
      context.db
        .select()
        .from(quest)
        .where(where)
        .orderBy(asc(quest.title))
        .limit(limit)
        .offset((page - 1) * limit),
      context.db.select({ total: count() }).from(quest).where(where),
    ]);

    return { items, total: countRows[0]?.total ?? 0 };
  });
