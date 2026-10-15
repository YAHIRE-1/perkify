import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { disputeStatusEnum } from "./enums";
import { quests } from "./quests";
import { user } from "./auth";
import { sql } from "drizzle-orm";

export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  questId: uuid("quest_id").notNull().references(() => quests.id, { onDelete: "restrict" }),
  creatorId: text("creator_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  reason: text("reason").notNull(),
  status: disputeStatusEnum("status").default("open").notNull(),
  klerosDisputeId: text("kleros_dispute_id"),
  ruling: text("ruling"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => ({
  unqOpenDispute: uniqueIndex("unq_open_dispute").on(table.questId).where(sql`status = 'open'`),
}));
