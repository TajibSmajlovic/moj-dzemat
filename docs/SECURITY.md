# Security

This document owns the application security model and engineering rules.
[`.github/SECURITY.md`](../.github/SECURITY.md) owns private vulnerability
reporting instructions.

## Trust boundaries

- Public visitors may read published content and submit anonymous questions or
  Web Push subscription changes.
- Only seeded admin accounts may authenticate. There is no public registration
  or account-management surface.
- Every route, form, upload, environment variable, database read, email request,
  and push-service response is an untrusted boundary until validated.
- Browser storage, service workers, email providers, push services, proxies, and
  Fly infrastructure are outside the application process trust boundary.

## Authentication and authorization

- `ADMIN_SEED_EMAILS` provisions allowed admin identities. Seeded users choose a
  first password through the password-reset flow.
- Admin routes use the middleware in
  [`app/features/auth/admin-auth-middleware.server.ts`](../app/features/auth/admin-auth-middleware.server.ts).
  Do not rely on hidden UI for authorization.
- The session cookie contains only a signed session id. It is `HttpOnly`,
  `SameSite=Lax`, limited to the application path, and `Secure` in production.
  The SQLite session row owns identity and expiry.
- Sessions last at most 30 days. Password changes delete all existing sessions
  before creating the replacement login session.
- Password-reset links last 10 minutes, use a rotating secret keyring, and bind
  to the current password-row version so a successful reset invalidates older
  links.
- Passwords must have at least 10 characters and are rejected when the existing
  password validation identifies them as publicly breached.

Admin state-changing forms rely on same-site cookies, the production
`form-action 'self'` policy, and same-origin routes. Do not loosen cookie or CSP
behavior, accept cross-origin mutations, or add untrusted same-site origins
without revisiting the CSRF model.

## Public write protection

Login, password reset, anonymous Q&A, and subscription endpoints use the shared
validation and abuse controls appropriate to each flow:

- Zod validates shape, limits, and normalization on the server.
- Signed honeypot tokens reject filled, forged, instant, and stale submissions.
- Per-IP rate limiters bound login, password reset, Q&A, Web Push, and static
  asset abuse for the current single-process topology.
- Forgot-password responses do not reveal whether an email address exists.

`HONEYPOT_SKIP_MIN_AGE`, `DISABLE_RATE_LIMITING`, and `ENABLE_TEST_ROUTES` are
test-only flags. Environment validation rejects them when enabled in production.

## Content and upload safety

- Express rejects declared request bodies larger than 20 MB.
- Each uploaded image is limited to 15 MB, checked by content signature,
  decoded with Sharp, orientation-normalized, metadata-stripped, resized to a
  2000 pixel maximum edge, and re-encoded as WebP.
- Post bodies are sanitized on write. Only the editor's supported tags,
  text-alignment styles, and explicit `http`, `https`, or `mailto` links survive.
- Public queries select only published posts and answered, non-hidden questions.
- Resource loaders must enforce the same publication and authorization rules as
  the page that references the resource.

## Secrets, personal data, and logs

- Runtime secrets are parsed and validated in
  [`app/server/env.server.ts`](../app/server/env.server.ts). Never put secret
  values in source, fixtures, runtime manifests, screenshots, or task output.
- Session and password-reset secrets support zero-downtime key rotation. The
  first configured value signs new data and all configured values verify it.
- Web Push subscriptions are encrypted at rest; only a one-way endpoint hash is
  queryable. Rotation and retention details live in
  [the Web Push guide](design-docs/web-push.md#privacy-and-retention).
- Pino redacts credentials, tokens, cookies, email addresses, recipients, IP
  addresses, and common nested forms of those values. Keep operational ids only
  when they are needed to diagnose a request or domain event.
- Offline post snapshots exclude sessions, admin state, author and media ids,
  announcements, contact information, and donation details. See
  [the PWA data boundary](design-docs/pwa-runtime-and-recovery.md#runtime-and-offline-data-boundaries).

## HTTP and deployment controls

Express applies baseline response headers to static assets, SSR, resource
routes, and errors. Production adds HSTS and a restrictive CSP. The app disables
the Express signature, redirects non-canonical production hosts, and never
returns middleware stack traces to the client.

Production configuration and secrets live outside the repository. Do not deploy
an E2E build, enable development routes, weaken TLS or canonical-host behavior,
or use real production credentials in local or browser tests.

## Security change checklist

For changes touching auth, forms, uploads, HTML, PWA storage, email, Web Push,
logs, resource routes, environment variables, or deployment:

1. Identify data collected, who can read or mutate it, and its retention.
2. Recheck authentication, authorization, validation, size, and rate boundaries.
3. Exercise the closest unauthorized, invalid, oversized, expired, and retry
   path supported by the feature.
4. Confirm logs and test artifacts do not expose secrets or personal data.
5. Run focused tests and `npm run agent:verify`.

The current in-memory abuse controls assume one application process. Scaling to
multiple Machines requires shared rate-limit state and a review of every
process-local cache and dispatcher, as tracked in
[the tech-debt tracker](exec-plans/tech-debt-tracker.md).
