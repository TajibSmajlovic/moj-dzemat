import sharp from "sharp";

import { resolveImageMime, sniffImageMime } from "#app/server/image-mime.server";
import {
  IMAGE_OUTPUT_QUALITY,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_RAW_BYTES,
} from "#app/server/limits.server";
import { logger } from "#app/server/logger.server";

/**
   Image ingestion pipeline for uploaded attachments. Every accepted image is
   re-encoded as WebP at the shared quality setting and resized to the shared
   dimension cap, preserving aspect ratio. MIME detection lives in
   `image-mime.server.ts`.
 */

type ProcessedImage = {
  // Explicitly `ArrayBuffer` (not `ArrayBufferLike`) so Prisma's `Bytes`
  // field accepts it directly. `SharedArrayBuffer` would otherwise match
  // `ArrayBufferLike` and break the assignment.
  data: Uint8Array<ArrayBuffer>;
  contentType: "image/webp";
  width: number;
  height: number;
  byteSize: number;
};

export async function processImage(
  input: ArrayBuffer | Buffer,
  contentType: string,
): Promise<ProcessedImage> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (buffer.byteLength === 0) {
    logger.warn({ contentType }, "image processing rejected empty payload");
    throw new Response("Empty image", { status: 400 });
  }

  if (buffer.byteLength > MAX_IMAGE_RAW_BYTES) {
    logger.warn(
      { contentType, byteSize: buffer.byteLength },
      "image processing rejected oversized payload",
    );

    throw new Response("Image too large (max 15 MB)", { status: 413 });
  }

  const mime = resolveImageMime(contentType, buffer);
  if (!mime) {
    logger.warn(
      { contentType, sniffedMime: sniffImageMime(buffer), byteSize: buffer.byteLength },
      "image processing rejected unsupported type",
    );
    throw new Response("Unsupported image type", { status: 415 });
  }

  try {
    const pipeline = sharp(buffer, { failOn: "error" })
      .rotate() // honour EXIF orientation then strip metadata
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_OUTPUT_QUALITY });

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    // Prisma's `Bytes` column accepts `Uint8Array<ArrayBuffer>`; Buffer
    // backs onto `ArrayBufferLike` (potentially SharedArrayBuffer) which
    // Prisma now rejects in TS. Copy the bytes into a fresh ArrayBuffer.
    const bytes = new Uint8Array(data.byteLength);
    bytes.set(data);

    logger.debug(
      {
        inputMime: mime,
        outputMime: "image/webp",
        sourceByteSize: buffer.byteLength,
        byteSize: bytes.byteLength,
        width: info.width,
        height: info.height,
      },
      "image processed",
    );

    return {
      data: bytes,
      contentType: "image/webp",
      width: info.width,
      height: info.height,
      byteSize: bytes.byteLength,
    };
  } catch (error) {
    logger.error(
      { err: error, contentType: mime, byteSize: buffer.byteLength },
      "image processing failed",
    );

    throw error;
  }
}
