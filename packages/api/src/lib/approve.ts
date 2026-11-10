import { ORPCError } from "@orpc/server";
import { quest } from "@perkify/db/schema/quests";
import { questParticipation } from "@perkify/db/schema/participations";
import { questSubmission } from "@perkify/db/schema/evidence";
import { and, eq, inArray, ne } from "drizzle-orm";
import type { Tx } from "./participations";

export async function approve(
  tx: Tx,
  ids: { submissionId: string; participationId: string; questId: string },
  actorId: string,
) {
  const now = new Date();

  const [closed] = await tx
    .update(quest)
    .set({ status: "APPROVED", modifiedBy: actorId })
    .where(and(eq(quest.id, ids.questId), eq(quest.status, "FUNDED")))
    .returning();
  if (!closed) throw new ORPCError("CONFLICT", { message: "La quest ya tiene ganador" });

  await tx
    .update(questSubmission)
    .set({ status: "APPROVED", reviewedAt: now })
    .where(and(eq(questSubmission.id, ids.submissionId), eq(questSubmission.status, "PENDING")));

  const [winner] = await tx
    .update(questParticipation)
    .set({ status: "APPROVED", approvedAt: now })
    .where(
      and(eq(questParticipation.id, ids.participationId), eq(questParticipation.status, "SUBMITTED")),
    )
    .returning();
  if (!winner) throw new ORPCError("CONFLICT", { message: "La participación ya no está en revisión" });

  const others = tx
    .select({ id: questParticipation.id })
    .from(questParticipation)
    .where(and(eq(questParticipation.questId, ids.questId), ne(questParticipation.id, ids.participationId)));

  await tx
    .update(questSubmission)
    .set({ status: "REJECTED", reviewedAt: now, rejectionReason: "Se aprobó otra evidencia" })
    .where(and(eq(questSubmission.status, "PENDING"), inArray(questSubmission.participationId, others)));

  await tx
    .update(questParticipation)
    .set({ status: "LOST" })
    .where(
      and(
        eq(questParticipation.questId, ids.questId),
        ne(questParticipation.id, ids.participationId),
        inArray(questParticipation.status, ["JOINED", "SUBMITTED"]),
      ),
    );

  return { quest: closed, participation: winner };
}