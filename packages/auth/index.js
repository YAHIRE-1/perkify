import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { siwe } from "better-auth/plugins";
import { createPublicClient, http } from "viem";
import { arbitrum, arbitrumSepolia } from "viem/chains";
import { verifySiweMessage, parseSiweMessage } from "viem/siwe";
export function createAuth(env, db) {
    const publicClients = {
        ["42161"]: createPublicClient({ chain: arbitrum, transport: http() }),
        ["421614"]: createPublicClient({ chain: arbitrumSepolia, transport: http() }),
    };
    return betterAuth({
        database: drizzleAdapter(db, {
            provider: "pg",
            usePlural: false
        }),
        secret: env.BETTER_AUTH_SECRET,
        baseURL: env.BETTER_AUTH_URL,
        trustedOrigins: [env.WEB_URL],
        user: {
            additionalFields: {
                role: {
                    type: "string",
                    defaultValue: "hunter",
                },
                name: { type: "string" },
                bio: { type: "string" },
                avatarUrl: { type: "string" },
            },
        },
        plugins: [
            siwe({
                domain: env.SIWE_DOMAIN,
                anonymous: true,
                getNonce: async () => {
                    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                },
                verifyMessage: async ({ message, signature, address }) => {
                    try {
                        const parsed = parseSiweMessage(message);
                        if (!parsed.chainId)
                            return false;
                        const chainId = parsed.chainId.toString();
                        const client = publicClients[chainId];
                        if (!client) {
                            return false;
                        }
                        // Standard viem verifySiweMessage call
                        return await verifySiweMessage({
                            address,
                            message,
                            signature,
                        });
                    }
                    catch (e) {
                        return false;
                    }
                },
            }),
        ],
    });
}
