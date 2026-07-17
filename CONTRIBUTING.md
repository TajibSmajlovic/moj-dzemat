# Contributing

Thanks for helping improve Moj Džemat. This project is a lightweight community
publishing app with public posts and Q&A, admin-managed important dates and
announcements, password-reset authentication, SQLite/Prisma storage, image
processing, and Fly.io deployment.

## Before You Start

- For bugs, feature ideas, or general tasks, open the matching GitHub issue template.
- For security problems, do not open a public issue with exploit details. Follow
  [.github/SECURITY.md](.github/SECURITY.md).
- Keep changes focused. One issue should usually map to one branch and one pull request.
- Do not commit secrets, `.env` files, database files, session cookies, reset
  links, API keys, or production data.

## Local Setup

Use Node `24.x` (`.nvmrc` is included), plus npm `11.18.0`.
You do not need Docker, Postgres, Redis, or an external email service for the
first local boot.

If you use `nvm`:

```bash
nvm use
```

Then boot the app:

```bash
npm ci
node -e "require('node:fs').copyFileSync('.env.example', '.env')"
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm ci` also runs the repo's `postinstall`, which generates Prisma client code
and React Router types.

## Local Environment

The app reads runtime environment variables from
[`app/server/env.server.ts`](app/server/env.server.ts). The template lives in
[`.env.example`](.env.example).

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
| `CLOUDFLARE_WEB_ANALYTICS_TOKEN` | Optional Cloudflare Web Analytics token. When empty, analytics is disabled. The script renders only on public pages.                 |
| `PORT`                           | Defaults to `3000`.                                                                                                                  |

Useful secret generator:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Never enable `ENABLE_TEST_ROUTES`, `HONEYPOT_SKIP_MIN_AGE`, or
`DISABLE_RATE_LIMITING` in production.

## First Admin Login

Admin bootstrap is easy to miss if you are new to the project:

1. Add your email to `ADMIN_SEED_EMAILS` in `.env`.
2. Run `npm run db:seed`.
3. Open `/zaboravljena-lozinka` and submit that email address.
4. If `RESEND_API_KEY` is empty, the app captures the email in memory instead of sending it.
5. If `ENABLE_TEST_ROUTES="true"`, open `/dev/last-email`, click the reset link, and choose your password.
6. After setting the password, the app signs you in and redirects you to `/admin/objave`.

Important details:

- seeded admins are created without passwords by design
- there is no public signup flow
- changing `ADMIN_SEED_EMAILS` later is safe; `npm run db:seed` is idempotent

## Common Commands

### App

| Command         | What it does                                               |
| --------------- | ---------------------------------------------------------- |
| `npm run dev`   | Starts the local SSR dev server from `server/index.ts`.    |
| `npm run build` | Builds the production client and server bundles.           |
| `npm run start` | Starts the production build from `build/server-entry.mjs`. |
| `npm run check` | Runs typecheck, ESLint, and Prettier checks.               |
| `npm run knip`  | Checks for unused files, exports, and dependencies.        |

### Database

| Command                     | What it does                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `npm run db:migrate`        | Runs Prisma's development migration flow. Use this when you are changing the schema locally.                         |
| `npm run db:migrate:deploy` | Applies committed migrations without creating new ones. Best for first local setup and production-style boots.       |
| `npm run db:seed`           | Provisions admins from `ADMIN_SEED_EMAILS`.                                                                          |
| `npm run db:setup`          | Convenience shortcut for `prisma migrate dev && prisma db seed`.                                                     |
| `npm run db:reset`          | Drops and recreates the local database, then reruns seed.                                                            |
| `npm run db:studio`         | Opens Prisma Studio.                                                                                                 |
| `npm run db:generate`       | Regenerates Prisma client code.                                                                                      |
| `npm run db:push`           | Pushes schema changes without creating a migration. Useful for quick experiments, not for normal migration workflow. |

### Tests

| Command                                   | What it does                                     |
| ----------------------------------------- | ------------------------------------------------ |
| `npm run test:run`                        | Runs the Vitest suite once (unit + integration). |
| `npm test -- --run --project unit`        | Runs only unit tests.                            |
| `npm test -- --run --project integration` | Runs only integration tests.                     |
| `npm run test:cov`                        | Runs Vitest with coverage.                       |
| `npm run test:e2e`                        | Runs Playwright end-to-end tests.                |
| `npm run test:e2e:ui`                     | Runs Playwright in headed mode.                  |

