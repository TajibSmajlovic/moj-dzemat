# Candidate Evaluation — `moj-dzemat`

**Reviewer perspective:** senior engineer reviewing a personal project to calibrate seniority.
**Stack:** React 19 + React Router v7 (SSR) on Express · Prisma + SQLite · Tailwind v4 + shadcn/ui · Conform + Zod · Vitest + Playwright · Fly.io + LiteFS.
**Scope of evaluation:** medium-depth (architecture, key files, tests, security, performance, DX).

---

## TL;DR

**Seniority: Senior (mid-to-late), with several Staff-adjacent practices.**

The repo demonstrates a coherent, production-aware system built solo. The candidate makes deliberate, well-justified technology choices, applies defense-in-depth security thinking, and writes the kind of "boring code" that actually ships: small, layered, typed, tested, and consistent. There is little ornamental complexity — most decisions look like they came from someone who has been on-call.

Notable strengths over a typical Senior bar:

- Stateful session + secret rotation + session-fixation hardening (not the usual "JWT in a cookie").
- Fingerprint-revocable password reset tokens (stateless but invalidatable on password change).
- Sanitization performed at the **write boundary**, with a dedicated test suite pinning the allow- and deny-list.
- Three separate `tsconfig`s isolating client / Node libs / build scripts; `.server.ts` boundary actually enforced.
- CI with concurrency control and a serialized-deploy pipeline matching the single-writer LiteFS topology.

Gaps that keep this short of unambiguous Staff:

- Observability is bare (stdout pino, no metrics, no structured request context beyond basics).
- No CSP yet (explicitly deferred — a sound call, but still deferred).
- Single-instance assumption is a hard architectural constraint that is documented in comments but not enforced at boot.
- A few accessibility/product polish items (image alt text optional, no readiness probe distinct from liveness).

---

## 1. Architecture & Design

### Strengths

