import { describe, expect, it } from "vitest";

import { commitSession, getSession } from "#app/features/auth/session.server";
import { prisma } from "#app/server/db.server";

import { createUser } from "../../factories";

/**
 * End-to-end of the session cookie: we store a userId, commit the
 * cookie, parse it back via `getSession`, and confirm both the
 * round-tripped value and the persistent Session row.
 */
describe("session.server", () => {
  it("round-trips a userId via commit/get", async () => {
    const { user } = await createUser();
    const session = await getSession(null);
    session.set("userId", user.id);

    const cookie = await commitSession(session);
    expect(cookie).toMatch(/mdz_session=/);

    const parsed = await getSession(cookie);
    expect(parsed.get("userId")).toBe(user.id);

    const rows = await prisma.session.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
  });

  it("returns null data for unknown session ids without throwing", async () => {
    const parsed = await getSession("mdz_session=not-a-real-id");
    expect(parsed.get("userId")).toBeUndefined();
  });
});
