import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { disputes } from "./disputes";
import { user } from "./auth";
import { createdAt } from "./helpers";

export const evidence = pgTable("evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  disputeId: uuid("dispute_id").notNull().references(() => disputes.id, { onDelete: "cascade" }),
  uploaderId: text("uploader_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  contentUrl: text("content_url").notNull(),
  description: text("description"),
  createdAt: createdAt(),
});
