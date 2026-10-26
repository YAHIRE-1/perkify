import { pgTable, uuid, text, integer, numeric, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { txEventEnum } from "./enums";
import { quest } from "./quests";
import { createdAt } from "./helpers";
import { defineRelationsPart } from "drizzle-orm";

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  questId: uuid("quest_id").notNull().references(() => quest.id, { onDelete: "restrict" }),
  chainId: integer("chain_id").notNull(),
  txHash: text("tx_hash").notNull(),
  logIndex: integer("log_index").default(0).notNull(),
  eventType: txEventEnum("event_type").notNull(),
  amount: numeric("amount", { precision: 36, scale: 18 }),
  blockTimestamp: timestamp("block_timestamp", { withTimezone: true }).notNull(),
  rawPayload: jsonb("raw_payload"),
  createdAt: createdAt(),
}, (table) => ({
  unqTx: unique("unq_chain_tx_log").on(table.chainId, table.txHash, table.logIndex),
}));

export const transactionsRelations = defineRelationsPart(
  { transactions, quest },
  (r) => ({
    transactions: {
      quest: r.one.quest({ from: r.transactions.questId, to: r.quest.id }),
    },
  }),
);