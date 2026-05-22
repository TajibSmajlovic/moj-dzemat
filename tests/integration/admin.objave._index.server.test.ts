import { beforeEach, describe, expect, it } from "vitest";

import { ADMIN_POSTS_PAGE_SIZE } from "#app/lib/pagination";
import { ROUTES, adminPostsPageHref } from "#app/lib/routes";
import {
  action as adminPostsAction,
  loader as adminPostsLoader,
} from "#app/routes/admin.objave._index";
import { prisma } from "#app/server/db.server";

import { createPost, createUser } from "../factories";
import { expectData } from "../helpers/action-result";
import { callAction as runAction, callLoader as runLoader, testUrl } from "../helpers/route";
import { sessionCookieFor } from "../helpers/session";

const ENDPOINT = testUrl(ROUTES.adminPosts);

const callLoader = (url: string, cookie: string) => runLoader(adminPostsLoader, { url, cookie });

const callAction = (formData: FormData, cookie: string) =>
  runAction(adminPostsAction, { url: ENDPOINT, formData, cookie });

async function createOrderedPosts(authorId: string, count: number) {
  const base = Date.parse("2026-04-22T12:00:00Z");
  const posts = [];

  for (let index = 0; index < count; index += 1) {
    const timestamp = new Date(base - index * 60_000);
    posts.push(
      await createPost({
        authorId,
        title: `Objava ${index + 1}`,
        slug: `objava-${index + 1}`,
        publishedAt: timestamp,
        createdAt: timestamp,
      }),
    );
  }

  return posts;
}

