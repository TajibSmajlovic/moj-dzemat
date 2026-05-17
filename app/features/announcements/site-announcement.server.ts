import type { Prisma } from "@prisma/client";

import { MINUTE_MS } from "#app/lib/time";
import { prisma } from "#app/server/db.server";

/**
   Read + write helpers for the single-active site announcement strip.

   The public layout asks for the active announcement on every render,
   so we hold the lookup behind a tiny in-process cache with an
   explicit-invalidation contract: every admin write path
   (create / update / toggle / delete) calls
   `invalidateActiveAnnouncement()`. The TTL exists only as a safety
   net in case a future caller forgets to invalidate.

   Safe under our single-instance Fly topology (same one that justifies
   in-memory rate limiting). If the app ever goes multi-region this
   cache must be replaced or moved to a shared store.
 */

type ActiveAnnouncement = { message: string } | null;

type CacheEntry = {
  value: ActiveAnnouncement;
  expiresAt: number;
};

const TTL_MS = 5 * MINUTE_MS;

let cache: CacheEntry | null = null;

async function fetchActiveAnnouncement(): Promise<ActiveAnnouncement> {
  const row = await prisma.siteAnnouncement.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: { message: true },
  });
  return row;
}

/**
   Returns the currently active announcement (or `null`). Negative
   results are cached too so a site without any announcement does not
   incur a query per public page render.
 */
export async function getActiveAnnouncement(): Promise<ActiveAnnouncement> {
  const now = Date.now();

  if (cache && cache.expiresAt > now) {
    return cache.value;
  }

  const value = await fetchActiveAnnouncement();
  cache = { value, expiresAt: now + TTL_MS };

  return value;
}

export function invalidateActiveAnnouncement(): void {
  cache = null;
}

/**
   Deactivate every announcement that is currently `isActive: true`,
   optionally leaving one row untouched. Used inside transactions to
   enforce the single-active invariant from one place rather than
   three.
 */
export async function deactivateOtherAnnouncements(
  tx: Prisma.TransactionClient,
  exceptId?: string,
): Promise<void> {
  await tx.siteAnnouncement.updateMany({
    where: exceptId ? { id: { not: exceptId }, isActive: true } : { isActive: true },
    data: { isActive: false },
  });
}
