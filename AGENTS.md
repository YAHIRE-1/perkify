# Perkify Agent Guide

Perkify is a decentralized quest and reward platform. It enables "buyers" to create quests with locked funds (escrow) and "hunters" to complete them for rewards. The system integrates blockchain events for trustless payment and Kleros for decentralized dispute resolution.

- Users: Buyers (Quest creators) and Hunters (Quest completers).
- Core Flow: Quest Creation $\rightarrow$ Funding (Escrow) $\rightarrow$ Claiming $\rightarrow$ Submission $\rightarrow$ Review $\rightarrow$ Payment.
- Blockchain: Arbitrum network, utilizing smart contracts for escrow and payment.
- Dispute Resolution: Integrated with Kleros Escrow V2.

This is a TypeScript monorepo using Turborepo, Bun, and pnpm.

## Architecture
- **Frontend**: `apps/web` (Next.js 14 App Router).
- **Backend**: `apps/server` (Hono + oRPC + Bun).
- **Database**: `packages/db` (Drizzle ORM + PostgreSQL).
- **API Layer**: `packages/api` (oRPC procedures, request context, and Zod validation).
- **Auth**: `packages/auth` (Sign-In with Ethereum - SIWE and Better-Auth).
- **Shared**: `packages/shared` (Shared Zod types and utilities).
- **Contracts**: `packages/contracts` (Blockchain ABIs and constants).

## Tooling & Standards
- **Package Manager**: `pnpm`.
- **Build Pipeline**: Turborepo (`turbo.json`).
- **Code Quality**: Strict TypeScript patterns enforced via `anti-slop` rules.
- **Linting/Formatting**: `oxlint` and `oxfmt`.

## Development Commands
- Build all: `pnpm run build`
- Development: `pnpm run dev`
- Typecheck: `pnpm run typecheck`

## Agent Context Mapping
- **Routes & Procedures**: [web app](apps/web/AGENTS.md) and [API package](packages/api/AGENTS.md).
- **DB Schema & Migrations**: [database](packages/db/AGENTS.md).
- **Auth & SIWE**: [server](apps/server/AGENTS.md) and [auth package](packages/auth/AGENTS.md).
- **Blockchain Logic**: [contracts package](packages/contracts/AGENTS.md) and `apps/server`.

## Verification Process
- Follow the [Verification by change](docs/agents/testing.md) guide.
- Prioritize E2E tests for critical blockchain flows (Funding $\rightarrow$ Release).
