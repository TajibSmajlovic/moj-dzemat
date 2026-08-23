# Tech-Debt Tracker

This file tracks specific limitations with current evidence and a clear exit
condition. Add an item when work deliberately accepts a limitation. Remove it
only when verification proves the exit condition.

| ID     | Concern                                      | Evidence and impact                                                                                                                                                                                                                                                                   | Exit condition                                                                                                               | Status                    |
| ------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| TD-001 | Database backup and restore are not verified | Production persists SQLite on one Fly volume, but the repository defines no off-machine backup, retention policy, or restore rehearsal. A volume failure or destructive mutation can cause unrecoverable content loss.                                                                | Document and automate a backup path, define retention, restore into an isolated database, and record a successful rehearsal. | Open                      |
| TD-002 | Runtime coordination assumes one process     | LiteFS uses a static lease, while rate limits and announcement/contact caches are process-local. Web Push delivery claims use database leases, but dispatcher scheduling remains process-local. Adding Machines without coordination can produce inconsistent limits and stale reads. | Coordinate LiteFS ownership and share or explicitly partition process-local state before horizontal scaling.                 | Accepted at current scale |

Review this table when changing storage, deployment topology, or process
coordination. `npm run agent:gc` validates links and active-plan freshness but
does not automatically rewrite this tracker.
