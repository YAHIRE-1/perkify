import { ORPCError } from "@orpc/server";
import { questEscrowAbi, questEscrowAddresses, QuestStatus, type SupportedChainId } from "@perkify/contracts";
import { disputes } from "@perkify/db/schema/disputes";
import { questSubmission } from "@perkify/db/schema/evidence";
import { questParticipation } from "@perkify/db/schema/participations";
import { quest, type QuestRow } from "@perkify/db/schema/quests";
import { transactions } from "@perkify/db/schema/transactions";
import { and, eq, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { createWalletClient, custom, getAbiItem, getAddress, parseEventLogs, TransactionNotFoundError, TransactionReceiptNotFoundError, type Address, type Hash } from "viem";
import type { Context } from "../context";
import { appealableParticipations } from "./dispute-eligibility";
import { getStoredEscrowAddress } from "./chain";
import { recordNotification } from "./notification-mail";
import type { Tx } from "./participations";
import { getVoucherSigner, signCancellation } from "./voucher";

type ChainContext = Pick<Context, "db" | "getPublicClient">;

type QuestEscrowChain = {
  chainId: SupportedChainId;
  client: ReturnType<Context["getPublicClient"]>;
  address: Address;
  id: bigint;
};

export function anyParticipant(tx: Pick<Tx, "select">, id: string) {
  return tx.select({ id: questParticipation.id }).from(questParticipation)
    .where(eq(questParticipation.questId, id)).limit(1);
}

export function getQuestEscrowChain(q: QuestRow, context: ChainContext): QuestEscrowChain {
  if (q.chainId === null || !(q.chainId in questEscrowAddresses) || !q.escrowId) {
    throw new ORPCError("PRECONDITION_FAILED", { message: "This quest has no confirmed escrow." });
  }

  const chainId = q.chainId as SupportedChainId;
  const client = context.getPublicClient(chainId);
  return {
    chainId, client,
    address: getStoredEscrowAddress(q.escrowAddress),
    id: BigInt(q.escrowId),
  };
}

export async function readEscrow(q: QuestRow, chain: QuestEscrowChain, blockNumber: bigint) {
  const [creator, , reward, deadline, status, winner, uri] = await chain.client.readContract({
    address: chain.address, abi: questEscrowAbi, functionName: "quests", args: [chain.id], blockNumber,
  });
  if (uri !== q.id) throw new ORPCError("CONFLICT", { message: "The escrow does not match this quest." });
  return { creator, reward, deadline, status, winner };
}

export async function reserveQuestCancellation(context: ChainContext, id: string, userId: string) {
  return context.db.transaction(async (tx) => {
    const [q] = await tx.select().from(quest).where(and(eq(quest.id, id), eq(quest.creatorId, userId))).for("update");
    if (!q) throw new ORPCError("NOT_FOUND");
    if (q.escrowStatus === "REFUNDED") return { kind: "settled" as const, confirmed: true };
    if (q.status !== "FUNDED" || q.hasJoined || (await anyParticipant(tx, q.id)).length) {
      throw new ORPCError("CONFLICT", { message: "Only a funded quest that nobody has joined can be cancelled." });
    }

    const chain = getQuestEscrowChain(q, context);
    const block = await chain.client.getBlock();
    const escrow = await readEscrow(q, chain, block.number);
    if (escrow.status === QuestStatus.Refunded) return recoverSubmittedRefund(tx, q, context);
    if (q.refundTxHash && await hasPendingRefundTransaction(chain, q.refundTxHash as Hash)) {
      return { kind: "settled" as const, confirmed: false };
    }
    if (escrow.status !== QuestStatus.Funded || escrow.deadline <= block.timestamp) {
      throw new ORPCError("CONFLICT", { message: "This quest can no longer be cancelled." });
    }

    const expiry = Math.min(Number(escrow.deadline) - 1, Number(block.timestamp) + 300);
    const voucher = await signCancellation({
      chainId: chain.chainId, escrowAddress: chain.address, escrowId: chain.id.toString(), creator: escrow.creator, expiry,
    });
    await tx.update(quest).set({
      cancelExpiresAt: Math.max(expiry, q.cancelExpiresAt ?? 0),
      refundStartBlock: q.refundStartBlock ?? block.number,
      refundNextCheckAt: null,
    }).where(eq(quest.id, id));
    return { kind: "authorization" as const, ...voucher };
  });
}

export async function hasUnresolvedClaims(tx: Pick<Tx, "select">, id: string) {
  const [submission] = await tx.select({ id: questSubmission.id }).from(questSubmission)
    .innerJoin(questParticipation, eq(questParticipation.id, questSubmission.participationId))
    .where(and(eq(questParticipation.questId, id), inArray(questSubmission.status, ["PENDING", "APPROVED"]))).limit(1);
  if (submission) return true;
  const [dispute] = await tx.select({ id: disputes.id }).from(disputes)
    .where(and(eq(disputes.questId, id), eq(disputes.status, "open"))).limit(1);
  if (dispute) return true;
  const [participation] = await tx.select({ id: questParticipation.id }).from(questParticipation)
    .where(and(eq(questParticipation.questId, id), inArray(questParticipation.status, ["SUBMITTED", "APPROVED", "PAID"]))).limit(1);
  return !!participation || (await appealableParticipations(tx, id)).length > 0;
}

export const EMERGENCY_REFUND_DELAY_MS = 30 * 24 * 60 * 60 * 1000;

export async function prepareLegacyRefund(context: ChainContext, id: string, userId: string) {
  return context.db.transaction(async (tx) => {
    const [q] = await tx.select().from(quest).where(and(eq(quest.id, id), eq(quest.creatorId, userId))).for("update");
    if (!q) throw new ORPCError("NOT_FOUND");
    if (q.escrowStatus === "REFUNDED") return { kind: "settled" as const, confirmed: true };
    if (q.status !== "FUNDED" || q.automaticRefund || await hasUnresolvedClaims(tx, id)) {
      throw new ORPCError("CONFLICT", { message: "This quest is not eligible for an emergency refund." });
    }

    const chain = getQuestEscrowChain(q, context);
    const block = await chain.client.getBlock();
    const escrow = await readEscrow(q, chain, block.number);
    if (escrow.status === QuestStatus.Refunded) return recoverSubmittedRefund(tx, q, context);
    if (q.refundTxHash && await hasPendingRefundTransaction(chain, q.refundTxHash as Hash)) {
      return { kind: "settled" as const, confirmed: false };
    }
    if (escrow.status !== QuestStatus.Funded
      || block.timestamp < escrow.deadline + BigInt(EMERGENCY_REFUND_DELAY_MS / 1000)
      || (q.approvalExpiresAt !== null && block.timestamp <= BigInt(q.approvalExpiresAt))) {
      throw new ORPCError("CONFLICT", { message: "This quest is not eligible for an emergency refund." });
    }
    await tx.update(quest).set({
      refundStartBlock: q.refundStartBlock ?? block.number,
      refundNextCheckAt: null,
    }).where(eq(quest.id, id));
    return { kind: "authorization" as const, escrowAddress: chain.address, escrowId: chain.id.toString(), chainId: chain.chainId, creator: escrow.creator };
  });
}

async function hasPendingRefundTransaction(chain: QuestEscrowChain, hash: Hash) {
  try {
    const receipt = await chain.client.getTransactionReceipt({ hash });
    return receipt.status === "success";
  } catch (error) {
    if (!(error instanceof TransactionReceiptNotFoundError)) throw error;
  }
  try {
    await chain.client.getTransaction({ hash });
    return true;
  } catch (error) {
    if (error instanceof TransactionNotFoundError) return false;
    throw error;
  }
}

async function recoverSubmittedRefund(tx: Tx, q: QuestRow, context: ChainContext) {
  await processRefund(tx, q, context);
  const [current] = await tx.select({ status: quest.escrowStatus }).from(quest).where(eq(quest.id, q.id));
  return { kind: "settled" as const, confirmed: current?.status === "REFUNDED" };
}

/** Use the quest lock for settlement and for future dispute transitions. */
export async function finalizeQuestRefund(
  tx: Tx, q: QuestRow, context: ChainContext, hash: Hash,
) {
  if (q.escrowStatus === "REFUNDED") return true;
  const chain = getQuestEscrowChain(q, context);
  const receipt = await chain.client.getTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new ORPCError("BAD_REQUEST", { message: "The refund transaction failed." });

  const logs = receipt.logs.filter((log) => getAddress(log.address) === chain.address);
  const refund = parseEventLogs({ abi: questEscrowAbi, eventName: "QuestRefunded", logs })
    .find((event) => event.args.id === chain.id);
  const escrow = await readEscrow(q, chain, receipt.blockNumber);
  if (!refund || escrow.status !== QuestStatus.Refunded || getAddress(refund.args.creator) !== getAddress(escrow.creator) || refund.args.amount !== escrow.reward) {
    throw new ORPCError("BAD_REQUEST", { message: "The transaction does not confirm this quest refund." });
  }

  const disputed = parseEventLogs({ abi: questEscrowAbi, eventName: "DisputeResolved", logs })
    .some((event) => event.args.id === chain.id);
  const automatic = parseEventLogs({ abi: questEscrowAbi, eventName: "QuestExpiredRefunded", logs })
    .some((event) => event.args.id === chain.id);
  const mined = await chain.client.getBlock({ blockNumber: receipt.blockNumber });
  if (mined.hash !== receipt.blockHash) return false;
  const safe = await chain.client.getBlock({ blockTag: chain.chainId === 31337 ? "latest" : "safe" });
  if (receipt.blockNumber > safe.number) {
    await tx.update(quest).set({ refundTxHash: hash, refundNextCheckAt: null }).where(eq(quest.id, q.id));
    return false;
  }
  const cancelled = !automatic && q.cancelExpiresAt !== null && mined.timestamp <= BigInt(q.cancelExpiresAt);
  const reason = disputed ? "DISPUTE" : cancelled ? "CANCELLED" : "EXPIRED";

  await tx.insert(transactions).values({
    questId: q.id, chainId: chain.chainId, txHash: hash, logIndex: refund.logIndex,
    eventType: "refund", amount: q.rewardAmount, blockTimestamp: new Date(Number(mined.timestamp) * 1000),
    rawPayload: { reason },
  }).onConflictDoNothing();
  await tx.update(quest).set({
    status: reason === "EXPIRED" ? "EXPIRED" : "CANCELLED",
    escrowStatus: "REFUNDED",
    refundStartBlock: null,
    refundTxHash: null,
    cancelExpiresAt: null,
    refundNextCheckAt: null,
    lastChainEventAt: new Date(),
  }).where(eq(quest.id, q.id));
  await recordNotification(tx, q.creatorId, q,
    reason === "DISPUTE" ? "DISPUTE_REFUND" : reason === "CANCELLED" ? "CANCELLED" : "EXPIRED_REFUND");

  if (reason === "EXPIRED") {
    const participants = await tx.selectDistinct({ id: questParticipation.hunterId })
      .from(questParticipation).where(eq(questParticipation.questId, q.id));
    await tx.update(questParticipation).set({ status: "ABANDONED" }).where(and(
      eq(questParticipation.questId, q.id), eq(questParticipation.status, "JOINED"),
    ));
    for (const { id } of participants) await recordNotification(tx, id, q, "QUEST_EXPIRED");
  }
  return true;
}

async function processRefund(tx: Tx, q: QuestRow, context: ChainContext) {
  const chain = getQuestEscrowChain(q, context);
  const safe = await chain.client.getBlock({ blockTag: chain.chainId === 31337 ? "latest" : "safe" });
  const escrow = await readEscrow(q, chain, safe.number);
  const postpone = (delay = 30_000) =>
    tx.update(quest).set({ refundNextCheckAt: new Date(Date.now() + delay) }).where(eq(quest.id, q.id));

  if (escrow.status === QuestStatus.Refunded) {
    if (q.refundTxHash) {
      try {
        if (await finalizeQuestRefund(tx, q, context, q.refundTxHash as Hash)) return;
      } catch (error) {
        if (!(error instanceof TransactionReceiptNotFoundError)
          && !(error instanceof ORPCError && error.code === "BAD_REQUEST")) throw error;
      }
    }

    const fromBlock = q.refundStartBlock;
    if (fromBlock === null || fromBlock > safe.number) {
      await postpone(300_000);
      return;
    }
    // The Sepolia RPC allows ten blocks per eth_getLogs request.
    const toBlock = safe.number > fromBlock + 9n ? fromBlock + 9n : safe.number;
    const [event] = await chain.client.getLogs({
      address: chain.address, event: getAbiItem({ abi: questEscrowAbi, name: "QuestRefunded" }),
      args: { id: chain.id }, fromBlock, toBlock, strict: true,
    });
    if (event?.transactionHash) {
      await finalizeQuestRefund(tx, q, context, event.transactionHash);
    } else if (toBlock < safe.number) {
      await tx.update(quest).set({ refundStartBlock: toBlock + 1n }).where(eq(quest.id, q.id));
    } else {
      await postpone();
    }
    return;
  }

  if (q.cancelExpiresAt !== null) {
    if (safe.timestamp > BigInt(q.cancelExpiresAt) && escrow.status === QuestStatus.Funded) {
      await tx.update(quest).set({ cancelExpiresAt: null, refundStartBlock: null, refundTxHash: null, refundNextCheckAt: null })
        .where(eq(quest.id, q.id));
    } else {
      await postpone();
    }
    return;
  }

  if (!q.automaticRefund || escrow.status !== QuestStatus.Funded || safe.timestamp < escrow.deadline
    || (q.approvalExpiresAt !== null && safe.timestamp <= BigInt(q.approvalExpiresAt))
    || await hasUnresolvedClaims(tx, q.id)) {
    await postpone(300_000);
    return;
  }

  if (q.refundStartBlock === null) {
    await tx.update(quest).set({ refundStartBlock: safe.number }).where(eq(quest.id, q.id));
    return;
  }

  if (q.refundTxHash) {
    const hash = q.refundTxHash as Hash;
    try {
      const receipt = await chain.client.getTransactionReceipt({ hash });
      if (receipt.status === "success" || receipt.blockNumber > safe.number) {
        await postpone();
        return;
      }
    } catch (error) {
      if (!(error instanceof TransactionReceiptNotFoundError)) throw error;
      try {
        await chain.client.getTransaction({ hash });
        await postpone();
        return;
      } catch (lookupError) {
        if (!(lookupError instanceof TransactionNotFoundError)) throw lookupError;
      }
    }
  }

  // Serializes nonce selection across worker processes on the same network.
  const lock = await tx.execute<{ acquired: boolean }>(sql`select pg_try_advisory_xact_lock(14711, ${chain.chainId}) as acquired`);
  if (!lock.rows[0]?.acquired) return;
  const account = getVoucherSigner();
  const { request } = await chain.client.simulateContract({
    address: chain.address, abi: questEscrowAbi, functionName: "refundExpired", args: [chain.id], account,
  });
  const wallet = createWalletClient({ account, chain: chain.client.chain, transport: custom({ request: chain.client.request }) });
  const hash = await wallet.writeContract(request);
  await tx.update(quest).set({ refundTxHash: hash, refundNextCheckAt: new Date(Date.now() + 60_000) }).where(eq(quest.id, q.id));
}

export async function processQuestRefunds(context: ChainContext) {
  const now = new Date();
  const due = and(
    eq(quest.status, "FUNDED"),
    or(isNull(quest.refundNextCheckAt), lte(quest.refundNextCheckAt, now)),
    or(isNotNull(quest.cancelExpiresAt), isNotNull(quest.refundStartBlock),
      and(eq(quest.automaticRefund, true), lte(quest.deadline, now))),
  );
  const candidates = await context.db.select({ id: quest.id }).from(quest).where(due).orderBy(quest.deadline).limit(10);
  for (const candidate of candidates) {
    try {
      await context.db.transaction(async (tx) => {
        const [q] = await tx.select().from(quest).where(and(eq(quest.id, candidate.id), due)).for("update", { skipLocked: true });
        if (q) await processRefund(tx, q, context);
      });
    } catch (error) {
      console.error("Quest refund check failed", candidate.id, error instanceof Error ? error.name : "Unknown error");
      await context.db.update(quest).set({ refundNextCheckAt: new Date(Date.now() + 300_000) })
        .where(and(eq(quest.id, candidate.id), due));
    }
  }
}
