import { ORPCError } from "@orpc/server";
import { questEscrowAbi } from "@perkify/contracts";
import {
  questMilestones,
  quests,
  tokens,
  type Db,
  type NewQuest,
  type Quest,
  type QuestRow,
  type QuestStatus,
  type EscrowStatus,
  type QuestSummary,
  confirmQuestSchema,
  createQuestSchema,
  listQuestsSchema,
  mineQuestsSchema,
  questIdSchema,
  updateQuestSchema,
} from "@perkify/db";
import { and, asc, count, desc, eq, lt, ne, or } from "drizzle-orm";
import { parseEventLogs } from "viem";

import { protectedProcedure, publicProcedure } from "../index";
import { assertSupportedChain, getEscrowAddress, getPublicClient, sameAddress } from "../lib/chain";
import { buildQuestUri, hashQuestContent, parseQuestUri, type QuestContent } from "../lib/quest-uri";
import { getSessionUserId, requireUser } from "../lib/session";
import { getAcceptedToken, toUnits } from "../lib/tokens";

const DAY = 86_400;

/**
 * Parámetros del contrato que fija la plataforma (no los elige el creador).
 * Valores PLACEHOLDER: ajústalos a lo que valide el contrato y a tu producto.
 * `confirm` los compara contra la cadena.
 */
const ESCROW_PARAMS = { refundGrace: 7 * DAY, reviewWindow: 7 * DAY } as const;

const QUEST_RULES = { minDeadlineAheadSeconds: 60 * 60, maxOpenDraftsPerCreator: 20 } as const;

/** Orden idéntico al enum Status del contrato (0..4) → estados espejo en la DB. */
const ONCHAIN_STATUS: readonly { status: QuestStatus; escrow: EscrowStatus }[] = [
  { status: "FUNDED", escrow: "LOCKED" }, // 0 Funded
  { status: "APPROVED", escrow: "LOCKED" }, // 1 Approved (aún sin retirar)
  { status: "DISPUTED", escrow: "LOCKED" }, // 2 Disputed
  { status: "COMPLETED", escrow: "RELEASED" }, // 3 Paid
  { status: "CANCELLED", escrow: "REFUNDED" }, // 4 Refunded
];

// ───────────────────────────── helpers ─────────────────────────────

type MilestoneLite = { id: string; description: string; position: number };

function serializeRow(row: QuestRow): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]),
  );
}

function toSummary(row: QuestRow, symbol: string): QuestSummary {
  const out = serializeRow(row);
  delete out.criteria;
  delete out.validationChecklist;
  return { ...out, acceptedTokenSymbol: symbol } as unknown as QuestSummary;
}

function toQuest(row: QuestRow, symbol: string, milestones: MilestoneLite[]): Quest {
  return {
    ...serializeRow(row),
    acceptedTokenSymbol: symbol,
    milestones: milestones.map(({ id, description, position }) => ({ id, description, position })),
  } as unknown as Quest;
}

async function loadQuest(db: Db, id: string) {
  const [found] = await db
    .select({ row: quests, symbol: tokens.symbol, chainId: tokens.chainId })
    .from(quests)
    .innerJoin(tokens, eq(quests.tokenId, tokens.id))
    .where(eq(quests.id, id))
    .limit(1);
  if (!found) return null;

  const milestones = await db
    .select()
    .from(questMilestones)
    .where(eq(questMilestones.questId, id))
    .orderBy(asc(questMilestones.position));

  return { row: found.row, symbol: found.symbol as string, chainId: found.chainId as number, milestones };
}

function contentOf(row: QuestRow, milestones: MilestoneLite[]): QuestContent {
  return {
    title: row.title,
    description: row.description,
    category: row.category,
    criteria: row.criteria,
    validationChecklist: row.validationChecklist,
    milestones: [...milestones].sort((a, b) => a.position - b.position).map((m) => m.description),
  };
}

function assertDeadlineAhead(deadline: Date) {
  if (deadline.getTime() < Date.now() + QUEST_RULES.minDeadlineAheadSeconds * 1000) {
    throw new ORPCError("BAD_REQUEST", { message: "El deadline es demasiado cercano" });
  }
}

function encodeCursor(row: Pick<QuestRow, "createdAt" | "id">) {
  return `${row.createdAt.toISOString()}|${row.id}`;
}

function decodeCursor(cursor: string) {
  const [iso, id] = cursor.split("|");
  const createdAt = new Date(iso ?? "");
  if (!id || Number.isNaN(createdAt.getTime())) {
    throw new ORPCError("BAD_REQUEST", { message: "Cursor inválido" });
  }
  return { createdAt, id };
}

