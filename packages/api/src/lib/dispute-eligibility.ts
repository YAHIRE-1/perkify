import { questSubmission } from "@perkify/db/schema/evidence";
import { questParticipation } from "@perkify/db/schema/participations";
import { and, count, eq, gte, inArray, isNotNull, max, sql } from "drizzle-orm";
import type { Tx } from "./participations";

const MIN_REJECTIONS = 3;
const APPEAL_WINDOW_MS = 72 * 60 * 60 * 1000;

export async function appealableParticipations(
  db: Pick<Tx, "select">,
  questId: string,
  hunterId?: string,
) {
  const cutoff = new Date(Date.now() - APPEAL_WINDOW_MS);
  return db.select({ id: questParticipation.id }).from(questParticipation)
    .innerJoin(questSubmission, eq(questSubmission.participationId, questParticipation.id))
    .where(and(
      eq(questParticipation.questId, questId),
      hunterId ? eq(questParticipation.hunterId, hunterId) : undefined,
      inArray(questParticipation.status, ["JOINED", "REJECTED"]),
      eq(questSubmission.status, "REJECTED"),
      isNotNull(questSubmission.reviewedAt),
      isNotNull(questSubmission.rejectionReason),
    ))
    .groupBy(questParticipation.id)
    .having(and(sql`${count()} >= ${MIN_REJECTIONS}`, gte(max(questSubmission.reviewedAt), cutoff)))
    .limit(1);
}
