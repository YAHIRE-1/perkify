CREATE TYPE "escrow_status" AS ENUM('NONE', 'PENDING', 'LOCKED', 'RELEASED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "quest_status" AS ENUM('DRAFT', 'FUNDED', 'CLAIMED', 'SUBMITTED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'APPROVED', 'DISPUTED');--> statement-breakpoint
CREATE TABLE "quests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"creator_id" text NOT NULL,
	"hunter_id" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"criteria" text,
	"reward_amount" numeric(36,18) NOT NULL,
	"token_id" uuid NOT NULL,
	"status" "quest_status" DEFAULT 'DRAFT'::"quest_status" NOT NULL,
	"is_boosted" boolean DEFAULT false NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"claim_deadline" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"review_deadline" timestamp with time zone,
	"escrow_id" text,
	"escrow_status" "escrow_status" DEFAULT 'NONE'::"escrow_status" NOT NULL,
	"last_chain_event_at" timestamp with time zone,
	"validation_checklist" text[] DEFAULT '{}'::text[] NOT NULL,
	"modified_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived" timestamp
);
--> statement-breakpoint
CREATE TABLE "quest_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"quest_id" uuid NOT NULL,
	"description" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_quest_status" ON "quests" ("status");--> statement-breakpoint
CREATE INDEX "idx_quest_creator" ON "quests" ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_quest_hunter" ON "quests" ("hunter_id");--> statement-breakpoint
CREATE INDEX "idx_quest_token" ON "quests" ("token_id");--> statement-breakpoint
CREATE INDEX "idx_milestone_quest" ON "quest_milestones" ("quest_id","position");--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_creator_id_user_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "user"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_hunter_id_user_id_fkey" FOREIGN KEY ("hunter_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_token_id_tokens_id_fkey" FOREIGN KEY ("token_id") REFERENCES "tokens"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_modified_by_user_id_fkey" FOREIGN KEY ("modified_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "quest_milestones" ADD CONSTRAINT "quest_milestones_quest_id_quests_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE;