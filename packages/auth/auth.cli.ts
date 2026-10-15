import "varlock/auto-load";
import { ENV } from "varlock/env";
import { createAuth } from "./index";

export const auth = createAuth(
  {
    BETTER_AUTH_SECRET: ENV.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: ENV.BETTER_AUTH_URL,
    WEB_URL: ENV.WEB_URL,
    SIWE_DOMAIN: ENV.SIWE_DOMAIN,
  },
  {} as any,
);