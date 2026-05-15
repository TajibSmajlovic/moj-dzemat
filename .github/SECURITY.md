# Security Policy

## Supported Versions

This project is a small application rather than a versioned library. Security fixes are supported for:

| Version                                      | Supported |
| -------------------------------------------- | --------- |
| `main` / latest deployed production version  | Yes       |
| Older commits, forks, or local modifications | No        |

## Reporting a Vulnerability

Please do not open a public GitHub issue for exploitable security details.

Use GitHub's private vulnerability reporting for this repository:

1. Open the repository on GitHub.
2. Go to **Security**.
3. Choose **Report a vulnerability**.
4. Include the details listed below.

If private reporting is unavailable, open a public issue that only says you need a private security contact. Do not include payloads, secrets, reset links, screenshots with private data, or reproduction steps in the public issue.

## What to Include

Please include enough detail to reproduce and assess the issue safely:

- affected route or flow, such as `/prijava`, `/zaboravljena-lozinka`, `/admin/objave`, `/admin/obavijesna-traka`, `/slike/:id`, or public post pages
- whether the issue requires an admin session or affects public visitors
- clear reproduction steps against a local or test environment when possible
- proof-of-concept payloads, screenshots, logs, or requests with secrets removed
- expected impact, such as admin account access, content modification, stored XSS, data exposure, secret leakage, email abuse, or denial of service
- commit, deployment date, or environment where you observed the issue
- any related dependency, package, GitHub Action, Fly.io, LiteFS, Prisma, SQLite, or Resend configuration details

## Security Areas for This App

Reports are especially useful for:

- admin authentication, session handling, logout, and session fixation issues
- password reset links, reset token validation, email delivery, and account bootstrap
- rate limiting, honeypot protections, and abuse of public auth forms
- stored or reflected XSS in posts, the rich-text editor, announcements, SEO metadata, or social sharing content
- image upload processing, MIME sniffing, image serving, and oversized or malformed image payloads
- access control around admin routes, draft content, archived content, and unpublished images
- accidental exposure of `/dev/*` test routes, in-memory development email, or test-only flags in production
- leaked or weak environment secrets, including `SESSION_SECRET`, `PASSWORD_RESET_SECRET`, `HONEYPOT_SECRET`, `RESEND_API_KEY`, GitHub tokens, Fly.io tokens, and analytics tokens
- Prisma, SQLite, LiteFS, migration, seed, backup, or deployment configuration that could expose or corrupt data
- dependency vulnerabilities with a realistic exploit path in this application

## Out of Scope

The following are usually not treated as security vulnerabilities unless they include a practical exploit path:

- dependency vulnerability reports without evidence that this app is affected
- missing security headers beyond the current baseline unless exploitable in context
- rate-limit findings that rely on `DISABLE_RATE_LIMITING=true`, `HONEYPOT_SKIP_MIN_AGE=true`, or other test-only local configuration
- attacks requiring physical access to an already authenticated admin's device
- social engineering, phishing, spam, or attacks against third-party services outside this repository
- automated scanner output without reproduction steps
- denial-of-service testing, load testing, or resource exhaustion against production

## Safe Testing Rules

Please keep testing respectful and limited:

- Prefer a local clone or a dedicated test environment.
- Do not access, modify, delete, or exfiltrate data that is not yours.
- Do not create persistent public content, spam emails, or excessive login/reset traffic.
- Do not run destructive tests, high-volume scans, or denial-of-service attacks.
- Stop testing and report promptly once you have enough evidence.
- Remove secrets, cookies, reset tokens, and private data from all shared materials.

## Response Expectations

Maintainers aim to:

- acknowledge valid private reports within 3 business days
- confirm reproducibility and severity within 7 business days when possible
- prioritize fixes based on impact, exploitability, and affected users
- credit reporters in the fix notes when requested and appropriate

This project does not currently run a paid bug bounty program.

## Maintainer Remediation Checklist

For confirmed vulnerabilities, consider:

- rotating affected secrets using the existing comma-separated secret rotation support for `SESSION_SECRET` and `PASSWORD_RESET_SECRET`
- rotating `HONEYPOT_SECRET`, `RESEND_API_KEY`, GitHub secrets, Fly.io tokens, and analytics tokens when exposed
- invalidating affected sessions or password reset links
- checking production flags so `ENABLE_TEST_ROUTES`, `HONEYPOT_SKIP_MIN_AGE`, and `DISABLE_RATE_LIMITING` remain disabled
- reviewing logs for suspicious admin login, password reset, upload, or content modification activity
- adding or updating unit, integration, and Playwright coverage for the fixed path
- documenting any required migration, environment, deployment, or rollback steps in the related PR
