import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, siweClient } from "better-auth/client/plugins";
import type { Auth } from "@perkify/auth";
import { ENV } from "../src/env"; // o como importes tu env

export const authClient = createAuthClient({
  baseURL: ENV.NEXT_PUBLIC_PERKIFY_API_URL,
  fetchOptions: { credentials: "include" },
  plugins: [siweClient(), inferAdditionalFields<Auth>()],
});

export type SessionUser = typeof authClient.$Infer.Session.user;