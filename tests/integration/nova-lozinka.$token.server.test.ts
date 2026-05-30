import crypto from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MIN_PASSWORD_LENGTH_MESSAGE } from "#app/features/auth/auth-policy";
import { passwordResetHref } from "#app/features/auth/auth-routes";
import { verifyPassword } from "#app/features/auth/auth.server";
import { signResetToken } from "#app/features/auth/reset-token.server";
import { getSession } from "#app/features/auth/session.server";
import { DEFAULT_LOGGED_IN_REDIRECT } from "#app/lib/routes";
import {
  action as newPasswordAction,
  loader as newPasswordLoader,
} from "#app/routes/nova-lozinka.$token";
import { prisma } from "#app/server/db.server";

import { createUser } from "../factories";
import { expectResponse, payloadOf, statusOf } from "../helpers/action-result";
import { withHoneypot } from "../helpers/honeypot";
import { callAction as runAction, callLoader as runLoader, testUrl } from "../helpers/route";

function sha1Suffix(password: string) {
  return crypto.createHash("sha1").update(password).digest("hex").toUpperCase().slice(5);
}

function passwordForm(password: string, confirmPassword = password) {
  const formData = new FormData();
  formData.set("password", password);
  formData.set("confirmPassword", confirmPassword);

  return withHoneypot(formData);
}

async function resetTokenForUser(userId: string) {
  const row = await prisma.password.findUnique({ where: { userId } });

  return signResetToken({
    userId,
    passwordUpdatedAt: row?.updatedAt ?? null,
  });
}

function callAction(token: string, formData: FormData) {
  return runAction(newPasswordAction, {
    url: testUrl(passwordResetHref(token)),
    params: { token },
    formData,
  });
}

function callLoader(token: string) {
  return runLoader(newPasswordLoader, {
    url: testUrl(passwordResetHref(token)),
    params: { token },
  });
}

type NewPasswordPayload = {
  result: { error?: Record<string, string[] | undefined> };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("new password route", () => {
  it("loader returns invalid data with status 400 for a bad token", async () => {
    const result = await callLoader("not.a.jwt");

    expect(statusOf(result)).toBe(400);
    expect(payloadOf<{ invalid: boolean }>(result).invalid).toBe(true);
  });

  it("sets the password, starts a session, and redirects for a valid token", async () => {
    const { user } = await createUser({ password: null });
    const token = await resetTokenForUser(user.id);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ABCDEF:1", { status: 200 }));

    const result = await callAction(token, passwordForm("brand-new-password"));

    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(DEFAULT_LOGGED_IN_REDIRECT);

    const passwordRow = await prisma.password.findUnique({ where: { userId: user.id } });
    expect(passwordRow).not.toBeNull();
    expect(await verifyPassword("brand-new-password", passwordRow!.hash)).toBe(true);

    const sessionCookie = response.headers.getSetCookie().at(-1)?.split(";")[0];
    expect(sessionCookie).toBeTruthy();
    const session = await getSession(sessionCookie);
    expect(session.get("userId")).toBe(user.id);
  });

  it("returns 400 when the password confirmation does not match", async () => {
    const { user } = await createUser();
    const token = await resetTokenForUser(user.id);

    const result = await callAction(token, passwordForm("brand-new-password", "different-one"));

    expect(statusOf(result)).toBe(400);
    expect(payloadOf<NewPasswordPayload>(result).result.error?.confirmPassword?.[0]).toMatch(
      /ne podudaraju/i,
    );
  });

  it("returns 400 when the new password is too short", async () => {
    const { user } = await createUser();
    const token = await resetTokenForUser(user.id);

    const result = await callAction(token, passwordForm("short"));

    expect(statusOf(result)).toBe(400);
    expect(payloadOf<NewPasswordPayload>(result).result.error?.password?.[0]).toBe(
      MIN_PASSWORD_LENGTH_MESSAGE,
    );
  });

  it("returns 400 when HIBP reports the password as breached", async () => {
    const { user } = await createUser();
    const token = await resetTokenForUser(user.id);
    const password = "publicly-breached-password";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(`${sha1Suffix(password)}:99\n`, {
        status: 200,
      }),
    );

    const result = await callAction(token, passwordForm(password));

    expect(statusOf(result)).toBe(400);
    expect(payloadOf<NewPasswordPayload>(result).result.error?.password?.[0]).toMatch(
      /javnim curenjima/i,
    );
  });

  it("throws 400 when the token is invalid", async () => {
    let thrown: unknown;
    try {
      await callAction("not.a.jwt", passwordForm("brand-new-password"));
    } catch (error) {
      thrown = error;
    }

    expectResponse(thrown, 400);
  });
});
