# Database backups and isolated restores

Local snapshot and restore tooling is available. Production backup storage,
scheduling, retention enforcement, and a restore from that storage are still
pending. TD-001 remains open in the [debt tracker](../exec-plans/tech-debt-tracker.md).

## Local rehearsal

Use Node 24 and the installed repository dependencies. Both commands require
explicit filesystem paths and never read `DATABASE_URL` or `.env`. Keep snapshots
outside the repository: they contain the entire database, including credential
hashes, sessions, private questions, and encrypted Web Push subscriptions.

Create a snapshot from an isolated runtime's database, using the database path
in its manifest:

```bash
npm run db:backup -- --source /absolute/path/runtime.db --destination /absolute/path/new-snapshot
npm run db:restore -- --source /absolute/path/new-snapshot --destination /absolute/path/new-restored.db
```

The destination parent must exist. Backup creates a new private directory with
`database.sqlite` and `manifest.json`; it refuses an existing directory. The
SQLite online backup API includes committed WAL data without copying a live
file by hand. The tool checks integrity, foreign keys, and core application
tables, then records a SHA-256 checksum and timestamp. Snapshot files have mode
0600 and the new directory has mode 0700.

Restore verifies the checksum and database before publishing a standalone file.
It refuses an existing destination or SQLite sidecars. It does not replace a
running database, apply migrations, start the app, or send notifications. Keep
that destination unused until the command completes. The checksum detects
accidental corruption; it does not authenticate a maliciously replaced backup.

For local evidence, run:

```bash
npx vitest run tests/integration/database-snapshots.test.ts
```

The rehearsal preserves a published-content row, credential hash, migration
history, and binary data while later source changes remain independent. It also
checks corrupt backups, missing application tables, file permissions, and
refusal to overwrite files or stale WAL state.

## Production acquisition and retention

Production uses LiteFS. Export through its supported command, then package and
verify that exported SQLite file with `db:backup`. Do not copy `/litefs/data.db`
or volume internals while the application is running. Fly documents
[`litefs export`](https://fly.io/docs/litefs/export/) as safe for a live database
and recommends exporting to off-machine storage in its
[backup guide](https://fly.io/docs/litefs/backup/).

Run on the Machine, writing into a private temporary directory outside the FUSE
mount:

```bash
litefs export -name data.db /absolute/private/directory/export.db
```

The local tooling does not invoke this command or upload anything. The production
job still needs to acquire the export, run `db:backup`, upload both files to a
private destination, fetch them again, and run `db:restore` on the downloaded
copy. Count a backup as successful only after that round trip succeeds. Do not
log file contents or make backup objects public.

The proposed initial policy is one successful backup daily, retaining daily
snapshots for 30 days and a monthly snapshot for 12 months. This targets at most
24 hours of lost writes when jobs succeed. Recovery time remains unmeasured.
Enforce retention at the storage destination after its choice and activation;
local commands deliberately do not delete older snapshots. Keep the latest
verified recovery copy when backup jobs are failing.

Use a scheduler independent of the application process. Fly may suspend the sole
Machine when idle, so an in-process timer cannot guarantee daily backups. The
job must wake or reach the Machine, report failures and backup age, and keep its
storage credentials separate from the web application's privileges. Storage,
scheduler, credentials, and alerts require production setup; none are configured
by this change.

## Recovery rehearsal and production replacement

Before closing TD-001:

1. Download a real backup from the chosen off-machine destination.
2. Run `db:restore` into an unused isolated path and apply migrations required
   by the chosen application version there.
3. Start an isolated application with outbound email and push disabled. Verify
   readiness, a representative public post and image, and admin authentication.
4. Record backup age, application revision, integrity result, and recovery time
   without recording credentials or private content.
5. Repeat quarterly and after migration or storage changes.

A real recovery is a separate authorized operation. Stop application writes and
background work, retain the current database for rollback, and use
[`litefs import`](https://fly.io/docs/litefs/import/) to replace the database
through LiteFS. Never overwrite a live FUSE file directly. Import does not check
integrity itself, which is why the isolated restore must pass first. Account for
sessions and queued notifications restored from the past before reopening
traffic. Confirm readiness and representative content before declaring recovery
complete.
