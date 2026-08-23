# Complete the agent knowledge system

Status: completed
Updated: 2026-08-16
Owner: repository agents

## Objective

Complete the harness knowledge layer with evidence-backed product, frontend,
design, security, reliability, decision, and planning guidance. Connect every
agent-critical document to navigation and mechanical checks.

## Acceptance criteria

- `AGENTS.md` points to authoritative guidance without duplicating it.
- Product, frontend, design, security, and reliability facts have clear owners.
- Durable decisions and completed multi-session work are discoverable.
- `npm run docs:check` validates every agent-critical document.
- `npm run agent:gc` reports active plans not updated within 14 days.
- The authoritative `npm run agent:verify` command passes.

## Verified starting state

The repository already has an isolated agent runtime, structured per-run logs,
architecture enforcement, a documentation link checker, a report-only
maintenance command, and a full verification entrypoint. Its knowledge layer is
limited to `AGENTS.md`, `ARCHITECTURE.md`, architecture boundaries, and two
operational feature guides.

## Milestones

- Completed: added evidence-backed knowledge documents and indexes.
- Completed: connected root navigation and documentation checks.
- Completed: added report-only stale active-plan detection and focused tests.
- Completed: ran focused and authoritative verification.
- Completed: recorded final evidence and moved this plan to `completed/`.

## Decisions

- Do not mirror an example directory tree without repository evidence.
- Do not create generated schema documentation until a deterministic generator
  and drift check exist. `prisma/schema.prisma` remains authoritative.
- Do not create an LLM reference collection until a concrete external reference
  is needed for recurring work.
- Do not create a quality score until the repository has an agreed measurable
  rubric. Track specific, evidenced debt instead.

## Recovery

All work is documentation and report-only validation. If a check proves too
noisy, remove that check and its claim together rather than weakening an
unrelated gate. No migration, production action, staging, or commit is part of
this plan.

## Unexpected findings

The first full verification attempt reached the E2E runner but the execution
sandbox rejected its loopback listener with `EPERM`. Repeating the same
authoritative command with local loopback permission completed successfully. No
application failure was involved.

## Validation evidence

- `npm run docs:check` passed for every agent-critical document.
- Focused documentation and maintenance tests passed: 2 files, 7 tests.
- `npm run agent:gc` passed and reported no changes.
- `npm run agent:verify` passed outside the loopback-restricted sandbox:
  - static checks, architecture, formatting, lint, types, and Knip passed;
  - 79 Vitest files and 513 unit/integration tests passed;
  - 35 Chromium E2E tests passed;
  - 7 production PWA Chromium tests passed.

## Remaining limitations

Generated schema documentation, external LLM reference snapshots, and a quality
score remain deferred for the reasons above. Current operational limitations
are recorded in the tech-debt tracker. No files were staged, committed, pushed,
or deployed.
