import { createAuthClient } from "better-auth/react";
import { siweClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002",
  plugins: [siweClient()],
});