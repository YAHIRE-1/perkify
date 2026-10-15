# Server app

## Overview

This workspace runs the Bun and Hono server. It creates the database and auth instances, serves Better Auth, and exposes the shared oRPC router.

## Key files

| File              | Owns                                 |
| ----------------- | ------------------------------------ |
| `src/index.ts`    | Hono middleware and HTTP routes      |
| `src/services.ts` | Database and auth instances          |
| `src/context.ts`  | Session and database request context |
| `.env.schema`     | Server environment values            |

## Commands

See [package.json](package.json) for available scripts. From the repo root, run one with `pnpm --filter server <script>`. The root [package.json](../../package.json) owns the `auth:generate` script.

## Conventions

- Business procedures belong in `@perkify/api`; this app owns HTTP middleware and service setup.
- The server loads Varlock through `src/env.server.ts`.

## Generated files

- `src/env.ts` comes from `.env.schema`. Edit the schema and run the root `env:generate` script. Review the generated types rather than editing them by hand.
