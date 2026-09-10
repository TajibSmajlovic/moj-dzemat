# Local development

Start with [local setup](../../CONTRIBUTING.md#local-setup) and
[first admin login](../../CONTRIBUTING.md#first-admin-login). This guide covers
configuration, database maintenance, dependency updates, and development-only routes.

## Environment

The app reads runtime environment variables from
[`app/server/env.server.ts`](../../app/server/env.server.ts). The template lives in
[`.env.example`](../../.env.example).

These are the variables that matter most for local development:

| Variable                         | Local guidance                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                   | Keep the default unless you want the SQLite file somewhere other than `prisma/data.db`.                                              |
| `ADMIN_SEED_EMAILS`              | Set this to your local admin email(s). `npm run db:seed` provisions only the user rows, not passwords.                               |
| `SESSION_SECRET`                 | Replace the sample value. Can be comma-separated for key rotation; the first value signs, all values verify.                         |
| `PASSWORD_RESET_SECRET`          | Replace the sample value. Same rotation rules as `SESSION_SECRET`.                                                                   |
| `HONEYPOT_SECRET`                | Replace the sample value. Must be at least 16 characters.                                                                            |
| `EMAIL_FROM`                     | Required even in local dev. Use a provider-compatible `From` value; keep the display name ASCII if your provider rejects diacritics. |
| `APP_URL`                        | Keep `http://localhost:3000` unless you change the port or run through a tunnel/proxy.                                               |
| `ENABLE_TEST_ROUTES`             | Set to `true` if you want local access to `/dev/last-email`. Leave `false` outside local/test work.                                  |
| `HONEYPOT_SKIP_MIN_AGE`          | Test-only. Defaults to `false`; Playwright enables it so browser tests do not need to wait on the honeypot timer.                    |
| `DISABLE_RATE_LIMITING`          | Test-only. Defaults to `false`; Playwright enables it so auth abuse protections do not make tests flaky.                             |
| `RESEND_API_KEY`                 | Leave empty in local development unless you explicitly want real email delivery. Required in production.                             |
| `DZEMAT_NAME`                    | Optional branding suffix shown in the UI.                                                                                            |
| `DZEMAT_ADDRESS`                 | Optional homepage address block for the embedded map section.                                                                        |
| `DZEMAT_MAP_QUERY`               | Optional Google Maps search/embed query. Falls back to `DZEMAT_ADDRESS` when left empty.                                             |
| `FACEBOOK_PAGE_URL`              | Optional official Facebook page URL. Header/footer Facebook links are hidden when empty.                                             |
| `YOUTUBE_CHANNEL_URL`            | Optional official YouTube channel URL. Header YouTube links are hidden when empty.                                                   |
| `CLOUDFLARE_WEB_ANALYTICS_TOKEN` | Optional Cloudflare Web Analytics token. When empty, analytics is disabled. The script renders only on public pages.                 |
| `PORT`                           | Defaults to `3000`.                                                                                                                  |

Useful secret generator:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Never enable `ENABLE_TEST_ROUTES`, `HONEYPOT_SKIP_MIN_AGE`, or
`DISABLE_RATE_LIMITING` in production.

## Database

| Command                     | What it does                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `npm run db:migrate`        | Runs Prisma's development migration flow, then regenerates the client. Use this when changing the schema locally. |
| `npm run db:migrate:deploy` | Applies committed migrations without creating new ones. Best for first local setup and production-style boots.    |
| `npm run db:seed`           | Provisions admins from `ADMIN_SEED_EMAILS`.                                                                       |
| `npm run db:setup`          | Runs the development migration flow, regenerates the client, and seeds the database.                              |
| `npm run db:reset`          | Drops and recreates the local database, regenerates the client, then reruns seed.                                 |
| `npm run db:studio`         | Opens Prisma Studio.                                                                                              |
| `npm run db:generate`       | Regenerates Prisma client code.                                                                                   |
| `npm run db:push`           | Pushes schema changes without a migration and regenerates the client. Useful for quick experiments only.          |

## Dependency maintenance

Install-script approvals in `package.json` are tied to exact package versions.
After dependency updates, use `npm install-scripts ls` to review scripts and
`npm explain <package>` to check why a package is present before changing its
approval. Multiple versions of `fsevents` and `better-sqlite3` are intentional
while their dependency parents require different releases; keep an approval for
each installed version that needs its script.

Known upstream Prisma advisories and the `prebuild-install` deprecation are
tracked in
[TD-003](../exec-plans/tech-debt-tracker.md#td-003-upstream-prisma-dependency-warnings).
Keep these warnings visible until compatible upstream releases resolve them.

## Development-only routes

`ENABLE_TEST_ROUTES` and `OMIT_DEV_ROUTES` intentionally control different
parts of the development-route lifecycle:

- `ENABLE_TEST_ROUTES` is runtime configuration. Setting it to `true` allows
  local and E2E access to `/dev/last-email`; otherwise its loader returns 404.
- `OMIT_DEV_ROUTES` is an internal build-only flag. `npm run build` sets it to
  `true` so React Router excludes `dev.last-email.tsx` from the production route
  manifest and client/server bundles.

Standalone React Router type generation leaves `OMIT_DEV_ROUTES` unset. It must
see the route even when runtime access is disabled because TypeScript still
checks the source file and its generated route types. Do not add
`OMIT_DEV_ROUTES` to `.env`, deployment configuration, or secrets; use the
repository's `npm run build` command for production builds.

`npm run build:e2e` is the one exception. It passes `--include-dev-routes` so
the Playwright suite can drive the password-reset flow through
`/dev/last-email`. Runtime access still depends on `ENABLE_TEST_ROUTES`, so the
resulting artifact returns 404 for that route unless the server opts in as well.
Never deploy it; production images build with plain `npm run build`.
The test-only build omits and removes any previous `build/storybook` catalogue.
Catalogue hosting is verified against the complete production build in the PWA suite.
