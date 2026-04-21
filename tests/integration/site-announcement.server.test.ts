import { beforeEach, describe, expect, it, vi } from "vitest";

import { action as siteAnnouncementAction } from "#app/routes/admin.obavijesna-traka";
import { prisma } from "#app/utils/db.server";
import { honeypotToken } from "#app/utils/honeypot.server";
import { commitSession, getSession } from "#app/utils/session.server";

import { createSiteAnnouncement, createUser } from "../factories";

const ENDPOINT = "http://localhost/admin/obavijesna-traka";

/**
 * Build a session cookie tied to `userId` so `requireAdmin` inside the
 * route action accepts the call. Returns the cookie pair (`mdz_session=...`)
 * suitable for a `Cookie:` request header.
 */
async function sessionCookieFor(userId: string): Promise<string> {
  const session = await getSession(null);
  session.set("userId", userId);
  const setCookie = await commitSession(session);

  return setCookie.split(";")[0]!;
}

/**
 * The honeypot's `assertHoneypot` requires the form to be at least
 * `MIN_AGE_MS` (500ms) old. Mocking that constant would mean reaching
 * into module internals; instead we issue the token a second in the
 * "past" with fake timers, then jump back to "now" before submitting.
 * That keeps real wall-clock waits out of the suite.
 */
function freshHoneypotFields(): Record<string, string> {
  vi.useFakeTimers();
  const now = Date.now();
  // Issue the token 600ms in the past relative to whatever "now" is.
  vi.setSystemTime(now - 600);
  const token = honeypotToken();
  vi.setSystemTime(now);
  vi.useRealTimers();

  return token;
}

type ActionArgs = Parameters<typeof siteAnnouncementAction>[0];

async function callAction(formData: FormData, cookie: string) {
  const request = new Request(ENDPOINT, {
    method: "POST",
    body: formData,
    headers: { Cookie: cookie },
  });

  return siteAnnouncementAction({ request, params: {}, context: {} } as ActionArgs);
}

describe("site announcement action", () => {
  let cookie: string;

  // The integration setup truncates users + sessions between tests, so
  // we (re)create our admin in beforeEach. beforeEach runs *after* the
  // setup file's afterEach, which is what we want (the reverse is true
  // for afterEach hooks, which run inner→outer).
  beforeEach(async () => {
    const { user } = await createUser();
    cookie = await sessionCookieFor(user.id);
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
      for (const [key, value] of Object.entries(freshHoneypotFields())) {
        formData.set(key, value);
      }

      const result = await callAction(formData, cookie);
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

      for (const [key, value] of Object.entries(freshHoneypotFields())) {
        formData.set(key, value);
      }

      await callAction(formData, cookie);

      const after = await prisma.siteAnnouncement.findMany({
        where: { id: { in: [a.id, b.id] } },
      });
      expect(after.every((row) => row.isActive === false)).toBe(true);

      const newRow = await prisma.siteAnnouncement.findFirst({
        where: { message: "Nova aktivna poruka" },
      });
      expect(newRow?.isActive).toBe(true);
    });
  });

  describe("toggle", () => {
    it("activating a row deactivates every other active row in one transaction", async () => {
      const a = await createSiteAnnouncement({ message: "A", isActive: true });
      const target = await createSiteAnnouncement({ message: "Target", isActive: false });

      const formData = new FormData();
      formData.set("intent", "toggle");
      formData.set("id", target.id);

      for (const [key, value] of Object.entries(freshHoneypotFields())) {
        formData.set(key, value);
      }

      await callAction(formData, cookie);

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

      for (const [key, value] of Object.entries(freshHoneypotFields())) {
        formData.set(key, value);
      }

      await callAction(formData, cookie);

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
      for (const [key, value] of Object.entries(freshHoneypotFields())) {
        formData.set(key, value);
      }

      const result = await callAction(formData, cookie);
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

      for (const [key, value] of Object.entries(freshHoneypotFields())) {
        formData.set(key, value);
      }

      await callAction(formData, cookie);

      expect(await prisma.siteAnnouncement.findUnique({ where: { id: victim.id } })).toBeNull();
      expect(await prisma.siteAnnouncement.findUnique({ where: { id: keeper.id } })).not.toBeNull();
    });
  });

  describe("auth + honeypot", () => {
    it("redirects to /prijava when the request has no admin session", async () => {
      const formData = new FormData();
      formData.set("intent", "delete");
      formData.set("id", "anything");

      for (const [key, value] of Object.entries(freshHoneypotFields())) {
        formData.set(key, value);
      }
      const request = new Request(ENDPOINT, { method: "POST", body: formData });

      await expect(
        siteAnnouncementAction({ request, params: {}, context: {} } as ActionArgs),
      ).rejects.toBeInstanceOf(Response);
    });
  });
});
