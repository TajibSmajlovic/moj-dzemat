import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getActiveAnnouncement,
  invalidateActiveAnnouncement,
} from "#app/features/announcements/site-announcement.server";
import { prisma } from "#app/server/db.server";

import { createSiteAnnouncement } from "../factories";

beforeEach(() => {
  invalidateActiveAnnouncement();
});

afterEach(() => {
  invalidateActiveAnnouncement();
  vi.restoreAllMocks();
});

describe("site-announcement.server", () => {
  it("returns the newest active announcement", async () => {
    const oldActive = await createSiteAnnouncement({ message: "Stara aktivna", isActive: true });
    await prisma.siteAnnouncement.update({
      where: { id: oldActive.id },
      data: { createdAt: new Date("2026-05-01T10:00:00.000Z") },
    });
    await createSiteAnnouncement({ message: "Neaktivna", isActive: false });
    const newestActive = await createSiteAnnouncement({
      message: "Nova aktivna",
      isActive: true,
    });
    await prisma.siteAnnouncement.update({
      where: { id: newestActive.id },
      data: { createdAt: new Date("2026-05-02T10:00:00.000Z") },
    });

    await expect(getActiveAnnouncement()).resolves.toEqual({ message: "Nova aktivna" });
  });

  it("caches a positive lookup inside the TTL window", async () => {
    await createSiteAnnouncement({ message: "Aktivna", isActive: true });
    const findFirst = vi.spyOn(prisma.siteAnnouncement, "findFirst");

    await expect(getActiveAnnouncement()).resolves.toEqual({ message: "Aktivna" });
    await expect(getActiveAnnouncement()).resolves.toEqual({ message: "Aktivna" });

    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it("caches a negative lookup inside the TTL window", async () => {
    const findFirst = vi.spyOn(prisma.siteAnnouncement, "findFirst");

    await expect(getActiveAnnouncement()).resolves.toBeNull();
    await expect(getActiveAnnouncement()).resolves.toBeNull();

    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it("refetches after explicit invalidation", async () => {
    await createSiteAnnouncement({ message: "Stara", isActive: true });
    const findFirst = vi.spyOn(prisma.siteAnnouncement, "findFirst");

    await expect(getActiveAnnouncement()).resolves.toEqual({ message: "Stara" });
    await prisma.siteAnnouncement.updateMany({ data: { isActive: false } });
    await createSiteAnnouncement({ message: "Nova", isActive: true });

    invalidateActiveAnnouncement();

    await expect(getActiveAnnouncement()).resolves.toEqual({ message: "Nova" });
    expect(findFirst).toHaveBeenCalledTimes(2);
  });
});
