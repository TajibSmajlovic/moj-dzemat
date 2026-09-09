# Maintenance, authentication, accessibility, and server rendering

Status: completed
Updated: 2026-09-09
Owner: primary coding agent

## Objective

Resolve installation warnings and reproduced authentication, accessibility, and
server-rendering defects in one change on
`fix/dependencies-auth-and-accessibility`, starting from `master` at `1a49fee`.
Record further verified limitations separately from the completed fixes.

## Acceptance criteria

- Resolve compatible dependency advisories and stale install-script approvals,
  keep Prisma 7, and remove build-only route tooling from production dependencies.
- Keep package.json free of dependency overrides. Document remaining Prisma
  advisories until upstream libraries publish compatible fixes.
- Password-reset tokens never appear in request logs, including route-data requests.
- Unknown-account login performs a valid bcrypt comparison at the real password cost.
- The post image lightbox contains keyboard focus and restores it on close.
- Mobile post cards fit their content and community information is easier to reach.
- Public reading content and authentication forms remain visible before JavaScript
  loads and through hydration, including featured posts, contact, payment, and
  location sections.
- Published Q&A answers open without JavaScript. Hydration preserves an answer
  already opened, and later client navigation retains entrance animations and
  view transitions.
- Further recommendations have local reproductions and explicit unresolved status.
- Focused regressions, browser verification, and `npm run agent:verify` pass.

## Starting state

- `npm audit` reported six affected dependency entries: Browserslist, qs,
  deepmerge-ts, mysql2, and their Prisma parents.
- Prisma 7.10.0 was installed, but script approvals still named 7.9.1.
- Prisma's SQLite adapter retains better-sqlite3 12 and prebuild-install.
- Browser and authentication checks reproduced reset-path logging, invalid dummy bcrypt,
  focus outside the open lightbox, and excessive mobile card height.
- Chromium at 390x844 and 1440x1000 with JavaScript disabled reproduced invisible
  contact, Q&A, location, login, and password-reset sections. Server HTML contained
  zero-opacity animation styles, and Q&A expand buttons could not open answers.
  Homepage cards already skipped entrances on document loads; featured posts
  required a dedicated fixture because the default runtime seed has none.

## Completed changes

1. Dependencies: updated compatible Browserslist, qs, and js-yaml releases;
   corrected Prisma script approvals; moved route-build tooling to development
   dependencies. Clean installation passes without overrides or approval warnings.
2. Authentication: reset request paths are sanitized in emitted logs; unknown
   and passwordless accounts perform a valid bcrypt comparison at the real cost.
3. Lightbox and homepage: Radix handles modal focus and scroll locking; closing
   restores the opener. The lightbox stays above announcements. Short mobile
   cards fit their content, and six posts precede the dates and Q&A previews.
4. Server rendering: `useEntranceMotion()` keeps server HTML and the hydration
   render visible. Later client mounts use existing entrance presets; history
   navigation and public view transitions still suppress duplicate motion. All
   content entrance consumers use the hook, including admin post previews,
   authentication forms, empty feeds, and contact sections.
5. Q&A: native `details` and `summary` elements own disclosure visibility, keyboard
   operation, grouping, and closed-content focus handling. CSS preserves open
   styling and respects reduced motion.
6. Documentation and review: combined both work records, updated the owning
   frontend, product, security, and installation guidance, and recorded the
   unresolved findings in the debt tracker. Simplification and comment review
   preserved the implemented behavior.

## Decisions and scope

- Keep Prisma 7 and resolve compatible updates without dependency overrides.
- Retain exact install-script approvals for concurrently installed native package
  versions. Do not force dependency convergence or suppress upstream warnings.
- Browser plugin unavailable; use repository Playwright and an owned isolated runtime.
- No hiring-focused README changes, backup/restore implementation, Prisma 8
  migration, schema migration, or external deployment.
- The user's staged changes were preserved. Subsequent rendering and documentation
  changes remain unstaged; no commit, push, or PR was created.

## Validation evidence

