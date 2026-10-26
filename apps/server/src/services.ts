import { createAuth } from "@perkify/auth";
import { createDb } from "@perkify/db";
import { ENV } from "varlock/env";

export const db = createDb(ENV);

export const auth = createAuth(db);