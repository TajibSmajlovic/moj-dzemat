# Resolve actionable technical debt

Status: completed
Updated: 2026-09-14
Owner: Codex

## Acceptance criteria

- Reproduce and fix TD-004, TD-005, and TD-006 with HTTP, database, and browser regressions.
- Prepare backup and isolated restore tooling for TD-001; production storage and activation remain pending at the user's request.
- Recheck TD-003 against compatible stable upstream releases without overrides.
- Assess TD-002 against the current single-Machine topology and document the scaling prerequisites.
- Run `npm run agent:verify` and keep the tracker accurate about unresolved exit conditions.

## Starting state

The working tree was clean on `master`. No PR is associated with this work.
The tracker contains six items. Request limits inspect only Content-Length;
password-reset writes do not compare the verified version; bcrypt inputs have
no byte limit. Production uses one Fly Machine and a static LiteFS lease.

## Milestones

1. Done: reproduced all three security bugs in an isolated runtime.
2. Done: implemented security fixes; focused database and browser regressions passed.
3. Done: prepared and rehearsed local backups and restores.
4. Done: full verification passed and TD-004, TD-005, and TD-006 were removed from the tracker.

## Decisions and findings

- Production backup setup is deferred by explicit user preference. Local tooling and rehearsals are authorized.
- Keep single-process coordination debt open until a deployment topology is selected and verified.
- Browser plugin not available; use installed Playwright for browser reproduction.
- Local listener startup required sandbox escalation; the isolated runtime then started successfully.
- `npm audit --json` still reports four high-severity Prisma-related entries on 2026-09-13.

## Validation evidence

- Before fixes, concurrent resets returned `[302, 302]`; changing a long password's suffix still authenticated; declared/chunked oversized requests returned `413/400`.
- After fixes, unfinished declared and chunked oversized requests both returned 413; concurrent resets returned one 302 and one 400; replay returned 400.
- `npx vitest run tests/integration/auth tests/unit/auth/validate-new-password.server.test.ts`: 61 tests passed.
- `npx vitest run tests/integration/database-snapshots.test.ts`: 4 tests passed, including WAL snapshots, content/credential/blob preservation, and corruption/overwrite rejection.
- `npm run db:backup` and `npm run db:restore` passed on the isolated seeded runtime database. This is synthetic local evidence, not a production recovery rehearsal.
- Manual Playwright reset-form inspection at 1280x900 and 390x844: expected content, validation interaction, no framework overlay or page errors, no visible clipping. Screenshots: `/tmp/moj-password-limit-desktop.png` and `/tmp/moj-password-limit-mobile.png`. Browser plugin unavailable.
- `npm run typecheck` passed. Initial full verification found two formatting issues, now corrected; 204 Storybook tests, runtime smoke, and the new auth browser regressions passed before the credit interruption. No active verification processes remained when work resumed.
- The 2026-09-14 full run passed 574 unit/integration, 204 Storybook, 10 PWA, and 49 of 50 E2E tests. Smoke reproduced a React Router generated-types race (`ENOTEMPTY`) between concurrent dev-server starts; the contact test rendered the saved data but timed out waiting for Google Maps to finish loading.
- Smoke now starts both servers concurrently in separate source directories, preserving isolation checks without shared type generation. Contact assertions remain unchanged while Google Maps is stubbed in all contexts used by that test. Runtime guidance now requires separate worktrees for concurrent runtimes.
- Failure evidence: `/tmp/moj-debt-verify-20260914.log`, `/var/folders/nf/540ksypn6sl49jcdw0pjknf00000gn/T/moj-dzemat-smoke-iCYPR6`, and `/var/folders/nf/540ksypn6sl49jcdw0pjknf00000gn/T/moj-dzemat-e2e-tests-wUTZnA`.
- The next full run passed all 50 E2E tests and repeated the other passing suites. Smoke's copied checkout exposed a 403 for React Router's linked default client entry; Vite now explicitly allows that package directory. This preserves Vite's filesystem restriction while allowing the installed client entry to hydrate.
- Focused `npm run agent:smoke` passed after the Vite fix.
- Final `npm run agent:verify` passed all groups on 2026-09-14 in 95.1 seconds: 574 unit/integration tests, 50 E2E tests, 204 Storybook tests, 10 PWA tests, runtime smoke, and all static checks. Log: `/tmp/moj-debt-verify-complete-20260914.log`.

## TD-004: Request body limits

The HTTP incoming-message guard counts bytes before middleware sees them and
rejects declared and streamed bodies above 20 MiB. Regression tests send
unfinished requests to prove that rejection does not wait for the full body.
The real-server browser suite also verifies ordinary forms and multipart images.

## TD-005: Concurrent password resets

Reset writes compare the verified password timestamp inside the transaction.
First-time setup uses the unique password row. Only the winner revokes sessions;
losers and sequential replays return 400. Integration tests hold both requests
at the asynchronous breach check to force the race, and browser tests exercise
existing and passwordless accounts through the real HTTP entrypoint.

## TD-006: Password byte limits

New-password forms, server validation, and hashing reject inputs over bcrypt's
72-byte limit. ASCII, accented characters, and emoji have boundary coverage.
Login remains compatible with existing long passwords; a browser regression
logs in with a legacy credential and resets it to a valid 72-byte password.

## Recovery and remaining limitations

Changes remain unstaged. No production changes, commits, or deployments are authorized.
All three owned reproduction runtimes were stopped and cleaned using their exact manifests.
No schema migration was needed; password-row timestamps remain the reset-token version.
TD-001 still needs production storage, scheduling, retention enforcement, and a
restore from that destination. TD-002 remains accepted at one Machine. TD-003
still reports four high-severity dependency findings; the 2026-09-14 registry
check found only Prisma 8.0.0-rc.15 beyond stable 7.10.0. No dependency override
or release-candidate migration was introduced.
