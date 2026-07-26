# PWA runtime, production verification, and recovery

The normal production build publishes the application worker at `/sw.js`.
That URL must stay stable because installed workers can remain active after the
server release that first registered them has been replaced.

## Runtime and offline-data boundaries

The service worker is a production-only enhancement. It registers after the
initial page load, handles only same-origin `GET` document navigations, and
keeps online navigation network-first. Browsers without service-worker support
continue to use the normal website.

The normal worker caches only the self-contained offline shell. It does not
cache SSR documents, React Router `.data` responses, route-specific responses,
application assets, uploaded media, or cross-origin content. If a same-origin
document navigation fails, the generic offline shell may be returned for any
route, but admin, authentication, form, Q&A, announcement, and contact content
is never stored for offline rendering.

After a published post renders successfully, the browser may retain a
normalized snapshot containing its public title, sanitized body markup, type,
slug, timestamps, and booleans indicating online-only media. IndexedDB retains
at most the 20 most recently viewed snapshots and evicts the least recently
viewed record first.

Snapshots never contain sessions, cookies, toasts, admin flags, author or media
identifiers, announcements, important dates, contact information, or
bank/donation details. Images and videos are not cached. Browser-managed
storage is best-effort and may be evicted. A snapshot already saved on a
visitor's device may remain after its source post is unpublished; the offline
UI therefore identifies it as a saved copy and shows when it was refreshed.
Visitors can clear all saved post snapshots from the offline shell without
removing the shell or service-worker registration.

## Focused production browser suite

The focused browser suite uses a production build, a unique loopback port, and
a temporary migrated SQLite database:

```sh
npm run test:pwa
```

The runner supplies dummy production-valid secrets and email configuration,
keeps `ENABLE_TEST_ROUTES`, `HONEYPOT_SKIP_MIN_AGE`, and
`DISABLE_RATE_LIMITING` set to `false`, and removes its temporary database in
`finally`. Local browser artifacts are temporary. In CI, failure traces,
screenshots, videos, and the PWA HTML report are retained in the workflow's
`playwright-pwa-artifacts` upload. The suite does not submit an email-triggering
form and must never use production credentials.

## Normal deployment checklist

Before deploying:

1. Run `npm run check`, `npm run knip`, `npm run test:run`,
   `npm run build`, and `npm run test:pwa`.
2. Confirm `build/client/sw.js` is the normal worker and does not contain
   `skipWaiting`.
3. Exercise the recovery build locally as described below, then run
   `npm run build` again to restore the normal artifact.
4. Deploy with the default Docker build:

   ```sh
   fly deploy
   ```

After deployment, replace `<production-origin>` below with the canonical HTTPS
origin and verify:

```sh
curl -I <production-origin>/manifest.webmanifest
curl -I <production-origin>/sw.js
curl -I <production-origin>/offline.html
curl -I <production-origin>/pwa-icon-192.png
curl -I <production-origin>/pwa-icon-512.png
curl -I <production-origin>/pwa-icon-maskable-512.png
```

The manifest must use `application/manifest+json`. `/sw.js` must use a
JavaScript content type and `Cache-Control: no-cache, must-revalidate`.
`/offline.html` must use an HTML content type and the same revalidation policy.

Complete the install, standalone launch, online-to-offline navigation, saved
post, and unsaved-route checks on desktop Chromium and Android Chromium.
Check Add to Home Screen, standalone launch, and offline saved-post reading on
a current iPhone or iPad when one is available.

## Cleanup worker

The cleanup source is
`app/features/pwa/recovery-worker.ts`. It is intentionally different from the
normal worker:

- it calls `skipWaiting()` so it can replace a defective worker immediately;
- it starts unregistering immediately so a failed or blocked storage cleanup
  cannot preserve the registration;
- it deletes only Cache Storage entries whose names begin with
  `moj-dzemat-pwa-`;
- it deletes only the IndexedDB database named `moj-dzemat-pwa`;
- it treats cache and IndexedDB removal as best-effort cleanup;
- it has no `fetch` handler, so it does not intercept navigations.

It does not modify server data, cookies, or caches owned by another
application.

Close other tabs for the application before exercising recovery. An open tab
can hold the IndexedDB database open and block deletion. In that case the
worker still unregisters; the database can be removed by a later recovery
registration after the blocking tab closes or by clearing the site's browser
storage.

Build the recovery release locally:

```sh
npm run build -- --worker-mode=recovery
```

The build mode bundles the cleanup source directly to the stable
`build/client/sw.js` path; no manual file copy is required. Inspect the
generated artifact before continuing:

```sh
rg 'skipWaiting|unregister|moj-dzemat-pwa' build/client/sw.js
```

Start the production server, open it in a browser that previously installed
the normal worker, and confirm in Chromium DevTools that:

1. `/sw.js` updates to the recovery worker;
2. the recovery worker activates immediately;
3. PWA-owned Cache Storage entries and the `moj-dzemat-pwa` IndexedDB database
   disappear;
4. the registration is removed;
5. a closed-and-reopened tab loads from the network.

Restore the normal local artifact after the exercise:

```sh
npm run build
```

## Emergency production recovery

Publish the cleanup worker at the same `/sw.js` URL:

```sh
fly deploy --build-arg PWA_WORKER_MODE=recovery
```

Open the production site, wait for the cleanup worker to activate, close all
site tabs, and reopen the site. In the DevTools Application panel, verify that
the registration, `moj-dzemat-pwa-*` caches, and `moj-dzemat-pwa` IndexedDB
database are gone.

The application still contains production registration code in a recovery
release, so a later visit can register the cleanup worker again while that
release remains deployed. After confirming cleanup, promptly deploy either
the corrected normal worker or an application release that removes PWA
registration:

```sh
fly deploy
```

Finally, repeat the manifest, worker-header, online navigation, offline shell,
and saved-post checks against the restored production release.
