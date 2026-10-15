import { createAuth } from "./index";

export const auth = createAuth(
  {
    BETTER_AUTH_SECRET: "x".repeat(32),
    BETTER_AUTH_URL: "http://localhost:3004",
    WEB_URL: "http://localhost:3001",
    SIWE_DOMAIN: "localhost",
  },
  {} as any,
);