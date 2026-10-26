import { ORPCError } from "@orpc/server";
import { quest } from "@perkify/db/schema/quests";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";

export const get = protectedProcedure
  .route({ method: "GET", path: "/{id}" })
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    const [found] = await context.db
      .select()
      .from(quest)
      .where(eq(quest.id, input.id))
      .limit(1);

    if (!found) {
      throw new ORPCError("NOT_FOUND", { message: "Quest not found" });
    }

    return found;
  });
