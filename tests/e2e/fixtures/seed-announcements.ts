import { createSiteAnnouncement } from "../../factories";

export const SEEDED_ANNOUNCEMENT_MESSAGE = "Džuma namaz u 13:00";

/**
   Seeds the active site announcement shown on every public page.

   SETUP ONLY. Unlike the other fixtures this one is not restore-safe, and
   the difference is not cosmetic: `getActiveAnnouncement` keeps the
   active row in an in-process cache that only the server's own admin
   write paths invalidate. A fixture writing straight to the database from
   the Playwright process cannot clear that cache, so the public bar would
   keep serving the previous message for up to the cache TTL.

   Calling this mid-run is worse than useless, because it also creates a
   second active row and breaks the single-active invariant that
   `announcements.spec.ts` exists to verify.

   A spec that changes announcements must undo it through the admin UI or
   the admin action, the way `kontakt.spec.ts` restores the equally cached
   contact singleton.
 */
export async function seedAnnouncements() {
  await createSiteAnnouncement({
    message: SEEDED_ANNOUNCEMENT_MESSAGE,
    isActive: true,
  });
}
