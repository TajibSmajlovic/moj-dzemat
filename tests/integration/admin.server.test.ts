import { describe, expect, it } from "vitest";

import { ROUTES } from "#app/lib/routes";
import { loader as adminLayoutLoader } from "#app/routes/admin";

import { createQuestion, createSiteAnnouncement } from "../factories";
import { expectData, expectResponse } from "../helpers/action-result";
import { createAdminSession } from "../helpers/auth";
import { callLoader as runLoader, testUrl } from "../helpers/route";

function callLoader(cookie?: string) {
  return runLoader(adminLayoutLoader, { url: testUrl(ROUTES.admin), cookie });
}

describe("admin layout route", () => {
  it("redirects unauthenticated visitors to login", async () => {
    let thrown: unknown;
    try {
      await callLoader();
    } catch (error) {
      thrown = error;
    }

    expectResponse(thrown, 302);
    expect(thrown.headers.get("Location")).toContain(ROUTES.login);
  });

  it("returns nav indicators for pending questions and active announcement bar", async () => {
    const { cookie } = await createAdminSession();
    await createQuestion({ question: "Neodgovoreno pitanje?" });
    await createQuestion({
      question: "Odgovoreno pitanje?",
      answer: "Odgovoreno.",
      answeredAt: new Date("2026-05-02T10:00:00.000Z"),
    });
    await createSiteAnnouncement({ message: "Aktivna poruka", isActive: true });

    const result = expectData(await callLoader(cookie));

    expect(result.pendingQuestionCount).toBe(1);
    expect(result.hasActiveAnnouncement).toBe(true);
  });
});
