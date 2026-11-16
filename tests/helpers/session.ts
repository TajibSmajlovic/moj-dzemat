import { commitSession, getSession } from "#app/features/auth/session.server";

/**
   Build a `Cookie:` header value tied to `userId` so authentication
   resolves the test user through the real session storage. Returns just
   the `name=value` portion (no attributes) suitable for re-use in
   `Cookie:` headers.
 */
export async function sessionCookieFor(userId: string): Promise<string> {
  const session = await getSession(null);
  session.set("userId", userId);
  const cookieHeader = await commitSession(session);

  return cookieHeader.split(";", 1)[0]!;
}