describe("admin posts list route", () => {
  let userId: string;
  let cookie: string;

  beforeEach(async () => {
    const { user } = await createUser();
    userId = user.id;
    cookie = await sessionCookieFor(user.id);
  });

  describe("loader", () => {
    it("returns the first page with pinned posts first and pagination metadata", async () => {
      await createPost({
        authorId: userId,
        title: "Zakačena objava",
        slug: "zakacena-objava",
        pinned: true,
        publishedAt: new Date("2026-04-01T10:00:00Z"),
        createdAt: new Date("2026-04-01T10:00:00Z"),
      });
      await createOrderedPosts(userId, ADMIN_POSTS_PAGE_SIZE);

      const result = expectData(await callLoader(ENDPOINT, cookie));

      expect(result.pagination).toMatchObject({
        page: 1,
        totalItems: ADMIN_POSTS_PAGE_SIZE + 1,
        totalPages: 2,
        rangeStart: 1,
        rangeEnd: ADMIN_POSTS_PAGE_SIZE,
      });
      expect(result.posts).toHaveLength(ADMIN_POSTS_PAGE_SIZE);
      expect(result.posts[0]).toMatchObject({ title: "Zakačena objava", pinned: true });
      expect(result.posts[0]?.status).toBe("published");
      expect(result.posts[1]?.title).toBe("Objava 1");
      expect(result.posts.at(-1)?.title).toBe(`Objava ${ADMIN_POSTS_PAGE_SIZE - 1}`);
    });

    it("includes draft posts in the admin list", async () => {
      await createPost({
        authorId: userId,
        title: "Sakriven nacrt",
        slug: "sakriven-nacrt",
        status: "draft",
      });

      const result = expectData(await callLoader(ENDPOINT, cookie));

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0]).toMatchObject({ title: "Sakriven nacrt", status: "draft" });
    });

    it("returns the later page slice for the requested page", async () => {
      const totalItems = ADMIN_POSTS_PAGE_SIZE + 5;
      await createOrderedPosts(userId, totalItems);

      const result = expectData(await callLoader(`${ENDPOINT}?page=2`, cookie));

      expect(result.pagination).toMatchObject({
        page: 2,
        totalItems,
        totalPages: 2,
        rangeStart: ADMIN_POSTS_PAGE_SIZE + 1,
        rangeEnd: totalItems,
      });
      expect(result.posts).toHaveLength(5);
      expect(result.posts.map((post) => post.title)).toEqual([
        `Objava ${ADMIN_POSTS_PAGE_SIZE + 1}`,
        `Objava ${ADMIN_POSTS_PAGE_SIZE + 2}`,
        `Objava ${ADMIN_POSTS_PAGE_SIZE + 3}`,
        `Objava ${ADMIN_POSTS_PAGE_SIZE + 4}`,
        `Objava ${ADMIN_POSTS_PAGE_SIZE + 5}`,
      ]);
    });

    it("treats invalid page params as page 1", async () => {
      await createOrderedPosts(userId, 3);

      const result = expectData(await callLoader(`${ENDPOINT}?page=banana`, cookie));

      expect(result.pagination.page).toBe(1);
      expect(result.posts.map((post) => post.title)).toEqual(["Objava 1", "Objava 2", "Objava 3"]);
    });

    it("redirects out-of-range pages to the last valid page", async () => {
      await createOrderedPosts(userId, ADMIN_POSTS_PAGE_SIZE + 5);

      const result = await callLoader(`${ENDPOINT}?page=9`, cookie);

      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(302);
      expect((result as Response).headers.get("Location")).toBe(adminPostsPageHref(2));
    });

    it("returns empty results and safe pagination metadata when there are no posts", async () => {
      const result = expectData(await callLoader(ENDPOINT, cookie));

      expect(result.posts).toEqual([]);
      expect(result.pagination).toMatchObject({
        page: 1,
        totalItems: 0,
        totalPages: 0,
        rangeStart: 0,
        rangeEnd: 0,
      });
    });
  });

  describe("action", () => {
    it("toggles featured and pinned for a post that lives on a later page", async () => {
      const posts = await createOrderedPosts(userId, ADMIN_POSTS_PAGE_SIZE + 1);
      const target = posts.at(-1)!;

      const toggleFeatured = new FormData();
      toggleFeatured.set("intent", "toggle-featured");
      toggleFeatured.set("id", target.id);

      const featuredResult = await callAction(toggleFeatured, cookie);
      expect(featuredResult).toMatchObject({ ok: true });
      const featuredPost = await prisma.post.findUnique({ where: { id: target.id } });
      expect(featuredPost?.featured).toBe(true);

      const togglePinned = new FormData();
      togglePinned.set("intent", "toggle-pinned");
      togglePinned.set("id", target.id);

      const pinnedResult = await callAction(togglePinned, cookie);
      expect(pinnedResult).toMatchObject({ ok: true });
      const pinnedPost = await prisma.post.findUnique({ where: { id: target.id } });
      expect(pinnedPost?.pinned).toBe(true);
    });

    it("publishes and unpublishes posts", async () => {
      const draft = await createPost({
        authorId: userId,
        status: "draft",
        publishedAt: new Date("2026-04-01T10:00:00Z"),
      });

      const publish = new FormData();
      publish.set("intent", "toggle-status");
      publish.set("id", draft.id);

      const publishResult = await callAction(publish, cookie);
      expect(publishResult).toMatchObject({ ok: true });
      const publishedPost = await prisma.post.findUnique({ where: { id: draft.id } });
      expect(publishedPost?.status).toBe("published");
      expect(publishedPost?.publishedAt.getTime()).toBeGreaterThan(draft.publishedAt.getTime());

      const unpublish = new FormData();
      unpublish.set("intent", "toggle-status");
      unpublish.set("id", draft.id);

      const unpublishResult = await callAction(unpublish, cookie);
      expect(unpublishResult).toMatchObject({ ok: true });
      const hiddenPost = await prisma.post.findUnique({ where: { id: draft.id } });
      expect(hiddenPost?.status).toBe("draft");
    });

    it("keeps the delete action working on paginated results and falls back from an empty last page", async () => {
      const posts = await createOrderedPosts(userId, ADMIN_POSTS_PAGE_SIZE + 1);
      const target = posts.at(-1)!;

      const beforeDelete = expectData(await callLoader(`${ENDPOINT}?page=2`, cookie));
      expect(beforeDelete.posts.map((post) => post.id)).toEqual([target.id]);

      const formData = new FormData();
      formData.set("intent", "delete");
      formData.set("id", target.id);

      const actionResult = await callAction(formData, cookie);
      expect(actionResult).toMatchObject({ ok: true });
      expect(await prisma.post.findUnique({ where: { id: target.id } })).toBeNull();

      const afterDelete = await callLoader(`${ENDPOINT}?page=2`, cookie);
      expect(afterDelete).toBeInstanceOf(Response);
      expect((afterDelete as Response).status).toBe(302);
      expect((afterDelete as Response).headers.get("Location")).toBe(ROUTES.adminPosts);
    });
  });
});
