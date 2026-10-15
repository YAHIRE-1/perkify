import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { siwe } from "better-auth/plugins";
import { createPublicClient, http } from "viem";
import { arbitrum, arbitrumSepolia } from "viem/chains";
import { verifySiweMessage, parseSiweMessage } from "viem/siwe";
export function createAuth(env, db) {
    const publicClients = {
        "42161": createPublicClient({ chain: arbitrum, transport: http() }),
        "421614": createPublicClient({ chain: arbitrumSepolia, transport: http() }),
    };
    return betterAuth({
        database: drizzleAdapter(db, { provider: "pg", usePlural: false }),
        secret: env.BETTER_AUTH_SECRET,
        baseURL: env.BETTER_AUTH_URL,
        trustedOrigins: [env.WEB_URL],
        user: {
            additionalFields: {
                role: { type: "string", defaultValue: "hunter" },
                bio: { type: "string", required: false },
                avatarUrl: { type: "string", required: false },
            },
        },
        plugins: [
            siwe({
                domain: env.SIWE_DOMAIN,
                anonymous: true,
                getNonce: async () => crypto.randomUUID().replace(/-/g, ""),
                verifyMessage: async ({ message, signature, address }) => {
                    try {
                        const parsed = parseSiweMessage(message);
                        if (!parsed.chainId)
                            return false;
                        const client = publicClients[parsed.chainId.toString()];
                        if (!client)
                            return false;
                        return await verifySiweMessage(client, {
                            message,
                            signature: signature,
                            address: address,
                            domain: env.SIWE_DOMAIN,
                        });
                    }
                    catch (e) {
                        console.error("SIWE verify error:", e);
                        return false;
                    }
                },
            }),
        ],
    });
}
