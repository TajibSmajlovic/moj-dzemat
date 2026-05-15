# Moj Džemat

`Moj Džemat` is a community publishing app with two main surfaces:

- a public website for browsing community posts
- a simple admin area for managing posts and the site-wide announcement banner

The project is intentionally lightweight for local development:

- React 19 + React Router v7 on top of Express
- Prisma + SQLite, so there is no separate database service to boot locally
- admin-only authentication via seeded email addresses and password reset links
- post images stored in SQLite after being normalized with `sharp`

## Stack

| Concern    | Choice                                                   |
| ---------- | -------------------------------------------------------- |
| Framework  | React 19 + React Router v7 (SSR, file-based routes)      |
| Server     | Express                                                  |
| Styling    | Tailwind CSS v4 + shadcn/ui                              |
| Validation | Conform + Zod                                            |
| Database   | Prisma + SQLite                                          |
| Auth       | Admin-only email/password + password-reset links         |
| Images     | Stored in SQLite as blobs, normalized with `sharp`       |
| Email      | Resend API in production, in-memory inbox in development |
| Tests      | Vitest + Playwright                                      |
| Deploy     | Fly.io + LiteFS                                          |

## What You Need Locally

- Node `22.13.0+` and `<23` (`.nvmrc` is included)
- npm `10.9.0+`
- no Docker, Postgres, Redis, or external email service for first local boot
- optional: Playwright browser binaries if you plan to run e2e tests

If you use `nvm`:

```bash
nvm use
```

## Quick Start

1. Install dependencies:

   ```bash
   npm ci
   ```

   `npm ci` also runs the repo's `postinstall`, which generates Prisma client code and React Router types.

2. Copy the environment template:

   ```sh
   node -e "require('node:fs').copyFileSync('.env.example', '.env')"
   ```

3. Update `.env` before the first boot:
   - set `ADMIN_SEED_EMAILS` to the email address you want to use locally
   - replace the sample secrets for `SESSION_SECRET`, `PASSWORD_RESET_SECRET`, and `HONEYPOT_SECRET`
   - set `ENABLE_TEST_ROUTES="true"` if you want to use the local dev inbox at `/dev/last-email`

4. Apply the committed Prisma migration and seed admin users:

   ```bash
   npm run db:migrate:deploy
   npm run db:seed
   ```

5. Start the dev server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

## Local Environment Notes

The app reads runtime environment variables from [`app/server/env.server.ts`](app/server/env.server.ts). The template lives in [`.env.example`](.env.example).

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
| `ENABLE_TEST_ROUTES`             | Set to `true` if you want local access to `/dev/last-email` and other test helpers. Leave `false` outside local/test work.           |
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

## First Admin Login

Admin bootstrap is easy to miss if you are new to the project:

1. Add your email to `ADMIN_SEED_EMAILS`.
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

| Command               | What it does                                     |
| --------------------- | ------------------------------------------------ |
| `npm run test:run`    | Runs the Vitest suite once (unit + integration). |
| `npm run test:cov`    | Runs Vitest with coverage.                       |
| `npm run test:e2e`    | Runs Playwright end-to-end tests.                |
| `npm run test:e2e:ui` | Runs Playwright in headed mode.                  |

Before your first e2e run, install the Playwright browser once:

```bash
npx playwright install chromium
```

On Linux CI or bare Linux machines you may need:

```bash
npx playwright install --with-deps chromium
```

Fast local verification before opening a PR:

```bash
npm run check
npm run knip
npm run test:run
npm run build
```

Run browser tests for UI/routing/auth changes, or when you want to mirror CI's full gate locally:

```bash
npm run test:e2e
```

## Project Structure

