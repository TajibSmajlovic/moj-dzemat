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

**Status:** Accepted pending upstream releases.

**Evidence and impact:** The last recorded `npm audit --json` check on 2026-09-14
reported four high-severity entries in `deepmerge-ts`, `mysql2`, `@prisma/config`,
and `prisma`.

Prisma 7.10.0 pins deepmerge-ts 7.1.5 and mysql2 3.15.3, which retain npm audit
findings. The application uses SQLite and a checked-in Prisma configuration;
it does not accept MySQL connections or public configuration objects. This
limits exposure but does not remove the affected dependencies. The SQLite
adapter also retains better-sqlite3 12 and its deprecated prebuild-install helper.

At that check, the npm registry pointed `prisma` at 8.0.0-rc.15, while the SQLite
adapter remained at 7.10.0. That release candidate did not meet this item's
compatible stable update requirement. The audit's suggested Prisma 6 downgrade
was not a compatible upgrade.

Keep these notices visible. Do not add dependency overrides or migrate to a
Prisma release candidate just to clear them.

**Exit condition:** Compatible stable upstream updates remove the findings and
deprecation, verified with a clean `npm ci`,
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
