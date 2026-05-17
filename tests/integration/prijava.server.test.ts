import { describe, expect, it } from "vitest";

import { DEFAULT_LOGGED_IN_REDIRECT, ROUTES } from "#app/lib/routes";
import { loader as loginLoader } from "#app/routes/prijava";

import { createUser } from "../factories";
import { callLoader } from "../helpers/route";
import { sessionCookieFor } from "../helpers/session";

describe("login route", () => {
  it("redirects an authenticated admin away from /prijava", async () => {
    const { user } = await createUser();
    const cookie = await sessionCookieFor(user.id);

    const result = await callLoader(loginLoader, {
      url: `http://localhost${ROUTES.login}`,
      cookie,
    });

    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(DEFAULT_LOGGED_IN_REDIRECT);
  });
});
