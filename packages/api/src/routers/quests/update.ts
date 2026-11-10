import { ORPCError } from "@orpc/server";
import { quest } from "@perkify/db/schema/quests";
import { and, eq } from "drizzle-orm";
import { createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod";

import { protectedProcedure } from "../../index";

export const update = protectedProcedure
  .route({ method: "PATCH", path: "/{id}" })
  .input(
    createUpdateSchema(quest)
      .omit({
        id: true, creatorId: true, modifiedBy: true, createdAt: true, updatedAt: true, archived: true,
        status: true, escrowStatus: true, escrowId: true, chainId: true,
        createTxHash: true, lastChainEventAt: true,
      })
      .extend({ id: z.string().uuid() }),
  )
  .handler(async ({ input, context }) => {
    const { id, ...data } = input;
    const userId = context.session.user.id;

    const [updated] = await context.db
      .update(quest)
      .set({ ...data, modifiedBy: userId })
      .where(and(eq(quest.id, id), eq(quest.creatorId, userId), eq(quest.status, "DRAFT")))
      .returning();

    if (!updated) {
      throw new ORPCError("NOT_FOUND", { message: "Quest no encontrada o ya no es editable" });
    }
    return updated;
  });
