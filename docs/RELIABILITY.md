# Reliability

Moj Džemat runs as one Fly.io Machine with one Node.js process and one SQLite
database mounted through LiteFS. This is a deliberate low-complexity topology,
not a horizontally scalable design.

## Runtime topology

```text
Fly proxy
  -> LiteFS proxy and FUSE mount
  -> Express and React Router
  -> Prisma with better-sqlite3
  -> SQLite data.db on the Fly volume
```

The static LiteFS lease, process-local caches and rate limits, and in-process
Web Push dispatcher all assume a single application process. Before adding a
second Machine or region, replace or coordinate those state owners.

## Startup and shutdown

Production startup is intentionally fail-fast:

1. LiteFS mounts the database filesystem.
2. `start.sh` applies committed Prisma migrations.
3. The idempotent seed ensures configured admin accounts exist.
4. Node starts the built Express server.
5. Invalid environment configuration or missing build output stops startup.

Express handles `SIGTERM` and `SIGINT`, stops accepting new requests, logs the
shutdown result, and exits. Fly allows 30 seconds before forced termination.

## Health and traffic

- `/resources/healthcheck` is a shallow liveness probe for Express.
- `/resources/readiness` runs `SELECT 1` and returns `503` when the database is
  unavailable. Fly routes traffic using this readiness check.
- Both probes disable caching. Routine probe requests are excluded from normal
  completion logs to reduce noise.
- Production redirects non-canonical hosts with `308` while leaving health
  checks reachable.

Do not replace readiness with a process-only check. The application cannot serve
correct content when SQLite is unavailable.

## Failure isolation and recovery

- A failed post media write rolls back the full Prisma transaction.
- Post publication commits independently of Web Push delivery. Durable
  notification and delivery rows drive bounded retries without rolling back a
  published post.
- Web Push can be paused with `WEB_PUSH_ENABLED=false`; retry, rotation, and
  incident procedures live in [the Web Push guide](design-docs/web-push.md).
- The service worker is an optional enhancement. Normal routing remains
  network-first, and the dedicated cleanup-worker procedure lives in
  [the PWA recovery guide](design-docs/pwa-runtime-and-recovery.md).
- Agent and E2E runtimes own separate ports, SQLite files, caches, logs, and
  manifests so a failed run does not mutate the normal developer database.

## Observability

Pino emits structured JSON with request ids, operation ids, status, duration,
and explicit startup, shutdown, publication, delivery, and failure events.
Sensitive fields are centrally redacted. The isolated agent runtime writes an
NDJSON log and `npm run agent:logs` filters the exact run or request.

There are no application metrics, traces, formal service-level objectives, or
automated alert policies today. Add them when production evidence shows which
signals and thresholds are actionable, not as speculative infrastructure.

## Data durability

Prisma migrations and `prisma/schema.prisma` own database evolution. Production
uses a persistent Fly volume through LiteFS. A volume is not a complete backup
strategy: the repository currently has no verified backup, off-machine
retention, or restore rehearsal. Treat changes that can corrupt or delete
content as high risk until that gap is closed in
[the tech-debt tracker](exec-plans/tech-debt-tracker.md).

## Operational validation

Before a normal deployment:

1. Run `npm run agent:verify`.
2. Review schema migrations, environment changes, and rollback implications.
3. Follow the PWA checklist when service-worker or offline behavior changed.
4. Follow the Web Push rollout checklist when notification behavior or keys
   changed.
5. After deployment, confirm readiness and one representative public read.

Deployment and external configuration changes require explicit user approval.
Local maintenance remains report-only through `npm run agent:gc`.
