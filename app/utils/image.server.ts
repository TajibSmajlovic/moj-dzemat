import sharp from "sharp";

import { logger } from "#app/utils/logger.server";

/**
 * Image ingestion pipeline for post attachments. Every accepted image
 * is re-encoded as WebP at quality 80 and resized to max 2000px wide,
 * preserving aspect ratio. The cap is there so a typical post never
 * ships more than a few hundred KB per image even when the admin drops
 * in a phone photo straight from their camera roll.
 */

const MAX_DIMENSION = 2000;
const OUTPUT_QUALITY = 80;
const MAX_RAW_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_INPUT = new Set(["image/jpeg", "image/png", "image/webp"]);

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

function normalizeClientMime(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t === "image/jpg" || t === "image/pjpeg" || t === "image/x-citrix-jpeg") {
    return "image/jpeg";
  }
  return t;
}

/**
 * When the browser sends an empty or generic MIME (common with some
 * drag/drop paths), infer JPEG / PNG / WebP from magic bytes so sharp
 * still accepts the upload.
 */
function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export async function processImage(
  input: ArrayBuffer | Buffer,
  contentType: string,
): Promise<ProcessedImage> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (buffer.byteLength === 0) {
    logger.warn({ contentType }, "image processing rejected empty payload");
    throw new Response("Empty image", { status: 400 });
  }

  if (buffer.byteLength > MAX_RAW_BYTES) {
    logger.warn(
      { contentType, byteSize: buffer.byteLength },
      "image processing rejected oversized payload",
    );
    throw new Response("Image too large (max 15 MB)", { status: 413 });
  }

  let mime = normalizeClientMime(contentType || "");
  if (!ALLOWED_INPUT.has(mime)) {
    const sniffed = sniffImageMime(buffer);
    if (sniffed && ALLOWED_INPUT.has(sniffed)) {
      mime = sniffed;
    }
  }

  if (!ALLOWED_INPUT.has(mime)) {
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
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: OUTPUT_QUALITY });

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
