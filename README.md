# Moj Džemat

`Moj Džemat` is a lightweight community publishing app for Bosnian-Herzegovinian
džemats. It has two main surfaces:

- a public website for browsing community posts
- a simple admin area for managing posts and the site-wide announcement banner

The app is intentionally small operationally: React Router SSR on Express,
Prisma + SQLite, admin-only authentication, Resend-backed email in production,
and image blobs normalized with `sharp`.

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

## Development

Local setup, environment variables, admin bootstrap, common commands, testing,
and pull request expectations live in [CONTRIBUTING.md](CONTRIBUTING.md).

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
tests/                 unit, integration, e2e, fixtures, factories, and test helpers
scripts/               build orchestration and other repo scripts
public/                static assets
```

Route files intentionally stay thin. They compose loaders/actions, route
metadata, and page UI while delegating domain work to `app/features/*`.
Feature-owned schemas, intent constants, components, and server actions live
together so a post or announcement change is usually contained to one slice.
Cross-cutting server pieces that should not know about a domain live in
`app/server`, and generic UI remains in `app/components`.

Useful route groups:

| Area      | Routes                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------ |
| Public    | `/`, `/objave`, `/objave/:slug`, `/robots.txt`, `/sitemap.xml`                                                     |
| Auth      | `/prijava`, `/zaboravljena-lozinka`, `/nova-lozinka/:token`, `/odjava`                                             |
| Admin     | `/admin/objave`, `/admin/objave/nova`, `/admin/objave/:id`, `/admin/objave/:id/pregled`, `/admin/obavijesna-traka` |
| Dev-only  | `/dev/last-email` when `ENABLE_TEST_ROUTES=true`                                                                   |
| Resources | `/slike/:id`, `/resources/healthcheck`                                                                             |

## Deployment

Production is designed for Fly.io with LiteFS:

- the Docker image runs the built app on Node 22 Alpine
- `start.sh` applies `prisma migrate deploy` on boot
- the same startup flow reruns the Prisma seed so configured admins always exist
- Fly health checks hit `/resources/healthcheck`

Production configuration lives outside the repo. Before deploying, make sure
these values are set in Fly secrets or environment configuration:

- `APP_URL`
- `SESSION_SECRET`, `PASSWORD_RESET_SECRET`, and `HONEYPOT_SECRET`
- `ADMIN_SEED_EMAILS`
- `RESEND_API_KEY` and `EMAIL_FROM`
- optional branding and integrations: `DZEMAT_NAME`, `DZEMAT_ADDRESS`,
  `DZEMAT_MAP_QUERY`, `FACEBOOK_PAGE_URL`, `CLOUDFLARE_WEB_ANALYTICS_TOKEN`

Leave `ENABLE_TEST_ROUTES`, `HONEYPOT_SKIP_MIN_AGE`, and
`DISABLE_RATE_LIMITING` unset or `false` in production.

## Community And Security

- [CONTRIBUTING.md](CONTRIBUTING.md) — local setup, testing, and PR expectations
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — community standards
- [.github/SECURITY.md](.github/SECURITY.md) — how to report vulnerabilities privately
- Use the issue templates under [.github/ISSUE_TEMPLATE](.github/ISSUE_TEMPLATE)
  for bugs, features, and other work

## License

MIT
