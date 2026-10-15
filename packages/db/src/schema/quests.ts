import { pgTable, uuid, text, numeric, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { questStatusEnum, escrowStatusEnum } from "./enums";
import { user } from "./auth";
import { tokens } from "./tokens";
import { createdAt, updatedAt } from "./helpers";

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
  status: questStatusEnum("status").default("draft").notNull(),
  isBoosted: boolean("is_boosted").default(false).notNull(),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  claimDeadline: timestamp("claim_deadline", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewDeadline: timestamp("review_deadline", { withTimezone: true }),
  escrowId: text("escrow_id"),
  escrowStatus: escrowStatusEnum("escrow_status").default("none").notNull(),
  lastChainEventAt: timestamp("last_chain_event_at", { withTimezone: true }),
  validationChecklist: jsonb("validation_checklist").$type<string[]>().notNull().default('[]'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => ({
  statusIdx: index("idx_quest_status").on(table.status),
  creatorIdx: index("idx_quest_creator").on(table.creatorId),
  hunterIdx: index("idx_quest_hunter").on(table.hunterId),
}));
