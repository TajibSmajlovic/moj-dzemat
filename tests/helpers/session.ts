import { commitSession, getSession } from "#app/features/auth/session.server";

/**
   Build a `Cookie:` header value tied to `userId` so `requireAdmin`
   inside a route loader/action accepts the test request. Returns just
   the `name=value` portion (no attributes) suitable for re-use in
   `Cookie:` headers.
 */
export async function sessionCookieFor(userId: string): Promise<string> {
  const session = await getSession(null);
  session.set("userId", userId);
  const setCookie = await commitSession(session);

  return setCookie.split(";")[0]!;
}
