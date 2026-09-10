# Publish a component catalogue for Moj Džemat

Status: completed
Updated: 2026-09-10
Owner: Codex, with product decisions from Tajib

## Objective and current phase

Create a public Storybook at
`https://mojdzematdonjemostre.ba/storybook/` that documents the app's actual
components, demonstrates meaningful states using fictional data, and supports
interaction and accessibility checks locally and in CI.

Investigation and the scope interview are complete. Tajib authorized proceeding
with this plan on 2026-09-09. Implementation completed on `master`, starting
from commit `9437264`; no PR has been created. Tajib's existing staged changes
are preserved. Storybook changes remain unstaged; nothing has been committed or
deployed by the agent.

## Decisions and reasons

Tajib selected the following scope:

- Public access without login, using fictional example data.
- Public and admin components, including meaningful non-default states.
- Focused cleanup while preserving the current design: consolidate repeated
  presentation, fix demonstrated issues, and isolate browser effects as needed.
- Showcase plus interaction and accessibility checks. Screenshot comparison with
  approved baselines and hosted visual-testing services are deferred.
- Complete planning before implementation.

Recommended defaults: use `/storybook/`, because it accurately names the developer
catalogue and is easy to share. Redirect `/storybook` to `/storybook/` while
preserving query strings. Use a branded welcome page, "Moj Džemat - Komponente",
English technical documentation consistent with the repository, and natural
Bosnian inside rendered examples. Document the URL for contributors; omit it
from public navigation, search indexing, and the sitemap.

## Verified starting state

### Component inventory

There are 75 `.tsx` files under `app/components` and `app/features`. This is a
module count, not a count of independently useful stories.

| Area                | Files | Existing building blocks                                                                                                                                              |
| ------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared UI           |    15 | Buttons, input, textarea, native select, checkbox, label, alerts, native accordion, Radix dialogs/sheets, confirmation, carousel, table, back link, toast integration |
| Shared forms        |     5 | Field, PasswordField, SelectField, FormActions, nonvisual honeypot inputs                                                                                             |
| Shared admin        |     7 | Panel, page header, empty state, icon actions, optimistic toggle, deletion confirmation, pagination                                                                   |
| Layout              |     7 | Header/footer, auth shell, page main, location section, root and segment errors                                                                                       |
| Icons, SEO, sharing |     7 | Three icons, three JSON-LD helpers, ShareButton                                                                                                                       |
| Features            |    34 | Public/admin product UI, theme, notifications, and several nonvisual runtime/SEO modules                                                                              |

The repository already has useful feature boundaries. `npm run
architecture:check` passed during investigation. Storybook does not require
moving feature components into a shared library.

The stack is React 19.2, React Router 8.3, Vite 8.2, Vitest 4.1, Tailwind 4,
TypeScript 6, Node 24, npm 11.18, Radix, Conform, Tiptap, and Motion. There are no
Storybook dependencies, configuration files, or stories.

[tailwind.css](../../../app/styles/tailwind.css) owns the visual tokens and
bundled Inter/Lora fonts. The shadcn configuration uses New York styling, but
primitives have intentional customizations: Select is native, and Accordion uses
`details`/`summary`. Preserve these APIs and their progressive enhancement.

### Deployment and integration

- [server/index.ts](../../../server/index.ts) owns Express and production static
  assets. [Dockerfile](../../../Dockerfile) copies the whole `build` directory
  and prunes development dependencies after building. Static Storybook files can
  ship through the existing Fly.io image and deployment pipeline.
- [scripts/build.ts](../../../scripts/build.ts) builds the app, PWA artifacts,
  server entrypoint, and seed. Put Storybook in `build/storybook`, outside
  `build/client`, and build it after application output cleanup.
- [security.server.ts](../../../app/server/security.server.ts) sets
  `X-Frame-Options: DENY`, `frame-ancestors 'none'`, and a `frame-src` policy
  without same-origin frames. Storybook needs its own scoped iframe policy.
- [worker-routing.ts](../../../app/features/pwa/worker-routing.ts) currently
  allows `/storybook/` and `/storybook/iframe.html` into the app's navigation
  fallback. The catalogue needs an explicit path exclusion.
- [vite.config.ts](../../../vite.config.ts) includes the React Router framework
  plugin. Give Storybook its own Vite configuration rather than loading the app's
  SSR configuration.