Before your first e2e run, install the Playwright browser once:

```bash
npx playwright install chromium
```

On Linux CI or bare Linux machines you may need:

```bash
npx playwright install --with-deps chromium
```

## Branches

Branch from `master` unless there is a clear reason not to.

Use this branch format:

```text
<type>/<issue-id>_<short-description>
```

Examples:

```text
feat/123_add-admin-post-filters
fix/124_prevent-empty-image-upload
docs/125_add-security-policy
```

Common types:

- `feat`
- `fix`
- `chore`
- `docs`
- `test`
- `refactor`
- `ci`

## Development Guidelines

- Follow the existing React Router, Prisma, Tailwind, and feature-folder patterns.
- Keep request coordination in route files. Put reusable domain logic in
  `app/features/*`, shared server utilities in `app/server`, and reusable
  helpers in `app/lib`.
- Use existing UI primitives and app conventions before adding new abstractions.
- Validate form data with the existing Conform and Zod patterns.
- Treat auth, password reset, sessions, anonymous Q&A submissions, image
  uploads, and admin routes as security-sensitive.
- Keep public pages accessible, responsive, and SEO-friendly.
- Add migrations for schema changes and keep seeds idempotent.
- Avoid broad refactors inside feature or bug-fix PRs.

## Testing

Choose tests based on the risk of the change:

- Unit tests for pure helpers, formatting, validation, security checks, and small business rules.
- Integration tests for Prisma, server actions, auth behavior, post visibility,
  and database-backed flows.
- Playwright e2e tests for public browsing, admin publishing, auth, routing, SEO,
  uploads, editor flows, and visible UI behavior.

Keep new tests under `tests/unit`, `tests/integration`, or `tests/e2e` unless
there is a strong reason to colocate a tiny file-specific unit test next to
source code. Current tests live in `tests/`.

A few implementation details that help when debugging:

- unit and integration tests run through Vitest projects
- integration tests should use `tests/factories.ts` for database rows instead of
  hand-written `prisma.create` setup when a factory exists
- route integration tests should use `tests/helpers/route.ts` to call loaders
  and actions, plus `tests/helpers/action-result.ts` for `data()`/`Response`
  assertions
- admin route tests can use `tests/helpers/auth.ts` to create an admin session
- Playwright starts the app itself and points it at `prisma/e2e.db`
- Playwright automatically enables `ENABLE_TEST_ROUTES`, `HONEYPOT_SKIP_MIN_AGE`,
  and `DISABLE_RATE_LIMITING`
- e2e fixture definitions live in `tests/e2e/fixtures/seed-data.ts`
- e2e global setup reuses shared factories, then seeds a deterministic admin,
  posts across all public post types, Q&A rows, one announcement, and important
  dates

Fast local verification before opening a PR:

```bash
npm run check
npm run knip
npm run test:run
npm run build
```

Run `npm run test:e2e` for UI, routing, auth, editor, upload, or admin workflow changes.

## Pull Requests

Before opening a PR:

- make sure the branch is focused and up to date with `master`
- fill out the pull request template
- include screenshots or recordings for visible UI changes
- call out migrations, environment variables, seed changes, deploy steps, and rollback notes
- explain skipped checks or known caveats
- verify production-only safety for auth, email, test routes, rate limiting, and secrets

Recommended local verification before requesting review:

```bash
npm run check
npm run knip
npm run test:run
npm run build
```

## Commit Hygiene

- Keep commits understandable and scoped.
- Do not mix unrelated cleanup with behavior changes.
- Do not commit generated local data, logs, uploaded test images, `.env`, or SQLite database files.
- If you change dependencies, commit the updated lockfile.

## Security and Privacy

Be extra careful with:

- admin emails and seeded users
- password reset links and tokens
- session cookies
- uploaded images and image metadata
- logs from production or preview deployments
- Fly.io, Resend, GitHub, analytics, and application secrets
- public exposure of draft or otherwise unpublished content

When in doubt, remove private data from screenshots, logs, and reproduction steps before sharing them.
