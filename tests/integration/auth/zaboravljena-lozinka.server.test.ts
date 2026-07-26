import { href } from "react-router";

import { describe, expect, it } from "vitest";

import { action as forgotPasswordAction } from "#app/routes/zaboravljena-lozinka";
import { getLastCapturedEmail } from "#app/server/email.server";

import { createUser } from "../../factories";
import { expectResponse, payloadOf, statusOf } from "../../helpers/action-result";
import { withHoneypot } from "../../helpers/honeypot";
import { callAction, testUrl } from "../../helpers/route";

const ENDPOINT = testUrl(href("/zaboravljena-lozinka"));

function forgotForm(email: string) {
  const formData = new FormData();
  formData.set("email", email);

  return withHoneypot(formData);
}

type ForgotPayload = {
  result: { error?: Record<string, string[] | undefined> } | null;
  sent: boolean;
};

describe("forgot password route", () => {
  it("returns the same sent response for an unknown email address", async () => {
    const result = await callAction(forgotPasswordAction, {
      url: ENDPOINT,
      formData: forgotForm("missing@dzemat.ba"),
      headers: { "fly-client-ip": "203.0.113.211" },
    });

    expect(statusOf(result)).toBe(200);
    expect(payloadOf<ForgotPayload>(result)).toMatchObject({
      sent: true,
    });
  });

  it("captures a reset email for a known admin email", async () => {
    await createUser({
      email: "admin@dzemat.ba",
      password: "hunter2pass1",
    });

    const result = await callAction(forgotPasswordAction, {
      url: ENDPOINT,
      formData: forgotForm("ADMIN@DZEMAT.BA"),
      headers: { "fly-client-ip": "203.0.113.212" },
    });

    expect(statusOf(result)).toBe(200);
    expect(payloadOf<ForgotPayload>(result).sent).toBe(true);
    expect(getLastCapturedEmail()).toMatchObject({
      to: "admin@dzemat.ba",
      subject: "Postavljanje nove lozinke",
    });
  });

  it("returns 400 with field errors for invalid email input", async () => {
    const result = await callAction(forgotPasswordAction, {
      url: ENDPOINT,
      formData: forgotForm("not-an-email"),
      headers: { "fly-client-ip": "203.0.113.213" },
    });

    expect(statusOf(result)).toBe(400);
    expect(payloadOf<ForgotPayload>(result).sent).toBe(false);
    expect(payloadOf<ForgotPayload>(result).result?.error?.email?.[0]).toMatch(
      /ispravnu e-mail adresu/i,
    );
  });

  it("rejects submissions that fail the honeypot check", async () => {
    const formData = new FormData();
    formData.set("email", "admin@dzemat.ba");

    let thrown: unknown;
    try {
      await callAction(forgotPasswordAction, {
        url: ENDPOINT,
        formData,
        headers: { "fly-client-ip": "203.0.113.214" },
      });
    } catch (error) {
      thrown = error;
    }

    expectResponse(thrown, 400);
  });

  it("rate-limits repeated submissions from the same client IP", async () => {
    const ip = "203.0.113.215";

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const result = await callAction(forgotPasswordAction, {
        url: ENDPOINT,
        formData: forgotForm(`missing-${attempt}@dzemat.ba`),
        headers: { "fly-client-ip": ip },
      });
      expect(statusOf(result)).toBe(200);
      expect(payloadOf<ForgotPayload>(result).sent).toBe(true);
    }

    const limited = await callAction(forgotPasswordAction, {
      url: ENDPOINT,
      formData: forgotForm("still-missing@dzemat.ba"),
      headers: { "fly-client-ip": ip },
    });

    expect(statusOf(limited)).toBe(429);
    expect(payloadOf<ForgotPayload>(limited)).toMatchObject({
      result: null,
      sent: true,
    });
  });
});
