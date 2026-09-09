# Tech-Debt Tracker

This file tracks specific limitations with current evidence and a clear exit
condition. Add an item when work deliberately accepts a limitation. Remove it
only when verification proves the exit condition.

| ID     | Concern                                      | Evidence and impact                                                                                                                                                                                                                                                                   | Exit condition                                                                                                               | Status                    |
| ------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| TD-001 | Database backup and restore are not verified | Production persists SQLite on one Fly volume, but the repository defines no off-machine backup, retention policy, or restore rehearsal. A volume failure or destructive mutation can cause unrecoverable content loss.                                                                | Document and automate a backup path, define retention, restore into an isolated database, and record a successful rehearsal. | Open                      |
| TD-002 | Runtime coordination assumes one process     | LiteFS uses a static lease, while rate limits and announcement/contact caches are process-local. Web Push delivery claims use database leases, but dispatcher scheduling remains process-local. Adding Machines without coordination can produce inconsistent limits and stale reads. | Coordinate LiteFS ownership and share or explicitly partition process-local state before horizontal scaling.                 | Accepted at current scale |

Review this tracker when changing dependencies, authentication, request parsing,
storage, deployment topology, or process coordination. `npm run agent:gc`
validates links and active-plan freshness but does not automatically rewrite this
tracker.

## TD-003: Upstream Prisma dependency warnings

Status: accepted pending upstream releases.

Prisma 7.10.0 pins deepmerge-ts 7.1.5 and mysql2 3.15.3, which retain npm audit
findings. The application uses SQLite and a checked-in Prisma configuration;
it does not accept MySQL connections or public configuration objects. This
limits exposure but does not remove the affected dependencies. The SQLite
adapter also retains better-sqlite3 12 and its deprecated prebuild-install helper.

Keep these notices visible. Do not add dependency overrides or migrate to a
Prisma release candidate just to clear them. Exit when compatible upstream
updates remove the findings and deprecation, verified with a clean `npm ci`,
`npm audit`, and the database and browser suites.

## TD-004: Request body limits rely on Content-Length

Status: open; reproduced locally on 2026-09-09, fix not implemented.

The guard in [`server/index.ts`](../../server/index.ts) rejects a declared body
larger than 20 MiB but does not count bytes received. In an isolated runtime, a
22,020,104-byte login request returned 413 with `Content-Length`; the same body
sent with chunked transfer reached form parsing and returned 400. An oversized
body without a declared length can therefore consume memory before validation.

Exit when the server enforces the limit on actual incoming bytes before buffering
the whole body. Verify declared and chunked oversized requests, valid ordinary
forms, and multipart uploads through the real HTTP entrypoint.

## TD-005: Concurrent password resets can reuse one link

Status: open; reproduced locally on 2026-09-09, fix not implemented.

[`nova-lozinka.$token.tsx`](../../app/routes/nova-lozinka.$token.tsx) verifies the
password-row version before asynchronous password checks and the write
transaction. Two simultaneous submissions with one synthetic account's valid
reset link both returned success redirects; a later sequential replay correctly
returned 400. Competing resets can overwrite one another's password and revoke
the other request's new session. This requires possession of a valid reset link.

Exit when reset consumption and the password write enforce the expected version
atomically, with at most one successful submission for that link. Cover concurrent
requests, sequential replay, and initial password setup for a passwordless account.

## TD-006: Passwords can exceed bcrypt's byte limit

Status: open; reproduced locally on 2026-09-09, fix not implemented.

[`passwordField()`](../../app/lib/form-schema.ts) and the
[authentication helpers](../../app/features/auth/auth.server.ts) do not enforce
bcrypt's 72-byte input limit. The app accepted a reset password longer than 72
UTF-8 bytes, then authenticated a different suffix with the same first 72 bytes.
Characters beyond that prefix do not contribute to the stored credential.

Exit when new passwords cannot be silently truncated, with clear validation and
tests around the 72-byte boundary, including multibyte characters. Account for
existing long-password users before tightening login validation so they retain a
path to authenticate and change their password.
