import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, siweClient } from "better-auth/client/plugins";
import type { Auth } from "@perkify/auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  plugins: [siweClient(), inferAdditionalFields<Auth>()],
});

export type SessionUser = typeof authClient.$Infer.Session.user;