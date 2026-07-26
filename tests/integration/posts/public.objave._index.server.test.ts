import { href } from "react-router";

import { describe, expect, it } from "vitest";

import { postsArchiveHref } from "#app/features/posts/post-routes";
import type { PostTypeValue } from "#app/features/posts/post-type";
import { PUBLIC_POSTS_PAGE_SIZE } from "#app/lib/pagination";
import { loader as objaveLoader } from "#app/routes/_public.objave._index";

import { createPost } from "../../factories";
import { expectData } from "../../helpers/action-result";
import { callLoader as runLoader, testUrl } from "../../helpers/route";

const ENDPOINT = testUrl(href("/objave"));

const callLoader = (url: string) => runLoader(objaveLoader, { url });

async function createOrderedPosts({
  count,
  type = "obavijest",
  titlePrefix = "Objava",
  slugPrefix = "objava",
}: {
  count: number;
  type?: PostTypeValue;
  titlePrefix?: string;
  slugPrefix?: string;
}) {
  const base = Date.parse("2026-05-01T12:00:00Z");

  for (let index = 0; index < count; index += 1) {
    const timestamp = new Date(base - index * 60_000);
    await createPost({
      title: `${titlePrefix} ${index + 1}`,
      slug: `${slugPrefix}-${index + 1}`,
      type,
      publishedAt: timestamp,
      createdAt: timestamp,
    });
  }
}

describe("public objave index route", () => {
  it("returns the first progressive batch of published posts", async () => {
    const totalItems = PUBLIC_POSTS_PAGE_SIZE + 2;
    await createOrderedPosts({ count: totalItems });
    await createPost({
      title: "Sakrivena objava",
      slug: "sakrivena-objava",
      status: "draft",
    });

    const result = expectData(await callLoader(ENDPOINT));

    expect(result.activeType).toBe("all");
    expect(result.pagination).toMatchObject({
      page: 1,
      totalItems,
      totalPages: 2,
      take: PUBLIC_POSTS_PAGE_SIZE,
      visibleItems: PUBLIC_POSTS_PAGE_SIZE,
      hasNextPage: true,
    });
    expect(result.posts).toHaveLength(PUBLIC_POSTS_PAGE_SIZE);
    expect(result.posts.map((post) => post.title)).toEqual(
      Array.from({ length: PUBLIC_POSTS_PAGE_SIZE }, (_, index) => `Objava ${index + 1}`),
    );
  });

  it("keeps earlier posts when loading a later page", async () => {
    const totalItems = PUBLIC_POSTS_PAGE_SIZE * 2 + 5;
    await createOrderedPosts({ count: totalItems });

    const result = expectData(await callLoader(`${ENDPOINT}?page=2`));

    expect(result.pagination).toMatchObject({
      page: 2,
      totalItems,
      totalPages: 3,
      take: PUBLIC_POSTS_PAGE_SIZE * 2,
      visibleItems: PUBLIC_POSTS_PAGE_SIZE * 2,
      hasNextPage: true,
    });
    expect(result.posts).toHaveLength(PUBLIC_POSTS_PAGE_SIZE * 2);
    expect(result.posts[0]?.title).toBe("Objava 1");
    expect(result.posts.at(-1)?.title).toBe(`Objava ${PUBLIC_POSTS_PAGE_SIZE * 2}`);
  });

  it("resets invalid page params to the first batch", async () => {
    await createOrderedPosts({ count: 3 });

    const result = expectData(await callLoader(`${ENDPOINT}?page=banana`));

    expect(result.pagination.page).toBe(1);
    expect(result.posts.map((post) => post.title)).toEqual(["Objava 1", "Objava 2", "Objava 3"]);
  });

  it("applies category filters before calculating pagination", async () => {
    const hutbaCount = PUBLIC_POSTS_PAGE_SIZE + 3;
    await createOrderedPosts({
      count: hutbaCount,
      type: "hutba",
      titlePrefix: "Hutba",
      slugPrefix: "hutba",
    });
    await createOrderedPosts({
      count: 8,
      type: "sergija",
      titlePrefix: "Sergija",
      slugPrefix: "sergija",
    });

    const result = expectData(await callLoader(`${ENDPOINT}?vrsta=hutba&page=2`));

    expect(result.activeType).toBe("hutba");
    expect(result.pagination).toMatchObject({
      page: 2,
      totalItems: hutbaCount,
      totalPages: 2,
      take: PUBLIC_POSTS_PAGE_SIZE * 2,
      visibleItems: hutbaCount,
      hasNextPage: false,
    });
    expect(result.posts).toHaveLength(hutbaCount);
    expect(result.posts[0]?.title).toBe("Hutba 1");
    expect(result.posts.at(-1)?.title).toBe(`Hutba ${hutbaCount}`);
  });

  it("falls back to all posts when the category filter is unknown", async () => {
    await createOrderedPosts({
      count: 2,
      type: "hutba",
      titlePrefix: "Hutba",
      slugPrefix: "hutba",
    });
    await createOrderedPosts({
      count: 2,
      type: "sergija",
      titlePrefix: "Sergija",
      slugPrefix: "sergija",
    });

    const result = expectData(await callLoader(`${ENDPOINT}?vrsta=banana`));

    expect(result.activeType).toBe("all");
    expect(result.pagination.totalItems).toBe(4);
    expect(new Set(result.posts.map((post) => post.title))).toEqual(
      new Set(["Hutba 1", "Hutba 2", "Sergija 1", "Sergija 2"]),
    );
  });

  it("redirects filtered out-of-range pages to the last valid batch", async () => {
    await createOrderedPosts({
      count: 13,
      type: "hutba",
      titlePrefix: "Hutba",
      slugPrefix: "hutba",
    });

    const result = await callLoader(`${ENDPOINT}?vrsta=hutba&page=9`);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get("Location")).toBe(
      postsArchiveHref({ activeType: "hutba", page: 2 }),
    );
  });
});
