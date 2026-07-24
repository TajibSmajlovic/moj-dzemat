import { toPublicCommunityInfo, type CommunityInfoRecord } from "#app/features/contact/contact";
import type { CommunityInfoFormValues } from "#app/features/contact/contact-schema";
import { MINUTE_MS } from "#app/lib/time";
import { prisma } from "#app/server/db.server";

/**
   Singleton community contact / about record.

   Public pages read through a short in-process cache with explicit
   invalidation on admin save — same contract as the announcement strip.
   Safe under our single-instance Fly topology.
 */

export const COMMUNITY_INFO_ID = "default";

const EMPTY_COMMUNITY_INFO: CommunityInfoRecord = {
  showAbout: true,
  showContact: true,
  showImam: true,
  showBoard: true,
  showBank: true,
  showLocation: true,
  aboutText: null,
  imamName: null,
  imamPhone: null,
  imamEmail: null,
  contactPhone: null,
  contactEmail: null,
  officeHours: null,
  bankAccount: null,
  bankBeneficiary: null,
  bankName: null,
  bankSwift: null,
  bankNote: null,
  boardNote: null,
  updatedAt: new Date(0),
};

const communityInfoSelect = {
  showAbout: true,
  showContact: true,
  showImam: true,
  showBoard: true,
  showBank: true,
  showLocation: true,
  aboutText: true,
  imamName: true,
  imamPhone: true,
  imamEmail: true,
  contactPhone: true,
  contactEmail: true,
  officeHours: true,
  bankAccount: true,
  bankBeneficiary: true,
  bankName: true,
  bankSwift: true,
  bankNote: true,
  boardNote: true,
  updatedAt: true,
} as const;

type CacheEntry = {
  value: CommunityInfoRecord;
  expiresAt: number;
};

const TTL_MS = 5 * MINUTE_MS;
let cache: CacheEntry | null = null;

async function fetchCommunityInfo(): Promise<CommunityInfoRecord> {
  const row = await prisma.communityInfo.findUnique({
    where: { id: COMMUNITY_INFO_ID },
    select: communityInfoSelect,
  });

  return row ?? EMPTY_COMMUNITY_INFO;
}

export async function getCommunityInfo(): Promise<CommunityInfoRecord> {
  const now = Date.now();

  if (cache && cache.expiresAt > now) {
    return cache.value;
  }

  const value = await fetchCommunityInfo();
  cache = { value, expiresAt: now + TTL_MS };

  return value;
}

export async function getPublicCommunityInfo(): Promise<CommunityInfoRecord> {
  return toPublicCommunityInfo(await getCommunityInfo());
}

export function invalidateCommunityInfo(): void {
  cache = null;
}

export async function saveCommunityInfo(
  values: CommunityInfoFormValues,
): Promise<CommunityInfoRecord> {
  const row = await prisma.communityInfo.upsert({
    where: { id: COMMUNITY_INFO_ID },
    create: {
      id: COMMUNITY_INFO_ID,
      ...values,
    },
    update: values,
    select: communityInfoSelect,
  });

  invalidateCommunityInfo();
  return row;
}

export { type CommunityInfoRecord } from "#app/features/contact/contact";
