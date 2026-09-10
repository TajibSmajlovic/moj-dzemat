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

Reusable components, shared browser helpers, platform modules, feature components,
and `.client` modules are browser-capable. They must not reach `app/server/`,
`.server` modules, generated Prisma code, or Node built-ins through runtime
imports. The checker follows local helpers and re-export chains, including
configured TypeScript aliases; moving an import into a helper does not remove
the browser boundary.

Load server data in a route and pass serializable values into the component.
Type-only imports and re-exports are allowed when TypeScript erases the edge.
Route loaders and server modules may use server dependencies. The checker does
not model React Router's client/server export splitting or third-party package
internals, so build and browser checks remain necessary.

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

For an indirect browser dependency, the diagnostic also shows the import path
from a browser-capable module to the offending helper.

## Storybook tooling

`stories/` owns examples, fixtures, decorators and browser mocks. `.storybook/`
owns its separate Vite configuration and preview. Neither belongs in the
production app import graph: the production-dependency rule rejects imports of
`stories/` and `.storybook/` from `app/` or `server/`.

All story modules and the Storybook preview/manager are browser entries. Their
runtime import chains cannot reach server modules or Node built-ins. Node-only
Storybook build configuration can use Node APIs. Stories may import visual
feature components directly and use type-only contracts; they must not import
route loaders or database-backed fixtures. The Express catalogue router serves
only generated files and does not import story source.
