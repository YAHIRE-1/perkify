CREATE TYPE "public"."dispute_status" AS ENUM('open', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."escrow_status" AS ENUM('none', 'deposited', 'released', 'refunded', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."quest_status" AS ENUM('draft', 'open', 'funded', 'in_progress', 'submitted', 'completed', 'disputed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('hunter', 'buyer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."tx_event" AS ENUM('deposit', 'release', 'refund', 'dispute_created', 'dispute_resolved');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'hunter' NOT NULL,
	"bio" text,
	"avatar_url" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_address" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"address" text NOT NULL,
	"chain_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"creator_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"kleros_dispute_id" text,
	"ruling" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispute_id" uuid NOT NULL,
	"uploader_id" text NOT NULL,
	"content_url" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siwe_nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"address" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" integer NOT NULL,
	"address" text NOT NULL,
	"symbol" text NOT NULL,
	CONSTRAINT "unq_chain_address" UNIQUE("chain_id","address")
);
--> statement-breakpoint
CREATE TABLE "quests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" text NOT NULL,
	"hunter_id" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"criteria" text,
	"reward_amount" numeric(36, 18) NOT NULL,
	"token_id" uuid NOT NULL,
	"status" "quest_status" DEFAULT 'draft' NOT NULL,
	"is_boosted" boolean DEFAULT false NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"claim_deadline" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"review_deadline" timestamp with time zone,
	"escrow_id" text,
	"escrow_status" "escrow_status" DEFAULT 'none' NOT NULL,
	"last_chain_event_at" timestamp with time zone,
	"validation_checklist" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"description" text NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "unq_quest_pos" UNIQUE("quest_id","position")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"chain_id" integer NOT NULL,
	"tx_hash" text NOT NULL,
	"log_index" integer DEFAULT 0 NOT NULL,
	"event_type" "tx_event" NOT NULL,
	"amount" numeric(36, 18),
	"block_timestamp" timestamp with time zone NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unq_chain_tx_log" UNIQUE("chain_id","tx_hash","log_index")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_address" ADD CONSTRAINT "wallet_address_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_dispute_id_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "public"."disputes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_uploader_id_user_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_hunter_id_user_id_fk" FOREIGN KEY ("hunter_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "walletAddress_userId_idx" ON "wallet_address" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_open_dispute" ON "disputes" USING btree ("quest_id") WHERE status = 'open';--> statement-breakpoint
CREATE INDEX "idx_quest_status" ON "quests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_quest_creator" ON "quests" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_quest_hunter" ON "quests" USING btree ("hunter_id");