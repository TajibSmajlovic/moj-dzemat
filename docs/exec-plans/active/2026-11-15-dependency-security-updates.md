# Consolidate dependency and security updates

Status: active
Updated: 2026-11-15
Owner: Codex

## Acceptance criteria

- One dependency set includes the updates from PRs #162, #164, #166, #168,
  #169, #170, #171, #172, #174, #175, and #176.
- No installed versions remain affected by the 33 Dependabot alerts reviewed
  on 2026-11-15, and the complete npm audit has no findings.
- The editor has an accessible name and remains usable in post creation,
  editing, and disabled examples.
- Routine npm minor and patch updates share one Dependabot group; security
  updates have a separate group on the default branch.
- A clean dependency install and `npm run agent:verify` pass.

## Verified starting state

- Base: `master` at `5ea4f1de4cec214bda95ea96bce924421a8b57ab`.
- Eleven open Dependabot PRs affect npm manifests and GitHub Actions.
- Thirty-three open alerts affect thirteen packages. Existing PRs omit patched
  versions for eleven alerts in happy-dom, body-parser, fast-uri,
  postcss-selector-parser, and brace-expansion.
- Chromium Storybook tests reproduced twelve editor accessibility failures:
  `ARIA input fields must have an accessible name`.
- A preliminary consolidated lockfile clears those alert version ranges but
  npm audit still reports glob and minimatch advisories through development tools.

## Milestones

1. Dependency consolidation and scoped security updates: completed.
2. Editor accessibility and browser regression checks: completed.
3. Clean installation, full verification, and final review: completed.
4. Publish one replacement PR with verification evidence: pending.

## Decisions and reasons

- Keep the existing Node, React, Router, Prisma, and ESLint major versions.
- Scope security overrides to the parents that retain vulnerable dependencies.
  Validate their actual glob and minimatch callers through lint, route generation,
  application builds, and Storybook builds before retaining the overrides.
- Give the rich editor a required label and query its textbox by name in browser
  checks. Tiptap now preserves its textbox role, revealing the missing name.
- Keep security updates independent of the weekly version-update schedule.

## Unexpected findings

- The latest Typography plugin still pins postcss-selector-parser 6.0.10.
- Current Router and TypeScript ESLint packages still require minimatch 10.
- Minimatch 11 removes `makeRe`, which Router's filesystem convention requires.
  Its override must use the maintained legacy-v6 release and verify the actual
  route exclusion patterns; TypeScript ESLint can use the patched version 11.
- Storybook's docgen plugin requires glob 13.
- Playwright's updated Chromium binary had to be installed before reproduction.
- Install-script approvals must follow the installed Prisma and native SQLite
  package versions.
- The updated accessibility checks also found a header link whose explicit name
  omits visible text, and insufficient contrast in the root-error status badge.
  The fixes use the link's content as its name and the foreground token for badge
  text.

## Validation evidence

- Reproduction:
  `npm run test:storybook -- stories/admin/rich-editor.stories.tsx stories/admin/posts.stories.tsx`
  failed with twelve accessibility failures and four passing tests before the fix.
- Final `npm run agent:verify`: passed in 108.6 seconds. This includes static
  checks, 570 unit/integration tests, 204 Storybook tests, 50 E2E tests,
  10 production PWA tests, and runtime smoke.
- A clean `npm ci` passes with the legacy-v6 Router override. A comparison of
  all 31 actual route files confirms unchanged dotfile and production-only
  dev-route exclusions.
- `npm audit --package-lock-only --ignore-scripts --json`: zero findings.
- The first full verification passed static checks, 570 unit/integration tests,
  runtime smoke, and the production PWA suite; Storybook exposed the additional
  header and error-badge accessibility failures described above.
- The corrected header and error badge pass the complete Storybook suite.
  Manual inspection checked the app at 1440×1000 and 390×844, including theme
  switching and the mobile menu, plus the root-error story at desktop and mobile
  sizes. The browser reported no application errors or warnings. The identified
  runtime and Storybook server were stopped after inspection.

## Recovery and remaining work

Revert the combined PR to restore the previous dependency and tooling set.
No database migration, environment change, or data backfill is required.
Existing PRs and GitHub alerts remain open until the replacement is merged and
the default branch has been checked.
