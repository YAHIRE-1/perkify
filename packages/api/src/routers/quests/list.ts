import { quest } from "@perkify/db/schema/quests";
import { and, asc, count, eq, ilike, isNull } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";

export const list = protectedProcedure
  .route({ method: "GET", path: "/" })
  .input(
    z.object({
      includeArchived: z.boolean().default(false),
      mine: z.boolean().default(false),
      search: z.string().trim().optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(50).default(9),
    })
  )
  .handler(async ({ input, context }) => {
    const { includeArchived, mine, search, page, limit } = input;

    const where = and(
      includeArchived ? undefined : isNull(quest.archived),
      search ? ilike(quest.title, `%${search}%`) : undefined,
      // El creador sale de la sesión, nunca del input
      mine ? eq(quest.creatorId, context.session.user.id) : undefined
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