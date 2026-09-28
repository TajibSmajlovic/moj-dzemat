---
name: moj-dzemat-verification
description: Use when choosing or running checks for Moj Džemat changes, including final verification, browser tests, or garbage-collection reports.
user-invocable: false
metadata:
  internal: true
---

# Verification

Use focused checks while iterating, then run the authoritative command:

```bash
npm run agent:verify
```

Useful focused commands:

```bash
npm run architecture:check
npm run docs:check
npm run check
npm run check:staged
npm run check:push
npm run knip
npm run test:run
npm run agent:smoke
npm run test:e2e
npm run test:pwa
```

Pre-commit checks staged formatting and lint plus repository documentation and
architecture. Pre-push runs full static checks, Knip, and unit/integration tests.
`agent:verify` starts those checks, Storybook, runtime smoke, E2E, and production
PWA checks together. Run only one verification workflow per checkout; use separate
worktrees for simultaneous workflows. See the
[testing guide](../../../docs/development/testing.md) for Git hook behavior, test
selection, parallel verification, isolation, and failure artifacts.

`npm run agent:gc` is report-only. It checks documentation, architecture,
unused code, and abandoned runtime state without deleting or rewriting files.
