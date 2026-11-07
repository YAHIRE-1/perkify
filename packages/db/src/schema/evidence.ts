import { sql } from "drizzle-orm";
import {
  pgTable, uuid, text, timestamp, integer, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { questParticipation } from "./participations";
import { createdAt } from "./helpers";
import { submissionStatusEnum } from "./quest.enums";

export const questSubmission = pgTable("quest_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  participationId: uuid("participation_id").notNull()
    .references(() => questParticipation.id, { onDelete: "cascade" }),
  notes: text("notes").notNull(),
  links: jsonb("links").$type<string[]>().notNull().default([]),
  status: submissionStatusEnum("status").notNull().default("PENDING"),
  rejectionReason: text("rejection_reason"),
  reviewDeadline: timestamp("review_deadline", { withTimezone: true }).notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [
  // un solo envío pendiente por participación
  uniqueIndex("uq_one_pending_per_participation")
    .on(t.participationId)
    .where(sql`${t.status} = 'PENDING'`),
  index("idx_submission_participation").on(t.participationId),
]);

export const questEvidenceFile = pgTable("quest_evidence_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id").notNull()
    .references(() => questSubmission.id, { onDelete: "cascade" }),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  createdAt: createdAt(),
}, (t) => [index("idx_evidence_file_submission").on(t.submissionId)]);

export type SubmissionRow = typeof questSubmission.$inferSelect;
export type EvidenceFileRow = typeof questEvidenceFile.$inferSelect;