- Docker excludes `tests/`. Story fixtures must be independent of database
  factories, E2E seeds, and server modules.

## Component improvements justified by the investigation

| Finding                                                                                                                                                                    | Planned response                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AnnouncementBar has insufficient light-theme text contrast. Computed colors were `rgb(250, 248, 245)` on `rgb(209, 159, 71)`, approximately 2.261:1.                       | Correct the semantic foreground pairing while retaining the gold identity. Check other affected secondary surfaces in both themes. Normal text requires at least 4.5:1.                               |
| Field, PasswordField, and SelectField repeat label/hint/error accessibility wiring. ContactForm has a private TextareaField while other forms repeat textarea composition. | Introduce a small shared field frame and TextareaField. Retain existing field APIs where practical, preserve external descriptions, and ensure reliable IDs. Verify validation and disabled states.   |
| PostStatusBadge, QaQuestionStatusBadge, and announcement status labels repeat pill presentation.                                                                           | Introduce a small shared badge primitive for presentation. Keep domain labels, icons, and status derivation inside their owning features.                                                             |
| PostTypeBadge and FeaturedHeroCard contain literal HSL colors outside the token system.                                                                                    | Name the necessary semantic roles in the existing stylesheet, retaining their visual meaning and checking contrast.                                                                                   |
| ThemeToggle reads root data and writes app cookies/storage. WebPushCard uses a provider that can request permission and change subscriptions.                              | Separate visual controls from browser orchestration where necessary, or use narrow supported module mocks when existing contracts suffice. Demos must not change real site settings or subscriptions. |
| Forms/actions use Form, useNavigation, and useFetcher; layout components also consume root data.                                                                           | Supply a reusable in-memory data router with fictional root data, local loaders/actions, and controlled navigation results. Keep the actual components.                                               |
| Post image URLs derive from database IDs; sharing opens Facebook; video and map components contact external services.                                                      | Resolve fictional media to bundled fixtures through a small browser boundary or supported story mocks. Simulate external effects and avoid production resource requests.                              |
| PostForm, SiteHeader, and detail/media components have multiple responsibilities.                                                                                          | Add composed stories first. Extract independently useful feature-local sections only where meaningful states or browser-effect isolation justify it. File length alone is not a refactoring reason.   |

