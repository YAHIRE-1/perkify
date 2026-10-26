import { quest } from "@perkify/db/schema/quests";
import { asc, isNull } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";

export const list = protectedProcedure
  .route({ method: "GET", path: "/" })
  .input(z.object({ includeArchived: z.boolean().default(false) }))
  .handler(({ input, context }) =>
    context.db
      .select()
      .from(quest)
      .where(input.includeArchived ? undefined : isNull(quest.archived))
      .orderBy(asc(quest.title))
  );