- **Real layering, not aspirational.** `app/utils/*.server.ts` is server-only, `app/lib/*` is browser-safe, `app/routes` only orchestrates. `.server.ts` files are excluded from the client bundle by config, not by convention. The 3-tsconfig setup ([tsconfig.json](tsconfig.json), [tsconfig.server.json](tsconfig.server.json), [tsconfig.node.json](tsconfig.node.json)) keeps these boundaries honest.
- **Session design is mature.** [app/utils/session.server.ts](app/utils/session.server.ts) keeps a session row in the DB and only a session id in the cookie — instant revocation, multi-device logout, future "active sessions" UI all become trivial. Login/password-reset rotate the session id ([app/utils/auth.server.ts](app/utils/auth.server.ts)) to prevent session fixation.
- **Stateless-but-revocable reset tokens.** [app/utils/reset-token.server.ts](app/utils/reset-token.server.ts) signs a JWT carrying a SHA-256 fingerprint of the user's current password hash; rotating the password silently invalidates outstanding links without a separate `Verification` table. Elegant.
- **Post write is atomic.** `persistPostAndImages` in [app/utils/post-admin.server.ts](app/utils/post-admin.server.ts#L187) wraps slug-uniqueness check, post upsert, image inserts, and alt-text updates in `prisma.$transaction(...)`. No orphaned blobs.
- **SQLite tuned for the actual topology.** [app/utils/db.server.ts](app/utils/db.server.ts) sets `journal_mode=WAL`, `foreign_keys=ON`, `synchronous=NORMAL`, `busy_timeout=5000` — appropriate for LiteFS single-writer, not over-engineered.
- **Loaders/actions are tight.** Routes like [app/routes/admin.objave.\_index.tsx](app/routes/admin.objave._index.tsx) use selective `select`, bounded pagination, and out-of-range redirects rather than 404s.

### Gaps

- **Single-instance is a hard requirement, but only soft-documented.** Rate limiter, honeypot, in-memory caches all assume one process. The comments call this out, but nothing at boot asserts the topology. A multi-region misclick on Fly silently degrades correctness.
- **Limited error boundary coverage.** A root-level boundary exists; route-level boundaries are sparse. Most error paths rely on throwing `Response` from loaders, which is correct, but a few admin flows would benefit from segment-scoped boundaries.
- **No application-level cache layer.** Announcement bar and other read-mostly queries hit Prisma on every request even though `@isaacs/ttlcache` is already a dependency.

---

## 2. Code Quality & Idioms

### Strengths

- **TypeScript discipline.** Essentially no `any`. Route prop types are derived from generated `Route.*` types. Server/client boundary types are clean. `npm run check` runs typecheck for all three tsconfigs _and_ `--max-warnings=0` lint _and_ Prettier check.
- **Invariant helpers.** [app/lib/invariant.ts](app/lib/invariant.ts) provides `invariant`, `invariantResponse`, and a custom `InvariantError`, with lazy message thunks to avoid happy-path string work — small detail, mature taste.
- **Conform + Zod usage is idiomatic.** Forms surface `lastResult`, use `shouldValidate: "onBlur"` / `shouldRevalidate: "onInput"`, and use intent fields for multi-action forms ([app/components/admin/post-form.tsx](app/components/admin/post-form.tsx)).
- **Pragmatic React 19 / Router v7 patterns.** Optimistic UI via `useFetcher` (e.g. [app/components/admin/optimistic-toggle-button.tsx](app/components/admin/optimistic-toggle-button.tsx)) rather than over-reaching for `useOptimistic` where it isn't needed.
- **Consistent import structure.** `eslint-plugin-import-helpers` plus `no-relative-import-paths` produces a uniform import order across the codebase.

### Gaps

- **Few memoization or perf-tuning signals.** Not a problem at current scale, but no `React.memo` / `useMemo` decisions are visible; would want to see this once lists or editors get heavier.
- **A handful of `*.server.ts` files lean long.** `post-admin.server.ts`, `image.server.ts`, and `env.server.ts` each carry a lot of logic. Still readable, but ripe for extraction once they grow further.

---

## 3. Testing

### Strengths

- **Three real layers.** Unit ([tests/unit](tests/unit)), integration ([tests/integration](tests/integration) with real Prisma + SQLite via [vitest.integration.config.ts](vitest.integration.config.ts)), and e2e ([tests/e2e](tests/e2e)) — and they exercise different things, not just the same code three ways.
- **Security tests are deliberate.** [tests/unit/post-sanitize.server.test.ts](tests/unit/post-sanitize.server.test.ts) pins both the allowlist _and_ an explicit denylist (`<script>`, `<iframe>`, `javascript:`, `data:`, `vbscript:`, case-mixed URLs, EOL bypasses). The file even documents _why_ it exists ("the sanitizer is the single trust boundary…"). That comment is a Senior-coded artifact.
- **Env validation has its own test.** [tests/unit/env.server.test.ts](tests/unit/env.server.test.ts) verifies prod rejects missing `RESEND_API_KEY` and refuses test-only flags. Uses `vi.resetModules()` for isolation — small detail done right.
- **E2E is deterministic.** Playwright seeds a fixed admin + posts in global setup, enables `ENABLE_TEST_ROUTES` / `HONEYPOT_SKIP_MIN_AGE` / `DISABLE_RATE_LIMITING` against a separate `prisma/e2e.db` so prod safeguards don't have to be relaxed.
- **Test factories** ([tests/factories.ts](tests/factories.ts)) and helpers reduce noise.

### Gaps

- **Failure paths under-tested.** Most scenarios are happy-path. Few tests for DB constraint violations, slug collisions under race, image processing errors, or rate-limit window edges.
- **No HTTP mocking layer** (e.g. MSW). HIBP and Resend integrations are tested by the absence of network rather than against a mock — fine, but limits assertions about error handling.

---

## 4. Security

This is the strongest dimension and the clearest signal of seniority.

### Strengths

- **HTML sanitization at the write boundary.** [app/utils/post-sanitize.server.ts](app/utils/post-sanitize.server.ts) normalizes Tiptap output once, on save, with an explicit allowlist; `transformTags` rewrites links to `rel="noopener noreferrer nofollow" target="_blank"`. Renderers can trust stored content.
- **Image uploads have layered validation.** [app/utils/image.server.ts](app/utils/image.server.ts) does magic-byte sniffing, MIME normalization, EXIF stripping, rotation, resize cap, WebP re-encode at quality 80 via sharp. Size-bounded both at intake and after normalization.
- **Password hygiene.** bcryptjs with cost 10, minimum length 10, and HIBP k-anonymity check (first 5 chars of SHA-1) on set — used at both signup-equivalent (reset) and rotation paths in [app/utils/auth.server.ts](app/utils/auth.server.ts).
- **Security headers and host hardening.** [app/utils/security.server.ts](app/utils/security.server.ts) sets `X-Content-Type-Options`, `X-Frame-Options: DENY`, strict `Referrer-Policy`, `Permissions-Policy` (camera/geo/mic/payment/usb off), COOP/CORP, HSTS in prod only.
- **Honeypot with timing.** [app/utils/honeypot.server.ts](app/utils/honeypot.server.ts) is HMAC-signed with `crypto.timingSafeEqual` and enforces both a min-age (500ms) and max-age (15 min) — bots that submit instantly or replay later both fail. The test-only override is locked behind env validation that refuses to load in production.
- **Rate limiting on auth endpoints** ([app/utils/rate-limit.server.ts](app/utils/rate-limit.server.ts)): 10/hr login, 5/hr forgot-password per IP.
- **CSRF posture.** No explicit token, but the model is sound: cookies are `SameSite=Lax`, all mutations are POSTs, and `odjava.tsx` explicitly 405s GETs to prevent prefetch-driven logout — a detail you only add if you've thought about cross-site GET requests.
- **Secret rotation built-in.** Both `SESSION_SECRET` and `PASSWORD_RESET_SECRET` accept CSV — first signs, all verify. Zero-downtime rotation is a first-class affordance, not bolted on.
- **Env validation crashes fast** ([app/utils/env.server.ts](app/utils/env.server.ts)). Production refuses to boot with test routes enabled or rate limiting disabled. Process exit is preferred over best-effort startup.

### Gaps / nits

- **CSP is intentionally absent.** The trade-off is reasonable (no allowlist surface yet) but the longer it's deferred, the more retrofit work it becomes. I'd add at least a baseline `default-src 'self'` with explicit script/img/style exceptions today.
- **Reset tokens are not server-revocable individually.** Fingerprint invalidation works on password change, but there's no admin "revoke outstanding links" and TTL is 1 hour. Acceptable; 30 minutes would be tighter.
- **`SameSite=Lax` over `Strict`.** Lax is the right product choice for SSR navigation. Worth being explicit that this is the chosen trade-off rather than a default.

### Red flags

None of consequence. The earlier "post write may not be transactional" concern was checked and is false — `persistPostAndImages` is wrapped in `prisma.$transaction`.

---

## 5. Performance

### Strengths

- **Image serving is cache-aware.** [app/routes/slike.$id.tsx](app/routes/slike.$id.tsx) returns `Cache-Control: public, max-age=31536000, immutable` for published images and `private, no-store` for drafts. IDs are insert-only so the immutable promise is honest.
- **Schema indexes match query shape.** [prisma/schema.prisma](prisma/schema.prisma) indexes `[status, publishedAt]`, `[status, type, publishedAt]`, `[featured, publishedAt]`, `[pinned, publishedAt]` — i.e. the actual sort+filter combinations used by the feed.
- **Selective `select` everywhere.** I didn't find a single `findMany` returning full rows where a subset would do.
- **Compression + SSR streaming via React Router v7** out of the box.

### Gaps

- **Image BLOBs in SQLite.** Fine at the project's scale and explicitly trades operational simplicity for ceiling. Not a mistake, but the ceiling needs a plan before it's hit.
- **No bundle analysis artifact.** Tiptap + Radix + Lucide + Embla on a public page is non-trivial — would expect at least one `vite-bundle-visualizer` pass.
- **No application cache** for predictably hot reads (announcement bar, site config).

---

## 6. DX / Tooling

### Strengths

- **`npm run check` is the right gate.** Typecheck × 3 configs + lint with `--max-warnings=0` + format check. Pre-commit runs `check`; pre-push runs `knip` + `test:run`. CI re-runs everything plus e2e. The ladder of fast→thorough is well-tuned.
- **CI has concurrency discipline** ([.github/workflows](.github/workflows)). Out-of-date PR runs cancel; `master` runs serialize. Deploys are pinned to the exact commit that passed CI, not the branch tip. `[skip deploy]` token supported.
- **Custom build orchestration** ([scripts/build.mjs](scripts/build.mjs)) keeps esbuild steps for client/server/seed independent and feeds each its own tsconfig.
- **Knip is in the loop.** Dead exports / files / deps get flagged in pre-push.
- **README is honest and operationally useful.** Documents the LiteFS topology, secret rotation format, and the test-only env flags explicitly. Few personal projects' READMEs explain _why_ `SESSION_SECRET` accepts a CSV.

### Gaps

- **Dockerfile / fly.toml are solid but ops runbook is thin.** No documented backup/restore for the LiteFS volume; no rotation runbook even though the code supports it.
- **Observability.** pino → stdout → Fly logs is the floor. No structured request fields beyond request id, no metrics, no alerts.

---

## Calibration

| Dimension                      | Signal                       |
| ------------------------------ | ---------------------------- |
| Architecture & layering        | Senior                       |
| TypeScript discipline          | Senior                       |
| React / Router v7 idioms       | Senior                       |
| Testing breadth & intent       | Senior                       |
| **Security**                   | **Senior+ / Staff-adjacent** |
| Performance                    | Senior                       |
| DX & CI                        | Senior+                      |
| Ops / observability            | Mid–Senior                   |
| Product polish (a11y, content) | Mid–Senior                   |

**Overall: Senior.** The security posture and the operational shape of CI/deploys argue for the upper end of Senior. The two things that would move this to a confident Staff signal are (a) production observability that you'd actually be paged from, and (b) some evidence of designing for the case where the single-instance assumption no longer holds (or an explicit, enforced boundary that prevents it).

## Suggested interview probes

1. **Single-writer constraint.** Where in the system is it load-bearing? How would you enforce it at boot, and what would you change first if you had to go multi-region?
2. **CSP.** What's the smallest CSP you'd ship today, and what would it block first?
3. **Reset-token design.** Walk through why a fingerprint of the password hash is sufficient and what attacks it doesn't cover.
4. **Sanitization placement.** Why at write time, not render time? When does this choice become a problem?
5. **Image storage in SQLite.** When do you migrate, and what does the migration look like?
6. **Observability.** What three signals would you add first, and what would you page on?
