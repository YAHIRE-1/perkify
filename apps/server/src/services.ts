import { ENV } from "varlock/env";
import { createAuth } from "@perkify/auth";
import { createDb } from "@perkify/db";

export const db = createDb(ENV);

export const auth = createAuth(
  {
    BETTER_AUTH_SECRET: ENV.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: ENV.BETTER_AUTH_URL,
    WEB_URL: ENV.WEB_URL,
    SIWE_DOMAIN: ENV.SIWE_DOMAIN,
  },
  db,
);