```text
app/
  components/          reusable UI primitives, layout chrome, forms, icons, and generic admin pieces
  features/            vertical slices for posts, announcements, auth, and theme behavior
  lib/                 small shared app helpers used across multiple slices
  routes/              file-based routes for public pages, auth, admin, sitemap, and dev helpers
  server/              server infrastructure: Prisma, env, email, logging, security, image pipeline
  styles/              Tailwind theme and global CSS
prisma/                schema, migrations, seed script, and local SQLite files
server/                Express entrypoint used by development and production server boot
tests/                 unit, integration, e2e, and test factories
scripts/               build orchestration and other repo scripts
public/                static assets
```

The route files intentionally stay thin. They compose loaders/actions, route metadata, and page UI while delegating domain work to `app/features/*`. Feature-owned schemas, intent constants, components, and server actions live together so a post change or announcement change is usually contained to one slice. Cross-cutting server pieces that should not know about a domain live in `app/server`, and generic UI remains in `app/components`.

Useful route groups:

| Area      | Routes                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------ |
| Public    | `/`, `/objave`, `/objave/:slug`, `/robots.txt`, `/sitemap.xml`                                                     |
| Auth      | `/prijava`, `/zaboravljena-lozinka`, `/nova-lozinka/:token`, `/odjava`                                             |
| Admin     | `/admin/objave`, `/admin/objave/nova`, `/admin/objave/:id`, `/admin/objave/:id/pregled`, `/admin/obavijesna-traka` |
| Dev-only  | `/dev/last-email` when `ENABLE_TEST_ROUTES=true`                                                                   |
| Resources | `/slike/:id`, `/resources/healthcheck`                                                                             |

## How Testing Works

The repo uses three layers of tests:

- unit tests for pure helpers and small business rules
- integration tests for real Prisma + SQLite behavior
- end-to-end tests for public and admin browser flows

A few implementation details that help when debugging:

- unit and integration tests run through Vitest
- Playwright starts the app itself and points it at `prisma/e2e.db`
- Playwright automatically enables `ENABLE_TEST_ROUTES`, `HONEYPOT_SKIP_MIN_AGE`, and `DISABLE_RATE_LIMITING`
- the e2e global setup seeds a deterministic admin user plus post fixtures

## Quality Gates

- pre-commit runs `npm run check`
- pre-push runs `npm run knip` and `npm run test:run`
- CI runs typecheck, lint, format check, Knip, build, Vitest, and Playwright e2e
- automatic deploys wait for a successful CI run on `master`

## Deployment Notes

Production is designed for Fly.io with LiteFS:

- the Docker image runs the built app on Node 22 Alpine
- `start.sh` applies `prisma migrate deploy` on boot
- the same startup flow reruns the Prisma seed so configured admins always exist
- Fly health checks hit `/resources/healthcheck`

You do not need LiteFS locally. Standard SQLite via `DATABASE_URL="file:./data.db"` is enough for development.

Production configuration lives outside the repo. Before deploying, make sure these values are set in Fly secrets or environment configuration:

- `APP_URL`
- `SESSION_SECRET`, `PASSWORD_RESET_SECRET`, and `HONEYPOT_SECRET`
- `ADMIN_SEED_EMAILS`
- `RESEND_API_KEY` and `EMAIL_FROM`
- optional branding and integrations: `DZEMAT_NAME`, `DZEMAT_ADDRESS`, `DZEMAT_MAP_QUERY`, `FACEBOOK_PAGE_URL`, `CLOUDFLARE_WEB_ANALYTICS_TOKEN`

Leave `ENABLE_TEST_ROUTES`, `HONEYPOT_SKIP_MIN_AGE`, and `DISABLE_RATE_LIMITING` unset or `false` in production.

## Branching And PRs

This repo uses a simple branch naming convention:

```text
<type>/<issue-id>_<short-description>
```

Example:

```text
feat/123_add-admin-post-filters
```

Common types:

- `feat`
- `fix`
- `chore`
- `docs`
- `test`
- `refactor`
- `ci`

A few team rules:

- branch from `master` unless there is a reason not to
- keep one branch focused on one issue
- use lowercase and hyphenated descriptions
- do not commit directly to `master`
- if you skip tests in a PR, explain why

## License

MIT
