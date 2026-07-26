import { href } from "react-router";

import { beforeEach, describe, expect, it } from "vitest";

import { getActiveAnnouncement } from "#app/features/announcements/site-announcement.server";
import {
  action as siteAnnouncementAction,
  loader as siteAnnouncementLoader,
} from "#app/routes/admin.obavijesna-traka";
import { prisma } from "#app/server/db.server";

import { createSiteAnnouncement } from "../../factories";
import { expectData, payloadOf, statusOf } from "../../helpers/action-result";
import { createAdminSession, type AdminRouteContext } from "../../helpers/auth";
import { withHoneypot } from "../../helpers/honeypot";
import { callAction as runAction, callLoader as runLoader, testUrl } from "../../helpers/route";

const ENDPOINT = testUrl(href("/admin/obavijesna-traka"));

const callAction = (formData: FormData, context: AdminRouteContext) =>
  runAction(siteAnnouncementAction, { url: ENDPOINT, formData, context });

const callLoader = (context: AdminRouteContext) =>
  runLoader(siteAnnouncementLoader, { url: ENDPOINT, context });

type ConformReply = {
  result: { error: Record<string, string[] | undefined> };
};

describe("site announcement route", () => {
  let context: AdminRouteContext;

  // The integration setup truncates users + sessions between tests, so
  // we (re)create our admin in beforeEach. beforeEach runs *after* the
  // setup file's afterEach, which is what we want (the reverse is true
  // for afterEach hooks, which run inner→outer).
  beforeEach(async () => {
    ({ context } = await createAdminSession());
  });

  describe("loader", () => {
    it("returns active announcements first, then newest announcements", async () => {
      const oldActive = await createSiteAnnouncement({
        message: "Stara aktivna",
        isActive: true,
      });
      await prisma.siteAnnouncement.update({
        where: { id: oldActive.id },
        data: { createdAt: new Date("2026-05-01T10:00:00Z") },
      });
      const newestInactive = await createSiteAnnouncement({
        message: "Nova neaktivna",
        isActive: false,
      });
      await prisma.siteAnnouncement.update({
        where: { id: newestInactive.id },
        data: { createdAt: new Date("2026-05-03T10:00:00Z") },
      });
      const newestActive = await createSiteAnnouncement({
        message: "Nova aktivna",
        isActive: true,
      });
      await prisma.siteAnnouncement.update({
        where: { id: newestActive.id },
        data: { createdAt: new Date("2026-05-02T10:00:00Z") },
      });

      const result = expectData(await callLoader(context));

      expect(result.announcements.map((announcement) => announcement.message)).toEqual([
        "Nova aktivna",
        "Stara aktivna",
        "Nova neaktivna",
      ]);
    });
  });

  describe("create", () => {
    it("inserts an inactive announcement and leaves existing actives alone", async () => {
      const previouslyActive = await createSiteAnnouncement({
        message: "Prethodna",
        isActive: true,
      });

      const formData = new FormData();
      formData.set("intent", "create");
      formData.set("message", "Nova poruka koja nije aktivna");
      // isActive omitted -> shim treats it as false
      withHoneypot(formData);

      const result = await callAction(formData, context);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(302);

      const stillActive = await prisma.siteAnnouncement.findUnique({
        where: { id: previouslyActive.id },
      });
      expect(stillActive?.isActive).toBe(true);

      const inserted = await prisma.siteAnnouncement.findFirst({
        where: { message: "Nova poruka koja nije aktivna" },
      });
      expect(inserted?.isActive).toBe(false);
    });

    it("deactivates every other active row when the new one is created active", async () => {
      const a = await createSiteAnnouncement({ message: "A", isActive: true });
      const b = await createSiteAnnouncement({ message: "B", isActive: true });

      const formData = new FormData();
      formData.set("intent", "create");
      formData.set("message", "Nova aktivna poruka");
      formData.set("isActive", "on");
      withHoneypot(formData);

      await callAction(formData, context);

      const after = await prisma.siteAnnouncement.findMany({
        where: { id: { in: [a.id, b.id] } },
      });
      expect(after.every((row) => row.isActive === false)).toBe(true);

      const newRow = await prisma.siteAnnouncement.findFirst({
        where: { message: "Nova aktivna poruka" },
      });
      expect(newRow?.isActive).toBe(true);
    });

    it("returns 400 with a field error when the message is empty", async () => {
      const formData = new FormData();
      formData.set("intent", "create");
      formData.set("message", "   ");
      withHoneypot(formData);

      const result = await callAction(formData, context);

      expect(statusOf(result)).toBe(400);
      const body = payloadOf<ConformReply>(result);
      expect(body.result.error.message?.[0]).toMatch(/obavezna/i);
    });

    it("invalidates the public active-announcement cache after saving", async () => {
      await createSiteAnnouncement({ message: "Stara poruka", isActive: true });
      await expect(getActiveAnnouncement()).resolves.toEqual({ message: "Stara poruka" });

      const formData = new FormData();
      formData.set("intent", "create");
      formData.set("message", "Nova aktivna poruka");
      formData.set("isActive", "on");
      withHoneypot(formData);

      await callAction(formData, context);

      await expect(getActiveAnnouncement()).resolves.toEqual({ message: "Nova aktivna poruka" });
    });
  });

  describe("toggle", () => {
    it("activating a row deactivates every other active row in one transaction", async () => {
      const a = await createSiteAnnouncement({ message: "A", isActive: true });
      const target = await createSiteAnnouncement({ message: "Target", isActive: false });

      const formData = new FormData();
      formData.set("intent", "toggle");
      formData.set("id", target.id);
      withHoneypot(formData);

      await callAction(formData, context);

      const updatedA = await prisma.siteAnnouncement.findUnique({ where: { id: a.id } });
      const updatedTarget = await prisma.siteAnnouncement.findUnique({
        where: { id: target.id },
      });

      expect(updatedA?.isActive).toBe(false);
      expect(updatedTarget?.isActive).toBe(true);
    });

    it("deactivating an active row does not touch the others", async () => {
      const other = await createSiteAnnouncement({ message: "Other", isActive: false });
      const target = await createSiteAnnouncement({ message: "Target", isActive: true });

      const formData = new FormData();
      formData.set("intent", "toggle");
      formData.set("id", target.id);
      withHoneypot(formData);

      await callAction(formData, context);

      const updatedOther = await prisma.siteAnnouncement.findUnique({ where: { id: other.id } });
      const updatedTarget = await prisma.siteAnnouncement.findUnique({
        where: { id: target.id },
      });

      expect(updatedOther?.isActive).toBe(false);
      expect(updatedTarget?.isActive).toBe(false);
    });
  });

  describe("update", () => {
    it("activating an existing row deactivates every other active row", async () => {
      const a = await createSiteAnnouncement({ message: "A", isActive: true });
      const target = await createSiteAnnouncement({ message: "Target", isActive: false });

      const formData = new FormData();
      formData.set("intent", "update");
      formData.set("id", target.id);
      formData.set("message", "Target updated");
      formData.set("isActive", "on");
      withHoneypot(formData);

      const result = await callAction(formData, context);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(302);

      const updatedA = await prisma.siteAnnouncement.findUnique({ where: { id: a.id } });
      const updatedTarget = await prisma.siteAnnouncement.findUnique({
        where: { id: target.id },
      });

      expect(updatedA?.isActive).toBe(false);
      expect(updatedTarget).toMatchObject({ isActive: true, message: "Target updated" });
    });
  });

  describe("delete", () => {
    it("removes the row and leaves the rest untouched", async () => {
      const keeper = await createSiteAnnouncement({ message: "Keep me", isActive: true });
      const victim = await createSiteAnnouncement({ message: "Delete me", isActive: false });

      const formData = new FormData();
      formData.set("intent", "delete");
      formData.set("id", victim.id);
      withHoneypot(formData);

      await callAction(formData, context);

      expect(await prisma.siteAnnouncement.findUnique({ where: { id: victim.id } })).toBeNull();
      expect(await prisma.siteAnnouncement.findUnique({ where: { id: keeper.id } })).not.toBeNull();
    });
  });

  describe("auth context", () => {
    it("fails closed when invoked outside the admin middleware chain", async () => {
      const formData = new FormData();
      formData.set("intent", "delete");
      formData.set("id", "anything");
      withHoneypot(formData);

      await expect(runAction(siteAnnouncementAction, { url: ENDPOINT, formData })).rejects.toThrow(
        /context/i,
      );
    });
  });
});
