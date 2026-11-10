import { ORPCError } from "@orpc/server";
import { questParticipation } from "@perkify/db/schema/participations";
import { quest } from "@perkify/db/schema/quests";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";
import { occupiesSlot } from "../../lib/participations";

export const get = protectedProcedure
  .route({ method: "GET", path: "/{id}" })
  .input(z.object({ id: z.string().uuid() }))
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;

    const [found] = await context.db
      .select()
      .from(quest)
      .where(eq(quest.id, input.id))
      .limit(1);

    // Un borrador solo lo ve su creador. Devolver NOT_FOUND evita revelar que existe.
    if (!found || (found.status === "DRAFT" && found.creatorId !== userId)) {
      throw new ORPCError("NOT_FOUND", { message: "Quest no encontrada" });
    }

    const [row] = await context.db
      .select({ taken: count() })
      .from(questParticipation)
      .where(and(eq(questParticipation.questId, found.id), occupiesSlot(new Date())));

    const myParticipation = await context.db.query.questParticipation.findFirst({
      where: { questId: found.id, hunterId: userId },
    });

    return {
      ...found,
      taken: row?.taken ?? 0,
      myParticipation: myParticipation ?? null,
    };
  });
