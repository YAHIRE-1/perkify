import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { quest } from "./quests";

export const notificationKinds = ["JOINED", "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED", "EXPIRED_REFUND", "QUEST_EXPIRED", "DISPUTE_REFUND"] as const;
export type NotificationKind = (typeof notificationKinds)[number];

export const notificationEmail = pgTable("notification_email", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  address: text("address"),
  enabled: boolean("enabled").default(false).notNull(),
  enabledAt: timestamp("enabled_at", { withTimezone: true }),
  pendingAddress: text("pending_address"),
  codeHash: text("code_hash"),
  requestedAt: timestamp("requested_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  verificationAttempts: integer("verification_attempts").default(0).notNull(),
});

export const notification = pgTable("notification", {
  id: uuid("id").defaultRandom().primaryKey(),
  recipientId: text("recipient_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  questId: uuid("quest_id").notNull().references(() => quest.id, { onDelete: "cascade" }),
  questTitle: text("quest_title").notNull(),
  kind: text("kind", { enum: notificationKinds }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  emailAddress: text("email_address"),
  emailDueAt: timestamp("email_due_at", { withTimezone: true }),
  emailAttempts: integer("email_attempts").default(0).notNull(),
}, (table) => [
  index("notification_inbox_idx").on(table.recipientId, table.createdAt, table.id),
  index("notification_unread_idx").on(table.recipientId).where(sql`${table.readAt} is null`),
  index("notification_email_due_idx").on(table.emailDueAt).where(sql`${table.emailDueAt} is not null`),
]);
