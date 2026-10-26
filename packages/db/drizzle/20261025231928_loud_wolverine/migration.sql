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
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_quest_id_quests_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE RESTRICT;