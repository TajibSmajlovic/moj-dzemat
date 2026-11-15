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

**Status:** Security findings resolved; native-helper deprecation remains upstream.

**Evidence and impact:** The `npm audit --json` check on 2026-09-14
reported four high-severity entries in `deepmerge-ts`, `mysql2`, `@prisma/config`,
and `prisma`.

The compatible Prisma 7.10.1 update and dependency refresh cleared these findings
on 2026-11-15; the complete `npm audit` reports zero vulnerabilities. No Prisma
override, downgrade, or release candidate is used.

The SQLite adapter still retains better-sqlite3 12 and its deprecated
prebuild-install helper. Keep that notice visible until an upstream adapter
update removes it.

**Exit condition:** A compatible stable adapter update removes the deprecated
helper, verified with a clean `npm ci`,
`npm audit`, and the database and browser suites.

## Resolved items

The following items were verified on 2026-09-14 and are no longer active debt.
Their implementation and regression evidence are linked below.

| ID     | Concern                    | Verification evidence                                                                      |
| ------ | -------------------------- | ------------------------------------------------------------------------------------------ |
| TD-004 | Request body limits        | [Execution plan](completed/2026-09-13-technical-debt.md#td-004-request-body-limits)        |
| TD-005 | Concurrent password resets | [Execution plan](completed/2026-09-13-technical-debt.md#td-005-concurrent-password-resets) |
| TD-006 | Password byte limits       | [Execution plan](completed/2026-09-13-technical-debt.md#td-006-password-byte-limits)       |

## Maintenance

Review this tracker when changing dependencies, authentication, request parsing,
storage, deployment topology, or process coordination. `npm run agent:gc`
validates links and active-plan freshness but does not automatically rewrite this
tracker.
