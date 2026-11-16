// @ts-check
/// <reference types="node" />
import eslintReact from "@eslint-react/eslint-plugin";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import importHelpers from "eslint-plugin-import-helpers";
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import noRelativeImportPaths from "eslint-plugin-no-relative-import-paths";
import reactHooks from "eslint-plugin-react-hooks";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

// `@eslint-react` mirrors the React Compiler rules that `eslint-plugin-react-hooks`
// ships. Keep the React team's plugin as the single source for those rules and
// turn off the copies, using the conflict list that `@eslint-react` maintains.
const reactHooksDuplicates = Object.fromEntries(
  Object.keys(eslintReact.configs["disable-conflict-eslint-plugin-react-hooks"].rules ?? {}).map(
    (rule) => [rule.replace(/^react-hooks\//u, "@eslint-react/"), "off"],
  ),
);

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

export default defineConfig(
  {
    ignores: [
      "build/**",
      "node_modules/**",
      ".react-router/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "dist/**",
      "generated/**",
      "prisma/migrations/**",
    ],
  },

  // Base configuration for TypeScript/React files
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      eslintReact.configs["recommended-type-checked"],
      reactHooks.configs.flat.recommended,
      jsxA11y.configs.recommended,
      unicorn.configs.recommended,
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
        project: [
          "./tsconfig.json",
          "./tsconfig.server.json",
          "./tsconfig.node.json",
          "./tsconfig.worker.json",
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "import-helpers": importHelpers,
      "no-relative-import-paths": noRelativeImportPaths,
    },
    rules: {
      // React
      ...reactHooksDuplicates,
      // Keep the `target="_blank"` guard from the previous React plugin's preset.
      "@eslint-react/dom-no-unsafe-target-blank": "error",
      // Third-party embeds must state what they may do in the page.
      "@eslint-react/dom-no-missing-iframe-sandbox": "error",

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
      // A new member of a union type must get its own `case`, not fall into `default`.
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      // Inside `try`, a returned promise must be awaited, or `catch` never sees its rejection.
      "@typescript-eslint/return-await": ["error", "error-handling-correctness-only"],
      "@typescript-eslint/no-deprecated": "error",

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
      "unicorn/no-null": "off",
      "unicorn/name-replacements": "off",
      "unicorn/no-useless-undefined": "off",
      "unicorn/prefer-top-level-await": "off",
      "unicorn/explicit-length-check": "off",
      // Booleans follow platform naming (`open`, `active`, `disabled`) shared with
      // HTML attributes and Radix props, not forced `is`/`has` prefixes.
      "unicorn/consistent-boolean-name": "off",
      // Documentation comments use the standard JSDoc layout, including one-line
      // `/** … */` comments on fields that editors show on hover.
      "unicorn/no-asterisk-prefix-in-documentation-comments": "off",
      "unicorn/single-line-block-comment-style": "off",
      // Module-level caches, dispatcher state, and test fixtures are deliberate
      // process-local state (see TD-002 in the tech-debt tracker).
      "unicorn/no-top-level-assignment-in-function": "off",
      // Type aliases live at module level next to the code they describe.
      "unicorn/prefer-smaller-scope": "off",
      // Guard clauses stay separate statements. These rules would fold them into
      // ternaries or merge unrelated guards into one long condition.
      "unicorn/prefer-ternary": "off",
      "unicorn/prefer-combined-guards": "off",
      // Inline `.catch(() => fallback)` and entry-point `main().catch(...)` are the
      // house style; try/catch rewrites add code without changing behavior.
      "unicorn/prefer-await": "off",
      // Idiomatic nested calls and loop headers such as
      // `for (const entry of fs.readdirSync(dir, { withFileTypes: true }))`.
      "unicorn/max-nested-calls": "off",
      "unicorn/no-unreadable-for-of-expression": "off",
      // tsconfig `lib` targets ES2022; `Promise.withResolvers()` is ES2024.
      "unicorn/prefer-promise-with-resolvers": "off",

      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      // Callbacks of `filter`, `find`, `some`, `map`, and similar must return a value.
      "array-callback-return": "error",
      // Catches `"${value}"` written in plain quotes instead of a template literal.
      "no-template-curly-in-string": "error",
    },
  },

  // App code renders through React. Raw HTML sinks such as `innerHTML` bypass
  // React's escaping, so each one needs an explained exception.
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      "unicorn/no-unsafe-dom-html": "error",
    },
  },

  // Ban raw Tailwind color classes inside our reusable and feature components
  // so dark mode stays a single token flip. Scoped to component folders we own -
  // `app/components/ui/**` is shadcn-vendored code we edit sparingly, so it gets
  // its own override below. Server modules + routes can still use raw colours
  // when needed.
  {
    files: [
      "app/components/**/*.{ts,tsx}",
      "app/features/**/components/**/*.{ts,tsx}",
      "app/features/**/admin/components/**/*.{ts,tsx}",
    ],
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
    files: ["app/**/*.{ts,tsx}", "stories/**/*.{ts,tsx}", ".storybook/preview.tsx"],
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
    extends: [tseslint.configs.disableTypeChecked, eslintReact.configs["disable-type-checked"]],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Playwright runs `page.evaluate` callbacks in the browser, so browser globals
  // are available inside them even though the spec itself runs in Node.
  {
    files: ["tests/e2e/**/*.ts"],
    rules: {
      "unicorn/isolated-functions": ["error", { overrideGlobals: globals.browser }],
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

  prettier,
);
