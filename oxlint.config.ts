import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import tanstack from "ultracite/oxlint/tanstack";
import tanstackJsPlugins from "ultracite/oxlint/tanstack/js-plugins";

const jsPlugins = selectJsPlugins(["github", "sonarjs", "react-doctor"]);

export default defineConfig({
  extends: [core, react, tanstack, tanstackJsPlugins, shadcn, jsPlugins],
  ignorePatterns: [
    // oxlint-disable-next-line typescript/no-non-null-assertion
    ...core.ignorePatterns!,
    "packages/ui/**",
    "packages/db/src/migrations/**",
    ".agents/skills/**",
    ".claude/skills/**",
    "tools/oxlint/anti-slop/**",
  ],
  jsPlugins: [
    // oxlint-disable-next-line typescript/no-non-null-assertion
    ...jsPlugins.jsPlugins!,
    // oxlint-disable-next-line typescript/no-non-null-assertion
    ...shadcn.jsPlugins!,
    { name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" },
  ],
  settings: jsPluginSettings,
  overrides: [
    {
      files: ["packages/db/src/index.ts", "packages/db/src/schema/index.ts"],
      rules: {
        "oxc/no-barrel-file": "off",
        "sonarjs/no-wildcard-import": "off",
      },
    },
    {
      files: ["packages/db/src/schema/**/*.ts"],
      rules: {
        "sort-keys": "off",
      },
    },
    {
      files: ["apps/web/src/routes/**/*.{ts,tsx}"],
      rules: {
        "func-style": "off",
        "github/filenames-match-regex": "off",
        "sonarjs/function-name": "off",
      },
    },
    {
      files: ["apps/web/src/components/**/*.{ts,tsx}"],
      rules: {
        "func-style": "off",
      },
    },
  ],
  rules: {
    "oxc/no-accumulating-spread": "error",
    "anti-slop/no-array-filter-map": "error",
    "anti-slop/no-reduce-accumulator-copy": "error",
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    // Type predicates are the named-boundary pattern; no other way to write the check.
    "anti-slop/no-runtime-typeof": ["error", { allowInTypeGuards: true }],
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-readable-spacing": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
    // Core rules that fight anti-slop (fix/break loops, contradictory advice).
    "typescript/consistent-indexed-object-style": "off",
    "unicorn/no-immediate-mutation": "off",
    "unicorn/prefer-reflect-apply": "off",
    "func-style": ["error", "declaration"],
    "react/function-component-definition": [
      "error",
      {
        namedComponents: "function-declaration",
        unnamedComponents: "function-expression",
      },
    ],
  },
});
