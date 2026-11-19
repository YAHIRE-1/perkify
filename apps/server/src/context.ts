import type { Context as ApiContext } from "@perkify/api/context";
import type { Context as HonoContext } from "hono";

import { auth, db, getPublicClient } from "./services";
import { notificationMailer } from "./notification-mailer";
import { ENV } from "./env";

export interface CreateContextOptions {
  context: HonoContext;
}

export async function createContext({
  context,
}: CreateContextOptions): Promise<ApiContext> {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  return {
    db,
    session,
    getPublicClient,
    notificationMailer,
    disputeArbiterKey: ENV.ARBITER_KEY,
    notificationWebOrigin: ENV.CORS_ORIGIN,
    notificationCodeSecret: ENV.BETTER_AUTH_SECRET,
    questTranslationApiKey: ENV.GOOGLE_TRANSLATE_API_KEY,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
