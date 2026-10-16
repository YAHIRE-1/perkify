import { relations } from "drizzle-orm";
import { user } from "./schema/auth";
import {
  quests, disputes, evidence, transactions,
} from "./schema";

export const userQuestsRelations = relations(user, ({ many }) => ({
  questsCreated: many(quests, { relationName: "creator" }),
  questsHunted: many(quests, { relationName: "hunter" }),
}));

export const disputesRelations = relations(disputes, ({ one, many }) => ({
  quest: one(quests, { fields: [disputes.questId], references: [quests.id] }),
  evidence: many(evidence),
}));

export const evidenceRelations = relations(evidence, ({ one }) => ({
  dispute: one(disputes, { fields: [evidence.disputeId], references: [disputes.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  quest: one(quests, { fields: [transactions.questId], references: [quests.id] }),
}));