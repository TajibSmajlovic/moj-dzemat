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
import { resolveVideoInputs } from "#app/features/posts/admin/post-videos.server";
import { adminPostPreviewHref, postHref } from "#app/features/posts/post-routes";
import { sanitizePostBody } from "#app/features/posts/post-sanitize.server";
import { PostFormSchema } from "#app/features/posts/post-schema";
import type { PostStatusValue } from "#app/features/posts/post-status";
import type { ParsedVideo } from "#app/features/posts/post-video";
import { kickWebPushDispatcher } from "#app/features/web-push/dispatcher.server";
import {
  cancelPostNotificationWork,
  recordFirstPublicationDecision,
} from "#app/features/web-push/post-notification.server";
import { requireId } from "#app/lib/id";
import { invariant } from "#app/lib/invariant";
import { createActionToast } from "#app/lib/toast";
import { prisma } from "#app/server/db.server";
import { FormError } from "#app/server/form-error.server";
import { MAX_UPLOAD_BYTES } from "#app/server/limits.server";
import { logger } from "#app/server/logger.server";
import { redirectWithToast } from "#app/server/toast.server";

export async function togglePostStatus(postId: string, userId: string) {
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const post = await tx.post.findUniqueOrThrow({
      where: { id: postId },
      select: { status: true },
    });
    const status: PostStatusValue = post.status === "published" ? "draft" : "published";
    const updated = await tx.post.update({
      where: { id: postId },
      data: {
        status,
        ...(status === "published" ? { publishedAt: now } : {}),
      },
      select: {
        id: true,
        title: true,
        notifyOnPublish: true,
      },
    });

    if (status === "draft") {
      await cancelPostNotificationWork(tx, postId, now);

      return { status, notificationDecision: "not-applicable" as const };
    }

    return {
      status,
      notificationDecision: await recordFirstPublicationDecision(tx, updated, now),
    };
  });

  if (result.notificationDecision === "queued") {
    kickWebPushDispatcher({ bypassCooldown: true });
  }

  logger.info({ postId, userId, status: result.status }, "post status toggled");

  return result;
}

type CreateOrUpdateArgs = {
  formData?: FormData;
  request?: Request;
  authorId: string;
  intent: "create" | "update";
};

export async function parsePostFormData(request: Request): Promise<FormData> {
  return parseFormData(request, {
    maxFileSize: MAX_UPLOAD_BYTES,
  });
}

/**
   Parses the multipart body via `@mjackson/form-data-parser` (which
   correctly streams file parts), validates text fields, pre-processes
   images, then commits the post + image rows in one short transaction.
   On success redirects published posts publicly and drafts to admin preview.
 */
export async function createOrUpdatePostFromForm({
  formData,
  request,
  authorId,
  intent,
}: CreateOrUpdateArgs) {
  const parsedFormData = formData ?? (request ? await parsePostFormData(request) : null);
  invariant(parsedFormData, "Post form data or request is required.");

  const submission = parseWithZod(parsedFormData, { schema: PostFormSchema });
  if (submission.status !== "success") {
    return data({ result: submission.reply() }, { status: 400 });
  }

  const {
    title,
    slug,
    type,
    body: rawBody,
    publish,
    notifyOnPublish,
    featured,
    pinned,
  } = submission.value;
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
  const existingId = intent === "update" ? requireId(parsedFormData.get("id")) : null;

  let processedImages: ProcessedPostImage[];
  let imageAltTextUpdates: ImageAltTextUpdate[] = [];
  let videoInputs: ParsedVideo[] = [];

  try {
    imageAltTextUpdates = existingImageAltTextUpdates(parsedFormData);
    processedImages = await processUploadedImages(parsedFormData);
    videoInputs = resolveVideoInputs(parsedFormData);
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
      notifyOnPublish,
      pinned,
      processedImages,
      imageAltTextUpdates,
      slug,
      status,
      title,
      type,
      videoInputs,
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
        videoCount: videoInputs.length,
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
    savedPost.notificationDecision === "queued"
      ? createActionToast({
          action: intent === "create" ? "create" : "update",
          description: "Objava je objavljena. Obavijest je zakazana za slanje.",
        })
      : intent === "create"
        ? createActionToast({
            action: "create",
            description: "Objava je uspješno dodana.",
          })
        : createActionToast({
            action: "update",
            description: "Objava je uspješno ažurirana.",
          }),
  );
}
