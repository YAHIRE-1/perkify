import type { Auth } from "@perkify/auth";
import type { Database } from "@perkify/db";

export type Session = Awaited<ReturnType<Auth["api"]["getSession"]>>;

export interface Context {
  session: Session;
  db: Database;
}