function isUniqueViolation(error: unknown) {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/** Un borrador solo se toca si es del usuario, sigue en DRAFT y aún no fue "preparado". */
async function loadEditableDraft(db: Db, id: string, userId: string) {
  const found = await loadQuest(db, id);
  if (!found || found.row.creatorId !== userId) {
    throw new ORPCError("NOT_FOUND", { message: "Borrador no encontrado" });
  }
  if (found.row.status !== "DRAFT") {
    throw new ORPCError("CONFLICT", { message: "La quest ya está fondeada y no se puede modificar" });
  }
  return found;
}

// ───────────────────────────── escritura ─────────────────────────────

/** Crea un borrador (nada on-chain todavía). */
const create = protectedProcedure.input(createQuestSchema).handler(async ({ context, input }) => {
  const { userId } = requireUser(context);

  const token = await getAcceptedToken(context.db, input.tokenId);
  assertSupportedChain(token.chainId);
  toUnits(input.rewardAmount, token.decimals); // valida monto y decimales
  const deadline = new Date(input.deadline);
  assertDeadlineAhead(deadline);

  const [open] = await context.db
    .select({ n: count() })
    .from(quests)
    .where(and(eq(quests.creatorId, userId), eq(quests.status, "DRAFT")));
  if ((open?.n ?? 0) >= QUEST_RULES.maxOpenDraftsPerCreator) {
    throw new ORPCError("TOO_MANY_REQUESTS", {
      message: "Demasiados borradores abiertos; borra algunos primero",
    });
  }

  const id = crypto.randomUUID();
  await context.db.transaction(async (tx) => {
    await tx.insert(quests).values({
      id,
      creatorId: userId,
      title: input.title,
      description: input.description,
      category: input.category ?? null,
      criteria: input.criteria ?? null,
      rewardAmount: input.rewardAmount,
      tokenId: token.id,
      isBoosted: false, // el boost no lo decide el cliente
      deadline,
      validationChecklist: input.validationChecklist ?? [],
    });
    if (input.milestones?.length) {
      await tx.insert(questMilestones).values(
        input.milestones.map((description, position) => ({ questId: id, description, position })),
      );
    }
  });

  const created = await loadQuest(context.db, id);
  if (!created) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return toQuest(created.row, created.symbol, created.milestones);
});

/** Edita un borrador. Una vez "preparada" o fondeada, el contenido queda congelado. */
const update = protectedProcedure.input(updateQuestSchema).handler(async ({ context, input }) => {
  const { userId } = requireUser(context);
  const { row } = await loadEditableDraft(context.db, input.id, userId);

  if (row.escrowStatus !== "NONE") {
    throw new ORPCError("CONFLICT", {
      message: "La quest ya fue preparada para fondear; borra el borrador y crea otro para cambiarla",
    });
  }

  const data = input.data;
  const token = await getAcceptedToken(context.db, data.tokenId ?? row.tokenId);
  assertSupportedChain(token.chainId);
  toUnits(data.rewardAmount ?? row.rewardAmount, token.decimals);
  if (data.deadline !== undefined) assertDeadlineAhead(new Date(data.deadline));

  const patch: Partial<NewQuest> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.description !== undefined) patch.description = data.description;
  if (data.category !== undefined) patch.category = data.category ?? null;
  if (data.criteria !== undefined) patch.criteria = data.criteria ?? null;
  if (data.rewardAmount !== undefined) patch.rewardAmount = data.rewardAmount;
  if (data.tokenId !== undefined) patch.tokenId = data.tokenId;
  if (data.validationChecklist !== undefined) patch.validationChecklist = data.validationChecklist;
  if (data.deadline !== undefined) patch.deadline = new Date(data.deadline);

  await context.db.transaction(async (tx) => {
    const updated = await tx
      .update(quests)
      .set(patch)
      .where(and(eq(quests.id, row.id), eq(quests.status, "DRAFT"), eq(quests.escrowStatus, "NONE")))
      .returning({ id: quests.id });
    if (updated.length === 0) {
      throw new ORPCError("CONFLICT", { message: "El borrador cambió; reintenta" });
    }
    if (data.milestones !== undefined) {
      await tx.delete(questMilestones).where(eq(questMilestones.questId, row.id));
      if (data.milestones.length) {
        await tx.insert(questMilestones).values(
          data.milestones.map((description, position) => ({
            questId: row.id,
            description,
            position,
          })),
        );
      }
    }
  });

  const next = await loadQuest(context.db, row.id);
  if (!next) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return toQuest(next.row, next.symbol, next.milestones);
});

/**
 * Congela el contenido, fija su hash y devuelve los argumentos EXACTOS de createQuest.
 * Se llama justo antes de que la wallet firme. Es idempotente.
 */
