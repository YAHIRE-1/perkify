import {
  pgTable, pgEnum, uuid, text, numeric, timestamp, boolean, integer, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { defineRelationsPart } from "drizzle-orm";
import { z } from "zod";
import { user } from "./auth";
import { tokens } from "./tokens";
import { createdAt, updatedAt } from "./helpers";

export const questStatusEnum = pgEnum("quest_status", [
  "DRAFT", "FUNDED", "CLAIMED", "SUBMITTED", "COMPLETED", "CANCELLED", "EXPIRED",
  "APPROVED", "DISPUTED",
]);

export const escrowStatusEnum = pgEnum("escrow_status", [
  "NONE", "PENDING", "LOCKED", "RELEASED", "REFUNDED",
]);

export const quest = pgTable("quests", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: text("creator_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  hunterId: text("hunter_id").references(() => user.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category"),
  criteria: text("criteria"),
  rewardAmount: numeric("reward_amount", { precision: 36, scale: 18 }).notNull(),
  tokenId: uuid("token_id").notNull().references(() => tokens.id, { onDelete: "restrict" }),
  status: questStatusEnum("status").default("DRAFT").notNull(),
  isBoosted: boolean("is_boosted").default(false).notNull(),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  claimDeadline: timestamp("claim_deadline", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewDeadline: timestamp("review_deadline", { withTimezone: true }),
  escrowId: text("escrow_id"),
  chainId: integer("chain_id"),
  createTxHash: text("create_tx_hash"),
  escrowStatus: escrowStatusEnum("escrow_status").default("NONE").notNull(),
  lastChainEventAt: timestamp("last_chain_event_at", { withTimezone: true }),
  validationChecklist: text("validation_checklist").array().notNull().default([]),
  modifiedBy: text("modified_by")
    .notNull()
    .references(() => user.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  archived: timestamp("archived"),
}, (t) => [
  index("idx_quest_status").on(t.status),
  index("idx_quest_creator").on(t.creatorId),
  index("idx_quest_hunter").on(t.hunterId),
  index("idx_quest_token").on(t.tokenId),
  uniqueIndex("uq_quest_create_tx").on(t.createTxHash),
  uniqueIndex("uq_quest_chain_escrow").on(t.chainId, t.escrowId),
]);

export const questMilestones = pgTable("quest_milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  questId: uuid("quest_id").notNull().references(() => quest.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: createdAt(),
}, (t) => [index("idx_milestone_quest").on(t.questId, t.position)]);

// ---- Relaciones (parte) ----
export const questRelations = defineRelationsPart(
  { quest, questMilestones, user, tokens },
  (r) => ({
    quest: {
      creator: r.one.user({
        from: r.quest.creatorId,
        to: r.user.id,
        alias: "creator",
      }),
      hunter: r.one.user({
        from: r.quest.hunterId,
        to: r.user.id,
        alias: "hunter",
        optional: true,
      }),
      token: r.one.tokens({
        from: r.quest.tokenId,
        to: r.tokens.id,
      }),
      milestones: r.many.questMilestones({
        from: r.quest.id,
        to: r.questMilestones.questId,
      }),
    },
    questMilestones: {
      quest: r.one.quest({
        from: r.questMilestones.questId,
        to: r.quest.id,
      }),
    },
  }),
);

// ---- Tipos ----
export type QuestStatus = (typeof questStatusEnum.enumValues)[number];
export type EscrowStatus = (typeof escrowStatusEnum.enumValues)[number];
export type QuestRow = typeof quest.$inferSelect;
export type NewQuest = typeof quest.$inferInsert;
export type MilestoneRow = typeof questMilestones.$inferSelect;

type Serialized<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K];
};

export type Quest = Serialized<QuestRow> & {
  acceptedTokenSymbol: string;
  milestones: Pick<MilestoneRow, "id" | "description" | "position">[];
};
export type QuestSummary = Omit<Quest, "milestones" | "criteria" | "validationChecklist">;

export type CreateQuestInput = Pick<
  NewQuest,
  "title" | "description" | "category" | "criteria" | "rewardAmount" | "tokenId" | "isBoosted" | "validationChecklist"
> & { deadline: string; milestones?: string[] };
export type UpdateQuestInput = Partial<CreateQuestInput>;

// ---- Validación (Zod) ----
// Solo contrato con la API / protección de la BD.
// Las reglas de UX (mínimos, mensajes, "deadline futuro", etc.) viven en el formulario del cliente.
const questStatusSchema = z.enum(questStatusEnum.enumValues);

export const createQuestSchema = z.object({
  title: z.string().trim().max(120),
  description: z.string().trim().max(10_000),
  category: z.string().trim().max(60).nullish(),
  criteria: z.string().trim().max(5_000).nullish(),
  rewardAmount: z.string().regex(/^\d{1,18}(\.\d{1,18})?$/),
  tokenId: z.string().uuid(),
  isBoosted: z.boolean().optional(),
  validationChecklist: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  deadline: z.string().datetime({ offset: true }),
  milestones: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
});

export const updateQuestSchema = z.object({
  id: z.string().uuid(),
  data: createQuestSchema.partial(),
});

export const questIdSchema = z.object({ id: z.string().uuid() });

export const confirmQuestSchema = z.object({
  chainId: z.number().int().positive(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

export const listQuestsSchema = z.object({
  status: questStatusSchema.exclude(["DRAFT"]).optional(),
  chainId: z.number().int().positive().optional(),
  tokenId: z.string().uuid().optional(),
  category: z.string().trim().max(60).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().max(200).optional(),
});

export const mineQuestsSchema = listQuestsSchema
  .pick({ limit: true, cursor: true })
  .extend({ status: questStatusSchema.optional() });