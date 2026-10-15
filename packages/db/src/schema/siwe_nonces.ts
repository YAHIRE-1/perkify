import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createdAt } from "./helpers";

export const siweNonces = pgTable("siwe_nonces", {
  nonce: text("nonce").primaryKey(),
  address: text("address"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});
