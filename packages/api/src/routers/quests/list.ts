import { ORPCError } from "@orpc/server";
import { questParticipation } from "@perkify/db/schema/participations";
import { quest } from "@perkify/db/schema/quests";
import { tokens } from "@perkify/db/schema/tokens";
import { and, asc, count, eq, gt, ilike, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure } from "../../index";
import { occupiesSlot } from "../../lib/participations";

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

export const list = publicProcedure
  .route({ method: "GET", path: "/" })
  .input(
    z.object({
      mine: z.boolean().default(false),
      // true = solo quests abiertas a participantes (FUNDED y antes del deadline)
      open: z.boolean().default(false),
      search: z.string().trim().max(100).optional(),
      category: z.string().trim().max(60).optional(),
      tokenId: z.string().uuid().optional(),
      isBoosted: z.boolean().optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(50).default(9),
    }),
  )
  .handler(async ({ input, context }) => {
    const { mine, open, search, category, tokenId, isBoosted, page, limit } = input;

    const userId = context.session?.user?.id;
    if (mine && !userId) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const now = new Date();

    const where = and(
      isNull(quest.archived),
      // Los borradores nunca son públicos; el creador ve los suyos con `mine`
      mine ? undefined : ne(quest.status, "DRAFT"),
      open ? eq(quest.status, "FUNDED") : undefined,
      open ? gt(quest.deadline, now) : undefined,
      search ? ilike(quest.title, `%${escapeLike(search)}%`) : undefined,
      category ? ilike(quest.category, `%${escapeLike(category)}%`) : undefined,
      tokenId ? eq(quest.tokenId, tokenId) : undefined,
      isBoosted ? eq(quest.isBoosted, true) : undefined,
      // El creador sale de la sesión, nunca del input
      mine && userId ? eq(quest.creatorId, userId) : undefined,
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
          maxParticipants: quest.maxParticipants,
          taken: sql<number>`(
            select count(*)::int from ${questParticipation}
            where ${questParticipation.questId} = ${quest.id}
              and ${occupiesSlot(now)}
          )`,
          creatorId: quest.creatorId, // solo para calcular isOwner, no se devuelve
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
