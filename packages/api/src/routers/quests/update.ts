import { ORPCError } from "@orpc/server";
import { quest } from "@perkify/db/schema/quests";
import { and, eq } from "drizzle-orm";
import { createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod";

import { protectedProcedure } from "../../index";

export const update = protectedProcedure
  .route({ method: "PATCH", path: "/{id}" })
  .input(
    createUpdateSchema(quest)
      .omit({
        id: true, creatorId: true, modifiedBy: true, createdAt: true, updatedAt: true, archived: true,
        status: true, escrowStatus: true, escrowId: true, chainId: true,
        createTxHash: true, lastChainEventAt: true,
        escrowAddress: true, automaticRefund: true, hasJoined: true, cancelExpiresAt: true, approvalExpiresAt: true,
        refundStartBlock: true, refundNextCheckAt: true, refundTxHash: true,
      })
      .extend({ id: z.string().uuid() }),
  )
  .handler(async ({ input, context }) => {
    const { id, checklistProofRequired, ...data } = input;
    const userId = context.session.user.id;

    return context.db.transaction(async (tx) => {
      const scope = and(eq(quest.id, id), eq(quest.creatorId, userId), eq(quest.status, "DRAFT"));
      const [draft] = await tx.select().from(quest).where(scope).for("update");
      if (!draft) throw new ORPCError("NOT_FOUND", { message: "Quest no encontrada o ya no es editable" });

      const checklist = data.validationChecklist ?? draft.validationChecklist;
      if (checklistProofRequired?.some((item) => !checklist.includes(item))) {
        throw new ORPCError("BAD_REQUEST", { message: "Proof requirements must refer to checklist items." });
      }
      const required = (checklistProofRequired ?? draft.checklistProofRequired).filter((item) => checklist.includes(item));
      const [updated] = await tx.update(quest)
        .set({ ...data, checklistProofRequired: [...new Set(required)], modifiedBy: userId })
        .where(scope).returning();

      if (!updated) throw new ORPCError("NOT_FOUND", { message: "Quest no encontrada o ya no es editable" });
      return updated;
    });
  });
