# Moj Džemat

`Moj Džemat` is a lightweight community publishing app for Bosnian-Herzegovinian
džemats. It has two main surfaces:

- a public website for posts, answered questions, upcoming community dates,
  and džemat contact details
- an admin area for publishing posts, answering questions, managing important
  dates, contact info, and controlling the site-wide announcement banner

The public site is installable as a Progressive Web App. It can retain
text-only snapshots of the 20 most recently viewed published posts for offline
reading; images and videos remain online-only.

The app is intentionally small operationally: React Router SSR on Express,
Prisma + SQLite, admin-only authentication, Resend-backed email in production,
and image blobs normalized with `sharp`.

## Stack

| Concern    | Choice                                                   |
| ---------- | -------------------------------------------------------- |
| Framework  | React 19 + React Router v8 (SSR, file-based routes)      |
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
  features/            vertical slices for posts, Q&A, important dates, contact, announcements, auth, and theme
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

Route files own request-level loader/action coordination, route metadata, and
page composition. Reusable domain schemas, intent constants, components, and
server logic live in `app/features/*`. Cross-cutting server pieces that should
not know about a domain live in `app/server`, and generic UI remains in
`app/components`.

Useful route groups:

| Area      | Routes                                                                                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public    | `/`, `/objave`, `/objave/:slug`, `/pitanja-i-odgovori`, `/pitanja-i-odgovori/:id`, `/kontakt`, `/robots.txt`, `/sitemap.xml`                                                  |
| Auth      | `/prijava`, `/zaboravljena-lozinka`, `/nova-lozinka/:token`, `/odjava`                                                                                                        |
| Admin     | `/admin/objave`, `/admin/objave/nova`, `/admin/objave/:id`, `/admin/objave/:id/pregled`, `/admin/pitanja`, `/admin/vazni-datumi`, `/admin/kontakt`, `/admin/obavijesna-traka` |
| Dev-only  | `/dev/last-email` when `ENABLE_TEST_ROUTES=true`                                                                                                                              |
| Resources | `/slike/:id`, `/resources/healthcheck`, `/resources/readiness`                                                                                                                |

## Deployment

Production is designed for Fly.io with LiteFS:

- the Docker image runs the built app on Node 24 Alpine
- `start.sh` applies `prisma migrate deploy` on boot
- the same startup flow reruns the Prisma seed so configured admins always exist
- Fly routes traffic using the database-aware `/resources/readiness` check;
  `/resources/healthcheck` remains a shallow process diagnostic

Deployment configuration lives in `Dockerfile`, `fly.toml`, `litefs.yml`, and
`start.sh`. Environment-specific values stay outside the repo. Before
deploying, make sure these values are set in Fly secrets or environment
configuration:

- `APP_URL`
- `SESSION_SECRET`, `PASSWORD_RESET_SECRET`, and `HONEYPOT_SECRET`
- `ADMIN_SEED_EMAILS`
- `RESEND_API_KEY` and `EMAIL_FROM`
- optional branding and integrations: `DZEMAT_NAME`, `DZEMAT_ADDRESS`,
  `DZEMAT_MAP_QUERY`, `FACEBOOK_PAGE_URL`, `CLOUDFLARE_WEB_ANALYTICS_TOKEN`

Leave `ENABLE_TEST_ROUTES`, `HONEYPOT_SKIP_MIN_AGE`, and
`DISABLE_RATE_LIMITING` unset or `false` in production.

The focused PWA production checklist and cleanup-worker procedure live in
[docs/pwa-recovery.md](docs/pwa-recovery.md).

## Community And Security

- [CONTRIBUTING.md](CONTRIBUTING.md) — local setup, testing, and PR expectations
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — community standards
- [.github/SECURITY.md](.github/SECURITY.md) — how to report vulnerabilities privately
- Use the issue templates under [.github/ISSUE_TEMPLATE](.github/ISSUE_TEMPLATE)
  for bugs, features, and other work

## License

MIT
