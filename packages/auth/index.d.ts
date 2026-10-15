import type { PgDatabase } from "drizzle-orm/pg-core";
export interface AuthConfig {
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    WEB_URL: string;
    SIWE_DOMAIN: string;
}
export declare function createAuth(env: AuthConfig, db: PgDatabase<any, any, any>): import("better-auth").Auth<{
    database: (options: import("better-auth").BetterAuthOptions) => import("better-auth").DBAdapter<import("better-auth").BetterAuthOptions>;
    secret: string;
    baseURL: string;
    trustedOrigins: string[];
    user: {
        additionalFields: {
            role: {
                type: "string";
                defaultValue: string;
            };
            bio: {
                type: "string";
                required: false;
            };
            avatarUrl: {
                type: "string";
                required: false;
            };
        };
    };
    plugins: [{
        id: "siwe";
        version: string;
        schema: {
            walletAddress: {
                fields: {
                    userId: {
                        type: "string";
                        references: {
                            model: string;
                            field: string;
                        };
                        required: true;
                        index: true;
                    };
                    address: {
                        type: "string";
                        required: true;
                    };
                    chainId: {
                        type: "number";
                        required: true;
                    };
                    isPrimary: {
                        type: "boolean";
                        defaultValue: false;
                    };
                    createdAt: {
                        type: "date";
                        required: true;
                    };
                };
            };
        };
        endpoints: {
            getSiweNonce: import("better-auth").StrictEndpoint<"/siwe/nonce" | "/siwe/get-nonce", {
                method: "POST";
                body: import("zod").ZodOptional<import("zod").ZodObject<{}, import("zod/v4/core").$strict>>;
            }, {
                nonce: string;
            }>;
            getNonce: import("better-auth").StrictEndpoint<"/siwe/nonce" | "/siwe/get-nonce", {
                method: "POST";
                body: import("zod").ZodOptional<import("zod").ZodObject<{}, import("zod/v4/core").$strict>>;
            }, {
                nonce: string;
            }>;
            verifySiweMessage: import("better-auth").StrictEndpoint<"/siwe/verify", {
                method: "POST";
                body: import("zod").ZodObject<{
                    message: import("zod").ZodString;
                    signature: import("zod").ZodString;
                    email: import("zod").ZodOptional<import("zod").ZodEmail>;
                }, import("zod/v4/core").$strict>;
                requireRequest: true;
            }, {
                token: string;
                success: boolean;
                user: {
                    id: string;
                    walletAddress: string;
                    chainId: number;
                };
            }>;
        };
        options: import("better-auth/plugins").SIWEPluginOptions;
    }];
}>;
export type Auth = ReturnType<typeof createAuth>;
//# sourceMappingURL=index.d.ts.map