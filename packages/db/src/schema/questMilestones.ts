import { pgTable, uuid, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { quests } from "./quests";

export const questMilestones = pgTable("milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  questId: uuid("quest_id").notNull().references(() => quests.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  description: text("description").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => ({
  unqQuestPos: unique("unq_quest_pos").on(table.questId, table.position),
}));
