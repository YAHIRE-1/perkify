import { ORPCError } from "@orpc/server";
import { questParticipation } from "@perkify/db/schema/participations";
import { quest, questMilestones } from "@perkify/db/schema/quests";
import { tokens } from "@perkify/db/schema/tokens";
import { and, asc, count, eq, getTableColumns } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";
import { occupiesSlot } from "../../lib/participations";
import { anyParticipant, EMERGENCY_REFUND_DELAY_MS, hasUnresolvedClaims } from "../../lib/quest-refund";

export const get = protectedProcedure
  .route({ method: "GET", path: "/{id}" })
  .input(z.object({ id: z.string().uuid() }))
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;

    // Mismo patrón que `list`: el token sale de un join, no de una query aparte.
    // tokenId es NOT NULL con FK, así que el innerJoin nunca pierde filas.
    const [found] = await context.db
      .select({
        ...getTableColumns(quest),
        tokenSymbol: tokens.symbol,
      })
      .from(quest)
      .innerJoin(tokens, eq(tokens.id, quest.tokenId))
      .where(eq(quest.id, input.id))
      .limit(1);

    // Los borradores solo los ve su creador
    if (!found || (found.status === "DRAFT" && found.creatorId !== userId)) {
      throw new ORPCError("NOT_FOUND", { message: "Quest no encontrada" });
    }

    const isOwner = found.creatorId === userId;
    const legacyRefundMatured = isOwner && found.status === "FUNDED" && !found.automaticRefund
      && Date.now() >= found.deadline.getTime() + EMERGENCY_REFUND_DELAY_MS;
    const [[slots], myParticipation, milestones, pastParticipants, hasClaims] = await Promise.all([
      context.db
        .select({ taken: count() })
        .from(questParticipation)
        .where(
          and(
            eq(questParticipation.questId, found.id),
            occupiesSlot(new Date()),
          ),
        ),
      context.db.query.questParticipation.findFirst({
        where: { questId: found.id, hunterId: userId },
      }),
      context.db
        .select({
          id: questMilestones.id,
          description: questMilestones.description,
          position: questMilestones.position,
        })
        .from(questMilestones)
        .where(eq(questMilestones.questId, found.id))
        .orderBy(asc(questMilestones.position)),
      isOwner && found.status === "FUNDED" && !found.hasJoined
        ? anyParticipant(context.db, found.id)
        : [],
      legacyRefundMatured ? hasUnresolvedClaims(context.db, found.id) : false,
    ]);

    const { tokenSymbol, ...q } = found;

    return {
      ...q,
      token: { symbol: tokenSymbol },
      isOwner,
      canCancel: isOwner && q.status === "FUNDED" && q.deadline > new Date()
        && !q.hasJoined && !pastParticipants.length,
      canClaimLegacyRefund: legacyRefundMatured && !hasClaims,
      taken: slots?.taken ?? 0,
      myParticipation: myParticipation ?? null,
      milestones,
    };
  });
