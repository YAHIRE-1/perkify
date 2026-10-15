import { type BetterAuth } from "better-auth";
import type { PgDatabase } from "drizzle-orm/pg-core";
export interface AuthConfig {
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    WEB_URL: string;
    SIWE_DOMAIN: string;
}
export declare function createAuth(env: AuthConfig, db: PgDatabase<any, any, any>): BetterAuth;
export type Auth = ReturnType<typeof createAuth>;
//# sourceMappingURL=index.d.ts.map