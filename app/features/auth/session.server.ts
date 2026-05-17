import { createCookie, createSessionStorage } from "react-router";

import { SESSION_MAX_AGE_MS, SESSION_MAX_AGE_SECONDS } from "#app/features/auth/auth-policy";
import { invariant } from "#app/lib/invariant";
import { prisma } from "#app/server/db.server";
import { env } from "#app/server/env.server";

const COOKIE_NAME = "mdz_session";

/**
   Stateful session storage. The cookie holds only the session id; the
   Session row in SQLite is the source of truth. That means logout
   invalidates instantly across devices (no waiting for token expiry)
   and we can list/kill sessions from admin tools later on.

   `SESSION_SECRET` is a comma-separated list: the first value signs
   newly issued cookies, all values verify incoming ones. Rotation is:
     1. prepend the new secret -> deploy -> cookies are now signed with it
     2. wait at least the configured max age -> all old-secret cookies have expired
     3. remove the old secret
 */

const secrets = env().SESSION_SECRET;
const isProd = env().NODE_ENV === "production";

const sessionCookie = createCookie(COOKIE_NAME, {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: isProd,
  secrets,
  maxAge: SESSION_MAX_AGE_SECONDS,
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
    invariant(data.userId, "userId required to create a session");

    const expirationDate = expires ?? new Date(Date.now() + SESSION_MAX_AGE_MS);

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
      await prisma.session.deleteMany({ where: { id } });
      return null;
    }

    return { userId: session.userId };
  },
  async updateData(id, data, expires) {
    if (!data.userId) return;

    const expirationDate = expires ?? new Date(Date.now() + SESSION_MAX_AGE_MS);

    await prisma.session.update({
      where: { id },
      data: { expirationDate },
    });
  },
  async deleteData(id) {
    if (!id) return;

    await prisma.session.deleteMany({ where: { id } });
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;
