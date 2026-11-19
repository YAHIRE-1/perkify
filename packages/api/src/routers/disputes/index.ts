import { ORPCError } from "@orpc/server";
import { questEscrowAbi, QuestStatus } from "@perkify/contracts";
import { disputeModerators, disputes } from "@perkify/db/schema/disputes";
import { questSubmission } from "@perkify/db/schema/evidence";
import { questParticipation } from "@perkify/db/schema/participations";
import { quest } from "@perkify/db/schema/quests";
import { and, desc, eq, isNotNull, or } from "drizzle-orm";
import { isAddressEqual } from "viem";
import { z } from "zod";
import { protectedProcedure, o } from "../../index";
import type { Context } from "../../context";
import { appealableParticipations } from "../../lib/dispute-eligibility";
import { getDisputeArbiter } from "../../lib/quest-dispute";
import { EMERGENCY_REFUND_DELAY_MS, getQuestEscrowChain, readEscrow } from "../../lib/quest-refund";
import { recordNotification } from "../../lib/notification-mail";
import { translateText } from "../../lib/translate-text";
import { presignRead } from "../../lib/storage";

async function canModerate(db: Context["db"], userId: string) {
  const [moderator] = await db.select({ userId: disputeModerators.userId }).from(disputeModerators)
    .where(eq(disputeModerators.userId, userId)).limit(1);
  return !!moderator;
}

async function participatesInQuest(db: Pick<Context["db"], "select">, questId: string, userId: string) {
  const [participation] = await db.select({ id: questParticipation.id }).from(questParticipation)
    .where(and(eq(questParticipation.questId, questId), eq(questParticipation.hunterId, userId))).limit(1);
  return !!participation;
}

const moderatorProcedure = protectedProcedure.use(async ({ context, next }) => {
  if (!await canModerate(context.db, context.session.user.id)) throw new ORPCError("FORBIDDEN");
  return next();
});

const pageSchema = z.object({ page: z.number().int().min(1).max(10_000) });
const disputeIdSchema = z.object({ id: z.string().uuid() });
const rulingSchema = z.enum(["PAY_PARTICIPANT", "REFUND_CREATOR"]);
const PAGE_SIZE = 20;

