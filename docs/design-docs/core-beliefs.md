# Core Beliefs

These are repository-specific engineering beliefs already reflected in the
application and harness. They guide choices when more than one implementation
could satisfy a request.

## The rendered behavior is the contract

Tests and documentation should describe what a visitor or editor can observe.
For a bug, reproduce the closest browser path before changing internals. A unit
test can explain the root cause, but it does not replace evidence from the user
path when the behavior is interactive.

## Ownership should be obvious from the import graph

Routes coordinate requests, features own product behavior, platform modules own
cross-cutting browser capabilities, and shared foundations remain independent of
product domains. Legitimate cross-feature behavior uses a narrow public contract
or route composition. These rules are enforced by
[`npm run architecture:check`](../architecture/boundaries.md).

## Durable state comes before best-effort side effects

Content publication must not depend on email or push delivery succeeding. Store
the decision and work durably, commit the user-facing mutation, then execute
bounded side effects with explicit retry and failure states. The Web Push
publication flow is the current example.

## Privacy is a product constraint

Collect and retain only what the feature requires. Anonymous Q&A does not ask
for identity. Offline storage contains public post text only. Push subscriptions
are encrypted and engagement is not tracked. Logs keep diagnostic identifiers
while redacting direct personal data and secrets.

## The baseline works before enhancements

Server-rendered navigation and reading are the baseline. PWA installation,
offline snapshots, Web Push, theme persistence, sharing, and view transitions
must fail without taking the core site with them.

## Operational simplicity must expose its assumptions

One service, one process, and SQLite are good fits for the current scale. That
simplicity is safe only while process-local caches, rate limits, the dispatcher,
and the LiteFS lease remain single-instance. Scaling requires changing those
owners first, not silently adding replicas.

## Agent work needs a closed feedback loop

An agent should be able to find the rules, start an isolated runtime, inspect
structured logs, verify user-visible behavior, run one authoritative command,
and clean only the state it owns. Documentation without mechanical checks, or a
runtime without identity and observability, is incomplete harness work.
