import {
  pgTable, pgEnum, uuid, text, numeric, timestamp, boolean, jsonb, integer, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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

export const quests = pgTable("quests", {
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
  escrowStatus: escrowStatusEnum("escrow_status").default("NONE").notNull(),
  lastChainEventAt: timestamp("last_chain_event_at", { withTimezone: true }),
  validationChecklist: jsonb("validation_checklist").$type<string[]>().notNull().default([]),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("idx_quest_status").on(t.status),
  index("idx_quest_creator").on(t.creatorId),
  index("idx_quest_hunter").on(t.hunterId),
  index("idx_quest_token").on(t.tokenId),
]);

export const questMilestones = pgTable("quest_milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  questId: uuid("quest_id").notNull().references(() => quests.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: createdAt(),
}, (t) => [index("idx_milestone_quest").on(t.questId, t.position)]);

// ---- Relaciones (solo entre tablas de este archivo + las que ya existen) ----
export const questsRelations = relations(quests, ({ one, many }) => ({
  creator: one(user, { fields: [quests.creatorId], references: [user.id], relationName: "creator" }),
  hunter: one(user, { fields: [quests.hunterId], references: [user.id], relationName: "hunter" }),
  token: one(tokens, { fields: [quests.tokenId], references: [tokens.id] }),
  milestones: many(questMilestones),
}));

export const questMilestonesRelations = relations(questMilestones, ({ one }) => ({
  quest: one(quests, { fields: [questMilestones.questId], references: [quests.id] }),
}));

// ---- Tipos ----
export type QuestStatus = (typeof questStatusEnum.enumValues)[number];
export type EscrowStatus = (typeof escrowStatusEnum.enumValues)[number];
export type QuestRow = typeof quests.$inferSelect;
export type NewQuest = typeof quests.$inferInsert;
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
const questStatusSchema = z.enum(questStatusEnum.enumValues);

/** Valida CreateQuestInput. isBoosted se acepta pero el servidor lo ignora. */
export const createQuestSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(10_000),
  category: z.string().trim().max(60).nullish(),
  criteria: z.string().trim().max(5_000).nullish(),
  /** Monto decimal legible del token elegido: "25" o "25.50". */
  rewardAmount: z.string().regex(/^\d{1,18}(\.\d{1,18})?$/, "Monto inválido"),
  tokenId: z.string().uuid(),
  isBoosted: z.boolean().optional(),
  validationChecklist: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  /** ISO 8601 con zona, p. ej. 2026-12-31T23:59:00Z. */
  deadline: z.string().datetime({ offset: true }),
  milestones: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
});

export const updateQuestSchema = z.object({
  id: z.string().uuid(),
  data: createQuestSchema.partial().refine((d) => Object.keys(d).length > 0, "Nada que actualizar"),
});

/** Para get, prepare y delete. */
export const questIdSchema = z.object({ id: z.string().uuid() });

export const confirmQuestSchema = z.object({
  chainId: z.number().int().positive(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Hash inválido"),
});

export const listQuestsSchema = z.object({
  status: questStatusSchema.exclude(["DRAFT"]).optional(),
  chainId: z.number().int().positive().optional(),
  tokenId: z.string().uuid().optional(),
  category: z.string().trim().max(60).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  /** Cursor opaco devuelto por la página anterior. */
  cursor: z.string().max(200).optional(),
});

/** Mis quests: misma paginación, pero con borradores. */
export const mineQuestsSchema = listQuestsSchema
  .pick({ limit: true, cursor: true })
  .extend({ status: questStatusSchema.optional() });