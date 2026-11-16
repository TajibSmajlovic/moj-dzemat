# Tech-Debt Tracker

This file tracks deliberately accepted limitations. Each unresolved item has
one entry with a status, evidence and impact, and a verifiable exit condition.
Keep IDs stable and move an item to the resolved section only when verification
proves its exit condition. Accepted items remain unresolved.

## TD-001: Database backup and restore are not verified

**Status:** Open.

**Evidence and impact:** Production persists SQLite on one Fly volume, but the
repository defines no off-machine backup, retention policy, or restore rehearsal.
A volume failure or destructive mutation can cause unrecoverable content loss.
Backup tooling, scripts, and tests were removed from this branch on 2026-09-27;
implementation is deferred at the user's request.

**Exit condition:** Document and automate a backup path, define retention,
restore into an isolated database, and record a successful rehearsal.

## TD-002: Runtime coordination assumes one process

**Status:** Accepted at current scale.

**Evidence and impact:** The current deployment uses one Fly Machine. LiteFS
uses a static lease, while rate limits and announcement/contact caches are
process-local. Web Push delivery claims use database leases, but dispatcher
scheduling remains process-local. Adding Machines without coordination can
produce inconsistent limits and stale reads.

The current Fly traffic path bypasses the configured LiteFS proxy. Multi-Machine
operation has not been verified, and enabling a second Machine alone does not
resolve these limitations.

**Exit condition:** Coordinate LiteFS ownership and share or explicitly partition
process-local state before horizontal scaling:

- Select coordinated LiteFS ownership and route writes to the primary.
- Share rate-limit counters across request-serving processes.
- Add cross-process invalidation or remove announcement/contact caches.
- Assign dispatcher ownership and ensure durable push work progresses through
  Machine suspension and primary changes.
- Verify failover, stale-read behavior, limits, and delivery with multiple live
  processes before enabling additional Machines.

## TD-003: Upstream Prisma dependency warnings

**Status:** Security findings resolved; native-helper deprecation remains
upstream, reviewed on 2026-11-16.

**Evidence and impact:** The `npm audit --json` check on 2026-09-14
reported four high-severity entries in `deepmerge-ts`, `mysql2`, `@prisma/config`,
and `prisma`.

The compatible Prisma 7.10.1 update and dependency refresh cleared these Prisma
findings on 2026-11-15. No Prisma override, downgrade, or release candidate is
used.

The deprecated prebuild-install helper now enters only through Prisma's SQLite
adapter. better-sqlite3 13 removed the helper, but
`@prisma/adapter-better-sqlite3` 7.10.1 and its 8.1.0-dev.12 build still require
`better-sqlite3@^12.6.0`. The application therefore runs on better-sqlite3 12
through the adapter, while the direct better-sqlite3 13 dependency serves the
Prisma CLI's optional peer. Each copy builds its own native binding and needs
its own install-script approval. Prisma closed the upstream deprecation report,
[prisma/orm#29588](https://github.com/prisma/orm/issues/29588), before
better-sqlite3 13 was released. The owner keeps the second copy without an
override until the adapter accepts better-sqlite3 13.

**Exit condition:** A stable adapter release accepts better-sqlite3 13, leaving
one better-sqlite3 copy and no prebuild-install, verified with a clean `npm ci`,
`npm audit`, and the database and browser suites.

## TD-007: Upstream tooling security findings

**Status:** Accepted pending stable upstream fixes, reviewed on 2026-11-15.

**Evidence and impact:** `npm audit --json` reports 14 moderate entries from
three development-tool advisories, including affected parent packages:

- [postcss-selector-parser](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) through Typography.
- [glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) through Storybook's docgen plugin.
- [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249) through docgen, Router fs-routes, TypeScript ESLint, and the accessibility lint plugin.

There are no high or critical findings. `npm audit --omit=dev --json` reports
zero findings; Typography is a build-only development dependency. The reviewed
callers process repository-controlled files and patterns, limiting exposure.
The owner accepts these findings without overrides until stable upstream fixes
are available. The native-helper install deprecation in TD-003 remains a
separate warning.

**Exit condition:** Stable upstream updates remove the findings without
overrides, verified by a clean `npm ci`, both audit commands, and
`npm run agent:verify`.

## Resolved items

The following items are no longer active debt. TD-004 to TD-006 were verified
on 2026-09-14 and TD-008 on 2026-11-16. Their implementation and regression
evidence are linked below.

| ID     | Concern                                  | Verification evidence                                                                      |
| ------ | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| TD-004 | Request body limits                      | [Execution plan](completed/2026-09-13-technical-debt.md#td-004-request-body-limits)        |
| TD-005 | Concurrent password resets               | [Execution plan](completed/2026-09-13-technical-debt.md#td-005-concurrent-password-resets) |
| TD-006 | Password byte limits                     | [Execution plan](completed/2026-09-13-technical-debt.md#td-006-password-byte-limits)       |
| TD-008 | Deprecated React Router view transitions | [Browser regression test](../../tests/e2e/public-section-transitions.spec.ts)              |

## Maintenance

Review this tracker when changing dependencies, authentication, request parsing,
storage, deployment topology, or process coordination. `npm run agent:gc`
validates links and active-plan freshness but does not automatically rewrite this
tracker.
