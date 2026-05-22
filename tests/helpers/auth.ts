import { createUser } from "../factories";
import { sessionCookieFor } from "./session";

type CreateAdminSessionOptions = Parameters<typeof createUser>[0];

export async function createAdminSession(options: CreateAdminSessionOptions = {}) {
  const { user, password } = await createUser(options);
  const cookie = await sessionCookieFor(user.id);

  return { user, password, cookie };
}
