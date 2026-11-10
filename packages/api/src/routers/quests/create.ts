import { ORPCError } from "@orpc/server";
import { getQuestEscrowAddress } from "@perkify/contracts";
import { quest, questMilestones } from "@perkify/db/schema/quests";
import { tokens } from "@perkify/db/schema/tokens";
import { createQuestSchema } from "@perkify/db/validations/quest";
import { eq } from "drizzle-orm";
import { parseUnits } from "viem";

import { protectedProcedure } from "../../index";

const MIN_LEAD_MS = 60 * 60 * 1000; // deadline al menos 1h en el futuro

export const create = protectedProcedure
  .route({ method: "POST", path: "/" })
  .input(createQuestSchema)
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;
    const { milestones = [], deadline, ...rest } = input;

    const deadlineDate = new Date(deadline);
    if (deadlineDate.getTime() < Date.now() + MIN_LEAD_MS) {
      throw new ORPCError("BAD_REQUEST", { message: "Deadline demasiado cercano" });
    }

    const [token] = await context.db.select().from(tokens).where(eq(tokens.id, rest.tokenId));
    if (!token) throw new ORPCError("BAD_REQUEST", { message: "Token no aceptado" });

    const escrowAddress = getQuestEscrowAddress(token.chainId);

    const fraction = rest.rewardAmount.split(".")[1] ?? "";
    if (fraction.length > token.decimals) {
      throw new ORPCError("BAD_REQUEST", {
        message: `Máximo ${token.decimals} decimales para ${token.symbol}`,
      });
    }

    let reward: bigint;
    try {
      reward = parseUnits(rest.rewardAmount, token.decimals);
    } catch {
      throw new ORPCError("BAD_REQUEST", { message: "Monto inválido" });
    }
    if (reward <= 0n) throw new ORPCError("BAD_REQUEST", { message: "El monto debe ser mayor a 0" });

    const created = await context.db.transaction(async (tx) => {
      const [q] = await tx
        .insert(quest)
        .values({
          ...rest, // incluye maxParticipants, submitWindowHours, reviewWindowHours, maxAttempts
          deadline: deadlineDate,
          chainId: token.chainId,
          creatorId: userId,
          modifiedBy: userId,
          status: "DRAFT",
          escrowStatus: "NONE",
        })
        .returning();
      if (!q) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "No se pudo crear la quest" });

      if (milestones.length) {
        await tx.insert(questMilestones).values(
          milestones.map((description, position) => ({ questId: q.id, description, position })),
        );
      }
      return q;
    });

    return {
      quest: created,
      escrow: {
        chainId: token.chainId,
        escrowAddress,
        // createQuest(token, reward, deadline, uri)
        args: {
          token: token.address,
          reward: reward.toString(),
          deadline: Math.floor(deadlineDate.getTime() / 1000),
          uri: created.id,
        },
      },
    };
  });
