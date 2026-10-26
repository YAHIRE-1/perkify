import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { DatabaseConfig } from "./config";
import { relations } from "./relations";

export function createDb(
  env: DatabaseConfig
): NodePgDatabase<typeof relations> {
  return drizzle(env.DATABASE_URL, { relations });
}

export type Database = ReturnType<typeof createDb>;
