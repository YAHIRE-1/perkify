import { ORPCError } from "@orpc/server";
import { quest } from "@perkify/db/schema/quests";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";

// Solo se archiva lo que ya no tiene nada en juego
const ARCHIVABLE = ["DRAFT", "COMPLETED", "CANCELLED", "EXPIRED"] as const;

export const archive = protectedProcedure
  .route({ method: "POST", path: "/{id}/archive" })
  .input(z.object({ id: z.string().uuid() }))
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;

    const [existing] = await context.db
      .select({ archived: quest.archived, status: quest.status, creatorId: quest.creatorId })
      .from(quest)
      .where(eq(quest.id, input.id))
      .limit(1);

    // NOT_FOUND también para quests ajenas: no revela que existen
    if (!existing || existing.creatorId !== userId) {
      throw new ORPCError("NOT_FOUND", { message: "Quest no encontrada" });
    }
    if (!existing.archived && !(ARCHIVABLE as readonly string[]).includes(existing.status)) {
      throw new ORPCError("CONFLICT", {
        message: "No puedes archivar una quest con fondos o participantes activos",
      });
    }

    const [updated] = await context.db
      .update(quest)
      .set({ archived: existing.archived ? null : new Date(), modifiedBy: userId })
      .where(and(eq(quest.id, input.id), eq(quest.creatorId, userId)))
      .returning();

    return updated;
  });
