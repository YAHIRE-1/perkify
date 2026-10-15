import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index";
import * as relations from "./relations";

export function createDb(env: { DATABASE_URL: string }) {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  return drizzle(pool, { schema: { ...schema, ...relations } });
}

export type Db = ReturnType<typeof createDb>;