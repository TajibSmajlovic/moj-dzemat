import {
  createImageRows,
  type ImageAltTextUpdate,
  type ProcessedPostImage,
} from "#app/features/posts/admin/post-images.server";
import { reconcilePostVideos } from "#app/features/posts/admin/post-videos.server";
import type { PostStatusValue } from "#app/features/posts/post-status";
import type { PostTypeValue } from "#app/features/posts/post-type";
import type { ParsedVideo } from "#app/features/posts/post-video";
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
};

export async function persistPostAndImages(args: PersistPostArgs): Promise<PersistedPost> {
  return prisma.$transaction(async (tx) => {
    const {
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
      videoInputs,
    } = args;

    const clashing = await tx.post.findFirst({
      where: existingId ? { slug, NOT: { id: existingId } } : { slug },
      select: { id: true },
    });

    if (clashing) {
      throw new FormError("Slug je već zauzet. Odaberite drugi.", {
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
              status,
              ...(shouldStampPublishedAt ? { publishedAt: new Date() } : {}),
            },
            select: { id: true, slug: true, status: true },
          })
        : await tx.post.create({
            data: { title, slug, type, body, featured, pinned, status, authorId },
            select: { id: true, slug: true, status: true },
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

    return post;
  });
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
