# Testing and verification

Use focused checks while iterating, then verify the complete change before
opening a pull request. Contribution and review expectations live in
[CONTRIBUTING.md](../../CONTRIBUTING.md#pull-requests).

## Choosing tests

Choose tests based on the risk of the change:

- Unit tests for pure helpers, formatting, validation, security checks, and small business rules.
- Integration tests for Prisma, server actions, auth behavior, post visibility,
  and database-backed flows.
- Playwright e2e tests for public browsing, admin publishing, auth, routing, SEO,
  uploads, editor flows, and visible UI behavior.

Run `npm run test:e2e` for UI, routing, auth, editor, upload, or admin workflow changes.
Run `npm run test:pwa` for changes to the manifest, service worker, offline
shell, post snapshots, PWA build pipeline, or production PWA asset serving.
Run `npm run test:storybook` for reusable UI and story changes; follow the
[Storybook authoring guide](../../stories/README.md) for fixtures and providers.

For local verification before opening a PR:

```bash
npm run check:push
npm run build
```

For an agent-driven change, use `npm run agent:verify` as the authoritative final
command. It includes the browser suites and a production build.

## Static checks and Git hooks

- Pre-commit runs `npm run check:staged`: ESLint and Prettier inspect staged file
  contents without modifying files, stashing changes, or updating the index.
  They use the checkout's configuration and dependencies. TypeScript files also
  trigger route type generation before typed lint. Documentation and architecture
  checks still inspect the full working tree.
- Pre-push runs `npm run check:push`: full repository formatting, lint, type,
  documentation, architecture, unused-code, and unit/integration checks. Storybook,
  runtime smoke, E2E, and production PWA checks run in `npm run agent:verify` and CI.
- `npm run check`, `npm run check:push`, and `npm run typecheck` generate route types
  first, then run at most two check processes at once. Individual test tools retain
  their own worker settings. A failure stops queued checks and waits for active
  checks to finish; cancellation stops the processes owned by the check runner.

Useful focused checks:

| Command                      | What it checks                                                                |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `npm run check`              | Documentation, architecture, types, ESLint, and Prettier.                     |
| `npm run typecheck`          | TypeScript projects after route type generation.                              |
| `npm run knip`               | Unused files, exports, and dependencies.                                      |
| `npm run architecture:check` | Dependency boundaries, using the TypeScript parser.                           |
| `npm run docs:check`         | Local documentation links, anchors, reachability, and documented npm scripts. |

## Full verification

```bash
npm run agent:verify
```

After preparing temporary source copies, this starts five groups together:
`check:push`, Storybook interaction/accessibility tests, runtime smoke, E2E, and
production PWA tests. E2E and PWA each build their own application while the other
groups run. No group waits for static checks to pass before starting.

Static/unit/integration checks, E2E, and PWA run in separate temporary copies of
the current working files, including staged, unstaged, and non-ignored untracked
changes. Generated Prisma code and local `.env` files are copied too; local
databases and previous build output are excluded. Installed dependencies are
linked, while build output, route types, caches, and test databases remain separate.
Storybook tests and runtime smoke stay in the checkout: they use separate caches,
and only smoke generates route types there. This avoids changing the application's
production build paths or copying the dependency installation.

The command waits for every started group and fails if any group fails. On
cancellation, browser tools and runtime smoke finish shutting down their owned
servers before the temporary source copies are removed. Failed browser runs print
their evidence locations; reports written inside a temporary copy are preserved
under `test-results/verify/`. The source copies, including their `.env` files, are
removed on both success and failure.

Run one verification workflow at a time per checkout. `agent:verify` isolates its
groups for concurrent execution. Individually invoked commands still share
generated types, `build/`, and the integration SQLite database. Use separate
worktrees for simultaneous verification workflows.

## Test commands

| Command                                   | What it does                                                        |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `npm run test:run`                        | Runs the Vitest suite once (unit + integration).                    |
| `npm test -- --run --project unit`        | Runs only unit tests.                                               |
| `npm test -- --run --project integration` | Runs only integration tests.                                        |
| `npm run test:cov`                        | Runs Vitest with coverage.                                          |
| `npm run test:e2e`                        | Runs Playwright end-to-end tests.                                   |
| `npm run test:e2e:ui`                     | Runs Playwright in headed mode.                                     |
| `npm run test:pwa`                        | Runs the isolated production PWA browser suite.                     |
| `npm run test:storybook`                  | Runs Storybook interaction and accessibility checks in both themes. |

## Test layout and fixtures

Keep new tests under `tests/unit`, `tests/integration`, or `tests/e2e` unless
there is a strong reason to colocate a tiny file-specific unit test next to
source code. Group related unit and integration tests in a shallow domain
subfolder such as `tests/unit/pwa` or `tests/integration/pwa`; keep one-off
shared tests at the existing directory root.

Unit and integration tests run through Vitest projects. Use the existing helpers:

- `tests/factories.ts` for database rows when a factory exists.
- `tests/helpers/route.ts` to call loaders and actions, and
  `tests/helpers/action-result.ts` for `data()`/`Response` assertions.
- `tests/helpers/auth.ts` to create an admin session.

E2E fixture definitions are aggregated by `tests/e2e/fixtures/index.ts`.
Global setup reuses shared factories, then seeds a deterministic admin, posts
across all public post types, Q&A rows, one announcement, and important dates.

## Browser tests

Before your first e2e run, install the Playwright browser once:

```bash
npx playwright install chromium
```

On Linux CI or bare Linux machines you may need:

```bash
npx playwright install --with-deps chromium
```

`npm run test:e2e` builds the application, creates a dynamic loopback port and
temporary SQLite database, seeds all browser fixtures, and refuses to reuse an
existing server. Successful runs remove temporary state; failed local runs print
the retained artifact path for diagnosis.
It serves the built artifact under `NODE_ENV=test` and enables
`ENABLE_TEST_ROUTES`, `HONEYPOT_SKIP_MIN_AGE`, and `DISABLE_RATE_LIMITING`.
The main suite blocks service workers; `tests/e2e/pwa` owns that behavior.
This suite omits the static Storybook build; `npm run test:storybook` checks
stories directly and `npm run test:pwa` builds and verifies the deployed catalogue.

`npm run test:pwa` builds the production application, applies migrations to a
temporary SQLite database, seeds deterministic published posts, and runs the
focused Chromium suite in `tests/e2e/pwa` against `npm start`. It uses
production-safe runtime flags. Successful runs remove temporary state; failed
local runs retain it and print its path for diagnosis, just like the main E2E runner.

A successful retry uses a new temporary directory and does not clean a previous
failed run. Preserve useful evidence, then remove only that run's exact retained
directory after confirming its processes have stopped. These test directories
have no agent runtime manifest; `npm run agent:stop` is for `agent:start` runs.

`npm run dev` and `npm run agent:start` use the Vite dev server; its on-demand
dependencies are scanned up front. `npm run agent:smoke` verifies cold public and
editor interactions without recovery reloads. Built-server tests do not cover
Vite optimization. Follow [runtime inspection and troubleshooting](agent-runtime.md#runtime-inspection-and-troubleshooting)
for manual browser checks and [runtime smoke tests](agent-runtime.md#runtime-smoke-test)
for their coverage and artifacts.
