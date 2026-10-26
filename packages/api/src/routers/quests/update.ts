import { ORPCError } from "@orpc/server";
import { quest } from "@perkify/db/schema/quests";
import { eq } from "drizzle-orm";
import { createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod";

import { protectedProcedure } from "../../index";

export const update = protectedProcedure
  .route({ method: "PATCH", path: "/{id}" })
  .input(
    createUpdateSchema(quest)
      .omit({
        id: true,
        creatorId: true,
        modifiedBy: true,
        createdAt: true,
        updatedAt: true,
        archived: true,
      })
      .extend({ id: z.string() })
  )
  .handler(async ({ input, context }) => {
    const { id, ...data } = input;

    const [updated] = await context.db
      .update(quest)
      .set({ ...data, modifiedBy: context.session.user.id })
      .where(eq(quest.id, id))
      .returning();

    if (!updated) {
      throw new ORPCError("NOT_FOUND", { message: "Customer not found" });
    }

    return updated;
  });
