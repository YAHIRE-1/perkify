import type { Session } from "@perkify/auth";
import type { Database } from "@perkify/db";

export interface Context {
  session: Session | null;
  db: Database;
}
