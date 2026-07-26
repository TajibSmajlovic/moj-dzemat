import { describe, expect, it } from "vitest";

import { postHref } from "#app/features/posts/post-routes";
import { normalizePublicPostSnapshot } from "#app/features/pwa/post-snapshot";
import { loader as publicPostLoader } from "#app/routes/_public.objave.$slug";
import { prisma } from "#app/server/db.server";

import { createPost } from "../../factories";
import { callLoader, testUrl } from "../../helpers/route";

describe("public post snapshot projection", () => {
  it("projects only allow-listed data from a published public post", async () => {
    const post = await createPost({
      title: "Objava za offline čitanje",
      slug: "objava-za-offline-citanje",
      body: "<p>Sanitiziran javni sadržaj.</p>",
      status: "published",
      type: "hutba",
      publishedAt: new Date("2026-07-20T10:00:00.000Z"),
    });
    await prisma.postImage.create({
      data: {
        postId: post.id,
        contentType: "image/webp",
        data: Buffer.from([1, 2, 3]),
        byteSize: 3,
      },
    });
    await prisma.postVideo.create({
      data: {
        postId: post.id,
        provider: "youtube",
        providerId: "abcdefghijk",
        url: "https://www.youtube.com/watch?v=abcdefghijk",
        position: 0,
      },
    });

    const result = await callLoader(publicPostLoader, {
      url: testUrl(postHref(post.slug)),
      pattern: "/objave/:slug",
      params: { slug: post.slug },
    });
    const snapshot = normalizePublicPostSnapshot(result.post, new Date("2026-07-26T08:00:00.000Z"));

    expect(new Set(Object.keys(snapshot))).toEqual(
      new Set([
        "schemaVersion",
        "id",
        "slug",
        "title",
        "bodyHtml",
        "type",
        "publishedAt",
        "updatedAt",
        "snapshotRefreshedAt",
        "lastViewedAt",
        "hasImageMedia",
        "hasVideoMedia",
      ]),
    );
    expect(snapshot).toMatchObject({
      id: post.id,
      slug: post.slug,
      title: post.title,
      bodyHtml: post.body,
      type: post.type,
      hasImageMedia: true,
      hasVideoMedia: true,
    });
    expect(JSON.stringify(snapshot)).not.toContain(result.siteUrl);
    expect(JSON.stringify(snapshot)).not.toMatch(
      /providerId|imageId|videoId|authorId|pinned|siteUrl/,
    );
  });
});
