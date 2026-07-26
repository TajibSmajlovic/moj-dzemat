import { href, RouterContextProvider } from "react-router";

import { describe, expect, it, vi } from "vitest";

import { adminAuthMiddleware } from "#app/features/auth/admin-auth-middleware.server";
import { adminUserContext } from "#app/features/auth/auth-context";
import { loader as adminLayoutLoader, meta, middleware } from "#app/routes/admin";

import { createQuestion, createSiteAnnouncement } from "../../factories";
import { expectData, expectResponse } from "../../helpers/action-result";
import { createAdminSession } from "../../helpers/auth";
import { callLoader as runLoader, testUrl } from "../../helpers/route";

function callLoader(context: RouterContextProvider) {
  return runLoader(adminLayoutLoader, { url: testUrl(href("/admin")), context });
}

function middlewareArgs(path: string, cookie?: string) {
  const url = new URL(testUrl(path));
  const headers = new Headers(cookie ? { Cookie: cookie } : undefined);

  return {
    request: new Request(url, { headers }),
    url,
    pattern: "/admin/*",
    params: {},
    context: new RouterContextProvider(),
  };
}

describe("admin layout route", () => {
  it("marks inherited admin pages as noindex, nofollow", () => {
    expect(meta()).toContainEqual({ name: "robots", content: "noindex,nofollow" });
  });

  it("registers the admin authentication middleware on the protected route branch", () => {
    expect(middleware).toEqual([adminAuthMiddleware]);
  });

  it("stops the admin route chain and preserves the requested URL when unauthenticated", async () => {
    const args = middlewareArgs(`${href("/admin/objave")}?page=2`);
    const next = vi.fn(() => Promise.resolve(new Response()));
    let thrown: unknown;

    try {
      await adminAuthMiddleware(args, next);
    } catch (error) {
      thrown = error;
    }

    expectResponse(thrown, 302);
    expect(thrown.headers.get("Location")).toBe(
      `${href("/prijava")}?redirectTo=${encodeURIComponent(`${href("/admin/objave")}?page=2`)}`,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("adds the authenticated admin to context before continuing the route chain", async () => {
    const { cookie, user } = await createAdminSession();
    const args = middlewareArgs(href("/admin/objave"), cookie);
    const downstreamResponse = new Response(null, { status: 204 });
    const next = vi.fn(() => Promise.resolve(downstreamResponse));

    const result = await adminAuthMiddleware(args, next);

    expect(result).toBe(downstreamResponse);
    expect(next).toHaveBeenCalledOnce();
    expect(args.context.get(adminUserContext)).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  });

  it("returns nav indicators for pending questions and active announcement bar", async () => {
    const { context } = await createAdminSession();
    await createQuestion({ question: "Neodgovoreno pitanje?" });
    await createQuestion({
      question: "Odgovoreno pitanje?",
      answer: "Odgovoreno.",
      answeredAt: new Date("2026-05-02T10:00:00.000Z"),
    });
    await createSiteAnnouncement({ message: "Aktivna poruka", isActive: true });

    const result = expectData(await callLoader(context));

    expect(result.pendingQuestionCount).toBe(1);
    expect(result.hasActiveAnnouncement).toBe(true);
  });
});
