import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["hunter", "buyer", "admin"]);
export const questStatusEnum = pgEnum("quest_status", ["draft", "open", "funded", "in_progress", "submitted", "completed", "disputed", "cancelled"]);
export const escrowStatusEnum = pgEnum("escrow_status", ["none", "deposited", "released", "refunded", "disputed"]);
export const disputeStatusEnum = pgEnum("dispute_status", ["open", "resolved", "closed"]);
export const txEventEnum = pgEnum("tx_event", ["deposit", "release", "refund", "dispute_created", "dispute_resolved"]);
