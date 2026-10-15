# API package

## Overview

This package defines the oRPC procedures shared by the server and web app. Its context carries the current session and database.

## Key files

| File                   | Owns                                    |
| ---------------------- | --------------------------------------- |
| `src/index.ts`         | Public and protected procedure builders |
| `src/context.ts`       | Context type                            |
| `src/routers/index.ts` | App router and client types             |

## Commands

See [package.json](package.json) for available scripts. From the repo root, run one with `pnpm --filter @perkify/api <script>`.

## Conventions

- Use `publicProcedure` for an open endpoint and `protectedProcedure` when a session is required.
- The server creates request context. This package consumes its typed session and database values.