const prepare = protectedProcedure.input(questIdSchema).handler(async ({ context, input }) => {
  const { userId } = requireUser(context);
  const { row, milestones } = await loadEditableDraft(context.db, input.id, userId);

  const token = await getAcceptedToken(context.db, row.tokenId);
  const contract = getEscrowAddress(token.chainId);
  const reward = toUnits(row.rewardAmount, token.decimals);
  assertDeadlineAhead(row.deadline);

  const contentHash = hashQuestContent(contentOf(row, milestones));
  const uri = buildQuestUri(row.id, contentHash);

  await context.db
    .update(quests)
    .set({ escrowStatus: "PENDING" })
    .where(and(eq(quests.id, row.id), eq(quests.status, "DRAFT")));

  return {
    questId: row.id,
    chainId: token.chainId,
    contract,
    contentHash,
    // createQuest(token, reward, deadline, refundGrace, reviewWindow, uri).
    // reward va como string para no perder precisión en JSON; en el cliente: BigInt(reward).
    call: {
      token: token.address,
      reward: reward.toString(),
      deadline: Math.floor(row.deadline.getTime() / 1000),
      refundGrace: ESCROW_PARAMS.refundGrace,
      reviewWindow: ESCROW_PARAMS.reviewWindow,
      uri,
    },
  };
});

/**
 * Verifica contra la cadena que la tx creó una quest NUESTRA, de la wallet de la sesión,
 * con exactamente los parámetros y el contenido del borrador; luego la enlaza.
 */
const confirm = protectedProcedure.input(confirmQuestSchema).handler(async ({ context, input }) => {
  const { userId, address: sessionAddress } = requireUser(context);
  const client = getPublicClient(input.chainId);
  const contract = getEscrowAddress(input.chainId);

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: input.txHash as `0x${string}` });
  } catch {
    throw new ORPCError("NOT_FOUND", { message: "Transacción no encontrada o aún sin minar" });
  }
  if (receipt.status !== "success") {
    throw new ORPCError("BAD_REQUEST", { message: "La transacción revirtió" });
  }

  // Solo eventos emitidos por NUESTRO contrato y creados por la wallet de la sesión.
  const created = parseEventLogs({
    abi: questEscrowAbi,
    eventName: "QuestCreated",
    logs: receipt.logs,
  }).filter((log) => sameAddress(log.address, contract));

  const event = created.find((log) => sameAddress(log.args.creator, sessionAddress));
  if (!event) {
    throw new ORPCError("FORBIDDEN", {
      message: "La transacción no creó una quest con tu wallet en nuestro contrato",
    });
  }

  // QuestCreated no trae el uri: se lee del contrato.
  const raw = (await client.readContract({
    address: contract,
    abi: questEscrowAbi,
    functionName: "quests",
    args: [event.args.id],
  })) as readonly unknown[];

  const [creator, chainToken, reward, deadline, refundGrace, reviewWindow, chainStatus, , , uri] =
    raw as [string, string, bigint, bigint, bigint, bigint, number | bigint, string, bigint, string];

  if (!sameAddress(creator, sessionAddress)) {
    throw new ORPCError("FORBIDDEN", { message: "El creador on-chain no coincide" });
  }

  const parsed = parseQuestUri(uri);
  if (!parsed) {
    throw new ORPCError("BAD_REQUEST", {
      message: "El uri on-chain no corresponde a un borrador de Perkify",
    });
  }

  const found = await loadQuest(context.db, parsed.draftId);
  if (!found || found.row.creatorId !== userId || found.chainId !== input.chainId) {
    throw new ORPCError("NOT_FOUND", { message: "Borrador no encontrado" });
  }
  const { row, milestones } = found;
  const onchainId = event.args.id.toString();

  // Idempotencia: confirmar dos veces la misma tx devuelve la misma quest.
  if (row.escrowId !== null) {
    if (row.escrowId === onchainId) {
      return toQuest(row, found.symbol, milestones);
    }
    throw new ORPCError("CONFLICT", { message: "El borrador ya está enlazado a otra quest" });
  }

  // El contenido guardado debe producir el hash que quedó fijado on-chain.
  // (solo una quest "preparada", escrowStatus = PENDING, puede enlazarse)
  if (row.escrowStatus !== "PENDING") {
    throw new ORPCError("BAD_REQUEST", { message: "El borrador no fue preparado para fondear" });
  }
  if (hashQuestContent(contentOf(row, milestones)) !== parsed.contentHash) {
    throw new ORPCError("BAD_REQUEST", { message: "El contenido no coincide con el hash fondeado" });
  }

  // Los parámetros económicos deben ser los del borrador, no lo que afirme el cliente.
  const token = await getAcceptedToken(context.db, row.tokenId);
  const matches =
    sameAddress(chainToken, token.address) &&
    reward === toUnits(row.rewardAmount, token.decimals) &&
    Number(deadline) === Math.floor(row.deadline.getTime() / 1000) &&
    Number(refundGrace) === ESCROW_PARAMS.refundGrace &&
    Number(reviewWindow) === ESCROW_PARAMS.reviewWindow;
  if (!matches) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Los parámetros on-chain no coinciden con el borrador",
    });
  }

  const mirrored = ONCHAIN_STATUS[Number(chainStatus)];
  if (!mirrored) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Estado on-chain desconocido" });
  }

  const block = await client.getBlock({ blockNumber: receipt.blockNumber });

  try {
    const [updated] = await context.db
      .update(quests)
      .set({
        escrowId: onchainId,
        status: mirrored.status,
        escrowStatus: mirrored.escrow,
        lastChainEventAt: new Date(Number(block.timestamp) * 1000),
      })
      .where(and(eq(quests.id, row.id), eq(quests.status, "DRAFT")))
      .returning();
    if (!updated) {
      throw new ORPCError("CONFLICT", { message: "El borrador ya fue confirmado" });
    }
    return toQuest(updated, found.symbol, milestones);
  } catch (error) {
    // El indexer (cuando exista) pudo insertar antes esa misma quest on-chain.
    if (isUniqueViolation(error)) {
      throw new ORPCError("CONFLICT", { message: "Esa quest on-chain ya está registrada" });
    }
    throw error;
  }
});

