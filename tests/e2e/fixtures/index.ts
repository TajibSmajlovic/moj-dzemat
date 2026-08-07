/**
   Database fixtures for the E2E suite.

   Each module owns one entity end to end: the deterministic data it seeds
   and the function that writes it. Specs import the module they assert
   against directly, so the values and the rows behind them can never
   drift apart. This barrel exists for `global-setup.ts`, which applies
   every fixture in one place.

   Two contracts live here, and the name says which one you get:

   - `ensure*` is restore-safe. It is idempotent, only touches the rows
     the seed owns, and may be called from a spec's `afterEach` to undo
     mutations. These entities are read straight from the database, so a
     write from the Playwright process is immediately visible to the
     running server.
   - `seed*` is setup-only. It must run before the server starts, and
     calling it mid-run will either duplicate rows or leave the server
     holding stale cached data. See `seed-announcements.ts` for why.

   Before turning a `seed*` fixture into an `ensure*` one, check whether
   the feature caches its reads in the server process.

   Note for `global-setup.ts`: importing anything from here loads the
   Prisma client, so it must stay a dynamic import that runs after
   `DATABASE_URL` is set.
 */

export { ADMIN_EMAIL, ADMIN_PASSWORD, ensureAdmin } from "./seed-admin";
export { seedAnnouncements } from "./seed-announcements";
export { ensureImportantDates } from "./seed-important-dates";
export { ensurePosts } from "./seed-posts";
export { ensureQA } from "./seed-qa";
