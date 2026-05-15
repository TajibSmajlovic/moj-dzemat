# Contributing

Thanks for helping improve Moj Džemat. This project is a lightweight community publishing app with a public website, admin-only content management, password reset authentication, SQLite/Prisma storage, image processing, and Fly.io deployment.

## Before You Start

- For bugs, feature ideas, or general tasks, open the matching GitHub issue template.
- For security problems, do not open a public issue with exploit details. Follow [.github/SECURITY.md](.github/SECURITY.md).
- Keep changes focused. One issue should usually map to one branch and one pull request.
- Do not commit secrets, `.env` files, database files, session cookies, reset links, API keys, or production data.

## Local Setup

Use Node `22.13.0+` and npm `10.9.0+`.

```bash
npm ci
node -e "require('node:fs').copyFileSync('.env.example', '.env')"
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

For local admin login:

1. Add your email to `ADMIN_SEED_EMAILS` in `.env`.
2. Run `npm run db:seed`.
3. Open `/zaboravljena-lozinka`.
4. If using the development inbox, set `ENABLE_TEST_ROUTES="true"` and open `/dev/last-email`.
5. Use the reset link to create your password.

Never enable `ENABLE_TEST_ROUTES`, `HONEYPOT_SKIP_MIN_AGE`, or `DISABLE_RATE_LIMITING` in production.

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
- Keep route files thin. Put domain logic in `app/features/*`, shared server utilities in `app/server`, and reusable helpers in `app/lib`.
- Use existing UI primitives and app conventions before adding new abstractions.
- Validate form data with the existing Conform and Zod patterns.
- Treat auth, password reset, sessions, image uploads, and admin routes as security-sensitive.
- Keep public pages accessible, responsive, and SEO-friendly.
- Add migrations for schema changes and keep seeds idempotent.
- Avoid broad refactors inside feature or bug-fix PRs.

## Testing

Choose tests based on the risk of the change:

- Unit tests for pure helpers, formatting, validation, and small business rules.
- Integration tests for Prisma, server actions, auth behavior, post visibility, and database-backed flows.
- Playwright e2e tests for public browsing, admin publishing, auth, routing, and visible UI behavior.

Useful commands:

```bash
npm run check
npm run knip
npm run test:run
npm run build
npm run test:e2e
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
- public exposure of draft, archived, or unpublished content

When in doubt, remove private data from screenshots, logs, and reproduction steps before sharing them.
