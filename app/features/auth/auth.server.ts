import { redirect } from "react-router";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";

import { MIN_PASSWORD_LENGTH } from "#app/features/auth/auth-policy";
import { commitSession, destroySession, getSession } from "#app/features/auth/session.server";
import { ROUTES } from "#app/lib/routes";
import { prisma } from "#app/server/db.server";
import { logger } from "#app/server/logger.server";

/**
  Always discards the inbound session id and starts a new one for the
  given userId. Used on every authentication boundary (login,
  password-reset completion) so a pre-auth cookie cannot survive into
  the authenticated context — defends against session fixation.
 */
async function rotateUserSession(request: Request, userId: string): Promise<Headers> {
  const oldSession = await getSession(request.headers.get("Cookie"));
  const destroyCookie = await destroySession(oldSession);

  const newSession = await getSession();
  newSession.set("userId", userId);
  const commitCookie = await commitSession(newSession);

  const headers = new Headers();
  headers.append("Set-Cookie", destroyCookie);
  headers.append("Set-Cookie", commitCookie);

  return headers;
}

/**
   Authentication primitives. `moj-dzemat` only ever has admin sessions -
   public visitors never log in, so every protected route uses
   `requireAdmin()`. There is no public signup; admins are provisioned
   via the seed script and activate their account through the password
   reset flow.
 */

const BCRYPT_COST = 10;
const HIBP_URL = "https://api.pwnedpasswords.com/range/";

// ---- Password hashing / validation -------------------------------------

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

type PasswordProblem = { kind: "too-short" } | { kind: "breached" };

/**
   Enforces the minimum length and checks HIBP k-anonymity. We never send
   the full password to HIBP - only the first 5 chars of the SHA-1 hash.
 */
export async function validateNewPassword(password: string): Promise<PasswordProblem | null> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { kind: "too-short" };
  }

  try {
    // HIBP's k-anonymity API mandates a SHA-1 digest; we only send the
    // first 5 chars and never store the value. Stored password hashes
    // use bcrypt (see `hashPassword` above).
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

async function getUserIdFromSession(request: Request): Promise<string | null> {
  const cookieSession = await getSession(request.headers.get("Cookie"));
  const userId = cookieSession.get("userId");

  return userId ?? null;
}

type CurrentUser = { id: string; email: string; name: string | null };

/**
   Per-request memo for the current user lookup. Keyed by the Request
   object so identical concurrent calls within one loader/action chain
   (e.g. `_public.tsx` + `requireAdmin` + downstream helpers) share a
   single DB hit. WeakMap entries are released when the request object
   is garbage-collected, which lines up with the React Router request
   lifecycle.
 */
const currentUserMemo = new WeakMap<Request, Promise<CurrentUser | null>>();

async function loadCurrentUser(request: Request): Promise<CurrentUser | null> {
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

export function getCurrentUser(request: Request): Promise<CurrentUser | null> {
  const cached = currentUserMemo.get(request);
  if (cached) return cached;

  const promise = loadCurrentUser(request);
  currentUserMemo.set(request, promise);

  return promise;
}

/**
   Guard used on every `/admin/*` loader + action. Redirects to
   `/prijava?redirectTo=<current>` if no valid session.
 */
export async function requireAdmin(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    const url = new URL(request.url);
    const params = new URLSearchParams({ redirectTo: url.pathname + url.search });

    logger.warn({ path: url.pathname, search: url.search }, "admin access denied");

    throw redirect(`${ROUTES.login}?${params.toString()}`);
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

  const headers = await rotateUserSession(request, user.id);

  logger.info({ email: normalizedEmail, userId: user.id }, "login succeeded");

  return { ok: true, headers };
}

/**
  Public wrapper around `rotateUserSession` for flows that authenticate
  outside of `login()` (e.g. password-reset completion).
 */
export async function startSessionFor(request: Request, userId: string): Promise<Headers> {
  return rotateUserSession(request, userId);
}

export async function logout(request: Request): Promise<Headers> {
  const userId = await getUserIdFromSession(request);
  const cookieSession = await getSession(request.headers.get("Cookie"));

  const headers = new Headers();
  headers.append("Set-Cookie", await destroySession(cookieSession));

  logger.info({ userId }, "logout succeeded");

  return headers;
}
