# Agent runtime

Use an isolated runtime for browser inspection without sharing the normal
developer database. Each run owns its loopback port, temporary SQLite database,
Vite cache, process, structured log, and manifest. For the contribution workflow,
start with [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Start, inspect, and stop

```bash
npm run agent:start
```

`npm run agent:start` prints an `AGENT_RUNTIME_MANIFEST` path before waiting for
readiness, then a loopback URL when ready. The manifest's status changes from
`starting` to `ready`; wait for the ready message before browser inspection.
Use the exact manifest path for later commands:

```bash
npm run agent:logs -- --manifest /path/from/start/manifest.json --request-id request-123
npm run agent:stop -- --manifest /path/from/start/manifest.json
```

The manifest contains process and local connection metadata but no secret values.
Use a separate Git worktree for each parallel code change because build output is
still shared within one checkout.

Cancelling startup with `SIGINT` or `SIGTERM`, or reaching the readiness timeout,
stops the owned child before deleting its temporary state. The readiness timeout
defaults to 120 seconds; override it with `--timeout-ms <milliseconds>` when
diagnosing startup. Use `--keep-state-on-failure` with `agent:start`, or
`--keep-state` with `agent:stop`, to preserve evidence. A cleanup failure always
retains state and reports its location.

The stop command verifies runtime identity before terminating its process.
Do not kill processes by name or port.

`AGENT_RUN_ID`, `AGENT_LOG_PATH`, and `AGENT_STATE_DIR` are internal runtime
metadata. Do not add them to `.env` or configure them manually.

## Runtime inspection and troubleshooting

`npm run agent:start` runs the development server with a fresh, isolated Vite
cache. Vite scans root and route entries for dependencies before browser use;
its WebSocket shares the runtime's HTTP port. The ready message means `/resources/healthcheck` and
`/resources/readiness` responded successfully with the expected runtime identity.
It does not confirm that browser dependencies have finished optimizing or that
the page has hydrated.

Follow the available browser tooling's instructions. If no browser integration
is available, use the repository's installed Playwright and record that fallback
in the verification evidence. Temporary inspection scripts and screenshots
belong outside committed source; repeatable regression tests belong in the
existing test suite.

For browser inspection:

1. Open the target route at the printed runtime URL and capture console errors
   and failed requests from the first load.
2. Confirm the expected page content and exercise a relevant control. Successful
   HTTP responses, network idle, or a fixed delay alone do not prove hydration.
   To verify hydration, exercise a control that requires client JavaScript, such
   as theme switching. Native links and the `details` accordion can work before
   hydration.
3. If the first load reports Vite dependency optimization errors, inspect the
   runtime's logs. `npm run agent:logs` reads the structured app log; Vite and
   process output is in `process_log_path` from the same manifest. After
   optimization finishes, reload once and repeat the interaction. Record both
   attempts; a successful reload is diagnostic evidence, not proof that the
   first-load failure is fixed or production is correct.
4. If the error persists, investigate it before accepting the browser result.
   Use the existing build-based `npm run test:e2e` suite for repeatable regression
   checks, and `npm run test:pwa` for production PWA behavior.

Before cleanup, preserve a redacted summary of failures, attempted recovery,
interaction results, and screenshot or trace locations in the active plan or
task handoff. `npm run agent:stop` normally deletes the runtime's logs and
database. Keep unexplained failures marked unresolved even if a reload succeeds;
verifying a cold-start fix requires repeating the failing route sequence in a
fresh isolated runtime. Built-server tests do not exercise Vite optimization.

Execution sandboxes may reject loopback listeners, Chromium startup, or process
signals with errors such as `EPERM` or `Operation not permitted`. Check the failed
operation before treating it as an application failure. Use the execution
environment's permission mechanism for that exact operation, including
`npm run agent:stop` with the original manifest when cleanup needs permission.
Repository instructions do not grant host permissions. If the operation remains
blocked, report the command and reason; do not switch to an unidentified server,
disable checks, or kill processes by name or port.

## Runtime smoke test

`npm run agent:smoke` uses the installed Playwright Chromium and runs as part of
`agent:verify` and CI. It starts two fresh runtimes, exercises public and admin
controls without a recovery reload, checks each Vite connection uses its own
port, correlates a redacted request log, and verifies stop, cancellation, and
readiness-failure cleanup. It uses fictional fixtures and omits external embeds.
Successful runs remove artifacts; failures retain logs, browser evidence, and
screenshots in the printed temporary directory, or `test-results/agent` in CI.

Install Chromium using the [browser setup instructions](testing.md#browser-tests)
before the first smoke run. For full verification, see
[the testing guide](testing.md#full-verification).

## Maintenance

`npm run agent:gc` reports documentation, architecture, unused-code, and stale-runtime
findings. It does not delete or rewrite files.
