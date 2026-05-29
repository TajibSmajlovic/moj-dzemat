import { data } from "react-router";

import { parseWithZod } from "@conform-to/zod/v4";
import { parseFormData } from "@mjackson/form-data-parser";

import {
  existingImageAltTextUpdates,
  processUploadedImages,
  type ImageAltTextUpdate,
  type ProcessedPostImage,
} from "#app/features/posts/admin/post-images.server";
import {
  isSlugConflict,
  persistPostAndImages,
  type PersistedPost,
} from "#app/features/posts/admin/post-persist.server";
import { adminPostPreviewHref, postHref } from "#app/features/posts/post-routes";
import { sanitizePostBody } from "#app/features/posts/post-sanitize.server";
import { PostFormSchema } from "#app/features/posts/post-schema";
import type { PostStatusValue } from "#app/features/posts/post-status";
import { invariant, invariantResponse } from "#app/lib/invariant";
import { createActionToast } from "#app/lib/toast";
import { prisma } from "#app/server/db.server";
import { FormError } from "#app/server/form-error.server";
import { MAX_UPLOAD_BYTES } from "#app/server/limits.server";
import { logger } from "#app/server/logger.server";
import { redirectWithToast } from "#app/server/toast.server";

export function requireId(value: unknown): string {
  invariantResponse(typeof value === "string" && value.length > 0, "Missing id");

  return value;
}

export async function togglePostStatus(postId: string, userId: string) {
  const post = await prisma.post.findUniqueOrThrow({
    where: { id: postId },
    select: { status: true },
  });
  const nextStatus: PostStatusValue = post.status === "published" ? "draft" : "published";

  await prisma.post.update({
    where: { id: postId },
    data: {
      status: nextStatus,
      ...(nextStatus === "published" ? { publishedAt: new Date() } : {}),
    },
  });

  logger.info({ postId, userId, status: nextStatus }, "post status toggled");

  return nextStatus;
}

type CreateOrUpdateArgs = {
  request: Request;
  authorId: string;
  intent: "create" | "update";
};

/**
   Parses the multipart body via `@mjackson/form-data-parser` (which
   correctly streams file parts), validates text fields, pre-processes
   images, then commits the post + image rows in one short transaction.
   On success redirects published posts publicly and drafts to admin preview.
 */
export async function createOrUpdatePostFromForm({
  request,
  authorId,
  intent,
}: CreateOrUpdateArgs) {
  const formData = await parseFormData(request, {
    maxFileSize: MAX_UPLOAD_BYTES,
  });

  const submission = parseWithZod(formData, { schema: PostFormSchema });
  if (submission.status !== "success") {
    return data({ result: submission.reply() }, { status: 400 });
  }

  const { title, slug, type, body: rawBody, publish, featured, pinned } = submission.value;
  const body = sanitizePostBody(rawBody);
  if (!body) {
    return data(
      {
        result: submission.reply({
          fieldErrors: { body: ["Tekst je obavezan."] },
        }),
      },
      { status: 400 },
    );
  }

  const status: PostStatusValue = publish ? "published" : "draft";
  const existingId = intent === "update" ? requireId(formData.get("id")) : null;

  let processedImages: ProcessedPostImage[];
  let imageAltTextUpdates: ImageAltTextUpdate[] = [];

  try {
    imageAltTextUpdates = existingImageAltTextUpdates(formData);
    processedImages = await processUploadedImages(formData);
  } catch (error) {
    if (error instanceof FormError) {
      return data(
        {
          result: submission.reply({ formErrors: [error.message] }),
        },
        { status: 400 },
      );
    }
    throw error;
  }

  let savedPost: PersistedPost | null = null;

  try {
    savedPost = await persistPostAndImages({
      authorId,
      body,
      existingId,
      featured,
      intent,
      pinned,
      processedImages,
      imageAltTextUpdates,
      slug,
      status,
      title,
      type,
    });

    logger.info(
      {
        authorId,
        postId: savedPost.id,
        intent,
        slug: savedPost.slug,
        status: savedPost.status,
        type,
        imageCount: processedImages.length,
      },
      "post saved",
    );
  } catch (error) {
    if (error instanceof FormError) {
      if (error.fieldErrors?.slug) {
        logger.warn({ authorId, intent, slug }, "post save rejected because of duplicate slug");

        return data(
          {
            result: submission.reply({
              fieldErrors: { slug: ["Slug je već zauzet. Odaberite drugi."] },
            }),
          },
          { status: 400 },
        );
      }

      return data(
        {
          result: submission.reply({ formErrors: [error.message] }),
        },
        { status: 400 },
      );
    }
    if (isSlugConflict(error)) {
      logger.warn({ authorId, intent, slug }, "post save rejected because of duplicate slug");

      return data(
        {
          result: submission.reply({
            fieldErrors: { slug: ["Slug je već zauzet. Odaberite drugi."] },
          }),
        },
        { status: 400 },
      );
    }

    throw error;
  }

  invariant(savedPost, "Post save completed without a saved post payload.");

  const redirectTo =
    savedPost.status === "published"
      ? postHref(savedPost.slug)
      : adminPostPreviewHref(savedPost.id);

  return redirectWithToast(
    redirectTo,
    intent === "create"
      ? createActionToast({
          action: "create",
          description: "Objava je uspješno kreirana.",
        })
      : createActionToast({
          action: "update",
          description: "Objava je uspješno ažurirana.",
        }),
  );
}
