# Shared config package

## Overview

This workspace holds shared TypeScript settings. The server and shared packages extend its base config; the web app has its own TypeScript config.

## Key files

| File                 | Owns                    |
| -------------------- | ----------------------- |
| `tsconfig.base.json` | Shared compiler options |

## Conventions

- Put TypeScript rules that apply across workspaces in `tsconfig.base.json`. The root [package.json](../../package.json) owns the `check-types` command used to check the result.
