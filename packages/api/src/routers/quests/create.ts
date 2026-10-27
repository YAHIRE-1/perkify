import { createQuestSchema, quest, questMilestones } from "@perkify/db/schema/quests";
import { tokens } from "@perkify/db/schema/tokens";
import { eq } from "drizzle-orm";
import { parseUnits } from "viem";
import { getQuestEscrowAddress } from "@perkify/contracts";

import { protectedProcedure } from "../../index";

const REVIEW_WINDOW_S = 3 * 24 * 3600; // plazo del creador para responder un claim
const REFUND_GRACE_S = 7 * 24 * 3600; // margen tras el deadline antes del refund
const MIN_LEAD_MS = 60 * 60 * 1000; // deadline al menos 1h en el futuro

export const create = protectedProcedure
  .route({ method: "POST", path: "/" })
  .input(createQuestSchema)
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;
    const { milestones = [], deadline, ...rest } = input;

    const deadlineDate = new Date(deadline);
    if (deadlineDate.getTime() < Date.now() + MIN_LEAD_MS) {
      throw new Error("Deadline demasiado cercano");
    }

    const [token] = await context.db
      .select()
      .from(tokens)
      .where(eq(tokens.id, rest.tokenId));
    if (!token) throw new Error("Token no aceptado");

    // Todo lo que puede fallar, ANTES de escribir en la DB
    const escrowAddress = getQuestEscrowAddress(token.chainId);

    const fraction = rest.rewardAmount.split(".")[1] ?? "";
    if (fraction.length > token.decimals) {
      throw new Error(`Máximo ${token.decimals} decimales para ${token.symbol}`);
    }

    let reward: bigint;
    try {
      reward = parseUnits(rest.rewardAmount, token.decimals);
    } catch {
      throw new Error("Monto inválido");
    }
    if (reward <= 0n) throw new Error("El monto debe ser mayor a 0");

    const created = await context.db.transaction(async (tx) => {
      const [q] = await tx
        .insert(quest)
        .values({
          ...rest,
          deadline: deadlineDate,
          creatorId: userId,
          modifiedBy: userId,
          status: "DRAFT",
          escrowStatus: "NONE",
        })
        .returning();

      if (!q) throw new Error("No se pudo crear la quest");

      if (milestones.length) {
        await tx.insert(questMilestones).values(
          milestones.map((description, position) => ({
            questId: q.id,
            description,
            position,
          }))
        );
      }

      return q;
    });

    return {
      quest: created,
      escrow: {
        chainId: token.chainId,
        escrowAddress,
        args: {
          token: token.address,
          reward: reward.toString(),
          deadline: Math.floor(deadlineDate.getTime() / 1000),
          refundGrace: REFUND_GRACE_S,
          reviewWindow: REVIEW_WINDOW_S,
          uri: created.id, // vincula la quest on-chain con esta fila
        },
      },
    };
  });