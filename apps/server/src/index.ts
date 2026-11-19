import { serve } from "@hono/node-server";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { appRouter } from "@perkify/api/routers/index";
import { deliverNotificationEmails } from "@perkify/api/lib/notification-mail";
import { processQuestDisputes } from "@perkify/api/lib/quest-dispute";
import { processQuestRefunds } from "@perkify/api/lib/quest-refund";
import { initLogger } from "evlog";
import { createAuthMiddleware } from "evlog/better-auth";
import type { BetterAuthInstance } from "evlog/better-auth";
import { createFsDrain } from "evlog/fs";
import { evlog } from "evlog/hono";
import type { EvlogVariables } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import "varlock/auto-load";

import { createContext } from "./context";
import { ENV } from "./env";
import { notificationMailer } from "./notification-mailer";
import { auth, db, getPublicClient } from "./services";

initLogger({
  env: { service: "perkify-server" },
});

// SAFETY: auth is created by Better Auth and implements the evlog BetterAuthInstance contract.
const identifyUser = createAuthMiddleware(auth as BetterAuthInstance, {
  exclude: ["/api/auth/**"],
  maskEmail: true,
});

const app = new Hono<EvlogVariables>();

function handleError<T>(error: T) {
  console.error(error);
}

app.use(
  evlog({
    drain: process.env.NODE_ENV === "production" ? undefined : createFsDrain(),
  })
);

app.use("*", async (c, next) => {
  await identifyUser(c.get("log"), c.req.raw.headers, c.req.path);

  return next();
});

app.use(
  "/*",
  cors({
    origin: ENV.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [onError(handleError)],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [onError(handleError)],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  return next();
});

app.get("/", (c) => c.text("OK"));

const port = Number(process.env.PORT ?? 3002);

function startNotificationWorker(send: NonNullable<typeof notificationMailer>) {
  let sending = false;
  setInterval(async () => {
    if (sending) return;
    sending = true;
    try {
      await deliverNotificationEmails(db, ENV.CORS_ORIGIN, send);
    } catch (error) {
      console.error("Notification email worker failed", error instanceof Error ? error.name : "Unknown error");
    } finally {
      sending = false;
    }
  }, 30_000).unref();
}

if (notificationMailer) startNotificationWorker(notificationMailer);

let checkingEscrows = false;
setInterval(async () => {
  if (checkingEscrows) return;
  checkingEscrows = true;
  try {
    const checks = await Promise.allSettled([
      processQuestRefunds({ db, getPublicClient }),
      processQuestDisputes({ db, getPublicClient, disputeArbiterKey: ENV.ARBITER_KEY }),
    ]);
    for (const result of checks) {
      if (result.status === "rejected") {
        console.error("Quest escrow check failed", result.reason instanceof Error ? result.reason.name : "Unknown error");
      }
    }
  } finally {
    checkingEscrows = false;
  }
}, 15_000).unref();

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`Server listening on port ${info.port}`);
});
