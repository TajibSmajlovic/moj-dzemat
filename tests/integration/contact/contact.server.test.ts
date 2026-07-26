import { beforeEach, describe, expect, it } from "vitest";

import { communityInfoHasContent } from "#app/features/contact/contact";
import {
  COMMUNITY_INFO_ID,
  getCommunityInfo,
  getPublicCommunityInfo,
  invalidateCommunityInfo,
} from "#app/features/contact/contact.server";
import { prisma } from "#app/server/db.server";

import { createCommunityInfo } from "../../factories";

describe("contact.server", () => {
  beforeEach(() => {
    invalidateCommunityInfo();
  });

  it("returns empty defaults when no community info row exists", async () => {
    const info = await getCommunityInfo();

    expect(communityInfoHasContent(info)).toBe(false);
    expect(info.contactPhone).toBeNull();
    expect(info.bankAccount).toBeNull();
    expect(info.showLocation).toBe(true);
  });

  it("caches reads until explicitly invalidated", async () => {
    await createCommunityInfo({ aboutText: "Keširani opis" });

    const first = await getCommunityInfo();
    expect(first.aboutText).toBe("Keširani opis");

    await prisma.communityInfo.update({
      where: { id: COMMUNITY_INFO_ID },
      data: { aboutText: "Ažurirani opis" },
    });

    const second = await getCommunityInfo();
    expect(second.aboutText).toBe("Keširani opis");

    invalidateCommunityInfo();

    const third = await getCommunityInfo();
    expect(third.aboutText).toBe("Ažurirani opis");
    expect(communityInfoHasContent(third)).toBe(true);
  });

  it("redacts content from hidden public sections without deleting it", async () => {
    await createCommunityInfo({
      showAbout: false,
      showContact: false,
      showImam: false,
      showBoard: false,
      showBank: false,
    });

    const storedInfo = await getCommunityInfo();
    const publicInfo = await getPublicCommunityInfo();

    expect(storedInfo.aboutText).toBe("Test džemat.");
    expect(storedInfo.imamEmail).toBe("imam@example.com");
    expect(publicInfo.aboutText).toBeNull();
    expect(publicInfo.imamEmail).toBeNull();
    expect(publicInfo.contactEmail).toBeNull();
    expect(publicInfo.bankAccount).toBeNull();
    expect(communityInfoHasContent(publicInfo)).toBe(false);
  });
});
