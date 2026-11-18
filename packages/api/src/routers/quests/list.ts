import { questParticipation } from "@perkify/db/schema/participations";
import { quest } from "@perkify/db/schema/quests";
import { tokens } from "@perkify/db/schema/tokens";
import { and, asc, count, eq, gt, ilike, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../../context";
import { protectedProcedure, publicProcedure } from "../../index";
import { occupiesSlot } from "../../lib/participations";

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

const listInput = z.object({
  open: z.boolean().default(false),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  tokenId: z.string().uuid().optional(),
  isBoosted: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(9),
});

export const list = publicProcedure
  .route({ method: "GET", path: "/" })
  .input(listInput)
  .handler(({ input, context }) => listQuests(input, context));

export const mine = protectedProcedure
  .route({ method: "GET", path: "/mine" })
  .input(listInput)
  .handler(({ input, context }) => listQuests(input, context, context.session.user.id));

async function listQuests(
  { open, search, category, tokenId, isBoosted, page, limit }: z.output<typeof listInput>,
  { db, session }: Context,
  creator?: string,
) {
  const userId = session?.user.id;
  const now = new Date();

  const where = and(
    isNull(quest.archived),
    !creator || open ? eq(quest.status, "FUNDED") : undefined,
    !creator || open ? isNull(quest.cancelExpiresAt) : undefined,
    open ? gt(quest.deadline, now) : undefined,
    search ? ilike(quest.title, `%${escapeLike(search)}%`) : undefined,
    category ? ilike(quest.category, `%${escapeLike(category)}%`) : undefined,
    tokenId ? eq(quest.tokenId, tokenId) : undefined,
    isBoosted ? eq(quest.isBoosted, true) : undefined,
    creator ? eq(quest.creatorId, creator) : undefined,
  );

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: quest.id,
        title: quest.title,
        description: quest.description,
        category: quest.category,
        status: quest.status,
        cancelExpiresAt: quest.cancelExpiresAt,
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
    db.select({ total: count() }).from(quest).where(where),
  ]);

  const items = rows.map(({ creatorId, tokenSymbol, ...q }) => ({
    ...q,
    token: { symbol: tokenSymbol },
    isOwner: !!userId && creatorId === userId,
  }));

  return { items, total: countRows[0]?.total ?? 0 };
}
