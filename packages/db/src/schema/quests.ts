import {
  pgTable, pgEnum, uuid, text, numeric, timestamp, boolean, jsonb, integer, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { tokens } from "./tokens";
import { createdAt, updatedAt } from "./helpers";

export const questStatusEnum = pgEnum("quest_status", [
  "DRAFT", "FUNDED", "CLAIMED", "SUBMITTED", "COMPLETED", "CANCELLED", "EXPIRED",
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