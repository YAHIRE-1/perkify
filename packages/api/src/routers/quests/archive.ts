import { ORPCError } from "@orpc/server";
import { quest } from "@perkify/db/schema/quests";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";

export const archive = protectedProcedure
  .route({ method: "POST", path: "/{id}/archive" })
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    const [existing] = await context.db
      .select({ archived: quest.archived })
      .from(quest)
      .where(eq(quest.id, input.id))
      .limit(1);

    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "quest not found" });
    }

    const [updated] = await context.db
      .update(quest)
      .set({
        archived: existing.archived ? null : new Date(),
        modifiedBy: context.session.user.id,
      })
      .where(eq(quest.id, input.id))
      .returning();

    return updated;
  });
