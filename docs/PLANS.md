# Execution Plans

Execution plans are durable state for work that cannot be safely reconstructed
from one task conversation. They record what is true, what remains, and how the
result was verified. A plan is not permission to deploy, mutate external
systems, stage, or commit.

## When to create a plan

Create a checked-in plan when work:

- spans multiple agent sessions or handoffs;
- changes data, migrations, deployment, security, or recovery behavior;
- has multiple dependent milestones or a meaningful rollback path; or
- needs decisions and unexpected findings preserved for later work.

Small, atomic changes do not need a plan.

## Location and naming

- Active: `docs/exec-plans/active/YYYY-MM-DD-short-name.md`
- Completed: `docs/exec-plans/completed/YYYY-MM-DD-short-name.md`
- Known debt: `docs/exec-plans/tech-debt-tracker.md`

Create the `active/` directory only when an active plan exists. Empty
directories and placeholder plans are not retained.

## Required active-plan shape

Start every active plan with:

```text
# Concrete objective

Status: active
Updated: YYYY-MM-DD
Owner: person or agent role
```

Then record acceptance criteria, verified starting state, milestones with
current status, decisions and reasons, unexpected findings, validation
evidence, recovery, and remaining work. Use facts and exact commands. Do not
copy a task transcript.

Update `Updated` after every meaningful work session. `npm run agent:gc` reports
an active plan when the date is missing or invalid, or when it is more than 14
calendar days old.

## Completing a plan

When every acceptance criterion has evidence:

1. Set `Status: completed` and refresh `Updated`.
2. Replace milestone state with the actual result.
3. Record exact verification results and remaining limitations.
4. Move the file from `active/` to `completed/` without staging it.
5. Update the tech-debt tracker for accepted limitations that still require
   future work.

Do not mark a plan complete because time or context ran out.

## Completed plans

- [Agent knowledge system](exec-plans/completed/2026-08-16-agent-knowledge-system.md)
