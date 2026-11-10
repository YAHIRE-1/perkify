import { ORPCError } from "@orpc/server";
import {
  getQuestEscrowAddress,
  questEscrowAbi,
  questEscrowAddresses,
  type SupportedChainId,
} from "@perkify/contracts";
import { questParticipation } from "@perkify/db/schema/participations";
import { quest } from "@perkify/db/schema/quests";
import { questIdSchema } from "@perkify/db/validations/quest";
import { and, eq } from "drizzle-orm";
import { getAddress, parseEventLogs } from "viem";
import { z } from "zod";

import { protectedProcedure } from "../../index";

const isSupportedChain = (id: number): id is SupportedChainId => id in questEscrowAddresses;

export const confirmPayout = protectedProcedure
  .route({ method: "POST", path: "/{id}/confirm-payout" })
  .input(
    questIdSchema.extend({
      txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    }),
  )
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;

    // 1. La participación debe ser del usuario
    const [row] = await context.db
      .select({ q: quest, p: questParticipation })
      .from(questParticipation)
      .innerJoin(quest, eq(quest.id, questParticipation.questId))
      .where(and(eq(questParticipation.questId, input.id), eq(questParticipation.hunterId, userId)));
    if (!row) throw new ORPCError("NOT_FOUND", { message: "Participación no encontrada" });

    const { q, p } = row;

    // Idempotente: reintentos del cliente, o el sincronizador ya la marcó
    if (p.status === "PAID") return p;

    if (p.status !== "APPROVED") {
      throw new ORPCError("PRECONDITION_FAILED", { message: "La participación no está aprobada" });
    }
    if (q.chainId === null || !isSupportedChain(q.chainId) || !q.escrowId) {
      throw new ORPCError("PRECONDITION_FAILED", { message: "La quest no está fondeada" });
    }
    const escrow = getAddress(getQuestEscrowAddress(q.chainId));

    // 2. Leer la tx on-chain
    const client = context.getPublicClient(q.chainId);
    let receipt;
    try {
      receipt = await client.getTransactionReceipt({ hash: input.txHash as `0x${string}` });
    } catch {
      // CONFLICT para que el cliente reintente automáticamente
      throw new ORPCError("CONFLICT", {
        message: "Transacción no encontrada todavía, reintenta en unos segundos",
      });
    }
    if (receipt.status !== "success") {
      throw new ORPCError("BAD_REQUEST", { message: "La transacción falló" });
    }

    // 3. RewardPaid de ESTE escrow, ESTE id on-chain y ESTE ganador
    const events = parseEventLogs({
      abi: questEscrowAbi,
      eventName: "RewardPaid",
      logs: receipt.logs.filter((l) => getAddress(l.address) === escrow),
    });
    const paid = events.find(
      (ev) =>
        ev.args.id === BigInt(q.escrowId!) &&
        getAddress(ev.args.winner) === getAddress(p.walletAddress),
    );
    if (!paid) {
      throw new ORPCError("BAD_REQUEST", { message: "No se encontró el pago en esa transacción" });
    }

    // 4. Marcar PAID (el where evita carreras con el sincronizador)
    const [updated] = await context.db
      .update(questParticipation)
      .set({
        status: "PAID",
        payoutTxHash: input.txHash.toLowerCase(),
        paidAt: new Date(),
      })
      .where(and(eq(questParticipation.id, p.id), eq(questParticipation.status, "APPROVED")))
      .returning();

    if (!updated) {
      // otra request (o el sincronizador) ganó la carrera
      const [current] = await context.db
        .select()
        .from(questParticipation)
        .where(eq(questParticipation.id, p.id));
      if (!current) throw new ORPCError("NOT_FOUND", { message: "Participación no encontrada" });
      return current;
    }
    return updated;
  });
