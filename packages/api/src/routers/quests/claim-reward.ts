import { getQuestEscrowAddress } from "@perkify/contracts";
import { ORPCError } from "@orpc/server";
import { questSubmission } from "@perkify/db/schema/evidence";
import { questParticipation } from "@perkify/db/schema/participations";
import { quest } from "@perkify/db/schema/quests";
import { and, eq, lt } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";
import { approve } from "../../lib/approve";

export const claimReward = protectedProcedure
  .route({ method: "POST", path: "/{id}/claim-reward" })
  .input(z.object({ id: z.string().uuid() }))
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;

    const { q, p } = await context.db.transaction(async (tx) => {
      const [q] = await tx.select().from(quest).where(eq(quest.id, input.id));
      const [p] = await tx
        .select()
        .from(questParticipation)
        .where(and(eq(questParticipation.questId, input.id), eq(questParticipation.hunterId, userId)));
      if (!q || !p) throw new ORPCError("FORBIDDEN", { message: "No autorizado" });

      if (p.status === "PAID") throw new ORPCError("CONFLICT", { message: "La recompensa ya fue pagada" });

      if (p.status === "SUBMITTED") {
        // Auto-aprobación: el creador no respondió dentro de reviewDeadline
        const [s] = await tx
          .select()
          .from(questSubmission)
          .where(
            and(
              eq(questSubmission.participationId, p.id),
              eq(questSubmission.status, "PENDING"),
              lt(questSubmission.reviewDeadline, new Date()),
            ),
          );
        if (!s) throw new ORPCError("CONFLICT", { message: "La recompensa aún no se puede reclamar" });
        const r = await approve(tx, { submissionId: s.id, participationId: p.id, questId: q.id }, userId);
        return { q: r.quest, p: r.participation };
      }

      if (p.status !== "APPROVED") {
        throw new ORPCError("CONFLICT", { message: "La recompensa aún no se puede reclamar" });
      }
      return { q, p };
    });

    if (q.chainId == null) throw new ORPCError("CONFLICT", { message: "La quest no está fondeada" });

    return {
      chainId: q.chainId,
      escrowAddress: getQuestEscrowAddress(q.chainId),
      questUri: q.id,
      recipient: p.walletAddress, // snapshot al unirse, no user.walletAddress
    };
  });
