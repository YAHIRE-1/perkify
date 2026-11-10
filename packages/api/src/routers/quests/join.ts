import { ORPCError } from "@orpc/server";
import { user } from "@perkify/db/schema/auth";
import { questParticipation } from "@perkify/db/schema/participations";
import { quest } from "@perkify/db/schema/quests";
import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";
import { occupiesSlot, submitDeadline } from "../../lib/participations";

export const join = protectedProcedure
  .route({ method: "POST", path: "/{id}/join" })
  .input(z.object({ id: z.string().uuid() }))
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;

    return context.db.transaction(async (tx) => {
      const now = new Date();

      // FOR UPDATE: dos hunters no pueden ocupar el último cupo a la vez
      const [q] = await tx.select().from(quest).where(eq(quest.id, input.id)).for("update");
      if (!q) throw new ORPCError("NOT_FOUND", { message: "Quest no encontrada" });
      if (q.creatorId === userId) {
        throw new ORPCError("FORBIDDEN", { message: "No puedes unirte a tu propia quest" });
      }
      if (q.status !== "FUNDED" || q.deadline <= now) {
        throw new ORPCError("CONFLICT", { message: "Esta quest ya no acepta participantes" });
      }

      const [u] = await tx
        .select({ wallet: user.walletAddress })
        .from(user)
        .where(eq(user.id, userId));
      if (!u?.wallet) {
        throw new ORPCError("BAD_REQUEST", { message: "Vincula tu wallet para participar" });
      }

      if (q.maxParticipants > 0) {
        const [row] = await tx
          .select({ n: count() })
          .from(questParticipation)
          .where(
            and(
              eq(questParticipation.questId, q.id),
              ne(questParticipation.hunterId, userId),
              occupiesSlot(now),
            ),
          );
        if ((row?.n ?? 0) >= q.maxParticipants) {
          throw new ORPCError("CONFLICT", { message: "No hay cupos disponibles" });
        }
      }

      const expiresAt = submitDeadline(q.submitWindowHours, q.deadline);

      const [mine] = await tx
        .select()
        .from(questParticipation)
        .where(and(eq(questParticipation.questId, q.id), eq(questParticipation.hunterId, userId)));

      if (!mine) {
        const [p] = await tx
          .insert(questParticipation)
          .values({ questId: q.id, hunterId: userId, walletAddress: u.wallet, expiresAt })
          .returning();
        return p;
      }

      const expired = mine.status === "JOINED" && mine.expiresAt <= now;
      if (!expired) throw new ORPCError("CONFLICT", { message: "Ya participas en esta quest" });
      if (mine.attempts >= q.maxAttempts) {
        throw new ORPCError("CONFLICT", { message: "Alcanzaste el máximo de intentos" });
      }

      const [p] = await tx
        .update(questParticipation)
        .set({ attempts: mine.attempts + 1, expiresAt, walletAddress: u.wallet })
        .where(eq(questParticipation.id, mine.id))
        .returning();
      return p;
    });
  });
