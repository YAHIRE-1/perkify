import { pgTable, uuid, text, integer, unique } from "drizzle-orm/pg-core";

export const tokens = pgTable("tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  chainId: integer("chain_id").notNull(),
  address: text("address").notNull(),
  symbol: text("symbol").notNull(),
}, (table) => ({
  unqChainAddress: unique("unq_chain_address").on(table.chainId, table.address),
}));
