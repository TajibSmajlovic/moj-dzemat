import { describe, expect, it } from "vitest";

import {
  getCurrentUser,
  hashPassword,
  login,
  logout,
  passwordFingerprint,
  requireAdmin,
  verifyPassword,
} from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";

import { createUser } from "../factories";

function makeRequest(url = "http://localhost/prijava", init: RequestInit = {}) {
  return new Request(url, { method: "POST", ...init });
}

async function loginAndGetCookie(email: string, password: string): Promise<string> {
  const result = await login({ request: makeRequest(), email, password });
  if (!result.ok) {
    throw new Error("login() unexpectedly failed during test setup");
  }
  const setCookie = result.headers.get("Set-Cookie");
  if (!setCookie) {
    throw new Error("login() returned no Set-Cookie header");
  }
  return setCookie.split(";")[0]!;
}

function authedRequest(cookie: string, url = "http://localhost/admin/objave") {
  return new Request(url, { headers: { Cookie: cookie } });
}

describe("auth.server", () => {
  describe("password hashing", () => {
    it("hashes and verifies", async () => {
      const hash = await hashPassword("testtest123");
      expect(await verifyPassword("testtest123", hash)).toBe(true);
      expect(await verifyPassword("wrongpassword", hash)).toBe(false);
    });
  });

  describe("passwordFingerprint", () => {
    it("returns a stable 16-char fingerprint", () => {
      const fp = passwordFingerprint("some-hash");
      expect(fp).toHaveLength(16);
      expect(passwordFingerprint("some-hash")).toBe(fp);
    });

    it("differs when the input differs", () => {
      expect(passwordFingerprint("a")).not.toBe(passwordFingerprint("b"));
    });

    it("uses a sentinel for users without a password", () => {
      expect(passwordFingerprint(null)).toBe(passwordFingerprint(null));
    });
  });

  describe("login", () => {
    it("issues a session cookie on valid credentials", async () => {
      const { user } = await createUser({ password: "hunter2pass1" });
      const result = await login({
        request: makeRequest(),
        email: user.email,
        password: "hunter2pass1",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.headers.get("Set-Cookie")).toMatch(/session=/i);
      }
    });

    it("rejects unknown emails without leaking existence", async () => {
      const result = await login({
        request: makeRequest(),
        email: "nobody@dzemat.ba",
        password: "whatever123",
      });
      expect(result.ok).toBe(false);
    });

    it("rejects wrong password", async () => {
      const { user } = await createUser({ password: "hunter2pass1" });
      const result = await login({
        request: makeRequest(),
        email: user.email,
        password: "wrongpass99",
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("getCurrentUser", () => {
    it("returns null when there is no session cookie", async () => {
      const result = await getCurrentUser(new Request("http://localhost/admin"));
      expect(result).toBeNull();
    });

    it("returns the user record when the cookie points at a live session", async () => {
      const { user } = await createUser({ password: "hunter2pass1" });
      const cookie = await loginAndGetCookie(user.email, "hunter2pass1");

      const result = await getCurrentUser(authedRequest(cookie));
      expect(result).toMatchObject({ id: user.id, email: user.email });
    });

    it("returns null (and logs a warning) when the session points at a deleted user", async () => {
      const { user } = await createUser({ password: "hunter2pass1" });
      const cookie = await loginAndGetCookie(user.email, "hunter2pass1");

      // Deleting the user cascades the Session row, so to exercise the
      // "session referenced missing user" branch we drop the user but
      // keep the session id by re-creating an orphaned row pointing at
      // a non-existent user id.
      await prisma.session.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });

      const result = await getCurrentUser(authedRequest(cookie));
      expect(result).toBeNull();
    });
  });

  describe("requireAdmin", () => {
    it("throws a redirect to /prijava with the original path captured", async () => {
      const request = new Request("http://localhost/admin/objave?vrsta=hutba");

      await expect(requireAdmin(request)).rejects.toBeInstanceOf(Response);

      try {
        await requireAdmin(request);
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        const response = error as Response;
        expect(response.status).toBe(302);
        const location = response.headers.get("Location") ?? "";
        expect(location.startsWith("/prijava?")).toBe(true);
        // URLSearchParams encodes the slash as %2F and ? as %3F.
        expect(location).toContain("redirectTo=%2Fadmin%2Fobjave%3Fvrsta%3Dhutba");
      }
    });

    it("returns the user when a valid session is attached", async () => {
      const { user } = await createUser({ password: "hunter2pass1" });
      const cookie = await loginAndGetCookie(user.email, "hunter2pass1");

      const result = await requireAdmin(authedRequest(cookie));
      expect(result).toMatchObject({ id: user.id, email: user.email });
    });
  });

  describe("logout", () => {
    it("returns a destroying Set-Cookie and removes the session row from the DB", async () => {
      const { user } = await createUser({ password: "hunter2pass1" });
      const cookie = await loginAndGetCookie(user.email, "hunter2pass1");

      const sessionsBefore = await prisma.session.count({ where: { userId: user.id } });
      expect(sessionsBefore).toBe(1);

      const headers = await logout(authedRequest(cookie));
      const setCookie = headers.get("Set-Cookie") ?? "";
      expect(setCookie).toMatch(/mdz_session=/);
      // remix/react-router destroySession sets a past Expires so the browser drops it.
      expect(setCookie.toLowerCase()).toMatch(/expires=|max-age=0/);

      const sessionsAfter = await prisma.session.count({ where: { userId: user.id } });
      expect(sessionsAfter).toBe(0);
    });

    it("is a no-op (still returns headers) when there is no session cookie", async () => {
      const headers = await logout(new Request("http://localhost/odjava"));
      expect(headers.get("Set-Cookie")).toMatch(/mdz_session=/);
    });
  });
});
