CREATE TYPE "dispute_status" AS ENUM('open', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "role" AS ENUM('hunter', 'buyer', 'admin');--> statement-breakpoint
CREATE TYPE "tx_event" AS ENUM('deposit', 'release', 'refund', 'dispute_created', 'dispute_resolved');--> statement-breakpoint
CREATE TYPE "chain_type" AS ENUM('evm', 'solana');--> statement-breakpoint
CREATE TYPE "escrow_status" AS ENUM('NONE', 'PENDING', 'LOCKED', 'RELEASED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "quest_status" AS ENUM('DRAFT', 'FUNDED', 'CLAIMED', 'SUBMITTED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'APPROVED', 'DISPUTED');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
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
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'hunter' NOT NULL,
	"bio" text,
	"avatar_url" text,
	"wallet_address" text UNIQUE
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_address" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"address" text NOT NULL,
	"chain_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"chain_id" integer NOT NULL,
	"address" text NOT NULL,
	"symbol" text NOT NULL,
	"decimals" integer NOT NULL,
	CONSTRAINT "unq_chain_address" UNIQUE("chain_id","address")
);
--> statement-breakpoint
CREATE TABLE "siwe_nonces" (
	"nonce" text PRIMARY KEY,
	"address" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"chain_id" integer,
	"create_tx_hash" text,
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
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"quest_id" uuid NOT NULL,
	"chain_id" integer NOT NULL,
	"tx_hash" text NOT NULL,
	"log_index" integer DEFAULT 0 NOT NULL,
	"event_type" "tx_event" NOT NULL,
	"amount" numeric(36,18),
	"block_timestamp" timestamp with time zone NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unq_chain_tx_log" UNIQUE("chain_id","tx_hash","log_index")
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE INDEX "walletAddress_userId_idx" ON "wallet_address" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_quest_status" ON "quests" ("status");--> statement-breakpoint
CREATE INDEX "idx_quest_creator" ON "quests" ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_quest_hunter" ON "quests" ("hunter_id");--> statement-breakpoint
CREATE INDEX "idx_quest_token" ON "quests" ("token_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_quest_create_tx" ON "quests" ("create_tx_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_quest_chain_escrow" ON "quests" ("chain_id","escrow_id");--> statement-breakpoint
CREATE INDEX "idx_milestone_quest" ON "quest_milestones" ("quest_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_open_dispute" ON "disputes" ("quest_id") WHERE status = 'open';--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "wallet_address" ADD CONSTRAINT "wallet_address_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_creator_id_user_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "user"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_hunter_id_user_id_fkey" FOREIGN KEY ("hunter_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_token_id_tokens_id_fkey" FOREIGN KEY ("token_id") REFERENCES "tokens"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_modified_by_user_id_fkey" FOREIGN KEY ("modified_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "quest_milestones" ADD CONSTRAINT "quest_milestones_quest_id_quests_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_uploader_id_user_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "user"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_quest_id_quests_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_creator_id_user_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "user"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_quest_id_quests_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE RESTRICT;