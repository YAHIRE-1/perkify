import { ORPCError } from "@orpc/server";
import { questEscrowAbi, QuestStatus } from "@perkify/contracts";
import { disputes, type DisputeRow } from "@perkify/db/schema/disputes";
import { questSubmission } from "@perkify/db/schema/evidence";
import { questParticipation } from "@perkify/db/schema/participations";
import { quest, type QuestRow } from "@perkify/db/schema/quests";
import { transactions } from "@perkify/db/schema/transactions";
import { and, asc, eq, inArray, isNotNull, isNull, lte, ne, or, sql } from "drizzle-orm";
import {
  createWalletClient, custom, getAbiItem, getAddress, isAddressEqual, parseEventLogs,
  TransactionNotFoundError, TransactionReceiptNotFoundError, zeroAddress, type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";
import type { Context } from "../context";
import { recordNotification } from "./notification-mail";
import type { Tx } from "./participations";
import { finalizeQuestRefund, getQuestEscrowChain, readEscrow } from "./quest-refund";

type DisputeWorkerContext = Pick<Context, "db" | "getPublicClient" | "disputeArbiterKey">;
type EscrowChain = ReturnType<typeof getQuestEscrowChain>;

const hex32Schema = z.templateLiteral(["0x", z.string().regex(/^[a-f0-9]{64}$/i)]);

export function getDisputeArbiter(key: string | undefined) {
  const parsed = hex32Schema.safeParse(key);
  if (!parsed.success) throw new ORPCError("SERVICE_UNAVAILABLE", { message: "The dispute arbiter is unavailable." });
  return privateKeyToAccount(parsed.data);
}

async function isSubmitted(chain: EscrowChain, hash: string | null) {
  const parsed = hex32Schema.safeParse(hash);
  if (!parsed.success) return false;
  try {
    return (await chain.client.getTransactionReceipt({ hash: parsed.data })).status === "success";
  } catch (error) {
    if (!(error instanceof TransactionReceiptNotFoundError)) throw error;
  }
  try {
    await chain.client.getTransaction({ hash: parsed.data });
    return true;
  } catch (error) {
    if (error instanceof TransactionNotFoundError) return false;
    throw error;
  }
}

async function settleDispute(
  tx: Tx, context: DisputeWorkerContext, dispute: DisputeRow, q: QuestRow,
  chain: EscrowChain, hash: Hash, safeNumber: bigint,
) {
  const receipt = await chain.client.getTransactionReceipt({ hash });
  const block = await chain.client.getBlock({ blockNumber: receipt.blockNumber });
  if (receipt.status !== "success" || receipt.blockNumber > safeNumber || receipt.blockHash !== block.hash) return false;

  const logs = receipt.logs.filter((log) => isAddressEqual(log.address, chain.address));
  const ruling = parseEventLogs({ abi: questEscrowAbi, eventName: "DisputeResolved", logs })
    .find((event) => event.args.id === chain.id);
  if (!ruling) throw new Error("Missing dispute ruling event");

  const [participant] = await tx.select().from(questParticipation)
    .where(eq(questParticipation.id, dispute.participationId));
  if (!participant) throw new Error("Missing dispute participant");

  const paid = dispute.ruling === "PAY_PARTICIPANT";
  const winner = paid ? getAddress(participant.walletAddress) : zeroAddress;
  if (!isAddressEqual(ruling.args.winner, winner)) throw new Error("Confirmed ruling differs from the recorded decision");

  const now = new Date(Number(block.timestamp) * 1000);
  if (paid) {
    const escrow = await readEscrow(q, chain, receipt.blockNumber);
    const payment = parseEventLogs({ abi: questEscrowAbi, eventName: "RewardPaid", logs }).find(
      (event) => event.args.id === chain.id && isAddressEqual(event.args.winner, winner)
        && event.args.amount === escrow.reward,
    );
    if (!payment || escrow.status !== QuestStatus.Paid || !isAddressEqual(escrow.winner, winner)) {
      throw new Error("Missing confirmed dispute payment");
    }
    await tx.insert(transactions).values({
      questId: q.id, chainId: chain.chainId, txHash: hash, logIndex: payment.logIndex,
      eventType: "release", amount: q.rewardAmount, blockTimestamp: now, rawPayload: { reason: "DISPUTE" },
    }).onConflictDoNothing();
    await tx.update(quest).set({ status: "COMPLETED", escrowStatus: "RELEASED", lastChainEventAt: now })
      .where(eq(quest.id, q.id));
    await tx.update(questParticipation).set({ status: "PAID", approvedAt: now, paidAt: now, payoutTxHash: hash })
      .where(eq(questParticipation.id, participant.id));
    if (dispute.submissionId) {
      await tx.update(questSubmission).set({ status: "APPROVED" })
        .where(eq(questSubmission.id, dispute.submissionId));
    }
  } else {
    if (!await finalizeQuestRefund(tx, q, context, hash)) return false;
    await tx.update(questParticipation).set({ status: "REJECTED" }).where(eq(questParticipation.id, participant.id));
  }

  const otherParticipants = tx.select({ id: questParticipation.id }).from(questParticipation)
    .where(and(eq(questParticipation.questId, q.id), ne(questParticipation.id, participant.id)));
  await tx.update(questSubmission).set({
    status: "REJECTED", reviewedAt: now, rejectionReason: "The quest ended after a dispute ruling.",
  }).where(and(eq(questSubmission.status, "PENDING"), inArray(questSubmission.participationId, otherParticipants)));
  await tx.update(questParticipation).set({ status: paid ? "LOST" : "ABANDONED" })
    .where(and(eq(questParticipation.questId, q.id), ne(questParticipation.id, participant.id),
      inArray(questParticipation.status, ["JOINED", "SUBMITTED"])));

  await tx.insert(transactions).values({
    questId: q.id, chainId: chain.chainId, txHash: hash, logIndex: ruling.logIndex,
    eventType: "dispute_resolved", blockTimestamp: now, rawPayload: { disputeId: dispute.id, ruling: dispute.ruling },
  }).onConflictDoNothing();
  await tx.update(disputes).set({ status: "resolved", resolvedAt: now, resolveTxHash: hash, nextChainCheckAt: null })
    .where(eq(disputes.id, dispute.id));
  await recordNotification(tx, dispute.openedBy, q, paid ? "DISPUTE_PAID" : "DISPUTE_REJECTED");
  if (paid) await recordNotification(tx, q.creatorId, q, "DISPUTE_PAID");
  return true;
}

async function reconcileDispute(tx: Tx, context: DisputeWorkerContext, dispute: DisputeRow, q: QuestRow) {
  const chain = getQuestEscrowChain(q, context);
  let fromBlock = dispute.chainScanBlock;
  if (fromBlock === null) return;
  const safeBlock = await chain.client.getBlock({ blockTag: chain.chainId === 31337 ? "latest" : "safe" });
  const safeEscrow = await readEscrow(q, chain, safeBlock.number);
  const freezing = dispute.frozenAt === null;
  const sourceStatus = freezing ? QuestStatus.Funded : QuestStatus.Disputed;
  const update = (values: Partial<typeof disputes.$inferInsert>) =>
    tx.update(disputes).set(values).where(eq(disputes.id, dispute.id));

  if (safeEscrow.status !== sourceStatus) {
    const hash = hex32Schema.safeParse(freezing ? dispute.freezeTxHash : dispute.resolveTxHash);
    if (hash.success) {
      try {
        const receipt = await chain.client.getTransactionReceipt({ hash: hash.data });
        if (receipt.status === "success" && receipt.blockNumber <= safeBlock.number) {
          const canonical = await chain.client.getBlock({ blockNumber: receipt.blockNumber });
          if (canonical.hash === receipt.blockHash) fromBlock = receipt.blockNumber;
        }
      } catch (error) {
        if (!(error instanceof TransactionReceiptNotFoundError)) throw error;
      }
    }

    if (fromBlock > safeBlock.number) return;
    const toBlock = safeBlock.number > fromBlock + 9n ? fromBlock + 9n : safeBlock.number;

    if (freezing) {
      const [event] = await chain.client.getLogs({
        address: chain.address, event: getAbiItem({ abi: questEscrowAbi, name: "DisputeOpened" }),
        args: { id: chain.id }, fromBlock, toBlock, strict: true,
      });
      if (event?.transactionHash) {
        const block = await chain.client.getBlock({ blockNumber: event.blockNumber });
        if (block.hash !== event.blockHash) return;
        const now = new Date(Number(block.timestamp) * 1000);
        await tx.insert(transactions).values({
          questId: q.id, chainId: chain.chainId, txHash: event.transactionHash, logIndex: event.logIndex,
          eventType: "dispute_created", blockTimestamp: now, rawPayload: { disputeId: dispute.id },
        }).onConflictDoNothing();
        await update({ freezeTxHash: event.transactionHash, frozenAt: now, chainScanBlock: event.blockNumber, nextChainCheckAt: null });
        return;
      }

      // An emergency refund can win the race before the escrow is frozen.
      if (safeEscrow.status === QuestStatus.Refunded) {
        const [refund] = await chain.client.getLogs({
          address: chain.address, event: getAbiItem({ abi: questEscrowAbi, name: "QuestRefunded" }),
          args: { id: chain.id }, fromBlock, toBlock, strict: true,
        });
        if (refund?.transactionHash && await finalizeQuestRefund(tx, q, context, refund.transactionHash)) {
          await update({ status: "closed", resolvedAt: new Date(), nextChainCheckAt: null });
          await recordNotification(tx, dispute.openedBy, q, "DISPUTE_CLOSED");
          return;
        }
        if (refund) return;
      }
    } else {
      const [event] = await chain.client.getLogs({
        address: chain.address, event: getAbiItem({ abi: questEscrowAbi, name: "DisputeResolved" }),
        args: { id: chain.id }, fromBlock, toBlock, strict: true,
      });
      if (event?.transactionHash) {
        await settleDispute(tx, context, dispute, q, chain, event.transactionHash, safeBlock.number);
        return;
      }
    }

    await update({ chainScanBlock: toBlock + 1n });
    return;
  }

  if (dispute.ruling !== "PAY_PARTICIPANT" && dispute.ruling !== "REFUND_CREATOR") return;

  const head = await chain.client.getBlock();
  if ((await readEscrow(q, chain, head.number)).status !== sourceStatus) return;
  if (await isSubmitted(chain, freezing ? dispute.freezeTxHash : dispute.resolveTxHash)) return;

  const lock = await tx.execute<{ acquired: boolean }>(
    sql`select pg_try_advisory_xact_lock(14711, ${chain.chainId}) as acquired`,
  );
  if (!lock.rows[0]?.acquired) return;

  const account = getDisputeArbiter(context.disputeArbiterKey);
  const wallet = createWalletClient({ account, chain: chain.client.chain, transport: custom({ request: chain.client.request }) });
  const contract = { address: chain.address, abi: questEscrowAbi, account };
  if (freezing) {
    const { request } = await chain.client.simulateContract({ ...contract, functionName: "openDispute", args: [chain.id] });
    await update({ freezeTxHash: await wallet.writeContract(request) });
  } else {
    const [participant] = await tx.select({ wallet: questParticipation.walletAddress }).from(questParticipation)
      .where(eq(questParticipation.id, dispute.participationId));
    if (!participant) throw new Error("Missing dispute participant");
    const winner = dispute.ruling === "PAY_PARTICIPANT" ? getAddress(participant.wallet) : zeroAddress;
    const { request } = await chain.client.simulateContract({ ...contract, functionName: "resolveDispute", args: [chain.id, winner] });
    await update({ resolveTxHash: await wallet.writeContract(request) });
  }
}

export async function processQuestDisputes(context: DisputeWorkerContext) {
  if (!context.disputeArbiterKey) return;
  const due = and(
    eq(disputes.status, "open"), isNotNull(disputes.chainScanBlock),
    or(isNotNull(disputes.ruling), and(isNull(disputes.frozenAt), isNotNull(disputes.freezeTxHash))),
    or(isNull(disputes.nextChainCheckAt), lte(disputes.nextChainCheckAt, new Date())),
  );
  const candidates = await context.db.select({ id: disputes.id }).from(disputes)
    .where(due).orderBy(sql`${disputes.nextChainCheckAt} asc nulls first`, asc(disputes.createdAt)).limit(10);

  for (const { id } of candidates) {
    try {
      await context.db.transaction(async (tx) => {
        const [row] = await tx.select({ dispute: disputes, q: quest }).from(disputes)
          .innerJoin(quest, eq(quest.id, disputes.questId))
          .where(and(eq(disputes.id, id), due, eq(quest.status, "DISPUTED")))
          .for("update", { of: quest, skipLocked: true });
        if (!row) return;
        await tx.update(disputes).set({ nextChainCheckAt: new Date(Date.now() + 15_000) }).where(eq(disputes.id, id));
        await reconcileDispute(tx, context, row.dispute, row.q);
      });
    } catch (error) {
      console.error("Quest dispute check failed", id, error instanceof Error ? error.name : "Unknown error");
      await context.db.update(disputes).set({ nextChainCheckAt: new Date(Date.now() + 60_000) })
        .where(and(eq(disputes.id, id), due));
    }
  }
}
