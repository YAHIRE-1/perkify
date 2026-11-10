import { ORPCError } from "@orpc/server";
import { questSubmission } from "@perkify/db/schema/evidence";
import { questParticipation } from "@perkify/db/schema/participations";
import { quest } from "@perkify/db/schema/quests";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";
import { approve } from "../../lib/approve";
import { submitDeadline } from "../../lib/participations";

export const review = protectedProcedure
  .route({ method: "POST", path: "/submissions/{submissionId}/review" })
  .input(
    z.discriminatedUnion("decision", [
      z.object({ submissionId: z.string().uuid(), decision: z.literal("APPROVE") }),
      z.object({
        submissionId: z.string().uuid(),
        decision: z.literal("REJECT"),
        reason: z.string().trim().min(5).max(500),
      }),
    ]),
  )
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;

    return context.db.transaction(async (tx) => {
      const [row] = await tx
        .select({ s: questSubmission, p: questParticipation, q: quest })
        .from(questSubmission)
        .innerJoin(questParticipation, eq(questParticipation.id, questSubmission.participationId))
        .innerJoin(quest, eq(quest.id, questParticipation.questId))
        .where(and(eq(questSubmission.id, input.submissionId), eq(questSubmission.status, "PENDING")));

      if (!row) throw new ORPCError("NOT_FOUND", { message: "Evidencia no disponible" });
      const { s, p, q } = row;
      if (q.creatorId !== userId) {
        throw new ORPCError("FORBIDDEN", { message: "Solo el creador puede revisar" });
      }

      if (input.decision === "APPROVE") {
        return approve(tx, { submissionId: s.id, participationId: p.id, questId: q.id }, userId);
      }

      const [rejected] = await tx
        .update(questSubmission)
        .set({ status: "REJECTED", rejectionReason: input.reason, reviewedAt: new Date() })
        .where(and(eq(questSubmission.id, s.id), eq(questSubmission.status, "PENDING")))
        .returning();
      if (!rejected) throw new ORPCError("CONFLICT", { message: "Esa evidencia ya fue revisada" });

      // Con intentos y quest vigente vuelve a JOINED con plazo nuevo; si no, REJECTED
      const canRetry = p.attempts < q.maxAttempts && q.deadline > new Date() && q.status === "FUNDED";
      await tx
        .update(questParticipation)
        .set(
          canRetry
            ? {
                status: "JOINED",
                attempts: p.attempts + 1,
                expiresAt: submitDeadline(q.submitWindowHours, q.deadline),
              }
            : { status: "REJECTED" },
        )
        .where(and(eq(questParticipation.id, p.id), eq(questParticipation.status, "SUBMITTED")));

      return rejected;
    });
  });
