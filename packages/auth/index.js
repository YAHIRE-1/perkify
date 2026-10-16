import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { siwe } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { createPublicClient, http } from "viem";
import { arbitrum, arbitrumSepolia, sepolia } from "viem/chains";
import { verifySiweMessage, parseSiweMessage } from "viem/siwe";
import * as schema from "@perkify/db";
// RPC público por defecto de cada chain (sin API key), pero con timeout y
// reintentos acotados para que el POST no quede colgado ~40s.
const rpc = () => http(undefined, { timeout: 8_000, retryCount: 1, retryDelay: 300 });
export function createAuth(env, db) {
    const publicClients = {
        "42161": createPublicClient({ chain: arbitrum, transport: rpc() }),
        "421614": createPublicClient({ chain: arbitrumSepolia, transport: rpc() }),
        "11155111": createPublicClient({ chain: sepolia, transport: rpc() }),
    };
    return betterAuth({
        database: drizzleAdapter(db, {
            provider: "pg",
            usePlural: false,
            schema,
        }),
        secret: env.BETTER_AUTH_SECRET,
        baseURL: env.BETTER_AUTH_URL,
        trustedOrigins: [env.WEB_URL],
        user: {
            additionalFields: {
                role: { type: "string", defaultValue: "hunter" },
                bio: { type: "string", required: false },
                avatarUrl: { type: "string", required: false },
                walletAddress: {
                    type: "string",
                    required: false, // nullable en la BD
                    input: false, // el cliente no puede escribirla
                },
            },
        },
        hooks: {
            // Después de un login SIWE exitoso, guarda la dirección en user
            after: createAuthMiddleware(async (ctx) => {
                if (ctx.path !== "/siwe/verify")
                    return;
                const newSession = ctx.context.newSession;
                const address = ctx.body
                    ?.walletAddress;
                if (!newSession || !address)
                    return;
                await db
                    .update(schema.user)
                    .set({ walletAddress: address.toLowerCase() })
                    .where(eq(schema.user.id, newSession.user.id));
            }),
        },
        plugins: [
            siwe({
                domain: env.SIWE_DOMAIN,
                anonymous: true,
                getNonce: async () => crypto.randomUUID().replace(/-/g, ""),
                verifyMessage: async ({ message, signature, address }) => {
                    const t = Date.now();
                    try {
                        const parsed = parseSiweMessage(message);
                        if (!parsed.chainId) {
                            console.error("SIWE: mensaje sin chainId");
                            return false;
                        }
                        const client = publicClients[parsed.chainId.toString()];
                        if (!client) {
                            console.error("SIWE: chainId no soportado:", parsed.chainId);
                            return false;
                        }
                        const ok = await verifySiweMessage(client, {
                            message,
                            signature: signature,
                            address: address,
                            domain: env.SIWE_DOMAIN,
                        });
                        console.log("[siwe] verify", {
                            ok,
                            chainId: parsed.chainId,
                            ms: Date.now() - t,
                        });
                        if (!ok) {
                            console.error("SIWE: verificación falló", {
                                messageDomain: parsed.domain,
                                expectedDomain: env.SIWE_DOMAIN,
                                messageAddress: parsed.address,
                                address,
                            });
                        }
                        return ok;
                    }
                    catch (e) {
                        console.error("SIWE verify error:", `${Date.now() - t}ms`, e);
                        return false;
                    }
                },
            }),
        ],
    });
}
