# Architecture Boundaries

These rules keep feature ownership predictable and make invalid dependency
directions fail with actionable diagnostics. `scripts/checks/architecture.ts`
is the authoritative rule engine.

## Feature isolation

Code in `app/features/<name>/` may use the same feature, shared foundations, and
platform capabilities. It may not import another feature's internals.

Approved cross-feature contracts are deliberately narrow:

- `pwa` may import `app/features/posts/post-contract.ts` for public post types and labels.
- `posts` may import `app/features/web-push/post-publication.server.ts` to record,
  cancel, and dispatch publication notifications.

These contract files are stable feature entry points, not separate business logic.
Consumers import them instead of reaching into another feature's internal modules.

When another connection is legitimate, expose a named contract owned by the
target feature or compose the features from a route. Move code to a shared area
only when it is genuinely generic.

## Foundation direction

Shared code in `app/components/`, `app/lib/`, and `app/server/` must not runtime
depend on a product feature or application composition. This prevents a generic
helper or UI primitive from silently acquiring product ownership.

Invert the dependency, pass data or behavior into the foundation, or move the
source file to the owning feature or composition boundary. Explicit type-only
imports are allowed when they do not create a runtime edge.

`app/components/layout/` is composition and is intentionally allowed to assemble
features for the application shell.

## Platform direction

`app/platform/` contains cross-cutting browser capabilities. Platform modules may
use shared foundations, but they must not depend on product features or routes.
Feature-specific values enter through the platform API.

## Client server boundary

Reusable components, platform modules, and feature components are browser-capable.
They must not runtime-import `app/server/` or a `.server` module. Load server data
in a route and pass serializable values into the component. Type-only imports are
allowed when TypeScript erases the edge.

## Production dependency

Production source under `app/` and `server/` cannot import `tests/` or `scripts/`.
Move reusable implementation into an owned production module and leave fixtures,
CLI adaptation, and test setup outside the runtime graph.

## Diagnostics and changes

Run:

```bash
npm run architecture:check
```

Each finding includes the source line, imported target, rule identifier, reason,
valid remediation, and a link to the relevant section above. Do not add a blanket
exception or weaken a rule to make a new edge pass. If product architecture truly
changes, update this document, the single checker rule model, and its allow/reject
fixtures in the same change.
