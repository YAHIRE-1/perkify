CREATE TABLE "quest_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"description" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "milestones" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "milestones" CASCADE;--> statement-breakpoint
ALTER TABLE "quests" ALTER COLUMN "escrow_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quests" ALTER COLUMN "escrow_status" SET DEFAULT 'NONE'::text;--> statement-breakpoint
DROP TYPE "public"."escrow_status";--> statement-breakpoint
CREATE TYPE "public"."escrow_status" AS ENUM('NONE', 'PENDING', 'LOCKED', 'RELEASED', 'REFUNDED');--> statement-breakpoint
ALTER TABLE "quests" ALTER COLUMN "escrow_status" SET DEFAULT 'NONE'::"public"."escrow_status";--> statement-breakpoint
ALTER TABLE "quests" ALTER COLUMN "escrow_status" SET DATA TYPE "public"."escrow_status" USING "escrow_status"::"public"."escrow_status";--> statement-breakpoint
ALTER TABLE "quests" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quests" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::text;--> statement-breakpoint
DROP TYPE "public"."quest_status";--> statement-breakpoint
CREATE TYPE "public"."quest_status" AS ENUM('DRAFT', 'FUNDED', 'CLAIMED', 'SUBMITTED', 'COMPLETED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
ALTER TABLE "quests" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"public"."quest_status";--> statement-breakpoint
ALTER TABLE "quests" ALTER COLUMN "status" SET DATA TYPE "public"."quest_status" USING "status"::"public"."quest_status";--> statement-breakpoint
ALTER TABLE "quest_milestones" ADD CONSTRAINT "quest_milestones_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_milestone_quest" ON "quest_milestones" USING btree ("quest_id","position");--> statement-breakpoint
CREATE INDEX "idx_quest_token" ON "quests" USING btree ("token_id");