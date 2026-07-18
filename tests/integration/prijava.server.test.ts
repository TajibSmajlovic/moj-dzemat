import { href } from "react-router";

import { describe, expect, it } from "vitest";

import { action as loginAction, loader as loginLoader } from "#app/routes/prijava";

import { createUser } from "../factories";
import { payloadOf, statusOf } from "../helpers/action-result";
import { withHoneypot } from "../helpers/honeypot";
import { callAction, callLoader, testUrl } from "../helpers/route";
import { sessionCookieFor } from "../helpers/session";

const ENDPOINT = testUrl(href("/prijava"));

function loginForm({
  email = "admin@dzemat.ba",
  password = "hunter2pass1",
  redirectTo,
}: {
  email?: string;
  password?: string;
  redirectTo?: string;
} = {}) {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("password", password);
  if (redirectTo) formData.set("redirectTo", redirectTo);

  return withHoneypot(formData);
}

type LoginActionPayload = {
  result: { error?: Record<string, string[] | undefined> } | null;
  formError: string | null;
};

describe("login route", () => {
  it("redirects an authenticated admin away from /prijava", async () => {
    const { user } = await createUser();
    const cookie = await sessionCookieFor(user.id);

    const result = await callLoader(loginLoader, {
      url: ENDPOINT,
      cookie,
    });

    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(href("/admin/objave"));
  });

  it("carries a safe redirect target from the query into loader data", async () => {
    const result = await callLoader(loginLoader, {
      url: `${ENDPOINT}?redirectTo=${encodeURIComponent(href("/admin/vazni-datumi"))}`,
    });

    expect(result).not.toBeInstanceOf(Response);
    if (result instanceof Response) return;
    expect(result.redirectTo).toBe(href("/admin/vazni-datumi"));
  });

  it("issues a session and redirects to a safe internal target after successful login", async () => {
    await createUser({
      email: "admin@dzemat.ba",
      password: "hunter2pass1",
    });

    const result = await callAction(loginAction, {
      url: ENDPOINT,
      formData: loginForm({ redirectTo: href("/admin/obavijesna-traka") }),
      headers: { "fly-client-ip": "203.0.113.201" },
    });

    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(href("/admin/obavijesna-traka"));
    expect(response.headers.get("Set-Cookie")).toMatch(/mdz_session=/);
  });

  it("falls back from protocol-relative redirect targets after successful login", async () => {
    await createUser({
      email: "admin@dzemat.ba",
      password: "hunter2pass1",
    });

    const result = await callAction(loginAction, {
      url: ENDPOINT,
      formData: loginForm({ redirectTo: "//evil.example/admin" }),
      headers: { "fly-client-ip": "203.0.113.202" },
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("Location")).toBe(href("/admin/objave"));
  });

  it("returns a generic form error for invalid credentials", async () => {
    await createUser({
      email: "admin@dzemat.ba",
      password: "hunter2pass1",
    });

    const result = await callAction(loginAction, {
      url: ENDPOINT,
      formData: loginForm({ password: "wrong-password" }),
      headers: { "fly-client-ip": "203.0.113.203" },
    });

    expect(statusOf(result)).toBe(400);
    const body = payloadOf<LoginActionPayload>(result);
    expect(body.formError).toBeNull();
    expect(body.result?.error?.[""]?.[0]).toBe("Pogrešan email ili lozinka.");
  });

  it("returns 400 with field errors for invalid form data", async () => {
    const result = await callAction(loginAction, {
      url: ENDPOINT,
      formData: loginForm({ email: "not-an-email" }),
      headers: { "fly-client-ip": "203.0.113.204" },
    });

    expect(statusOf(result)).toBe(400);
    const body = payloadOf<LoginActionPayload>(result);
    expect(body.result?.error?.email?.[0]).toMatch(/ispravnu email/i);
  });

  it("rate-limits repeated login attempts for the same client IP", async () => {
    const ip = "203.0.113.205";

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const result = await callAction(loginAction, {
        url: ENDPOINT,
        formData: loginForm({ email: `missing-${attempt}@dzemat.ba` }),
        headers: { "fly-client-ip": ip },
      });
      expect(statusOf(result)).toBe(400);
    }

    const limited = await callAction(loginAction, {
      url: ENDPOINT,
      formData: loginForm({ email: "still-missing@dzemat.ba" }),
      headers: { "fly-client-ip": ip },
    });

    expect(statusOf(limited)).toBe(429);
    expect(payloadOf<LoginActionPayload>(limited).formError).toMatch(/previše pokušaja/i);
  });
});
