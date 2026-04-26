import { describe, expect, it } from "vitest";

import { prisma } from "#app/utils/db.server";
import { createOrUpdatePostFromForm } from "#app/utils/post-admin.server";

import { createPost, createUser } from "../factories";

const ENDPOINT = "http://localhost/admin/objave/nova";

/**
 * 1×1 transparent PNG. Tiny enough to keep tests fast but valid enough
 * for sharp to accept and re-encode.
 */
function tinyPngFile(name = "img.png") {
  const buffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2Z8W0AAAAASUVORK5CYII=",
    "base64",
  );

  return new File([buffer], name, { type: "image/png" });
}

function multipartRequest(formData: FormData) {
  return new Request(ENDPOINT, { method: "POST", body: formData });
}

/**
 * Action helpers may return either a real `Response` (the redirect path)
 * or react-router's `data()` envelope (`{ type, data, init }` for the
 * 4xx paths). Normalise both so assertions stay readable.
 */
function statusOf(result: unknown): number {
  if (result instanceof Response) return result.status;
  const init = (result as { init?: ResponseInit | null }).init;

  return init?.status ?? 200;
}

function payloadOf(result: unknown): unknown {
  if (result instanceof Response) return null;
  return (result as { data: unknown }).data;
}

type ConformReply = {
  result: { error: Record<string, string[] | undefined> };
};

