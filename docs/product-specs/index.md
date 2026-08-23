# Product Specifications

These specifications own durable user-visible rules that should not have to be
reconstructed from routes and tests for every change.

- [Posts](posts.md) - public browsing, editorial state, media, and first
  publication.
- [Questions and answers](questions-and-answers.md) - anonymous submission,
  moderation, visibility, and public reading.
- [Administration](administration.md) - admin access and management of posts,
  questions, important dates, contact information, and announcements.

Cross-cutting browser behavior has durable product contracts in the existing
technical decision guides:

- [PWA runtime and recovery](../design-docs/pwa-runtime-and-recovery.md) -
  installation, offline navigation, saved public posts, privacy, and recovery.
- [Web Push](../design-docs/web-push.md) - visitor subscription states,
  first-publication notifications, privacy, retries, and incidents.

Code and executable tests remain the final source of truth. When behavior
changes, update the owning specification in the same change. Keep implementation
details in architecture or feature code unless they constrain user-visible
behavior.

The product priorities behind these contracts live in
[PRODUCT_SENSE.md](../PRODUCT_SENSE.md).
