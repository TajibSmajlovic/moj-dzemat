import { data } from "react-router";

import { parseWithZod } from "@conform-to/zod/v4";
import { parseFormData } from "@mjackson/form-data-parser";
import { Prisma } from "@prisma/client";

import { invariant, invariantResponse } from "#app/lib/invariant";
import {
  MAX_IMAGES_PER_POST,
  MAX_IMAGE_ALT_TEXT_LENGTH,
  PostFormSchema,
} from "#app/lib/post-schema";
import type { PostStatusValue } from "#app/lib/post-status";
import type { PostTypeValue } from "#app/lib/post-type";
import { createActionToast } from "#app/lib/toast";
import { prisma } from "#app/utils/db.server";
import { processImage } from "#app/utils/image.server";
import { logger } from "#app/utils/logger.server";
import { sanitizePostBody } from "#app/utils/post-sanitize.server";
import { redirectWithToast } from "#app/utils/toast.server";

/** Maximum raw upload size we pass through the multipart parser (15 MB). */
const MAX_UPLOAD_SIZE = 15 * 1024 * 1024;

type ProcessedImage = Awaited<ReturnType<typeof processImage>>;
type ProcessedPostImage = ProcessedImage & { altText: string | null };
type UploadedPart = {
  arrayBuffer(): Promise<ArrayBuffer>;
  readonly size: number;
  readonly type: string;
};
type TxClient = Prisma.TransactionClient;

class FormError extends Error {
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, options?: { fieldErrors?: Record<string, string[]> }) {
    super(message);
    this.name = "FormError";
    this.fieldErrors = options?.fieldErrors;
  }
}

export function requireId(value: unknown): string {
  invariantResponse(typeof value === "string" && value.length > 0, "Missing id");

  return value;
}

function uploadedFiles(formData: FormData, name: string): UploadedPart[] {
  const out: UploadedPart[] = [];
  for (const entry of formData.getAll(name)) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      "arrayBuffer" in entry &&
      typeof (entry as UploadedPart).arrayBuffer === "function"
    ) {
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

function existingImageAltTextUpdates(formData: FormData) {
  const updates: { id: string; altText: string | null }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("imageAltText:")) continue;

    const id = key.slice("imageAltText:".length);
    if (!id) continue;

    updates.push({ id, altText: normalizeAltText(value) });
  }

  return updates;
}

async function processUploadedImages(formData: FormData): Promise<ProcessedPostImage[]> {
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

async function createImageRows(
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

async function persistPostAndImages(args: {
  authorId: string;
  body: string;
  existingId: string | null;
  featured: boolean;
  intent: "create" | "update";
  pinned: boolean;
  processedImages: ProcessedPostImage[];
  imageAltTextUpdates: { id: string; altText: string | null }[];
  slug: string;
  status: PostStatusValue;
  title: string;
  type: PostTypeValue;
}) {
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

function isSlugConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes("slug")
  );
}

type CreateOrUpdateArgs = {
  request: Request;
  authorId: string;
  intent: "create" | "update";
};

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

/**
 * Parses the multipart body via `@mjackson/form-data-parser` (which
 * correctly streams file parts), validates text fields, pre-processes
 * images, then commits the post + image rows in one short transaction.
 * On success redirects published posts publicly and drafts to admin preview.
 */
export async function createOrUpdatePostFromForm({
  request,
  authorId,
  intent,
}: CreateOrUpdateArgs) {
  const formData = await parseFormData(request, {
    maxFileSize: MAX_UPLOAD_SIZE,
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
  let imageAltTextUpdates: { id: string; altText: string | null }[] = [];

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

  let savedPost: { id: string; slug: string; status: PostStatusValue } | null = null;

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
      ? `/objave/${savedPost.slug}`
      : `/admin/objave/${savedPost.id}/pregled`;

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
