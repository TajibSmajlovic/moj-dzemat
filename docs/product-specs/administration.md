# Administration

The admin area is a private editorial surface for a small set of trusted users.
There is no public registration or role hierarchy.

## Access

- Admin identities are provisioned from `ADMIN_SEED_EMAILS` by the idempotent
  seed. A seeded user may exist without a password until the reset flow is used.
- Login accepts email and password, applies honeypot and rate-limit checks, and
  returns the same credential error regardless of which credential was wrong.
- Forgot-password returns the same visible result for known and unknown email
  addresses.
- A valid reset sets the password, revokes all older sessions, creates a new
  session, and redirects to the posts admin area.
- Every `/admin` route is protected by server middleware. Admin and auth pages
  are not indexed by search engines.

Security details and rotation rules live in
[SECURITY.md](../SECURITY.md#authentication-and-authorization).

## Managed content

### Posts

Editors create, preview, update, publish, unpublish, pin, feature, and delete
posts. The complete editorial and first-publication contract lives in
[the posts specification](posts.md#editorial-behavior).

### Questions

Editors work through unanswered and answered queues, save or edit answers, hide
answered questions, restore hidden questions, and delete records. Counts in the
admin navigation reflect pending questions. See
[the Q&A specification](questions-and-answers.md#moderation).

### Important dates

Editors create, edit, and delete dated community items. A date is stored as UTC
midnight for a calendar day so display does not shift across time zones. Annual
items are projected onto the current year without changing the stored source
date. The public page shows only upcoming occurrences in the current calendar
year, ordered nearest first.

### Contact and community information

One singleton record owns about, imam, board, contact, bank, office-hour, and
visibility fields. Editors can independently show or hide each public section.
Bank supporting details require an account, and an account requires a
beneficiary. Public loaders receive only fields for enabled sections.

### Announcement bar

Editors create, edit, activate, deactivate, and delete announcement messages.
At most one announcement is active: activating one deactivates the others in
the same write flow. Public pages show the newest active row. Writes invalidate
the process-local read cache.

## Feedback and failure behavior

- Forms return field-level validation where the editor can correct input.
- Mutations produce explicit success or failure feedback through the shared
  toast and error-boundary patterns.
- Destructive actions use confirmation and missing records return not found.
- Server-side authorization and validation remain authoritative even when the
  browser UI disables or hides an action.

## Acceptance evidence

Admin integration tests own middleware, loaders, actions, not-found behavior,
and database invariants. The Playwright suites for auth, posts, Q&A, important
dates, contact, and announcements own the rendered editorial workflows.
