import { describe, expect, it } from "vitest";

import { PostAdminIntents } from "#app/features/posts/admin/post-intents";
import { adminPostHref } from "#app/features/posts/post-routes";
import { action as editPostAction, loader as editPostLoader } from "#app/routes/admin.objave.$id";
import { prisma } from "#app/server/db.server";

import { createPost } from "../factories";
import { expectData, expectResponse, statusOf } from "../helpers/action-result";
import { createAdminSession } from "../helpers/auth";
import { callAction as runAction, callLoader as runLoader, testUrl } from "../helpers/route";

function callLoader(id: string, cookie?: string) {
  return runLoader(editPostLoader, {
    url: testUrl(adminPostHref(id)),
    params: { id },
    cookie,
  });
}

function callAction(id: string, formData: FormData, cookie: string) {
  return runAction(editPostAction, {
    url: testUrl(adminPostHref(id)),
    params: { id },
    formData,
    cookie,
  });
}

function imageDeleteForm({ postId, imageId }: { postId: string; imageId: string }) {
  const formData = new FormData();
  formData.set("intent", PostAdminIntents.DeleteImage);
  formData.set("id", postId);
  formData.set("imageId", imageId);

  return formData;
}

describe("admin post edit route", () => {
  it("loader returns the editable post fields and ordered image metadata", async () => {
    const { user, cookie } = await createAdminSession();
    const post = await createPost({
      authorId: user.id,
      title: "Uredi me",
      slug: "uredi-me",
      type: "hutba",
      body: "Tekst objave.",
      status: "draft",
      featured: true,
      pinned: true,
    });
    await prisma.postImage.createMany({
      data: [
        {
          postId: post.id,
          contentType: "image/webp",
          altText: "Druga",
          data: new Uint8Array([2]),
          byteSize: 1,
          position: 1,
        },
        {
          postId: post.id,
          contentType: "image/webp",
          altText: "Prva",
          data: new Uint8Array([1]),
          byteSize: 1,
          position: 0,
        },
      ],
    });

    const result = expectData(await callLoader(post.id, cookie));

    expect(result.post).toMatchObject({
      id: post.id,
      title: "Uredi me",
      slug: "uredi-me",
      type: "hutba",
      body: "Tekst objave.",
      status: "draft",
      featured: true,
      pinned: true,
    });
    expect(result.post.images.map((image) => image.altText)).toEqual(["Prva", "Druga"]);
  });

  it("loader throws 404 for an unknown post id", async () => {
    const { cookie } = await createAdminSession();

    let thrown: unknown;
    try {
      await callLoader("missing-post", cookie);
    } catch (error) {
      thrown = error;
    }

    expectResponse(thrown, 404);
  });

  it("delete-image removes only an image that belongs to the route post", async () => {
    const { user, cookie } = await createAdminSession();
    const post = await createPost({ authorId: user.id });
    const otherPost = await createPost({ authorId: user.id });
    const targetImage = await prisma.postImage.create({
      data: {
        postId: post.id,
        contentType: "image/webp",
        data: new Uint8Array([1]),
        byteSize: 1,
      },
    });
    const otherImage = await prisma.postImage.create({
      data: {
        postId: otherPost.id,
        contentType: "image/webp",
        data: new Uint8Array([2]),
        byteSize: 1,
      },
    });

    const result = await callAction(
      post.id,
      imageDeleteForm({ postId: post.id, imageId: targetImage.id }),
      cookie,
    );

    expect(result).toMatchObject({ ok: true });
    expect(await prisma.postImage.findUnique({ where: { id: targetImage.id } })).toBeNull();
    expect(await prisma.postImage.findUnique({ where: { id: otherImage.id } })).not.toBeNull();
  });

  it("delete-image does not delete an image from a different post", async () => {
    const { user, cookie } = await createAdminSession();
    const post = await createPost({ authorId: user.id });
    const otherPost = await createPost({ authorId: user.id });
    const otherImage = await prisma.postImage.create({
      data: {
        postId: otherPost.id,
        contentType: "image/webp",
        data: new Uint8Array([2]),
        byteSize: 1,
      },
    });

    const result = await callAction(
      post.id,
      imageDeleteForm({ postId: post.id, imageId: otherImage.id }),
      cookie,
    );

    expect(result).toMatchObject({ ok: true });
    expect(await prisma.postImage.findUnique({ where: { id: otherImage.id } })).not.toBeNull();
  });

  it("rejects delete-image when the body post id does not match the route post id", async () => {
    const { user, cookie } = await createAdminSession();
    const post = await createPost({ authorId: user.id });
    const otherPost = await createPost({ authorId: user.id });
    const image = await prisma.postImage.create({
      data: {
        postId: post.id,
        contentType: "image/webp",
        data: new Uint8Array([1]),
        byteSize: 1,
      },
    });

    let thrown: unknown;
    try {
      await callAction(
        post.id,
        imageDeleteForm({ postId: otherPost.id, imageId: image.id }),
        cookie,
      );
    } catch (error) {
      thrown = error;
    }

    expectResponse(thrown, 400);
    expect(await prisma.postImage.findUnique({ where: { id: image.id } })).not.toBeNull();
  });

  it("rejects update when the body post id does not match the route post id", async () => {
    const { user, cookie } = await createAdminSession();
    const post = await createPost({ authorId: user.id });
    const otherPost = await createPost({ authorId: user.id });
    const formData = new FormData();
    formData.set("intent", PostAdminIntents.Update);
    formData.set("id", otherPost.id);

    let thrown: unknown;
    try {
      await callAction(post.id, formData, cookie);
    } catch (error) {
      thrown = error;
    }

    expectResponse(thrown, 400);
  });

  it("updates a post when the route id and body id match", async () => {
    const { user, cookie } = await createAdminSession();
    const post = await createPost({ authorId: user.id, slug: "stari-slug" });
    const formData = new FormData();
    formData.set("intent", PostAdminIntents.Update);
    formData.set("id", post.id);
    formData.set("title", "Novi naslov");
    formData.set("slug", "novi-slug");
    formData.set("type", "obavijest");
    formData.set("body", "Novi tekst objave.");

    const result = await callAction(post.id, formData, cookie);

    expect(statusOf(result)).toBe(302);
    expect(await prisma.post.findUnique({ where: { id: post.id } })).toMatchObject({
      title: "Novi naslov",
      slug: "novi-slug",
    });
  });
});
