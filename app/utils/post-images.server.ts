import type { Prisma } from "@prisma/client";

import { MAX_IMAGES_PER_POST, MAX_IMAGE_ALT_TEXT_LENGTH } from "#app/lib/post-schema";
import { FormError } from "#app/utils/form-error.server";
import { processImage } from "#app/utils/image.server";
import { logger } from "#app/utils/logger.server";

type ProcessedImage = Awaited<ReturnType<typeof processImage>>;

export type ProcessedPostImage = ProcessedImage & { altText: string | null };

export type ImageAltTextUpdate = { id: string; altText: string | null };

type UploadedPart = {
  arrayBuffer(): Promise<ArrayBuffer>;
  readonly size: number;
  readonly type: string;
};

type TxClient = Prisma.TransactionClient;

function isUploadedPart(value: unknown): value is UploadedPart {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as UploadedPart).arrayBuffer === "function"
  );
}

function uploadedFiles(formData: FormData, name: string): UploadedPart[] {
  const out: UploadedPart[] = [];
  for (const entry of formData.getAll(name)) {
    if (isUploadedPart(entry)) {
      out.push(entry);
    }
  }

  return out.filter((file) => file.size > 0);
}

function normalizeAltText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.replaceAll(/\s+/g, " ").trim();
  if (!normalized) return null;

  if (normalized.length > MAX_IMAGE_ALT_TEXT_LENGTH) {
    throw new FormError(`Opis slike može imati najviše ${MAX_IMAGE_ALT_TEXT_LENGTH} znakova.`);
  }

  return normalized;
}

function newImageAltTexts(formData: FormData, imageCount: number): (string | null)[] {
  const rawValues = formData.getAll("newImageAltText");

  return Array.from({ length: imageCount }, (_, index) =>
    normalizeAltText(rawValues[index] ?? null),
  );
}

/**
   Read every `imageAltText:<id>` pair from the edit form and normalize
   them in one pass. Returned in submission order; callers should run
   the updates inside the same transaction that touches the post.
 */
export function existingImageAltTextUpdates(formData: FormData): ImageAltTextUpdate[] {
  const updates: ImageAltTextUpdate[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("imageAltText:")) continue;

    const id = key.slice("imageAltText:".length);
    if (!id) continue;

    updates.push({ id, altText: normalizeAltText(value) });
  }

  return updates;
}

/**
   Pull every `images` part out of the multipart body, run each through
   sharp, and attach the per-file alt text the admin entered alongside.
   Throws a `FormError` for user-facing problems (bad format, oversize,
   sharp failure) so the action layer can map it back onto the form.
 */
export async function processUploadedImages(formData: FormData): Promise<ProcessedPostImage[]> {
  const realFiles = uploadedFiles(formData, "images");
  if (realFiles.length === 0) {
    return [];
  }

  const altTexts = newImageAltTexts(formData, realFiles.length);
  const processedImages: ProcessedPostImage[] = [];

  for (const [index, file] of realFiles.entries()) {
    try {
      const processed = await processImage(
        await file.arrayBuffer(),
        file.type || "application/octet-stream",
      );

      processedImages.push({ ...processed, altText: altTexts[index] ?? null });
    } catch (error) {
      logger.warn(
        { contentType: file.type || "application/octet-stream", byteSize: file.size },
        "post image upload rejected",
      );

      if (error instanceof Response) {
        throw new FormError((await error.text()) || "Obrada slike nije uspjela.");
      }

      throw new FormError(error instanceof Error ? error.message : "Obrada slike nije uspjela.");
    }
  }

  logger.debug({ count: processedImages.length }, "post images preprocessed");

  return processedImages;
}

export async function createImageRows(
  tx: TxClient,
  postId: string,
  processedImages: ProcessedPostImage[],
) {
  if (processedImages.length === 0) return;

  const currentCount = await tx.postImage.count({ where: { postId } });
  const remaining = MAX_IMAGES_PER_POST - currentCount;

  if (remaining <= 0) {
    throw new FormError(`Objava već ima maksimalan broj slika (${MAX_IMAGES_PER_POST}).`);
  }

  if (processedImages.length > remaining) {
    throw new FormError(
      `Možete dodati još najviše ${remaining} ${remaining === 1 ? "sliku" : "slike"}.`,
    );
  }

  await Promise.all(
    processedImages.map((processed, index) =>
      tx.postImage.create({
        data: {
          postId,
          contentType: processed.contentType,
          altText: processed.altText,
          data: processed.data,
          byteSize: processed.byteSize,
          width: processed.width,
          height: processed.height,
          position: currentCount + index,
        },
      }),
    ),
  );
}
