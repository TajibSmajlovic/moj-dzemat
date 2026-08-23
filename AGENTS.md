# Agent Guide

Moj Džemat is a React Router SSR application for public community publishing and
an authenticated administration area. Start here, then follow the linked source
of truth for the part you are changing.

## Repository map

- `app/routes/` owns request coordination, route metadata, and page composition.
- `app/features/` contains vertical product slices such as posts, Q&A, auth,
  announcements, contact, PWA, theme, and web push.
- `app/platform/` contains browser capabilities shared across product features.
- `app/components/` contains reusable UI; `app/components/layout/` is composition.
- `app/lib/` contains browser-safe shared helpers.
- `app/server/` contains shared server infrastructure such as Prisma, environment
  parsing, email, security, and logging.
- `server/` is the Express process entrypoint.
- `prisma/` owns the schema, migrations, and deployment seed.
- `tests/` owns unit, integration, and browser behavior checks.

Read [ARCHITECTURE.md](ARCHITECTURE.md) for the system map and
[docs/architecture/boundaries.md](docs/architecture/boundaries.md) before
changing dependencies between these areas.

## Knowledge map

- Product intent: [docs/PRODUCT_SENSE.md](docs/PRODUCT_SENSE.md)
- Product behavior: [docs/product-specs/index.md](docs/product-specs/index.md)
- Visual and frontend conventions: [docs/DESIGN.md](docs/DESIGN.md) and
  [docs/FRONTEND.md](docs/FRONTEND.md)
- Security and operations: [docs/SECURITY.md](docs/SECURITY.md) and
  [docs/RELIABILITY.md](docs/RELIABILITY.md)
- Durable decisions: [docs/design-docs/index.md](docs/design-docs/index.md)
- Multi-session work and debt: [docs/PLANS.md](docs/PLANS.md) and
  [docs/exec-plans/tech-debt-tracker.md](docs/exec-plans/tech-debt-tracker.md)

## Toolchain

- Node 24.x and npm 11.18.0
- React 19, React Router 8, Express 5
- Prisma 7 with SQLite
- Vitest and Playwright

Use `npm ci` for a clean dependency install. Copy `.env.example` to `.env` for
the normal developer server. Never expose environment values in output, logs,
fixtures, or committed files.

## Agent runtime

Use the isolated runtime instead of sharing the normal developer database:

```bash
npm run agent:start
```

The command prints a manifest path and a loopback URL. Pass that exact manifest
to the inspection and cleanup commands:

```bash
npm run agent:logs -- --manifest /path/from/start/manifest.json
npm run agent:stop -- --manifest /path/from/start/manifest.json
```

Each run owns its port, temporary SQLite database, Vite cache, process, and
structured NDJSON log. Do not kill processes by name or port. The stop command
verifies the runtime identity before terminating anything.

`AGENT_RUN_ID`, `AGENT_LOG_PATH`, and `AGENT_STATE_DIR` are internal runtime
metadata set by `npm run agent:start`. Do not add them to `.env` or configure
them manually.

For parallel code changes, use one Git worktree per task and one runtime per
worktree. Multiple runtimes can execute in one worktree, but builds still share
the checkout's `build/` directory.

## Verification

Use focused checks while iterating, then run the authoritative command:

```bash
npm run agent:verify
```

Useful focused commands:

```bash
npm run architecture:check
npm run docs:check
npm run check
npm run knip
npm run test:run
npm run test:e2e
npm run test:pwa
```

`npm run agent:gc` is report-only. It checks documentation, architecture,
unused code, and abandoned runtime state without deleting or rewriting files.

## Non-negotiable rules

- Treat rendered behavior and executable tests as the source of truth.
- Reproduce user-visible bugs through the closest browser path before fixing.
- Keep feature internals private. Use a named public contract or route-level
  composition for legitimate cross-feature behavior.
- Browser-capable components must not runtime-import `.server` modules.
- Keep shared foundations independent of product features and route composition.
- Validate input at request, environment, storage, and external-service boundaries.
- Preserve structured log redaction. Never log credentials, tokens, cookies,
  reset links, raw personal data, or secret environment values.
- Add Prisma migrations for schema changes. Do not hand-edit generated Prisma or
  React Router output.
- Do not weaken checks, reuse an unidentified server, or introduce a baseline of
  unexplained architecture exceptions.
- Do not stage, commit, push, deploy, or change external systems unless the user
  explicitly requests it.

## Change routing

- Product behavior belongs to the owning feature and route.
- Generic UI belongs in `app/components/` only when it has no product ownership.
- Cross-cutting browser behavior belongs in `app/platform/`.
- Shared server infrastructure belongs in `app/server/` only when it has no
  feature ownership.
- A cross-feature dependency must enter through the exact public contract listed
  in the architecture rules.

For local setup, test selection, environment behavior, and pull request guidance,
read [CONTRIBUTING.md](CONTRIBUTING.md). For PWA recovery and Web Push operations,
read [docs/design-docs/pwa-runtime-and-recovery.md](docs/design-docs/pwa-runtime-and-recovery.md)
and [docs/design-docs/web-push.md](docs/design-docs/web-push.md).