async function listDisputes(db: Context["db"], page: number, scope: { userId: string } | { queue: true }) {
  const rows = await db.select({
    id: disputes.id,
    questId: quest.id,
    title: quest.title,
    creatorId: quest.creatorId,
    status: disputes.status,
    ruling: disputes.ruling,
    createdAt: disputes.createdAt,
  }).from(disputes)
    .innerJoin(quest, eq(quest.id, disputes.questId))
    .where("userId" in scope
      ? or(eq(disputes.openedBy, scope.userId), eq(quest.creatorId, scope.userId))
      : eq(disputes.status, "open"))
    .orderBy(desc(disputes.createdAt), desc(disputes.id))
    .offset((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE + 1);
  return {
    items: rows.slice(0, PAGE_SIZE).map(({ creatorId, ...item }) => ({
      ...item,
      received: "userId" in scope && creatorId === scope.userId,
    })),
    hasMore: rows.length > PAGE_SIZE,
  };
}

async function readDispute(db: Context["db"], id: string, userId: string) {
  const [row] = await db.select({ dispute: disputes, title: quest.title, creatorId: quest.creatorId })
    .from(disputes).innerJoin(quest, eq(quest.id, disputes.questId)).where(eq(disputes.id, id));
  if (!row) throw new ORPCError("NOT_FOUND");

  const { dispute, title, creatorId } = row;
  const moderator = await canModerate(db, userId);
  if (dispute.openedBy !== userId && creatorId !== userId && !moderator) throw new ORPCError("NOT_FOUND");

  const submissions = await db.query.questSubmission.findMany({
    where: { participationId: dispute.participationId, reviewedAt: { lte: dispute.createdAt } },
    with: { files: true },
    orderBy: { createdAt: "asc" },
  });
  return { dispute, title, creatorId, moderator, evidence: submissions.filter((item) => item.rejectionReason !== null) };
}

export const disputesRouter = o.prefix("/disputes").tag("Disputes").router({
  permissions: protectedProcedure.route({ method: "GET", path: "/permissions" })
    .handler(async ({ context }) => ({ moderate: await canModerate(context.db, context.session.user.id) })),
  mine: protectedProcedure.route({ method: "GET", path: "/mine" }).input(pageSchema)
    .handler(({ context, input }) => listDisputes(context.db, input.page, { userId: context.session.user.id })),
  queue: moderatorProcedure.route({ method: "GET", path: "/queue" }).input(pageSchema)
    .handler(({ context, input }) => listDisputes(context.db, input.page, { queue: true })),
  get: protectedProcedure.route({ method: "GET", path: "/{id}" }).input(disputeIdSchema)
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const { dispute, title, creatorId, moderator, evidence } = await readDispute(context.db, input.id, userId);
      return {
        id: dispute.id, title, questId: dispute.questId, reason: dispute.reason, status: dispute.status,
        ruling: rulingSchema.safeParse(dispute.ruling).data ?? null, rulingReason: dispute.rulingReason, resolvedAt: dispute.resolvedAt,
        resolveTxHash: dispute.resolveTxHash,
        frozen: dispute.frozenAt !== null,
        canResolve: moderator && userId !== creatorId && userId !== dispute.openedBy
          && dispute.status === "open" && dispute.chainScanBlock !== null && dispute.ruling === null
          && !await participatesInQuest(context.db, dispute.questId, userId),
        evidence: await Promise.all(evidence.map(async (item) => ({
          id: item.id, notes: item.notes, links: item.links, rejectionReason: item.rejectionReason,
          createdAt: item.createdAt,
          files: await Promise.all(item.files.map(async (file) => ({
            id: file.id, name: file.name, url: await presignRead(file.key),
          }))),
        }))),
      };
    }),
  translate: protectedProcedure.route({ method: "POST", path: "/{id}/translation" })
    .input(disputeIdSchema.extend({ locale: z.enum(["en", "es", "zh-CN"]) }))
    .handler(async ({ context, input }) => {
      const { dispute, title, evidence } = await readDispute(context.db, input.id, context.session.user.id);
      const apiKey = context.questTranslationApiKey;
      const text = [title, dispute.reason, dispute.rulingReason ?? "",
        ...evidence.flatMap((entry) => [entry.notes, entry.rejectionReason ?? ""])];
      try {
        if (!apiKey) throw new Error("Translation provider is unavailable");
        const fields = await translateText(text, input.locale, apiKey);
        return {
          title: fields[0],
          reason: fields[1],
          rulingReason: dispute.rulingReason ? fields[2] : null,
          evidence: evidence.map((entry, index) => ({
            id: entry.id,
            notes: fields[index * 2 + 3],
            rejectionReason: fields[index * 2 + 4],
          })),
        };
      } catch {
        throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Dispute translation is currently unavailable." });
      }
    }),
  open: protectedProcedure.route({ method: "POST", path: "/" }).input(z.object({
    questId: z.string().uuid(), reason: z.string().trim().min(5).max(1000),
  })).handler(async ({ context, input }) => {
    const userId = context.session.user.id;
    return context.db.transaction(async (tx) => {
      const [q] = await tx.select().from(quest).where(eq(quest.id, input.questId)).for("update");
      if (!q) throw new ORPCError("NOT_FOUND");
      const [existing] = await tx.select({ id: disputes.id, openedBy: disputes.openedBy }).from(disputes)
        .where(and(eq(disputes.questId, q.id), eq(disputes.status, "open")));
      if (existing?.openedBy === userId) return { id: existing.id };
      if (q.status !== "FUNDED" || q.escrowStatus !== "LOCKED" || q.refundTxHash || existing) {
        throw new ORPCError("CONFLICT", { message: "This quest is no longer eligible for a dispute." });
      }

      const [eligible] = await appealableParticipations(tx, q.id, userId);
      if (!eligible) {
        throw new ORPCError("FORBIDDEN", { message: "You need three rejected submissions and an active appeal window." });
      }
      const [latest] = await tx.select({ id: questSubmission.id }).from(questSubmission)
        .where(and(eq(questSubmission.participationId, eligible.id), eq(questSubmission.status, "REJECTED"),
          isNotNull(questSubmission.reviewedAt), isNotNull(questSubmission.rejectionReason)))
        .orderBy(desc(questSubmission.reviewedAt)).limit(1);
      if (!latest) throw new ORPCError("CONFLICT");

      const chain = getQuestEscrowChain(q, context);
      const arbiter = getDisputeArbiter(context.disputeArbiterKey);
      const [safe, head, onchainArbiter] = await Promise.all([
        chain.client.getBlock({ blockTag: chain.chainId === 31337 ? "latest" : "safe" }),
        chain.client.getBlock(),
        chain.client.readContract({ address: chain.address, abi: questEscrowAbi, functionName: "arbiter" }),
      ]);
      const escrow = await readEscrow(q, chain, head.number);
      if (!isAddressEqual(arbiter.address, onchainArbiter)) {
        throw new ORPCError("SERVICE_UNAVAILABLE", { message: "The dispute arbiter is unavailable for this escrow." });
      }
      const emergencyAt = escrow.deadline + BigInt(EMERGENCY_REFUND_DELAY_MS / 1000);
      if (escrow.status !== QuestStatus.Funded || head.timestamp >= emergencyAt
        || BigInt(Math.max(q.approvalExpiresAt ?? 0, q.cancelExpiresAt ?? 0)) >= safe.timestamp) {
        throw new ORPCError("CONFLICT", { message: "The escrow cannot be frozen at this time." });
      }

      const now = new Date();
      const [dispute] = await tx.insert(disputes).values({
        questId: q.id, openedBy: userId, participationId: eligible.id, submissionId: latest.id,
        reason: input.reason, chainScanBlock: safe.number, createdAt: now,
      }).returning({ id: disputes.id });
      if (!dispute) throw new ORPCError("INTERNAL_SERVER_ERROR");
      await tx.update(quest).set({ status: "DISPUTED" }).where(eq(quest.id, q.id));
      await recordNotification(tx, q.creatorId, q, "DISPUTE_OPENED");
      return dispute;
    });
  }),
  resolve: moderatorProcedure.route({ method: "POST", path: "/{id}/resolve" }).input(disputeIdSchema.extend({
    ruling: rulingSchema,
    reason: z.string().trim().min(5).max(1000),
  })).handler(async ({ context, input }) => {
    const moderatorId = context.session.user.id;
    return context.db.transaction(async (tx) => {
      const [row] = await tx.select({ dispute: disputes, q: quest }).from(disputes)
        .innerJoin(quest, eq(quest.id, disputes.questId)).where(eq(disputes.id, input.id))
        .for("update", { of: quest });
      if (!row) throw new ORPCError("NOT_FOUND");
      const { dispute, q } = row;

      if (q.creatorId === moderatorId || await participatesInQuest(tx, q.id, moderatorId)) {
        throw new ORPCError("FORBIDDEN");
      }

      if (dispute.ruling === input.ruling && dispute.resolvedBy === moderatorId) return { id: dispute.id };
      if (q.status !== "DISPUTED" || dispute.status !== "open" || dispute.chainScanBlock === null || dispute.ruling) {
        throw new ORPCError("CONFLICT", { message: "This dispute is not ready for a ruling." });
      }

      await tx.update(disputes).set({
        ruling: input.ruling, rulingReason: input.reason, resolvedBy: moderatorId, nextChainCheckAt: null,
      }).where(eq(disputes.id, dispute.id));
      return { id: dispute.id };
    });
  }),
});
