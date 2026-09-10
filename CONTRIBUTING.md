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

## Detailed guides

| Guide                                                      | Use it for                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [Local development](docs/development/local-development.md) | Environment variables, database commands, dependency updates, and development-only routes. |
| [Testing and verification](docs/development/testing.md)    | Test selection, fixtures, Git hooks, parallel checks, and failure artifacts.               |
| [Agent runtime](docs/development/agent-runtime.md)         | Isolated servers, logs, browser inspection, and troubleshooting.                           |

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
node -e "require('node:fs').copyFileSync('.env.example', '.env')"
npm ci
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm ci` also runs the repo's `postinstall`, which generates Prisma client code
and React Router types. Client generation does not require `DATABASE_URL`, but
database migration, seed, and application commands do.

Before running with your own settings, review the
[environment reference](docs/development/local-development.md#environment),
including local secrets and email configuration.

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

| Command               | What it does                                                     |
| --------------------- | ---------------------------------------------------------------- |
| `npm run dev`         | Starts the local SSR dev server.                                 |
| `npm run build`       | Builds the production app and Storybook catalogue.               |
| `npm run start`       | Starts the production build.                                     |
| `npm run agent:start` | Starts an isolated app for browser inspection.                   |
| `npm run storybook`   | Starts the component catalogue on port 6006.                     |
| `npm run check`       | Checks documentation, architecture, types, lint, and formatting. |
| `npm run test:run`    | Runs unit and integration tests once.                            |
| `npm run pwa:icons`   | Regenerates committed PWA icons from `public/logo.png`.          |

## Verification

| When                     | Command                | Coverage                                                                                       |
| ------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------- |
| Pre-commit               | `npm run check:staged` | Staged formatting and lint, plus repository documentation and architecture.                    |
| Pre-push                 | `npm run check:push`   | Full static checks, Knip, and unit/integration tests.                                          |
| Final agent verification | `npm run agent:verify` | Pre-push checks, Storybook, runtime smoke, E2E, and production PWA tests, running in parallel. |

Use focused checks while iterating. Run one verification workflow at a time per
checkout; use separate worktrees for simultaneous workflows. The
[testing guide](docs/development/testing.md) explains which tests to run,
how parallel verification isolates its work, and where failures retain evidence.

## Branches

Branch from `master` unless there is a clear reason not to. Use
`<type>/<issue-id>_<short-description>`, for example:

```text
feat/123_add-admin-post-filters
fix/124_prevent-empty-image-upload
docs/125_add-security-policy
```

Common types are `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, and `ci`.

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

See [ARCHITECTURE.md](ARCHITECTURE.md) for the system map and
[dependency boundaries](docs/architecture/boundaries.md) before changing imports
between features and shared code.

## Component catalogue

Run `npm run storybook` locally. Production builds serve the catalogue at
`/storybook/`; its public URL after deployment is
[mojdzematdonjemostre.ba/storybook/](https://mojdzematdonjemostre.ba/storybook/).
Add stories for new reusable UI and meaningful states. The
[authoring guide](stories/README.md) covers fixtures, providers, builds, hosting,
and verification; update [component coverage](stories/coverage.md) when adding stories.

## Pull Requests

Before opening a PR:

- make sure the branch is focused and up to date with `master`
- fill out the pull request template with concrete verification results
- include screenshots or recordings for visible UI changes
- call out migrations, environment variables, seed changes, deploy steps, and rollback notes
- explain skipped checks or known caveats
- verify production-only safety for auth, email, test routes, rate limiting, and secrets

Use the [verification workflow](#verification) before declaring an agent-driven
change complete. If a check cannot run, record the exact skipped command and
reason in the pull request. CI does not replace missing local verification evidence.

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
