# Frontend

The frontend is a React 19 application rendered by React Router 8 on the server
and hydrated in the browser. Route modules coordinate requests and compose
features. Reusable behavior belongs to the feature, platform, or shared layer
that owns it.

## Ownership and data flow

1. A route loader or action receives the request and validates the boundary.
2. Feature server modules apply domain rules and read or write through Prisma.
3. The route returns serializable data and composes feature or shared
   components.
4. Browser-only capabilities enhance the rendered result after hydration.

Keep route modules focused on request coordination, metadata, redirects, and
page composition. Keep product behavior in `app/features/<domain>/`. Shared UI
must not acquire hidden feature ownership. The enforceable dependency rules are
in [architecture boundaries](architecture/boundaries.md).

## UI system

- Tailwind CSS v4 utilities consume semantic project tokens defined in
  [`app/styles/tailwind.css`](../app/styles/tailwind.css).
- Reusable Radix-based primitives live in `app/components/ui/`.
- Form field and action composition lives in `app/components/forms/`.
- Public and admin shell composition lives in `app/components/layout/`.
- `cn()` in `app/lib/cn.ts` is the standard class-composition helper.

Extend an existing primitive when the interaction meaning is shared. Keep a
component inside its feature when its labels, data, or behavior are
domain-specific.

## Forms and mutations

- Use Conform with Zod for user-facing forms and repeat validation on the
  server.
- Use the existing field, password, select, form-action, honeypot, intent, and
  toast patterns before creating another form abstraction.
- Return field-level errors for correctable input and explicit route failures
  for missing or unauthorized resources.
- Protect destructive and state-changing admin actions with the existing intent
  and confirmation patterns.

## Navigation and motion

Public section navigation and theme changes use the capabilities in
`app/platform/view-transitions/`. Features provide data or links to the platform
API and do not reach into another feature to coordinate a transition.

All animation must respect the OS reduced-motion preference. The global motion
policy is configured in `app/root.tsx`, while CSS fallbacks and transition
timings live in `app/styles/view-transitions.css`.

## Rendering, SEO, and offline behavior

- Essential pages and metadata render on the server.
- Public index and detail routes own canonical URLs, social metadata, and
  structured data appropriate to their content.
- Admin and authentication pages remain out of search indexing.
- The normal service worker does not cache SSR or admin pages. Saved public post
  snapshots follow the stricter data boundary in
  [the PWA guide](design-docs/pwa-runtime-and-recovery.md#runtime-and-offline-data-boundaries).

## Responsive and accessibility rules

- Start with the narrow viewport, then add `sm` and `lg` adaptations when the
  content benefits.
- Avoid fixed widths for primary content and avoid page-level horizontal scroll.
- Use semantic HTML and existing accessible primitives for dialogs, sheets,
  accordions, tables, and alerts.
- Keep visible focus, readable line lengths, text zoom, touch targets, and light
  and dark contrast intact.
- Do not use an icon, color, animation, or toast as the only explanation of an
  important state.

The visual intent and review checklist live in [DESIGN.md](DESIGN.md).

## Verification

Use unit tests for pure presentation and state helpers, integration tests for
loader/action contracts, and Playwright for rendered behavior. Run
`npm run architecture:check` after dependency changes and
`npm run agent:verify` before declaring an agent-driven change complete.
