import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, siweClient } from "better-auth/client/plugins";
import type { Auth } from "@perkify/auth";

export const authClient = createAuthClient({
  // Sin baseURL: usa el origen actual, por lo que pasa por el rewrite de Next
  plugins: [siweClient(), inferAdditionalFields<Auth>()],
});

export type SessionUser = typeof authClient.$Infer.Session.user;