The contrast requirement is documented in
[WCAG 2.2 contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
Field/badge duplication is a source-level maintainability finding, not evidence
that existing application flows are broken.

Keep the existing visual language, SSR visibility, reduced motion, feature
ownership, and native control behavior. Do not replace the UI system, introduce
a generic form engine or universal admin table, or install unused UI components.

## Catalogue and meaningful states

Use stable, explicit story titles and IDs. Each story should demonstrate a useful
visual or behavioral state, rather than every possible combination of props.

| Section                 | Coverage                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Welcome and foundations | Browsing/sharing instructions, fictional-data notice, colors, typography, spacing, radii, shadows, icons, light/dark previews                                |
| UI                      | Every existing visual primitive; variants, sizes, selection, feedback, disclosure, overlays, confirmation, carousel, table, toast                            |
| Forms                   | Text/password/select/textarea fields, visibility toggle, hints, validation, disabled/read-only states where supported, regular/sticky actions                |
| Layout                  | Desktop/mobile header navigation, active destinations, footer, auth shell, location, page container, error displays with simulated context                   |
| Public features         | Post cards with/without media, all post types, pinned/featured states, filters, articles/media/lightbox, Q&A, dates, announcements, contact, notification UI |
| Admin features          | Shared admin chrome/actions, pagination/empty states, post list/form/editor, Q&A list/answer, dates list/form, announcement list/form, contact form          |

Include long Bosnian text, absent optional data, empty/single/multiple items,
validation errors, pending/success/failure results, selected/unselected states,
and mobile widths where relevant. Show notification denied, unsupported,
install-required, enabled, retry, and busy states without requesting permissions.
Forms remain editable and return controlled local outcomes.

Nonvisual SEO scripts, honeypot internals, service-worker registration, database
services, and background providers are not standalone showcase entries. Document
their relevant consumer requirements. Do not import full route modules with
server loaders; compose their visual parts instead.

Record a coverage matrix mapping each inventoried visual component to a story or
an explicit rationale for demonstrating it through a composition.

## Milestones

### 1. Prove integration with representative stories - complete

- Verify the current stable Storybook release and peer ranges against React 19,
  Vite 8, Vitest 4, TypeScript 6, and Node 24. Official docs currently identify
  Storybook 10.6; exact package compatibility remains an implementation check.
  Do not force unsupported peers or downgrade the application toolchain.
- Use `@storybook/react-vite` with documentation, accessibility, and Vitest
  support, and stable typed story APIs. Lock a compatible dependency set.
- Create `.storybook/` configuration and top-level `stories/` with stories,
  deterministic fixtures, decorators, and narrow mocks. Keep tooling outside
  `app/routes` and the production runtime import graph.
- Reuse the real CSS/fonts, `#app` imports, and a consistent React instance.
  Isolate Storybook's Vite configuration from the React Router framework plugin.
- Build an in-memory data-router decorator with the correct root route ID and
  fictional branding. Do not mount `app/root.tsx`, live loaders, analytics,
  service-worker registration, or the real Web Push provider.
- Add theme and viewport controls. Apply themes to the preview document so
  portals inherit them; do not use the app's preference cookie/storage keys.
  Reuse the app's reduced-motion policy.
- Prove Button, Field, PostCard with a local image, a fetcher-based admin action,
  and a complex browser component before expanding the catalogue.

Exit: those stories run and build statically, with useful interaction and
accessibility checks, without database access, credentials, or live app requests.
Inspect the generated bundle as well as source imports.

### 2. Add coverage and focused component improvements - complete

- Implement the field, badge, token, contrast, and browser-effect improvements
  above while retaining feature ownership and app behavior.
- Cover the catalogue sections with real components, intentional compound
  examples, useful controls, and short usage/provider/layout guidance.
- Use fixed dates, stable IDs, varied Bosnian text, and local media. Reset demo
  state between stories. Keep fixtures independent of `tests/` and server code.
- Keep submissions and navigation in the memory router. Fail verification if a
  story requests real admin/resource/image endpoints or external services.
  If network mocking is needed, scope any mock worker under `/storybook/` and
  never register it at the app's root scope.
- Complete the coverage matrix. Extract feature-local subcomponents only when
  needed to expose a useful independent contract.

Exit: coverage is complete, meaningful states work at mobile/desktop widths in
both themes, the contrast issue is corrected, and affected application flows
still pass their appropriate checks.

### 3. Serve the static catalogue through the existing image - complete

- Add `storybook`, `build:storybook`, and `test:storybook` package scripts.
  Local development uses a separate Storybook dev server. Production output is
  `build/storybook`; a normal production/Docker build includes it.
- Keep Storybook packages as development dependencies. Express serves the static
  artifact; no extra production development server is required.
- Mount `/storybook/` before the React Router catch-all. Serve GET/HEAD, redirect
  the bare path while retaining query strings, and return real 404s for missing
  assets instead of app HTML. Verify manager/preview assets, fonts, fixtures,
  direct story/docs URLs, refresh, and subpath-relative URL resolution.
- Add a catalogue-only header policy: permit its same-origin preview iframe with
  appropriate `frame-src`, preview `frame-ancestors`, and X-Frame-Options. Keep
  app/admin framing protection intact. Test the built artifact before adding
  any other narrowly justified policy allowance.
- Set `X-Robots-Tag: noindex`; omit the catalogue from the sitemap and public
  navigation. Revalidate HTML and story indexes; give immutable caching only to
  genuinely fingerprinted assets.
- Exclude the bare path and all children from app service-worker navigation
  handling. Do not unregister or clear a visitor's worker, caches, saved posts,
  or subscriptions. Test with an already-controlled browser and worker update.
- Document shared Fly availability, startup behavior, release cadence, and
  rollback. Keep the existing CI-before-deployment pipeline.

Exit: the catalogue works behind production-equivalent Express headers and in
a browser controlled by the app's service worker. App routing, protection, and
offline behavior remain intact.

### 4. Integrate checks and document maintenance - complete

- Add a separate Vitest browser project using Playwright Chromium for stories;
  preserve the existing unit and integration projects.
- Test meaningful interactions: keyboard disclosure, overlay focus/escape,
  password visibility, validation, cancel/confirm, optimistic pending/failure,
  filters/navigation, editor changes, and simulated notification actions.
- Run accessibility checks for representative states in both themes. Fix
  actionable violations without blanket suppressions or an unexplained baseline.
  Retain manual focus, responsive, and visual checks where automation is limited.
- Add production-mount browser coverage for iframe rendering, deep links,
  caching/headers, asset MIME/404 behavior, and service-worker interaction.
- Include Storybook configuration and stories in TypeScript, ESLint, Prettier,
  and Knip. Ensure architecture checks reject production imports from stories
  and mocks, and browser stories cannot runtime-import server modules. Update
  rule documentation and allow/reject fixtures together where necessary.
- Add story verification to CI and `npm run agent:verify`. Preserve current
  checks, including the PWA production suite for changes to worker routing.
- Update CONTRIBUTING and FRONTEND with commands, URL, fixture rules, and an
  expectation that new reusable UI and meaningful states gain stories.

Exit: `npm run agent:verify` passes with the new checks and a working production
artifact. Deployment is a separate explicitly authorized action.

## Acceptance criteria

- Anonymous visitors can browse `/storybook/`, share a component/state/docs URL,
  and reload it successfully on the intended origin after authorized deployment.
- The actual public/admin UI renders with fictional data and local media;
  demonstrations cannot mutate production state or app preferences.
- Coverage includes meaningful states, useful documentation, responsive previews,
  accurate themes, and the required announcement contrast correction.
- Storybook renders without a database or credentials; ordinary app pages do not
  load Storybook code, story fixtures, or mocks.
- Main-site security, routing, SSR, and offline behavior remain intact, while the
  catalogue has intentional framing, caching, and indexing behavior.
- Interaction/accessibility checks run locally and in CI, and existing required
  checks remain authoritative and pass.

## Investigation evidence and unexpected findings

- Read architecture, design/frontend, contribution, deployment, security-header,
  PWA routing, tooling, and representative component sources.
- Ran `npm run architecture:check`: passed.
- Started the isolated runtime with `npm run agent:start`; inspected
  `http://127.0.0.1:51737` using installed Playwright Chromium. Browser skill was
  unavailable. No browser dependencies were installed.
- Sampled `/`, `/pitanja-i-odgovori`, `/admin/objave`, and `/admin/kontakt` with
  desktop 1440x1000 and mobile 390x844 inspection. Public sampling included both
  themes; admin sampling used dark mode. Exercised disclosure, theme switching,
  and seeded local administrator login.
- The final pass reported correct titles, meaningful content, no Vite overlay,
  no page-level horizontal overflow, and no console/page errors. Screenshots were
  inspected and stored outside the repository.
- The first cold development pass hit Vite dependency optimization errors. These
  did not recur after optimization and fresh page loads. They are not confirmed
  production component failures.
- Confirmed announcement contrast using browser-computed colors, not pixels.
- Stopped and cleaned the isolated runtime through `npm run agent:stop` using
  its exact generated manifest.
- This was representative inspection, not exhaustive accessibility coverage.
  During the initial component inspection, no production session, Storybook
  build, or full `agent:verify` was run.

## Verification and remaining limitations

The catalogue contains 102 stories, with a
[coverage matrix](../../../stories/coverage.md) for all 78 current component
modules and an [authoring guide](../../../stories/README.md). Storybook 10.6.0 and
the Vitest browser provider 4.1.11 are pinned without downgrading the app.

`npm run agent:verify` passed on 2026-09-10, including 549 unit/integration
tests, 204 Storybook browser checks across 102 examples in light and dark themes,
the agent smoke check, 45 app browser tests, and 10 production PWA tests.
Production verification covers every built story, direct story/docs URLs, static
assets, framing headers, app preference isolation, and service-worker updates.

The Storybook build reports its standard advisory for development-catalogue
chunks larger than 500 kB. The published catalogue has not been deployed, so
`https://mojdzematdonjemostre.ba/storybook/` becomes available only after the
user stages, commits, and deploys this change through the normal release flow.

No schema or data migration is expected. If a deployed integration fails, roll
back through the normal application image process. To remove only the catalogue,
remove its mount and artifact together and restore only its scoped header
handling. Preserve the main application's security and recovery behavior.
Keep component improvements separately reviewable from hosting changes.
Stage, commit, push, and deploy remain manual or explicitly authorized.

## Technical references checked

- [React with Vite framework](https://storybook.js.org/docs/get-started/frameworks/react-vite)
- [Static Storybook publishing](https://storybook.js.org/docs/sharing/publish-storybook)
- [Separate Vite configuration](https://storybook.js.org/docs/builders/vite)
- [Vitest integration](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon)
