// @ts-check
/// <reference types="node" />
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import importHelpers from "eslint-plugin-import-helpers";
import jsxA11y from "eslint-plugin-jsx-a11y";
import noRelativeImportPaths from "eslint-plugin-no-relative-import-paths";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

// `eslint-config-prettier` exports rule values typed as plain `string`
// which clashes with `typescript-eslint`'s stricter `RuleEntry` union.
// Cast once here so the rest of the config stays clean.
const prettierCompat = /** @type {import("typescript-eslint").ConfigWithExtends} */ (
  /** @type {unknown} */ (prettier)
);

const __dirname = dirname(fileURLToPath(import.meta.url));

// Tailwind color palette names, used in the raw-color-class ban below.
const tailwindColorNames = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "white",
  "black",
].join("|");
const rawColorClassRegex = `\\b(bg|text|border|ring|outline|from|to|via|divide|placeholder|fill|stroke|accent|caret|decoration|shadow)-(${tailwindColorNames})(-\\d{2,3})?\\b`;

export default tseslint.config(
  {
    ignores: [
      "build/**",
      "node_modules/**",
      ".react-router/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "dist/**",
      "prisma/migrations/**",
      "public/mockServiceWorker.js",
      "*.html",
    ],
  },

  // Base configuration for TypeScript/React files
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.es2022,
      },
      parserOptions: {
        // Multiple tsconfigs because app code and `*.server.ts`/server entry
        // live in different projects (client DOM lib vs. Node lib). A single
        // `projectService` can't span them without project references, which
        // we intentionally dropped (see plan).
        project: ["./tsconfig.json", "./tsconfig.server.json", "./tsconfig.node.json"],
        tsconfigRootDir: __dirname,
      },
    },
    settings: {
      react: { version: "detect" },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
      unicorn,
      "import-helpers": importHelpers,
      "no-relative-import-paths": noRelativeImportPaths,
    },
    rules: {
      // React
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "react-refresh/only-export-components": ["off"],
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",

      // TypeScript
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-import-type-side-effects": "error",

      // Imports
      "import-helpers/order-imports": [
        "error",
        {
          newlinesBetween: "always",
          groups: ["/^react/", "module", "/^#app\\//", ["parent", "sibling", "index"]],
          alphabetize: { order: "asc", ignoreCase: true },
        },
      ],
      "no-relative-import-paths/no-relative-import-paths": [
        "error",
        {
          allowSameFolder: true,
          rootDir: "app",
          prefix: "#app",
        },
      ],

      // Unicorn
      ...unicorn.configs.recommended.rules,
      "unicorn/no-null": "off",
      "unicorn/prevent-abbreviations": "off",
      "unicorn/prefer-query-selector": "off",
      "unicorn/no-useless-undefined": "off",
      "unicorn/prefer-module": "off",
      "unicorn/prefer-top-level-await": "off",
      "unicorn/explicit-length-check": "off",

      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },

  // Ban raw Tailwind color classes inside our components so dark mode stays
  // a single token flip. Scoped to folders we own - `app/components/ui/**`
  // is shadcn-vendored code we edit sparingly, so it gets its own override
  // below. Server utils + routes can still use raw colours when needed.
  {
    files: ["app/components/**/*.{ts,tsx}"],
    ignores: ["app/components/ui/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/${rawColorClassRegex}/]`,
          message:
            "Use semantic color tokens (bg-background, text-foreground, etc.) instead of raw Tailwind color classes in components.",
        },
        {
          selector: `TemplateElement[value.raw=/${rawColorClassRegex}/]`,
          message:
            "Use semantic color tokens (bg-background, text-foreground, etc.) instead of raw Tailwind color classes in components.",
        },
      ],
    },
  },

  // Route files: RR v7 flat routes use dot + dollar filenames
  {
    files: ["app/routes/**/*.{ts,tsx}"],
    rules: {
      "unicorn/filename-case": "off",
    },
  },

  // Client code runs in the browser — add DOM globals only here so
  // server files don't silently accept `window`, `document`, etc.
  {
    files: ["app/**/*.{ts,tsx}"],
    ignores: ["app/**/*.server.ts", "app/**/*.server.tsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // Server code runs in Node.
  {
    files: ["server/**/*.ts", "app/**/*.server.ts", "app/**/*.server.tsx", "prisma/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // False-positives on patterns like `const x = arg ?? "default"` where
      // we explicitly want the union type to stay nullable in the signature.
      "unicorn/prefer-default-parameters": "off",
    },
  },

  // `throw new Response(...)` is React Router's official short-circuit
  // idiom in both loaders/actions (routes) and server utilities. Allow
  // it wherever route/server code runs, plus inside the shared
  // `invariantResponse` wrapper that re-exports the same idiom. Keep
  // the strict default everywhere else so random components can't
  // throw raw strings.
  {
    files: [
      "app/routes/**/*.{ts,tsx}",
      "app/**/*.server.ts",
      "app/**/*.server.tsx",
      "app/lib/invariant.ts",
      "app/lib/intent.tsx",
      "server/**/*.ts",
    ],
    rules: {
      "@typescript-eslint/only-throw-error": ["error", { allow: ["Response"] }],
    },
  },

  // Config files - relaxed, no type-checking
  {
    files: ["*.config.{js,ts,mjs}", "eslint.config.js"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "unicorn/prefer-module": "off",
    },
  },

  // Test files
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },

  // CLI + long-running entry scripts (seed, Express server, maintenance
  // helpers) legitimately log status and exit the process on boot failure.
  // Loosen the rules that assume library code.
  {
    files: ["prisma/seed.ts", "server/**/*.ts", "scripts/**/*.{ts,js}"],
    rules: {
      "no-console": "off",
      "unicorn/no-process-exit": "off",
    },
  },

  prettierCompat,
);
