import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { defineRelationsPart } from "drizzle-orm";
import { disputeStatusEnum } from "./enums";
import { evidence } from "./evidence";
import { quest } from "./quests";
import { user } from "./auth";
import { sql } from "drizzle-orm";

export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  questId: uuid("quest_id").notNull().references(() => quest.id, { onDelete: "restrict" }),
  creatorId: text("creator_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  reason: text("reason").notNull(),
  status: disputeStatusEnum("status").default("open").notNull(),
  klerosDisputeId: text("kleros_dispute_id"),
  ruling: text("ruling"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("unq_open_dispute").on(table.questId).where(sql`status = 'open'`),
]);

export const disputesRelations = defineRelationsPart(
  { disputes, quest, evidence },
  (r) => ({
    disputes: {
      quest: r.one.quest({ from: r.disputes.questId, to: r.quest.id }),
      evidence: r.many.evidence({ from: r.disputes.id, to: r.evidence.disputeId }),
    },
  }),
);