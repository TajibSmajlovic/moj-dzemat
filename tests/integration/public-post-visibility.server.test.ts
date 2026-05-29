import { describe, expect, it } from "vitest";

import { ROUTES, postHref, postImageHref } from "#app/lib/routes";
import { DAY_SECONDS } from "#app/lib/time";
import { loader as publicHomeLoader } from "#app/routes/_public._index";
import { loader as publicPostLoader } from "#app/routes/_public.objave.$slug";
import { loader as sitemapLoader } from "#app/routes/sitemap[.]xml";
import { loader as imageLoader } from "#app/routes/slike.$id";
import { prisma } from "#app/server/db.server";

import { createPost, createQuestion, createUser } from "../factories";
import { callLoader } from "../helpers/route";
import { sessionCookieFor } from "../helpers/session";

const callHomeLoader = (url = `http://localhost${ROUTES.home}`) =>
  callLoader(publicHomeLoader, { url });

const callPostLoader = (slug: string) =>
  callLoader(publicPostLoader, {
    url: `http://localhost${postHref(slug)}`,
    params: { slug },
  });

const callImageLoader = (id: string, cookie?: string) =>
  callLoader(imageLoader, { url: `http://localhost${postImageHref(id)}`, params: { id }, cookie });

describe("public post visibility", () => {
  it("shows published posts and hides drafts from the homepage", async () => {
    const { user } = await createUser();
    await createPost({
      authorId: user.id,
      title: "Javna objava",
      slug: "javna-objava",
      status: "published",
      featured: true,
    });
    await createPost({
      authorId: user.id,
      title: "Sakriven nacrt",
      slug: "sakriven-nacrt",
      status: "draft",
      featured: true,
    });

    const result = await callHomeLoader();

    expect(result.posts.map((post) => post.title)).toContain("Javna objava");
    expect(result.posts.map((post) => post.title)).not.toContain("Sakriven nacrt");
    expect(result.featured.map((post) => post.title)).toEqual(["Javna objava"]);
  });

  it("returns the latest public Q&A preview on the homepage", async () => {
    const base = Date.parse("2026-05-20T12:00:00.000Z");

    for (let index = 0; index < 7; index += 1) {
      await createQuestion({
        question: `Javno pitanje ${index + 1}?`,
        answer: `Javni odgovor ${index + 1}.`,
        answeredAt: new Date(base - index * 60_000),
      });
    }
    await createQuestion({
      question: "Sakriveno pitanje?",
      answer: "Sakriven odgovor.",
      isHidden: true,
      answeredAt: new Date("2026-05-21T12:00:00.000Z"),
    });
    await createQuestion({ question: "Pitanje koje još čeka odgovor?" });

    const result = await callHomeLoader();

    expect(result.qaPreview).toHaveLength(5);
    expect(result.qaPreview.map((question) => question.question)).toEqual([
      "Javno pitanje 1?",
      "Javno pitanje 2?",
      "Javno pitanje 3?",
      "Javno pitanje 4?",
      "Javno pitanje 5?",
    ]);
  });

  it("orders public posts by published date after pinned status", async () => {
    const { user } = await createUser();
    await createPost({
      authorId: user.id,
      title: "Recently created, older publish date",
      slug: "older-published",
      status: "published",
      createdAt: new Date("2026-05-02T10:00:00Z"),
      publishedAt: new Date("2026-04-15T10:00:00Z"),
    });
    await createPost({
      authorId: user.id,
      title: "Older draft, newly published",
      slug: "newly-published",
      status: "published",
      createdAt: new Date("2026-04-01T10:00:00Z"),
      publishedAt: new Date("2026-05-01T10:00:00Z"),
    });

    const result = await callHomeLoader();

    expect(result.posts.map((post) => post.slug)).toEqual(["newly-published", "older-published"]);
  });

  it("returns 404 for a draft on the public detail route", async () => {
    const { user } = await createUser();
    await createPost({
      authorId: user.id,
      title: "Sakriven nacrt",
      slug: "sakriven-nacrt",
      status: "draft",
    });

    try {
      await callPostLoader("sakriven-nacrt");
      throw new Error("Expected draft post detail to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });

  it("omits drafts from the sitemap", async () => {
    const { user } = await createUser();
    await createPost({ authorId: user.id, slug: "javna-objava", status: "published" });
    await createPost({ authorId: user.id, slug: "sakriven-nacrt", status: "draft" });

    const response = await sitemapLoader();
    const body = await response.text();

    expect(body).toContain(postHref("javna-objava"));
    expect(body).not.toContain(postHref("sakriven-nacrt"));
  });

  it("includes only published post images in the image sitemap", async () => {
    const { user } = await createUser();
    const published = await createPost({
      authorId: user.id,
      slug: "javna-objava-sa-slikom",
      status: "published",
    });
    const draft = await createPost({
      authorId: user.id,
      slug: "sakriven-nacrt-sa-slikom",
      status: "draft",
    });
    const publishedImage = await prisma.postImage.create({
      data: {
        postId: published.id,
        contentType: "image/webp",
        data: Buffer.from([1, 2, 3]),
        byteSize: 3,
      },
    });
    const draftImage = await prisma.postImage.create({
      data: {
        postId: draft.id,
        contentType: "image/webp",
        data: Buffer.from([1, 2, 3]),
        byteSize: 3,
      },
    });

    const response = await sitemapLoader();
    const body = await response.text();

    expect(body).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
    expect(body).toContain(postHref("javna-objava-sa-slikom"));
    expect(body).toContain(`/slike/${publishedImage.id}`);
    expect(body).not.toContain(postHref("sakriven-nacrt-sa-slikom"));
    expect(body).not.toContain(draftImage.id);
  });

  it("does not serve draft images publicly", async () => {
    const { user } = await createUser();
    const draft = await createPost({ authorId: user.id, status: "draft" });
    const published = await createPost({ authorId: user.id, status: "published" });
    const draftImage = await prisma.postImage.create({
      data: {
        postId: draft.id,
        contentType: "image/webp",
        data: Buffer.from([1, 2, 3]),
        byteSize: 3,
      },
    });
    const publishedImage = await prisma.postImage.create({
      data: {
        postId: published.id,
        contentType: "image/webp",
        data: Buffer.from([1, 2, 3]),
        byteSize: 3,
      },
    });

    const publishedResponse = await callImageLoader(publishedImage.id);
    expect(publishedResponse.status).toBe(200);
    expect(publishedResponse.headers.get("Cache-Control")).toBe(
      `public, max-age=${365 * DAY_SECONDS}, immutable`,
    );

    try {
      await callImageLoader(draftImage.id);
      throw new Error("Expected draft image to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }

    const draftAdminResponse = await callImageLoader(
      draftImage.id,
      await sessionCookieFor(user.id),
    );
    expect(draftAdminResponse.status).toBe(200);
    expect(draftAdminResponse.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
