import { describe, expect, it } from "vitest";

import { postHref, postImageHref } from "#app/lib/routes";
import { buildSitemapXml, loader as sitemapLoader } from "#app/routes/sitemap[.]xml";
import { prisma } from "#app/server/db.server";
import { env } from "#app/server/env.server";

import { createPost, createUser } from "../factories";

describe("sitemap route", () => {
  it("returns valid XML with only the homepage when there are no posts", async () => {
    const response = await sitemapLoader();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=600");
    expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(body).toContain(`<loc>${env().APP_URL}/</loc>`);
    expect(body.match(/<url>/g)).toHaveLength(1);
    expect(body).not.toContain("<lastmod>");
  });

  it("uses the newest published post update time as the homepage lastmod", async () => {
    const { user } = await createUser();
    await createPost({
      authorId: user.id,
      slug: "starija-objava",
      status: "published",
    });
    const newest = await createPost({
      authorId: user.id,
      slug: "novija-objava",
      status: "published",
    });
    await prisma.post.update({
      where: { slug: "starija-objava" },
      data: { updatedAt: new Date("2026-05-01T10:00:00.000Z") },
    });
    const updatedNewest = await prisma.post.update({
      where: { id: newest.id },
      data: { updatedAt: new Date("2026-05-03T10:00:00.000Z") },
    });

    const response = await sitemapLoader();
    const body = await response.text();

    expect(body).toContain(
      `<loc>${env().APP_URL}/</loc><lastmod>${updatedNewest.updatedAt.toISOString()}</lastmod>`,
    );
  });

  it("includes image sitemap entries for published post images", async () => {
    const { user } = await createUser();
    const post = await createPost({
      authorId: user.id,
      slug: "objava-sa-slikom",
      status: "published",
    });
    const image = await prisma.postImage.create({
      data: {
        postId: post.id,
        contentType: "image/webp",
        data: new Uint8Array([1, 2, 3]),
        byteSize: 3,
      },
    });

    const response = await sitemapLoader();
    const body = await response.text();

    expect(body).toContain(postHref("objava-sa-slikom"));
    expect(body).toContain(
      `<image:image><image:loc>${env().APP_URL}${postImageHref(image.id)}</image:loc></image:image>`,
    );
  });

  it("escapes XML special characters in generated entries", () => {
    const body = buildSitemapXml([
      {
        loc: `https://example.test/${`a&b<c>d"e'f`}`,
        images: [{ loc: `https://example.test/${`img&<>"'`}` }],
      },
    ]);

    expect(body).toContain("a&amp;b&lt;c&gt;d&quot;e&apos;f");
    expect(body).toContain("img&amp;&lt;&gt;&quot;&apos;");
  });
});
