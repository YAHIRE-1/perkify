import "varlock/auto-load";

import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@perkify/db";
// oxlint-disable-next-line sonarjs/no-wildcard-import
import * as schema from "@perkify/db/schema/auth";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { siwe } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { log } from "evlog";
import { ENV } from "varlock/env";
import {
  createPublicClient,
  http,
  type PublicClient,
} from "viem";
import { arbitrum, arbitrumSepolia, sepolia } from "viem/chains";
import { parseSiweMessage, verifySiweMessage } from "viem/siwe";
import { z } from "zod";

// ─── Constantes ──────────────────────────────────────────────────────────────

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_DAY = 60 * 60 * 24;
const SESSION_EXPIRES_IN_DAYS = 30;
const COOKIE_CACHE_MINUTES = 5;

const RPC_TIMEOUT_MS = 8000;
const RPC_RETRY_COUNT = 1;
const RPC_RETRY_DELAY_MS = 300;

// ─── Chains (SIWE) ───────────────────────────────────────────────────────────

// RPC público por defecto de cada chain, con timeout y reintentos acotados
// para que el POST no quede colgado ~40s.
const rpc = () =>
  http(undefined, {
    retryCount: RPC_RETRY_COUNT,
    retryDelay: RPC_RETRY_DELAY_MS,
    timeout: RPC_TIMEOUT_MS,
  });

const publicClients: Record<string, PublicClient> = {
  "11155111": createPublicClient({ chain: sepolia, transport: rpc() }),
  "421614": createPublicClient({ chain: arbitrumSepolia, transport: rpc() }),
  "42161": createPublicClient({ chain: arbitrum, transport: rpc() }),
};

const walletAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

// ─── Better Auth ─────────────────────────────────────────────────────────────

export function createAuth(
  database: Database,
  extraOrigins: readonly string[] = []
) {
  const isProduction = ENV.NODE_ENV === "production";
  
  console.log("SIWE_DOMAIN =", ENV.SIWE_DOMAIN);
    
  return betterAuth({
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
      },
    },
    baseURL: ENV.BETTER_AUTH_URL,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
    }),
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/siwe/verify") {
          return;
        }

        const newSession = ctx.context.newSession;
        const parsed = walletAddressSchema.safeParse(
          (ctx.body as { walletAddress?: unknown } | undefined)?.walletAddress
        );
        if (!newSession || !parsed.success) {
          return;
        }

        await database
          .update(schema.user)
          .set({ walletAddress: parsed.data.toLowerCase() })
          .where(eq(schema.user.id, newSession.user.id));
      }),
    },
    plugins: [
      siwe({
        anonymous: true,
        domain: ENV.SIWE_DOMAIN,
        getNonce: async () => crypto.randomUUID().replaceAll("-", ""),
        verifyMessage: async ({ message, signature, address }) => {
          const startedAt = Date.now();
          try {
            const parsed = parseSiweMessage(message);

            if (!parsed.chainId) {
              log.error({ action: "siwe.verify", reason: "missing_chain_id" });
              return false;
            }

            const client =
              publicClients[
                parsed.chainId.toString() as keyof typeof publicClients
              ];
            if (!client) {
              log.error({
                action: "siwe.verify",
                chainId: parsed.chainId,
                reason: "unsupported_chain",
              });
              return false;
            }

            const ok = await verifySiweMessage(client, {
              address: address as `0x${string}`,
              domain: ENV.SIWE_DOMAIN,
              message,
              signature: signature as `0x${string}`,
            });

            log.info({
              action: "siwe.verify",
              chainId: parsed.chainId,
              ms: Date.now() - startedAt,
              ok,
            });

            if (!ok) {
              log.warn({
                action: "siwe.verify",
                address,
                expectedDomain: ENV.SIWE_DOMAIN,
                messageAddress: parsed.address,
                messageDomain: parsed.domain,
                reason: "verification_failed",
              });
            }
            return ok;
          } catch (error) {
            log.error({
              action: "siwe.verify",
              error: error instanceof Error ? error.message : String(error),
              ms: Date.now() - startedAt,
              reason: "exception",
            });
            return false;
          }
        },
      }),
    ],
    rateLimit: {
      customRules: {
        "/siwe/nonce": { max: 10, window: 60 },
        "/siwe/verify": { max: 5, window: 60 },
      },
      enabled: true,
    },
    secret: ENV.BETTER_AUTH_SECRET,
    session: {
      cookieCache: {
        enabled: true,
        maxAge: COOKIE_CACHE_MINUTES * SECONDS_PER_MINUTE,
      },
      expiresIn: SECONDS_PER_DAY * SESSION_EXPIRES_IN_DAYS,
      updateAge: SECONDS_PER_DAY,
    },
    trustedOrigins: [ENV.CORS_ORIGIN, ...extraOrigins],
    user: {
      additionalFields: {
        avatarUrl: { required: false, type: "string" },
        bio: { required: false, type: "string" },
        role: { defaultValue: "hunter", type: "string" },
        walletAddress: {
          input: false, // el cliente no puede escribirla
          required: false, // nullable en la BD
          type: "string",
        },
      },
    },
  });
}

export { APIError } from "better-auth";

export type Auth = ReturnType<typeof createAuth>;

export type Session = Auth["$Infer"]["Session"];