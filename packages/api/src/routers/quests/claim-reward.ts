import { ORPCError } from "@orpc/server";
import { getQuestEscrowAddress } from "@perkify/contracts";
import { questParticipation } from "@perkify/db/schema/participations";
import { quest } from "@perkify/db/schema/quests";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";

export const claimReward = protectedProcedure
  .route({ method: "POST", path: "/{id}/claim-reward" })
  .input(z.object({ id: z.string().uuid() }))
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;

    const [row] = await context.db
      .select({ q: quest, p: questParticipation })
      .from(questParticipation)
      .innerJoin(quest, eq(quest.id, questParticipation.questId))
      .where(and(eq(questParticipation.questId, input.id), eq(questParticipation.hunterId, userId)));
    if (!row) throw new ORPCError("FORBIDDEN", { message: "No autorizado" });

    const { q, p } = row;
    if (p.status === "PAID") throw new ORPCError("CONFLICT", { message: "La recompensa ya fue pagada" });
    if (p.status !== "APPROVED") {
      throw new ORPCError("CONFLICT", { message: "La recompensa aún no se puede reclamar" });
    }
    if (q.chainId == null || !q.escrowId) {
      throw new ORPCError("CONFLICT", { message: "La quest no está fondeada" });
    }

    return {
      chainId: q.chainId,
      escrowAddress: getQuestEscrowAddress(q.chainId),
      escrowId: q.escrowId, // el id on-chain que recibe withdrawReward
      recipient: p.walletAddress, // snapshot al unirse
    };
  });
