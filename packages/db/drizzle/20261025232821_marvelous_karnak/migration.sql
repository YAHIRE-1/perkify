CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"dispute_id" uuid NOT NULL,
	"uploader_id" text NOT NULL,
	"content_url" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"quest_id" uuid NOT NULL,
	"creator_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" "dispute_status" DEFAULT 'open'::"dispute_status" NOT NULL,
	"kleros_dispute_id" text,
	"ruling" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unq_open_dispute" ON "disputes" ("quest_id") WHERE status = 'open';--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_uploader_id_user_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "user"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_quest_id_quests_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_creator_id_user_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "user"("id") ON DELETE RESTRICT;