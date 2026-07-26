import { describe, expect, it } from "vitest";

import { PostAdminIntents } from "#app/features/posts/admin/post-intents";
import { adminPostPreviewHref } from "#app/features/posts/post-routes";
import {
  action as previewAction,
  loader as previewLoader,
} from "#app/routes/admin.objave.$id_.pregled";
import { prisma } from "#app/server/db.server";

import { createPost, createUser } from "../../factories";
import { expectData, expectResponse } from "../../helpers/action-result";
import { createAdminSession, type AdminRouteContext } from "../../helpers/auth";
import { callAction as runAction, callLoader as runLoader, testUrl } from "../../helpers/route";

function callLoader(id: string, context: AdminRouteContext) {
  return runLoader(previewLoader, {
    url: testUrl(adminPostPreviewHref(id)),
    params: { id },
    pattern: "/admin/objave/:id/pregled",
    context,
  });
}

function callAction(id: string, formData: FormData, context: AdminRouteContext) {
  return runAction(previewAction, {
    url: testUrl(adminPostPreviewHref(id)),
    params: { id },
    pattern: "/admin/objave/:id/pregled",
    formData,
    context,
  });
}

describe("admin post preview route", () => {
  it("loader returns draft posts for admin preview", async () => {
    const { user, context } = await createAdminSession();
    const draft = await createPost({
      authorId: user.id,
      title: "Nacrt za pregled",
      slug: "nacrt-za-pregled",
      status: "draft",
      pinned: true,
    });

    const result = expectData(await callLoader(draft.id, context));

    expect(result.post).toMatchObject({
      id: draft.id,
      title: "Nacrt za pregled",
      slug: "nacrt-za-pregled",
      status: "draft",
      pinned: true,
    });
    expect(result.siteUrl).toMatch(/^https?:\/\//);
  });

  it("loader throws 404 for an unknown post id", async () => {
    const { context } = await createAdminSession();

    let thrown: unknown;
    try {
      await callLoader("missing-post", context);
    } catch (error) {
      thrown = error;
    }

    expectResponse(thrown, 404);
  });

  it("action toggles a draft to published and redirects back to preview with a toast", async () => {
    const { user, context } = await createAdminSession();
    const draft = await createPost({
      authorId: user.id,
      status: "draft",
      publishedAt: new Date("2026-04-01T10:00:00.000Z"),
    });
    const formData = new FormData();
    formData.set("intent", PostAdminIntents.ToggleStatus);

    const result = await callAction(draft.id, formData, context);

    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toBe(adminPostPreviewHref(draft.id));
    expect(result.headers.get("Set-Cookie")).toMatch(/mdz_toast=/);

    const stored = await prisma.post.findUnique({ where: { id: draft.id } });
    expect(stored?.status).toBe("published");
    expect(stored?.publishedAt.getTime()).toBeGreaterThan(draft.publishedAt.getTime());
  });

  it("action rejects unsupported intents", async () => {
    const { user, context } = await createAdminSession();
    const post = await createPost({ authorId: user.id });
    const formData = new FormData();
    formData.set("intent", PostAdminIntents.Delete);

    let thrown: unknown;
    try {
      await callAction(post.id, formData, context);
    } catch (error) {
      thrown = error;
    }

    expectResponse(thrown, 400);
  });

  it("action fails closed when invoked without the admin middleware context", async () => {
    const { user } = await createUser();
    const post = await createPost({ authorId: user.id });
    const formData = new FormData();
    formData.set("intent", PostAdminIntents.ToggleStatus);

    await expect(
      runAction(previewAction, {
        url: testUrl(adminPostPreviewHref(post.id)),
        params: { id: post.id },
        pattern: "/admin/objave/:id/pregled",
        formData,
      }),
    ).rejects.toThrow(/context/i);
  });
});
