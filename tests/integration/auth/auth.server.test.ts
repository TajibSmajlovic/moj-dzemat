import { href } from "react-router";

import { describe, expect, it, vi } from "vitest";

import {
  getCurrentUser,
  hashPassword,
  login,
  logout,
  requireAdmin,
  verifyPassword,
} from "#app/features/auth/auth.server";
import { getSession } from "#app/features/auth/session.server";
import { prisma } from "#app/server/db.server";

import { createUser } from "../../factories";
import { testUrl } from "../../helpers/route";

function makeRequest(url = href("/prijava"), init: RequestInit = {}) {
  return new Request(testUrl(url), { method: "POST", ...init });
}

/**
   `login()` issues two Set-Cookie headers (destroy old + commit new).
   `Headers.get("Set-Cookie")` would join them with a comma, which
   mangles `Expires=...` values, so we always use `getSetCookie()` and
   keep the *last* entry — that is the freshly-issued session cookie.
 */
function newSessionCookie(headers: Headers): string {
  const cookies = headers.getSetCookie();
  if (cookies.length === 0) {
    throw new Error("expected at least one Set-Cookie header");
  }
  const latest = cookies.at(-1)!;
  return latest.split(";")[0]!;
}

async function loginAndGetCookie(email: string, password: string): Promise<string> {
  const result = await login({ request: makeRequest(), email, password });
  if (!result.ok) {
    throw new Error("login() unexpectedly failed during test setup");
  }
  return newSessionCookie(result.headers);
}

function authedRequest(cookie: string, url = `http://localhost${href("/admin/objave")}`) {
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

    it("normalizes email casing before looking up credentials", async () => {
      const { user } = await createUser({
        email: "admin@dzemat.ba",
        password: "hunter2pass1",
      });
      const result = await login({
        request: makeRequest(),
        email: "ADMIN@DZEMAT.BA",
        password: "hunter2pass1",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const cookie = newSessionCookie(result.headers);
        const session = await getSession(cookie);
        expect(session.get("userId")).toBe(user.id);
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

    it("rotates the session id on every login (defends against fixation)", async () => {
      const { user } = await createUser({ password: "hunter2pass1" });

      // Establish a baseline session A from a first login.
      const cookieA = await loginAndGetCookie(user.email, "hunter2pass1");
      const sessionA = await getSession(cookieA);
      const idA = sessionA.id;
      expect(idA).toBeTruthy();
      expect(await prisma.session.findUnique({ where: { id: idA } })).not.toBeNull();

      // A second login that *carries cookie A* must NOT reuse session A.
      // The old row gets destroyed and a brand new row replaces it.
      const second = await login({
        request: makeRequest(href("/prijava"), {
          headers: { Cookie: cookieA },
        }),
        email: user.email,
        password: "hunter2pass1",
      });
      if (!second.ok) {
        throw new Error("expected second login to succeed");
      }

      const cookieB = newSessionCookie(second.headers);
      expect(cookieB).not.toBe(cookieA);

      const sessionB = await getSession(cookieB);
      expect(sessionB.id).toBeTruthy();
      expect(sessionB.id).not.toBe(idA);

      expect(await prisma.session.findUnique({ where: { id: idA } })).toBeNull();
      expect(await prisma.session.findUnique({ where: { id: sessionB.id } })).toMatchObject({
        userId: user.id,
      });
    });
  });

  describe("getCurrentUser", () => {
    it("returns null when there is no session cookie", async () => {
      const result = await getCurrentUser(new Request(`http://localhost${href("/admin")}`));
      expect(result).toBeNull();
    });

    it("returns the user record when the cookie points at a live session", async () => {
      const { user } = await createUser({ password: "hunter2pass1" });
      const cookie = await loginAndGetCookie(user.email, "hunter2pass1");

      const result = await getCurrentUser(authedRequest(cookie));
      expect(result).toMatchObject({ id: user.id, email: user.email });
    });

    it("memoizes the user lookup for repeated calls with the same Request", async () => {
      const { user } = await createUser({ password: "hunter2pass1" });
      const cookie = await loginAndGetCookie(user.email, "hunter2pass1");
      const request = authedRequest(cookie);
      const findUnique = vi.spyOn(prisma.user, "findUnique");

      const first = await getCurrentUser(request);
      const second = await getCurrentUser(request);

      expect(first).toMatchObject({ id: user.id, email: user.email });
      expect(second).toBe(first);
      expect(findUnique).toHaveBeenCalledTimes(1);
    });

    it("returns null when the cookie points at a deleted session row", async () => {
      const { user } = await createUser({ password: "hunter2pass1" });
      const cookie = await loginAndGetCookie(user.email, "hunter2pass1");

      // Deleting the user cascades the Session row, leaving the browser
      // with a cookie whose server-side session no longer exists.
      await prisma.session.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });

      const result = await getCurrentUser(authedRequest(cookie));
      expect(result).toBeNull();
    });
  });

  describe("requireAdmin", () => {
    it("throws a redirect to /prijava with the original path captured", async () => {
      const request = new Request(`${testUrl(href("/admin/objave"))}?vrsta=hutba`);

      let thrown: unknown;
      try {
        await requireAdmin(request, new URL(request.url));
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(Response);
      const response = thrown as Response;
      expect(response.status).toBe(302);
      const location = response.headers.get("Location") ?? "";
      expect(location.startsWith(`${href("/prijava")}?`)).toBe(true);
      // URLSearchParams encodes the slash as %2F and ? as %3F.
      expect(location).toContain(
        `redirectTo=${encodeURIComponent(`${href("/admin/objave")}?vrsta=hutba`)}`,
      );
    });

    it("returns the user when a valid session is attached", async () => {
      const { user } = await createUser({ password: "hunter2pass1" });
      const cookie = await loginAndGetCookie(user.email, "hunter2pass1");
      const request = authedRequest(cookie);

      const result = await requireAdmin(request, new URL(request.url));
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
      const headers = await logout(new Request(`http://localhost${href("/odjava")}`));
      expect(headers.get("Set-Cookie")).toMatch(/mdz_session=/);
    });
  });
});
