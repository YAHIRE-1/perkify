import { sql } from "drizzle-orm";
import {
  pgTable, uuid, text, timestamp, integer, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { quest } from "./quests";
import { createdAt, updatedAt } from "./helpers";
import { participationStatusEnum } from "./quest.enums";

export const questParticipation = pgTable("quest_participations", {
  id: uuid("id").primaryKey().defaultRandom(),
  questId: uuid("quest_id").notNull().references(() => quest.id, { onDelete: "cascade" }),
  hunterId: text("hunter_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  status: participationStatusEnum("status").notNull().default("JOINED"),
  attempts: integer("attempts").notNull().default(1),
  walletAddress: text("wallet_address").notNull(), // snapshot al unirse
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // plazo para enviar
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  payoutTxHash: text("payout_tx_hash"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("uq_participation_quest_hunter").on(t.questId, t.hunterId),
  // La base de datos garantiza UN solo ganador por quest
  uniqueIndex("uq_one_winner_per_quest").on(t.questId).where(sql`${t.status} in ('APPROVED','PAID')`),
  uniqueIndex("uq_participation_payout_tx").on(t.payoutTxHash),
  index("idx_participation_hunter").on(t.hunterId),
  index("idx_participation_quest_status").on(t.questId, t.status),
]);

export type ParticipationRow = typeof questParticipation.$inferSelect;
export type NewParticipation = typeof questParticipation.$inferInsert;