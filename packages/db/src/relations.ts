import { relations } from "drizzle-orm";
import { user } from "./schema/auth";
import {
  quests, questMilestones, disputes, evidence, transactions,
} from "./schema";

export const userQuestsRelations = relations(user, ({ many }) => ({
  questsCreated: many(quests, { relationName: "creator" }),
  questsHunted: many(quests, { relationName: "hunter" }),
}));

export const questsRelations = relations(quests, ({ one, many }) => ({
  creator: one(user, {
    fields: [quests.creatorId],
    references: [user.id],
    relationName: "creator",
  }),
  hunter: one(user, {
    fields: [quests.hunterId],
    references: [user.id],
    relationName: "hunter",
  }),
  milestones: many(questMilestones),
  transactions: many(transactions),
  disputes: many(disputes),
}));

export const questMilestonesRelations = relations(questMilestones, ({ one }) => ({
  quest: one(quests, { fields: [questMilestones.questId], references: [quests.id] }),
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