import {
  createImageRows,
  type ImageAltTextUpdate,
  type ProcessedPostImage,
} from "#app/features/posts/admin/post-images.server";
import { reconcilePostVideos } from "#app/features/posts/admin/post-videos.server";
import type { PostStatusValue } from "#app/features/posts/post-status";
import type { PostTypeValue } from "#app/features/posts/post-type";
import type { ParsedVideo } from "#app/features/posts/post-video";
import { kickWebPushDispatcher } from "#app/features/web-push/dispatcher.server";
import {
  cancelPostNotificationWork,
  recordFirstPublicationDecision,
  type PublicationDecision,
} from "#app/features/web-push/post-notification.server";
import { isPrismaKnownRequestError, prisma } from "#app/server/db.server";
import { FormError } from "#app/server/form-error.server";

/**
   Single source of truth for "write a post to the DB". Wraps the slug
   uniqueness check, Post create/update, image inserts and alt-text updates,
   and video reconciliation in one `prisma.$transaction` so a failure anywhere
   never leaves partially updated media behind.
 */

export type PersistPostArgs = {
  authorId: string;
  body: string;
  existingId: string | null;
  featured: boolean;
  intent: "create" | "update";
  notifyOnPublish: boolean;
  pinned: boolean;
  processedImages: ProcessedPostImage[];
  imageAltTextUpdates: ImageAltTextUpdate[];
  slug: string;
  status: PostStatusValue;
  title: string;
  type: PostTypeValue;
  videoInputs: ParsedVideo[];
};

export type PersistedPost = {
  id: string;
  slug: string;
  status: PostStatusValue;
  notificationDecision: PublicationDecision;
};

export async function persistPostAndImages(args: PersistPostArgs): Promise<PersistedPost> {
  const now = new Date();
  const saved = await prisma.$transaction(async (tx) => {
    const {
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
    } = args;

    const clashing = await tx.post.findFirst({
      where: existingId ? { slug, NOT: { id: existingId } } : { slug },
      select: { id: true },
    });

    if (clashing) {
      throw new FormError("Ovaj dio URL-a je već zauzet. Odaberite drugi.", {
        fieldErrors: { slug: ["Slug je već zauzet. Odaberite drugi."] },
      });
    }

    const existingPost =
      intent === "update" && existingId
        ? await tx.post.findUnique({
            where: { id: existingId },
            select: { status: true },
          })
        : null;
    const shouldStampPublishedAt =
      status === "published" && (!existingPost || existingPost.status === "draft");
    const shouldCancelNotification = status === "draft" && existingPost?.status === "published";

    const post =
      intent === "update" && existingId
        ? await tx.post.update({
            where: { id: existingId },
            data: {
              title,
              slug,
              type,
              body,
              featured,
              pinned,
              notifyOnPublish,
              status,
              ...(shouldStampPublishedAt ? { publishedAt: now } : {}),
            },
            select: {
              id: true,
              slug: true,
              status: true,
              title: true,
              notifyOnPublish: true,
            },
          })
        : await tx.post.create({
            data: {
              title,
              slug,
              type,
              body,
              featured,
              pinned,
              notifyOnPublish,
              status,
              authorId,
              ...(status === "published" ? { publishedAt: now } : {}),
            },
            select: {
              id: true,
              slug: true,
              status: true,
              title: true,
              notifyOnPublish: true,
            },
          });

    await createImageRows(tx, post.id, processedImages);
    await reconcilePostVideos(tx, post.id, videoInputs);

    if (intent === "update" && existingId && imageAltTextUpdates.length > 0) {
      await Promise.all(
        imageAltTextUpdates.map((image) =>
          tx.postImage.updateMany({
            where: { id: image.id, postId: existingId },
            data: { altText: image.altText },
          }),
        ),
      );
    }

    let notificationDecision: PublicationDecision = "not-applicable";
    if (shouldStampPublishedAt) {
      notificationDecision = await recordFirstPublicationDecision(tx, post, now);
    } else if (shouldCancelNotification) {
      await cancelPostNotificationWork(tx, post.id, now);
    }

    return { ...post, notificationDecision };
  });

  if (saved.notificationDecision === "queued") {
    kickWebPushDispatcher({ bypassCooldown: true });
  }

  return saved;
}

/**
   Detect a Prisma unique-constraint violation on the `slug` column.
   Used by the action layer to translate concurrent-create races into a
   field-level form error rather than a 500.
 */
export function isSlugConflict(error: unknown): boolean {
  return (
    isPrismaKnownRequestError(error, "P2002") &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes("slug")
  );
}
