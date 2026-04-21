# Moj Dzemat

The app currently includes a public site for browsing community posts and a simple admin panel for managing content.

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

## Local Setup

Requires Node 22 and npm 10.

```bash
npm ci
cp .env.example .env
```

Fill in the required values in `.env`, then run:

```bash
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Admin Bootstrap

- seeded admins come from `ADMIN_SEED_EMAILS`
- the seed creates admin users without passwords
- the first password is set through `/zaboravljena-lozinka`

## Environment

Runtime environment variables are validated in [app/utils/env.server.ts](/Users/tajibsmajlovic/Work/moj-dzemat/app/utils/env.server.ts:1).

Main variables:

| Variable                | Required   | Purpose                                            |
| ----------------------- | ---------- | -------------------------------------------------- |
| `DATABASE_URL`          | yes        | SQLite file path                                   |
| `SESSION_SECRET`        | yes        | Cookie signing secret, supports rotation           |
| `PASSWORD_RESET_SECRET` | yes        | Signed reset-link secret, supports rotation        |
| `HONEYPOT_SECRET`       | yes        | Honeypot integrity secret                          |
| `EMAIL_FROM`            | yes        | Visible From header for outgoing email             |
| `APP_URL`               | yes        | Canonical app origin                               |
| `ADMIN_SEED_EMAILS`     | seed only  | Comma-separated admin emails                       |
| `DZEMAT_NAME`           | optional   | Adds a community name to the visible brand         |
| `RESEND_API_KEY`        | production | Email provider API key                             |
| `ENABLE_TEST_ROUTES`    | optional   | Enables dev test helpers such as `/dev/last-email` |
| `PORT`                  | optional   | Defaults to `3000`                                 |

See [`.env.example`](/Users/tajibsmajlovic/Work/moj-dzemat/.env.example:1) for the current template.

## Useful Scripts

| Script                      | Purpose                                 |
| --------------------------- | --------------------------------------- |
| `npm run dev`               | Start the local dev server              |
| `npm run build`             | Build client and server bundles         |
| `npm run start`             | Start the production bundle             |
| `npm run check`             | Typecheck + lint + format check         |
| `npm run test:run`          | Run Vitest once                         |
| `npm run test:e2e`          | Run Playwright tests                    |
| `npm run knip`              | Check for unused files and dependencies |
| `npm run db:migrate`        | Create/apply a local dev migration      |
| `npm run db:migrate:deploy` | Apply committed migrations              |
| `npm run db:seed`           | Seed admin users                        |

## Testing

The repo uses three layers of tests:

- unit tests for pure helpers and schema logic
- integration tests for real Prisma + SQLite behavior
- e2e tests for public and admin flows

Typical local flow:

```bash
npm run check
npm run test:run
npm run test:e2e
```

## Repository Layout

```text
app/
  components/          UI building blocks and route-level components
  lib/                 browser-safe helpers and schemas
  routes/              public and admin routes
  styles/              Tailwind v4 theme and global styles
  utils/               server-only utilities
prisma/                schema, migrations, seed
server/                Express entrypoint
tests/                 unit, integration, and e2e tests
public/                static assets
```

// test
