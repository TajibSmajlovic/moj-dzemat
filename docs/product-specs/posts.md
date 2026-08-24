# Posts

Posts are the main public publishing unit. Trusted editors create and manage
them; everyone can read published posts without an account.

## Public behavior

- Public lists, detail pages, sitemap entries, featured content, and offline
  capture include only posts with `status = published`.
- The public archive can filter by the five canonical types: `obavijest`,
  `smrtovnica`, `sergija`, `hutba`, and `price`.
- Pinned posts sort before other posts, then newer publication, creation, and id
  values provide deterministic order.
- At most five published featured posts appear in the featured collection.
- Archive pagination uses progressive "Učitaj više" links. Invalid or excessive
  pages redirect to a valid canonical page rather than presenting duplicate
  content.
- A missing, draft, or unpublished slug returns a not-found response.
- An authenticated editor viewing a public detail page may see an edit action
  and editorial pinned status. Those controls never grant authorization by
  themselves.
- Public detail pages provide canonical, social, article, and breadcrumb
  metadata. Shared links use the stable public slug.

## Editorial behavior

- A post has a unique 3 to 80 character lowercase slug made from letters,
  numbers, and hyphens.
- Titles are 3 to 200 characters. Bodies are required and limited to 50,000
  characters before canonical sanitization.
- Editors may save a draft or publish, pin, feature, attach up to three images,
  and attach up to three supported YouTube videos.
- Images accept optional alt text up to 160 characters. Upload safety and
  normalization are owned by [SECURITY.md](../SECURITY.md#content-and-upload-safety).
- Creating or transitioning a draft to published stamps `publishedAt` with the
  actual publication time. Ordinary edits to an already published post do not
  make it look newly published.
- Slug uniqueness and post, image, alt-text, and video changes are one database
  transaction. A conflict or media failure cannot leave a partial update.

## Notification contract

Only the first transition to published can make a Web Push decision. The
decision is recorded permanently as queued or skipped. Editing, unpublishing,
deleting, or republishing cannot generate a second notification. Delivery
failure cannot roll back successful publication. Detailed retry and incident
behavior lives in [the Web Push guide](../design-docs/web-push.md#editorial-rules).

## Offline contract

After an online published detail page renders, the browser may retain a
text-only normalized snapshot. Images and videos remain online-only. A saved
copy may remain after the source post is unpublished and must identify itself as
a saved copy. The full privacy and eviction rules live in
[the PWA guide](../design-docs/pwa-runtime-and-recovery.md#runtime-and-offline-data-boundaries).

## Acceptance evidence

- Unit tests own schema, type, video, excerpt, and sanitizer edge cases.
- Integration tests own public visibility, archive loader, and admin persistence
  contracts.
- `tests/e2e/posts.spec.ts` owns editor workflows.
- `tests/e2e/public-objave.spec.ts` owns public pagination and filtering.
- `tests/e2e/seo.spec.ts` and the PWA suite own metadata and offline behavior.