/** Borra un borrador propio. Una quest fondeada no se borra: su estado lo manda el contrato. */
const remove = protectedProcedure.input(questIdSchema).handler(async ({ context, input }) => {
  const { userId } = requireUser(context);

  const deleted = await context.db
    .delete(quests)
    .where(and(eq(quests.id, input.id), eq(quests.creatorId, userId), eq(quests.status, "DRAFT")))
    .returning({ id: quests.id });

  if (deleted.length === 0) {
    throw new ORPCError("NOT_FOUND", { message: "Borrador no encontrado" });
  }
  return { id: input.id };
});

// ───────────────────────────── lectura ─────────────────────────────

/** Listado público: solo quests ya fondeadas (nunca borradores). */
const list = publicProcedure.input(listQuestsSchema).handler(async ({ context, input }) => {
  const cursor = input.cursor ? decodeCursor(input.cursor) : null;

  const rows = await context.db
    .select({ row: quests, symbol: tokens.symbol })
    .from(quests)
    .innerJoin(tokens, eq(quests.tokenId, tokens.id))
    .where(
      and(
        input.status ? eq(quests.status, input.status) : ne(quests.status, "DRAFT"),
        input.chainId ? eq(tokens.chainId, input.chainId) : undefined,
        input.tokenId ? eq(quests.tokenId, input.tokenId) : undefined,
        input.category ? eq(quests.category, input.category) : undefined,
        cursor
          ? or(
              lt(quests.createdAt, cursor.createdAt),
              and(eq(quests.createdAt, cursor.createdAt), lt(quests.id, cursor.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(quests.createdAt), desc(quests.id))
    .limit(input.limit + 1);

  const page = rows.slice(0, input.limit);
  const last = page.at(-1);
  return {
    items: page.map((r) => toSummary(r.row, r.symbol as string)),
    nextCursor: rows.length > input.limit && last ? encodeCursor(last.row) : null,
  };
});

/** Detalle. Un borrador solo lo ve su creador. */
const get = publicProcedure.input(questIdSchema).handler(async ({ context, input }) => {
  const found = await loadQuest(context.db, input.id);
  if (!found || (found.row.status === "DRAFT" && found.row.creatorId !== getSessionUserId(context))) {
    throw new ORPCError("NOT_FOUND", { message: "Quest no encontrada" });
  }
  return toQuest(found.row, found.symbol, found.milestones);
});

/** Mis quests (incluye borradores). */
const mine = protectedProcedure.input(mineQuestsSchema).handler(async ({ context, input }) => {
  const { userId } = requireUser(context);
  const cursor = input.cursor ? decodeCursor(input.cursor) : null;

  const rows = await context.db
    .select({ row: quests, symbol: tokens.symbol })
    .from(quests)
    .innerJoin(tokens, eq(quests.tokenId, tokens.id))
    .where(
      and(
        eq(quests.creatorId, userId),
        input.status ? eq(quests.status, input.status) : undefined,
        cursor
          ? or(
              lt(quests.createdAt, cursor.createdAt),
              and(eq(quests.createdAt, cursor.createdAt), lt(quests.id, cursor.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(quests.createdAt), desc(quests.id))
    .limit(input.limit + 1);

  const page = rows.slice(0, input.limit);
  const last = page.at(-1);
  return {
    items: page.map((r) => toSummary(r.row, r.symbol as string)),
    nextCursor: rows.length > input.limit && last ? encodeCursor(last.row) : null,
  };
});

export const questsRouter = { create, update, prepare, confirm, delete: remove, list, get, mine };