describe("createOrUpdatePostFromForm", () => {
  describe("create", () => {
    it("persists the post and redirects to its public URL with a toast cookie", async () => {
      const { user } = await createUser();
      const formData = new FormData();
      formData.set("title", "Prva objava");
      formData.set("slug", "prva-objava");
      formData.set("type", "obavijest");
      formData.set("body", "Tijelo objave.");
      formData.set("publish", "on");

      const response = await createOrUpdatePostFromForm({
        request: multipartRequest(formData),
        authorId: user.id,
        intent: "create",
      });

      expect(response).toBeInstanceOf(Response);
      const res = response as Response;
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/objave/prva-objava");
      expect(res.headers.get("Set-Cookie")).toMatch(/mdz_toast=/);

      const stored = await prisma.post.findUnique({ where: { slug: "prva-objava" } });
      expect(stored?.title).toBe("Prva objava");
      expect(stored?.type).toBe("obavijest");
      expect(stored?.authorId).toBe(user.id);
      expect(stored?.status).toBe("published");
      expect(stored?.featured).toBe(false);
      expect(stored?.pinned).toBe(false);
    });

    it("flips featured/pinned when the checkbox values arrive as 'on'", async () => {
      const { user } = await createUser();
      const formData = new FormData();
      formData.set("title", "Naslov");
      formData.set("slug", "naslov");
      formData.set("type", "hutba");
      formData.set("body", "Tekst hutbe.");
      formData.set("publish", "on");
      formData.set("featured", "on");
      formData.set("pinned", "on");

      await createOrUpdatePostFromForm({
        request: multipartRequest(formData),
        authorId: user.id,
        intent: "create",
      });

      const stored = await prisma.post.findUnique({ where: { slug: "naslov" } });
      expect(stored?.featured).toBe(true);
      expect(stored?.pinned).toBe(true);
    });

    it("can save a draft and redirects to the admin preview instead of the public URL", async () => {
      const { user } = await createUser();
      const formData = new FormData();
      formData.set("title", "Nacrt objave");
      formData.set("slug", "nacrt-objave");
      formData.set("type", "obavijest");
      formData.set("body", "Tekst koji još nije javan.");

      const response = await createOrUpdatePostFromForm({
        request: multipartRequest(formData),
        authorId: user.id,
        intent: "create",
      });

      expect(response).toBeInstanceOf(Response);
      const res = response as Response;
      expect(res.status).toBe(302);

      const stored = await prisma.post.findUnique({ where: { slug: "nacrt-objave" } });
      expect(stored?.status).toBe("draft");
      expect(res.headers.get("Location")).toBe(`/admin/objave/${stored?.id}/pregled`);
    });

    it("returns 400 with a slug field error when the slug is already taken", async () => {
      const { user } = await createUser();
      await createPost({ authorId: user.id, slug: "zauzet" });

      const formData = new FormData();
      formData.set("title", "Druga objava");
      formData.set("slug", "zauzet");
      formData.set("type", "obavijest");
      formData.set("body", "Tijelo.");

      const result = await createOrUpdatePostFromForm({
        request: multipartRequest(formData),
        authorId: user.id,
        intent: "create",
      });

      expect(statusOf(result)).toBe(400);
      const body = payloadOf(result) as ConformReply;
      expect(body.result.error.slug?.[0]).toMatch(/zauzet/i);

      // No second row was inserted under the duplicate slug.
      const all = await prisma.post.findMany({ where: { slug: "zauzet" } });
      expect(all).toHaveLength(1);
    });

    it("returns 400 with field errors when input fails Zod validation", async () => {
      const { user } = await createUser();
      const formData = new FormData();
      formData.set("title", "ab"); // min 3
      formData.set("slug", "ok-slug");
      formData.set("type", "obavijest");
      formData.set("body", "Tekst.");

      const result = await createOrUpdatePostFromForm({
        request: multipartRequest(formData),
        authorId: user.id,
        intent: "create",
      });

      expect(statusOf(result)).toBe(400);
      const body = payloadOf(result) as ConformReply;
      expect(body.result.error.title?.[0]).toMatch(/3 znaka/);
    });

    it("processes uploaded images through sharp and stores them as WebP rows", async () => {
      const { user } = await createUser();
      const formData = new FormData();
      formData.set("title", "Sa slikom");
      formData.set("slug", "sa-slikom");
      formData.set("type", "obavijest");
      formData.set("body", "Tekst sa slikom.");
      formData.append("images", tinyPngFile("a.png"));

      const result = await createOrUpdatePostFromForm({
        request: multipartRequest(formData),
        authorId: user.id,
        intent: "create",
      });

      expect(statusOf(result)).toBe(302);
      const post = await prisma.post.findUnique({
        where: { slug: "sa-slikom" },
        include: { images: true },
      });
      expect(post?.images).toHaveLength(1);
      expect(post?.images[0]?.contentType).toBe("image/webp");
      expect(post?.images[0]?.position).toBe(0);
      expect(post?.images[0]?.byteSize ?? 0).toBeGreaterThan(0);
    });

    it("rejects creates with more than MAX_IMAGES_PER_POST in one go", async () => {
      const { user } = await createUser();
      const formData = new FormData();
      formData.set("title", "Sa puno slika");
      formData.set("slug", "sa-puno-slika");
      formData.set("type", "obavijest");
      formData.set("body", "Tekst.");
      for (let i = 0; i < 4; i++) {
        formData.append("images", tinyPngFile(`img-${i}.png`));
      }

      const result = await createOrUpdatePostFromForm({
        request: multipartRequest(formData),
        authorId: user.id,
        intent: "create",
      });

      expect(statusOf(result)).toBe(400);
      const body = payloadOf(result) as ConformReply;
      // Form-level errors are keyed under the empty string in conform's reply.
      const formError = body.result.error[""]?.[0] ?? "";
      expect(formError).toMatch(/najvi[sš]e/i);

      // The post itself was rolled back by the transaction.
      const stored = await prisma.post.findUnique({ where: { slug: "sa-puno-slika" } });
      expect(stored).toBeNull();
    });
  });

  describe("update", () => {
    it("updates the post and redirects to the new public URL", async () => {
      const { user } = await createUser();
      const post = await createPost({ authorId: user.id, title: "Stari", slug: "stari-slug" });
      const formData = new FormData();
      formData.set("id", post.id);
      formData.set("title", "Novi naslov");
      formData.set("slug", "novi-slug");
      formData.set("type", "hutba");
      formData.set("body", "Novi tekst.");
      formData.set("publish", "on");

      const response = await createOrUpdatePostFromForm({
        request: multipartRequest(formData),
        authorId: user.id,
        intent: "update",
      });

      expect(response).toBeInstanceOf(Response);
      const res = response as Response;
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/objave/novi-slug");

      const stored = await prisma.post.findUnique({ where: { id: post.id } });
      expect(stored?.title).toBe("Novi naslov");
      expect(stored?.slug).toBe("novi-slug");
      expect(stored?.type).toBe("hutba");
      expect(stored?.status).toBe("published");
    });

    it("can publish an existing draft from the edit form", async () => {
      const { user } = await createUser();
      const post = await createPost({
        authorId: user.id,
        title: "Nacrt",
        slug: "nacrt",
        status: "draft",
        publishedAt: new Date("2026-04-01T10:00:00Z"),
      });
      const formData = new FormData();
      formData.set("id", post.id);
      formData.set("title", "Objavljen nacrt");
      formData.set("slug", "objavljen-nacrt");
      formData.set("type", "obavijest");
      formData.set("body", "Spremno za javnost.");
      formData.set("publish", "on");

      const response = await createOrUpdatePostFromForm({
        request: multipartRequest(formData),
        authorId: user.id,
        intent: "update",
      });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).headers.get("Location")).toBe("/objave/objavljen-nacrt");

      const stored = await prisma.post.findUnique({ where: { id: post.id } });
      expect(stored?.status).toBe("published");
      expect(stored?.publishedAt.getTime()).toBeGreaterThan(post.publishedAt.getTime());
    });

    it("allows keeping the same slug when other fields change", async () => {
      const { user } = await createUser();
      const post = await createPost({ authorId: user.id, slug: "moj-slug", title: "Old" });
      const formData = new FormData();
      formData.set("id", post.id);
      formData.set("title", "New title");
      formData.set("slug", "moj-slug");
      formData.set("type", post.type);
      formData.set("body", post.body);

      const result = await createOrUpdatePostFromForm({
        request: multipartRequest(formData),
        authorId: user.id,
        intent: "update",
      });

      expect(statusOf(result)).toBe(302);
      const stored = await prisma.post.findUnique({ where: { id: post.id } });
      expect(stored?.title).toBe("New title");
    });

    it("rejects updates that would steal another post's slug", async () => {
      const { user } = await createUser();
      const a = await createPost({ authorId: user.id, slug: "prvi" });
      await createPost({ authorId: user.id, slug: "drugi" });

      const formData = new FormData();
      formData.set("id", a.id);
      formData.set("title", a.title);
      formData.set("slug", "drugi");
      formData.set("type", a.type);
      formData.set("body", a.body);

      const result = await createOrUpdatePostFromForm({
        request: multipartRequest(formData),
        authorId: user.id,
        intent: "update",
      });

      expect(statusOf(result)).toBe(400);
      const body = payloadOf(result) as ConformReply;
      expect(body.result.error.slug?.[0]).toMatch(/zauzet/i);

      // Original slug is preserved on the updated post.
      const stored = await prisma.post.findUnique({ where: { id: a.id } });
      expect(stored?.slug).toBe("prvi");
    });

    it("rolls back the post when an image insert pushes past the per-post cap", async () => {
      const { user } = await createUser();
      const post = await createPost({ authorId: user.id });
      await prisma.postImage.createMany({
        data: [
          {
            postId: post.id,
            contentType: "image/webp",
            data: new Uint8Array([1]),
            byteSize: 1,
            position: 0,
          },
          {
            postId: post.id,
            contentType: "image/webp",
            data: new Uint8Array([2]),
            byteSize: 1,
            position: 1,
          },
        ],
      });

      const formData = new FormData();
      formData.set("id", post.id);
      formData.set("title", post.title);
      formData.set("slug", post.slug);
      formData.set("type", post.type);
      formData.set("body", post.body);
      formData.append("images", tinyPngFile("a.png"));
      formData.append("images", tinyPngFile("b.png"));

      const result = await createOrUpdatePostFromForm({
        request: multipartRequest(formData),
        authorId: user.id,
        intent: "update",
      });

      expect(statusOf(result)).toBe(400);
      const remaining = await prisma.postImage.count({ where: { postId: post.id } });
      expect(remaining).toBe(2); // none of the new images committed
    });

    it("requires an id in the form data when updating", async () => {
      const { user } = await createUser();
      const formData = new FormData();
      formData.set("title", "Naslov");
      formData.set("slug", "naslov");
      formData.set("type", "obavijest");
      formData.set("body", "Tekst.");
      // intentionally no id

      await expect(
        createOrUpdatePostFromForm({
          request: multipartRequest(formData),
          authorId: user.id,
          intent: "update",
        }),
      ).rejects.toBeInstanceOf(Response);
    });
  });
});
