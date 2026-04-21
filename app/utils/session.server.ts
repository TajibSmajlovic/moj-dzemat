import { createCookie, createSessionStorage } from "react-router";

import { prisma } from "#app/utils/db.server";
import { env } from "#app/utils/env.server";

const COOKIE_NAME = "mdz_session";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Stateful session storage. The cookie holds only the session id; the
 * Session row in SQLite is the source of truth. That means logout
 * invalidates instantly across devices (no waiting for token expiry)
 * and we can list/kill sessions from admin tools later on.
 *
 * `SESSION_SECRET` is a comma-separated list: the first value signs
 * newly issued cookies, all values verify incoming ones. Rotation is:
 *   1. prepend the new secret -> deploy -> cookies are now signed with it
 *   2. wait at least 30 days -> all old-secret cookies have expired
 *   3. remove the old secret
 */

const secrets = env().SESSION_SECRET;
const isProd = env().NODE_ENV === "production";

const sessionCookie = createCookie(COOKIE_NAME, {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: isProd,
  secrets,
  maxAge: THIRTY_DAYS_MS / 1000,
});

type SessionData = {
  userId: string;
};

type SessionFlashData = {
  error: string;
  success: string;
};

const sessionStorage = createSessionStorage<SessionData, SessionFlashData>({
  cookie: sessionCookie,
  async createData(data, expires) {
    if (!data.userId) {
      throw new Error("userId required to create a session");
    }
    const expirationDate = expires ?? new Date(Date.now() + THIRTY_DAYS_MS);
    const session = await prisma.session.create({
      data: { userId: data.userId, expirationDate },
      select: { id: true },
    });
    return session.id;
  },
  async readData(id) {
    const session = await prisma.session.findUnique({
      where: { id },
      select: { userId: true, expirationDate: true },
    });
    if (!session) return null;
    if (session.expirationDate.getTime() < Date.now()) {
      await prisma.session.delete({ where: { id } }).catch(() => undefined);
      return null;
    }
    return { userId: session.userId };
  },
  async updateData(id, data, expires) {
    if (!data.userId) return;
    const expirationDate = expires ?? new Date(Date.now() + THIRTY_DAYS_MS);
    await prisma.session.update({
      where: { id },
      data: { expirationDate },
    });
  },
  async deleteData(id) {
    await prisma.session.delete({ where: { id } }).catch(() => undefined);
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;
