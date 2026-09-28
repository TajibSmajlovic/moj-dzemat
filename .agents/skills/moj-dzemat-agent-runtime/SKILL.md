---
name: moj-dzemat-agent-runtime
description: Use when starting, inspecting, troubleshooting, or stopping a Moj Džemat local agent runtime, including parallel runtimes.
user-invocable: false
metadata:
  internal: true
---

# Agent runtime

Use the isolated runtime instead of sharing the normal developer database:

```bash
npm run agent:start
```

The command prints a manifest path during startup and a loopback URL when ready.
Wait for the ready message before browser inspection. Pass that exact manifest
to the inspection and cleanup commands:

```bash
npm run agent:logs -- --manifest /path/from/start/manifest.json
npm run agent:stop -- --manifest /path/from/start/manifest.json
```

Each run owns its HTTP and Vite WebSocket port, temporary SQLite database, Vite
cache, process, and structured NDJSON log. Cancelling startup stops the owned
child and cleans its state. Do not kill processes by name or port. The stop
command verifies the runtime identity before terminating anything.

Readiness confirms server and database health, not browser hydration. Follow
[runtime inspection and troubleshooting](../../../docs/development/agent-runtime.md#runtime-inspection-and-troubleshooting)
for first-load Vite errors, browser verification, and sandbox permission failures.

`AGENT_RUN_ID`, `AGENT_LOG_PATH`, and `AGENT_STATE_DIR` are internal runtime
metadata set by `npm run agent:start`. Do not add them to `.env` or configure
them manually.
