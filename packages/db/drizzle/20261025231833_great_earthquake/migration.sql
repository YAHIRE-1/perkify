CREATE TYPE "dispute_status" AS ENUM('open', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "role" AS ENUM('hunter', 'buyer', 'admin');--> statement-breakpoint
CREATE TYPE "tx_event" AS ENUM('deposit', 'release', 'refund', 'dispute_created', 'dispute_resolved');--> statement-breakpoint
CREATE TABLE "siwe_nonces" (
	"nonce" text PRIMARY KEY,
	"address" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
