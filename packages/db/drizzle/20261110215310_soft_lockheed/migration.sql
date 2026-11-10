CREATE TYPE "participation_status" AS ENUM('JOINED', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED', 'LOST', 'ABANDONED');--> statement-breakpoint
CREATE TYPE "submission_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "quest_participations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"quest_id" uuid NOT NULL,
	"hunter_id" text NOT NULL,
	"status" "participation_status" DEFAULT 'JOINED'::"participation_status" NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"wallet_address" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"approved_at" timestamp with time zone,
	"payout_tx_hash" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quest_evidence_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"submission_id" uuid NOT NULL,
	"key" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quest_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"participation_id" uuid NOT NULL,
	"notes" text NOT NULL,
	"links" jsonb DEFAULT '[]' NOT NULL,
	"status" "submission_status" DEFAULT 'PENDING'::"submission_status" NOT NULL,
	"rejection_reason" text,
	"review_deadline" timestamp with time zone NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "disputes" DROP CONSTRAINT "disputes_creator_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "quests" DROP CONSTRAINT "quests_hunter_id_user_id_fkey";--> statement-breakpoint
DROP TABLE "evidence";--> statement-breakpoint
DROP INDEX "unq_open_dispute";--> statement-breakpoint
DROP INDEX "idx_quest_hunter";--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "max_participants" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "submit_window_hours" integer DEFAULT 72 NOT NULL;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "review_window_hours" integer DEFAULT 72 NOT NULL;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "max_attempts" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "participation_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "submission_id" uuid;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "opened_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "freeze_tx_hash" text;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "resolve_tx_hash" text;--> statement-breakpoint
ALTER TABLE "quests" DROP COLUMN "hunter_id";--> statement-breakpoint
ALTER TABLE "quests" DROP COLUMN "claimed_at";--> statement-breakpoint
ALTER TABLE "quests" DROP COLUMN "claim_deadline";--> statement-breakpoint
ALTER TABLE "quests" DROP COLUMN "submitted_at";--> statement-breakpoint
ALTER TABLE "quests" DROP COLUMN "review_deadline";--> statement-breakpoint
ALTER TABLE "disputes" DROP COLUMN "creator_id";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_participation_quest_hunter" ON "quest_participations" ("quest_id","hunter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_one_winner_per_quest" ON "quest_participations" ("quest_id") WHERE "status" in ('APPROVED','PAID');--> statement-breakpoint
CREATE UNIQUE INDEX "uq_participation_payout_tx" ON "quest_participations" ("payout_tx_hash");--> statement-breakpoint
CREATE INDEX "idx_participation_hunter" ON "quest_participations" ("hunter_id");--> statement-breakpoint
CREATE INDEX "idx_participation_quest_status" ON "quest_participations" ("quest_id","status");--> statement-breakpoint
CREATE INDEX "idx_evidence_file_submission" ON "quest_evidence_files" ("submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_one_pending_per_participation" ON "quest_submissions" ("participation_id") WHERE "status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "idx_submission_participation" ON "quest_submissions" ("participation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_open_dispute_per_participation" ON "disputes" ("participation_id") WHERE "status" = 'open';--> statement-breakpoint
CREATE UNIQUE INDEX "unq_dispute_freeze_tx" ON "disputes" ("freeze_tx_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_dispute_resolve_tx" ON "disputes" ("resolve_tx_hash");--> statement-breakpoint
CREATE INDEX "idx_dispute_quest" ON "disputes" ("quest_id");--> statement-breakpoint
CREATE INDEX "idx_dispute_submission" ON "disputes" ("submission_id");--> statement-breakpoint
ALTER TABLE "quest_participations" ADD CONSTRAINT "quest_participations_quest_id_quests_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "quest_participations" ADD CONSTRAINT "quest_participations_hunter_id_user_id_fkey" FOREIGN KEY ("hunter_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "quest_evidence_files" ADD CONSTRAINT "quest_evidence_files_submission_id_quest_submissions_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "quest_submissions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "quest_submissions" ADD CONSTRAINT "quest_submissions_participation_id_quest_participations_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "quest_participations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_participation_id_quest_participations_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "quest_participations"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_submission_id_quest_submissions_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "quest_submissions"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_user_id_fkey" FOREIGN KEY ("opened_by") REFERENCES "user"("id") ON DELETE RESTRICT;