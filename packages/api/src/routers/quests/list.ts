import { quest } from "@perkify/db/schema/quests";
import { tokens } from "@perkify/db/schema/tokens";
import { ORPCError } from "@orpc/server";
import { and, asc, count, eq, ilike, isNull, ne } from "drizzle-orm";
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
      // Drafts are never public; the creator still sees their own with `mine`
      mine ? undefined : ne(quest.status, "DRAFT"),
      search ? ilike(quest.title, `%${search}%`) : undefined,
      category ? ilike(quest.category, `%${category}%`) : undefined,
      tokenId ? eq(quest.tokenId, tokenId) : undefined,
      isBoosted ? eq(quest.isBoosted, true) : undefined,
      // The creator comes from the session, never from the input
      mine && userId ? eq(quest.creatorId, userId) : undefined
    );

    const [rows, countRows] = await Promise.all([
      context.db
        .select({
          id: quest.id,
          title: quest.title,
          description: quest.description,
          category: quest.category,
          status: quest.status,
          isBoosted: quest.isBoosted,
          deadline: quest.deadline,
          rewardAmount: quest.rewardAmount,
          creatorId: quest.creatorId, // only used to compute isOwner, not returned
          tokenSymbol: tokens.symbol,
        })
        .from(quest)
        .innerJoin(tokens, eq(tokens.id, quest.tokenId))
        .where(where)
        .orderBy(asc(quest.title), asc(quest.id))
        .limit(limit)
        .offset((page - 1) * limit),
      context.db.select({ total: count() }).from(quest).where(where),
    ]);

    const items = rows.map(({ creatorId, tokenSymbol, ...q }) => ({
      ...q,
      token: { symbol: tokenSymbol },
      isOwner: !!userId && creatorId === userId,
    }));

    return { items, total: countRows[0]?.total ?? 0 };
  });