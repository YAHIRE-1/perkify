# anti-slop provenance

- Source: bundled copy from the `install-anti-slop` agent skill (upstream: https://github.com/dmmulroy/anti-slop).
- Source commit: unknown. The skill does not record the upstream revision.
- Installed: 2026-09-29 via `scripts/install.mjs` to `tools/oxlint/anti-slop/`.
- Deviations: removed the opt-in `effect/` directory (unused). Otherwise unchanged. Repo config sets `no-runtime-typeof` to `allowInTypeGuards: true` and turns off `typescript/consistent-indexed-object-style`, `unicorn/no-immediate-mutation`, `unicorn/prefer-reflect-apply` (same as the previous ultracite preset).
