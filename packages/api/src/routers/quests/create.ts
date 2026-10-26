import { quest } from "@perkify/db/schema/quests";
import { createInsertSchema } from "drizzle-orm/zod";

import { protectedProcedure } from "../../index";

export const create = protectedProcedure
  .route({ method: "POST", path: "/" })
  .input(
    createInsertSchema(quest).omit({
      id: true,
      creatorId: true,
      modifiedBy: true,
      createdAt: true,
      updatedAt: true,
      archived: true,
    })
  )
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;

    const [created] = await context.db
      .insert(quest)
      .values({ ...input, creatorId: userId, modifiedBy: userId })
      .returning();

    return created;
  });
