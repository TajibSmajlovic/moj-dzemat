import { beforeEach, describe, expect, it } from "vitest";

import {
  action as adminPostsAction,
  loader as adminPostsLoader,
} from "#app/routes/admin.objave._index";
import { prisma } from "#app/utils/db.server";
import { commitSession, getSession } from "#app/utils/session.server";

import { createPost, createUser } from "../factories";

const ENDPOINT = "http://localhost/admin/objave";

type LoaderArgs = Parameters<typeof adminPostsLoader>[0];
type ActionArgs = Parameters<typeof adminPostsAction>[0];

async function sessionCookieFor(userId: string): Promise<string> {
  const session = await getSession(null);
  session.set("userId", userId);
  const setCookie = await commitSession(session);

  return setCookie.split(";")[0]!;
}

async function callLoader(url: string, cookie: string) {
  const request = new Request(url, { headers: { Cookie: cookie } });

  return adminPostsLoader({ request, params: {}, context: {} } as LoaderArgs);
}

async function callAction(formData: FormData, cookie: string) {
  const request = new Request(ENDPOINT, {
    method: "POST",
    body: formData,
    headers: { Cookie: cookie },
  });

  return adminPostsAction({ request, params: {}, context: {} } as ActionArgs);
}

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

function expectLoaderData(result: Awaited<ReturnType<typeof adminPostsLoader>>) {
  expect(result).not.toBeInstanceOf(Response);

  return result as Exclude<Awaited<ReturnType<typeof adminPostsLoader>>, Response>;
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
      await createOrderedPosts(userId, 20);

      const result = expectLoaderData(await callLoader(ENDPOINT, cookie));

      expect(result.pagination).toMatchObject({
        page: 1,
        totalItems: 21,
        totalPages: 2,
        rangeStart: 1,
        rangeEnd: 20,
      });
      expect(result.posts).toHaveLength(20);
      expect(result.posts[0]).toMatchObject({ title: "Zakačena objava", pinned: true });
      expect(result.posts[1]?.title).toBe("Objava 1");
      expect(result.posts.at(-1)?.title).toBe("Objava 19");
    });

    it("returns the later page slice for the requested page", async () => {
      await createOrderedPosts(userId, 25);

      const result = expectLoaderData(await callLoader(`${ENDPOINT}?page=2`, cookie));

      expect(result.pagination).toMatchObject({
        page: 2,
        totalItems: 25,
        totalPages: 2,
        rangeStart: 21,
        rangeEnd: 25,
      });
      expect(result.posts).toHaveLength(5);
      expect(result.posts.map((post) => post.title)).toEqual([
        "Objava 21",
        "Objava 22",
        "Objava 23",
        "Objava 24",
        "Objava 25",
      ]);
    });

    it("treats invalid page params as page 1", async () => {
      await createOrderedPosts(userId, 3);

      const result = expectLoaderData(await callLoader(`${ENDPOINT}?page=banana`, cookie));

      expect(result.pagination.page).toBe(1);
      expect(result.posts.map((post) => post.title)).toEqual(["Objava 1", "Objava 2", "Objava 3"]);
    });

    it("redirects out-of-range pages to the last valid page", async () => {
      await createOrderedPosts(userId, 25);

      const result = await callLoader(`${ENDPOINT}?page=9`, cookie);

      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(302);
      expect((result as Response).headers.get("Location")).toBe("/admin/objave?page=2");
    });

    it("returns empty results and safe pagination metadata when there are no posts", async () => {
      const result = expectLoaderData(await callLoader(ENDPOINT, cookie));

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
      const posts = await createOrderedPosts(userId, 21);
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

    it("keeps the delete action working on paginated results and falls back from an empty last page", async () => {
      const posts = await createOrderedPosts(userId, 21);
      const target = posts.at(-1)!;

      const beforeDelete = expectLoaderData(await callLoader(`${ENDPOINT}?page=2`, cookie));
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
      expect((afterDelete as Response).headers.get("Location")).toBe("/admin/objave");
    });
  });
});
