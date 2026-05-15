/**
   MIME helpers for the image ingestion pipeline. Split out from
   `image.server.ts` so the byte-level type detection (which has no
   sharp dependency) can be tested and reused without booting the
   full image pipeline.
 */

export type AllowedImageMime = "image/jpeg" | "image/png" | "image/webp";

const ALLOWED_IMAGE_MIMES: ReadonlySet<AllowedImageMime> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function isAllowedImageMime(mime: string): mime is AllowedImageMime {
  return (ALLOWED_IMAGE_MIMES as ReadonlySet<string>).has(mime);
}

/**
   Browsers report JPEGs under a handful of legacy aliases. Normalise
   to the canonical IANA value before doing anything else.
 */
function normalizeClientMime(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t === "image/jpg" || t === "image/pjpeg" || t === "image/x-citrix-jpeg") {
    return "image/jpeg";
  }

  return t;
}

/**
   When the browser sends an empty or generic MIME (common with some
   drag/drop paths), infer JPEG / PNG / WebP from magic bytes so sharp
   still accepts the upload.
 */
export function sniffImageMime(buffer: Buffer): AllowedImageMime | null {
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

/**
   Resolve the effective MIME for an uploaded buffer: trust the client
   header when it's a known allowlist value, otherwise fall back to
   magic-byte sniffing. Returns `null` when the bytes are not a
   supported image at all.
 */
export function resolveImageMime(clientMime: string, buffer: Buffer): AllowedImageMime | null {
  const normalized = normalizeClientMime(clientMime || "");
  if (isAllowedImageMime(normalized)) return normalized;

  return sniffImageMime(buffer);
}
