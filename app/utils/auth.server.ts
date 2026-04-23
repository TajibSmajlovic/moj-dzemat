import { redirect } from "react-router";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";

import { prisma } from "#app/utils/db.server";
import { logger } from "#app/utils/logger.server";
import { commitSession, destroySession, getSession } from "#app/utils/session.server";

/**
 * Authentication primitives. `moj-dzemat` only ever has admin sessions -
 * public visitors never log in, so every protected route uses
 * `requireAdmin()`. There is no public signup; admins are provisioned
 * via the seed script and activate their account through the password
 * reset flow.
 */

const BCRYPT_COST = 10;
const MIN_PASSWORD_LENGTH = 10;
const HIBP_URL = "https://api.pwnedpasswords.com/range/";

// ---- Password hashing / validation -------------------------------------

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Returns a short, stable fingerprint of a password hash. We embed it in
 * reset-token JWTs so changing the password invalidates every still-live
 * reset link without having to track them in the DB.
 */
export function passwordFingerprint(hashOrNull: string | null): string {
  // If the account has no password yet (first login), use a constant so
  // the initial reset link is still valid until the password is chosen.
  const source = hashOrNull ?? "__init__";
  return crypto.createHash("sha256").update(source).digest("base64url").slice(0, 16);
}

type PasswordProblem = { kind: "too-short" } | { kind: "breached" };

/**
 * Enforces the minimum length and checks HIBP k-anonymity. We never send
 * the full password to HIBP - only the first 5 chars of the SHA-1 hash.
 */
export async function validateNewPassword(password: string): Promise<PasswordProblem | null> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { kind: "too-short" };
  }
  try {
    const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const response = await fetch(`${HIBP_URL}${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!response.ok) {
      // HIBP unreachable - fail open (length check still applied).
      logger.warn({ status: response.status }, "HIBP lookup failed");
      return null;
    }
    const body = await response.text();
    const breached = body.split(/\r?\n/).some((line) => line.split(":")[0]?.trim() === suffix);
    return breached ? { kind: "breached" } : null;
  } catch (error) {
    logger.warn({ err: error }, "HIBP lookup threw");
    return null;
  }
}

// ---- Session / current user -------------------------------------------

export async function getUserIdFromSession(request: Request): Promise<string | null> {
  const cookieSession = await getSession(request.headers.get("Cookie"));
  const userId = cookieSession.get("userId");

  return userId ?? null;
}

export async function getCurrentUser(request: Request) {
  const userId = await getUserIdFromSession(request);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    logger.warn({ userId }, "session referenced missing user");
  }

  return user;
}

/**
 * Guard used on every `/admin/*` loader + action. Redirects to
 * `/prijava?redirectTo=<current>` if no valid session.
 */
export async function requireAdmin(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    const url = new URL(request.url);
    const params = new URLSearchParams({ redirectTo: url.pathname + url.search });
    logger.warn({ path: url.pathname, search: url.search }, "admin access denied");
    throw redirect(`/prijava?${params.toString()}`);
  }

  return user;
}

// ---- Login / logout ---------------------------------------------------

type LoginResult = { ok: true; headers: Headers } | { ok: false; reason: "invalid-credentials" };

export async function login({
  request,
  email,
  password,
}: {
  request: Request;
  email: string;
  password: string;
}): Promise<LoginResult> {
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, password: { select: { hash: true } } },
  });

  if (!user?.password) {
    // Run a dummy bcrypt compare anyway so attackers can't differentiate
    // "user does not exist" from "password wrong" via timing.
    await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalid.");
    logger.warn({ email: normalizedEmail }, "login failed");
    return { ok: false, reason: "invalid-credentials" };
  }

  const match = await verifyPassword(password, user.password.hash);
  if (!match) {
    logger.warn({ email: normalizedEmail, userId: user.id }, "login failed");
    return { ok: false, reason: "invalid-credentials" };
  }

  const cookieSession = await getSession(request.headers.get("Cookie"));
  cookieSession.set("userId", user.id);

  const headers = new Headers();
  headers.append("Set-Cookie", await commitSession(cookieSession));
  logger.info({ email: normalizedEmail, userId: user.id }, "login succeeded");

  return { ok: true, headers };
}

export async function logout(request: Request): Promise<Headers> {
  const userId = await getUserIdFromSession(request);
  const cookieSession = await getSession(request.headers.get("Cookie"));
  const headers = new Headers();
  headers.append("Set-Cookie", await destroySession(cookieSession));
  logger.info({ userId }, "logout succeeded");

  return headers;
}
