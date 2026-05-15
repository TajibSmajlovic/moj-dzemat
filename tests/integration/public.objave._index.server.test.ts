import { describe, expect, it } from "vitest";

import type { PostTypeValue } from "#app/features/posts/post-type";
import { loader as objaveLoader } from "#app/routes/_public.objave._index";

import { createPost } from "../factories";
import { callLoader as runLoader } from "../helpers/route";

const ENDPOINT = "http://localhost/objave";

const callLoader = (url: string) => runLoader(objaveLoader, { url });

type LoaderResult = Awaited<ReturnType<typeof objaveLoader>>;

function expectLoaderData(result: LoaderResult) {
  expect(result).not.toBeInstanceOf(Response);

  return result as Exclude<LoaderResult, Response>;
}

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
    await createOrderedPosts({ count: 12 });
    await createPost({
      title: "Sakrivena objava",
      slug: "sakrivena-objava",
      status: "draft",
    });

    const result = expectLoaderData(await callLoader(ENDPOINT));

    expect(result.activeType).toBe("all");
    expect(result.pagination).toMatchObject({
      page: 1,
      totalItems: 12,
      totalPages: 2,
      take: 10,
      visibleItems: 10,
      hasNextPage: true,
    });
    expect(result.posts).toHaveLength(10);
    expect(result.posts.map((post) => post.title)).toEqual([
      "Objava 1",
      "Objava 2",
      "Objava 3",
      "Objava 4",
      "Objava 5",
      "Objava 6",
      "Objava 7",
      "Objava 8",
      "Objava 9",
      "Objava 10",
    ]);
  });

  it("keeps earlier posts when loading a later page", async () => {
    await createOrderedPosts({ count: 25 });

    const result = expectLoaderData(await callLoader(`${ENDPOINT}?page=2`));

    expect(result.pagination).toMatchObject({
      page: 2,
      totalItems: 25,
      totalPages: 3,
      take: 20,
      visibleItems: 20,
      hasNextPage: true,
    });
    expect(result.posts).toHaveLength(20);
    expect(result.posts[0]?.title).toBe("Objava 1");
    expect(result.posts.at(-1)?.title).toBe("Objava 20");
  });

  it("resets invalid page params to the first batch", async () => {
    await createOrderedPosts({ count: 3 });

    const result = expectLoaderData(await callLoader(`${ENDPOINT}?page=banana`));

    expect(result.pagination.page).toBe(1);
    expect(result.posts.map((post) => post.title)).toEqual(["Objava 1", "Objava 2", "Objava 3"]);
  });

  it("applies category filters before calculating pagination", async () => {
    await createOrderedPosts({
      count: 13,
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

    const result = expectLoaderData(await callLoader(`${ENDPOINT}?vrsta=hutba&page=2`));

    expect(result.activeType).toBe("hutba");
    expect(result.pagination).toMatchObject({
      page: 2,
      totalItems: 13,
      totalPages: 2,
      take: 20,
      visibleItems: 13,
      hasNextPage: false,
    });
    expect(result.posts).toHaveLength(13);
    expect(result.posts[0]?.title).toBe("Hutba 1");
    expect(result.posts.at(-1)?.title).toBe("Hutba 13");
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
    expect((result as Response).headers.get("Location")).toBe("/objave?vrsta=hutba&page=2");
  });
});
