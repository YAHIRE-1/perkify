# Verification by change

Use the commands defined in the root and workspace `package.json` files. Choose the checks that cover the changed behavior.

For database schema changes, do not generate or apply migrations and do not run `db:push`. Finish the schema change and its type checks, then leave migration generation or `db:push` to the user.

| Change | Verification |
| --- | --- |
| Markdown instructions or docs | Check relative links and run `pnpm exec oxfmt --check <changed.md>` on changed files. No code build is needed for prose alone. |
| TypeScript or JavaScript logic | Run `pnpm run check` and `pnpm run check-types`. |
| Web routes or UI | Run the code checks above and `pnpm --filter web build` to check route generation and bundling. |
| An app or database `.env.schema` | Run `pnpm run env:generate`, review generated types, then run `pnpm run check-types`. |
| Auth plugins or schema options | Run `pnpm run auth:generate`, review changes to `packages/db/src/schema/auth.ts`, then run `pnpm run check-types`. |
| Database tables or relations | Run `pnpm run check-types`. The user decides whether to generate migrations or run `db:push`. |

There is no test script or test runner configured in the current workspace manifests. If one is added, use its script for behavior changes and record its scope here.

Do not create or add tests unless the user explicitly asks for them.
