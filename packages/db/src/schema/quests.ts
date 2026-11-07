import {
  pgTable, uuid, text, numeric, timestamp, boolean, integer, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { tokens } from "./tokens";
import { createdAt, updatedAt } from "./helpers";
import { questStatusEnum, escrowStatusEnum } from "./quest.enums";

export const quest = pgTable("quests", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: text("creator_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category"),
  criteria: text("criteria"),
  rewardAmount: numeric("reward_amount", { precision: 36, scale: 18 }).notNull(),
  tokenId: uuid("token_id").notNull().references(() => tokens.id, { onDelete: "restrict" }),
  status: questStatusEnum("status").default("DRAFT").notNull(),
  isBoosted: boolean("is_boosted").default(false).notNull(),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),

  // Reglas del proceso (las fija el creador; 0 en maxParticipants = sin límite)
  maxParticipants: integer("max_participants").notNull().default(3),
  submitWindowHours: integer("submit_window_hours").notNull().default(72),
  reviewWindowHours: integer("review_window_hours").notNull().default(72),
  maxAttempts: integer("max_attempts").notNull().default(3),

  // Fondeo
  escrowId: text("escrow_id"),
  chainId: integer("chain_id"),
  createTxHash: text("create_tx_hash"),
  escrowStatus: escrowStatusEnum("escrow_status").default("NONE").notNull(),
  lastChainEventAt: timestamp("last_chain_event_at", { withTimezone: true }),

  validationChecklist: text("validation_checklist").array().notNull().default([]),
  modifiedBy: text("modified_by").notNull().references(() => user.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  archived: timestamp("archived"),
}, (t) => [
  index("idx_quest_status").on(t.status),
  index("idx_quest_creator").on(t.creatorId),
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

// ---- Tipos ----
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
