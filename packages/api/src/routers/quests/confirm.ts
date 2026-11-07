import { ORPCError } from "@orpc/server";
import { getQuestEscrowAddress, questEscrowAbi, questEscrowAddresses, type SupportedChainId } from "@perkify/contracts";
import { user, walletAddress } from "@perkify/db/schema/auth";
import { quest } from "@perkify/db/schema/quests";
import { confirmQuestSchema, questIdSchema } from "@perkify/db/validations/quest";
import { tokens } from "@perkify/db/schema/tokens";
import { and, eq } from "drizzle-orm";
import { getAddress, parseEventLogs, parseUnits } from "viem";

import { protectedProcedure } from "../../index";

const REVIEW_WINDOW_S = 3 * 24 * 3600; // mismos valores que create.ts
const REFUND_GRACE_S = 7 * 24 * 3600;

const isSupportedChain = (id: number): id is SupportedChainId => id in questEscrowAddresses;

export const confirm = protectedProcedure
  .route({ method: "POST", path: "/{id}/confirm" })
  .input(questIdSchema.extend(confirmQuestSchema.pick({ txHash: true }).shape))
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;

    // 1. La quest debe ser del usuario
    const [q] = await context.db
      .select()
      .from(quest)
      .where(and(eq(quest.id, input.id), eq(quest.creatorId, userId)));
    if (!q) throw new Error("Quest no encontrada");
    if (q.status !== "DRAFT") return q; // idempotente

    // 2. Chain guardada por create, no la que mande el cliente
    if (q.chainId === null || !isSupportedChain(q.chainId)) {
      throw new Error("Chain no soportada");
    }
    const escrow = getAddress(getQuestEscrowAddress(q.chainId));

    const [token] = await context.db.select().from(tokens).where(eq(tokens.id, q.tokenId));
    if (!token) throw new Error("Token no encontrado");

    // 3. Wallets del usuario: la tabla del plugin SIWE es la fuente confiable;
    //    user.walletAddress (sincronizada por un hook) queda como respaldo.
    const [wallets, [owner]] = await Promise.all([
      context.db
        .select({ address: walletAddress.address })
        .from(walletAddress)
        .where(eq(walletAddress.userId, userId)),
      context.db
        .select({ walletAddress: user.walletAddress })
        .from(user)
        .where(eq(user.id, userId)),
    ]);

    const ownerAddresses = new Set(
      [...wallets.map((w) => w.address), owner?.walletAddress]
        .filter((a): a is string => !!a)
        .map((a) => a.toLowerCase()),
    );
    if (ownerAddresses.size === 0) {
      throw new ORPCError("PRECONDITION_FAILED", {
        message: "Tu usuario no tiene una wallet vinculada",
      });
    }

    // 4. Leer la tx on-chain
    const client = context.getPublicClient(q.chainId);
    let receipt;
    try {
      receipt = await client.getTransactionReceipt({ hash: input.txHash as `0x${string}` });
    } catch {
      throw new Error("Transacción no encontrada todavía, reintenta en unos segundos");
    }
    if (receipt.status !== "success") throw new Error("La transacción falló");

    const events = parseEventLogs({
      abi: questEscrowAbi,
      eventName: "QuestCreated",
      logs: receipt.logs.filter((l) => getAddress(l.address) === escrow),
    });

    // 5. Buscar el evento que corresponde a ESTA quest (uri === quest.id)
    const expectedReward = parseUnits(q.rewardAmount, token.decimals);
    const expectedDeadline = BigInt(Math.floor(q.deadline.getTime() / 1000));
    let onchainId: bigint | null = null;

    for (const ev of events) {
      const [creator, tok, reward, deadline, refundGrace, reviewWindow, , , , uri] =
        await client.readContract({
          address: escrow,
          abi: questEscrowAbi,
          functionName: "quests",
          args: [ev.args.id],
        });

      if (uri !== q.id) continue;
      if (getAddress(tok) !== getAddress(token.address)) throw new Error("Token no coincide");
      if (reward !== expectedReward) throw new Error("Monto no coincide");
      if (deadline !== expectedDeadline) throw new Error("Deadline no coincide");
      if (refundGrace !== BigInt(REFUND_GRACE_S) || reviewWindow !== BigInt(REVIEW_WINDOW_S)) {
        throw new Error("Parámetros de escrow inválidos");
      }
      if (!ownerAddresses.has(creator.toLowerCase())) {
        throw new Error("La quest fue creada por otra wallet");
      }
      onchainId = ev.args.id;
      break;
    }
    if (onchainId === null) throw new Error("Quest no encontrada en la transacción");

    // 6. Pasar a FUNDED (el where evita doble confirmación)
    const [updated] = await context.db
      .update(quest)
      .set({
        status: "FUNDED",
        escrowStatus: "LOCKED",
        escrowId: onchainId.toString(),
        createTxHash: input.txHash.toLowerCase(),
        lastChainEventAt: new Date(),
        modifiedBy: userId,
      })
      .where(and(eq(quest.id, q.id), eq(quest.status, "DRAFT")))
      .returning();

    if (!updated) {
      // otra request la confirmó primero
      const [current] = await context.db.select().from(quest).where(eq(quest.id, q.id));
      if (!current) throw new Error("Quest no encontrada");
      return current;
    }
    return updated;
  });