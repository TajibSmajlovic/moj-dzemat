# Tech-Debt Tracker

This file tracks specific limitations with current evidence and a clear exit
condition. Add an item when work deliberately accepts a limitation. Remove it
only when verification proves the exit condition.

| ID     | Concern                                      | Evidence and impact                                                                                                                                                                                                                                                                   | Exit condition                                                                                                                   | Status                    |
| ------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| TD-001 | Database backup and restore are not verified | Local snapshot/restore tooling and a synthetic rehearsal now exist. Production still persists SQLite on one Fly volume without configured off-machine storage, scheduling, enforced retention, or a restore from that destination.                                                    | Activate off-machine backups and retention, then restore a downloaded production snapshot in isolation and record the rehearsal. | Open                      |
| TD-002 | Runtime coordination assumes one process     | LiteFS uses a static lease, while rate limits and announcement/contact caches are process-local. Web Push delivery claims use database leases, but dispatcher scheduling remains process-local. Adding Machines without coordination can produce inconsistent limits and stale reads. | Coordinate LiteFS ownership and share or explicitly partition process-local state before horizontal scaling.                     | Accepted at current scale |

Review this tracker when changing dependencies, authentication, request parsing,
storage, deployment topology, or process coordination. `npm run agent:gc`
validates links and active-plan freshness but does not automatically rewrite this
tracker.

## TD-001 implementation status

See [database backups and isolated restores](../development/database-backups.md)
for `db:backup`, `db:restore`, the proposed 30-day daily / 12-month monthly
retention policy, and production activation steps. A local rehearsal on
2026-09-13 preserved content, credentials, binary data, and migration history;
checksum, integrity, foreign-key, corruption, and overwrite checks passed.
Production setup is explicitly deferred by the user. Local snapshots alone do
not protect against loss of the production volume.

## TD-002 scaling prerequisites

This is an accepted constraint of the current one-Machine deployment, not a
verified multi-Machine implementation. Before scaling:

- Select coordinated LiteFS ownership and route writes to the primary.
- Share rate-limit counters across request-serving processes.
- Add cross-process invalidation or remove announcement/contact caches.
- Assign dispatcher ownership and ensure durable push work progresses through
  Machine suspension and primary changes.
- Verify failover, stale-read behavior, limits, and delivery with multiple live
  processes before enabling additional Machines.

The current Fly traffic path bypasses the configured LiteFS proxy. Enabling a
second Machine alone does not solve these requirements. No deployment topology
was changed by this work.

## TD-003: Upstream Prisma dependency warnings

Status: accepted pending upstream releases.

Rechecked with `npm audit --json` on 2026-09-14: four high-severity entries
remain in `deepmerge-ts`, `mysql2`, `@prisma/config`, and `prisma`.

Prisma 7.10.0 pins deepmerge-ts 7.1.5 and mysql2 3.15.3, which retain npm audit
findings. The application uses SQLite and a checked-in Prisma configuration;
it does not accept MySQL connections or public configuration objects. This
limits exposure but does not remove the affected dependencies. The SQLite
adapter also retains better-sqlite3 12 and its deprecated prebuild-install helper.

The npm registry currently points `prisma` at 8.0.0-rc.15, while the SQLite
adapter remains at 7.10.0. That release candidate does not meet this item's
compatible stable update requirement. The audit's suggested Prisma 6 downgrade
is not a compatible upgrade.

Keep these notices visible. Do not add dependency overrides or migrate to a
Prisma release candidate just to clear them. Exit when compatible upstream
updates remove the findings and deprecation, verified with a clean `npm ci`,
`npm audit`, and the database and browser suites.

## Resolved security items

TD-004, TD-005, and TD-006 were verified and removed on 2026-09-14. Their
implementation and regression evidence are recorded in the
[technical debt execution plan](completed/2026-09-13-technical-debt.md).