- `npm ci`: passed; 844 packages installed. No unapproved install-script notices.
- `npm audit --json` on 2026-09-09: four high-severity entries remained in `deepmerge-ts`,
  `mysql2`, `@prisma/config`, and `prisma`. Accepted upstream limitations are
  recorded in [TD-003](../tech-debt-tracker.md#td-003-upstream-prisma-dependency-warnings).
- `npm run agent:verify`: passed documentation, architecture, TypeScript,
  zero-warning ESLint, Prettier, Knip, 530 unit/integration tests in 80 files,
  45 Chromium E2E tests, and 7 production PWA tests.
- The focused regressions include 8 real Pino output checks and 16 authentication
  checks. Unknown-account and passwordless-account bcrypt checks failed against
  the original malformed dummy hash before the fix.
- Four server-rendering E2E cases disable JavaScript or delay external script
  requests against the built app. They check opacity through ancestors because
  Playwright's ordinary visibility assertion accepts zero opacity. Coverage
  includes featured posts, filters, archives, post details, native Q&A expansion
  and detail links, contact/location information, and authentication forms with
  validation feedback. The populated-contact test also checks payment and contact
  sections without JavaScript at both viewport widths.
- Manual Playwright checks against an owned isolated runtime passed at 390x844
  and 1440x1000 in light and dark themes with reduced motion. Filters navigate,
  images load, focus stays inside the lightbox, arrow keys change images, scroll
  stays locked, and Escape restores focus. No horizontal overflow, framework
  overlays, or application errors were observed. Motion's reduced-motion notice
  is expected in development.
- Additional manual checks confirmed initial HTML remains readable and keyboard
  focus reaches disclosure content in order. Mobile and desktop screenshots
  covered light and dark Q&A. External map content was stubbed.
- Visual inspection caught announcement overlap after the dialog conversion;
  restoring the original stacking order and adding a hit-test assertion fixed it.
  Screenshots were captured after images loaded and transitions settled.
- Rendering regressions caught a remaining hidden initial state on the payment
  section. It was removed before the final verification pass.
- Synthetic reset GET, GET `.data`, and form POST requests returned 400 and
  logged `/nova-lozinka/:token` without the synthetic token marker.
- Before the rendering changes, an isolated copy of the production build passed
  `npm prune --omit=dev --ignore-scripts --offline --no-audit --no-fund`, Prisma
  migrations, startup, homepage SSR, and client hydration. Route-build tooling,
  Vite, and Playwright were absent from that copy. The video lightbox opened,
  focused its close control, and restored the opener after closing; YouTube
  responses were stubbed. The development email route returned 404.
- Owned runtime processes and temporary databases were stopped and removed.
- After combining the records and synchronizing the documentation,
  `npm run docs:check`, `npm run format:check`, and `git diff --check` passed.
  Application code was unchanged during that documentation pass.

## Further improvements

Three locally reproduced limitations remain open. Their evidence and exit
conditions live in the debt tracker:

1. [TD-004: Request body limits rely on Content-Length](../tech-debt-tracker.md#td-004-request-body-limits-rely-on-content-length).
2. [TD-005: Concurrent password resets can reuse one link](../tech-debt-tracker.md#td-005-concurrent-password-resets-can-reuse-one-link).
3. [TD-006: Passwords can exceed bcrypt's byte limit](../tech-debt-tracker.md#td-006-passwords-can-exceed-bcrypts-byte-limit).

These fixes are not implemented in this change. Review scope included public
rendering and navigation, authentication and sessions, reset lifecycle, request
parsing, image access, post sanitization and publication queries, cache ownership,
and verification coverage. Only an isolated local runtime and synthetic accounts
were probed; this was not an exhaustive security audit.

## Recovery and remaining work

No data migration was needed. Source and lockfile changes can be reverted together;
run `npm ci` afterward. Upstream Prisma audit findings and the deprecated
prebuild-install notice remain visible without overrides. Both installed versions
of fsevents and better-sqlite3 retain their exact script approvals because different
parents require them. Browser verification covered Chromium, not Safari or Firefox;
the production dependency smoke check ran on macOS, not in the Fly Alpine image.

Reading and native Q&A expansion work without JavaScript. The mobile menu,
question-submission sheet, sharing, theme toggle, media lightbox, and featured
carousel controls still require JavaScript. No full no-script workflow is claimed
for those enhancements.

Diagnostic scripts, screenshots, and probe results remain outside the repository.
Synthetic probe accounts and visual fixtures were removed, and each owned runtime
was stopped using its exact manifest.
