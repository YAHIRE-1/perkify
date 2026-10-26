CREATE TYPE "chain_type" AS ENUM('evm', 'solana');--> statement-breakpoint
ALTER TABLE "disputes" DROP CONSTRAINT "disputes_quest_id_quests_id_fk";--> statement-breakpoint
ALTER TABLE "evidence" DROP CONSTRAINT "evidence_dispute_id_disputes_id_fk";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_quest_id_quests_id_fk";--> statement-breakpoint
ALTER TABLE "quest_milestones" DROP CONSTRAINT "quest_milestones_quest_id_quests_id_fk";--> statement-breakpoint
DROP TABLE "disputes";--> statement-breakpoint
DROP TABLE "evidence";--> statement-breakpoint
DROP TABLE "siwe_nonces";--> statement-breakpoint
DROP TABLE "quests";--> statement-breakpoint
DROP TABLE "transactions";--> statement-breakpoint
DROP TABLE "quest_milestones";--> statement-breakpoint
ALTER TABLE "tokens" ADD COLUMN "decimals" integer NOT NULL;--> statement-breakpoint
DROP TYPE "dispute_status";--> statement-breakpoint
DROP TYPE "escrow_status";--> statement-breakpoint
DROP TYPE "quest_status";--> statement-breakpoint
DROP TYPE "role";--> statement-breakpoint
DROP TYPE "tx_event";