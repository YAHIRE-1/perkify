import { ORPCError } from "@orpc/server";
import { quest } from "@perkify/db/schema/quests";
import { confirmQuestSchema, questIdSchema } from "@perkify/db/validations/quest";
import { and, eq } from "drizzle-orm";
import { TransactionReceiptNotFoundError, type Hash } from "viem";
import { protectedProcedure } from "../../index";
import { finalizeQuestRefund, prepareLegacyRefund, reserveQuestCancellation } from "../../lib/quest-refund";

export const cancel = protectedProcedure
  .route({ method: "POST", path: "/{id}/cancel" })
  .input(questIdSchema)
  .handler(({ context, input }) => reserveQuestCancellation(context, input.id, context.session.user.id));

export const emergencyRefund = protectedProcedure
  .route({ method: "POST", path: "/{id}/emergency-refund" })
  .input(questIdSchema)
  .handler(({ context, input }) => prepareLegacyRefund(context, input.id, context.session.user.id));

export const confirmRefund = protectedProcedure
  .route({ method: "POST", path: "/{id}/confirm-refund" })
  .input(questIdSchema.extend(confirmQuestSchema.pick({ txHash: true }).shape))
  .handler(({ context, input }) => context.db.transaction(async (tx) => {
    const [q] = await tx.select().from(quest)
      .where(and(eq(quest.id, input.id), eq(quest.creatorId, context.session.user.id))).for("update");
    if (!q) throw new ORPCError("NOT_FOUND");
    try {
      return { confirmed: await finalizeQuestRefund(tx, q, context, input.txHash as Hash) };
    } catch (error) {
      if (error instanceof TransactionReceiptNotFoundError) {
        if (q.status === "FUNDED" && q.refundStartBlock !== null && (q.cancelExpiresAt !== null || !q.automaticRefund)) {
          await tx.update(quest).set({ refundTxHash: input.txHash, refundNextCheckAt: null })
            .where(eq(quest.id, q.id));
        }
        return { confirmed: false };
      }
      throw error;
    }
  }));
