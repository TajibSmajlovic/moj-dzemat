# Architecture

Moj Džemat is one deployable Node.js application with a React Router server
renderer mounted in Express. Public pages, administration, resource routes, and
background web-push work share the same codebase and SQLite database.

## System boundaries

```text
Browser
  -> Express security, request identity, static assets
  -> React Router loaders and actions
  -> feature server modules
  -> Prisma
  -> SQLite through LiteFS in production

Feature events
  -> web-push publication contract
  -> persisted notification and delivery work
  -> bounded in-process dispatcher
  -> browser push services
```

Express owns liveness, security headers, canonical-host redirects, request IDs,
structured request logs, static production assets, and process shutdown. React
Router owns readiness, HTML rendering, route data, mutations, error boundaries,
and resource behavior.

## Source ownership

- `app/routes/` and `app/root.tsx` compose product features for a request.
- `app/features/<name>/` owns one product domain's UI and server behavior.
- `app/platform/` owns reusable browser capabilities such as view transitions.
- `app/components/`, `app/lib/`, and `app/server/` are shared foundations.
- `app/components/layout/` and `server/` are composition boundaries, not generic
  foundations.

The mechanically enforced dependency rules and approved feature contracts live
in [docs/architecture/boundaries.md](docs/architecture/boundaries.md). Run
`npm run architecture:check` after changing imports.

## Product domains

- `posts` owns post authoring, publication state, media, URLs, and public display.
- `qa` owns anonymous question submission, moderation, answers, and public display.
- `auth` owns admin sessions, login, password reset, and authorization context.
- `announcements`, `important-dates`, and `contact` own their public and admin data.
- `pwa` owns installation, service workers, offline post snapshots, and recovery.
- `web-push` owns subscriptions, encrypted delivery state, retries, and dispatch.
- `theme` owns the browser theme preference.

Routes compose multiple domains when a page needs them. A feature does not import
another feature's internal files.

## State and integrations

Prisma and the SQLite schema are the authoritative application state. Uploaded
images are normalized and stored as database blobs. Production runs SQLite
through LiteFS on Fly.io. Resend is the production email adapter, while local
development captures messages in memory. Web push uses configured VAPID keys and
stores encrypted subscription material.

Secrets are parsed at startup by `app/server/env.server.ts` and are never part of
the client bundle or agent runtime manifest. Pino emits structured, redacted JSON
to stdout in normal operation and to a per-run NDJSON file in the isolated agent
runtime.

## Runtime and verification

`npm run agent:start` creates an isolated local database, seed, port, cache, log,
and identity manifest. `npm run agent:stop` verifies that identity before cleanup.
The regular E2E runner also uses a temporary database and dynamic port, and never
reuses an existing server.

`npm run agent:verify` is the authoritative local completion check. CI reuses its
constituent repository commands rather than implementing separate architecture or
documentation policies.

Operational ownership and failure behavior are detailed in
[docs/RELIABILITY.md](docs/RELIABILITY.md). Authentication, untrusted inputs,
secrets, personal data, and browser-storage boundaries are detailed in
[docs/SECURITY.md](docs/SECURITY.md). User-visible domain contracts live in the
[product specification index](docs/product-specs/index.md).

## Known limits

Operational assumptions and recovery gaps are owned by
[docs/RELIABILITY.md](docs/RELIABILITY.md). Accepted limitations and their exit
conditions are tracked in
[docs/exec-plans/tech-debt-tracker.md](docs/exec-plans/tech-debt-tracker.md).
