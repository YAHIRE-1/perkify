import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["hunter", "buyer", "admin"]);
export const disputeStatusEnum = pgEnum("dispute_status", ["open", "resolved", "closed"]);
export const txEventEnum = pgEnum("tx_event", ["deposit", "release", "refund", "dispute_created", "dispute_resolved"]);
