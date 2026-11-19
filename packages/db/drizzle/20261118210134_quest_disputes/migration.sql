CREATE TABLE IF NOT EXISTS "dispute_moderators" (
	"user_id" text PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"recipient_id" text NOT NULL,
	"quest_id" uuid NOT NULL,
	"quest_title" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"email_address" text,
	"email_due_at" timestamp with time zone,
	"email_attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_email" (
	"user_id" text PRIMARY KEY,
	"address" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"enabled_at" timestamp with time zone,
	"pending_address" text,
	"code_hash" text,
	"requested_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"verification_attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS "uq_quest_chain_escrow";--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "ruling_reason" text;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "resolved_by" text;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "chain_scan_block" bigint;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "next_chain_check_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "frozen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "escrow_address" text;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "automatic_refund" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "has_joined" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "cancel_expires_at" bigint;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "approval_expires_at" bigint;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "refund_start_block" bigint;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "refund_next_check_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "refund_tx_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unq_open_dispute_per_quest" ON "disputes" ("quest_id") WHERE "status" = 'open';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_inbox_idx" ON "notification" ("recipient_id","created_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_unread_idx" ON "notification" ("recipient_id") WHERE "read_at" is null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_email_due_idx" ON "notification" ("email_due_at") WHERE "email_due_at" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_quest_chain_escrow_legacy" ON "quests" ("chain_id","escrow_id") WHERE "escrow_address" is null;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_quest_chain_escrow_address" ON "quests" ("chain_id","escrow_address","escrow_id");--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."dispute_moderators"'::regclass AND conname = 'dispute_moderators_user_id_user_id_fkey'
  ) THEN
    ALTER TABLE "dispute_moderators" ADD CONSTRAINT "dispute_moderators_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."disputes"'::regclass AND conname = 'disputes_resolved_by_user_id_fkey'
  ) THEN
    ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by") REFERENCES "user"("id") ON DELETE RESTRICT;
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."notification"'::regclass AND conname = 'notification_recipient_id_user_id_fkey'
  ) THEN
    ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_id_user_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "user"("id") ON DELETE CASCADE;
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."notification"'::regclass AND conname = 'notification_quest_id_quests_id_fkey'
  ) THEN
    ALTER TABLE "notification" ADD CONSTRAINT "notification_quest_id_quests_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE;
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."notification_email"'::regclass AND conname = 'notification_email_user_id_user_id_fkey'
  ) THEN
    ALTER TABLE "notification_email" ADD CONSTRAINT "notification_email_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
  END IF;
END $$;
