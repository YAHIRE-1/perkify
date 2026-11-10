import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { disputeStatusEnum } from "./enums";
import { questSubmission } from "./evidence";
import { questParticipation } from "./participations";
import { quest } from "./quests";

export const disputes = pgTable(
  "disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id")
      .notNull()
      .references(() => quest.id, { onDelete: "restrict" }),
    participationId: uuid("participation_id")
      .notNull()
      .references(() => questParticipation.id, { onDelete: "restrict" }),
    submissionId: uuid("submission_id").references(() => questSubmission.id, {
      onDelete: "restrict",
    }),
    openedBy: text("opened_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    status: disputeStatusEnum("status").default("open").notNull(),
    ruling: text("ruling"),
    klerosDisputeId: text("kleros_dispute_id"),
    freezeTxHash: text("freeze_tx_hash"),
    resolveTxHash: text("resolve_tx_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("unq_open_dispute_per_participation")
      .on(t.participationId)
      .where(sql`${t.status} = 'open'`),
    uniqueIndex("unq_dispute_freeze_tx").on(t.freezeTxHash),
    uniqueIndex("unq_dispute_resolve_tx").on(t.resolveTxHash),
    index("idx_dispute_quest").on(t.questId),
    index("idx_dispute_submission").on(t.submissionId),
  ],
);

export type DisputeRow = typeof disputes.$inferSelect;
export type NewDispute = typeof disputes.$inferInsert;
